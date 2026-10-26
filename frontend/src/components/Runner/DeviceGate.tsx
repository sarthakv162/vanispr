import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DeviceGateProps {
  children: React.ReactNode;
}

export const DeviceGate: React.FC<DeviceGateProps> = ({ children }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [bypass, setBypass] = useState(() => {
    return sessionStorage.getItem('vanispr_mobile_bypass') === 'true';
  });

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

  const handleContinueMobile = () => {
    sessionStorage.setItem('vanispr_mobile_bypass', 'true');
    setBypass(true);
  };

  if (isTouchDevice && !bypass) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)'
      }}>
        <div className="glass-panel" style={{
          maxWidth: 460,
          padding: '32px 24px',
          textAlign: 'center',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--accent-indigo)'
          }}>
            <Smartphone size={30} />
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 10 }}>
            Mobile Phone Mode
          </h2>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 18 }}>
            You are viewing VaniSPR on a mobile device. Tap-to-advance mode is fully supported so you can participate directly from your phone.
          </p>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: 22,
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: 4 }}>
              <Monitor size={14} /> Researcher Recommendation:
            </div>
            For publication-grade cognitive timing, a computer with a physical keyboard is recommended, but you may proceed seamlessly on this phone.
          </div>

          <button
            onClick={handleContinueMobile}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '0.92rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px var(--accent-indigo-glow)'
            }}
          >
            <span>Continue on Phone (Tap Mode)</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
