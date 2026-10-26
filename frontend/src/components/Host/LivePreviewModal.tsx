import React, { useState, useEffect, useRef } from 'react';
import { X, Play, RotateCcw, Clock, CheckCircle } from 'lucide-react';
import { ItemVersion, WordEvent, Region } from '../../types';
import { SPRTimingEngine } from '../../engine/timingEngine';
import { createWordMask } from '../../engine/hindiSegmenter';

interface LivePreviewModalProps {
  version: ItemVersion;
  question?: string;
  correctAnswer?: string;
  language: 'hi' | 'en';
  onClose: () => void;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  version,
  question,
  correctAnswer,
  language,
  onClose
}) => {
  const [activeRegionIndex, setActiveRegionIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [events, setEvents] = useState<WordEvent[]>([]);
  const [questionAnswered, setQuestionAnswered] = useState<string | null>(null);
  const engineRef = useRef<SPRTimingEngine | null>(null);

  const startTrial = async () => {
    setIsFinished(false);
    setEvents([]);
    setQuestionAnswered(null);
    setIsRunning(true);

    const engine = new SPRTimingEngine();
    engineRef.current = engine;

    const result = await engine.runTrial({
      regions: version.regions,
      renderRegion: (idx) => setActiveRegionIndex(idx)
    });

    setEvents(result.wordEvents);
    setIsRunning(false);
    setIsFinished(true);
  };

  useEffect(() => {
    startTrial();
    return () => {
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
    };
  }, [version]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 24
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 850,
        background: 'var(--modal-bg)',
        borderRadius: 'var(--radius-xl)',
        padding: 32,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-indigo">Live Engine Preview</span>
              <span className="badge badge-emerald">{version.condition_label}</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: 4 }}>
              Moving-Window SPR Hardware Paint Test
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px 8px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Masked Display Container */}
        <div className="spr-reading-stage" style={{ marginBottom: 24 }}>
          <div className="spr-sentence-container">
            {version.regions.map((region, rIdx) => {
              const isActive = rIdx === activeRegionIndex;
              const isMasked = !isActive;

              return (
                <div
                  key={rIdx}
                  className={`spr-region-chunk ${isActive ? 'active' : 'masked'} ${language === 'hi' ? 'devanagari' : ''}`}
                >
                  {isMasked ? (
                    region.words.map((w, wIdx) => (
                      <span key={wIdx} style={{ opacity: 0.4 }}>
                        {createWordMask(w)}
                      </span>
                    ))
                  ) : (
                    region.words.map((w, wIdx) => (
                      <span key={wIdx} style={{ color: 'var(--spr-active-text)', fontWeight: 600 }}>
                        {w}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompt */}
          <div style={{
            marginTop: 32,
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span className="kbd-key">SPACEBAR</span>
            <span>
              {isRunning
                ? 'Press spacebar to advance to the next word/region'
                : isFinished
                ? 'Trial reading complete!'
                : 'Click "Start Over" to test again'}
            </span>
          </div>
        </div>

        {/* Comprehension Question if trial finished */}
        {isFinished && question && (
          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: 20,
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Comprehension Question:
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }} className={language === 'hi' ? 'devanagari' : ''}>
              {question}
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setQuestionAnswered('yes')}
                className={`btn btn-sm ${questionAnswered === 'yes' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <span className="kbd-key">F</span> {language === 'hi' ? 'हाँ (Yes)' : 'Yes'}
              </button>
              <button
                onClick={() => setQuestionAnswered('no')}
                className={`btn btn-sm ${questionAnswered === 'no' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <span className="kbd-key">J</span> {language === 'hi' ? 'नहीं (No)' : 'No'}
              </button>
            </div>

            {questionAnswered && (
              <div style={{ marginTop: 12, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                {questionAnswered.toLowerCase() === (correctAnswer || 'yes').toLowerCase() ? (
                  <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} /> Correct answer!
                  </span>
                ) : (
                  <span style={{ color: 'var(--accent-rose)' }}>
                    Incorrect answer. Correct was: {correctAnswer}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* RT Inspection Table */}
        {events.length > 0 && (
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            maxHeight: 180,
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Millisecond Event Telemetry Log
              </span>
              <span>{events.length} words logged</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
              {events.map((ev, i) => (
                <div key={i} style={{
                  background: 'var(--bg-surface-elevated)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className={language === 'hi' ? 'devanagari' : ''}>
                    {ev.word_text}
                  </div>
                  <div className="mono" style={{ color: 'var(--accent-indigo)', fontSize: '0.75rem' }}>
                    {ev.rt_ms.toFixed(1)} ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button onClick={startTrial} className="btn btn-secondary btn-sm">
            <RotateCcw size={14} /> Re-run Stimulus
          </button>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
