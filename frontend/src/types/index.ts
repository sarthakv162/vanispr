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

export interface AnalysisResponse {
  summary: AnalysisSummary;
  conditions: string[];
  regions: number[];
  figure_data: RegionData[];
  anova: AnovaResult | null;
  participants_summary: ParticipantSummary[];
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
