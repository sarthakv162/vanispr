import React, { useState, useEffect } from 'react';
import { Gauge, CheckCircle2, ArrowRight, Activity, Keyboard } from 'lucide-react';
import { measureDisplayRefresh, CalibrationResult } from '../../engine/calibration';

interface CalibrationStepProps {
  language: 'hi' | 'en';
  onComplete: (calib: { refreshRate: number; jitterMs: number }) => void;
}

export const CalibrationStep: React.FC<CalibrationStepProps> = ({ language, onComplete }) => {
  const [calibResult, setCalibResult] = useState<CalibrationResult | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const requiredTaps = 3;

  useEffect(() => {
    // Measure screen refresh rate & frame jitter
    measureDisplayRefresh(90).then((res) => {
      setCalibResult(res);
      setIsCalibrating(false);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return;
        setTapCount((prev) => Math.min(requiredTaps, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const ready = !isCalibrating && tapCount >= requiredTaps;

  return (
    <div className="glass-panel" style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: '36px 44px',
      borderRadius: 'var(--radius-xl)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Gauge size={24} color="var(--accent-indigo)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            {language === 'hi' ? 'हार्डवेयर एवं टाइमिंग अंशांकन' : 'Hardware & Display Calibration'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Sub-millisecond double-rAF sync test
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Display Refresh Rate Measurement */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: 20,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="var(--accent-indigo)" />
              {language === 'hi' ? 'डिस्प्ले रिफ्रेश रेट जाँच' : 'Display Refresh Rate Sync'}
            </span>
            {isCalibrating ? (
              <span className="badge badge-amber pulse">Measuring (90 frames)...</span>
            ) : (
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} /> Hardware Synced
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Display Rate</div>
              <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                {calibResult ? `${calibResult.refreshRateHz} Hz` : '...'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Frame Jitter (σ)</div>
              <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#38bdf8' }}>
                {calibResult ? `${calibResult.frameJitterMs} ms` : '...'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Screen Bounds</div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {window.innerWidth}×{window.innerHeight}
              </div>
            </div>
          </div>
        </div>

        {/* Spacebar Keydown Tap Test */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: 20,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <Keyboard size={18} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {language === 'hi' ? 'स्पेसबार अभ्यास (Spacebar Practice)' : 'Spacebar Response Test'}
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            {language === 'hi'
              ? `कृपया कीबोर्ड का स्पेसबार ${requiredTaps} बार दबाएँ ताकि टाइमिंग रिस्पॉन्स कैलिब्रेट हो सके:`
              : `Press the SPACEBAR on your physical keyboard ${requiredTaps} times to calibrate keydown timing:`}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            {[1, 2, 3].map((tap) => (
              <div
                key={tap}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: tapCount >= tap ? 'var(--accent-emerald)' : 'var(--bg-surface-elevated)',
                  border: tapCount >= tap ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: tapCount >= tap ? '#fff' : 'var(--text-muted)',
                  boxShadow: tapCount >= tap ? '0 0 12px var(--accent-emerald-glow)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {tapCount >= tap ? '✓' : tap}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {tapCount < requiredTaps ? (
              <span>Tap <span className="kbd-key">SPACEBAR</span> {requiredTaps - tapCount} more time(s)</span>
            ) : (
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Spacebar calibrated successfully!
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={() => {
              if (ready && calibResult) {
                onComplete({
                  refreshRate: calibResult.refreshRateHz,
                  jitterMs: calibResult.frameJitterMs
                });
              }
            }}
            disabled={!ready}
            className="btn btn-primary btn-lg"
            style={{ opacity: ready ? 1 : 0.4 }}
          >
            {language === 'hi' ? 'निर्देश देखें' : 'View Instructions'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
