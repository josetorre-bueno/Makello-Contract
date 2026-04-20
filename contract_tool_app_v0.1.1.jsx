// contract_tool_app_v0.1.1.jsx
// Wipomo Contract Tool — Center for Community Energy
// v0.1.1 — 2026-04-19
//
// Layout: left column = per-job fields (CSV load at top)
//         right column = stable contractor defaults (save/import at top)
//         calculated fields appear inline in left column after estimated_total
// Image insertion ({{site_photo}}) deferred to v0.2.

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Field manifest — single source of truth
// type: 'job'    → per-job, left column, populated from CSV or manual entry
//       'stable' → contractor defaults, right column, locked by default
//       'calc'   → calculated automatically, shown inline in left column
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'effective_date',                    label: 'Contract execution date (e.g. March 26 2026)',                           type: 'job' },
  { key: 'contractor_name',                   label: 'Contractor company name',                                                type: 'stable', dflt: '' },
  { key: 'contractor_address',                label: 'Contractor street address city state zip',                               type: 'stable', dflt: '' },
  { key: 'contractor_license_no',             label: 'California Contractor License number',                                   type: 'stable', dflt: '' },
  { key: 'customer_org_name',                 label: 'Customer organization or business name',                                 type: 'job' },
  { key: 'customer_address',                  label: 'Project site address city state zip',                                    type: 'job' },
  { key: 'customer_tax_status',               label: 'Customer tax status — C corp / S corp / 501(c)(3) / other',             type: 'job' },
  { key: 'customer_tax_status_other',         label: 'If tax status is "other" — specify type',                               type: 'job' },
  { key: 'initial_target_capacity',           label: 'System description (e.g. 24kW DC to 28kW DC solar tracker)',            type: 'job' },
  { key: 'material_escalation_threshold_pct', label: 'Material cost escalation threshold % (e.g. 5%)',                        type: 'stable', dflt: '5%' },
  { key: 'labor_escalation_threshold_pct',    label: 'Labor cost escalation threshold % (ENR Skilled Labor Index)',            type: 'stable', dflt: '5%' },
  { key: 'phase1_completion_days',            label: 'Days to complete Phase 1 after Effective Date (e.g. 75)',                type: 'stable', dflt: '75' },
  { key: 'phase1_fee_pct',                    label: 'Phase 1 fee as % of Total Project Cost (e.g. 8%)',                      type: 'stable', dflt: '8%' },
  { key: 'estimated_total',                   label: 'Estimated Total Project Cost',                                           type: 'job' },
  { key: 'phase1_fee',                        label: 'Phase 1 fee — total dollar amount',                                      type: 'calc', formula: 'estimated_total × phase1_fee_pct' },
  { key: 'phase1_fee_50pct_upfront',          label: '50% of Phase 1 fee due at signing',                                     type: 'calc', formula: 'phase1_fee × 50%' },
  { key: 'phase1_fee_50pct_delivery',         label: '50% of Phase 1 fee due at delivery of Phase 1 deliverables',            type: 'calc', formula: 'phase1_fee × 50%' },
  { key: 'phase2_start_days',                 label: 'Days to commence Phase 2 after Notice to Proceed (e.g. 30)',             type: 'stable', dflt: '30' },
  { key: 'payment_ntp_pct',                   label: 'Payment % due upon NTP and building permits (e.g. 25%)',                 type: 'stable', dflt: '25%' },
  { key: 'payment_equipment_pct',             label: 'Payment % due upon delivery of equipment to site (e.g. 35%)',            type: 'stable', dflt: '35%' },
  { key: 'payment_installation_pct',          label: 'Payment % due upon completion of installation (e.g. 25%)',               type: 'stable', dflt: '25%' },
  { key: 'payment_closeout_pct',              label: 'Payment % due upon PTO and closeout docs (e.g. 15%)',                   type: 'stable', dflt: '15%' },
  { key: 'prevailing_wage',                   label: 'Prevailing wage — enter exactly: is  OR  is not',                        type: 'job' },
  { key: 'workmanship_warranty_years',        label: 'Workmanship warranty period in years (e.g. 1)',                          type: 'stable', dflt: '1' },
  { key: 'design_warranty_years',             label: 'Phase 1 design and engineering warranty in years (e.g. 1)',              type: 'stable', dflt: '1' },
  { key: 'contractor_signatory_name',         label: 'Full name of person signing on behalf of contractor',                    type: 'stable', dflt: '' },
  { key: 'contractor_signatory_title',        label: 'Title of contractor signatory (e.g. President)',                         type: 'stable', dflt: '' },
  { key: 'contract_date',                     label: 'Date contract is signed (same as or later than effective date)',          type: 'job' },
  { key: 'customer_name',                     label: 'Full name of customer individual signing the contract',                  type: 'job' },
  { key: 'customer_title',                    label: 'Title of customer signatory — leave blank if sole proprietor',           type: 'job' },
  { key: 'site_photo',                        label: 'Site photo (image insertion coming in v0.2)',                            type: 'job' },
];

// Ordered lists for each column
const LEFT_KEYS  = FIELDS.filter(f => f.type === 'job' || f.type === 'calc').map(f => f.key);
const RIGHT_KEYS = FIELDS.filter(f => f.type === 'stable').map(f => f.key);
const JOB_KEYS   = FIELDS.filter(f => f.type === 'job').map(f => f.key);

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
  return n > 1 ? n / 100 : n;
}

function parseMoney(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/[$,\s]/g, '')) || 0;
}

function fmtMoney(n) {
  if (!n || isNaN(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcFields(vals) {
  const total = parseMoney(vals.estimated_total);
  const pct   = parsePct(vals.phase1_fee_pct);
  const fee   = total * pct;
  return {
    phase1_fee:               fmtMoney(fee),
    phase1_fee_50pct_upfront:  fmtMoney(fee * 0.5),
    phase1_fee_50pct_delivery: fmtMoney(fee * 0.5),
  };
}

// Parse three-column (description, {{placeholder}}, value) or two-column (key, value) CSV
function parseCsv(text) {
  const rows = Papa.parse(text.trim(), { skipEmptyLines: true }).data;
  const out  = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const c0 = String(row[0]).trim();
    const c1 = String(row[1]).trim();
    if (c0.toLowerCase() === 'description' || c0.toLowerCase() === 'field') continue;
    let key, value;
    if (row.length >= 3 && c1.includes('{{')) {
      key   = c1.replace(/\{\{|\}\}/g, '').trim();
      value = String(row[2]).trim();
    } else {
      key   = c0;
      value = c1;
    }
    if (key) out[key] = value;
  }
  return out;
}

function loadStableFromStorage() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { ...HARDCODED_DEFAULTS, ...JSON.parse(s) };
  } catch (_) {}
  return null;
}

function saveStableToStorage(vals) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(vals)); } catch (_) {}
}

function downloadBlankCsv() {
  const lines = [
    'description,placeholder,value',
    ...FIELDS
      .filter(f => f.type === 'job')
      .map(f => {
        const desc = f.label.includes(',') ? `"${f.label}"` : f.label;
        return `${desc},{{${f.key}}},`;
      }),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  saveAs(blob, 'contract_input_blank.csv');
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  job:    { bg: '#ffffff', bdr: '#e2e8f0', label: '#4a5568' },
  stable: { bg: '#ebf8ff', bdr: '#bee3f8', label: '#2c5282' },
  calc:   { bg: '#fffff0', bdr: '#faf089', label: '#975a16' },
};

// ─────────────────────────────────────────────────────────────────────────────
// FieldRow — one labelled input
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({ field, value, locked, onChange }) {
  const col = C[field.type];
  return (
    <div style={{
      background: col.bg,
      border: `1px solid ${col.bdr}`,
      borderRadius: 6,
      padding: '6px 10px',
    }}>
      <div style={{ fontSize: 11, color: col.label, marginBottom: 3, lineHeight: 1.3 }}>
        {field.label}
        {field.type === 'calc' && (
          <span style={{ marginLeft: 6, fontSize: 10, color: '#b7791f' }}>= {field.formula}</span>
        )}
        {field.type === 'stable' && locked && (
          <span style={{ marginLeft: 5, fontSize: 10 }}>🔒</span>
        )}
      </div>
      <input
        type="text"
        value={value}
        readOnly={locked}
        onChange={e => onChange && onChange(e.target.value)}
        style={{
          width: '100%',
          border: 'none',
          borderBottom: locked ? 'none' : `1px solid ${col.bdr}`,
          background: 'transparent',
          padding: '2px 0',
          fontSize: 13,
          color: '#1a202c',
          outline: 'none',
          cursor: locked ? 'default' : 'text',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column header bar
// ─────────────────────────────────────────────────────────────────────────────

function ColHeader({ title, accent, children }) {
  return (
    <div style={{
      background: accent,
      borderRadius: 7,
      padding: '10px 14px',
      marginBottom: 10,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small button
// ─────────────────────────────────────────────────────────────────────────────

function Btn({ onClick, children, title, variant = 'default', style: extra }) {
  const base = {
    padding: '5px 12px', fontSize: 12, borderRadius: 4,
    cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
  };
  const vars = {
    default: { background: '#edf2f7', borderColor: '#cbd5e0', color: '#2d3748' },
    primary: { background: '#2b6cb0', borderColor: '#2c5282', color: 'white' },
    warn:    { background: '#744210', borderColor: '#b7791f', color: 'white' },
    blue:    { background: '#2c5282', borderColor: '#2a4a7f', color: 'white' },
  };
  return (
    <button onClick={onClick} title={title} style={{ ...base, ...vars[variant], ...extra }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [stable,         setStable]         = useState(HARDCODED_DEFAULTS);
  const [job,            setJob]            = useState(() => Object.fromEntries(JOB_KEYS.map(k => [k, ''])));
  const [stableUnlocked, setStableUnlocked] = useState(false);
  const [csvFile,        setCsvFile]        = useState(null);
  const [csvRows,        setCsvRows]        = useState([]);
  const [dragOver,       setDragOver]       = useState(false);
  const [status,         setStatus]         = useState('');
  const [generating,     setGenerating]     = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  const csvInputRef     = useRef(null);
  const importDefRef    = useRef(null);

  // ── On mount: localStorage → contract_defaults.json → hardcoded ────────────
  useEffect(() => {
    const fromStorage = loadStableFromStorage();
    if (fromStorage) { setStable(fromStorage); setDefaultsLoaded(true); return; }
    fetch('./contract_defaults.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStable(prev => ({ ...HARDCODED_DEFAULTS, ...data })); setDefaultsLoaded(true); })
      .catch(() => setDefaultsLoaded(true));
  }, []);

  useEffect(() => { if (defaultsLoaded) saveStableToStorage(stable); }, [stable, defaultsLoaded]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const calc      = calcFields({ ...stable, ...job });
  const allValues = { ...stable, ...job, ...calc };

  // ── CSV ────────────────────────────────────────────────────────────────────
  function applyCsvData(text, fname) {
    const parsed = parseCsv(text);
    const newJob = { ...job };
    let matched = 0;
    for (const key of JOB_KEYS) {
      if (parsed[key] !== undefined && parsed[key] !== '') { newJob[key] = parsed[key]; matched++; }
    }
    setJob(newJob);
    setCsvFile(fname);
    setCsvRows(
      Object.entries(parsed)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => ({ k, v, type: FIELDS.find(f => f.key === k)?.type ?? 'unknown' }))
    );
    setStatus(matched > 0
      ? `✓ ${fname} — ${matched} field${matched !== 1 ? 's' : ''} populated`
      : `⚠ ${fname} — no matching fields found`);
  }

  function onCsvFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => applyCsvData(ev.target.result, f.name);
    r.readAsText(f); e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => applyCsvData(ev.target.result, f.name);
    r.readAsText(f);
  }

  // ── Stable defaults ────────────────────────────────────────────────────────
  function saveDefaultsToFile() {
    saveAs(new Blob([JSON.stringify(stable, null, 2)], { type: 'application/json' }), 'contract_defaults.json');
    setStatus('contract_defaults.json downloaded — commit & push to share across computers');
  }

  function onImportDefaults(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try { setStable(prev => ({ ...prev, ...JSON.parse(ev.target.result) })); setStatus('✓ Defaults imported'); }
      catch (_) { setStatus('✗ Could not parse defaults file — must be valid JSON'); }
    };
    r.readAsText(f); e.target.value = '';
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  async function generateContract() {
    setGenerating(true); setStatus('Loading template…');
    try {
      const resp = await fetch('./Wipomo_Contract_Template.docx');
      if (!resp.ok) throw new Error(`Template not found (HTTP ${resp.status})`);
      const zip = new PizZip(await resp.arrayBuffer());
      const doc = new window.Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render({ ...allValues, site_photo: '' });
      const out  = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const slug = (allValues.customer_name || 'Contract').replace(/[^a-zA-Z0-9]+/g, '_');
      const ds   = (allValues.contract_date || allValues.effective_date || '').replace(/[^a-zA-Z0-9]+/g, '-');
      saveAs(out, `Wipomo_Contract_${slug}${ds ? '_' + ds : ''}.docx`);
      setStatus('✓ Contract generated and downloaded');
    } catch (err) {
      setStatus(`✗ ${err.message}`); console.error(err);
    } finally { setGenerating(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const statusColor = status.startsWith('✓') ? '#276749' : (status.startsWith('✗') || status.startsWith('⚠')) ? '#c53030' : '#4a5568';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── App header ───────────────────────────────────────────────────── */}
      <div style={{ background: '#1a365d', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Wipomo Contract Tool</span>
        <span style={{ fontSize: 11, opacity: 0.55 }}>Center for Community Energy · v0.1.1</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12, color: status.startsWith('✓') ? '#9ae6b4' : '#feb2b2' }}>{status}</span>}
          <button
            onClick={generateContract}
            disabled={generating}
            style={{
              padding: '6px 22px', fontSize: 13, fontWeight: 600,
              background: generating ? '#4a5568' : '#2b6cb0',
              color: 'white', border: 'none', borderRadius: 5,
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? 'Generating…' : '⬇ Generate Contract'}
          </button>
        </div>
      </div>

      {/* ── Two-column body ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, padding: 14, maxWidth: 1400, margin: '0 auto', alignItems: 'flex-start' }}>

        {/* ═══ LEFT COLUMN — per-job fields ═══════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Left header: CSV controls */}
          <ColHeader title="Per-Job Fields" accent="#e6fffa">

            {/* Drop zone (compact inline version) */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => csvInputRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? '#319795' : '#81e6d9'}`,
                borderRadius: 5, padding: '6px 14px',
                background: dragOver ? '#b2f5ea' : '#f0fff4',
                cursor: 'pointer', fontSize: 12, color: '#234e52',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              {csvFile
                ? <span>📎 {csvFile} — <u>change</u></span>
                : <span>📄 Drop CSV here or <u>click to browse</u></span>}
            </div>
            <input type="file" accept=".csv" ref={csvInputRef} style={{ display: 'none' }} onChange={onCsvFile} />

            <Btn onClick={downloadBlankCsv} title="Download a blank input CSV template">⬇ Blank CSV</Btn>

            {/* Compact parsed preview toggle */}
            {csvRows.length > 0 && (
              <span style={{ fontSize: 11, color: '#718096' }}>
                {csvRows.length} fields parsed
              </span>
            )}
          </ColHeader>

          {/* Parsed CSV preview (collapsible if desired, shown inline for now) */}
          {csvRows.length > 0 && (
            <div style={{
              background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
              marginBottom: 10, overflow: 'hidden',
            }}>
              <div style={{ padding: '4px 10px', background: '#f7fafc', fontSize: 11, fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0' }}>
                CSV preview — {csvRows.length} non-empty fields
              </div>
              <div style={{ maxHeight: 140, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
                {csvRows.map(({ k, v, type }) => (
                  <div key={k} style={{
                    display: 'flex', gap: 8, padding: '2px 10px', borderBottom: '1px solid #f0f0f0',
                    background: type === 'stable' ? C.stable.bg : type === 'job' ? '#fff' : C.calc.bg,
                  }}>
                    <span style={{ color: '#718096', width: 200, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
                    <span style={{ color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-job + calculated fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {LEFT_KEYS.map(key => {
              const field = FIELDS.find(f => f.key === key);
              const value = field.type === 'calc' ? (calc[key] ?? '') : (job[key] ?? '');
              return (
                <FieldRow
                  key={key}
                  field={field}
                  value={value}
                  locked={field.type === 'calc'}
                  onChange={val => setJob(prev => ({ ...prev, [key]: val }))}
                />
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN — stable contractor defaults ═══════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Right header: defaults controls */}
          <ColHeader title="Contractor Defaults" accent="#ebf8ff">

            <label style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer',
              padding: '5px 10px', borderRadius: 4,
              background: stableUnlocked ? '#744210' : '#2c5282',
              border: `1px solid ${stableUnlocked ? '#b7791f' : '#2a4a7f'}`,
              color: 'white', whiteSpace: 'nowrap',
            }}>
              <input
                type="checkbox"
                checked={stableUnlocked}
                onChange={e => setStableUnlocked(e.target.checked)}
                style={{ margin: 0 }}
              />
              {stableUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
            </label>

            <Btn
              onClick={saveDefaultsToFile}
              variant="blue"
              title="Download contract_defaults.json — commit & push to share across computers"
            >
              Save Defaults ↓
            </Btn>

            <Btn onClick={() => importDefRef.current.click()} title="Load defaults from a previously saved contract_defaults.json">
              Import Defaults
            </Btn>
            <input type="file" accept=".json" ref={importDefRef} style={{ display: 'none' }} onChange={onImportDefaults} />

            <span style={{ fontSize: 10, color: '#718096', lineHeight: 1.3 }}>
              Saved in this browser automatically.<br/>
              Export/import to sync across computers.
            </span>
          </ColHeader>

          {/* Stable fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {RIGHT_KEYS.map(key => {
              const field = FIELDS.find(f => f.key === key);
              return (
                <FieldRow
                  key={key}
                  field={field}
                  value={stable[key] ?? ''}
                  locked={!stableUnlocked}
                  onChange={val => setStable(prev => ({ ...prev, [key]: val }))}
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mount
// ─────────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
