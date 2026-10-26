/**
 * VaniSPR TypeScript Definitions
 */

export interface Factor {
  id?: string;
  name: string;
  levels: string[];
}

export interface Region {
  index: number;
  text: string;
  words: string[];
}

export interface ItemVersion {
  id?: string;
  condition_label: string;
  sentence_text: string;
  regions: Region[];
  word_count?: number;
  grapheme_count?: number;
}

export interface Item {
  id?: string;
  experiment_id?: string;
  item_number: number;
  type: 'experimental' | 'filler' | 'practice';
  question?: string;
  correct_answer?: 'yes' | 'no' | 'haan' | 'nahin' | string;
  explanation?: string;
  versions: ItemVersion[];
}

export interface Experiment {
  id: string;
  host_id: string;
  title: string;
  description: string;
  language: 'hi' | 'en';
  status: 'draft' | 'live' | 'closed';
  template_type: string;
  version: number;
  design?: Factor[];
  instructions?: {
    title: string;
    body: string;
  };
  factors?: Factor[];
  items?: Item[];
  lists_count?: number;
  item_count?: number;
  total_participants?: number;
  completed_participants?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WordEvent {
  word_index: number;
  region_index: number;
  word_text: string;
  rt_ms: number;
  t_shown: number;
  t_pressed: number;
  grapheme_count: number;
  is_repeat?: boolean;
  is_outlier?: boolean;
}

export interface RunnerTrial {
  item_id: string;
  item_number: number;
  type: 'experimental' | 'filler' | 'practice';
  condition_label: string;
  item_version_id: string;
  sentence_text: string;
  regions: Region[];
  question?: string;
  correct_answer?: string;
  explanation?: string;
  presentation_order: number;
  is_practice?: boolean;
}

export interface RunnerSessionInit {
  participant_id: string;
  experiment_id: string;
  list_number: number;
  language: 'hi' | 'en';
  instructions: {
    title: string;
    body: string;
  };
  trials: RunnerTrial[];
}

export interface AnalysisSummary {
  total_events: number;
  analyzed_events: number;
  participants_total: number;
  participants_retained: number;
  critical_region: number;
}

export interface RegionConditionStats {
  mean_residual_rt: number;
  sem_residual_rt: number;
  mean_raw_rt: number;
  count: number;
}

export interface RegionData {
  region_index: number;
  conditions: Record<string, RegionConditionStats>;
}

export interface AnovaResult {
  critical_region: number;
  factor_a_name: string;
  factor_b_name: string;
  f1_statistic: number;
  f1_df: string;
  f1_p_value: number;
  f1_significant: boolean;
  f2_statistic: number;
  f2_df: string;
  f2_p_value: number;
  f2_significant: boolean;
  interpretation: string;
}

export interface ParticipantSummary {
  participant_id: string;
  external_id: string;
  list_number: number;
  filler_accuracy: number;
  overall_accuracy: number;
  mean_rt_ms: number;
  retained: boolean;
}

export interface ConditionAccuracy {
  mean_accuracy: number;
  sem_accuracy: number;
  trial_count: number;
}

export interface WordDetail {
  word_index: number;
  region_index: number;
  word_text: string;
  rt_ms: number;
  predicted_rt: number;
  residual_rt: number;
  grapheme_count: number;
  difficulty_level: 'fast' | 'normal' | 'elevated' | 'hard';
  is_critical_region: boolean;
  is_spillover_region: boolean;
}

export interface SentenceTrialDetail {
  trial_id: string;
  presentation_order: number;
  item_number: number;
  type: 'experimental' | 'filler' | 'practice';
  condition_label: string;
  sentence_text: string;
  question?: string;
  correct_answer?: string;
  user_response?: string;
  question_correct: boolean;
  question_rt_ms: number;
  focus_lost_count: number;
  mean_rt_ms: number;
  mean_residual_rt: number;
  critical_region_residual: number | null;
  hardest_word: {
    word_text: string;
    residual_rt: number;
    rt_ms: number;
    region_index: number;
  } | null;
  words: WordDetail[];
}

export interface ConditionRankItem {
  rank: number;
  condition_label: string;
  critical_residual_rt: number;
  critical_raw_rt: number;
  sentence_residual_rt: number;
  sentence_raw_rt: number;
  accuracy?: number;
  trials_count?: number;
  role_desc?: string;
  cognitive_impact?: string;
}

export interface TopSlowWordItem {
  rank: number;
  word_text: string;
  rt_ms: number;
  predicted_rt: number;
  residual_rt: number;
  difficulty_level: 'fast' | 'normal' | 'elevated' | 'hard';
  region_index: number;
  is_critical_region: boolean;
  condition_label: string;
  trial_presentation_order: number;
  item_number: number;
  type: string;
  sentence_text: string;
  slowdown_reason: string;
}

export interface ParticipantDeepAnalysis {
  participant: {
    participant_id: string;
    external_id: string;
    list_number: number;
    status: string;
    completed_at: string;
    refresh_rate_est: number;
    jitter_ms: number;
    total_trials: number;
    target_trials_count: number;
    filler_trials_count: number;
    overall_accuracy: number;
    filler_accuracy: number;
    mean_rt_ms: number;
  };
  regression: {
    slope: number;
    intercept: number;
    r_squared: number;
  };
  critical_region_summary: Record<string, number>;
  condition_ranking?: ConditionRankItem[];
  top_slowest_words?: TopSlowWordItem[];
  trials: SentenceTrialDetail[];
}

export interface AnalysisResponse {
  summary: AnalysisSummary;
  conditions: string[];
  regions: number[];
  figure_data: RegionData[];
  anova: AnovaResult | null;
  participants_summary: ParticipantSummary[];
  condition_accuracy?: Record<string, ConditionAccuracy>;
  condition_ranking?: ConditionRankItem[];
}

export interface DashboardData {
  participant_stats: {
    total: number;
    completed: number;
    in_progress: number;
  };
  list_balance: Array<{
    list_number: number;
    participant_count: number;
  }>;
  accuracy_by_type: Array<{
    type: string;
    accuracy: number;
    count: number;
  }>;
  recent_quality_flags: Array<{
    flag: string;
    detail: string;
    created_at: string;
    external_id: string;
    participant_id: string;
  }>;
  participants?: Array<{
    id: string;
    external_id: string;
    status: string;
    list_number: number;
    created_at: string;
    completed_at?: string;
    trials_count: number;
    accuracy?: number;
  }>;
}

export interface NormingItem {
  item_id: string;
  item_version_id: string;
  item_number: number;
  type: string;
  condition_label: string;
  sentence_text: string;
}

export interface NormingResult {
  item_number: number;
  condition_label: string;
  mean_rating: number;
  rating_count: number;
}
