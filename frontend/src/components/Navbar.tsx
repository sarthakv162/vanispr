import React from 'react';
import { Layers, Activity, Play, Settings, Database, BookOpen, Sun, Moon } from 'lucide-react';
import { Experiment } from '../types';

interface NavbarProps {
  currentView: 'host' | 'runner';
  onViewChange: (view: 'host' | 'runner') => void;
  activeExperiment: Experiment | null;
  experiments: Experiment[];
  onSelectExperiment: (exp: Experiment) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  activeExperiment,
  experiments,
  onSelectExperiment,
  theme,
  onToggleTheme
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 0 16px var(--accent-indigo-glow)',
            fontFamily: 'var(--font-display)'
          }}>
            V
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #a5b4fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                VaniSPR
              </span>
              <span className="badge badge-indigo" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                RESEARCH SUITE
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Self-Paced Reading Psycholinguistics Platform
            </p>
          </div>
        </div>

        {/* Experiment Selector */}
        {currentView === 'host' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Study:</span>
            <select
              className="select"
              style={{
                width: 320,
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 500,
                background: 'var(--bg-surface-elevated)'
              }}
              value={activeExperiment?.id || ''}
              onChange={(e) => {
                const found = experiments.find((exp) => exp.id === e.target.value);
                if (found) onSelectExperiment(found);
              }}
            >
              {experiments.map((exp) => {
                const langLabel = exp.language === 'hi' ? 'Hindi' : 'English';
                const cleanTitle = exp.title.length > 38 ? `${exp.title.slice(0, 35)}...` : exp.title;
                return (
                  <option key={exp.id} value={exp.id}>
                    [{langLabel}] {cleanTitle}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Right Actions: Theme Toggle & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* White Mode / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
            title={theme === 'dark' ? 'Switch to White / Light Mode' : 'Switch to Dark Mode'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              fontWeight: 500
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="var(--accent-amber)" />
                <span>White Mode</span>
              </>
            ) : (
              <>
                <Moon size={15} color="var(--accent-indigo)" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {/* View Switcher: Host Admin vs Participant Runner */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface-elevated)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => onViewChange('host')}
              className="btn btn-sm"
              style={{
                background: currentView === 'host' ? 'var(--accent-indigo)' : 'transparent',
                color: currentView === 'host' ? '#fff' : 'var(--text-secondary)',
                fontWeight: currentView === 'host' ? 600 : 400,
                boxShadow: currentView === 'host' ? '0 2px 8px var(--accent-indigo-glow)' : 'none'
              }}
            >
              <Settings size={14} />
              Researcher Console
            </button>

            <button
              onClick={() => onViewChange('runner')}
              className="btn btn-sm"
              style={{
                background: currentView === 'runner' ? 'var(--accent-emerald)' : 'transparent',
                color: currentView === 'runner' ? '#fff' : 'var(--text-secondary)',
                fontWeight: currentView === 'runner' ? 600 : 400,
                boxShadow: currentView === 'runner' ? '0 2px 8px var(--accent-emerald-glow)' : 'none'
              }}
            >
              <Play size={14} />
              Participant Runner
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
