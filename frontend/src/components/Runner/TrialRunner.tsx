import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, AlertCircle, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { RunnerTrial, WordEvent } from '../../types';
import { SPRTimingEngine } from '../../engine/timingEngine';
import { createWordMask } from '../../engine/hindiSegmenter';
import { api } from '../../api/client';
import { BreakStep } from './BreakStep';

interface TrialRunnerProps {
  participantId: string;
  listNumber: number;
  language: 'hi' | 'en';
  trials: RunnerTrial[];
  onFinishExperiment: (stats: { totalTrials: number; accuracy: number; meanRtMs: number }) => void;
}

export const TrialRunner: React.FC<TrialRunnerProps> = ({
  participantId,
  listNumber,
  language,
  trials,
  onFinishExperiment
}) => {
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);
  const [activeRegionIndex, setActiveRegionIndex] = useState(-1);
  const [trialPhase, setTrialPhase] = useState<'reading' | 'question' | 'feedback' | 'break'>('reading');
  
  // Question state
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean | null>(null);
  const [explanationText, setExplanationText] = useState<string | null>(null);

  // Performance telemetry accumulator
  const trialEventsRef = useRef<WordEvent[]>([]);
  const trialResultRef = useRef<{ startedAt: number; completedAt: number; focusLostCount: number }>({
    startedAt: 0,
    completedAt: 0,
    focusLostCount: 0
  });
  const allTrialsCorrectCount = useRef(0);
  const allWordRts = useRef<number[]>([]);
  const engineRef = useRef<SPRTimingEngine | null>(null);

  const currentTrial = trials[currentTrialIdx];
  const isPractice = currentTrial?.is_practice || currentTrial?.type === 'practice';
  const totalTrials = trials.length;

  // Start the reading phase for the current trial
  const startReadingCurrentTrial = async () => {
    if (!currentTrial) return;

    setTrialPhase('reading');
    setActiveRegionIndex(-1);
    setUserAnswer(null);
    setIsCorrectAnswer(null);
    setExplanationText(null);

    const engine = new SPRTimingEngine();
    engineRef.current = engine;

    const result = await engine.runTrial({
      regions: currentTrial.regions,
      renderRegion: (idx) => setActiveRegionIndex(idx)
    });

    trialEventsRef.current = result.wordEvents;
    trialResultRef.current = {
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      focusLostCount: result.focusLostCount
    };

    // Store word RTs for participant speed average
    result.wordEvents.forEach((ev) => allWordRts.current.push(ev.rt_ms));

    // If trial has question, proceed to question phase
    if (currentTrial.question) {
      setTrialPhase('question');
      setQuestionStartTime(performance.now());
    } else {
      // No question, immediately commit and proceed
      await commitAndProceed(null, null, null);
    }
  };

  useEffect(() => {
    startReadingCurrentTrial();

    return () => {
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
    };
  }, [currentTrialIdx]);

  // Listener for Question Answer (F for YES, J for NO) or Feedback dismiss
  useEffect(() => {
    if (trialPhase !== 'question' && trialPhase !== 'feedback') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (trialPhase === 'question') {
        const key = e.key.toLowerCase();
        let chosen: string | null = null;
        if (key === 'f') chosen = 'yes';
        else if (key === 'j') chosen = 'no';

        if (chosen) {
          e.preventDefault();
          const qRt = performance.now() - questionStartTime;
          const correctAns = (currentTrial.correct_answer || 'yes').toLowerCase();
          const isCorrect = chosen === correctAns ? 1 : 0;

          if (isCorrect) allTrialsCorrectCount.current++;

          setUserAnswer(chosen);
          setIsCorrectAnswer(isCorrect === 1);

          // If practice trial and incorrect, show feedback
          if (isPractice && isCorrect === 0) {
            setTrialPhase('feedback');
            setExplanationText(currentTrial.explanation || 'Incorrect answer. Please read carefully.');
            // Send batch to backend in background
            api.submitTrial({
              participant_id: participantId,
              item_version_id: currentTrial.item_version_id,
              presentation_order: currentTrialIdx + 1,
              started_at: trialResultRef.current.startedAt,
              completed_at: trialResultRef.current.completedAt,
              question_response: chosen,
              correct: isCorrect,
              question_rt_ms: qRt,
              focus_lost_count: trialResultRef.current.focusLostCount,
              word_events: trialEventsRef.current
            });
          } else {
            // Correct or experimental: advance immediately
            commitAndProceed(chosen, isCorrect, qRt);
          }
        }
      } else if (trialPhase === 'feedback') {
        // Spacebar dismisses feedback
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          advanceToNextTrial();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trialPhase, questionStartTime, currentTrial]);

  const commitAndProceed = async (answer: string | null, isCorrect: number | null, qRt: number | null) => {
    try {
      await api.submitTrial({
        participant_id: participantId,
        item_version_id: currentTrial.item_version_id,
        presentation_order: currentTrialIdx + 1,
        started_at: trialResultRef.current.startedAt,
        completed_at: trialResultRef.current.completedAt,
        question_response: answer,
        correct: isCorrect,
        question_rt_ms: qRt,
        focus_lost_count: trialResultRef.current.focusLostCount,
        word_events: trialEventsRef.current
      });
    } catch (err) {
      console.warn('Batch submission queued / retry:', err);
    }

    advanceToNextTrial();
  };

  const advanceToNextTrial = () => {
    const nextIdx = currentTrialIdx + 1;

    // Check midpoint break (e.g. trial 40 of 80, or trial 15 of 30)
    const isMidpoint = totalTrials >= 10 && nextIdx === Math.floor(totalTrials / 2);

    if (nextIdx >= totalTrials) {
      // Completed all trials
      const meanRt = allWordRts.current.length > 0
        ? allWordRts.current.reduce((a, b) => a + b, 0) / allWordRts.current.length
        : 350;
      const acc = totalTrials > 0 ? (allTrialsCorrectCount.current / totalTrials) * 100 : 100;
      onFinishExperiment({
        totalTrials,
        accuracy: acc,
        meanRtMs: meanRt
      });
    } else if (isMidpoint) {
      setTrialPhase('break');
    } else {
      setCurrentTrialIdx(nextIdx);
    }
  };

  if (!currentTrial) {
    return null;
  }

  if (trialPhase === 'break') {
    return (
      <BreakStep
        language={language}
        trialNumber={currentTrialIdx + 1}
        totalTrials={totalTrials}
        onResume={() => {
          setTrialPhase('reading');
          setCurrentTrialIdx((prev) => prev + 1);
        }}
      />
    );
  }

  const progressPercent = Math.round(((currentTrialIdx + 1) / totalTrials) * 100);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Session Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Trial {currentTrialIdx + 1} of {totalTrials}
          </span>
          {isPractice && (
            <span className="badge badge-amber">
              {language === 'hi' ? 'अभ्यास सत्र (Practice)' : 'Practice Trial'}
            </span>
          )}
          <span className="badge badge-indigo">
            List {listNumber}
          </span>
        </div>

        <div style={{ width: 140, height: 6, background: 'var(--bg-surface-elevated)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #6366f1, #10b981)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Main Masked Reading Window */}
      <div className="spr-reading-stage">
        <div className="spr-sentence-container">
          {currentTrial.regions.map((region, rIdx) => {
            const isActive = rIdx === activeRegionIndex;
            const isMasked = !isActive;

            return (
              <div
                key={rIdx}
                className={`spr-region-chunk ${isActive ? 'active' : 'masked'} ${language === 'hi' ? 'devanagari' : ''}`}
              >
                {isMasked ? (
                  region.words.map((w, wIdx) => (
                    <span key={wIdx} style={{ opacity: 0.35 }}>
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

        {/* Spacebar Instruction prompt */}
        {trialPhase === 'reading' && (
          <div style={{
            marginTop: 40,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span className="kbd-key">SPACEBAR</span>
            <span>
              {language === 'hi' ? 'अगला शब्द देखने के लिए स्पेसबार दबाएँ' : 'Press spacebar to advance'}
            </span>
          </div>
        )}
      </div>

      {/* Comprehension Question Card */}
      {trialPhase === 'question' && (
        <div className="glass-panel" style={{
          padding: '28px 36px',
          textAlign: 'center',
          border: '1px solid var(--border-focus)',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <div style={{
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            color: 'var(--accent-indigo)',
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: 8
          }}>
            {language === 'hi' ? 'समझ प्रश्न' : 'Comprehension Question'}
          </div>

          <p style={{
            fontSize: '1.28rem',
            fontWeight: 600,
            marginBottom: 24,
            lineHeight: 1.6
          }} className={language === 'hi' ? 'devanagari' : ''}>
            {currentTrial.question}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            <button
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'f' });
                window.dispatchEvent(e);
              }}
              className="btn btn-secondary btn-lg"
              style={{ minWidth: 150, padding: '14px 20px' }}
            >
              <span className="kbd-key">F</span> {language === 'hi' ? 'हाँ (Yes)' : 'Yes'}
            </button>

            <button
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'j' });
                window.dispatchEvent(e);
              }}
              className="btn btn-secondary btn-lg"
              style={{ minWidth: 150, padding: '14px 20px' }}
            >
              <span className="kbd-key">J</span> {language === 'hi' ? 'नहीं (No)' : 'No'}
            </button>
          </div>
        </div>
      )}

      {/* Immediate Feedback for Practice Errors (Gibson & Warren 2004 procedure) */}
      {trialPhase === 'feedback' && (
        <div className="glass-panel" style={{
          padding: '28px 36px',
          textAlign: 'center',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.35)'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <AlertCircle size={24} color="var(--accent-rose)" />
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fda4af', marginBottom: 8 }}>
            {language === 'hi' ? 'उत्तर गलत था (Incorrect Answer)' : 'Incorrect Response'}
          </h3>

          <p style={{ fontSize: '0.92rem', color: '#f8fafc', marginBottom: 20 }}>
            {explanationText}
          </p>

          <button onClick={advanceToNextTrial} className="btn btn-secondary btn-sm">
            <span className="kbd-key">SPACEBAR</span> {language === 'hi' ? 'जारी रखने के लिए स्पेस दबाएँ' : 'Press Spacebar to Continue'}
          </button>
        </div>
      )}
    </div>
  );
};
