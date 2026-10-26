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

        {/* Experiment Selector: Clean Segmented Pill Switcher */}
        {currentView === 'host' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Study:</span>
            <div style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              gap: '4px'
            }}>
              {experiments.map((exp) => {
                const isSelected = exp.id === activeExperiment?.id;
                const isHindi = exp.language === 'hi';
                const label = isHindi ? 'Hindi' : 'English';

                return (
                  <button
                    key={exp.id}
                    onClick={() => onSelectExperiment(exp)}
                    className="btn btn-sm"
                    style={{
                      background: isSelected
                        ? (isHindi ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #059669)')
                        : 'transparent',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      padding: '5px 16px',
                      borderRadius: 'calc(var(--radius-md) - 3px)',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
                      transition: 'all 0.18s ease',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title={exp.title}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
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
