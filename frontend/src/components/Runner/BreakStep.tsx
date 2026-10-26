import React from 'react';
import { Coffee, ArrowRight } from 'lucide-react';

interface BreakStepProps {
  language: 'hi' | 'en';
  trialNumber: number;
  totalTrials: number;
  onResume: () => void;
}

export const BreakStep: React.FC<BreakStepProps> = ({ language, trialNumber, totalTrials, onResume }) => {
  return (
    <div className="glass-panel" style={{
      maxWidth: 580,
      margin: '0 auto',
      padding: '40px 48px',
      borderRadius: 'var(--radius-xl)',
      textAlign: 'center'
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        <Coffee size={32} color="var(--accent-amber)" />
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>
        {language === 'hi' ? 'विश्राम (Short Break)' : 'Mid-Session Rest Break'}
      </h2>

      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
        {language === 'hi'
          ? `आपने ${trialNumber} वाक्य पूरे कर लिए हैं। आप अपनी आँखों को आराम दे सकते हैं। जब भी आप तैयार हों, जारी रखें।`
          : `You have completed ${trialNumber} of ${totalTrials} sentences. Feel free to stretch and rest your eyes before continuing.`}
      </p>

      <button onClick={onResume} className="btn btn-primary btn-lg">
        {language === 'hi' ? 'प्रयोग जारी रखें' : 'Resume Experiment'} <ArrowRight size={18} />
      </button>
    </div>
  );
};
