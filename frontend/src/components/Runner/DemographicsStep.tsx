import React, { useState } from 'react';
import { UserCheck, ArrowRight } from 'lucide-react';

interface DemographicsStepProps {
  language: 'hi' | 'en';
  onSubmit: (demographics: {
    externalId: string;
    nativeLanguage: string;
    hindiProficiency: number;
    ageGroup: string;
    vision: string;
  }) => void;
}

export const DemographicsStep: React.FC<DemographicsStepProps> = ({ language, onSubmit }) => {
  const [externalId, setExternalId] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState(language === 'hi' ? 'Hindi' : 'English');
  const [hindiProficiency, setHindiProficiency] = useState(5);
  const [ageGroup, setAgeGroup] = useState('20-29');
  const [vision, setVision] = useState('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      externalId: externalId.trim() || `anon_${Math.floor(Math.random() * 90000 + 10000)}`,
      nativeLanguage,
      hindiProficiency,
      ageGroup,
      vision
    });
  };

  return (
    <div className="glass-panel" style={{
      maxWidth: 640,
      margin: '0 auto',
      padding: '36px 44px',
      borderRadius: 'var(--radius-xl)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <UserCheck size={24} color="var(--accent-emerald)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            {language === 'hi' ? 'प्रतिभागी पृष्ठभूमि प्रपत्र' : 'Participant Background Form'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {language === 'hi' ? 'भाषा एवं सामान्य जानकारी' : 'Linguistic background questionnaire'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Prolific PID or Anonymous ID */}
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            {language === 'hi' ? 'प्रतिभागी पहचान (वैकल्पिक Prolific/MTurk ID):' : 'Participant ID (Prolific / MTurk PID - optional):'}
          </label>
          <input
            type="text"
            className="input"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="e.g. 5f4e3d2c1b0a or leave blank"
          />
        </div>

        {/* Native Language */}
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            {language === 'hi' ? 'मातृभाषा (Native Language):' : 'Native Language:'}
          </label>
          <select
            className="select"
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
          >
            <option value="Hindi">हिन्दी (Hindi)</option>
            <option value="English">English</option>
            <option value="Bengali">বাংলা (Bengali)</option>
            <option value="Marathi">मराठी (Marathi)</option>
            <option value="Tamil">தமிழ் (Tamil)</option>
            <option value="Telugu">తెలుగు (Telugu)</option>
            <option value="Other">Other Language</option>
          </select>
        </div>

        {/* Hindi Proficiency (1 to 5) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {language === 'hi' ? 'हिंदी पढ़ने में दक्षता (1 से 5):' : 'Hindi Reading Proficiency (1 to 5):'}
            </label>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>
              {hindiProficiency} / 5
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={hindiProficiency}
            onChange={(e) => setHindiProficiency(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            <span>1 = Beginner</span>
            <span>5 = Native / Fluent</span>
          </div>
        </div>

        {/* Age Group */}
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            {language === 'hi' ? 'आयु वर्ग (Age Range):' : 'Age Bracket:'}
          </label>
          <select
            className="select"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
          >
            <option value="18-19">18–19</option>
            <option value="20-29">20–29</option>
            <option value="30-39">30–39</option>
            <option value="40-49">40–49</option>
            <option value="50+">50+</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="submit" className="btn btn-primary btn-lg">
            {language === 'hi' ? 'आगे बढ़ें' : 'Continue'} <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
