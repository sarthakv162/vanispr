import React, { useState } from 'react';
import { Plus, Trash2, Eye, Split, Check, Layers, AlertCircle } from 'lucide-react';
import { Item, ItemVersion, Experiment } from '../../types';
import { api } from '../../api/client';
import { LivePreviewModal } from './LivePreviewModal';
import { normalizeNfc, getGraphemeCount } from '../../engine/hindiSegmenter';

interface StimulusItemEditorProps {
  experiment: Experiment;
  onRefresh: () => void;
}

export const StimulusItemEditor: React.FC<StimulusItemEditorProps> = ({ experiment, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'experimental' | 'filler' | 'practice'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<{
    version: ItemVersion;
    question?: string;
    correctAnswer?: string;
  } | null>(null);

  // New item form state
  const [newItemNumber, setNewItemNumber] = useState(1);
  const [newItemType, setNewItemType] = useState<'experimental' | 'filler' | 'practice'>('experimental');
  const [newQuestion, setNewQuestion] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<'yes' | 'no'>('yes');
  const [newExplanation, setNewExplanation] = useState('');

  // Version 1 sentence text & condition label
  const [condLabel, setCondLabel] = useState('+extract_VP');
  const [sentenceText, setSentenceText] = useState('');
  const [words, setWords] = useState<string[]>([]);
  // Array of group boundaries: which words belong to which region
  const [regionGroups, setRegionGroups] = useState<string[][]>([]);

  const handleSentenceChange = (text: string) => {
    const normalized = normalizeNfc(text);
    setSentenceText(normalized);
    const splitWords = normalized.trim().split(/\s+/).filter(Boolean);
    setWords(splitWords);
    // By default, 1 word per region
    setRegionGroups(splitWords.map((w) => [w]));
  };

  const mergeWithPrevious = (idx: number) => {
    if (idx <= 0) return;
    const newGroups = [...regionGroups];
    const prev = newGroups[idx - 1];
    const curr = newGroups[idx];
    newGroups[idx - 1] = [...prev, ...curr];
    newGroups.splice(idx, 1);
    setRegionGroups(newGroups);
  };

  const splitRegion = (groupIdx: number) => {
    const group = regionGroups[groupIdx];
    if (group.length <= 1) return;
    const newGroups = [...regionGroups];
    newGroups.splice(groupIdx, 1, ...group.map((w) => [w]));
    setRegionGroups(newGroups);
  };

  const handleSaveItem = async () => {
    if (!sentenceText.trim()) return;

    const formattedRegions = regionGroups.map((group, rIdx) => ({
      index: rIdx + 1,
      text: group.join(' '),
      words: group
    }));

    const itemPayload = {
      item_number: newItemNumber,
      type: newItemType,
      question: newQuestion.trim() || undefined,
      correct_answer: newCorrectAnswer,
      explanation: newExplanation.trim() || undefined,
      versions: [
        {
          condition_label: condLabel,
          sentence_text: sentenceText.trim(),
          regions: formattedRegions
        }
      ]
    };

    try {
      await api.addItem(experiment.id, itemPayload);
      setShowAddModal(false);
      setSentenceText('');
      setWords([]);
      setRegionGroups([]);
      setNewQuestion('');
      onRefresh();
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Error saving item: ' + err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.deleteItem(experiment.id, itemId);
      onRefresh();
    } catch (err) {
      alert('Failed to delete item: ' + err);
    }
  };

  const items = experiment.items || [];
  const filteredItems = items.filter((it) => {
    if (activeTab === 'all') return true;
    return it.type === activeTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface-elevated)',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {(['all', 'experimental', 'filler', 'practice'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="btn btn-sm"
              style={{
                textTransform: 'capitalize',
                background: activeTab === tab ? 'var(--accent-indigo)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {tab} ({tab === 'all' ? items.length : items.filter((i) => i.type === tab).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setNewItemNumber(items.length + 1);
            setShowAddModal(true);
          }}
          className="btn btn-primary btn-sm"
        >
          <Plus size={16} /> Add Stimulus Item
        </button>
      </div>

      {/* Stimulus Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredItems.length === 0 ? (
          <div className="glass-panel" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            No items in this category yet. Click "Add Stimulus Item" to define your sentence materials.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="glass-panel" style={{ padding: 20 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-indigo)' }}>
                    Item #{item.item_number}
                  </span>
                  <span className={`badge ${
                    item.type === 'experimental' ? 'badge-indigo' : item.type === 'filler' ? 'badge-amber' : 'badge-emerald'
                  }`}>
                    {item.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {item.versions.length} condition version(s)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleDeleteItem(item.id!)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--accent-rose)', padding: '5px 8px' }}
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Versions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {item.versions.map((ver) => (
                  <div key={ver.id || ver.condition_label} style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <span className="badge badge-indigo" style={{ textTransform: 'none' }}>
                        {ver.condition_label}
                      </span>

                      <button
                        onClick={() => setPreviewVersion({
                          version: ver,
                          question: item.question,
                          correctAnswer: item.correct_answer
                        })}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        <Eye size={12} /> Test Live Masking
                      </button>
                    </div>

                    {/* Sentence with region pills */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      fontSize: '1.05rem',
                      lineHeight: 1.8,
                      marginBottom: 8
                    }} className={experiment.language === 'hi' ? 'devanagari' : ''}>
                      {ver.regions.map((reg, rIdx) => (
                        <span
                          key={rIdx}
                          style={{
                            background: rIdx === 4 ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-surface-elevated)',
                            border: rIdx === 4 ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            color: rIdx === 4 ? 'var(--accent-indigo)' : 'var(--text-primary)',
                            fontWeight: rIdx === 4 ? 600 : 400
                          }}
                          title={`Region ${reg.index}${rIdx === 4 ? ' (Critical Region)' : ''}`}
                        >
                          {reg.text}
                        </span>
                      ))}
                    </div>

                    {/* Comprehension Question Preview */}
                    {item.question && (
                      <div style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 6
                      }}>
                        <span>
                          <strong>Question:</strong> {item.question}
                        </span>
                        <span className="badge badge-emerald">
                          Answer: {item.correct_answer?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
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
            maxWidth: 800,
            background: 'var(--modal-bg)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>
              Add New Psycholinguistic Stimulus Item
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Item Number
                </label>
                <input
                  type="number"
                  className="input"
                  value={newItemNumber}
                  onChange={(e) => setNewItemNumber(parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Item Type
                </label>
                <select
                  className="select"
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as any)}
                >
                  <option value="experimental">Experimental (2x2 Factorial Item)</option>
                  <option value="filler">Filler Item</option>
                  <option value="practice">Practice Trial</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Condition Label (e.g. +extract_VP, -extract_NP, or correlative_nested)
              </label>
              <input
                type="text"
                className="input"
                value={condLabel}
                onChange={(e) => setCondLabel(e.target.value)}
                placeholder="+extract_VP"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Sentence Text ({experiment.language === 'hi' ? 'देवनागरी हिन्दी' : 'English'})
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                  Unicode NFC Auto-Normalized
                </span>
              </div>
              <textarea
                className={`textarea ${experiment.language === 'hi' ? 'devanagari' : ''}`}
                rows={3}
                value={sentenceText}
                onChange={(e) => handleSentenceChange(e.target.value)}
                placeholder={
                  experiment.language === 'hi'
                    ? 'यहाँ वाक्य दर्ज करें (उदा. जिस पत्रकार ने मंत्री जी के बयान को सुना था उसने आज नया लेख लिखा।)'
                    : 'Enter sentence text here...'
                }
                style={{ fontSize: '1.05rem' }}
              />
            </div>

            {/* Visual Region Editor */}
            {regionGroups.length > 0 && (
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: 16,
                borderRadius: 'var(--radius-md)',
                marginBottom: 20
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Split size={14} /> Visual Region Editor ({regionGroups.length} regions)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Click "Merge ←" to group words into multi-word regions (e.g. Hindi postpositions).
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {regionGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)' }}>
                        R{gIdx + 1}
                      </span>
                      <span className={experiment.language === 'hi' ? 'devanagari' : ''} style={{ fontWeight: 500 }}>
                        {group.join(' ')}
                      </span>

                      {gIdx > 0 && (
                        <button
                          onClick={() => mergeWithPrevious(gIdx)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 5px', fontSize: '0.65rem' }}
                          title="Merge with previous region"
                        >
                          Merge ←
                        </button>
                      )}

                      {group.length > 1 && (
                        <button
                          onClick={() => splitRegion(gIdx)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 5px', fontSize: '0.65rem' }}
                          title="Split into individual words"
                        >
                          Split
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comprehension Question Settings */}
            <div style={{
              background: 'var(--bg-surface)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              marginBottom: 24,
              border: '1px solid var(--border-subtle)'
            }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12 }}>
                Comprehension Question & Immediate Feedback
              </h4>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Question Text
                </label>
                <input
                  type="text"
                  className={`input ${experiment.language === 'hi' ? 'devanagari' : ''}`}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder={
                    experiment.language === 'hi'
                      ? 'क्या पत्रकार ने सुबह लेख लिखा था?'
                      : 'Did the consultant agree with the proposal?'
                  }
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Correct Answer
                  </label>
                  <select
                    className="select"
                    value={newCorrectAnswer}
                    onChange={(e) => setNewCorrectAnswer(e.target.value as any)}
                  >
                    <option value="yes">YES (हाँ) - Key [F]</option>
                    <option value="no">NO (नहीं) - Key [J]</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Practice Explanation Feedback
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="Feedback shown if answered incorrectly..."
                  />
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleSaveItem} className="btn btn-primary btn-sm">
                <Check size={16} /> Save Stimulus Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewVersion && (
        <LivePreviewModal
          version={previewVersion.version}
          question={previewVersion.question}
          correctAnswer={previewVersion.correctAnswer}
          language={experiment.language}
          onClose={() => setPreviewVersion(null)}
        />
      )}
    </div>
  );
};
