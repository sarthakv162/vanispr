import React, { useState } from 'react';
import { DeviceGate } from './DeviceGate';
import { ConsentStep } from './ConsentStep';
import { DemographicsStep } from './DemographicsStep';
import { CalibrationStep } from './CalibrationStep';
import { InstructionsStep } from './InstructionsStep';
import { TrialRunner } from './TrialRunner';
import { DebriefStep } from './DebriefStep';
import { Experiment, RunnerSessionInit } from '../../types';
import { api } from '../../api/client';
import { Loader2 } from 'lucide-react';

interface ParticipantRunnerProps {
  experiment: Experiment;
  onReturnToConsole: () => void;
}

type RunnerStep = 'consent' | 'demographics' | 'calibration' | 'instructions' | 'trials' | 'debrief';

export const ParticipantRunner: React.FC<ParticipantRunnerProps> = ({
  experiment,
  onReturnToConsole
}) => {
  const [step, setStep] = useState<RunnerStep>('consent');
  const [demographics, setDemographics] = useState<any>(null);
  const [calibrationData, setCalibrationData] = useState<{ refreshRate: number; jitterMs: number }>({
    refreshRate: 60,
    jitterMs: 0
  });

  const [session, setSession] = useState<RunnerSessionInit | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  // Debrief stats
  const [completionCode, setCompletionCode] = useState('');
  const [finalStats, setFinalStats] = useState<{ totalTrials: number; accuracy: number; meanRtMs: number }>({
    totalTrials: 0,
    accuracy: 100,
    meanRtMs: 350
  });

  const handleStartPractice = async () => {
    setLoadingSession(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trialMode = urlParams.get('mode') === 'full' ? 'full' : 'balanced_8';

      const initData = await api.initRunnerSession({
        experiment_id: experiment.id,
        external_id: demographics?.externalId,
        screen_w: window.innerWidth,
        screen_h: window.innerHeight,
        user_agent: navigator.userAgent,
        refresh_rate_est: calibrationData.refreshRate,
        jitter_ms: calibrationData.jitterMs,
        background: demographics,
        trial_mode: trialMode
      });

      setSession(initData);
      setStep('trials');
    } catch (err) {
      console.error('Session initialization error:', err);
      alert('Failed to start session: ' + err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleFinishExperiment = async (stats: { totalTrials: number; accuracy: number; meanRtMs: number }) => {
    setFinalStats(stats);
    if (session) {
      try {
        const res = await api.completeRunnerSession(session.participant_id);
        setCompletionCode(res.completion_code);
      } catch (err) {
        setCompletionCode(`SPR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
      }
    }
    setStep('debrief');
  };

  return (
    <DeviceGate>
      <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}>
        {step === 'consent' && (
          <ConsentStep
            language={experiment.language}
            onConsent={() => setStep('demographics')}
          />
        )}

        {step === 'demographics' && (
          <DemographicsStep
            language={experiment.language}
            onSubmit={(data) => {
              setDemographics(data);
              setStep('calibration');
            }}
          />
        )}

        {step === 'calibration' && (
          <CalibrationStep
            language={experiment.language}
            onComplete={(calib) => {
              setCalibrationData(calib);
              setStep('instructions');
            }}
          />
        )}

        {step === 'instructions' && (
          loadingSession ? (
            <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="pulse" size={32} style={{ margin: '0 auto 12px' }} />
              <p>Preparing pseudo-randomized counterbalanced stimuli...</p>
            </div>
          ) : (
            <InstructionsStep
              language={experiment.language}
              onStartPractice={handleStartPractice}
            />
          )
        )}

        {step === 'trials' && session && (
          <TrialRunner
            participantId={session.participant_id}
            listNumber={session.list_number}
            language={session.language}
            trials={session.trials}
            onFinishExperiment={handleFinishExperiment}
          />
        )}

        {step === 'debrief' && (
          <DebriefStep
            language={experiment.language}
            completionCode={completionCode}
            totalTrials={finalStats.totalTrials}
            accuracy={finalStats.accuracy}
            meanRtMs={finalStats.meanRtMs}
            onReturnToConsole={onReturnToConsole}
          />
        )}
      </div>
    </DeviceGate>
  );
};
