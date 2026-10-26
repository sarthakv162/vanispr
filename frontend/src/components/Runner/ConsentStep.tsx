import React from 'react';
import { Shield, Check, ArrowRight } from 'lucide-react';

interface ConsentStepProps {
  language: 'hi' | 'en';
  onConsent: () => void;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({ language, onConsent }) => {
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
          <Shield size={24} color="var(--accent-indigo)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {language === 'hi' ? 'शोध अध्ययन सहमति पत्र' : 'Participant Research Consent'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            VaniSPR Psycholinguistic Laboratory · Ethical Review ID #2026-PSY-04
          </p>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        padding: 24,
        borderRadius: 'var(--radius-md)',
        fontSize: '0.9rem',
        lineHeight: 1.7,
        color: 'var(--text-secondary)',
        marginBottom: 28,
        border: '1px solid var(--border-subtle)',
        maxHeight: 280,
        overflowY: 'auto'
      }} className={language === 'hi' ? 'devanagari' : ''}>
        {language === 'hi' ? (
          <>
            <p style={{ marginBottom: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
              भाषा प्रसंस्करण एवं वाक्य संरचना अध्ययन में आपका स्वागत है।
            </p>
            <p style={{ marginBottom: 12 }}>
              इस प्रयोग में आपको कंप्यूटर स्क्रीन पर शब्द-दर-शब्द वाक्य पढ़ने होंगे और उसके बाद एक छोटे से प्रश्न का उत्तर देना होगा। इस अध्ययन का उद्देश्य यह समझना है कि मानव मस्तिष्क हिंदी वाक्यों को कैसे संसाधित करता है।
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>गोपनीयता:</strong> आपकी पहचान पूर्णतः गोपनीय रखी जाएगी। कोई भी व्यक्तिगत पहचान योग्य जानकारी (जैसे नाम या फोन नंबर) डेटाबेस में संग्रहीत नहीं की जाती। केवल आपकी पढ़ने की गति (मिलीसेकंड में) और प्रश्नों के उत्तर शोध हेतु रिकॉर्ड किए जाएंगे।
            </p>
            <p>
              <strong>स्वेच्छा:</strong> इसमें भाग लेना पूरी तरह स्वैच्छिक है। आप किसी भी समय बिना किसी कारण के प्रयोग छोड़ सकते हैं।
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
              Welcome to the Sentence Processing & Syntactic Locality Experiment.
            </p>
            <p style={{ marginBottom: 12 }}>
              In this study, you will read sentences one word/region at a time using the spacebar, followed by a simple comprehension question. The goal is to investigate how readers incrementally build sentence representations in real time.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Confidentiality:</strong> Your participation is completely anonymous. No personally identifying information (such as name or IP address) is stored. Only millisecond keypress reaction times and comprehension accuracy will be recorded.
            </p>
            <p>
              <strong>Voluntary Participation:</strong> Participation is voluntary. You may withdraw at any time by closing your browser tab without penalty.
            </p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onConsent} className="btn btn-primary btn-lg">
          {language === 'hi' ? 'मैं सहमत हूँ और आगे बढ़ें' : 'I Consent & Proceed'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
