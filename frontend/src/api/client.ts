/**
 * VaniSPR API Client
 */
import {
  Experiment, Item, RunnerSessionInit,
  AnalysisResponse, DashboardData, NormingItem, NormingResult,
  ParticipantDeepAnalysis
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` 
  : '/api';

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // Experiments
  async getExperiments(): Promise<Experiment[]> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments`);
    if (!res.ok) throw new Error('Failed to fetch experiments');
    return res.json();
  },

  async getExperiment(id: string): Promise<Experiment> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${id}`);
    if (!res.ok) throw new Error('Failed to fetch experiment details');
    return res.json();
  },

  async createExperiment(data: Partial<Experiment>): Promise<{ id: string }> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create experiment');
    return res.json();
  },

  async updateExperiment(id: string, data: Partial<Experiment>): Promise<void> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update experiment');
  },

  async addItem(experimentId: string, item: Partial<Item>): Promise<void> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to add item');
  },

  async deleteItem(experimentId: string, itemId: string): Promise<void> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/items/${itemId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete item');
  },

  async generateLists(experimentId: string): Promise<{ message: string; conditions: string[] }> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/generate-lists`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to generate Latin Square lists');
    return res.json();
  },

  async uploadCsv(experimentId: string, file: File, clearExisting: boolean = false): Promise<{ message: string; imported_rows?: number; items_count?: number; lists_count?: number; conditions?: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/import-csv?clear_existing=${clearExisting}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload CSV');
    }
    return res.json();
  },

  // Runner
  async initRunnerSession(params: {
    experiment_id: string;
    external_id?: string;
    screen_w: number;
    screen_h: number;
    user_agent: string;
    refresh_rate_est: number;
    jitter_ms: number;
    background?: Record<string, any>;
    trial_mode?: string;
  }): Promise<RunnerSessionInit> {
    const res = await fetchWithTimeout(`${BASE_URL}/runner/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to initialize runner session');
    return res.json();
  },

  async submitTrial(data: any): Promise<{ status: string; trial_id: string }> {
    const res = await fetchWithTimeout(`${BASE_URL}/runner/trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit trial');
    return res.json();
  },

  async completeRunnerSession(participant_id: string): Promise<{ status: string; completion_code: string }> {
    const res = await fetchWithTimeout(`${BASE_URL}/runner/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id })
    });
    if (!res.ok) throw new Error('Failed to complete runner session');
    return res.json();
  },

  // Dashboard & Analysis
  async getDashboard(experimentId: string): Promise<DashboardData> {
    const res = await fetchWithTimeout(`${BASE_URL}/dashboard/${experimentId}`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
  },

  async getAnalysis(experimentId: string, fillerAcc = 0.75, rtMin = 100, rtMax = 3000): Promise<AnalysisResponse> {
    const res = await fetchWithTimeout(`${BASE_URL}/analysis/${experimentId}?filler_acc=${fillerAcc}&rt_min=${rtMin}&rt_max=${rtMax}`);
    if (!res.ok) throw new Error('Failed to fetch analysis');
    return res.json();
  },

  async getParticipantAnalysis(experimentId: string, participantId: string): Promise<ParticipantDeepAnalysis> {
    const res = await fetchWithTimeout(`${BASE_URL}/analysis/${experimentId}/participants/${participantId}`);
    if (!res.ok) throw new Error('Failed to fetch participant deep analysis');
    return res.json();
  },

  async deleteParticipant(experimentId: string, participantId: string): Promise<{ status: string; message: string }> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/participants/${participantId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete participant');
    return res.json();
  },

  async clearParticipants(experimentId: string, targetType: 'all' | 'pilots_only' | 'non_pilots_only' = 'non_pilots_only'): Promise<{ status: string; deleted_count: number; message: string }> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/participants?target_type=${targetType}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear participants');
    return res.json();
  },

  async seedPilotData(experimentId: string): Promise<{ status: string; pilot_participants_count: number; message: string }> {
    const res = await fetchWithTimeout(`${BASE_URL}/experiments/${experimentId}/seed-pilot`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to seed pilot benchmark data');
    return res.json();
  },

  getExportCsvUrl(experimentId: string): string {
    return `${BASE_URL}/analysis/${experimentId}/export-csv`;
  },

  getExportRScriptUrl(experimentId: string): string {
    return `${BASE_URL}/analysis/${experimentId}/export-r-script`;
  },

  getExportPythonScriptUrl(experimentId: string): string {
    return `${BASE_URL}/analysis/${experimentId}/export-python-script`;
  },

  getExportDbUrl(): string {
    return `${BASE_URL}/admin/backup-db`;
  },

  async restoreDatabase(file: File): Promise<{ status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithTimeout(`${BASE_URL}/admin/restore-db`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to restore database' }));
      throw new Error(err.detail || 'Failed to restore database');
    }
    return res.json();
  },

  // Norming Module
  async getNormingItems(experimentId: string): Promise<NormingItem[]> {
    const res = await fetchWithTimeout(`${BASE_URL}/norming/${experimentId}`);
    if (!res.ok) throw new Error('Failed to fetch norming items');
    return res.json();
  },

  async submitNormingRating(data: {
    experiment_id: string;
    item_version_id: string;
    rater_id: string;
    rating: number;
    feedback?: string;
  }): Promise<void> {
    const res = await fetchWithTimeout(`${BASE_URL}/norming/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit norming rating');
  },

  async getNormingResults(experimentId: string): Promise<NormingResult[]> {
    const res = await fetchWithTimeout(`${BASE_URL}/norming/${experimentId}/results`);
    if (!res.ok) throw new Error('Failed to fetch norming results');
    return res.json();
  }
};
