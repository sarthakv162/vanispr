import React, { useState } from 'react';
import { Award, CheckCircle2, Copy, ArrowLeft } from 'lucide-react';

interface DebriefStepProps {
  language: 'hi' | 'en';
  completionCode: string;
  totalTrials: number;
  accuracy: number;
  meanRtMs: number;
  onReturnToConsole: () => void;
}

export const DebriefStep: React.FC<DebriefStepProps> = ({
  language,
  completionCode,
  totalTrials,
  accuracy,
  meanRtMs,
  onReturnToConsole
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(completionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{
      maxWidth: 640,
      margin: '0 auto',
      padding: '40px 48px',
      borderRadius: 'var(--radius-xl)',
      textAlign: 'center'
    }}>
      <div style={{
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        boxShadow: '0 0 24px var(--accent-emerald-glow)'
      }}>
        <Award size={36} color="var(--accent-emerald)" />
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
        {language === 'hi' ? 'प्रयोग सफलतापूर्वक संपन्न!' : 'Experiment Complete!'}
      </h2>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 28 }}>
        {language === 'hi'
          ? 'आपके बहुमूल्य समय और योगदान के लिए धन्यवाद। आपका डेटा सुरक्षित रूप से रिकॉर्ड हो चुका है।'
          : 'Thank you for your valuable participation in this psycholinguistic study. Your reading time data has been securely saved.'}
      </p>

      {/* Completion Code Box */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: 28
      }}>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
          Verification / Completion Code (Prolific / MTurk):
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-indigo)', letterSpacing: '0.08em' }}>
            {completionCode}
          </span>
          <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ padding: '8px 12px' }}>
            {copied ? <CheckCircle2 size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Performance Summary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 32
      }}>
        <div style={{ background: 'var(--bg-surface-elevated)', padding: 14, borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sentences Read</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {totalTrials}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: 14, borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Accuracy</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {Math.round(accuracy)}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: 14, borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg Pace / Word</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
            {Math.round(meanRtMs)} ms
          </div>
        </div>
      </div>

      <button onClick={onReturnToConsole} className="btn btn-secondary btn-sm">
        <ArrowLeft size={16} /> Return to Researcher Console
      </button>
    </div>
  );
};
