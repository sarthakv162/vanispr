import React, { useState, useEffect, useRef } from 'react';
import {
  User, Activity, Brain, CheckCircle2, XCircle,
  Search, Sliders, ArrowLeft, RefreshCw,
  Flame, Info, HelpCircle, ListOrdered, Award, Clock, Trash2
} from 'lucide-react';
import { ParticipantDeepAnalysis, SentenceTrialDetail, WordDetail } from '../../types';
import { api } from '../../api/client';

interface ParticipantDeepDrilldownProps {
  experimentId: string;
  initialParticipantId?: string;
  onSelectParticipant?: (participantId: string) => void;
  onBackToGroup?: () => void;
  participantsList?: Array<{
    participant_id: string;
    external_id: string;
    list_number: number;
    filler_accuracy: number;
    retained: boolean;
  }>;
}

export const ParticipantDeepDrilldown: React.FC<ParticipantDeepDrilldownProps> = ({
  experimentId,
  initialParticipantId,
  onSelectParticipant,
  onBackToGroup,
  participantsList = []
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialParticipantId || participantsList[0]?.participant_id || ''
  );
  const [analysis, setAnalysis] = useState<ParticipantDeepAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track initialParticipantId prop to prevent resetting local selection when user changes dropdown
  const prevInitialPropRef = useRef(initialParticipantId);

  useEffect(() => {
    if (initialParticipantId && initialParticipantId !== prevInitialPropRef.current) {
      prevInitialPropRef.current = initialParticipantId;
      setSelectedId(initialParticipantId);
    }
  }, [initialParticipantId]);

  // If initial load had no selectedId and participantsList arrives later
  useEffect(() => {
    if (!selectedId && participantsList && participantsList.length > 0) {
      const defaultId = initialParticipantId || participantsList[0].participant_id;
      setSelectedId(defaultId);
      prevInitialPropRef.current = defaultId;
    }
  }, [participantsList, selectedId, initialParticipantId]);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'target' | 'filler' | 'hard' | 'incorrect'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<{
    word: WordDetail;
    trialId: string;
  } | null>(null);

  // Fetch participant analysis with race condition avoidance
  const loadParticipantData = async (participantId: string) => {
    if (!participantId) {
      setLoading(false);
      setAnalysis(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getParticipantAnalysis(experimentId, participantId);
      setAnalysis(data);
    } catch (err: any) {
      console.error('Failed to load participant deep analysis:', err);
      setError(err?.message || 'Failed to fetch participant analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!analysis) return;
    const pName = analysis.participant.external_id || analysis.participant.participant_id;
    if (!window.confirm(`Are you sure you want to remove participant "${pName}"?\n\nThis will permanently delete all their trial entries and measured reading times from the experiment database. Stimulus items remain intact.`)) {
      return;
    }
    try {
      await api.deleteParticipant(experimentId, analysis.participant.participant_id);
      if (onBackToGroup) {
        onBackToGroup();
      } else {
        const remaining = (participantsList || []).filter(p => p.participant_id !== analysis.participant.participant_id);
        if (remaining.length > 0) {
          const nextId = remaining[0].participant_id;
          prevInitialPropRef.current = nextId;
          setSelectedId(nextId);
          onSelectParticipant?.(nextId);
        } else {
          setSelectedId('');
          setAnalysis(null);
        }
      }
    } catch (err: any) {
      alert(`Failed to delete participant: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    if (selectedId) {
      setLoading(true);
      setError(null);
      api.getParticipantAnalysis(experimentId, selectedId)
        .then((data) => {
          if (isCurrent) {
            setAnalysis(data);
            setLoading(false);
          }
        })
        .catch((err: any) => {
          if (isCurrent) {
            console.error('Failed to load participant deep analysis:', err);
            setError(err?.message || 'Failed to fetch participant analysis');
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
      setAnalysis(null);
    }
    return () => {
      isCurrent = false;
    };
  }, [selectedId, experimentId]);

  // Difficulty badge styling
  const getDifficultyColor = (level: WordDetail['difficulty_level']) => {
    switch (level) {
      case 'hard':
        return {
          bg: 'rgba(244, 63, 94, 0.16)',
          border: 'rgba(244, 63, 94, 0.5)',
          text: 'var(--accent-rose)',
          label: 'Hard (Peak Slowdown)'
        };
      case 'elevated':
        return {
          bg: 'rgba(245, 158, 11, 0.16)',
          border: 'rgba(245, 158, 11, 0.5)',
          text: 'var(--accent-amber)',
          label: 'Elevated Load'
        };
      case 'fast':
        return {
          bg: 'rgba(16, 185, 129, 0.14)',
          border: 'rgba(16, 185, 129, 0.45)',
          text: 'var(--accent-emerald)',
          label: 'Fast / Fluent'
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.04)',
          border: 'var(--border-subtle)',
          text: 'var(--text-primary)',
          label: 'Normal Pace'
        };
    }
  };

  // Filter trials
  const filteredTrials = analysis?.trials.filter((t) => {
    // Type filter
    if (filterType === 'target' && t.type !== 'experimental') return false;
    if (filterType === 'filler' && t.type !== 'filler') return false;
    if (filterType === 'incorrect' && t.question_correct) return false;
    if (filterType === 'hard') {
      const hasHardWord = t.words.some((w) => w.difficulty_level === 'hard');
      if (!hasHardWord) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSentence = t.sentence_text.toLowerCase().includes(q);
      const matchCond = t.condition_label.toLowerCase().includes(q);
      const matchItem = String(t.item_number).includes(q);
      if (!matchSentence && !matchCond && !matchItem) return false;
    }

    return true;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Bar */}
      <div className="glass-panel" style={{ padding: '20px 28px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {onBackToGroup && (
              <button
                onClick={onBackToGroup}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Back to Group Analysis"
              >
                <ArrowLeft size={14} /> Back to Group
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={22} color="var(--accent-indigo)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Participant-Wise Cognitive Drilldown & Word Heatmap
                </h3>
                <span className="badge badge-indigo">Single-Subject Deep Dive</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Inspect sentence-by-sentence reading times, residual RTs, and word-by-word cognitive load peaks (identifying difficult reading regions).
              </p>
            </div>
          </div>

          {/* Participant Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Select Participant:</span>
            <select
              className="select"
              style={{ minWidth: 220, padding: '6px 12px', fontSize: '0.85rem' }}
              value={selectedId}
              onChange={(e) => {
                const newId = e.target.value;
                prevInitialPropRef.current = newId;
                setSelectedId(newId);
                onSelectParticipant?.(newId);
              }}
            >
              {participantsList.length > 0 ? (
                participantsList.map((p) => (
                  <option key={p.participant_id} value={p.participant_id}>
                    {p.external_id} (List {p.list_number} · {p.filler_accuracy}% filler acc)
                  </option>
                ))
              ) : (
                analysis && (
                  <option value={analysis.participant.participant_id}>
                    {analysis.participant.external_id}
                  </option>
                )
              )}
            </select>

            <button
              onClick={() => selectedId && loadParticipantData(selectedId)}
              className="btn btn-secondary btn-sm"
              title="Refresh Participant Data"
            >
              <RefreshCw size={14} className={loading ? 'pulse' : ''} />
            </button>

            <button
              onClick={handleDeleteCurrent}
              className="btn btn-sm"
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                color: 'var(--accent-rose)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.8rem'
              }}
              title="Remove this participant's data from experiment"
            >
              <Trash2 size={13} /> Remove Entry
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
          <div className="pulse" style={{ color: 'var(--accent-indigo)', fontSize: '1rem', fontWeight: 600 }}>
            Analyzing participant word-by-word reading times & computing residual RTs...
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="glass-panel" style={{ padding: 32, textAlign: 'center', borderColor: 'var(--accent-rose)' }}>
          <p style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{error}</p>
          <button
            onClick={() => selectedId && loadParticipantData(selectedId)}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 12 }}
          >
            Retry Loading
          </button>
        </div>
      )}

      {(!participantsList || participantsList.length === 0) && !loading && !analysis && (
        <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
          <User size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
            No Participant Records Found
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 480, margin: '0 auto 20px' }}>
            There are currently no recorded participant runs in this study. Run test trials or re-seed pilot benchmark participants to inspect word-by-word reading times.
          </p>
          {onBackToGroup && (
            <button onClick={onBackToGroup} className="btn btn-primary btn-sm">
              <ArrowLeft size={14} /> Back to Group Analysis
            </button>
          )}
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Understanding Residual RT Metrics (+ and - Explained) */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="var(--accent-indigo)" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Metric Interpretation: What do (+) and (−) Mean in Psycholinguistics?
                </span>
              </div>
              <span className="badge badge-indigo">Gibson & Warren (2004) Standard</span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Longer words take more milliseconds to read. To remove word length effects, a baseline regression calculates:
              <strong style={{ marginLeft: 6, color: 'var(--text-primary)' }} className="mono">
                Residual RT = Measured RT − Predicted RT(word length)
              </strong>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div style={{
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-rose)', fontWeight: 700 }}>
                  <span>➕ PLUS (+) Residual RT (e.g. +164 ms)</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Cognitive Slowdown / High Integration Cost:</strong> The participant took <em>longer than expected</em> to read this word/sentence. It indicates difficulty, reanalysis, or memory bottleneck (e.g., resolving a distant relative-clause filler-gap dependency at Region 5 verb).
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)', fontWeight: 700 }}>
                  <span>➖ MINUS (−) Residual RT (e.g. −62 ms)</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Faster / Fluent Reading:</strong> The participant read this word <em>faster than expected</em>. It indicates high grammatical predictability, lower cognitive load, and fluent comprehension.
                </div>
              </div>
            </div>
          </div>

          {/* Key Subject Profile Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* Subject Overview */}
            <div className="glass-panel" style={{ padding: 18 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Subject Metadata
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                  {analysis.participant.external_id}
                </span>
                <span className="badge badge-indigo">List {analysis.participant.list_number}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                Total: <strong>{analysis.participant.total_trials}</strong> trials ({analysis.participant.target_trials_count} targets + {analysis.participant.filler_trials_count} fillers)
              </div>
            </div>

            {/* Gibson & Warren Word-Length Regression */}
            <div className="glass-panel" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Word Length Regression
                </span>
                <span className="badge badge-emerald">R² = {analysis.regression.r_squared}</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 6 }} className="mono">
                {analysis.regression.slope} ms/char
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Base intercept: <span className="mono">{analysis.regression.intercept} ms</span> (Length adjustment profile)
              </div>
            </div>

            {/* Comprehension Accuracy */}
            <div className="glass-panel" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Comprehension Accuracy
                </span>
                <span className={`badge ${analysis.participant.filler_accuracy >= 75 ? 'badge-emerald' : 'badge-rose'}`}>
                  {analysis.participant.filler_accuracy >= 75 ? 'Pass (≥75%)' : 'Excluded'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                  {analysis.participant.overall_accuracy}%
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  (Filler: <strong>{analysis.participant.filler_accuracy}%</strong>)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Mean Word RT: <span className="mono">{analysis.participant.mean_rt_ms} ms</span>
              </div>
            </div>

            {/* Critical Region 5 verb Integration Summary */}
            <div className="glass-panel" style={{ padding: 18 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Region 5 Verb Residual RT
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {Object.entries(analysis.critical_region_summary || {}).slice(0, 3).map(([cond, resRt]) => (
                  <div key={cond} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>{cond}:</span>
                    <span className="mono" style={{
                      fontWeight: 600,
                      color: resRt > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                    }}>
                      {resRt > 0 ? `+${resRt}` : resRt} ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Condition Slowdown Comparison at Critical Region 5 (Paper Replication) */}
          {analysis.critical_region_summary && Object.keys(analysis.critical_region_summary).length > 0 && (
            <div className="glass-panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Flame size={16} color="var(--accent-rose)" />
                    Critical Region 5 (Verb) Integration Slowdown Profile (Gibson & Warren 2004)
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Positive residual RT indicates cognitive slowdown / integration cost during verb resolution.
                  </p>
                </div>
                <span className="badge badge-indigo">Subject R5 Residuals</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {Object.entries(analysis.critical_region_summary).map(([cond, resRt]) => {
                  const isSlowdown = resRt > 0;
                  return (
                    <div
                      key={cond}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSlowdown ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}
                    >
                      <span className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {cond}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                        <span className="mono" style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: isSlowdown ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                        }}>
                          {resRt > 0 ? `+${resRt}` : resRt} ms
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {isSlowdown ? 'Cognitive Slowdown Peak' : 'Faster than predicted'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Condition Difficulty Ranking for this Participant */}
          {analysis.condition_ranking && analysis.condition_ranking.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ListOrdered size={16} color="var(--accent-indigo)" />
                    Condition Difficulty Ranking for {analysis.participant.external_id}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Ranked from Slowest (#1 Most Difficult) to Fastest (#4 Easiest) based on Critical Region 5 verb slowdown.
                  </p>
                </div>
                <span className="badge badge-indigo">Subject Condition Ranking</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {analysis.condition_ranking.map((cr) => {
                  const isHardest = cr.rank === 1;
                  return (
                    <div
                      key={cr.condition_label}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isHardest ? 'rgba(244, 63, 94, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                        border: isHardest ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          #{cr.rank} · {cr.condition_label}
                        </span>
                        <span className={`badge ${isHardest ? 'badge-rose' : 'badge-indigo'}`} style={{ fontSize: '0.7rem' }}>
                          {isHardest ? 'Slowest Condition' : `Rank ${cr.rank}`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>R5 Verb Res:</span>
                        <span className="mono" style={{
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: cr.critical_residual_rt > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                        }}>
                          {cr.critical_residual_rt > 0 ? `+${cr.critical_residual_rt}` : cr.critical_residual_rt} ms
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        Sentence Mean RT: <span className="mono">{cr.sentence_raw_rt} ms</span> ({cr.trials_count} trials)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Slowest / Hardest Words for this Participant */}
          {analysis.top_slowest_words && analysis.top_slowest_words.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="var(--accent-rose)" />
                    Top Words Taking the Most Time to Read (Participant Slowdown Peaks)
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Exact words that caused the highest processing bottlenecks / cognitive delays for {analysis.participant.external_id}.
                  </p>
                </div>
                <span className="badge badge-rose">Peak Slowdown Leaderboard</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', width: 50 }}>Rank</th>
                      <th style={{ padding: '6px 10px' }}>Word Text</th>
                      <th style={{ padding: '6px 10px' }}>Slowdown (+Residual)</th>
                      <th style={{ padding: '6px 10px' }}>Raw RT</th>
                      <th style={{ padding: '6px 10px' }}>Region & Condition</th>
                      <th style={{ padding: '6px 10px' }}>Trial / Item</th>
                      <th style={{ padding: '6px 10px' }}>Cognitive Context / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.top_slowest_words.map((w) => (
                      <tr key={`${w.trial_presentation_order}-${w.word_text}-${w.rank}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }} className="mono">
                          <span style={{
                            display: 'inline-block',
                            width: 22,
                            height: 22,
                            lineHeight: '22px',
                            textAlign: 'center',
                            borderRadius: '50%',
                            background: w.rank <= 3 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            color: w.rank <= 3 ? 'var(--accent-rose)' : 'var(--text-secondary)'
                          }}>
                            {w.rank}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          "{w.word_text}"
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }} className="mono">
                          <span style={{ color: 'var(--accent-rose)' }}>
                            +{w.residual_rt} ms
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }} className="mono">{w.rt_ms} ms</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span className={`badge ${w.is_critical_region ? 'badge-indigo' : 'badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                            Region {w.region_index} {w.is_critical_region ? '(Critical Verb)' : ''}
                          </span>
                          <span className="mono" style={{ marginLeft: 6, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {w.condition_label}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }} className="mono">
                          Trial #{w.trial_presentation_order} (Item {w.item_number})
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {w.slowdown_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sentence Heatmap Filter Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14
            }}>
              {/* Type Filter Buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterType('all')}
                  className="btn btn-sm"
                  style={{
                    background: filterType === 'all' ? 'var(--accent-indigo)' : 'var(--bg-surface-elevated)',
                    color: filterType === 'all' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem'
                  }}
                >
                  All Trials ({analysis.trials.length})
                </button>
                <button
                  onClick={() => setFilterType('target')}
                  className="btn btn-sm"
                  style={{
                    background: filterType === 'target' ? 'var(--accent-indigo)' : 'var(--bg-surface-elevated)',
                    color: filterType === 'target' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem'
                  }}
                >
                  Target Sentences ({analysis.participant.target_trials_count})
                </button>
                <button
                  onClick={() => setFilterType('filler')}
                  className="btn btn-sm"
                  style={{
                    background: filterType === 'filler' ? 'var(--accent-indigo)' : 'var(--bg-surface-elevated)',
                    color: filterType === 'filler' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem'
                  }}
                >
                  Fillers ({analysis.participant.filler_trials_count})
                </button>
                <button
                  onClick={() => setFilterType('hard')}
                  className="btn btn-sm"
                  style={{
                    background: filterType === 'hard' ? 'var(--accent-rose)' : 'var(--bg-surface-elevated)',
                    color: filterType === 'hard' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem'
                  }}
                >
                  Difficult Sentences (Peak Slowdown)
                </button>
                <button
                  onClick={() => setFilterType('incorrect')}
                  className="btn btn-sm"
                  style={{
                    background: filterType === 'incorrect' ? 'var(--accent-rose)' : 'var(--bg-surface-elevated)',
                    color: filterType === 'incorrect' ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem'
                  }}
                >
                  Incorrect Comprehension
                </button>
              </div>

              {/* Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search sentence or condition..."
                  className="input"
                  style={{ width: 220, padding: '4px 8px', fontSize: '0.8rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Heatmap Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontWeight: 600 }}>Reading Heatmap Legend:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(244, 63, 94, 0.4)', border: '1px solid rgba(244, 63, 94, 0.7)' }} />
                <span>Hard / Slowdown (Residual ≥ +80ms or RT ≥ 600ms)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245, 158, 11, 0.4)', border: '1px solid rgba(245, 158, 11, 0.7)' }} />
                <span>Elevated Load (Residual ≥ +30ms)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border-subtle)' }} />
                <span>Normal Pace (±30ms)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16, 185, 129, 0.3)', border: '1px solid rgba(16, 185, 129, 0.7)' }} />
                <span>Fast / Fluent (Residual ≤ -30ms)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <span style={{
                  padding: '1px 5px',
                  borderRadius: 3,
                  border: '1px solid var(--accent-indigo)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-indigo)',
                  fontWeight: 600
                }}>
                  R5
                </span>
                <span>Critical Region</span>
              </div>
            </div>
          </div>

          {/* Sentence-by-Sentence List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredTrials.length === 0 ? (
              <div className="glass-panel" style={{ padding: 36, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No trials match the selected filter.
              </div>
            ) : (
              filteredTrials.map((trial) => {
                const isTarget = trial.type === 'experimental';
                return (
                  <div
                    key={trial.trial_id}
                    className="glass-panel"
                    style={{
                      padding: '20px 24px',
                      borderLeft: isTarget ? '3px solid var(--accent-indigo)' : '3px solid var(--border-subtle)'
                    }}
                  >
                    {/* Trial Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      marginBottom: 14
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }} className="mono">
                          #{trial.presentation_order}
                        </span>
                        <span className={`badge ${isTarget ? 'badge-indigo' : 'badge-amber'}`}>
                          {isTarget ? 'Target Sentence' : 'Filler Distractor'}
                        </span>
                        <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {trial.condition_label}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Item {trial.item_number}
                        </span>
                      </div>

                      {/* Right-side sentence summary metrics */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Mean RT: </span>
                          <span className="mono" style={{ fontWeight: 600 }}>{trial.mean_rt_ms} ms</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Mean Res: </span>
                          <span className="mono" style={{
                            fontWeight: 600,
                            color: trial.mean_residual_rt > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                          }}>
                            {trial.mean_residual_rt > 0 ? `+${trial.mean_residual_rt}` : trial.mean_residual_rt} ms
                          </span>
                        </div>
                        {trial.critical_region_residual !== null && (
                          <div>
                            <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>R5 Verb: </span>
                            <span className="mono" style={{
                              fontWeight: 700,
                              color: trial.critical_region_residual > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                            }}>
                              {trial.critical_region_residual > 0 ? `+${trial.critical_region_residual}` : trial.critical_region_residual} ms
                            </span>
                          </div>
                        )}
                        <span className={`badge ${trial.question_correct ? 'badge-emerald' : 'badge-rose'}`}>
                          {trial.question_correct ? (
                            <><CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Correct</>
                          ) : (
                            <><XCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> Incorrect</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Word-by-Word Heatmap Chips */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'flex-start',
                      background: 'var(--spr-heatmap-tray-bg)',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {trial.words.map((word) => {
                        const styleConfig = getDifficultyColor(word.difficulty_level);
                        const isSelected = selectedWord?.trialId === trial.trial_id && selectedWord?.word.word_index === word.word_index;
                        const isCritical = word.is_critical_region;

                        return (
                          <div
                            key={word.word_index}
                            onClick={() => setSelectedWord({ word, trialId: trial.trial_id })}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: styleConfig.bg,
                              border: isSelected
                                ? '2px solid var(--accent-indigo)'
                                : isCritical
                                ? '2px solid var(--accent-indigo)'
                                : `1px solid ${styleConfig.border}`,
                              cursor: 'pointer',
                              transition: 'transform 0.1s, border-color 0.1s',
                              position: 'relative'
                            }}
                            title={`Word #${word.word_index + 1} (Region ${word.region_index})\nRaw RT: ${word.rt_ms}ms\nPredicted: ${word.predicted_rt}ms\nResidual: ${word.residual_rt > 0 ? '+' : ''}${word.residual_rt}ms\nLoad: ${styleConfig.label}`}
                          >
                            {/* Region marker badge if critical or spillover */}
                            {isCritical && (
                              <span style={{
                                position: 'absolute',
                                top: -8,
                                right: -4,
                                background: 'var(--accent-indigo)',
                                color: '#fff',
                                fontSize: '0.62rem',
                                padding: '1px 4px',
                                borderRadius: 3,
                                fontWeight: 700
                              }}>
                                R5 Verb
                              </span>
                            )}

                            {/* Word Text */}
                            <span
                              className="spr-heatmap-word-title devanagari"
                              style={{
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                color: 'var(--spr-word-chip-text, #000000)'
                              }}
                            >
                              {word.word_text}
                            </span>

                            {/* RT and Residual Pill */}
                            <div style={{
                              display: 'flex',
                              gap: 4,
                              alignItems: 'center',
                              fontSize: '0.68rem',
                              marginTop: 3
                            }}>
                              <span className="mono" style={{ color: 'var(--spr-chip-rt-text, var(--text-muted))', fontWeight: 600 }}>
                                {word.rt_ms}ms
                              </span>
                              <span
                                className="mono"
                                style={{
                                  fontWeight: 700,
                                  color: word.residual_rt > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                                }}
                              >
                                {word.residual_rt > 0 ? `+${word.residual_rt}` : word.residual_rt}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Hardest Word Peak Indicator */}
                    {trial.hardest_word && (
                      <div style={{
                        marginTop: 10,
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <Flame size={14} color="var(--accent-rose)" />
                        <span>
                          Peak Slowdown Point:{' '}
                          <strong style={{ color: 'var(--accent-rose)' }}>
                            "{trial.hardest_word.word_text}"
                          </strong>{' '}
                          (Region {trial.hardest_word.region_index}) at{' '}
                          <span className="mono">{trial.hardest_word.rt_ms} ms</span>{' '}
                          (<span className="mono">+{trial.hardest_word.residual_rt} ms</span> residual cognitive load)
                        </span>
                      </div>
                    )}

                    {/* Comprehension Question Card */}
                    {trial.question && (
                      <div style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        fontSize: '0.82rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Q:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{trial.question}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Response: </span>
                            <span style={{
                              fontWeight: 600,
                              color: trial.question_correct ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                            }}>
                              {trial.user_response || 'N/A'}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 4 }}>
                              (Expected: {trial.correct_answer})
                            </span>
                          </div>

                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Latency: <span className="mono">{trial.question_rt_ms} ms</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Word Inspector Modal/Drawer if word selected */}
          {selectedWord && (
            <div
              style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 100,
                width: 340,
                background: 'var(--modal-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                padding: '18px 20px',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={16} color="var(--accent-indigo)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Word Reading Diagnostics</span>
                </div>
                <button
                  onClick={() => setSelectedWord(null)}
                  className="btn btn-sm"
                  style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 8, color: 'var(--accent-indigo)' }}>
                "{selectedWord.word.word_text}"
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem' }}>
                <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Raw RT</div>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {selectedWord.word.rt_ms} ms
                  </div>
                </div>

                <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Predicted RT</div>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {selectedWord.word.predicted_rt} ms
                  </div>
                </div>

                <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Residual RT</div>
                  <div className="mono" style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: selectedWord.word.residual_rt > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                  }}>
                    {selectedWord.word.residual_rt > 0 ? `+${selectedWord.word.residual_rt}` : selectedWord.word.residual_rt} ms
                  </div>
                </div>

                <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Region / Chars</div>
                  <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    R{selectedWord.word.region_index} · {selectedWord.word.grapheme_count} ch
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 12,
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 8
              }}>
                Load classification:{' '}
                <strong style={{ color: getDifficultyColor(selectedWord.word.difficulty_level).text }}>
                  {getDifficultyColor(selectedWord.word.difficulty_level).label}
                </strong>
                {selectedWord.word.is_critical_region && (
                  <div style={{ color: 'var(--accent-indigo)', fontWeight: 600, marginTop: 2 }}>
                    ★ Region 5 Critical Integration Verb
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
