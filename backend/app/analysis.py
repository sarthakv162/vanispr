"""
Psycholinguistic Analysis Pipeline for AadyaLang SPR
Replicates Gibson & Warren (2004) Analysis Pipeline:
1. Long-format data extraction.
2. Participant exclusion by filler accuracy (< 75%).
3. Outlier trimming (< 100ms or > 3000ms).
4. Per-participant linear regression of RT on word length (grapheme count).
5. Residual Reading Time computation: residual = actual_RT - predicted_RT.
6. Region-by-region aggregation with Standard Error of the Mean (SEM).
7. 2x2 Repeated Measures ANOVA interaction test (F1 by participants, F2 by items).
8. R and Python mixed-effects model script generators.
"""
import math
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any, List

def compute_spr_analysis(raw_word_events: List[Dict[str, Any]], filler_accuracy_threshold: float = 0.75, rt_min: float = 100.0, rt_max: float = 3000.0) -> Dict[str, Any]:
    """
    Takes flat word event dictionaries from the database and runs the complete Gibson & Warren (2004) pipeline.
    """
    if not raw_word_events:
        return {
            "summary": {
                "total_events": 0,
                "analyzed_events": 0,
                "participants_total": 0,
                "participants_retained": 0,
                "critical_region": 5
            },
            "conditions": [],
            "regions": [],
            "anova": None,
            "figure_data": [],
            "participants_summary": [],
            "condition_accuracy": {},
            "condition_ranking": []
        }

    df = pd.DataFrame(raw_word_events)

    # Clean types
    df["rt_ms"] = pd.to_numeric(df["rt_ms"], errors="coerce")
    df["grapheme_count"] = pd.to_numeric(df["grapheme_count"], errors="coerce").fillna(5)
    df["region_index"] = pd.to_numeric(df["region_index"], errors="coerce").astype(int)
    df["item_number"] = pd.to_numeric(df["item_number"], errors="coerce").fillna(0).astype(int)
    
    total_events = len(df)
    unique_participants = df["participant_id"].unique().tolist()
    total_participants = len(unique_participants)

    # 1. Filter out practice trials
    df_non_practice = df[df["is_practice"] == 0].copy()

    # 2. Compute filler accuracy per participant
    participants_summary = []
    retained_participants = []

    for pid in unique_participants:
        p_df = df_non_practice[df_non_practice["participant_id"] == pid]
        p_trials = p_df.drop_duplicates(subset=["trial_id"])
        
        filler_trials = p_trials[p_trials["item_type"] == "filler"]
        filler_correct = filler_trials["question_correct"].sum() if "question_correct" in filler_trials else 0
        filler_total = len(filler_trials)
        filler_acc = (filler_correct / filler_total) if filler_total > 0 else 1.0

        all_correct = p_trials["question_correct"].sum() if "question_correct" in p_trials else 0
        all_total = len(p_trials)
        overall_acc = (all_correct / all_total) if all_total > 0 else 1.0

        mean_rt = p_df["rt_ms"].mean() if len(p_df) > 0 else 0
        has_sufficient_trials = bool(all_total >= 4)
        passed_filter = bool(filler_acc >= filler_accuracy_threshold and has_sufficient_trials)

        participants_summary.append({
            "participant_id": str(pid),
            "external_id": str(p_df["external_id"].iloc[0]) if "external_id" in p_df and not p_df["external_id"].empty else str(pid[:8]),
            "list_number": int(p_df["list_number"].iloc[0]) if "list_number" in p_df and not p_df["list_number"].empty else 1,
            "filler_accuracy": round(float(filler_acc * 100), 1),
            "overall_accuracy": round(float(overall_acc * 100), 1),
            "mean_rt_ms": round(float(mean_rt), 1),
            "retained": passed_filter
        })

        if passed_filter:
            retained_participants.append(pid)

    # Filter by retained participants
    df_retained = df_non_practice[df_non_practice["participant_id"].isin(retained_participants)].copy()

    # 3. RT outlier trimming
    df_trimmed = df_retained[(df_retained["rt_ms"] >= rt_min) & (df_retained["rt_ms"] <= rt_max)].copy()

    # 4. Residual Reading Times via per-participant linear regression on word length
    df_trimmed["residual_rt"] = 0.0

    for pid in retained_participants:
        p_mask = df_trimmed["participant_id"] == pid
        p_data = df_trimmed[p_mask]

        if len(p_data) >= 5:
            x = p_data["grapheme_count"].values
            y = p_data["rt_ms"].values
            try:
                if len(set(x)) > 1 and np.std(x) > 0:
                    slope, intercept, r_val, p_val, std_err = stats.linregress(x, y)
                    predicted_y = intercept + slope * x
                    df_trimmed.loc[p_mask, "residual_rt"] = y - predicted_y
                else:
                    df_trimmed.loc[p_mask, "residual_rt"] = df_trimmed.loc[p_mask, "rt_ms"] - df_trimmed.loc[p_mask, "rt_ms"].mean()
            except Exception:
                df_trimmed.loc[p_mask, "residual_rt"] = df_trimmed.loc[p_mask, "rt_ms"] - df_trimmed.loc[p_mask, "rt_ms"].mean()
        else:
            df_trimmed.loc[p_mask, "residual_rt"] = df_trimmed.loc[p_mask, "rt_ms"] - df_trimmed.loc[p_mask, "rt_ms"].mean()

    # Filter to experimental items for condition-level ANOVA and region plots
    exp_df = df_trimmed[df_trimmed["item_type"] == "experimental"].copy()

    # Compute region summaries
    regions = sorted(exp_df["region_index"].unique().tolist())
    conditions = sorted(exp_df["condition_label"].unique().tolist())

    figure_data = []
    
    for r in regions:
        r_df = exp_df[exp_df["region_index"] == r]
        region_entry = {
            "region_index": int(r),
            "conditions": {}
        }

        for c in conditions:
            c_df = r_df[r_df["condition_label"] == c]
            if len(c_df) > 0:
                mean_res = float(c_df["residual_rt"].mean())
                sem_res = float(c_df["residual_rt"].sem()) if len(c_df) > 1 else 0.0
                mean_raw = float(c_df["rt_ms"].mean())
                n = len(c_df)
                region_entry["conditions"][c] = {
                    "mean_residual_rt": round(mean_res, 1),
                    "sem_residual_rt": round(sem_res, 1) if not math.isnan(sem_res) else 0.0,
                    "mean_raw_rt": round(mean_raw, 1),
                    "count": n
                }
            else:
                region_entry["conditions"][c] = {
                    "mean_residual_rt": 0.0,
                    "sem_residual_rt": 0.0,
                    "mean_raw_rt": 0.0,
                    "count": 0
                }
        figure_data.append(region_entry)

    # 5. ANOVA / Interaction Test at Critical Region (Region 5 or midpoint)
    critical_region = 5 if 5 in regions else (regions[len(regions) // 2] if regions else 1)
    crit_df = exp_df[exp_df["region_index"] == critical_region].copy()

    anova_result = None
    if len(crit_df) > 10 and len(conditions) >= 4:
        # Determine 2x2 factor breakdown from condition labels
        # e.g. +extract_VP, +extract_NP, -extract_VP, -extract_NP
        def parse_factors(label):
            parts = label.replace(" ", "").split("_")
            if len(parts) >= 2:
                return parts[0], parts[1]
            return label, "default"

        crit_df["factor_a"] = crit_df["condition_label"].apply(lambda c: parse_factors(c)[0])
        crit_df["factor_b"] = crit_df["condition_label"].apply(lambda c: parse_factors(c)[1])

        # Participant-level aggregation (F1)
        p_agg = crit_df.groupby(["participant_id", "factor_a", "factor_b"])["residual_rt"].mean().reset_index()

        # Item-level aggregation (F2)
        i_agg = crit_df.groupby(["item_number", "factor_a", "factor_b"])["residual_rt"].mean().reset_index()

        # Two-way ANOVA via Ordinary Least Squares on participant means
        try:
            import statsmodels.api as sm
            from statsmodels.formula.api import ols

            model_f1 = ols('residual_rt ~ C(factor_a) * C(factor_b)', data=p_agg).fit()
            table_f1 = sm.stats.anova_lm(model_f1, typ=2)

            f_inter_f1 = float(table_f1.loc["C(factor_a):C(factor_b)", "F"]) if "C(factor_a):C(factor_b)" in table_f1.index else 0.0
            p_inter_f1 = float(table_f1.loc["C(factor_a):C(factor_b)", "PR(>F)"]) if "C(factor_a):C(factor_b)" in table_f1.index else 1.0
            if math.isnan(f_inter_f1):
                f_inter_f1 = 0.0
            if math.isnan(p_inter_f1):
                p_inter_f1 = 1.0

            df_num_f1 = int(table_f1.loc["C(factor_a):C(factor_b)", "df"]) if "C(factor_a):C(factor_b)" in table_f1.index else 1
            df_den_f1 = int(table_f1.loc["Residual", "df"]) if "Residual" in table_f1.index else max(1, len(retained_participants) - 4)

            # Item ANOVA (F2)
            model_f2 = ols('residual_rt ~ C(factor_a) * C(factor_b)', data=i_agg).fit()
            table_f2 = sm.stats.anova_lm(model_f2, typ=2)
            f_inter_f2 = float(table_f2.loc["C(factor_a):C(factor_b)", "F"]) if "C(factor_a):C(factor_b)" in table_f2.index else 0.0
            p_inter_f2 = float(table_f2.loc["C(factor_a):C(factor_b)", "PR(>F)"]) if "C(factor_a):C(factor_b)" in table_f2.index else 1.0
            if math.isnan(f_inter_f2):
                f_inter_f2 = 0.0
            if math.isnan(p_inter_f2):
                p_inter_f2 = 1.0
            df_den_f2 = int(table_f2.loc["Residual", "df"]) if "Residual" in table_f2.index else 15

            anova_result = {
                "critical_region": critical_region,
                "factor_a_name": "Factor A (e.g. Extraction)",
                "factor_b_name": "Factor B (e.g. Phrase Type)",
                "f1_statistic": round(f_inter_f1, 2),
                "f1_df": f"({df_num_f1}, {df_den_f1})",
                "f1_p_value": round(p_inter_f1, 4),
                "f1_significant": bool(p_inter_f1 < 0.05),
                "f2_statistic": round(f_inter_f2, 2),
                "f2_df": f"({df_num_f1}, {df_den_f2})",
                "f2_p_value": round(p_inter_f2, 4),
                "f2_significant": bool(p_inter_f2 < 0.05),
                "interpretation": (
                    f"Significant interaction at Region {critical_region} (F1={f_inter_f1:.2f}, p={p_inter_f1:.3f}), "
                    "consistent with the Gibson & Warren (2004) intermediate syntactic structure hypothesis."
                    if p_inter_f1 < 0.05 else
                    f"Interaction at Region {critical_region} is not statistically significant (p={p_inter_f1:.3f})."
                )
            }
        except Exception as e:
            anova_result = {"error": str(e), "critical_region": critical_region}

    # 6. Condition-level Comprehension Question Accuracy (Replicating Paper Table 2)
    condition_accuracy = {}
    exp_trials_all = df_retained[df_retained["item_type"] == "experimental"].drop_duplicates(subset=["trial_id"])
    for c in conditions:
        c_trials = exp_trials_all[exp_trials_all["condition_label"] == c]
        if len(c_trials) > 0 and "question_correct" in c_trials:
            p_accs = c_trials.groupby("participant_id")["question_correct"].mean() * 100.0
            mean_acc = float(p_accs.mean())
            sem_acc = float(p_accs.sem()) if len(p_accs) > 1 else 0.0
            condition_accuracy[c] = {
                "mean_accuracy": round(mean_acc, 1),
                "sem_accuracy": round(sem_acc, 1) if not math.isnan(sem_acc) else 0.0,
                "trial_count": len(c_trials)
            }
        else:
            condition_accuracy[c] = {
                "mean_accuracy": 0.0,
                "sem_accuracy": 0.0,
                "trial_count": 0
            }

    # 7. Overall Condition Processing Time & Difficulty Ranking (All Retained Participants)
    condition_ranking = []
    for c in conditions:
        c_exp = exp_df[exp_df["condition_label"] == c]
        c_crit = crit_df[crit_df["condition_label"] == c]

        crit_res = float(c_crit["residual_rt"].mean()) if len(c_crit) > 0 else 0.0
        crit_raw = float(c_crit["rt_ms"].mean()) if len(c_crit) > 0 else 0.0
        sentence_res = float(c_exp["residual_rt"].mean()) if len(c_exp) > 0 else 0.0
        sentence_raw = float(c_exp["rt_ms"].mean()) if len(c_exp) > 0 else 0.0
        acc_info = condition_accuracy.get(c, {})

        label_lower = c.lower()
        if "np" in label_lower and ("ext" in label_lower or "+extract" in label_lower):
            role_desc = "Extraction across NP boundary (Maximal memory integration cost)"
            cognitive_impact = "Highest Cognitive Load"
        elif ("vp" in label_lower or "clause" in label_lower) and ("ext" in label_lower or "+extract" in label_lower):
            role_desc = "Extraction across clause (Facilitated by intermediate trace)"
            cognitive_impact = "Intermediate Facilitation"
        elif "np" in label_lower:
            role_desc = "Non-extraction canonical control with NP"
            cognitive_impact = "Local Baseline"
        else:
            role_desc = "Non-extraction canonical control with clause"
            cognitive_impact = "Fluent Baseline"

        condition_ranking.append({
            "condition_label": c,
            "critical_residual_rt": round(crit_res, 1),
            "critical_raw_rt": round(crit_raw, 1),
            "sentence_residual_rt": round(sentence_res, 1),
            "sentence_raw_rt": round(sentence_raw, 1),
            "accuracy": acc_info.get("mean_accuracy", 0.0),
            "role_desc": role_desc,
            "cognitive_impact": cognitive_impact
        })

    condition_ranking.sort(key=lambda x: x["critical_residual_rt"], reverse=True)
    for rank, entry in enumerate(condition_ranking, start=1):
        entry["rank"] = rank

    return {
        "summary": {
            "total_events": total_events,
            "analyzed_events": len(df_trimmed),
            "participants_total": total_participants,
            "participants_retained": len(retained_participants),
            "critical_region": critical_region
        },
        "conditions": conditions,
        "regions": regions,
        "figure_data": figure_data,
        "anova": anova_result,
        "participants_summary": participants_summary,
        "condition_accuracy": condition_accuracy,
        "condition_ranking": condition_ranking
    }

def generate_r_script(experiment_title: str) -> str:
    return f"""# ==============================================================================
# R Linear Mixed-Effects Model Analysis Script
# Experiment: {experiment_title}
# Based on Gibson & Warren (2004) & Modern Psycholinguistics Standards
# ==============================================================================

# Install required packages if not already installed
if (!require("lme4")) install.packages("lme4")
if (!require("lmerTest")) install.packages("lmerTest")
if (!require("tidyverse")) install.packages("tidyverse")

library(lme4)
library(lmerTest)
library(tidyverse)

# 1. Load Data
data <- read.csv("spr_tidy_data.csv", stringsAsFactors = FALSE)

# 2. Filter exclusions
exp_data <- data %>%
  filter(
    is_practice == 0,
    item_type == "experimental",
    rt_ms >= 100,
    rt_ms <= 3000
  )

# 3. Fit Residual RT model
exp_data <- exp_data %>%
  group_by(participant_id) %>%
  mutate(
    pred_rt = predict(lm(rt_ms ~ grapheme_count)),
    residual_rt = rt_ms - pred_rt
  ) %>%
  ungroup()

# 4. Critical Region Analysis (Region 5)
crit_data <- exp_data %>% filter(region_index == 5)

# Separate condition into factors
crit_data <- crit_data %>%
  separate(condition_label, into = c("extraction", "phrase_type"), sep = "_")

# Contrast coding (sum contrasts for orthogonal factors)
contrasts(crit_data$extraction) <- contr.sum(2)
contrasts(crit_data$phrase_type) <- contr.sum(2)

# 5. Fit Linear Mixed-Effects Model (LMM)
# Random intercepts and slopes for subjects and items
model <- lmer(
  residual_rt ~ extraction * phrase_type + 
    (1 + extraction * phrase_type | participant_id) + 
    (1 + extraction * phrase_type | item_number),
  data = crit_data,
  control = lmerControl(optimizer = "bobyqa")
)

summary(model)
anova(model)
"""

def generate_python_script(experiment_title: str) -> str:
    return f'''"""
Python Statsmodels Mixed-Effects Model Analysis Script
Experiment: {experiment_title}
Replicating Gibson & Warren (2004) Analysis Pipeline
"""
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

# 1. Load exported tidy data
df = pd.read_csv("spr_tidy_data.csv")

# 2. Filter exclusions (practice trials and RT outliers)
df_exp = df[
    (df["is_practice"] == 0) & 
    (df["item_type"] == "experimental") & 
    (df["rt_ms"] >= 100) & 
    (df["rt_ms"] <= 3000)
].copy()

# 3. Compute Residual RTs per participant
def compute_residuals(group):
    model = sm.OLS(group["rt_ms"], sm.add_constant(group["grapheme_count"])).fit()
    group["residual_rt"] = model.resid
    return group

df_exp = df_exp.groupby("participant_id", group_keys=False).apply(compute_residuals)

# 4. Critical Region (Region 5)
crit = df_exp[df_exp["region_index"] == 5].copy()
parts = crit["condition_label"].str.split("_", expand=True)
crit["factor_a"] = parts[0]
crit["factor_b"] = parts[1]

# 5. Fit Linear Mixed Model (random intercepts for participant and item)
lmm = smf.mixedlm(
    "residual_rt ~ C(factor_a) * C(factor_b)",
    data=crit,
    groups=crit["participant_id"]
).fit()

print(lmm.summary())
'''
