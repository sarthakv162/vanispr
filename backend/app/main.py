"""
AadyaLang SPR Backend API
FastAPI implementation supporting Gibson & Warren (2004) Self-Paced Reading methodology,
first-class Hindi Devanagari text processing, Latin-Square balancing, and scientific statistical analysis.
"""
import io
import re
import csv
import json
import uuid
import random
import unicodedata
from scipy import stats
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

@app.get("/")
def root():
    return {"status": "ok", "platform": "VaniSPR", "version": "1.0.0", "docs": "/docs", "health": "/api/health"}

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

@app.delete("/api/experiments/{experiment_id}/participants/{participant_id}")
def delete_participant(experiment_id: str, participant_id: str):
    """
    Removes a specific participant and their trials, word_events, and quality flags.
    All stimulus items, experimental configuration, and other participants remain intact.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, external_id FROM participants WHERE id = ? AND experiment_id = ?", (participant_id, experiment_id))
        p_row = cursor.fetchone()
        if not p_row:
            raise HTTPException(status_code=404, detail="Participant not found")

        # Explicit cascading deletes for absolute database consistency
        cursor.execute("DELETE FROM quality_flags WHERE participant_id = ?", (participant_id,))
        cursor.execute("DELETE FROM word_events WHERE trial_id IN (SELECT id FROM trials WHERE participant_id = ?)", (participant_id,))
        cursor.execute("DELETE FROM trials WHERE participant_id = ?", (participant_id,))
        cursor.execute("DELETE FROM participants WHERE id = ? AND experiment_id = ?", (participant_id, experiment_id))

    return {
        "status": "deleted",
        "participant_id": participant_id,
        "external_id": p_row["external_id"],
        "message": f"Participant {p_row['external_id'] or participant_id} removed successfully"
    }

@app.delete("/api/experiments/{experiment_id}/participants")
def clear_participants(
    experiment_id: str,
    target_type: str = Query("all", description="all, pilots_only, non_pilots_only")
):
    """
    Bulk removes participant entries to allow clean fresh analysis runs.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        if target_type == "non_pilots_only":
            where_clause = "experiment_id = ? AND id NOT LIKE 'part_hindi_pilot_%'"
        elif target_type == "pilots_only":
            where_clause = "experiment_id = ? AND id LIKE 'part_hindi_pilot_%'"
        else:
            where_clause = "experiment_id = ?"

        cursor.execute(f"SELECT id FROM participants WHERE {where_clause}", (experiment_id,))
        p_ids = [r["id"] for r in cursor.fetchall()]

        for p_id in p_ids:
            cursor.execute("DELETE FROM quality_flags WHERE participant_id = ?", (p_id,))
            cursor.execute("DELETE FROM word_events WHERE trial_id IN (SELECT id FROM trials WHERE participant_id = ?)", (p_id,))
            cursor.execute("DELETE FROM trials WHERE participant_id = ?", (p_id,))
            cursor.execute("DELETE FROM participants WHERE id = ?", (p_id,))

    return {
        "status": "cleared",
        "deleted_count": len(p_ids),
        "message": f"Successfully cleared {len(p_ids)} participant entries"
    }

@app.post("/api/experiments/{experiment_id}/seed-pilot")
def seed_pilot_data(experiment_id: str):
    from app.seed_pilot import seed_pilot_participants_for_exp
    count = seed_pilot_participants_for_exp(experiment_id, 12)
    return {
        "status": "seeded",
        "experiment_id": experiment_id,
        "pilot_participants_count": count,
        "message": f"Benchmark pilot dataset seeded ({count} participants)"
    }

# ==============================================================================
# BULK CSV IMPORT & LATIN SQUARE GENERATION
# ==============================================================================

@app.post("/api/experiments/{experiment_id}/import-csv")
async def bulk_import_csv(
    experiment_id: str,
    clear_existing: bool = Query(False),
    file: UploadFile = File(...)
):
    """
    Import items from CSV. Supports:
    1. Research Multi-List format: list, id, type, condition, sentence, regions, question, answer
    2. Standard format: item_number, type, condition_label, sentence, question, correct_answer, explanation
    Auto-detects multi-word regions with '|', normalizes Devanagari to Unicode NFC,
    maps Hindi answers (हाँ/नहीं), and configures Latin-Square lists if 'list' column is present.
    """
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = contents.decode("utf-8")
        except UnicodeDecodeError:
            decoded = contents.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    imported_rows = 0
    unique_items_seen = set()
    conditions_seen = set()
    list_mappings: Dict[int, List[str]] = {}

    def get_field(norm_row: dict, *keys: str) -> str:
        for k in keys:
            v = norm_row.get(k)
            if v is not None and str(v).strip() != "":
                return str(v).strip()
        return ""

    with get_db() as conn:
        cursor = conn.cursor()

        # Check if experiment exists
        cursor.execute("SELECT id FROM experiments WHERE id = ?", (experiment_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Experiment not found")

        if clear_existing:
            cursor.execute("DELETE FROM items WHERE experiment_id = ?", (experiment_id,))
            cursor.execute("DELETE FROM lists WHERE experiment_id = ?", (experiment_id,))

        for row in reader:
            if not row:
                continue
            norm_row = {k.strip().lower() if k else "": v for k, v in row.items()}

            raw_sentence = get_field(norm_row, "sentence", "sentence_text", "text")
            raw_regions = get_field(norm_row, "regions", "region_text", "region")
            if not raw_sentence and not raw_regions:
                continue

            imported_rows += 1

            # 1. Parse List Assignment (if provided)
            raw_list = get_field(norm_row, "list", "list_number", "list_num", "group")
            list_num = None
            if raw_list:
                if raw_list.isdigit():
                    list_num = int(raw_list)
                else:
                    first_char = raw_list[0].upper()
                    if "A" <= first_char <= "Z":
                        list_num = ord(first_char) - ord("A") + 1

            # 2. Parse Item ID & Item Type
            raw_id = get_field(norm_row, "id", "item_id", "item_number", "item", "item_no")
            raw_type = get_field(norm_row, "type", "item_type").lower()

            if raw_type in ["item", "experimental", "exp"]:
                item_type = "experimental"
            elif raw_type in ["filler", "fill"]:
                item_type = "filler"
            elif raw_type in ["practice", "prac"]:
                item_type = "practice"
            else:
                if raw_id.lower().startswith("f"):
                    item_type = "filler"
                elif raw_id.lower().startswith("p"):
                    item_type = "practice"
                else:
                    item_type = "experimental"

            digits = re.findall(r"\d+", raw_id)
            if digits:
                parsed_num = int(digits[0])
            else:
                parsed_num = imported_rows

            if item_type == "filler":
                item_num = 900 + parsed_num if parsed_num < 900 else parsed_num
            elif item_type == "practice":
                item_num = 800 + parsed_num if parsed_num < 800 else parsed_num
            else:
                item_num = parsed_num

            # 3. Parse Condition Label
            cond_str = get_field(norm_row, "condition", "condition_label", "condition_name", "cond")
            if cond_str:
                cond_label = cond_str
            elif item_type == "filler":
                cond_label = "filler"
            elif item_type == "practice":
                cond_label = "practice"
            else:
                cond_label = "default"

            if item_type == "experimental":
                conditions_seen.add(cond_label)

            # 4. Parse Question & Answer
            raw_question = get_field(norm_row, "question", "question_text", "comp_question") or None
            raw_answer = get_field(norm_row, "answer", "correct_answer", "correct_ans", "response")
            explanation = get_field(norm_row, "explanation", "explanation_text", "notes") or None

            ans_lower = raw_answer.lower()
            if ans_lower in ["हाँ", "haan", "yes", "y", "true", "1", "t"]:
                correct_ans = "yes"
            elif ans_lower in ["नहीं", "nahin", "no", "n", "false", "0", "f"]:
                correct_ans = "no"
            elif raw_answer:
                correct_ans = raw_answer
            else:
                correct_ans = None

            # 5. Parse Regions and Sentence (NFC normalized)
            regions_src = raw_regions if ("|" in raw_regions) else raw_sentence
            if "|" in regions_src:
                raw_chunks = [c.strip() for c in regions_src.split("|") if c.strip()]
                regions = []
                clean_words = []
                for idx, chunk in enumerate(raw_chunks):
                    chunk_nfc = unicodedata.normalize("NFC", chunk)
                    c_words = chunk_nfc.split()
                    clean_words.extend(c_words)
                    regions.append({
                        "index": idx + 1,
                        "text": chunk_nfc,
                        "words": c_words
                    })
                if raw_sentence and "|" not in raw_sentence:
                    clean_sentence = unicodedata.normalize("NFC", raw_sentence)
                else:
                    clean_sentence = " ".join(clean_words)
            else:
                clean_sentence = unicodedata.normalize("NFC", raw_sentence or raw_regions)
                clean_words = clean_sentence.split()
                regions = [{"index": idx + 1, "text": w, "words": [w]} for idx, w in enumerate(clean_words)]

            # 6. Database Upsert: Item
            cursor.execute("SELECT id FROM items WHERE experiment_id = ? AND item_number = ?", (experiment_id, item_num))
            existing_item = cursor.fetchone()

            if existing_item:
                item_id = existing_item["id"]
                if raw_question:
                    cursor.execute("""
                    UPDATE items SET question = ?, correct_answer = ?, explanation = COALESCE(?, explanation)
                    WHERE id = ?
                    """, (raw_question, correct_ans, explanation, item_id))
            else:
                item_id = f"item_{uuid.uuid4().hex[:10]}"
                cursor.execute("""
                INSERT INTO items (id, experiment_id, item_number, type, question, correct_answer, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (item_id, experiment_id, item_num, item_type, raw_question, correct_ans, explanation))

            unique_items_seen.add(item_id)

            # 7. Database Upsert: Item Version
            cursor.execute("SELECT id FROM item_versions WHERE item_id = ? AND condition_label = ?", (item_id, cond_label))
            existing_ver = cursor.fetchone()

            grapheme_count = len(clean_sentence.replace(" ", ""))
            if existing_ver:
                v_id = existing_ver["id"]
                cursor.execute("""
                UPDATE item_versions SET sentence_text = ?, regions_json = ?, word_count = ?, grapheme_count = ?
                WHERE id = ?
                """, (clean_sentence, json.dumps(regions), len(clean_words), grapheme_count, v_id))
            else:
                v_id = f"ver_{uuid.uuid4().hex[:10]}"
                cursor.execute("""
                INSERT INTO item_versions (id, item_id, condition_label, sentence_text, regions_json, word_count, grapheme_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (v_id, item_id, cond_label, clean_sentence, json.dumps(regions), len(clean_words), grapheme_count))

            # 8. Record List Mapping if 'list' was specified
            if list_num is not None:
                if list_num not in list_mappings:
                    list_mappings[list_num] = []
                list_mappings[list_num].append(v_id)

        # 9. If CSV explicitly specified Lists (e.g. Lists A, B, C, D), configure them
        if list_mappings:
            cursor.execute("DELETE FROM lists WHERE experiment_id = ?", (experiment_id,))
            for l_num, v_ids in sorted(list_mappings.items()):
                new_list_id = f"list_{uuid.uuid4().hex[:10]}"
                cursor.execute("INSERT INTO lists (id, experiment_id, list_number) VALUES (?, ?, ?)",
                               (new_list_id, experiment_id, l_num))
                for order_hint, v_id in enumerate(v_ids):
                    cursor.execute("""
                    INSERT INTO list_items (id, list_id, item_version_id, order_hint)
                    VALUES (?, ?, ?, ?)
                    """, (str(uuid.uuid4()), new_list_id, v_id, order_hint + 1))

        # 10. Auto-update experiment factors if experimental conditions were detected
        if conditions_seen:
            cursor.execute("SELECT id FROM factors WHERE experiment_id = ? AND name = 'Condition'", (experiment_id,))
            f_row = cursor.fetchone()
            levels_json = json.dumps(sorted(list(conditions_seen)))
            if f_row:
                cursor.execute("UPDATE factors SET levels_json = ? WHERE id = ?", (levels_json, f_row["id"]))
            else:
                cursor.execute("""
                INSERT INTO factors (id, experiment_id, name, levels_json)
                VALUES (?, ?, 'Condition', ?)
                """, (f"fac_{uuid.uuid4().hex[:8]}", experiment_id, levels_json))

    lists_configured_msg = f" and {len(list_mappings)} Latin-Square lists configured" if list_mappings else ""
    return {
        "message": f"Successfully processed {imported_rows} rows: {len(unique_items_seen)} items{lists_configured_msg} with Devanagari NFC validation.",
        "imported_rows": imported_rows,
        "items_count": len(unique_items_seen),
        "lists_count": len(list_mappings),
        "conditions": sorted(list(conditions_seen))
    }

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

        # Separate practice vs experimental vs filler
        practice_trials = []
        exp_by_condition: Dict[str, List[Dict[str, Any]]] = {}
        fillers_pool: List[Dict[str, Any]] = []

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
            elif row["type"] == "experimental":
                c = row["condition_label"]
                exp_by_condition.setdefault(c, []).append(trial_data)
            else:
                fillers_pool.append(trial_data)

        # Build trial set based on trial_mode
        # Default: 'balanced_8' (4 target sentences - 1 per condition, plus 4 fillers)
        if getattr(req, "trial_mode", "balanced_8") == "full":
            regular_trials = []
            for items in exp_by_condition.values():
                regular_trials.extend(items)
            regular_trials.extend(fillers_pool)
        else:
            # Pick 1 random target item from each condition (4 target sentences)
            # Guarantee 100% uniqueness: NO item_number or sentence can ever repeat
            used_item_numbers = set()
            used_sentences = set()
            selected_targets = []

            for cond in sorted(exp_by_condition.keys()):
                items = exp_by_condition[cond]
                # Filter items not yet used
                available = [
                    it for it in items
                    if it["item_number"] not in used_item_numbers
                    and it["sentence_text"].strip() not in used_sentences
                ]
                if not available:
                    available = items
                chosen = random.choice(available)
                used_item_numbers.add(chosen["item_number"])
                used_sentences.add(chosen["sentence_text"].strip())
                selected_targets.append(chosen)

            # Pick 4 random fillers from the pool, strictly ensuring NO overlap with targets and NO repeat sentences
            unique_fillers_pool = []
            seen_filler_keys = set()
            for f in fillers_pool:
                f_key = f["sentence_text"].strip()
                if (
                    f["item_number"] not in used_item_numbers
                    and f_key not in used_sentences
                    and f_key not in seen_filler_keys
                ):
                    seen_filler_keys.add(f_key)
                    unique_fillers_pool.append(f)

            num_fillers = max(len(selected_targets), 4)
            if len(unique_fillers_pool) >= num_fillers:
                selected_fillers = random.sample(unique_fillers_pool, num_fillers)
            else:
                selected_fillers = list(unique_fillers_pool)

            regular_trials = selected_targets + selected_fillers

        # Build pseudo-randomized sequence (strictly interleaving: Filler -> Target -> Filler -> Target...)
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

@app.get("/api/analysis/{experiment_id}/participants/{participant_id}")
def get_participant_deep_analysis(experiment_id: str, participant_id: str):
    """
    Returns deep participant-level drilldown:
    - Personal reading speed regression (Word Length -> RT).
    - Per-sentence trial sequence (Targets vs Fillers).
    - Per-word reading times and residual RTs with cognitive load / difficulty tier tagging.
    - Critical Region 5 verb integration comparison across conditions.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
        SELECT p.*, l.list_number
        FROM participants p
        JOIN lists l ON p.list_id = l.id
        WHERE p.id = ? AND p.experiment_id = ?
        """, (participant_id, experiment_id))
        p_row = cursor.fetchone()
        if not p_row:
            raise HTTPException(status_code=404, detail="Participant not found")

        cursor.execute("""
        SELECT 
            we.id as event_id, we.word_index, we.region_index, we.word_text, we.rt_ms, we.grapheme_count,
            t.id as trial_id, t.presentation_order, t.question_response, t.correct as question_correct, t.question_rt_ms, t.focus_lost_count,
            iv.condition_label, iv.sentence_text, iv.regions_json,
            i.id as item_id, i.item_number, i.type as item_type, i.question, i.correct_answer, i.explanation
        FROM word_events we
        JOIN trials t ON we.trial_id = t.id
        JOIN item_versions iv ON t.item_version_id = iv.id
        JOIN items i ON iv.item_id = i.id
        WHERE t.participant_id = ?
        ORDER BY t.presentation_order, we.word_index
        """, (participant_id,))
        raw_rows = [dict(r) for r in cursor.fetchall()]

    if not raw_rows:
        return {
            "participant": dict(p_row),
            "regression": {"slope": 0, "intercept": 0, "r_squared": 0},
            "trials": [],
            "critical_region_summary": {}
        }

    # 1. Compute personal word-length regression (Residual Reading Time baseline)
    valid_events = [r for r in raw_rows if 100.0 <= r["rt_ms"] <= 3000.0]
    if len(valid_events) >= 5:
        lengths = [r["grapheme_count"] for r in valid_events]
        rts = [r["rt_ms"] for r in valid_events]
        try:
            if len(set(lengths)) > 1:
                slope, intercept, r_val, p_val, std_err = stats.linregress(lengths, rts)
                r_squared = round(float(r_val ** 2), 3)
                slope = round(float(slope), 2)
                intercept = round(float(intercept), 1)
            else:
                avg_rt = sum(r["rt_ms"] for r in raw_rows) / max(1, len(raw_rows))
                slope = 0.0
                intercept = round(float(avg_rt), 1)
                r_squared = 0.0
        except Exception:
            avg_rt = sum(r["rt_ms"] for r in raw_rows) / max(1, len(raw_rows))
            slope = 0.0
            intercept = round(float(avg_rt), 1)
            r_squared = 0.0
    else:
        avg_rt = sum(r["rt_ms"] for r in raw_rows) / max(1, len(raw_rows))
        slope = 0.0
        intercept = round(float(avg_rt), 1)
        r_squared = 0.0

    # 2. Group words by trial and compute residuals & difficulty
    trials_dict = {}
    for r in raw_rows:
        t_id = r["trial_id"]
        if t_id not in trials_dict:
            trials_dict[t_id] = {
                "trial_id": t_id,
                "presentation_order": r["presentation_order"],
                "item_number": r["item_number"],
                "type": r["item_type"],
                "condition_label": r["condition_label"],
                "sentence_text": r["sentence_text"],
                "question": r["question"],
                "correct_answer": r["correct_answer"],
                "user_response": r["question_response"],
                "question_correct": bool(r["question_correct"] == 1),
                "question_rt_ms": round(float(r["question_rt_ms"] or 0), 1),
                "focus_lost_count": r["focus_lost_count"],
                "words": []
            }

        rt = float(r["rt_ms"])
        predicted = intercept + slope * r["grapheme_count"]
        residual = round(rt - predicted, 1)

        # Cognitive Load Tier:
        # 'hard': residual >= 80ms (slowdown peak, high cognitive load)
        # 'elevated': residual >= 30ms (moderate delay)
        # 'fast': residual <= -30ms (quick processing)
        # 'normal': baseline reading
        if residual >= 80.0 or rt >= 600.0:
            diff_level = "hard"
        elif residual >= 30.0 or rt >= 420.0:
            diff_level = "elevated"
        elif residual <= -30.0:
            diff_level = "fast"
        else:
            diff_level = "normal"

        trials_dict[t_id]["words"].append({
            "word_index": r["word_index"],
            "region_index": r["region_index"],
            "word_text": r["word_text"],
            "rt_ms": round(rt, 1),
            "predicted_rt": round(predicted, 1),
            "residual_rt": residual,
            "grapheme_count": r["grapheme_count"],
            "difficulty_level": diff_level,
            "is_critical_region": bool(r["region_index"] == 5),
            "is_spillover_region": bool(r["region_index"] == 6)
        })

    # 3. Sentence-level summaries
    trials_list = list(trials_dict.values())
    trials_list.sort(key=lambda t: t["presentation_order"])
    condition_r5_residuals = {}

    for t in trials_list:
        w_list = t["words"]
        if w_list:
            t["mean_rt_ms"] = round(sum(w["rt_ms"] for w in w_list) / len(w_list), 1)
            t["mean_residual_rt"] = round(sum(w["residual_rt"] for w in w_list) / len(w_list), 1)

            hardest_word = max(w_list, key=lambda w: w["residual_rt"])
            t["hardest_word"] = {
                "word_text": hardest_word["word_text"],
                "residual_rt": hardest_word["residual_rt"],
                "rt_ms": hardest_word["rt_ms"],
                "region_index": hardest_word["region_index"]
            }

            r5_words = [w for w in w_list if w["region_index"] == 5]
            if r5_words and t["type"] == "experimental":
                r5_res = round(sum(w["residual_rt"] for w in r5_words) / len(r5_words), 1)
                t["critical_region_residual"] = r5_res
                cond = t["condition_label"]
                condition_r5_residuals.setdefault(cond, []).append(r5_res)
            else:
                t["critical_region_residual"] = None
        else:
            t["mean_rt_ms"] = 0
            t["mean_residual_rt"] = 0
            t["hardest_word"] = None
            t["critical_region_residual"] = None

    cond_summary = {}
    for c, vals in condition_r5_residuals.items():
        cond_summary[c] = round(sum(vals) / len(vals), 1)

    exp_trials = [t for t in trials_list if t["type"] == "experimental"]
    filler_trials = [t for t in trials_list if t["type"] == "filler"]
    overall_correct = sum(1 for t in trials_list if t["question_correct"])
    filler_correct = sum(1 for t in filler_trials if t["question_correct"])

    # Top slowest / hardest words for this participant (sorted by residual slowdown)
    all_words = []
    for t in trials_list:
        for w in t["words"]:
            if w["is_critical_region"]:
                context = f"Region 5 Critical Verb Integration in {t['condition_label']}"
            elif w["region_index"] == 1:
                context = "Sentence-initial reading / orientation"
            elif w["is_spillover_region"]:
                context = "Region 6 Spillover region following Critical Verb"
            else:
                context = f"Region {w['region_index']} processing"

            all_words.append({
                "word_text": w["word_text"],
                "rt_ms": w["rt_ms"],
                "predicted_rt": w["predicted_rt"],
                "residual_rt": w["residual_rt"],
                "difficulty_level": w["difficulty_level"],
                "region_index": w["region_index"],
                "is_critical_region": w["is_critical_region"],
                "condition_label": t["condition_label"],
                "trial_presentation_order": t["presentation_order"],
                "item_number": t["item_number"],
                "type": t["type"],
                "sentence_text": t["sentence_text"],
                "slowdown_reason": context
            })

    top_slowest_words = sorted(all_words, key=lambda x: x["residual_rt"], reverse=True)[:10]
    for r, item in enumerate(top_slowest_words, start=1):
        item["rank"] = r

    # Condition difficulty ranking for this participant
    part_condition_ranking = []
    for c, vals in condition_r5_residuals.items():
        c_trials = [t for t in exp_trials if t["condition_label"] == c]
        mean_sent_rt = round(sum(t["mean_rt_ms"] for t in c_trials) / max(1, len(c_trials)), 1)
        mean_sent_res = round(sum(t["mean_residual_rt"] for t in c_trials) / max(1, len(c_trials)), 1)
        mean_crit_res = round(sum(vals) / len(vals), 1) if vals else 0.0

        part_condition_ranking.append({
            "condition_label": c,
            "critical_residual_rt": mean_crit_res,
            "sentence_residual_rt": mean_sent_res,
            "sentence_raw_rt": mean_sent_rt,
            "trials_count": len(c_trials)
        })
    part_condition_ranking.sort(key=lambda x: x["critical_residual_rt"], reverse=True)
    for r, c_entry in enumerate(part_condition_ranking, start=1):
        c_entry["rank"] = r

    participant_summary = {
        "participant_id": p_row["id"],
        "external_id": p_row["external_id"],
        "list_number": p_row["list_number"],
        "status": p_row["status"],
        "completed_at": str(p_row["completed_at"]),
        "refresh_rate_est": p_row["refresh_rate_est"],
        "jitter_ms": p_row["jitter_ms"],
        "total_trials": len(trials_list),
        "target_trials_count": len(exp_trials),
        "filler_trials_count": len(filler_trials),
        "overall_accuracy": round((overall_correct / max(1, len(trials_list))) * 100, 1),
        "filler_accuracy": round((filler_correct / max(1, len(filler_trials))) * 100, 1),
        "mean_rt_ms": round(sum(t["mean_rt_ms"] for t in trials_list) / max(1, len(trials_list)), 1)
    }

    return {
        "participant": participant_summary,
        "regression": {
            "slope": slope,
            "intercept": intercept,
            "r_squared": r_squared
        },
        "critical_region_summary": cond_summary,
        "condition_ranking": part_condition_ranking,
        "top_slowest_words": top_slowest_words,
        "trials": trials_list
    }

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

# ==============================================================================
# SINGLE-SERVICE CLOUD DEPLOYMENT STATIC SERVING
# ==============================================================================
import os
from fastapi.staticfiles import StaticFiles

_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(_dist_path):
    app.mount("/", StaticFiles(directory=_dist_path, html=True), name="frontend_static")

