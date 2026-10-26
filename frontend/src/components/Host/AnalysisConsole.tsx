import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Download, Code, FileText, CheckCircle,
  AlertCircle, Sliders, RefreshCw, BarChart2, User, Search,
  ListOrdered, Clock, Flame, Trash2, Database, Upload
} from 'lucide-react';
import { Experiment, AnalysisResponse } from '../../types';
import { api } from '../../api/client';
import { ParticipantDeepDrilldown } from './ParticipantDeepDrilldown';

interface AnalysisConsoleProps {
  experiment: Experiment;
}

export const AnalysisConsole: React.FC<AnalysisConsoleProps> = ({ experiment }) => {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<'residual' | 'raw'>('residual');
  const [analysisView, setAnalysisView] = useState<'group' | 'participant'>('group');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  const handleRestoreDb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm(`Are you sure you want to restore "${file.name}"?\n\nThis will replace the active SQLite database on the server with this backup file.`)) {
      e.target.value = '';
      return;
    }
    try {
      setLoading(true);
      await api.restoreDatabase(file);
      alert('Database restored successfully! Recomputing analysis...');
      await fetchAnalysis();
    } catch (err: any) {
      alert('Failed to restore database: ' + (err.message || err));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleDeleteParticipant = async (participantId: string, externalId: string) => {
    if (!window.confirm(`Are you sure you want to remove participant "${externalId || participantId}"?\n\nThis will delete their trial entries and reading times from the database. All experiment stimulus items remain intact.`)) {
      return;
    }
    try {
      await api.deleteParticipant(experiment.id, participantId);
      if (selectedParticipantId === participantId) {
        setSelectedParticipantId('');
      }
      await fetchAnalysis();
    } catch (err: any) {
      alert(`Failed to delete participant: ${err?.message || err}`);
    }
  };

  const handleClearNonPilot = async () => {
    if (!window.confirm(`Clear all custom/test participant entries?\n\nThis removes test runs while keeping baseline benchmark pilots intact so you can run a fresh, clean analysis.`)) {
      return;
    }
    try {
      const res = await api.clearParticipants(experiment.id, 'non_pilots_only');
      alert(res.message);
      await fetchAnalysis();
    } catch (err: any) {
      alert(`Failed to clear test participants: ${err?.message || err}`);
    }
  };

  const handleSeedPilot = async () => {
    try {
      setLoading(true);
      await api.seedPilotData(experiment.id);
      await fetchAnalysis();
    } catch (err: any) {
      alert(`Failed to seed benchmark pilot dataset: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Sliders for Gibson & Warren (2004) exclusion rules
  const [fillerCutoff, setFillerCutoff] = useState<number>(0.75); // 75%
  const [rtMin, setRtMin] = useState<number>(100);
  const [rtMax, setRtMax] = useState<number>(3000);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalysis(experiment.id, fillerCutoff, rtMin, rtMax);
      setData(res);
      if (res?.participants_summary?.length) {
        setSelectedParticipantId((prev) => {
          const exists = res.participants_summary.some((p) => p.participant_id === prev);
          return exists ? prev : res.participants_summary[0].participant_id;
        });
      } else {
        setSelectedParticipantId('');
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [experiment.id]);

  const conditionColors: Record<string, string> = {
    '+extract_VP': '#6366f1', // Indigo
    '+extract_NP': '#f43f5e', // Rose
    '-extract_VP': '#10b981', // Emerald
    '-extract_NP': '#f59e0b', // Amber
    'ext_clause': '#6366f1',  // Indigo (+extract, VP)
    'ext_NP': '#f43f5e',      // Rose (+extract, NP)
    'non_clause': '#10b981',  // Emerald (-extract, VP)
    'non_NP': '#f59e0b',      // Amber (-extract, NP)
    'correlative_nested': '#6366f1',
    'correlative_canonical': '#10b981',
    'extraposed_nested': '#f43f5e',
    'extraposed_canonical': '#f59e0b'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* View Switcher: Group vs Participant Deep Drilldown */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface-elevated)',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setAnalysisView('group')}
            className="btn btn-sm"
            style={{
              background: analysisView === 'group' ? 'var(--accent-indigo)' : 'transparent',
              color: analysisView === 'group' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600
            }}
          >
            <TrendingUp size={15} /> Group Experiment Analysis (Figure 1 & ANOVA)
          </button>

          <button
            onClick={() => {
              if (!selectedParticipantId && data?.participants_summary?.length) {
                setSelectedParticipantId(data.participants_summary[0].participant_id);
              }
              setAnalysisView('participant');
            }}
            className="btn btn-sm"
            style={{
              background: analysisView === 'participant' ? 'var(--accent-indigo)' : 'transparent',
              color: analysisView === 'participant' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600
            }}
          >
            <User size={15} /> Participant Deep Analysis & Word Heatmap
          </button>
        </div>

        {analysisView === 'participant' && (
          <span className="badge badge-indigo">
            Per-sentence & per-word cognitive slowdown peaks
          </span>
        )}
      </div>

      {analysisView === 'participant' ? (
        <ParticipantDeepDrilldown
          experimentId={experiment.id}
          initialParticipantId={selectedParticipantId || undefined}
          onSelectParticipant={(id) => setSelectedParticipantId(id)}
          onBackToGroup={() => setAnalysisView('group')}
          participantsList={data?.participants_summary}
        />
      ) : (
        <>
          {/* Top Banner & Export Actions */}
          <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <TrendingUp size={22} color="var(--accent-indigo)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Psycholinguistic Analysis & Figure 1 Reproduction
              </h3>
              <span className="badge badge-indigo">Gibson & Warren (2004) Pipeline</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 750 }}>
              Computes participant-level linear regressions of reading time on word length (graphemes),
              derives residual reading times, evaluates the Critical Region interaction (Region 5),
              and generates replication code.
            </p>
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={api.getExportCsvUrl(experiment.id)}
              className="btn btn-secondary btn-sm"
              download
            >
              <Download size={14} /> Tidy CSV (Long Format)
            </a>

            <a
              href={api.getExportRScriptUrl(experiment.id)}
              className="btn btn-secondary btn-sm"
              download
            >
              <Code size={14} /> R Script (lme4)
            </a>

            <a
              href={api.getExportPythonScriptUrl(experiment.id)}
              className="btn btn-secondary btn-sm"
              download
            >
              <FileText size={14} /> Python Script (statsmodels)
            </a>

            <a
              href={api.getExportDbUrl()}
              className="btn btn-secondary btn-sm"
              download="vanispr_complete_backup.db"
              title="Download entire SQLite database (.db) file to keep participant data backed up locally"
            >
              <Database size={14} /> Full SQLite DB (.db)
            </a>

            <label
              className="btn btn-secondary btn-sm"
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Restore / Upload a downloaded SQLite database backup file"
            >
              <Upload size={14} /> Restore DB (.db)
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3"
                style={{ display: 'none' }}
                onChange={handleRestoreDb}
              />
            </label>
          </div>
        </div>

        {/* Exclusion Parameters Filter Bar */}
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Pre-Set Exclusions:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Filler Accuracy Cutoff:
            </label>
            <select
              className="select"
              style={{ width: 110, padding: '4px 8px', fontSize: '0.8rem' }}
              value={fillerCutoff}
              onChange={(e) => setFillerCutoff(parseFloat(e.target.value))}
            >
              <option value="0.70">≥ 70%</option>
              <option value="0.75">≥ 75% (Paper)</option>
              <option value="0.80">≥ 80%</option>
              <option value="0.0">No filter</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              RT Range:
            </label>
            <input
              type="number"
              className="input mono"
              style={{ width: 80, padding: '4px 8px', fontSize: '0.8rem' }}
              value={rtMin}
              onChange={(e) => setRtMin(parseInt(e.target.value) || 0)}
            />
            <span style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="number"
              className="input mono"
              style={{ width: 90, padding: '4px 8px', fontSize: '0.8rem' }}
              value={rtMax}
              onChange={(e) => setRtMax(parseInt(e.target.value) || 3000)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ms</span>
          </div>

          <button onClick={fetchAnalysis} className="btn btn-primary btn-sm" style={{ padding: '4px 10px' }}>
            <RefreshCw size={13} className={loading ? 'pulse' : ''} /> Recompute
          </button>
        </div>
      </div>

      {/* Empty State when no participant trials exist */}
      {data && data.participants_summary.length === 0 && (
        <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
          <TrendingUp size={40} color="var(--accent-indigo)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
            No Participant Trial Data Yet
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
            No reaction times or word events are currently recorded for this study. You can launch participant sessions to collect fresh data, or load the balanced 12-participant psycholinguistic benchmark dataset.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleSeedPilot}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCw size={15} /> Seed 12 Pilot Benchmark Participants
            </button>
          </div>
        </div>
      )}

      {/* Main Analysis Chart & ANOVA */}
      {data && data.participants_summary.length > 0 && (
        <>
          {/* Interactive Chart Container */}
          <div className="glass-panel" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {metricMode === 'residual' ? 'Residual Reading Time by Region' : 'Raw Reading Time by Region'}
                  </h4>
                  <span className="badge badge-emerald">
                    {data.summary.participants_retained} Subjects Retained
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Replicating Gibson & Warren (2004) Figure 1. Error bars indicate ±1 Standard Error of the Mean (SEM).
                </p>
              </div>

              {/* Metric Toggle */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-surface-elevated)',
                padding: 3,
                borderRadius: 'var(--radius-sm)'
              }}>
                <button
                  onClick={() => setMetricMode('residual')}
                  className="btn btn-sm"
                  style={{
                    background: metricMode === 'residual' ? 'var(--accent-indigo)' : 'transparent',
                    color: metricMode === 'residual' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    padding: '4px 10px'
                  }}
                >
                  Residual RTs (ms)
                </button>
                <button
                  onClick={() => setMetricMode('raw')}
                  className="btn btn-sm"
                  style={{
                    background: metricMode === 'raw' ? 'var(--accent-indigo)' : 'transparent',
                    color: metricMode === 'raw' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    padding: '4px 10px'
                  }}
                >
                  Raw RTs (ms)
                </button>
              </div>
            </div>

            {/* SVG Visual Plot */}
            <div style={{
              background: 'var(--chart-bg)',
              borderRadius: 'var(--radius-md)',
              padding: '24px 20px',
              border: '1px solid var(--chart-border)',
              position: 'relative'
            }}>
              {/* Region 5 Critical Zone Callout */}
              <div style={{
                position: 'absolute',
                top: 24,
                left: '60%',
                transform: 'translateX(-50%)',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: '0.72rem',
                color: 'var(--accent-indigo)',
                fontWeight: 600,
                pointerEvents: 'none'
              }}>
                Region 5: Critical Verb Region
              </div>

              {/* Chart SVG */}
              <svg viewBox="0 0 800 320" style={{ width: '100%', height: 320, overflow: 'hidden' }}>
                {/* Horizontal reference zero line for residuals */}
                {metricMode === 'residual' && (
                  <line x1="60" y1="160" x2="760" y2="160" stroke="var(--chart-zero-line)" strokeDasharray="4,4" />
                )}

                {/* Critical Region (Region 5) Highlight Box */}
                <rect x="470" y="20" width="80" height="250" fill="rgba(99, 102, 241, 0.08)" rx="6" />

                {/* Y Axis Guide Lines */}
                {[0, 1, 2, 3, 4].map((step) => {
                  const y = 30 + step * 55;
                  const val = metricMode === 'residual' ? (150 - step * 75) : (600 - step * 100);
                  return (
                    <g key={step}>
                      <line x1="60" y1={y} x2="760" y2={y} stroke="var(--chart-grid)" />
                      <text x="50" y={y + 4} fill="var(--chart-sub-text)" fontSize="11" textAnchor="end" fontFamily="var(--font-mono)">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Region Labels */}
                {data.figure_data.map((r, rIdx) => {
                  const x = 110 + rIdx * 90;
                  return (
                    <g key={r.region_index}>
                      <line x1={x} y1="20" x2={x} y2="250" stroke="var(--chart-grid)" />
                      <text x={x} y="275" fill="var(--chart-axis-text)" fontSize="12" textAnchor="middle" fontWeight={r.region_index === 5 ? 700 : 500}>
                        R{r.region_index}
                      </text>
                      <text x={x} y="295" fill="var(--chart-sub-text)" fontSize="10" textAnchor="middle">
                        {r.region_index === 1 ? 'Subj' : r.region_index === 5 ? 'Verb*' : r.region_index === 6 ? 'Spillover' : `Reg ${r.region_index}`}
                      </text>
                    </g>
                  );
                })}

                {/* Render Condition Paths and Data Points */}
                {(data.conditions || []).map((cond) => {
                  const color = conditionColors[cond] || '#cbd5e1';
                  const points = data.figure_data.map((r, rIdx) => {
                    const stats = r.conditions[cond] || { mean_residual_rt: 0, mean_raw_rt: 350, sem_residual_rt: 0 };
                    const rawVal = metricMode === 'residual' ? stats.mean_residual_rt : stats.mean_raw_rt;
                    // Clamp visual value to ±200ms for residual so individual large pause values don't explode chart
                    const clampedVal = metricMode === 'residual'
                      ? Math.max(-190, Math.min(190, Number(rawVal) || 0))
                      : Math.max(150, Math.min(650, Number(rawVal) || 350));

                    const x = 110 + rIdx * 90;
                    // Map val to y coordinates safely clamped within chart view area [30, 260]
                    const calculatedY = metricMode === 'residual'
                      ? 160 - (clampedVal / 150) * 110
                      : 250 - ((clampedVal - 200) / 400) * 220;
                    const y = Math.max(30, Math.min(260, calculatedY));

                    // Safe SEM calculation (clamped to max 50px height, 0 if only 1 subject or NaN)
                    const rawSem = Number(stats.sem_residual_rt) || 0;
                    const sem = (!isNaN(rawSem) && isFinite(rawSem)) ? Math.max(0, rawSem) : 0;
                    const semHeight = Math.min(50, Math.max(0, (sem / 150) * 110));

                    return { x, y, val: rawVal, sem, semHeight, region: r.region_index };
                  });

                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <g key={cond}>
                      {/* Connecting Line */}
                      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Error bars & Points */}
                      {points.map((p, pIdx) => (
                        <g key={pIdx}>
                          {/* Error bar */}
                          {metricMode === 'residual' && p.semHeight > 2 && (
                            <line
                              x1={p.x}
                              y1={Math.max(25, p.y - p.semHeight)}
                              x2={p.x}
                              y2={Math.min(265, p.y + p.semHeight)}
                              stroke={color}
                              strokeWidth="1.5"
                              opacity="0.75"
                            />
                          )}
                          {/* Point circle */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={p.region === 5 ? 5 : 4}
                            fill={color}
                            stroke="var(--chart-point-stroke)"
                            strokeWidth="2"
                          />
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 20,
                marginTop: 14,
                flexWrap: 'wrap'
              }}>
                {(data.conditions || []).map((cond) => {
                  const color = conditionColors[cond] || '#cbd5e1';
                  return (
                    <div key={cond} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{cond}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2x2 Factorial Repeated Measures ANOVA Interaction Table */}
          {data.anova && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                    2×2 Repeated-Measures ANOVA at Critical Region {data.anova.critical_region}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Testing intermediate syntactic structure interaction: {data.anova.factor_a_name} × {data.anova.factor_b_name}
                  </p>
                </div>

                <span className={`badge ${data.anova.f1_significant ? 'badge-emerald' : 'badge-amber'}`}>
                  {data.anova.f1_significant ? 'Statistically Significant (p < .05)' : 'Non-Significant'}
                </span>
              </div>

              {/* ANOVA Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: 16 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Analysis Type</th>
                    <th style={{ padding: '8px 12px' }}>F-Statistic</th>
                    <th style={{ padding: '8px 12px' }}>Degrees of Freedom</th>
                    <th style={{ padding: '8px 12px' }}>p-Value</th>
                    <th style={{ padding: '8px 12px' }}>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>By Participants (F1)</td>
                    <td style={{ padding: '10px 12px' }} className="mono">{data.anova.f1_statistic}</td>
                    <td style={{ padding: '10px 12px' }} className="mono">{data.anova.f1_df}</td>
                    <td style={{ padding: '10px 12px' }} className="mono">
                      {data.anova.f1_p_value < 0.001 ? '< .001' : data.anova.f1_p_value}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${data.anova.f1_significant ? 'badge-emerald' : 'badge-amber'}`}>
                        {data.anova.f1_significant ? 'Significant' : 'n.s.'}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>By Items (F2)</td>
                    <td style={{ padding: '10px 12px' }} className="mono">{data.anova.f2_statistic}</td>
                    <td style={{ padding: '10px 12px' }} className="mono">{data.anova.f2_df}</td>
                    <td style={{ padding: '10px 12px' }} className="mono">
                      {data.anova.f2_p_value < 0.001 ? '< .001' : data.anova.f2_p_value}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${data.anova.f2_significant ? 'badge-emerald' : 'badge-amber'}`}>
                        {data.anova.f2_significant ? 'Significant' : 'Marginal / n.s.'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Interpretation Callout */}
              <div style={{
                background: data.anova.f1_significant ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                border: `1px solid ${data.anova.f1_significant ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <CheckCircle size={18} color="var(--accent-emerald)" />
                <span>{data.anova.interpretation}</span>
              </div>
            </div>
          )}

          {/* Table 2 Replication: Percentages of Correctly Answered Comprehension Questions */}
          {data.condition_accuracy && Object.keys(data.condition_accuracy).length > 0 && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                    Table 2 Replication · Comprehension Question Response Accuracy (%)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Accuracy computed exclusively on retained participants for experimental conditions (Standard Error in parentheses)
                  </p>
                </div>
                <span className="badge badge-indigo">Gibson & Warren (2004) Benchmark</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {(data.conditions || []).map((c) => {
                  const stats = data.condition_accuracy?.[c];
                  const color = conditionColors[c] || 'var(--accent-indigo)';
                  return (
                    <div
                      key={c}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {stats ? `${stats.mean_accuracy}%` : 'N/A'}
                        </span>
                        {stats && stats.sem_accuracy > 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            (SE: ±{stats.sem_accuracy}%)
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {stats ? `${stats.trial_count} valid trials` : 'No data'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overall Condition Processing Time & Difficulty Ranking (All Retained Participants) */}
          {data.condition_ranking && data.condition_ranking.length > 0 && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ListOrdered size={20} color="var(--accent-indigo)" />
                    <h4 style={{ fontSize: '1.08rem', fontWeight: 600 }}>
                      Overall Condition Processing Time & Difficulty Ranking (All Participants)
                    </h4>
                    <span className="badge badge-indigo">4-Condition Benchmark</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Which conditions take more time to read in general? Ranked from #1 Slowest (Highest Integration Cost) to #4 Fastest (Lowest Integration Cost).
                  </p>
                </div>
              </div>

              {/* Ranking Grid / Table */}
              <div style={{ overflowX: 'auto', marginBottom: 18 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', width: 60 }}>Rank</th>
                      <th style={{ padding: '8px 12px' }}>Condition</th>
                      <th style={{ padding: '8px 12px' }}>Critical Verb Residual (R5)</th>
                      <th style={{ padding: '8px 12px' }}>Critical Verb Raw RT</th>
                      <th style={{ padding: '8px 12px' }}>Sentence Mean RT</th>
                      <th style={{ padding: '8px 12px' }}>Comprehension Accuracy</th>
                      <th style={{ padding: '8px 12px' }}>Cognitive Impact & Syntactic Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.condition_ranking.map((cr) => {
                      const color = conditionColors[cr.condition_label] || 'var(--accent-indigo)';
                      const isSlowest = cr.rank === 1;
                      return (
                        <tr
                          key={cr.condition_label}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isSlowest ? 'rgba(244, 63, 94, 0.04)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: 700 }} className="mono">
                            <span style={{
                              display: 'inline-block',
                              width: 24,
                              height: 24,
                              lineHeight: '24px',
                              textAlign: 'center',
                              borderRadius: '50%',
                              background: isSlowest ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                              color: isSlowest ? 'var(--accent-rose)' : 'var(--text-primary)'
                            }}>
                              #{cr.rank}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                              <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                {cr.condition_label}
                              </span>
                              {isSlowest && (
                                <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>
                                  Slowest Overall
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }} className="mono">
                            <span style={{
                              color: cr.critical_residual_rt > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                              fontSize: '0.95rem'
                            }}>
                              {cr.critical_residual_rt > 0 ? `+${cr.critical_residual_rt}` : cr.critical_residual_rt} ms
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }} className="mono">
                            {cr.critical_raw_rt} ms
                          </td>
                          <td style={{ padding: '10px 12px' }} className="mono">
                            {cr.sentence_raw_rt} ms
                          </td>
                          <td style={{ padding: '10px 12px' }} className="mono">
                            {cr.accuracy !== undefined ? `${cr.accuracy}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              {cr.cognitive_impact}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {cr.role_desc}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Gibson & Warren (2004) Theoretical Explanation Box */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 18px',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={15} /> Why Does One Condition Take More Time in General? (Gibson & Warren 2004 Synthesis)
                </div>
                <div>
                  <strong>Extraction across NP (<code className="mono">ext_NP</code>) takes the most time overall</strong> because the filler-gap dependency must be maintained across an intervening lexical noun phrase boundary with <em>no intermediate trace</em> to refresh it in working memory. When the reader arrives at the critical integration verb (Region 5), retrieving the distant subject incurs the heaviest cognitive integration cost (slowdown peak). In contrast, <strong>extraction across a clause (<code className="mono">ext_clause</code>) is significantly faster</strong> because an intermediate trace inside the embedded clause reactivates the representation in working memory prior to verb integration.
                </div>
              </div>
            </div>
          )}

          {/* Participant Retention & Attention Checks Table */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  Participant Retention & Attention Filtering ({data.participants_summary.length} Total)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Click any participant to inspect their sentence heatmaps or remove test entries to re-run fresh analysis.
                </p>
              </div>

              <button
                onClick={handleClearNonPilot}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--accent-rose)'
                }}
                title="Clear test/ad-hoc participant runs while preserving benchmark pilot data"
              >
                <Trash2 size={13} /> Clean Test Runs
              </button>
            </div>

            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Subject ID</th>
                    <th style={{ padding: '6px 10px' }}>List</th>
                    <th style={{ padding: '6px 10px' }}>Filler Accuracy</th>
                    <th style={{ padding: '6px 10px' }}>Overall Accuracy</th>
                    <th style={{ padding: '6px 10px' }}>Mean RT</th>
                    <th style={{ padding: '6px 10px' }}>Status</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.participants_summary.map((p) => (
                    <tr
                      key={p.participant_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer'
                      }}
                      className="hover-row"
                      onClick={() => {
                        setSelectedParticipantId(p.participant_id);
                        setAnalysisView('participant');
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600 }} className="mono">
                        {p.external_id}
                      </td>
                      <td style={{ padding: '8px 10px' }} className="mono">List {p.list_number}</td>
                      <td style={{ padding: '8px 10px' }} className="mono">
                        <span style={{ color: p.filler_accuracy >= 75 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                          {p.filler_accuracy}%
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }} className="mono">{p.overall_accuracy}%</td>
                      <td style={{ padding: '8px 10px' }} className="mono">{p.mean_rt_ms} ms</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span className={`badge ${p.retained ? 'badge-emerald' : 'badge-rose'}`}>
                          {p.retained ? 'Retained' : 'Excluded (<75%)'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParticipantId(p.participant_id);
                              setAnalysisView('participant');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Search size={12} /> Inspect
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteParticipant(p.participant_id, p.external_id);
                            }}
                            className="btn btn-sm"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.74rem',
                              background: 'rgba(244, 63, 94, 0.1)',
                              color: 'var(--accent-rose)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title={`Remove ${p.external_id} from study`}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )}
</div>
);
};
