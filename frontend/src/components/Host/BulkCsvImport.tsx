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
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownloadSample = () => {
    let sampleContent = '';
    if (experiment.language === 'hi') {
      sampleContent = `list,id,type,condition,sentence,regions,question,answer
A,item01,item,ext_clause,"वह मैनेजर जिसे सलाहकार ने सोचा कि नए प्रस्ताव ने खुश किया था, कल पाँच मज़दूर रखेगा।",वह मैनेजर जिसे | सलाहकार ने सोचा | कि | नए प्रस्ताव ने | खुश किया था | कल पाँच मज़दूर रखेगा,क्या सलाहकार कल पाँच मज़दूर रखेगा?,नहीं
A,item02,item,ext_NP,"वह जनरल जिसे सिपाही के कड़े संदेश के बारे में सहायक की मान्यता ने नाराज़ किया था, शांत दिखने की कोशिश कर रहा है।",वह जनरल जिसे | सिपाही के कड़े संदेश के बारे में | सहायक की मान्यता ने | नाराज़ किया था | शांत दिखने की कोशिश कर रहा है,क्या जनरल शांत दिखने की कोशिश कर रहा है?,हाँ
A,F01,filler,,बारिश शुरू होते ही बच्चे छत पर चढ़ गए।,,क्या बच्चे छत पर चढ़ गए?,हाँ
B,item01,item,ext_NP,"वह मैनेजर जिसे नए प्रस्ताव के बारे में सलाहकार की सोच ने खुश किया था, कल पाँच मज़दूर रखेगा।",वह मैनेजर जिसे | नए प्रस्ताव के बारे में | सलाहकार की सोच ने | खुश किया था | कल पाँच मज़दूर रखेगा,क्या सलाहकार कल पाँच मज़दूर रखेगा?,नहीं
`;
    } else {
      sampleContent = `list,id,type,condition,sentence,regions,question,answer
A,item01,item,+extract_VP,"The manager who the consultant claimed that the new proposal had pleased will hire five workers tomorrow.",The manager who | the consultant | claimed that | the new proposal | had pleased | will hire | five workers tomorrow,Did the proposal please the consultant?,yes
A,item02,item,+extract_NP,"The general who the assistant's belief about the soldier's message had upset was trying to stay calm.",The general who | the assistant's belief | about the soldier's message | had upset | was trying to stay calm,Was the general trying to stay calm?,yes
A,F01,filler,,"As soon as the rain started, the children went up to the roof.",,,Did the children go up to the roof?,yes
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
      const res = await api.uploadCsv(experiment.id, file, replaceExisting);
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
              Directly ingest your research spreadsheet. Supports multi-list Latin Square rotation (columns: <code>list, id, type, condition, sentence, regions, question, answer</code>),
              explicit pipe (<code>|</code>) region boundaries, Hindi answers (<code>हाँ</code> / <code>नहीं</code>), and automatic Devanagari Unicode NFC normalization.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {experiment.language === 'hi' && (
              <a
                href="/hindi_spr_stimuli_full.csv"
                download="hindi_spr_stimuli_full_240.csv"
                className="btn btn-secondary btn-sm"
              >
                <Download size={14} /> Full 240-Row Study CSV
              </a>
            )}
            <button onClick={handleDownloadSample} className="btn btn-secondary btn-sm">
              <Download size={14} /> Download Sample Template
            </button>
          </div>
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

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginTop: 18,
          marginBottom: 10
        }}>
          <input
            type="checkbox"
            id="replace-existing-check"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
          />
          <label htmlFor="replace-existing-check" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Replace existing items in this study with imported CSV (Recommended for complete studies)
          </label>
        </div>

        {file && (
          <div style={{ marginTop: 16 }}>
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
