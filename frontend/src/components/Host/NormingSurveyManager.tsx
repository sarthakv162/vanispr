import React, { useState, useEffect } from 'react';
import { Star, AlertCircle, CheckCircle, Send, Award, RefreshCw } from 'lucide-react';
import { Experiment, NormingItem, NormingResult } from '../../types';
import { api } from '../../api/client';

interface NormingSurveyManagerProps {
  experiment: Experiment;
}

export const NormingSurveyManager: React.FC<NormingSurveyManagerProps> = ({ experiment }) => {
  const [items, setItems] = useState<NormingItem[]>([]);
  const [results, setResults] = useState<NormingResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Active rater state
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [ratingVal, setRatingVal] = useState<number>(4);
  const [raterId, setRaterId] = useState(`rater_${Math.floor(Math.random() * 900 + 100)}`);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itms, res] = await Promise.all([
        api.getNormingItems(experiment.id),
        api.getNormingResults(experiment.id)
      ]);
      setItems(itms);
      setResults(res);
    } catch (err) {
      console.error('Failed to load norming data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [experiment.id]);

  const handleSubmitRating = async () => {
    const item = items[activeItemIdx];
    if (!item) return;

    try {
      await api.submitNormingRating({
        experiment_id: experiment.id,
        item_version_id: item.item_version_id,
        rater_id: raterId,
        rating: ratingVal
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        if (activeItemIdx < items.length - 1) {
          setActiveItemIdx((prev) => prev + 1);
          setRatingVal(4);
        }
      }, 700);

      fetchData();
    } catch (err) {
      alert('Failed to submit rating: ' + err);
    }
  };

  const currentItem = items[activeItemIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Award size={22} color="var(--accent-indigo)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Plausibility & Naturalness Norming Survey Module
          </h3>
          <span className="badge badge-indigo">Pre-Testing Quality Control</span>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 800 }}>
          Replicating Gibson & Warren (2004) Section 2.4: In the original paper, 28 participants rated simplified non-extracted
          versions on a 1 (natural) to 7 (unnatural) scale. Items with statistically significant plausibility confounds were
          excluded prior to final testing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Interactive Norming Rating Portal */}
        <div className="glass-panel" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
              Stimulus Naturalness Rating (1 to 7 Scale)
            </h4>
            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Item {items.length > 0 ? activeItemIdx + 1 : 0} of {items.length}
            </span>
          </div>

          {currentItem ? (
            <div>
              <div style={{
                background: 'var(--bg-surface)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                minHeight: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                marginBottom: 24,
                border: '1px solid var(--border-subtle)'
              }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.6 }} className={experiment.language === 'hi' ? 'devanagari' : ''}>
                  "{currentItem.sentence_text}"
                </p>
              </div>

              {/* 1 to 7 Rating Scale Buttons */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <span>1 = Very Natural & Plausible</span>
                  <span>7 = Highly Unnatural</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      onClick={() => setRatingVal(num)}
                      className="btn"
                      style={{
                        padding: '12px 0',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: ratingVal === num ? 'var(--accent-indigo)' : 'var(--bg-surface-elevated)',
                        color: ratingVal === num ? '#fff' : 'var(--text-secondary)',
                        border: ratingVal === num ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                        boxShadow: ratingVal === num ? '0 0 12px var(--accent-indigo-glow)' : 'none'
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit & Next */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Rater ID: {raterId}
                </span>

                <button
                  onClick={handleSubmitRating}
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: 160 }}
                >
                  {submitted ? (
                    <>
                      <CheckCircle size={16} /> Rating Recorded!
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Submit & Next Stimulus
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No experimental items available to rate.
            </div>
          )}
        </div>

        {/* Norming Results & Confound Flagging */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
              Plausibility Means & Confound Flags
            </h4>
            <button onClick={fetchData} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
              <RefreshCw size={12} />
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Items where conditions differ by &gt;1.5 points should be inspected for lexical or syntactic plausibility confounds.
          </p>

          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No ratings submitted yet. Submit ratings using the portal on the left.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((r, idx) => (
                  <div key={idx} style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span className="mono" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Item #{r.item_number}
                      </span>
                      <span className="badge badge-indigo" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                        {r.condition_label}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: r.mean_rating > 4.5 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                        {r.mean_rating.toFixed(2)} / 7.0
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {r.rating_count} rating(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
