import React, { useState } from 'react';
import { BookOpen, ArrowRight, Play, CheckCircle } from 'lucide-react';

interface InstructionsStepProps {
  language: 'hi' | 'en';
  onStartPractice: () => void;
}

export const InstructionsStep: React.FC<InstructionsStepProps> = ({ language, onStartPractice }) => {
  const [demoStep, setDemoStep] = useState(0);

  const demoWordsHi = ['रोहन', 'ने', 'बाज़ार', 'से', 'फल', 'खरीदे।'];
  const demoWordsEn = ['The', 'manager', 'reviewed', 'the', 'report', 'today.'];
  const activeDemoWords = language === 'hi' ? demoWordsHi : demoWordsEn;

  const advanceDemo = () => {
    setDemoStep((prev) => (prev + 1) % (activeDemoWords.length + 1));
  };

  return (
    <div className="glass-panel" style={{
      maxWidth: 720,
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
          <BookOpen size={24} color="var(--accent-indigo)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            {language === 'hi' ? 'प्रयोग निर्देश (Instructions)' : 'Experiment Instructions'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Gibson & Warren (2004) Noncumulative Moving-Window SPR
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 24 }} className={language === 'hi' ? 'devanagari' : ''}>
        {language === 'hi' ? (
          <>
            <p style={{ marginBottom: 10 }}>
              इस प्रयोग में वाक्य स्क्रीन पर एक-एक शब्द/खंड करके दिखाए जाएंगे। शुरुआत में पूरा वाक्य रेखाओं (डैश) के रूप में छिपा रहेगा।
            </p>
            <p style={{ marginBottom: 10 }}>
              • <strong>SPACEBAR:</strong> अगला शब्द देखने के लिए कीबोर्ड का स्पेसबार दबाएँ। जैसे ही नया शब्द दिखेगा, पिछला शब्द वापस छिप जाएगा।
            </p>
            <p style={{ marginBottom: 10 }}>
              • <strong>प्रश्नों के उत्तर:</strong> हर वाक्य के बाद एक सरल प्रश्न आएगा।
              उत्तर देने के लिए <span className="kbd-key">F</span> कुंजी <strong>हाँ (Yes)</strong> हेतु तथा <span className="kbd-key">J</span> कुंजी <strong>नहीं (No)</strong> हेतु दबाएँ।
            </p>
            <p>
              • अपनी स्वाभाविक गति से पढ़ें और वाक्यों को समझने का प्रयास करें।
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 10 }}>
              In this experiment, you will read sentences presented one word or phrase at a time. Sentences will initially appear masked as lines (dashes).
            </p>
            <p style={{ marginBottom: 10 }}>
              • <strong>SPACEBAR:</strong> Press the spacebar to reveal the first word, and press it again to move to each subsequent word.
            </p>
            <p style={{ marginBottom: 10 }}>
              • <strong>Comprehension Questions:</strong> After each sentence, answer the yes/no question by pressing <span className="kbd-key">F</span> for <strong>YES</strong> or <span className="kbd-key">J</span> for <strong>NO</strong>.
            </p>
            <p>
              • Read naturally at your normal reading pace while ensuring you understand the sentences.
            </p>
          </>
        )}
      </div>

      {/* Interactive Demonstration Box */}
      <div style={{
        background: 'var(--spr-stage-bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        marginBottom: 28,
        border: '1px solid var(--spr-stage-border)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.05em' }}>
          Interactive Demo — Try tapping the button below:
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          fontSize: '1.4rem',
          minHeight: 50,
          alignItems: 'center'
        }} className={language === 'hi' ? 'devanagari' : ''}>
          {activeDemoWords.map((w, idx) => {
            const isRevealed = demoStep === idx + 1;
            return (
              <span
                key={idx}
                style={{
                  color: isRevealed ? 'var(--spr-active-text)' : 'var(--spr-masked-color)',
                  fontWeight: isRevealed ? 700 : 400,
                  background: isRevealed ? 'var(--spr-active-bg)' : 'transparent',
                  padding: '2px 6px',
                  borderRadius: 4,
                  borderBottom: isRevealed ? '2px solid var(--accent-indigo)' : 'none',
                  fontFamily: isRevealed ? (language === 'hi' ? 'var(--font-hindi)' : 'var(--font-sans)') : 'var(--font-mono)'
                }}
              >
                {isRevealed ? w : '——'}
              </span>
            );
          })}
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={advanceDemo} className="btn btn-secondary btn-sm">
            <span className="kbd-key">SPACEBAR</span> Simulate Spacebar Advance (Step {demoStep}/{activeDemoWords.length})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {language === 'hi' ? '8 अभ्यास वाक्य पहले आएंगे' : '8 Practice trials with feedback first'}
        </span>

        <button onClick={onStartPractice} className="btn btn-primary btn-lg">
          <Play size={18} /> {language === 'hi' ? 'अभ्यास सत्र शुरू करें' : 'Start Practice Trials'}
        </button>
      </div>
    </div>
  );
};
