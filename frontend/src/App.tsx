import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HostDashboard } from './components/Host/HostDashboard';
import { StimulusItemEditor } from './components/Host/StimulusItemEditor';
import { LatinSquareVisualizer } from './components/Host/LatinSquareVisualizer';
import { AnalysisConsole } from './components/Host/AnalysisConsole';
import { NormingSurveyManager } from './components/Host/NormingSurveyManager';
import { BulkCsvImport } from './components/Host/BulkCsvImport';
import { ParticipantRunner } from './components/Runner/ParticipantRunner';
import { Experiment } from './types';
import { api } from './api/client';
import {
  LayoutDashboard, Edit3, Grid, TrendingUp, Award,
  FileSpreadsheet, Plus, CheckCircle, RefreshCw
} from 'lucide-react';

export function App() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
  const [isDirectParticipant] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('participant') === 'true' || params.get('runner') === 'true';
  });
  const [currentView, setCurrentView] = useState<'host' | 'runner'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('participant') === 'true' || params.get('runner') === 'true') ? 'runner' : 'host';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'latinsquare' | 'analysis' | 'norming' | 'csv'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Theme State: Persist Light / Dark Mode in localStorage
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('vanispr_theme') || localStorage.getItem('aadyalang_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vanispr_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // New Experiment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLang, setNewLang] = useState<'hi' | 'en'>('hi');

  const loadExperiments = async (selectId?: string) => {
    try {
      setLoading(true);
      const exps = await api.getExperiments();
      setExperiments(exps);

      if (exps.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const expFromUrl = urlParams.get('exp');
        const targetId = selectId || expFromUrl;
        const toSelect = targetId ? exps.find((e) => e.id === targetId) || exps[0] : exps[0];

        if (toSelect) {
          const detail = await api.getExperiment(toSelect.id);
          setActiveExperiment(detail);
        }
      }
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiments();
  }, []);

  const handleSelectExperiment = async (exp: Experiment) => {
    try {
      const detail = await api.getExperiment(exp.id);
      setActiveExperiment(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.createExperiment({
        title: newTitle.trim(),
        description: newDesc.trim(),
        language: newLang,
        factors: [
          { name: 'factor_a', levels: ['level_1', 'level_2'] },
          { name: 'factor_b', levels: ['level_1', 'level_2'] }
        ]
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      await loadExperiments(res.id);
    } catch (err) {
      alert('Failed to create experiment: ' + err);
    }
  };

  if (loading && experiments.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="pulse" size={36} color="var(--accent-indigo)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>Initializing VaniSPR Research Suite</h2>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Loading Hindi & English psycholinguistic environments...</p>
        </div>
      </div>
    );
  }

  // Direct Participant Mode: Render pure experiment flow without researcher controls
  if (isDirectParticipant && currentView === 'runner') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
        <header style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 24px',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#fff'
            }}>
              V
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                VaniSPR
              </span>
              <span className="badge badge-indigo" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                Study Session
              </span>
            </div>
          </div>

          <button onClick={toggleTheme} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </header>

        <main style={{ flex: 1, padding: '24px 20px 60px' }}>
          {activeExperiment ? (
            <ParticipantRunner
              experiment={activeExperiment}
              onReturnToConsole={() => {
                window.location.href = window.location.pathname;
              }}
            />
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>Loading study session...</div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header / Navigation */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        activeExperiment={activeExperiment}
        experiments={experiments}
        onSelectExperiment={handleSelectExperiment}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      {currentView === 'runner' ? (
        activeExperiment ? (
          <ParticipantRunner
            experiment={activeExperiment}
            onReturnToConsole={() => setCurrentView('host')}
          />
        ) : (
          <div style={{ padding: 48, textAlign: 'center' }}>No active experiment selected.</div>
        )
      ) : (
        <main style={{ maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 24px 64px' }}>
          {/* Sub Navigation Bar for Host Console */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: 16
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: 4,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              overflowX: 'auto',
              maxWidth: '100%'
            }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'dashboard' ? 'var(--accent-indigo)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <LayoutDashboard size={14} /> Telemetry & Dashboard
              </button>

              <button
                onClick={() => setActiveTab('items')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'items' ? 'var(--accent-indigo)' : 'transparent',
                  color: activeTab === 'items' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <Edit3 size={14} /> Stimuli & Region Editor
              </button>

              <button
                onClick={() => setActiveTab('latinsquare')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'latinsquare' ? 'var(--accent-indigo)' : 'transparent',
                  color: activeTab === 'latinsquare' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <Grid size={14} /> Latin-Square Matrices
              </button>

              <button
                onClick={() => setActiveTab('analysis')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'analysis' ? 'var(--accent-indigo)' : 'transparent',
                  color: activeTab === 'analysis' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <TrendingUp size={14} /> Analysis & Figure 1
              </button>

              <button
                onClick={() => setActiveTab('norming')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'norming' ? 'var(--accent-indigo)' : 'transparent',
                  color: activeTab === 'norming' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <Award size={14} /> Plausibility Norming
              </button>

              <button
                onClick={() => setActiveTab('csv')}
                className="btn btn-sm"
                style={{
                  background: activeTab === 'csv' ? 'var(--accent-indigo)' : 'transparent',
                  color: activeTab === 'csv' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <FileSpreadsheet size={14} /> Bulk CSV Import
              </button>
            </div>

            {/* Quick Action: Create New Study */}
            <button onClick={() => setShowCreateModal(true)} className="btn btn-secondary btn-sm">
              <Plus size={14} /> New Study
            </button>
          </div>

          {/* Active Tab View */}
          {activeExperiment ? (
            <>
              {activeTab === 'dashboard' && (
                <HostDashboard
                  experiment={activeExperiment}
                  onOpenRunner={() => setCurrentView('runner')}
                />
              )}

              {activeTab === 'items' && (
                <StimulusItemEditor
                  experiment={activeExperiment}
                  onRefresh={() => handleSelectExperiment(activeExperiment)}
                />
              )}

              {activeTab === 'latinsquare' && (
                <LatinSquareVisualizer
                  experiment={activeExperiment}
                  onRefresh={() => handleSelectExperiment(activeExperiment)}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisConsole experiment={activeExperiment} />
              )}

              {activeTab === 'norming' && (
                <NormingSurveyManager experiment={activeExperiment} />
              )}

              {activeTab === 'csv' && (
                <BulkCsvImport
                  experiment={activeExperiment}
                  onRefresh={() => handleSelectExperiment(activeExperiment)}
                />
              )}
            </>
          ) : (
            <div className="glass-panel" style={{ padding: 48, textAlign: 'center' }}>
              Please select or create an experiment to begin.
            </div>
          )}
        </main>
      )}

      {/* Create New Experiment Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 24
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: 580,
            background: 'var(--modal-bg)',
            borderRadius: 'var(--radius-xl)',
            padding: 32
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
              Create New SPR Experiment
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Define study language, conditions, and hypothesis parameters.
            </p>

            <form onSubmit={handleCreateExperiment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Experiment Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Hindi Relative Clause Extraposition Study"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Stimulus Language & Font
                </label>
                <select
                  className="select"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value as any)}
                >
                  <option value="hi">Hindi</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Scientific Description & Hypothesis
                </label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. 2x2 design investigating argument-head distance and intermediate syntactic structure..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create Study
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
