import React from 'react';
import { Play, Settings, Sun, Moon, LogOut, UserCheck } from 'lucide-react';
import { Experiment } from '../types';

interface NavbarProps {
  currentView: 'host' | 'runner';
  onViewChange: (view: 'host' | 'runner') => void;
  activeExperiment: Experiment | null;
  experiments: Experiment[];
  onSelectExperiment: (exp: Experiment) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user?: { email: string; name: string } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  activeExperiment,
  experiments,
  onSelectExperiment,
  theme,
  onToggleTheme,
  user,
  onLogout
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '10px 16px',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 0 16px var(--accent-indigo-glow)',
            fontFamily: 'var(--font-display)',
            flexShrink: 0
          }}>
            V
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #a5b4fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                VaniSPR
              </span>
              <span className="badge badge-indigo" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                SUITE
              </span>
            </div>
            <p className="nav-desktop-only" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Psycholinguistics Platform
            </p>
          </div>
        </div>

        {/* Experiment Selector: Clean Segmented Pill Switcher */}
        {currentView === 'host' && experiments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }} className="nav-desktop-only">Study:</span>
            <div style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: '2px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              gap: '3px'
            }}>
              {[...experiments]
                .sort((a, b) => (a.language === 'en' ? -1 : 1))
                .map((exp) => {
                  const isSelected = exp.id === activeExperiment?.id;
                  const isHindi = exp.language === 'hi';
                  const label = isHindi ? 'Hindi' : 'English';
                  const trialCountHint = isHindi ? '8 Trials' : '4 Trials';

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
                        fontSize: '0.78rem',
                        padding: '4px 12px',
                        borderRadius: 'calc(var(--radius-md) - 3px)',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
                        transition: 'all 0.18s ease',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title={`${exp.title} (${trialCountHint})`}
                    >
                      <span>{label}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        opacity: isSelected ? 0.9 : 0.6,
                        background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
                        padding: '1px 5px',
                        borderRadius: 4
                      }}>
                        {isHindi ? '8' : '4'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Right Actions: Theme Toggle, View Switcher, User Avatar & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* User Profile Badge (if logged in) */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--text-primary)'
            }} title={`Signed in as ${user.email}`}>
              <UserCheck size={14} color="var(--accent-indigo)" />
              <span style={{ fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
            </div>
          )}

          {/* White Mode / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
            title={theme === 'dark' ? 'Switch to White / Light Mode' : 'Switch to Dark Mode'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              fontSize: '0.78rem',
              fontWeight: 500
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} color="var(--accent-amber)" />
                <span className="nav-desktop-only">White</span>
              </>
            ) : (
              <>
                <Moon size={14} color="var(--accent-indigo)" />
                <span className="nav-desktop-only">Dark</span>
              </>
            )}
          </button>

          {/* View Switcher: Host Admin vs Participant Runner */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface-elevated)',
            padding: 3,
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
                fontSize: '0.78rem',
                padding: '4px 10px',
                boxShadow: currentView === 'host' ? '0 2px 8px var(--accent-indigo-glow)' : 'none'
              }}
            >
              <Settings size={13} />
              <span className="nav-desktop-only">Console</span>
            </button>

            <button
              onClick={() => onViewChange('runner')}
              className="btn btn-sm"
              style={{
                background: currentView === 'runner' ? 'var(--accent-emerald)' : 'transparent',
                color: currentView === 'runner' ? '#fff' : 'var(--text-secondary)',
                fontWeight: currentView === 'runner' ? 600 : 400,
                fontSize: '0.78rem',
                padding: '4px 10px',
                boxShadow: currentView === 'runner' ? '0 2px 8px var(--accent-emerald-glow)' : 'none'
              }}
            >
              <Play size={13} />
              <span className="nav-desktop-only">Runner</span>
            </button>
          </div>

          {/* Logout Button */}
          {user && onLogout && (
            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out of Researcher Console"
              style={{
                padding: '5px 8px',
                color: 'var(--accent-rose)',
                borderColor: 'rgba(244, 63, 94, 0.3)',
                fontSize: '0.78rem'
              }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
