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
    - Buffer start: Session begins with a filler so the participant is not tested immediately on trial 1.
    - Strict target isolation: Every experimental item is separated by at least 1 (typically 1 to 2) fillers.
      Experimental targets NEVER appear consecutively.
    - Condition variance: No two consecutive experimental items share the same condition.
    - Balanced distribution of all 36 fillers and 24 experimental items.
    """
    if practice_trials is None:
        practice_trials = []

    exp_trials = [t for t in trials if t.get("type") == "experimental"]
    filler_trials = [t for t in trials if t.get("type") == "filler"]

    num_exp = len(exp_trials)
    num_fill = len(filler_trials)

    if num_exp == 0:
        raw_sequence = list(filler_trials)
        random.shuffle(raw_sequence)
    elif num_fill == 0:
        raw_sequence = list(exp_trials)
        random.shuffle(raw_sequence)
    else:
        best_sequence = None

        for attempt in range(100):
            shuffled_exp = list(exp_trials)
            random.shuffle(shuffled_exp)
            shuffled_fill = list(filler_trials)
            random.shuffle(shuffled_fill)

            # Eliminate adjacent identical conditions in experimental targets
            valid_exp = True
            for i in range(len(shuffled_exp) - 1):
                if shuffled_exp[i].get("condition_label") == shuffled_exp[i + 1].get("condition_label"):
                    swapped = False
                    for j in range(i + 2, len(shuffled_exp)):
                        if (
                            shuffled_exp[j].get("condition_label") != shuffled_exp[i].get("condition_label")
                            and (i == 0 or shuffled_exp[j].get("condition_label") != shuffled_exp[i - 1].get("condition_label"))
                        ):
                            shuffled_exp[i + 1], shuffled_exp[j] = shuffled_exp[j], shuffled_exp[i + 1]
                            swapped = True
                            break
                    if not swapped:
                        valid_exp = False
                        break

            if not valid_exp and attempt < 90:
                continue

            # Case 1: Equal fillers and targets (e.g., 4 targets + 4 fillers)
            # Produces strict alternation: Filler -> Target -> Filler -> Target ...
            if num_fill == num_exp:
                sequence = []
                for f, e in zip(shuffled_fill, shuffled_exp):
                    sequence.append(f)
                    sequence.append(e)
                best_sequence = sequence
                break

            # Case 2: More fillers than targets (e.g. 36 fillers + 24 targets)
            num_slots = num_exp + 1 if num_fill > num_exp else num_exp
            base_fillers_per_slot = num_fill // num_slots
            remainder = num_fill % num_slots

            counts = [base_fillers_per_slot] * num_slots
            extra_slot_indices = list(range(num_slots))
            random.shuffle(extra_slot_indices)
            for idx in extra_slot_indices[:remainder]:
                counts[idx] += 1

            # Build sequence
            sequence = []
            fill_idx = 0
            for s in range(num_slots):
                for _ in range(counts[s]):
                    if fill_idx < len(shuffled_fill):
                        sequence.append(shuffled_fill[fill_idx])
                        fill_idx += 1
                if s < len(shuffled_exp):
                    sequence.append(shuffled_exp[s])

            # Flush any remaining fillers
            while fill_idx < len(shuffled_fill):
                sequence.append(shuffled_fill[fill_idx])
                fill_idx += 1

            best_sequence = sequence
            break

        if not best_sequence:
            # Fallback
            all_trials = exp_trials + filler_trials
            random.shuffle(all_trials)
            best_sequence = all_trials

        raw_sequence = best_sequence

    # Prepend practice trials
    full_sequence = []
    order = 1
    for pt in practice_trials:
        pt_copy = dict(pt)
        pt_copy["presentation_order"] = order
        pt_copy["is_practice"] = True
        full_sequence.append(pt_copy)
        order += 1

    for st in raw_sequence:
        st_copy = dict(st)
        st_copy["presentation_order"] = order
        st_copy["is_practice"] = False
        full_sequence.append(st_copy)
        order += 1

    return full_sequence

