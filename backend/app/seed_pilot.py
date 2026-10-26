"""
Seed 12 Benchmark Pilot Participants for Hindi SOV Experiment
(or any specified experiment)
"""
import uuid
import json
import random
from app.database import get_db

def seed_pilot_participants_for_exp(exp_id: str, count: int = 12):
    with get_db() as conn:
        cursor = conn.cursor()

        # Get experiment lists
        cursor.execute("SELECT id, list_number FROM lists WHERE experiment_id = ? ORDER BY list_number", (exp_id,))
        lists = cursor.fetchall()
        if not lists:
            print(f"No lists found for experiment {exp_id}")
            return 0

        list_map = {row["list_number"]: row["id"] for row in lists}
        list_nums = sorted(list(list_map.keys()))

        prefix = "hindi_pilot" if "hindi" in exp_id else "eng_pilot"
        code_prefix = "HIN_P" if "hindi" in exp_id else "ENG_P"

        # Clean previous pilot participants for a fresh, clean re-seed
        cursor.execute("SELECT id FROM participants WHERE experiment_id = ? AND (id LIKE ? OR external_id LIKE ?)", (exp_id, f"part_{prefix}_%", f"{code_prefix}%"))
        prev_pids = [row["id"] for row in cursor.fetchall()]
        if prev_pids:
            cursor.execute(f"DELETE FROM word_events WHERE trial_id IN (SELECT id FROM trials WHERE participant_id IN ({','.join(['?']*len(prev_pids))}))", prev_pids)
            cursor.execute(f"DELETE FROM trials WHERE participant_id IN ({','.join(['?']*len(prev_pids))})", prev_pids)
            cursor.execute(f"DELETE FROM participants WHERE id IN ({','.join(['?']*len(prev_pids))})", prev_pids)

        print(f"Seeding {count} benchmark pilot participants for {exp_id}...")

        for p_idx in range(count):
            pid = f"part_{prefix}_{p_idx + 1:03d}"
            list_num = list_nums[p_idx % len(list_nums)]
            list_id = list_map[list_num]

            cursor.execute("""
            INSERT OR REPLACE INTO participants (
                id, experiment_id, list_id, external_id, consent_at,
                user_agent, screen_w, screen_h, refresh_rate_est, jitter_ms,
                background_json, status, completed_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 1920, 1080, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
            """, (
                pid, exp_id, list_id, f"{code_prefix}{p_idx + 101}",
                "Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0.0.0 Safari/537.36",
                random.choice([60.0, 120.0, 144.0]),
                round(random.uniform(1.8, 3.4), 2),
                json.dumps({"age": random.randint(21, 35), "native_language": "Hindi" if "hindi" in exp_id else "English", "reading_glasses": "no"})
            ))

            # Retrieve items assigned to this list
            cursor.execute("""
            SELECT li.item_version_id, iv.condition_label, iv.regions_json, i.item_number, i.type as item_type, i.correct_answer
            FROM list_items li
            JOIN item_versions iv ON li.item_version_id = iv.id
            JOIN items i ON iv.item_id = i.id
            WHERE li.list_id = ?
            ORDER BY li.order_hint
            """, (list_id,))
            assigned_trials = cursor.fetchall()

            base_intercept = random.uniform(280, 350)
            length_slope = random.uniform(18, 25)

            for t_idx, trial_row in enumerate(assigned_trials):
                trial_id = f"trial_{pid}_{t_idx + 1}"
                # Comprehension question accuracy ~ 92%
                is_correct = 1 if random.random() < 0.92 else 0
                q_rt = random.uniform(1200, 2400)

                cursor.execute("""
                INSERT OR REPLACE INTO trials (
                    id, participant_id, item_version_id, presentation_order,
                    started_at, completed_at, question_response, correct, question_rt_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    trial_id, pid, trial_row["item_version_id"], t_idx + 1,
                    1000.0, 5000.0,
                    trial_row["correct_answer"] if is_correct else ("no" if trial_row["correct_answer"] == "yes" else "yes"),
                    is_correct, q_rt
                ))

                regions = json.loads(trial_row["regions_json"])
                word_global_idx = 0
                cond = trial_row["condition_label"]

                for r in regions:
                    r_idx = r["index"]
                    words = r["words"]

                    # Gibson & Warren (2004) critical region effect at Region 5
                    condition_boost = 0.0
                    if r_idx == 5:
                        if cond in ("+extract_NP", "ext_NP"):
                            condition_boost = random.uniform(125, 165)  # Peak Slowdown: High integration cost
                        elif cond in ("+extract_VP", "ext_clause"):
                            condition_boost = random.uniform(55, 78)    # Facilitated: Intermediate trace
                        elif cond in ("-extract_NP", "non_NP"):
                            condition_boost = random.uniform(15, 38)
                        elif cond in ("-extract_VP", "non_clause"):
                            condition_boost = random.uniform(-5, 18)
                    elif r_idx == 6: # Spillover
                        if "ext" in cond:
                            condition_boost = random.uniform(25, 55)

                    for w in words:
                        graphemes = len(w)
                        noise = random.gauss(0, 32)
                        simulated_rt = max(180, base_intercept + length_slope * graphemes + condition_boost + noise)

                        cursor.execute("""
                        INSERT OR REPLACE INTO word_events (
                            id, trial_id, word_index, region_index, word_text,
                            rt_ms, t_shown, t_pressed, grapheme_count, is_repeat, is_outlier
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                        """, (
                            str(uuid.uuid4()), trial_id, word_global_idx, r_idx, w,
                            round(simulated_rt, 1),
                            1000.0 + word_global_idx * 400,
                            1000.0 + word_global_idx * 400 + simulated_rt,
                            graphemes
                        ))
                        word_global_idx += 1

        print(f"Successfully seeded {count} pilot participants for {exp_id}!")
        return count

if __name__ == "__main__":
    seed_pilot_participants_for_exp("exp_hindi_sov_rel_2026", 12)
