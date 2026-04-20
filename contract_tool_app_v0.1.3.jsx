// contract_tool_app_v0.1.3.jsx
// Wipomo Contract Tool — Center for Community Energy
// v0.1.3 — 2026-04-19
//
// Changes from v0.1.2:
//  - Fields carry a `unit` property ('pct' | 'usd' | undefined)
//  - normalizeValue() adds % or $ automatically if a bare number is entered
//  - onBlur fires normalizeValue on all text inputs
//  - fmtUsd() prefixes $ on all calculated dollar fields
//  - Unit badge shown in field label (grey pill); calc fields show computed value with symbol
//  - Final normalize pass on allValues before docxtemplater merge

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Field manifest
// unit: 'pct'  → value must end with %    (e.g. "8%")
//       'usd'  → value must start with $  (e.g. "$9,746.75")
//       absent → plain text, no normalization
// ─────────────────────────────────────────────────────────────────────────────

const TAX_STATUS_OPTIONS = ['', 'C corporation', 'S corporation', '501(c)(3)', 'Other'];

const FIELDS = [
  { key: 'effective_date',                    label: 'Contract execution date (e.g. April 17 2026)',                          type: 'job' },
  { key: 'contractor_name',                   label: 'Contractor company name',                                               type: 'stable', dflt: '' },
  { key: 'contractor_address',                label: 'Contractor street address city state zip',                              type: 'stable', dflt: '' },
  { key: 'contractor_license_no',             label: 'California Contractor License number',                                  type: 'stable', dflt: '' },
  { key: 'customer_org_name',                 label: 'Customer organization or business name',                                type: 'job' },
  { key: 'customer_address',                  label: 'Project site address city state zip',                                   type: 'job' },
  { key: 'customer_tax_status',               label: 'Customer tax status',                                                   type: 'job',    widget: 'select' },
  { key: 'customer_tax_status_other',         label: 'If "Other" — specify type',                                            type: 'job' },
  { key: 'initial_target_capacity',           label: 'System description (e.g. 24kW DC to 28kW DC solar tracker)',           type: 'job' },
  { key: 'material_escalation_threshold_pct', label: 'Material cost escalation threshold',                                   type: 'stable', dflt: '5%',  unit: 'pct' },
  { key: 'labor_escalation_threshold_pct',    label: 'Labor cost escalation threshold (ENR Skilled Labor Index)',             type: 'stable', dflt: '5%',  unit: 'pct' },
  { key: 'phase1_completion_days',            label: 'Days to complete Phase 1 after Effective Date',                        type: 'stable', dflt: '75' },
  { key: 'phase1_fee_pct',                    label: 'Phase 1 fee as % of Total Project Cost',                               type: 'stable', dflt: '8%',  unit: 'pct' },
  { key: 'estimated_total',                   label: 'Estimated Total Project Cost',                                          type: 'job',                 unit: 'usd' },
  { key: 'phase1_fee',                        label: 'Phase 1 fee — total dollar amount',                                     type: 'calc',   formula: 'estimated_total × phase1_fee_pct', unit: 'usd' },
  { key: 'phase1_fee_50pct_upfront',          label: '50% of Phase 1 fee due at signing',                                    type: 'calc',   formula: 'phase1_fee × 50%',                 unit: 'usd' },
  { key: 'phase1_fee_50pct_delivery',         label: '50% of Phase 1 fee due at delivery of Phase 1 deliverables',           type: 'calc',   formula: 'phase1_fee × 50%',                 unit: 'usd' },
  { key: 'phase2_start_days',                 label: 'Days to commence Phase 2 after Notice to Proceed',                     type: 'stable', dflt: '30' },
  { key: 'payment_ntp_pct',                   label: 'Payment due upon NTP and building permits',                             type: 'stable', dflt: '25%', unit: 'pct' },
  { key: 'payment_equipment_pct',             label: 'Payment due upon delivery of equipment to site',                       type: 'stable', dflt: '35%', unit: 'pct' },
  { key: 'payment_installation_pct',          label: 'Payment due upon completion of installation',                          type: 'stable', dflt: '25%', unit: 'pct' },
  { key: 'payment_closeout_pct',              label: 'Payment due upon PTO and closeout docs',                               type: 'stable', dflt: '15%', unit: 'pct' },
  { key: 'prevailing_wage',                   label: 'Prevailing wage',                                                       type: 'job',    widget: 'toggle', options: ['is', 'is not'] },
  { key: 'workmanship_warranty_years',        label: 'Workmanship warranty period in years',                                  type: 'stable', dflt: '1' },
  { key: 'design_warranty_years',             label: 'Phase 1 design and engineering warranty in years',                     type: 'stable', dflt: '1' },
  { key: 'contractor_signatory_name',         label: 'Full name of person signing on behalf of contractor',                   type: 'stable', dflt: '' },
  { key: 'contractor_signatory_title',        label: 'Title of contractor signatory (e.g. President)',                        type: 'stable', dflt: '' },
  { key: 'contract_date',                     label: 'Date contract is signed (same as or later than effective date)',         type: 'job' },
  { key: 'customer_name',                     label: 'Full name of customer individual signing the contract',                 type: 'job' },
  { key: 'customer_title',                    label: 'Title of customer signatory — leave blank if sole proprietor',          type: 'job' },
  { key: 'site_photo',                        label: 'Site photo (image insertion coming in v0.2)',                           type: 'job' },
];

const LEFT_KEYS  = FIELDS.filter(f => f.type === 'job' || f.type === 'calc').map(f => f.key);
const RIGHT_KEYS = FIELDS.filter(f => f.type === 'stable').map(f => f.key);
const JOB_KEYS   = FIELDS.filter(f => f.type === 'job').map(f => f.key);

const HARDCODED_DEFAULTS = Object.fromEntries(
  FIELDS.filter(f => f.type === 'stable').map(f => [f.key, f.dflt])
);

const LS_KEY = 'wipomo_contract_stable_v1';

// ─────────────────────────────────────────────────────────────────────────────
// Unit normalisation
// ─────────────────────────────────────────────────────────────────────────────

// Return true if str looks like a number (possibly with commas, possibly with unit already)
function looksNumeric(str) {
  return /^[$]?[\d,]+(\.\d+)?[%]?$/.test(String(str).trim());
}

// Ensure a pct value ends with %  →  "8" → "8%",  "8%" → "8%",  "0.08" → "8%"
function normalizePct(val) {
  if (!val && val !== 0) return val;
  const s = String(val).trim();
  if (s === '') return s;
  if (s.endsWith('%')) return s;                       // already correct
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  if (isNaN(n)) return val;                            // non-numeric, leave untouched
  // treat values ≤ 1 as decimal fractions → convert to percentage
  return (n <= 1 ? +(n * 100).toFixed(4) : n) + '%';
}

// Ensure a usd value starts with $  →  "9746.75" → "$9,746.75",  "$9,746.75" → unchanged
function normalizeUsd(val) {
  if (!val && val !== 0) return val;
  const s = String(val).trim();
  if (s === '') return s;
  if (s.startsWith('$')) return s;                     // already correct
  const n = parseFloat(s.replace(/[,%\s]/g, ''));
  if (isNaN(n)) return val;                            // non-numeric, leave untouched
  // preserve original comma formatting if present; otherwise format with commas
  const hasCommas = s.includes(',');
  const numStr = hasCommas ? s.replace(/\s/g, '') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + numStr;
}

function normalizeValue(val, unit) {
  if (!unit) return val;
  if (unit === 'pct') return normalizePct(val);
  if (unit === 'usd') return normalizeUsd(val);
  return val;
}

// Normalize an entire values map (used before template merge)
function normalizeAllValues(vals) {
  const out = { ...vals };
  for (const f of FIELDS) {
    if (f.unit && out[f.key] !== undefined) {
      out[f.key] = normalizeValue(out[f.key], f.unit);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Other helpers
// ─────────────────────────────────────────────────────────────────────────────

function parsePct(str) {
  const n = parseFloat(String(str || '').replace(/[%$,\s]/g, ''));
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}
function parseMoney(str) {
  return parseFloat(String(str || '').replace(/[$,\s]/g, '')) || 0;
}
// Calculated dollar fields always include $ prefix
function fmtUsd(n) {
  if (!n || isNaN(n)) return '';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function calcFields(vals) {
  const total = parseMoney(vals.estimated_total);
  const pct   = parsePct(vals.phase1_fee_pct);
  const fee   = total * pct;
  return {
    phase1_fee:               fmtUsd(fee),
    phase1_fee_50pct_upfront:  fmtUsd(fee * 0.5),
    phase1_fee_50pct_delivery: fmtUsd(fee * 0.5),
  };
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
        const d = f.label.includes(',') ? `"${f.label}"` : f.label;
        return `${d},{{${f.key}}},`;
      }),
  ];
  saveAs(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), 'contract_input_blank.csv');
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  job:    { bg: '#ffffff', bdr: '#e2e8f0', lbl: '#4a5568' },
  stable: { bg: '#ebf8ff', bdr: '#bee3f8', lbl: '#2c5282' },
  calc:   { bg: '#fffff0', bdr: '#faf089', lbl: '#975a16' },
};

// Unit badge pill shown in the field label
function UnitBadge({ unit }) {
  if (!unit) return null;
  const label = unit === 'pct' ? '%' : '$';
  const bg    = unit === 'pct' ? '#e9d8fd' : '#c6f6d5';
  const color = unit === 'pct' ? '#553c9a' : '#276749';
  return (
    <span style={{
      display: 'inline-block', marginLeft: 5,
      padding: '0px 5px', fontSize: 10, borderRadius: 3,
      background: bg, color, fontWeight: 700, verticalAlign: 'middle',
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field widgets
// ─────────────────────────────────────────────────────────────────────────────

function FieldShell({ field, dimmed, children }) {
  const col = C[field.type] || C.job;
  return (
    <div style={{
      background: col.bg, border: `1px solid ${col.bdr}`, borderRadius: 6,
      padding: '6px 10px', opacity: dimmed ? 0.4 : 1, transition: 'opacity .2s',
    }}>
      <div style={{ fontSize: 11, color: col.lbl, marginBottom: 3, lineHeight: 1.3 }}>
        {field.label}
        <UnitBadge unit={field.unit} />
        {field.type === 'calc' && (
          <span style={{ marginLeft: 6, fontSize: 10, color: '#b7791f' }}>= {field.formula}</span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputBase = {
  width: '100%', border: 'none', background: 'transparent',
  padding: '2px 0', fontSize: 13, color: '#1a202c', outline: 'none',
};

// Generic text field with onBlur unit normalization
function TextField({ field, value, locked, onChange }) {
  function handleBlur() {
    if (!locked && field.unit && onChange) {
      const normalized = normalizeValue(value, field.unit);
      if (normalized !== value) onChange(normalized);
    }
  }
  return (
    <FieldShell field={field}>
      <input
        type="text"
        value={value}
        readOnly={locked}
        onChange={e => onChange && onChange(e.target.value)}
        onBlur={handleBlur}
        style={{
          ...inputBase,
          borderBottom: locked ? 'none' : `1px solid ${C[field.type]?.bdr || '#e2e8f0'}`,
          cursor: locked ? 'default' : 'text',
        }}
      />
    </FieldShell>
  );
}

function SelectField({ field, value, locked, onChange }) {
  return (
    <FieldShell field={field}>
      <select
        value={value}
        disabled={locked}
        onChange={e => onChange && onChange(e.target.value)}
        style={{
          ...inputBase,
          borderBottom: locked ? 'none' : `1px solid ${C[field.type]?.bdr || '#e2e8f0'}`,
          cursor: locked ? 'default' : 'pointer',
          appearance: locked ? 'none' : 'auto',
        }}
      >
        {TAX_STATUS_OPTIONS.map(opt => (
          <option key={opt} value={opt}>{opt || '— select —'}</option>
        ))}
      </select>
    </FieldShell>
  );
}

function ToggleField({ field, value, locked, onChange }) {
  const opts = field.options || ['is', 'is not'];
  return (
    <FieldShell field={field}>
      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        {opts.map(opt => {
          const active = value === opt;
          return (
            <button
              key={opt}
              disabled={locked}
              onClick={() => !locked && onChange && onChange(opt)}
              style={{
                padding: '3px 14px', fontSize: 12, borderRadius: 4,
                border: `1px solid ${active ? '#2b6cb0' : '#cbd5e0'}`,
                background: active ? '#2b6cb0' : '#f7fafc',
                color: active ? 'white' : '#4a5568',
                cursor: locked ? 'default' : 'pointer',
                fontWeight: active ? 600 : 400,
                transition: 'all .15s',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

// Dispatch to the right widget
function FieldRow({ field, value, locked, onChange, dimmed }) {
  if (field.widget === 'select') return <SelectField field={field} value={value} locked={locked} onChange={onChange} />;
  if (field.widget === 'toggle') return <ToggleField  field={field} value={value} locked={locked} onChange={onChange} />;
  if (field.type   === 'calc')   return <TextField    field={field} value={value} locked={true}   onChange={null} />;
  return (
    <FieldShell field={field} dimmed={dimmed}>
      <input
        type="text"
        value={value}
        readOnly={locked}
        onChange={e => onChange && onChange(e.target.value)}
        onBlur={() => {
          if (!locked && field.unit && onChange) {
            const n = normalizeValue(value, field.unit);
            if (n !== value) onChange(n);
          }
        }}
        style={{
          ...inputBase,
          borderBottom: locked ? 'none' : `1px solid ${C[field.type]?.bdr || '#e2e8f0'}`,
          cursor: locked ? 'default' : 'text',
        }}
      />
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility button
// ─────────────────────────────────────────────────────────────────────────────

function Btn({ onClick, children, title, bg = '#edf2f7', bdr = '#cbd5e0', color = '#2d3748' }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: '5px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
      border: `1px solid ${bdr}`, background: bg, color, whiteSpace: 'nowrap',
    }}>
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
  const [originalJob,    setOriginalJob]    = useState(null);
  const [stableUnlocked, setStableUnlocked] = useState(false);
  const [csvFile,        setCsvFile]        = useState(null);
  const [dragOver,       setDragOver]       = useState(false);
  const [status,         setStatus]         = useState('');
  const [generating,     setGenerating]     = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  const csvInputRef  = useRef(null);
  const importDefRef = useRef(null);

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

  // ── Derived values ─────────────────────────────────────────────────────────
  const calc      = calcFields({ ...stable, ...job });
  const allValues = { ...stable, ...job, ...calc };

  // ── CSV load ───────────────────────────────────────────────────────────────
  function applyCsvData(text, fname) {
    const parsed = parseCsv(text);
    const newJob = { ...job };
    let matched = 0;
    for (const key of JOB_KEYS) {
      if (parsed[key] !== undefined && parsed[key] !== '') {
        // Normalize unit on load so CSV values without symbols get fixed immediately
        const field = FIELDS.find(f => f.key === key);
        newJob[key] = normalizeValue(parsed[key], field?.unit);
        matched++;
      }
    }
    setJob(newJob);
    setOriginalJob({ ...newJob });
    setCsvFile(fname);
    setStatus(matched > 0
      ? `✓ ${fname} — ${matched} field${matched !== 1 ? 's' : ''} populated`
      : `⚠ ${fname} — no matching fields found`);
  }

  function onCsvFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => applyCsvData(ev.target.result, f.name);
    r.readAsText(f); e.target.value = '';
  }
  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => applyCsvData(ev.target.result, f.name);
    r.readAsText(f);
  }

  // ── Export CSV with change notes ───────────────────────────────────────────
  function exportCsv() {
    const today = todayISO();
    const lines = ['description,placeholder,value,notes'];
    for (const f of FIELDS.filter(fi => fi.type === 'job')) {
      const cur  = job[f.key] ?? '';
      const orig = originalJob ? (originalJob[f.key] ?? '') : '';
      const note = (originalJob !== null && cur !== orig) ? `changed ${today}` : '';
      const esc  = v => `"${String(v).replace(/"/g, '""')}"`;
      lines.push(`${esc(f.label)},{{${f.key}}},${esc(cur)},${esc(note)}`);
    }
    const slug = (job.customer_name || 'contract').replace(/[^a-zA-Z0-9]+/g, '_');
    saveAs(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `contract_input_${slug}.csv`);
    setStatus('✓ CSV exported');
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
      catch (_) { setStatus('✗ Could not parse defaults file'); }
    };
    r.readAsText(f); e.target.value = '';
  }

  // ── Generate contract ──────────────────────────────────────────────────────
  async function generateContract() {
    setGenerating(true); setStatus('Loading template…');
    try {
      const resp = await fetch('./Wipomo_Contract_Template.docx');
      if (!resp.ok) throw new Error(`Template not found (HTTP ${resp.status})`);
      const zip = new PizZip(await resp.arrayBuffer());
      const doc = new window.Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      // Final normalize pass — catches anything not yet blur-normalized
      const mergeData = normalizeAllValues({ ...allValues, site_photo: '' });
      doc.render(mergeData);
      const out  = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const slug = (allValues.customer_name || 'Contract').replace(/[^a-zA-Z0-9]+/g, '_');
      const ds   = (allValues.contract_date || allValues.effective_date || '').replace(/[^a-zA-Z0-9]+/g, '-');
      saveAs(out, `Wipomo_Contract_${slug}${ds ? '_' + ds : ''}.docx`);
      setStatus('✓ Contract generated and downloaded');
    } catch (err) {
      setStatus(`✗ ${err.message}`); console.error(err);
    } finally { setGenerating(false); }
  }

  // ── Field setters ──────────────────────────────────────────────────────────
  const setJobField    = (key, val) => setJob(prev    => ({ ...prev, [key]: val }));
  const setStableField = (key, val) => setStable(prev => ({ ...prev, [key]: val }));

  const statusColor = status.startsWith('✓') ? '#9ae6b4' : '#feb2b2';
  const taxIsOther  = job.customer_tax_status === 'Other';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── App header ──────────────────────────────────────────────────── */}
      <div style={{ background: '#1a365d', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Wipomo Contract Tool</span>
        <span style={{ fontSize: 11, opacity: 0.55 }}>Center for Community Energy · v0.1.3</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12, color: statusColor }}>{status}</span>}
          <button onClick={generateContract} disabled={generating} style={{
            padding: '6px 22px', fontSize: 13, fontWeight: 600,
            background: generating ? '#4a5568' : '#2b6cb0',
            color: 'white', border: 'none', borderRadius: 5,
            cursor: generating ? 'not-allowed' : 'pointer',
          }}>
            {generating ? 'Generating…' : '⬇ Generate Contract'}
          </button>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, padding: 14, maxWidth: 1400, margin: '0 auto', alignItems: 'flex-start' }}>

        {/* ═══ LEFT — per-job fields ══════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#e6fffa', border: '1px solid #b2f5ea', borderRadius: 7, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 8 }}>Per-Job Fields</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => csvInputRef.current.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#319795' : '#81e6d9'}`,
                  borderRadius: 5, padding: '5px 14px',
                  background: dragOver ? '#b2f5ea' : '#f0fff4',
                  cursor: 'pointer', fontSize: 12, color: '#234e52', transition: 'all .15s',
                }}
              >
                {csvFile ? <span>📎 {csvFile} — <u>change</u></span> : <span>📄 Drop CSV or <u>click to browse</u></span>}
              </div>
              <input type="file" accept=".csv" ref={csvInputRef} style={{ display: 'none' }} onChange={onCsvFile} />
              <Btn onClick={downloadBlankCsv}>⬇ Blank CSV</Btn>
              <Btn onClick={exportCsv} bg="#2c7a7b" bdr="#285e61" color="white">↑ Export CSV</Btn>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {LEFT_KEYS.map(key => {
              const field  = FIELDS.find(f => f.key === key);
              const value  = field.type === 'calc' ? (calc[key] ?? '') : (job[key] ?? '');
              const dimmed = key === 'customer_tax_status_other' && !taxIsOther;
              return (
                <FieldRow key={key} field={field} value={value} locked={field.type === 'calc'}
                          dimmed={dimmed} onChange={val => setJobField(key, val)} />
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT — stable contractor defaults ═════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: stableUnlocked ? '#fffbeb' : '#ebf8ff',
            border: `1px solid ${stableUnlocked ? '#f6e05e' : '#bee3f8'}`,
            borderRadius: 7, padding: '10px 14px', marginBottom: 10,
            transition: 'background .2s, border-color .2s',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c', marginBottom: 8 }}>Contractor Defaults</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {stableUnlocked ? (
                <button onClick={() => setStableUnlocked(false)} style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                  background: '#d69e2e', border: '1px solid #b7791f', color: 'white', cursor: 'pointer',
                }}>🔒 Lock Defaults</button>
              ) : (
                <button onClick={() => setStableUnlocked(true)} style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                  background: '#2c5282', border: '1px solid #2a4a7f', color: 'white', cursor: 'pointer',
                }}>✏️ Edit Defaults</button>
              )}
              <Btn onClick={saveDefaultsToFile} bg="#2c5282" bdr="#2a4a7f" color="white"
                   title="Download contract_defaults.json — commit & push to share across computers">
                Save Defaults ↓
              </Btn>
              <Btn onClick={() => importDefRef.current.click()} title="Load from a saved contract_defaults.json">
                Import Defaults
              </Btn>
              <input type="file" accept=".json" ref={importDefRef} style={{ display: 'none' }} onChange={onImportDefaults} />
              {stableUnlocked && (
                <span style={{ fontSize: 11, color: '#975a16', fontStyle: 'italic' }}>Editing — changes save automatically</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {RIGHT_KEYS.map(key => {
              const field = FIELDS.find(f => f.key === key);
              return (
                <FieldRow key={key} field={field} value={stable[key] ?? ''}
                          locked={!stableUnlocked} onChange={val => setStableField(key, val)} />
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
