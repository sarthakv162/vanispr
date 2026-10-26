"""
AadyaLang SPR Backend API
FastAPI implementation supporting Gibson & Warren (2004) Self-Paced Reading methodology,
first-class Hindi Devanagari text processing, Latin-Square balancing, and scientific statistical analysis.
"""
import io
import csv
import json
import uuid
import unicodedata
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse

from app.database import get_db, init_db
from app.models import (
    ExperimentCreate, ExperimentUpdate, ItemInput,
    ParticipantInitRequest, TrialSubmitRequest, ParticipantCompleteRequest,
    NormingRatingSubmit
)
from app.latin_square import generate_latin_square_lists, pseudo_randomize_trials
from app.analysis import compute_spr_analysis, generate_r_script, generate_python_script
from app.seed_data import seed_database

app = FastAPI(
    title="VaniSPR API",
    description="Research-grade Self-Paced Reading platform with Hindi & English Psycholinguistics Support",
    version="1.0.0"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    seed_database()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "platform": "VaniSPR", "version": "1.0.0"}

# ==============================================================================
# EXPERIMENT MANAGEMENT
# ==============================================================================

@app.get("/api/experiments")
def list_experiments():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT e.*, 
               (SELECT COUNT(*) FROM items i WHERE i.experiment_id = e.id) as item_count,
               (SELECT COUNT(*) FROM participants p WHERE p.experiment_id = e.id) as total_participants,
               (SELECT COUNT(*) FROM participants p WHERE p.experiment_id = e.id AND p.status = 'completed') as completed_participants
        FROM experiments e
        ORDER BY e.created_at DESC
        """)
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["design"] = json.loads(d["design_json"]) if d["design_json"] else []
            d["instructions"] = json.loads(d["instructions_json"]) if d["instructions_json"] else {}
            result.append(d)
        return result

@app.post("/api/experiments")
def create_experiment(exp: ExperimentCreate):
    exp_id = f"exp_{uuid.uuid4().hex[:12]}"
    with get_db() as conn:
        cursor = conn.cursor()
        
        design_json = json.dumps([f.dict() for f in exp.factors])
        instructions_json = json.dumps(exp.instructions or {
            "title": "आत्म-गति पठन प्रयोग (Self-Paced Reading)",
            "body": "Press SPACEBAR to read word-by-word. Answer with 'F' (Yes) or 'J' (No)."
        })

        cursor.execute("""
        INSERT INTO experiments (id, host_id, title, description, language, status, template_type, version, design_json, instructions_json)
        VALUES (?, 'host_sarthak_001', ?, ?, ?, 'draft', ?, 1, ?, ?)
        """, (exp_id, exp.title, exp.description, exp.language, exp.template_type, design_json, instructions_json))

        for factor in exp.factors:
            f_id = f"factor_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO factors (id, experiment_id, name, levels_json)
            VALUES (?, ?, ?, ?)
            """, (f_id, exp_id, factor.name, json.dumps(factor.levels)))

    return {"id": exp_id, "message": "Experiment created successfully"}

@app.get("/api/experiments/{experiment_id}")
def get_experiment_detail(experiment_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        exp_row = cursor.fetchone()
        if not exp_row:
            raise HTTPException(status_code=404, detail="Experiment not found")

        exp = dict(exp_row)
        exp["design"] = json.loads(exp["design_json"]) if exp["design_json"] else []
        exp["instructions"] = json.loads(exp["instructions_json"]) if exp["instructions_json"] else {}

        # Fetch factors
        cursor.execute("SELECT * FROM factors WHERE experiment_id = ?", (experiment_id,))
        exp["factors"] = [{"id": f["id"], "name": f["name"], "levels": json.loads(f["levels_json"])} for f in cursor.fetchall()]

        # Fetch items with versions
        cursor.execute("SELECT * FROM items WHERE experiment_id = ? ORDER BY item_number", (experiment_id,))
        item_rows = cursor.fetchall()
        items = []
        for i_row in item_rows:
            item = dict(i_row)
            cursor.execute("SELECT * FROM item_versions WHERE item_id = ?", (item["id"],))
            ver_rows = cursor.fetchall()
            item["versions"] = []
            for v_row in ver_rows:
                v = dict(v_row)
                v["regions"] = json.loads(v["regions_json"])
                item["versions"].append(v)
            items.append(item)
        exp["items"] = items

        # Fetch lists count
        cursor.execute("SELECT COUNT(*) as count FROM lists WHERE experiment_id = ?", (experiment_id,))
        exp["lists_count"] = cursor.fetchone()["count"]

        return exp

@app.put("/api/experiments/{experiment_id}")
def update_experiment(experiment_id: str, update: ExperimentUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Experiment not found")

        updates = []
        params = []
        if update.title is not None:
            updates.append("title = ?")
            params.append(update.title)
        if update.description is not None:
            updates.append("description = ?")
            params.append(update.description)
        if update.status is not None:
            updates.append("status = ?")
            params.append(update.status)
        if update.instructions is not None:
            updates.append("instructions_json = ?")
            params.append(json.dumps(update.instructions))

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            sql = f"UPDATE experiments SET {', '.join(updates)} WHERE id = ?"
            params.append(experiment_id)
            cursor.execute(sql, params)

    return {"message": "Experiment updated successfully"}

# ==============================================================================
# ITEMS & REGIONS MANAGEMENT
# ==============================================================================

@app.post("/api/experiments/{experiment_id}/items")
def add_item(experiment_id: str, item_in: ItemInput):
    with get_db() as conn:
        cursor = conn.cursor()
        item_id = f"item_{uuid.uuid4().hex[:10]}"
        
        cursor.execute("""
        INSERT INTO items (id, experiment_id, item_number, type, question, correct_answer, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (item_id, experiment_id, item_in.item_number, item_in.type, item_in.question, item_in.correct_answer, item_in.explanation))

        for v in item_in.versions:
            # Enforce Unicode NFC normalization
            norm_text = unicodedata.normalize("NFC", v.sentence_text)
            v_id = f"ver_{uuid.uuid4().hex[:10]}"
            words = norm_text.split()
            graphemes = len(norm_text.replace(" ", ""))

            cursor.execute("""
            INSERT INTO item_versions (id, item_id, condition_label, sentence_text, regions_json, word_count, grapheme_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (v_id, item_id, v.condition_label, norm_text, json.dumps([r.dict() for r in v.regions]), len(words), graphemes))

    return {"id": item_id, "message": "Item added successfully"}

@app.delete("/api/experiments/{experiment_id}/items/{item_id}")
def delete_item(experiment_id: str, item_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM items WHERE id = ? AND experiment_id = ?", (item_id, experiment_id))
    return {"message": "Item deleted"}

# ==============================================================================
# BULK CSV IMPORT & LATIN SQUARE GENERATION
# ==============================================================================

@app.post("/api/experiments/{experiment_id}/import-csv")
async def bulk_import_csv(experiment_id: str, file: UploadFile = File(...)):
    """
    Import items from CSV with format:
    item_number, type, condition_label, sentence, question, correct_answer, explanation
    Regions are auto-generated word-by-word with Unicode NFC normalization.
    """
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    imported_count = 0

    with get_db() as conn:
        cursor = conn.cursor()
        for row in reader:
            item_num = int(row.get("item_number", imported_count + 1))
            item_type = row.get("type", "experimental").strip().lower()
            cond_label = row.get("condition_label", "default").strip()
            sentence = unicodedata.normalize("NFC", row.get("sentence", "").strip())
            question = row.get("question", "").strip() or None
            correct_ans = row.get("correct_answer", "").strip().lower() or None
            explanation = row.get("explanation", "").strip() or None

            if not sentence:
                continue

            # Check if item_number already exists in this experiment
            cursor.execute("SELECT id FROM items WHERE experiment_id = ? AND item_number = ?", (experiment_id, item_num))
            existing_item = cursor.fetchone()

            if existing_item:
                item_id = existing_item["id"]
            else:
                item_id = f"item_{uuid.uuid4().hex[:10]}"
                cursor.execute("""
                INSERT INTO items (id, experiment_id, item_number, type, question, correct_answer, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (item_id, experiment_id, item_num, item_type, question, correct_ans, explanation))

            # Auto-split words into regions
            words = sentence.split()
            regions = [{"index": idx + 1, "text": w, "words": [w]} for idx, w in enumerate(words)]
            
            v_id = f"ver_{uuid.uuid4().hex[:10]}"
            cursor.execute("""
            INSERT INTO item_versions (id, item_id, condition_label, sentence_text, regions_json, word_count, grapheme_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (v_id, item_id, cond_label, sentence, json.dumps(regions), len(words), len(sentence.replace(" ", ""))))
            
            imported_count += 1

    return {"message": f"Successfully processed {imported_count} item versions"}

@app.post("/api/experiments/{experiment_id}/generate-lists")
def generate_lists_endpoint(experiment_id: str):
    """
    Computes balanced Latin Square lists and saves them to the database.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Load experiment factors
        cursor.execute("SELECT levels_json FROM factors WHERE experiment_id = ?", (experiment_id,))
        factor_rows = cursor.fetchall()
        
        # Load all items with versions
        cursor.execute("SELECT * FROM items WHERE experiment_id = ?", (experiment_id,))
        item_rows = cursor.fetchall()
        
        items = []
        all_conditions = set()
        for i_row in item_rows:
            item = dict(i_row)
            cursor.execute("SELECT * FROM item_versions WHERE item_id = ?", (item["id"],))
            ver_rows = cursor.fetchall()
            item["versions"] = []
            for v_row in ver_rows:
                v = dict(v_row)
                v["regions"] = json.loads(v["regions_json"])
                item["versions"].append(v)
                if item["type"] == "experimental":
                    all_conditions.add(v["condition_label"])
            items.append(item)

        condition_list = sorted(list(all_conditions))
        if not condition_list:
            condition_list = ["C1", "C2", "C3", "C4"]

        # Clear existing lists for this experiment
        cursor.execute("DELETE FROM lists WHERE experiment_id = ?", (experiment_id,))

        lists_dict = generate_latin_square_lists(items, condition_list)

        for list_num, list_items in lists_dict.items():
            list_id = f"list_{uuid.uuid4().hex[:10]}"
            cursor.execute("INSERT INTO lists (id, experiment_id, list_number) VALUES (?, ?, ?)",
                           (list_id, experiment_id, list_num))

            for order_hint, li in enumerate(list_items):
                cursor.execute("""
                INSERT INTO list_items (id, list_id, item_version_id, order_hint)
                VALUES (?, ?, ?, ?)
                """, (str(uuid.uuid4()), list_id, li["item_version_id"], order_hint + 1))

    return {"message": f"Generated {len(lists_dict)} Latin-Square lists", "conditions": condition_list}

# ==============================================================================
# PARTICIPANT RUNNER FLOW
# ==============================================================================

@app.post("/api/runner/init")
def init_participant_session(req: ParticipantInitRequest):
    """
    Initializes a participant session:
    1. Selects the Latin-Square list with least completed participants (counterbalancing).
    2. Builds pseudo-randomized trial sequence (practice first, no identical consecutive conditions).
    3. Records client screen resolution, refresh rate and timing jitter.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Check experiment
        cursor.execute("SELECT * FROM experiments WHERE id = ?", (req.experiment_id,))
        exp_row = cursor.fetchone()
        if not exp_row:
            raise HTTPException(status_code=404, detail="Experiment not found")

        # Pick least filled list
        cursor.execute("""
        SELECT l.id, l.list_number, COUNT(p.id) as completed_count
        FROM lists l
        LEFT JOIN participants p ON l.id = p.list_id AND p.status = 'completed'
        WHERE l.experiment_id = ?
        GROUP BY l.id
        ORDER BY completed_count ASC, l.list_number ASC
        LIMIT 1
        """, (req.experiment_id,))
        list_row = cursor.fetchone()

        if not list_row:
            # Generate lists if not present
            cursor.execute("INSERT INTO lists (id, experiment_id, list_number) VALUES (?, ?, 1)",
                           (f"list_{uuid.uuid4().hex[:8]}", req.experiment_id))
            cursor.execute("SELECT id, list_number FROM lists WHERE experiment_id = ? LIMIT 1", (req.experiment_id,))
            list_row = cursor.fetchone()

        list_id = list_row["id"]
        list_number = list_row["list_number"]

        # Create participant record
        participant_id = f"part_{uuid.uuid4().hex[:12]}"
        cursor.execute("""
        INSERT INTO participants (
            id, experiment_id, list_id, external_id, consent_at,
            user_agent, screen_w, screen_h, refresh_rate_est, jitter_ms,
            background_json, status
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, 'started')
        """, (
            participant_id, req.experiment_id, list_id, req.external_id,
            req.user_agent, req.screen_w, req.screen_h, req.refresh_rate_est, req.jitter_ms,
            json.dumps(req.background or {})
        ))

        # Retrieve items assigned to this list
        cursor.execute("""
        SELECT li.item_version_id, iv.condition_label, iv.sentence_text, iv.regions_json,
               i.id as item_id, i.item_number, i.type, i.question, i.correct_answer, i.explanation
        FROM list_items li
        JOIN item_versions iv ON li.item_version_id = iv.id
        JOIN items i ON iv.item_id = i.id
        WHERE li.list_id = ?
        """, (list_id,))
        assigned_rows = cursor.fetchall()

        # If list items are empty (e.g. no Latin square yet), fall back to all items
        if not assigned_rows:
            cursor.execute("""
            SELECT iv.id as item_version_id, iv.condition_label, iv.sentence_text, iv.regions_json,
                   i.id as item_id, i.item_number, i.type, i.question, i.correct_answer, i.explanation
            FROM items i
            JOIN item_versions iv ON i.id = iv.item_id
            WHERE i.experiment_id = ?
            GROUP BY i.id
            """, (req.experiment_id,))
            assigned_rows = cursor.fetchall()

        # Separate practice vs experimental/filler
        practice_trials = []
        regular_trials = []

        for row in assigned_rows:
            trial_data = {
                "item_id": row["item_id"],
                "item_number": row["item_number"],
                "type": row["type"],
                "condition_label": row["condition_label"],
                "item_version_id": row["item_version_id"],
                "sentence_text": row["sentence_text"],
                "regions": json.loads(row["regions_json"]),
                "question": row["question"],
                "correct_answer": row["correct_answer"],
                "explanation": row["explanation"]
            }
            if row["type"] == "practice":
                practice_trials.append(trial_data)
            else:
                regular_trials.append(trial_data)

        # Build pseudo-randomized sequence
        sequence = pseudo_randomize_trials(regular_trials, practice_trials)

        return {
            "participant_id": participant_id,
            "experiment_id": req.experiment_id,
            "list_number": list_number,
            "language": exp_row["language"],
            "instructions": json.loads(exp_row["instructions_json"]) if exp_row["instructions_json"] else {},
            "trials": sequence
        }

@app.post("/api/runner/trial")
def submit_trial_data(req: TrialSubmitRequest):
    """
    Ingests batch of reading time events for a single trial:
    - Atomically stores trial outcome and word-by-word timestamps.
    - Flags fast outliers (< 100ms) or loss of focus.
    """
    trial_id = f"trial_{uuid.uuid4().hex[:12]}"
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        INSERT INTO trials (
            id, participant_id, item_version_id, presentation_order,
            started_at, completed_at, question_response, correct,
            question_rt_ms, focus_lost_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trial_id, req.participant_id, req.item_version_id, req.presentation_order,
            req.started_at, req.completed_at, req.question_response, req.correct,
            req.question_rt_ms, req.focus_lost_count
        ))

        for event in req.word_events:
            is_fast = 1 if event.rt_ms < 100.0 else 0
            cursor.execute("""
            INSERT INTO word_events (
                id, trial_id, word_index, region_index, word_text,
                rt_ms, t_shown, t_pressed, grapheme_count, is_repeat, is_outlier
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()), trial_id, event.word_index, event.region_index,
                event.word_text, event.rt_ms, event.t_shown, event.t_pressed,
                event.grapheme_count, 1 if event.is_repeat else 0, is_fast
            ))

        if req.focus_lost_count > 0:
            cursor.execute("""
            INSERT INTO quality_flags (id, participant_id, trial_id, flag, detail)
            VALUES (?, ?, ?, 'FOCUS_LOST', ?)
            """, (str(uuid.uuid4()), req.participant_id, trial_id, f"Focus lost {req.focus_lost_count} times"))

    return {"status": "ok", "trial_id": trial_id}

@app.post("/api/runner/complete")
def complete_participant_session(req: ParticipantCompleteRequest):
    completion_code = f"SPR-{uuid.uuid4().hex[:8].upper()}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE participants
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (req.participant_id,))

    return {"status": "completed", "completion_code": completion_code}

# ==============================================================================
# LIVE DASHBOARD & MONITORING
# ==============================================================================

@app.get("/api/dashboard/{experiment_id}")
def get_live_dashboard(experiment_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Participants stats
        cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'started' THEN 1 ELSE 0 END) as in_progress
        FROM participants
        WHERE experiment_id = ?
        """, (experiment_id,))
        p_stats = dict(cursor.fetchone())

        # List balance
        cursor.execute("""
        SELECT l.list_number, COUNT(p.id) as participant_count
        FROM lists l
        LEFT JOIN participants p ON l.id = p.list_id AND p.status = 'completed'
        WHERE l.experiment_id = ?
        GROUP BY l.list_number
        ORDER BY l.list_number
        """, (experiment_id,))
        list_balance = [dict(r) for r in cursor.fetchall()]

        # Accuracy breakdown
        cursor.execute("""
        SELECT i.type, AVG(t.correct) * 100 as accuracy, COUNT(t.id) as count
        FROM trials t
        JOIN item_versions iv ON t.item_version_id = iv.id
        JOIN items i ON iv.item_id = i.id
        JOIN participants p ON t.participant_id = p.id
        WHERE p.experiment_id = ? AND t.correct IS NOT NULL
        GROUP BY i.type
        """, (experiment_id,))
        accuracy_by_type = [dict(r) for r in cursor.fetchall()]

        # Quality flags
        cursor.execute("""
        SELECT q.flag, q.detail, q.created_at, p.external_id, p.id as participant_id
        FROM quality_flags q
        JOIN participants p ON q.participant_id = p.id
        WHERE p.experiment_id = ?
        ORDER BY q.created_at DESC
        LIMIT 20
        """, (experiment_id,))
        quality_flags = [dict(r) for r in cursor.fetchall()]

        return {
            "participant_stats": p_stats,
            "list_balance": list_balance,
            "accuracy_by_type": accuracy_by_type,
            "recent_quality_flags": quality_flags
        }

# ==============================================================================
# STATISTICAL ANALYSIS & REPLICATION EXPORT
# ==============================================================================

@app.get("/api/analysis/{experiment_id}")
def get_analysis_results(experiment_id: str, filler_acc: float = 0.75, rt_min: float = 100.0, rt_max: float = 3000.0):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT 
            we.rt_ms, we.grapheme_count, we.region_index, we.word_index, we.word_text,
            t.id as trial_id, t.participant_id, t.correct as question_correct,
            p.external_id, l.list_number,
            iv.condition_label, i.type as item_type, i.item_number,
            (CASE WHEN i.type = 'practice' THEN 1 ELSE 0 END) as is_practice
        FROM word_events we
        JOIN trials t ON we.trial_id = t.id
        JOIN participants p ON t.participant_id = p.id
        JOIN lists l ON p.list_id = l.id
        JOIN item_versions iv ON t.item_version_id = iv.id
        JOIN items i ON iv.item_id = i.id
        WHERE p.experiment_id = ?
        """, (experiment_id,))
        
        rows = cursor.fetchall()
        raw_events = [dict(r) for r in rows]

    return compute_spr_analysis(raw_events, filler_accuracy_threshold=filler_acc, rt_min=rt_min, rt_max=rt_max)

@app.get("/api/analysis/{experiment_id}/export-csv")
def export_csv(experiment_id: str):
    """
    Downloads tidy long-format CSV suitable for R / Python data frames.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT 
            p.id as participant_id, p.external_id, l.list_number, p.refresh_rate_est,
            t.presentation_order, i.item_number, i.type as item_type,
            iv.condition_label, we.region_index, we.word_index, we.word_text,
            we.rt_ms, we.grapheme_count, we.t_shown, we.t_pressed,
            t.question_response, t.correct as question_correct, t.question_rt_ms,
            (CASE WHEN i.type = 'practice' THEN 1 ELSE 0 END) as is_practice
        FROM word_events we
        JOIN trials t ON we.trial_id = t.id
        JOIN participants p ON t.participant_id = p.id
        JOIN lists l ON p.list_id = l.id
        JOIN item_versions iv ON t.item_version_id = iv.id
        JOIN items i ON iv.item_id = i.id
        WHERE p.experiment_id = ?
        ORDER BY p.id, t.presentation_order, we.word_index
        """, (experiment_id,))
        rows = cursor.fetchall()

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for r in rows:
            writer.writerow(dict(r))

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=spr_tidy_{experiment_id}.csv"}
    )

@app.get("/api/analysis/{experiment_id}/export-r-script")
def export_r_script(experiment_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM experiments WHERE id = ?", (experiment_id,))
        row = cursor.fetchone()
        title = row["title"] if row else "AadyaLang SPR Experiment"
    
    script = generate_r_script(title)
    return PlainTextResponse(script, media_type="text/plain", headers={"Content-Disposition": "attachment; filename=analysis_pipeline.R"})

@app.get("/api/analysis/{experiment_id}/export-python-script")
def export_py_script(experiment_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM experiments WHERE id = ?", (experiment_id,))
        row = cursor.fetchone()
        title = row["title"] if row else "AadyaLang SPR Experiment"
    
    script = generate_python_script(title)
    return PlainTextResponse(script, media_type="text/plain", headers={"Content-Disposition": "attachment; filename=analysis_pipeline.py"})

# ==============================================================================
# NORMING SURVEY MODULE (Plausibility rating 1-7 & exclusion testing)
# ==============================================================================

@app.get("/api/norming/{experiment_id}")
def get_norming_items(experiment_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT iv.id as item_version_id, iv.condition_label, iv.sentence_text,
               i.id as item_id, i.item_number, i.type
        FROM items i
        JOIN item_versions iv ON i.id = iv.item_id
        WHERE i.experiment_id = ? AND i.type = 'experimental'
        ORDER BY i.item_number
        """, (experiment_id,))
        items = [dict(r) for r in cursor.fetchall()]
        return items

@app.post("/api/norming/rating")
def submit_norming_rating(req: NormingRatingSubmit):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO norming_ratings (id, experiment_id, item_version_id, rater_id, rating, feedback)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), req.experiment_id, req.item_version_id, req.rater_id, req.rating, req.feedback))
    return {"status": "ok"}

@app.get("/api/norming/{experiment_id}/results")
def get_norming_results(experiment_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT 
            i.item_number, iv.condition_label,
            AVG(nr.rating) as mean_rating,
            COUNT(nr.id) as rating_count
        FROM norming_ratings nr
        JOIN item_versions iv ON nr.item_version_id = iv.id
        JOIN items i ON iv.item_id = i.id
        WHERE nr.experiment_id = ?
        GROUP BY i.item_number, iv.condition_label
        ORDER BY i.item_number
        """, (experiment_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        return rows
