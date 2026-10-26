import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Experiment } from '../../types';
import { api } from '../../api/client';

interface BulkCsvImportProps {
  experiment: Experiment;
  onRefresh: () => void;
}

export const BulkCsvImport: React.FC<BulkCsvImportProps> = ({ experiment, onRefresh }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownloadSample = () => {
    let sampleContent = '';
    if (experiment.language === 'hi') {
      sampleContent = `item_number,type,condition_label,sentence,question,correct_answer,explanation
1,experimental,correlative_nested,जिस पत्रकार ने | मंत्री जी के उस बयान को | सुना था | उसने आज | नया लेख लिखा।,क्या पत्रकार ने लेख लिखा?,yes,पत्रकार ने सुबह लेख लिखा था।
1,experimental,correlative_canonical,उस पत्रकार ने | जिसने मंत्री जी के बयान को | सुना था | आज नया लेख प्रकाशित किया।,क्या पत्रकार ने भाषण दिया?,no,उसने भाषण नहीं लेख दिया।
901,filler,filler,गाँव के किसानों ने | इस वर्ष मंडी में | बहुत अच्छी कीमत पर | फसल बेची।,क्या किसानों ने फसल बेची?,yes,किसानों ने फसल मंडी में बेची।
801,practice,practice,रोहन ने | सुबह बाज़ार जाकर | ताज़े फल खरीदे।,क्या रोहन बाज़ार गया?,yes,रोहन बाज़ार फल खरीदने गया।
`;
    } else {
      sampleContent = `item_number,type,condition_label,sentence,question,correct_answer,explanation
1,experimental,+extract_VP,The manager who | the consultant | claimed that | the new proposal | had pleased | will hire | five workers tomorrow.,Did the proposal please the consultant?,yes,The text mentions it pleased them.
1,experimental,+extract_NP,The manager who | the consultant's claim about | the new proposal | had pleased | will hire | five workers tomorrow.,Did the consultant object?,no,They made a claim about the proposal.
901,filler,filler,The chef | prepared a lavish dinner | for eighty guests | at the grand hotel ballroom.,Did the chef prepare dinner?,yes,Dinner was prepared for guests.
801,practice,practice,Alice walked | across campus | to borrow three books | from the university library.,Did Alice borrow books?,yes,Alice borrowed three books.
`;
    }

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `spr_stimuli_template_${experiment.language}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResultMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.uploadCsv(experiment.id, file);
      setResultMsg(res.message);
      setFile(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FileSpreadsheet size={22} color="var(--accent-indigo)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Bulk CSV Stimulus Importer & Unicode NFC Validator
              </h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 750 }}>
              Import 20–100 items from spreadsheet software. Supports optional pipe (<code>|</code>) delimiters for multi-word regions
              (e.g., <code>The manager who | claimed that</code> or Hindi postpositions <code>राम ने | फल खरीदे</code>), auto-normalizes
              Devanagari Unicode to NFC, and generates balanced word boundaries.
            </p>
          </div>

          <button onClick={handleDownloadSample} className="btn btn-secondary btn-sm">
            <Download size={14} /> Download Sample CSV
          </button>
        </div>
      </div>

      {/* Upload Box */}
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <input
          type="file"
          id="csv-file-input"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
              setResultMsg(null);
              setErrorMsg(null);
            }
          }}
        />

        <label
          htmlFor="csv-file-input"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '24px',
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)'
          }}
        >
          <UploadCloud size={44} color="var(--accent-indigo)" style={{ marginBottom: 12 }} />
          <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {file ? file.name : 'Click to select or drop CSV file'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Supports UTF-8 encoded files with Hindi Devanagari or English text
          </span>
        </label>

        {file && (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-primary"
              style={{ minWidth: 200 }}
            >
              {uploading ? 'Processing & Validating NFC...' : 'Import Stimuli into Experiment'}
            </button>
          </div>
        )}

        {resultMsg && (
          <div style={{
            marginTop: 20,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '0.88rem',
            color: '#6ee7b7',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle size={18} /> {resultMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{
            marginTop: 20,
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '0.88rem',
            color: '#fda4af',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
