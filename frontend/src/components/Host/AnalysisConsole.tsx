import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Download, Code, FileText, CheckCircle,
  AlertCircle, Sliders, RefreshCw, BarChart2
} from 'lucide-react';
import { Experiment, AnalysisResponse } from '../../types';
import { api } from '../../api/client';

interface AnalysisConsoleProps {
  experiment: Experiment;
}

export const AnalysisConsole: React.FC<AnalysisConsoleProps> = ({ experiment }) => {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<'residual' | 'raw'>('residual');

  // Sliders for Gibson & Warren (2004) exclusion rules
  const [fillerCutoff, setFillerCutoff] = useState<number>(0.75); // 75%
  const [rtMin, setRtMin] = useState<number>(100);
  const [rtMax, setRtMax] = useState<number>(3000);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalysis(experiment.id, fillerCutoff, rtMin, rtMax);
      setData(res);
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
    'correlative_nested': '#6366f1',
    'correlative_canonical': '#10b981',
    'extraposed_nested': '#f43f5e',
    'extraposed_canonical': '#f59e0b'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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

      {/* Main Analysis Chart & ANOVA */}
      {data && (
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
              <svg viewBox="0 0 800 320" style={{ width: '100%', height: 320, overflow: 'visible' }}>
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
                {data.conditions.map((cond) => {
                  const color = conditionColors[cond] || '#cbd5e1';
                  const points = data.figure_data.map((r, rIdx) => {
                    const stats = r.conditions[cond] || { mean_residual_rt: 0, mean_raw_rt: 350, sem_residual_rt: 0 };
                    const val = metricMode === 'residual' ? stats.mean_residual_rt : stats.mean_raw_rt;
                    const x = 110 + rIdx * 90;
                    // Map val to y coordinates
                    const y = metricMode === 'residual'
                      ? 160 - (val / 150) * 110
                      : 250 - ((val - 200) / 400) * 220;
                    const sem = stats.sem_residual_rt;
                    const semHeight = (sem / 150) * 110;
                    return { x, y, val, sem, semHeight, region: r.region_index };
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
                          {metricMode === 'residual' && p.semHeight > 0 && (
                            <line
                              x1={p.x}
                              y1={p.y - p.semHeight}
                              x2={p.x}
                              y2={p.y + p.semHeight}
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
                {data.conditions.map((cond) => {
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

          {/* Participant Retention & Attention Checks Table */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
              Participant Retention & Attention Filtering ({data.participants_summary.length} Total)
            </h4>

            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Subject ID</th>
                    <th style={{ padding: '6px 10px' }}>List</th>
                    <th style={{ padding: '6px 10px' }}>Filler Accuracy</th>
                    <th style={{ padding: '6px 10px' }}>Overall Accuracy</th>
                    <th style={{ padding: '6px 10px' }}>Mean RT</th>
                    <th style={{ padding: '6px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.participants_summary.map((p) => (
                    <tr key={p.participant_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
