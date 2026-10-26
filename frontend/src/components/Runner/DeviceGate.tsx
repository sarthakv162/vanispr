import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, AlertCircle, ArrowRight } from 'lucide-react';

interface DeviceGateProps {
  children: React.ReactNode;
}

export const DeviceGate: React.FC<DeviceGateProps> = ({ children }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [bypass, setBypass] = useState(false);

  useEffect(() => {
    // Detect mobile touch screen
    const hasTouch = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
    );
    const isSmallScreen = window.innerWidth < 768;
    setIsTouchDevice(hasTouch && isSmallScreen);
  }, []);

  if (isTouchDevice && !bypass) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg-main)',
        color: 'var(--text-primary)'
      }}>
        <div className="glass-panel" style={{
          maxWidth: 480,
          padding: 36,
          textAlign: 'center',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Monitor size={32} color="var(--accent-rose)" />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 12 }}>
            Physical Keyboard Required
          </h2>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            To measure reaction times with sub-millisecond precision, this Self-Paced Reading study requires a desktop or laptop computer with a physical keyboard. Touchscreen phones and tablets are not supported.
          </p>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            marginBottom: 24
          }}>
            Please open this link on your computer browser (Chrome, Firefox, Safari, or Edge).
          </div>

          <button
            onClick={() => setBypass(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', opacity: 0.6 }}
          >
            Developer Bypass (Test on Touchscreen)
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
