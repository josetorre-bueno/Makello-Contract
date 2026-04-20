// contract_tool_app_v0.1.0.jsx
// Wipomo Contract Tool — Center for Community Energy
// v0.1.0 — 2026-04-19
//
// Fills Wipomo_Contract_Template.docx from a per-job input CSV.
// Stable (contractor) defaults persist via localStorage + contract_defaults.json.
// Image insertion ({{site_photo}}) deferred to v0.2.

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Field manifest — single source of truth
// type: 'job'    → from input CSV, editable per contract
//       'stable' → persistent contractor defaults, locked by default
//       'calc'   → computed automatically, read-only
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'effective_date',                    label: 'Contract execution date (e.g. March 26 2026)',                             type: 'job' },
  { key: 'contractor_name',                   label: 'Contractor company name',                                                  type: 'stable', dflt: '' },
  { key: 'contractor_address',                label: 'Contractor street address city state zip',                                 type: 'stable', dflt: '' },
  { key: 'contractor_license_no',             label: 'California Contractor License number',                                     type: 'stable', dflt: '' },
  { key: 'customer_org_name',                 label: 'Customer organization or business name',                                   type: 'job' },
  { key: 'customer_address',                  label: 'Project site address city state zip',                                      type: 'job' },
  { key: 'customer_tax_status',               label: 'Customer tax status — C corp / S corp / 501(c)(3) / other',               type: 'job' },
  { key: 'customer_tax_status_other',         label: 'If tax status is "other" — specify type',                                 type: 'job' },
  { key: 'initial_target_capacity',           label: 'System description (e.g. 24kW DC to 28kW DC solar tracker)',              type: 'job' },
  { key: 'material_escalation_threshold_pct', label: 'Material cost escalation threshold percentage (e.g. 5%)',                  type: 'stable', dflt: '5%' },
  { key: 'labor_escalation_threshold_pct',    label: 'Labor cost escalation threshold % (ENR Skilled Labor Index)',              type: 'stable', dflt: '5%' },
  { key: 'phase1_completion_days',            label: 'Days to complete Phase 1 after Effective Date (e.g. 75)',                  type: 'stable', dflt: '75' },
  { key: 'phase1_fee_pct',                    label: 'Phase 1 fee as % of estimated Total Project Cost (e.g. 8%)',               type: 'stable', dflt: '8%' },
  { key: 'estimated_total',                   label: 'Estimated Total Project Cost',                                             type: 'job' },
  { key: 'phase1_fee',                        label: 'Phase 1 fee — total dollar amount',                                        type: 'calc', formula: 'estimated_total × phase1_fee_pct' },
  { key: 'phase1_fee_50pct_upfront',          label: '50% of Phase 1 fee due at signing',                                       type: 'calc', formula: 'phase1_fee × 50%' },
  { key: 'phase1_fee_50pct_delivery',         label: '50% of Phase 1 fee due at delivery of Phase 1 deliverables',              type: 'calc', formula: 'phase1_fee × 50%' },
  { key: 'phase2_start_days',                 label: 'Days to commence Phase 2 after Notice to Proceed (e.g. 30)',               type: 'stable', dflt: '30' },
  { key: 'payment_ntp_pct',                   label: 'Payment % due upon NTP and receipt of building permits (e.g. 25%)',        type: 'stable', dflt: '25%' },
  { key: 'payment_equipment_pct',             label: 'Payment % due upon delivery of equipment to site (e.g. 35%)',              type: 'stable', dflt: '35%' },
  { key: 'payment_installation_pct',          label: 'Payment % due upon completion of installation (e.g. 25%)',                 type: 'stable', dflt: '25%' },
  { key: 'payment_closeout_pct',              label: 'Payment % due upon PTO and delivery of closeout docs (e.g. 15%)',          type: 'stable', dflt: '15%' },
  { key: 'prevailing_wage',                   label: 'Prevailing wage — enter exactly: is  OR  is not',                          type: 'job' },
  { key: 'workmanship_warranty_years',        label: 'Workmanship warranty period in years (e.g. 1)',                            type: 'stable', dflt: '1' },
  { key: 'design_warranty_years',             label: 'Phase 1 design and engineering warranty in years (e.g. 1)',                type: 'stable', dflt: '1' },
  { key: 'contractor_signatory_name',         label: 'Full name of person signing on behalf of contractor',                      type: 'stable', dflt: '' },
  { key: 'contractor_signatory_title',        label: 'Title of contractor signatory (e.g. President)',                           type: 'stable', dflt: '' },
  { key: 'contract_date',                     label: 'Date contract is signed (same as or later than effective date)',            type: 'job' },
  { key: 'customer_name',                     label: 'Full name of customer individual signing the contract',                    type: 'job' },
  { key: 'customer_title',                    label: 'Title of customer signatory — leave blank if sole proprietor',             type: 'job' },
  { key: 'site_photo',                        label: 'Site photo — upload (image insertion deferred to v0.2)',                   type: 'job' },
];

const STABLE_KEYS = FIELDS.filter(f => f.type === 'stable').map(f => f.key);
const JOB_KEYS    = FIELDS.filter(f => f.type === 'job').map(f => f.key);

const HARDCODED_DEFAULTS = Object.fromEntries(
  FIELDS.filter(f => f.type === 'stable').map(f => [f.key, f.dflt])
);

const LS_KEY = 'wipomo_contract_stable_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parsePct(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[%$,\s]/g, ''));
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;   // "8%" → 0.08;  "0.08" → 0.08
}

function parseMoney(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/[$,\s]/g, '')) || 0;
}

function fmtMoney(n) {
  if (isNaN(n) || n === 0) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Derive the three calculated fields from current values
function calcFields(vals) {
  const total  = parseMoney(vals.estimated_total);
  const pct    = parsePct(vals.phase1_fee_pct);
  const fee    = total * pct;
  return {
    phase1_fee:               fmtMoney(fee),
    phase1_fee_50pct_upfront:  fmtMoney(fee * 0.5),
    phase1_fee_50pct_delivery: fmtMoney(fee * 0.5),
  };
}

// Parse the three-column input CSV (description, placeholder, value)
// Also handles the legacy two-column Field,Value format from Makello
function parseCsv(text) {
  const result = Papa.parse(text.trim(), { skipEmptyLines: true });
  const rows   = result.data;
  const out    = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const c0 = String(row[0]).trim();
    const c1 = String(row[1]).trim();
    // Skip header rows
    if (c0.toLowerCase() === 'description' || c0.toLowerCase() === 'field') continue;

    let key, value;
    if (row.length >= 3 && c1.includes('{{')) {
      // three-column format: description | {{placeholder}} | value
      key   = c1.replace(/\{\{|\}\}/g, '').trim();
      value = String(row[2]).trim();
    } else {
      // two-column format: field_key | value
      key   = c0;
      value = c1;
    }
    if (key) out[key] = value;
  }
  return out;
}

// Load stable values: localStorage overrides fetched defaults
function loadStableFromStorage() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { ...HARDCODED_DEFAULTS, ...JSON.parse(s) };
  } catch (_) {}
  return null;   // null → caller will try contract_defaults.json
}

function saveStableToStorage(vals) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(vals)); } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Blank CSV download (job fields only)
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlankCsv() {
  const jobFields = FIELDS.filter(f => f.type === 'job');
  const lines = [
    'description,placeholder,value',
    ...jobFields.map(f => {
      const desc = f.label.includes(',') ? `"${f.label}"` : f.label;
      return `${desc},{{${f.key}}},`;
    }),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  saveAs(blob, 'contract_input_blank.csv');
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles (shared constants)
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  stableBg:   '#ebf8ff',
  stableBdr:  '#bee3f8',
  jobBg:      '#ffffff',
  jobBdr:     '#e2e8f0',
  calcBg:     '#fffff0',
  calcBdr:    '#faf089',
};

function fieldStyle(type) {
  if (type === 'stable') return { background: S.stableBg, border: `1px solid ${S.stableBdr}` };
  if (type === 'calc')   return { background: S.calcBg,   border: `1px solid ${S.calcBdr}` };
  return                        { background: S.jobBg,    border: `1px solid ${S.jobBdr}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // Stable values — start with hardcoded defaults; replaced async by localStorage / contract_defaults.json
  const [stable, setStable] = useState(HARDCODED_DEFAULTS);
  const [job,    setJob]    = useState(() => Object.fromEntries(JOB_KEYS.map(k => [k, ''])));

  const [stableUnlocked, setStableUnlocked] = useState(false);
  const [csvFile,    setCsvFile]   = useState(null);
  const [csvRows,    setCsvRows]   = useState([]);
  const [dragOver,   setDragOver]  = useState(false);
  const [status,     setStatus]    = useState('');
  const [generating, setGenerating] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  const fileInputRef        = useRef(null);
  const importDefaultsRef   = useRef(null);

  // ── On mount: try localStorage first, then contract_defaults.json ──────────
  useEffect(() => {
    const fromStorage = loadStableFromStorage();
    if (fromStorage) {
      setStable(fromStorage);
      setDefaultsLoaded(true);
      return;
    }
    // No localStorage — try fetching contract_defaults.json from server
    fetch('./contract_defaults.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setStable(prev => ({ ...HARDCODED_DEFAULTS, ...data }));
        setDefaultsLoaded(true);
      })
      .catch(() => setDefaultsLoaded(true));
  }, []);

  // ── Persist stable to localStorage whenever it changes (after initial load) ─
  useEffect(() => {
    if (defaultsLoaded) saveStableToStorage(stable);
  }, [stable, defaultsLoaded]);

  // ── Computed values ────────────────────────────────────────────────────────
  const allValues = { ...stable, ...job, ...calcFields({ ...stable, ...job }) };
  const calc      = calcFields({ ...stable, ...job });

  // ── CSV handling ───────────────────────────────────────────────────────────
  function applyCsvData(text, fname) {
    const parsed   = parseCsv(text);
    const newJob   = { ...job };
    let matched    = 0;

    for (const key of JOB_KEYS) {
      if (parsed[key] !== undefined && parsed[key] !== '') {
        newJob[key] = parsed[key];
        matched++;
      }
    }
    setJob(newJob);
    setCsvFile(fname);

    // Preview: all parsed rows, color-coded by field type
    const preview = Object.entries(parsed)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => ({
        key: k, value: v,
        ftype: STABLE_KEYS.includes(k) ? 'stable' : JOB_KEYS.includes(k) ? 'job' : 'unknown',
      }));
    setCsvRows(preview);
    setStatus(matched > 0
      ? `✓ ${fname} loaded — ${matched} field${matched !== 1 ? 's' : ''} populated`
      : `⚠ ${fname} loaded — no matching fields found`
    );
  }

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => applyCsvData(ev.target.result, f.name);
    reader.readAsText(f);
    e.target.value = '';   // allow re-loading same file
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => applyCsvData(ev.target.result, f.name);
    reader.readAsText(f);
  }

  // ── Stable defaults: save to file / import from file ──────────────────────
  function saveDefaultsToFile() {
    const blob = new Blob([JSON.stringify(stable, null, 2)], { type: 'application/json' });
    saveAs(blob, 'contract_defaults.json');
    setStatus('contract_defaults.json downloaded — commit & push to share across computers');
  }

  function onImportDefaults(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        setStable(prev => ({ ...prev, ...data }));
        setStatus('✓ Defaults imported from file');
      } catch (_) {
        setStatus('✗ Could not parse defaults file — must be valid JSON');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  // ── Field change handlers ──────────────────────────────────────────────────
  const setStableField = (key, val) => setStable(prev => ({ ...prev, [key]: val }));
  const setJobField    = (key, val) => setJob(prev    => ({ ...prev, [key]: val }));

  // ── Template generation ────────────────────────────────────────────────────
  async function generateContract() {
    setGenerating(true);
    setStatus('Loading template…');
    try {
      const resp = await fetch('./Wipomo_Contract_Template.docx');
      if (!resp.ok) throw new Error(`Template not found (HTTP ${resp.status}) — is Wipomo_Contract_Template.docx in the same directory?`);

      const buf = await resp.arrayBuffer();
      const zip = new PizZip(buf);
      const doc = new window.Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      // Build the substitution map (site_photo left blank for now)
      const data = { ...allValues, site_photo: '' };
      doc.render(data);

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const slug     = (allValues.customer_name    || 'Contract').replace(/[^a-zA-Z0-9]+/g, '_');
      const dateSlug = (allValues.contract_date    || allValues.effective_date || '').replace(/[^a-zA-Z0-9]+/g, '-');
      saveAs(out, `Wipomo_Contract_${slug}${dateSlug ? '_' + dateSlug : ''}.docx`);
      setStatus('✓ Contract generated and downloaded');
    } catch (err) {
      setStatus(`✗ ${err.message}`);
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const statusColor = status.startsWith('✓') ? '#276749' : status.startsWith('✗') || status.startsWith('⚠') ? '#c53030' : '#4a5568';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1a365d', color: 'white', padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>Wipomo Contract Tool</div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>Center for Community Energy · v0.1.0</div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Lock/unlock toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer',
            padding: '4px 10px', borderRadius: 4,
            background: stableUnlocked ? '#744210' : '#2c5282',
            border: `1px solid ${stableUnlocked ? '#b7791f' : '#4a7fb5'}`,
          }}>
            <input
              type="checkbox"
              checked={stableUnlocked}
              onChange={e => setStableUnlocked(e.target.checked)}
              style={{ margin: 0 }}
            />
            {stableUnlocked ? '🔓 Stable fields unlocked' : '🔒 Stable fields locked'}
          </label>

          {/* Save defaults to file */}
          <button
            onClick={saveDefaultsToFile}
            style={btnStyle('#2c5282', '#4a7fb5')}
            title="Download contract_defaults.json — commit & push to share across computers"
          >
            Save Defaults ↓
          </button>

          {/* Import defaults from file */}
          <button onClick={() => importDefaultsRef.current.click()} style={btnStyle('#2c5282', '#4a7fb5')}>
            Import Defaults
          </button>
          <input type="file" accept=".json" ref={importDefaultsRef} style={{ display: 'none' }} onChange={onImportDefaults} />
        </div>
      </div>

      {/* ── Body: two panels ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, padding: 14, maxWidth: 1440, margin: '0 auto', alignItems: 'flex-start' }}>

        {/* LEFT — CSV upload */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={panelStyle}>
            <div style={panelHeader}>Input CSV</div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#3182ce' : '#cbd5e0'}`,
                borderRadius: 6, padding: '20px 10px', textAlign: 'center',
                background: dragOver ? '#ebf8ff' : '#f7fafc',
                cursor: 'pointer', marginBottom: 10, transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 4 }}>📄</div>
              <div style={{ fontSize: 12, color: '#4a5568' }}>Drop CSV here or click to browse</div>
              {csvFile && (
                <div style={{ fontSize: 11, color: '#718096', marginTop: 5 }}>📎 {csvFile}</div>
              )}
            </div>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileChange} />

            {/* Download blank template button */}
            <button
              onClick={downloadBlankCsv}
              style={{ ...btnStyle('#e2e8f0', '#cbd5e0'), color: '#4a5568', width: '100%', marginBottom: 14 }}
            >
              ⬇ Download blank input CSV
            </button>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#718096', marginBottom: 8 }}>
              <span><Swatch bg={S.jobBg}    bdr={S.jobBdr}    /> Per-job</span>
              <span><Swatch bg={S.stableBg} bdr={S.stableBdr} /> Stable</span>
              <span><Swatch bg={S.calcBg}   bdr={S.calcBdr}   /> Calc</span>
            </div>

            {/* Parsed preview */}
            {csvRows.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#4a5568', marginBottom: 4 }}>
                  Parsed ({csvRows.length} non-empty fields)
                </div>
                <div style={{ maxHeight: 380, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                  {csvRows.map(({ key, value, ftype }) => (
                    <div key={key} style={{
                      display: 'flex', gap: 6, padding: '3px 6px',
                      borderBottom: '1px solid #eee',
                      background: ftype === 'stable' ? S.stableBg : ftype === 'job' ? S.jobBg : '#fafafa',
                    }}>
                      <span style={{ color: '#718096', width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</span>
                      <span style={{ color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — all contract fields */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={panelHeader}>Contract Fields</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#718096' }}>
                <span><Swatch bg={S.stableBg} bdr={S.stableBdr} /> Stable (contractor defaults)</span>
                <span><Swatch bg={S.jobBg}    bdr={S.jobBdr}    /> Per-job (from CSV or manual)</span>
                <span><Swatch bg={S.calcBg}   bdr={S.calcBdr}   /> Calculated (auto)</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
              {FIELDS.map(field => {
                const isStable = field.type === 'stable';
                const isCalc   = field.type === 'calc';
                const locked   = (isStable && !stableUnlocked) || isCalc;

                let value;
                if (isCalc)   value = calc[field.key]   ?? '';
                else if (isStable) value = stable[field.key] ?? '';
                else          value = job[field.key]    ?? '';

                return (
                  <div key={field.key} style={{ ...fieldStyle(field.type), borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ fontSize: 11, color: '#718096', marginBottom: 3, lineHeight: 1.3 }}>
                      {field.label}
                      {isCalc && (
                        <span style={{ color: '#b7791f', marginLeft: 5, fontSize: 10 }}>
                          = {field.formula}
                        </span>
                      )}
                      {isStable && !stableUnlocked && (
                        <span style={{ color: '#3182ce', marginLeft: 5, fontSize: 10 }}>🔒</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={value}
                      readOnly={locked}
                      onChange={e => isStable
                        ? setStableField(field.key, e.target.value)
                        : setJobField(field.key, e.target.value)
                      }
                      placeholder={locked ? '' : field.label.match(/e\.g\. (.+)/)?.[1] ?? ''}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: locked ? 'none' : '1px solid #cbd5e0',
                        background: 'transparent',
                        padding: '2px 0',
                        fontSize: 13,
                        color: locked ? '#2d3748' : '#1a202c',
                        outline: 'none',
                        cursor: locked ? 'default' : 'text',
                        fontStyle: value ? 'normal' : 'italic',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Generate button + status */}
            <div style={{ marginTop: 20, display: 'flex', gap: 14, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button
                onClick={generateContract}
                disabled={generating}
                style={{
                  padding: '10px 30px', fontSize: 15, fontWeight: 600,
                  background: generating ? '#a0aec0' : '#2b6cb0', color: 'white',
                  border: 'none', borderRadius: 6,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  boxShadow: generating ? 'none' : '0 2px 4px rgba(0,0,0,.15)',
                }}
              >
                {generating ? 'Generating…' : '⬇ Generate Contract'}
              </button>
              {status && (
                <div style={{ fontSize: 13, color: statusColor }}>{status}</div>
              )}
            </div>
          </div>

          {/* Persistence note */}
          <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 8, textAlign: 'right' }}>
            Stable field edits save automatically in this browser.
            Use <strong>Save Defaults ↓</strong> to download <code>contract_defaults.json</code>,
            then commit &amp; push to share across computers.
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function btnStyle(bg, border) {
  return {
    padding: '4px 10px', fontSize: 12,
    background: bg, color: bg.startsWith('#e') ? '#4a5568' : 'white',
    border: `1px solid ${border}`, borderRadius: 4,
    cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

const panelStyle = {
  background: 'white', borderRadius: 8,
  boxShadow: '0 1px 4px rgba(0,0,0,.10)', padding: 16,
};

const panelHeader = {
  fontWeight: 600, fontSize: 14, color: '#1a365d', marginBottom: 0,
};

function Swatch({ bg, bdr }) {
  return (
    <span style={{
      display: 'inline-block', width: 11, height: 11,
      background: bg, border: `1px solid ${bdr}`,
      borderRadius: 2, verticalAlign: 'middle', marginRight: 3,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mount
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
