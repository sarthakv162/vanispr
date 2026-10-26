import React, { useState } from 'react';
import { Grid, Shuffle, CheckCircle2, RotateCw } from 'lucide-react';
import { Experiment } from '../../types';
import { api } from '../../api/client';

interface LatinSquareVisualizerProps {
  experiment: Experiment;
  onRefresh: () => void;
}

export const LatinSquareVisualizer: React.FC<LatinSquareVisualizerProps> = ({ experiment, onRefresh }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMsg(null);
    try {
      const res = await api.generateLists(experiment.id);
      setMsg(res.message);
      onRefresh();
    } catch (err) {
      alert('Failed to generate lists: ' + err);
    } finally {
      setIsGenerating(false);
    }
  };

  const expItems = (experiment.items || []).filter((i) => i.type === 'experimental');
  const conditions = Array.from(
    new Set(expItems.flatMap((i) => i.versions.map((v) => v.condition_label)))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Grid size={22} color="var(--accent-indigo)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Latin-Square Counterbalancing Matrix
              </h3>
              <span className="badge badge-indigo">
                {conditions.length || 4} Lists Balanced
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 750 }}>
              Following Gibson & Warren (2004) Section 2.4: Every experimental item appears in exactly one condition per list,
              each list contains an equal proportion of conditions, and each participant is dynamically assigned to the least completed list.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn btn-primary btn-sm"
          >
            <RotateCw size={14} className={isGenerating ? 'pulse' : ''} />
            {isGenerating ? 'Computing Lists...' : 'Re-generate Latin Square Lists'}
          </button>
        </div>

        {msg && (
          <div style={{
            marginTop: 16,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            fontSize: '0.85rem',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={16} /> {msg}
          </div>
        )}
      </div>

      {/* Matrix Table */}
      <div className="glass-panel" style={{ padding: 24, overflowX: 'auto' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
          Orthogonal Item × Condition Rotation Grid
        </h4>

        {expItems.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            No experimental items found. Add items to see the Latin Square distribution matrix.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px', width: 90 }}>Item</th>
                <th style={{ padding: '10px 12px' }}>List 1</th>
                <th style={{ padding: '10px 12px' }}>List 2</th>
                <th style={{ padding: '10px 12px' }}>List 3</th>
                <th style={{ padding: '10px 12px' }}>List 4</th>
              </tr>
            </thead>
            <tbody>
              {expItems.map((item, itemIdx) => {
                const numConds = conditions.length || 4;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--accent-indigo)' }} className="mono">
                      Item #{item.item_number}
                    </td>

                    {[0, 1, 2, 3].map((listIdx) => {
                      const condIdx = (itemIdx + listIdx) % numConds;
                      const cond = conditions[condIdx] || `C${condIdx + 1}`;
                      const isCriticalVP = cond.includes('VP') || cond.includes('nested');

                      return (
                        <td key={listIdx} style={{ padding: '12px 12px' }}>
                          <span className={`badge ${isCriticalVP ? 'badge-indigo' : 'badge-emerald'}`} style={{ textTransform: 'none' }}>
                            {cond}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pseudo-Randomization Constraints Card */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Shuffle size={18} color="var(--accent-violet)" />
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Automated Psycholinguistic Interleaving Rules
          </h4>
        </div>

        <ul style={{
          listStyleType: 'disc',
          paddingLeft: 20,
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          lineHeight: 1.8
        }}>
          <li>
            <strong>Practice Trial Prepend:</strong> Practice trials are presented before any experimental sentences with real-time feedback.
          </li>
          <li>
            <strong>No Consecutive Identical Conditions:</strong> The engine guarantees that a participant never encounters two sentences of the exact same experimental condition back-to-back.
          </li>
          <li>
            <strong>Filler Interleaving:</strong> Fillers are distributed systematically across the session to prevent participants from developing predictive heuristics.
          </li>
          <li>
            <strong>Dynamic Quota Balancing:</strong> On session start, participants are assigned to whichever list has the lowest completed count to maintain identical sample sizes per list.
          </li>
        </ul>
      </div>
    </div>
  );
};
