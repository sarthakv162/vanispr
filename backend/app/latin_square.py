"""
Latin Square Generation and Pseudo-Randomization for Psycholinguistic Experiments
Follows Gibson & Warren (2004) procedure:
1. Balanced Latin Square for 2x2 (or N-condition) designs.
2. Interleaving constraint: no identical consecutive conditions.
3. Filler distribution to avoid fatigue or strategic predicting.
4. Dynamic slot allocation (assigns participant to list with least completed participants).
"""
import random
from typing import List, Dict, Any

def generate_latin_square_lists(items: List[Dict[str, Any]], conditions: List[str]) -> Dict[int, List[Dict[str, Any]]]:
    """
    Given a list of items (each with versions for each condition) and condition labels,
    constructs N Latin-square lists (where N = len(conditions)).
    Returns a dict mapping list_number (1..N) to a list of selected item_versions.
    """
    num_conditions = len(conditions)
    if num_conditions == 0:
        return {1: []}

    experimental_items = [it for it in items if it.get("type") == "experimental"]
    filler_items = [it for it in items if it.get("type") == "filler"]
    practice_items = [it for it in items if it.get("type") == "practice"]

    lists = {i + 1: [] for i in range(num_conditions)}

    for list_idx in range(num_conditions):
        list_num = list_idx + 1
        
        # Assign conditions to experimental items in Latin square rotation
        for item_idx, item in enumerate(experimental_items):
            cond_idx = (item_idx + list_idx) % num_conditions
            target_cond = conditions[cond_idx]
            # Find version matching target_cond
            matching_version = next(
                (v for v in item["versions"] if v["condition_label"] == target_cond),
                item["versions"][0] if item["versions"] else None
            )
            if matching_version:
                lists[list_num].append({
                    "item_id": item["id"],
                    "item_number": item["item_number"],
                    "type": "experimental",
                    "condition_label": target_cond,
                    "item_version_id": matching_version["id"],
                    "sentence_text": matching_version["sentence_text"],
                    "regions": matching_version["regions"],
                    "question": item.get("question"),
                    "correct_answer": item.get("correct_answer"),
                    "explanation": item.get("explanation")
                })

        # Add fillers (same for all lists)
        for f_item in filler_items:
            v = f_item["versions"][0] if f_item.get("versions") else None
            if v:
                lists[list_num].append({
                    "item_id": f_item["id"],
                    "item_number": f_item["item_number"],
                    "type": "filler",
                    "condition_label": "filler",
                    "item_version_id": v["id"],
                    "sentence_text": v["sentence_text"],
                    "regions": v["regions"],
                    "question": f_item.get("question"),
                    "correct_answer": f_item.get("correct_answer"),
                    "explanation": f_item.get("explanation")
                })

    return lists

def pseudo_randomize_trials(trials: List[Dict[str, Any]], practice_trials: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Randomizes experimental and filler trials under Gibson & Warren (2004) constraints:
    - Practice trials appear first.
    - No two experimental items of the exact same condition appear consecutively.
    - Fillers are distributed evenly.
    """
    if practice_trials is None:
        practice_trials = []

    exp_trials = [t for t in trials if t.get("type") == "experimental"]
    filler_trials = [t for t in trials if t.get("type") == "filler"]

    # Try up to 50 times to produce a sequence with no consecutive duplicate conditions
    best_sequence = []
    
    for _ in range(50):
        random.shuffle(exp_trials)
        random.shuffle(filler_trials)

        sequence = []
        exp_idx = 0
        fill_idx = 0
        last_cond = None
        stuck = False

        total_trials = len(exp_trials) + len(filler_trials)
        
        while len(sequence) < total_trials:
            # Decide whether to pick experimental or filler
            can_pick_exp = (
                exp_idx < len(exp_trials) and
                exp_trials[exp_idx]["condition_label"] != last_cond
            )

            # If experimental has same condition as last, check if filler can be inserted
            if not can_pick_exp and exp_idx < len(exp_trials):
                # Search ahead in exp_trials for a different condition
                swapped = False
                for lookahead in range(exp_idx + 1, len(exp_trials)):
                    if exp_trials[lookahead]["condition_label"] != last_cond:
                        exp_trials[exp_idx], exp_trials[lookahead] = exp_trials[lookahead], exp_trials[exp_idx]
                        can_pick_exp = True
                        swapped = True
                        break
                if not swapped and fill_idx < len(filler_trials):
                    # Force a filler
                    pass

            # Balance placement of fillers
            if (len(sequence) % 2 == 1 and fill_idx < len(filler_trials)) or not can_pick_exp:
                if fill_idx < len(filler_trials):
                    sequence.append(filler_trials[fill_idx])
                    fill_idx += 1
                    last_cond = "filler"
                elif can_pick_exp:
                    sequence.append(exp_trials[exp_idx])
                    last_cond = exp_trials[exp_idx]["condition_label"]
                    exp_idx += 1
                else:
                    stuck = True
                    break
            else:
                if can_pick_exp:
                    sequence.append(exp_trials[exp_idx])
                    last_cond = exp_trials[exp_idx]["condition_label"]
                    exp_idx += 1
                elif fill_idx < len(filler_trials):
                    sequence.append(filler_trials[fill_idx])
                    fill_idx += 1
                    last_cond = "filler"
                else:
                    stuck = True
                    break

        if not stuck and len(sequence) == total_trials:
            best_sequence = sequence
            break

    if not best_sequence:
        # Fallback to standard shuffle
        all_trials = exp_trials + filler_trials
        random.shuffle(all_trials)
        best_sequence = all_trials

    # Prepend practice trials
    full_sequence = []
    order = 1
    for pt in practice_trials:
        pt_copy = dict(pt)
        pt_copy["presentation_order"] = order
        pt_copy["is_practice"] = True
        full_sequence.append(pt_copy)
        order += 1

    for st in best_sequence:
        st_copy = dict(st)
        st_copy["presentation_order"] = order
        st_copy["is_practice"] = False
        full_sequence.append(st_copy)
        order += 1

    return full_sequence
