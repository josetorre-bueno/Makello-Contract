// contract_tool_app_v0.4.7.jsx
// Makello Contract Tool (Beta)
// v0.4.7 — 2026-05-27
//
// Changes from v0.4.7:
//  - index.html: added ?v= cache-bust query strings to contract_auth.js and
//    all library scripts (react, babel, pizzip, docxtemplater, FileSaver,
//    papaparse, mammoth). These are cached as immutable by the _headers rule;
//    without a query string, browser caches permanently and never picks up
//    updates. Fixes blank-page and missing Show/Hide button.
//
// Changes from v0.4.5:
//  - Help panel rewritten: five columns covering Input CSV formats, Contractor
//    Defaults, Translation Table workflow (export/edit/upload, column meanings),
//    Expression Language reference (all 8 functions with descriptions and
//    examples), and Battery/Phase 1 + PDF Output.
//  - include_battery_in_phase1 documented in help (was present in UI but not
//    explained; only visible when PV+Battery contract type is selected).
//
// Changes from v0.4.4:
//  - Cache-busting: all template fetch URLs now include ?v=0.4.6 so browsers
//    discard cached .docx files when the version changes. Fixes stale context
//    in translation export caused by browser returning the old PV-only template
//    (which still had battery placeholders) from cache.
//  - Translation export: first row is now a comment line with tool version and
//    export timestamp, so every CSV file is self-identifying.
//
// Changes from v0.4.3:
//  - LS_TRANSLATION_KEY bumped to 'wipomo_translation_v2'. Forces a fresh load
//    of DEFAULT_TRANSLATION on first run, clearing stale v1 data (which preserved
//    old residential-only rows and the pre-split initial_target_capacity entry
//    with [battery_type] for both contract types).
//  - Battery template: fixed 50 &quot; XML entities in document.xml text content
//    so effective_date and other shared contexts compare correctly between the
//    two templates and collapse to ★ in the translation export.
//
// Changes from v0.4.2:
//  - Translation table: new applies_to column ('both'|'pv_only'|'pv_battery').
//    Battery-specific entries (battery_size_kwh, battery_cost,
//    include_battery_in_phase1) are marked 'pv_battery' and skipped entirely
//    when processing a PV Only contract. initial_target_capacity split into two
//    rows: one for PV Only (no battery arg), one for PV+Battery.
//  - Removed 8 residential-only fields that have no placeholder in either
//    template: first_payment through fifth_payment, cancellation_start_date,
//    cancellation_end_date, authority_having_jurisdiction.
//  - BUILD_CAPACITY: third arg (battery_type) now optional; called with 1 or 2
//    args for PV Only, 3 args for PV+Battery.
//  - contextsMatch(): normalises curly/straight quotes before comparing so
//    quote-only differences between templates don't produce extra columns.
//  - UI: arrow icons on upload/download buttons enlarged (font-size 18px).
//  - Password page: show/hide toggle added to password input field.
//
// Changes from v0.3.27:
//  - Translation table system replaces hardcoded LEGACY_FIELD_MAP.
//    The table maps client CSV column names to internal keys. Exportable,
//    uploadable, persisted to localStorage.
//  - CONTEXT_WORDS = 12: parameterised word-window for template context.
//  - evalExpression(): full infix arithmetic with parentheses, [field_refs],
//    and functions ROUND, AVERAGE, SUM, MIN, MAX, ABS,
//    BUILD_CAPACITY, EXTRACT_DOLLARS.
//  - scanTemplateForContext(): auto-generates context for translation export.
//  - exportTranslationCsv() / importTranslationCsv(): export and import.
//  - FIELDS: added first_payment through fifth_payment,
//    cancellation_start_date, cancellation_end_date,
//    authority_having_jurisdiction as job fields (previously lost).
//  - getMissingFields: required status now driven by translation table.
//  - UI: Export Translation / Upload Translation buttons in left panel.
//
// Changes from v0.3.26:
//  - Contract type selector in header: "PV Only" / "PV + Battery Storage"
//    (default: PV Only). Selects which Word template is fetched at generate time:
//    PV Only    → Wipomo_Contract_Template.docx
//    PV+Battery → Wipomo_Contract_Template_Battery.docx
//  - Battery fields (battery_size_kwh, battery_cost, include_battery_in_phase1)
//    now visible in the per-job panel ONLY when PV+Battery is selected.
//    Hidden completely for PV Only contracts (no blank battery fields in output).
//  - phase1_fee_base calc field added: equals estimated_total when battery cost is
//    included in Phase 1 basis, or estimated_total minus battery_cost when excluded.
//    phase1_fee now multiplies phase1_fee_base (PV-only contracts unaffected —
//    base equals estimated_total when no battery cost is present).
//  - parseLegacyCsv: battery_cost auto-extracted from battery_type string if no
//    direct battery_cost column exists (parses the "$N,NNN.NN" amount from the
//    battery_type description, e.g. "Tesla Powerwall-3 … $27,987.84").
//  - parseBatteryCostFromType() helper function added.
//
// Changes from v0.3.25:
//  - buildInitialTargetCapacity: battery output now shows kWh capacity only.
//    kW power rating removed from system description field.
//    "10.44 kW DC Solar PV and 27kWh 11.5kW Storage"
//      → "10.44 kW DC Solar PV and 27 kWh Battery Storage"
//    Battery-only: "27kWh 11.5kW Grid Tied Energy Storage"
//      → "27 kWh Battery Storage"
//
// Changes from v0.3.24:
//  - Help panel: updated CSV section heading to "Three Formats Accepted".
//  - Help panel: Format 2 relabelled as "old schema" (owner_name first col).
//  - Help panel: Format 3 added — current Sky-D schema (project_type first col),
//    lists the fields that now populate directly (customer_address, estimated_total,
//    prevailing_wage, effective_date, contract_date, customer_tax_status).
//  - Help panel: photo re-upload requirement moved into a shared callout box at
//    the bottom of the CSV section, visible for both Makello formats.
//
// Changes from v0.3.23:
//  - isLegacyCsv comment updated to document all three supported CSV types.
//
// Changes from v0.3.22:
//  - isLegacyCsv: detects both old format (first col 'owner_name') and new
//    Makello export format (first col 'project_type'). The export schema changed
//    so 'owner_name' moved from col 0 to col 2; the old check caused "no matching
//    fields found" on every new-format export.
//  - parseLegacyCsv: now passes through any CSV column whose name directly matches
//    a JOB_KEY, so fields like customer_address, estimated_total, effective_date,
//    prevailing_wage, contract_date, customer_tax_status populate automatically.
//  - parseLegacyCsv: LEGACY_FIELD_MAP remappings only fire when the target slot is
//    not already filled by a direct match — prevents total_flat_fee_adders_with_
//    marketing_fee ($7k) from overwriting the correct estimated_total ($130k).
//  - parseLegacyCsv: buildInitialTargetCapacity falls back to initial_target_capacity
//    (new format, numeric kW) when system_size (old format) is absent.
//
// Changes from v0.3.13:
//  - Wide/horizontal Makello CSV support fixed. parseLegacyCsv previously
//    iterated rows as vertical pairs (field name in col 0, value in col 1),
//    which was wrong for the wide format (all ~100 field names in row 0, all
//    values in row 1). Rewritten to zip headers row with values row.
//  - LEGACY_FIELD_MAP: replaced 'gross_cost' → 'estimated_total' with
//    'total_flat_fee_adders_with_marketing_fee' → 'estimated_total'.
//  - Added buildInitialTargetCapacity(): extracts kWh and kW from battery_type
//    string (e.g. "(40.5kWh/23kW)") and combines with system_size to produce
//    the {{initial_target_capacity}} system description automatically.
//
// Changes from v0.3.12:
//  - Highlighting: docxtemplater places the filled value at the END of a run
//    that also contains the preceding sentence text (e.g. "Contractor warrants
//    ...for a period of 1"). applyHighlightAndStripMarkers now splits any run
//    that contains sentinels into separate before/value/after runs so only the
//    value itself is highlighted, not the surrounding text.
//  - Singular year fix: regex was matching " years</w:t>" (whole-element), but
//    the actual element is " years from the date...</w:t>". Pattern updated to
//    match " years" at the start of text content regardless of what follows.
//
// Changes from v0.3.5:
//  - "Include Addendum" toggle in header: when checked, renders addendum_template.docx
//    with {{installation_deadline_months}} and merges it (with page break) after the
//    main contract, remapping numbering IDs to avoid conflicts.
//  - New stable field: installation_deadline_months (default 6) — Addendum §2 variable.
//  - addendum_template.docx must be served alongside the other files.
//
// Changes from v0.2.7:
//  - Legacy Makello database export detection. The Makello CRM exports a
//    wide CSV with all field names across row 1 and all values across row 2,
//    unlike the normal contract_input CSV (one row per field). The parser
//    detects the format by checking whether row 0 contains 'owner_name' as
//    a column header. Three fields are currently mapped: owner_name →
//    customer_org_name, address → customer_address, gross_cost →
//    estimated_total. Additional mappings can be added to LEGACY_FIELD_MAP.
//    The status line notes "(legacy Makello format — partial data)" when a
//    legacy file is loaded.

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Field manifest
// ─────────────────────────────────────────────────────────────────────────────

const TAX_STATUS_OPTIONS = ['', 'C corporation', 'S corporation', '501(c)(3)', 'Other'];

// Aliases accepted when loading tax status from CSV (keyed by stripped lowercase).
// The fuzzy matcher handles full names case-insensitively; these cover abbreviations.
const TAX_STATUS_ALIASES = {
  'c':            'C corporation',
  'ccorp':        'C corporation',
  's':            'S corporation',
  'scorp':        'S corporation',
  'nonprofit':    '501(c)(3)',
  'notforprofit': '501(c)(3)',
  '501c3':        '501(c)(3)',
};

// Prevailing wage: UI shows yes/no (intuitive for data entry); template receives
// is/is not (fits contract clause "This project [is / is not] subject to…").
const PREVAILING_WAGE_OUTPUT = { yes: 'is', no: 'is not' };

// fillStatus — how each job field is expected to be populated:
//   'upload'     — should come from the customer data file; required for output
//   'manual'     — must be entered manually; required for output
//   'optional'   — can legitimately be left blank (e.g. effective date, "Other" detail)
//   'at_signing' — intentionally blank in preliminary versions; filled at execution time

const FIELDS = [
  { key: 'effective_date',                    label: 'Contract execution date (e.g. April 17 2026)',                          type: 'job',    fillStatus: 'optional' },
  { key: 'contractor_name',                   label: 'Contractor company name',                                               type: 'stable', dflt: '' },
  { key: 'contractor_address',                label: 'Contractor street address city state zip',                              type: 'stable', dflt: '' },
  { key: 'contractor_license_no',             label: 'California Contractor License number',                                  type: 'stable', dflt: '' },
  { key: 'customer_org_name',                 label: 'Customer organization or business name',                                type: 'job',    fillStatus: 'upload' },
  { key: 'customer_address',                  label: 'Project site address city state zip',                                   type: 'job',    fillStatus: 'upload' },
  { key: 'customer_tax_status',               label: 'Customer tax status',                                                   type: 'job',    fillStatus: 'optional',   widget: 'select' },
  { key: 'customer_tax_status_other',         label: 'If "Other" — specify type',                                            type: 'job',    fillStatus: 'optional' },
  { key: 'initial_target_capacity',           label: 'System description (e.g. 24kW DC to 28kW DC solar tracker)',           type: 'job',    fillStatus: 'manual' },
  { key: 'material_escalation_threshold_pct', label: 'Material cost escalation threshold',                                   type: 'stable', dflt: '5%',  unit: 'pct' },
  { key: 'labor_escalation_threshold_pct',    label: 'Labor cost escalation threshold (ENR Skilled Labor Index)',             type: 'stable', dflt: '5%',  unit: 'pct' },
  { key: 'phase1_completion_days',            label: 'Days to complete Phase 1 after Effective Date',                        type: 'stable', dflt: '75' },
  { key: 'phase1_fee_pct',                    label: 'Phase 1 fee as % of Total Project Cost',                               type: 'stable', dflt: '8%',  unit: 'pct' },
  { key: 'estimated_total',                   label: 'Estimated Total Project Cost',                                          type: 'job',    fillStatus: 'upload',     unit: 'usd' },
  { key: 'battery_size_kwh',                  label: 'Battery storage capacity (kWh)',                                        type: 'job',    fillStatus: 'upload',     batteryOnly: true },
  { key: 'battery_cost',                      label: 'Battery Storage System cost',                                           type: 'job',    fillStatus: 'upload',     unit: 'usd', batteryOnly: true },
  { key: 'include_battery_in_phase1',         label: 'Include battery cost in Phase 1 fee basis',                            type: 'job',    fillStatus: 'manual',     widget: 'toggle', options: ['yes', 'no'], batteryOnly: true },
  { key: 'phase1_fee_base',                   label: 'Phase 1 fee basis (total less battery if excluded)',                    type: 'calc',   formula: 'estimated_total − battery_cost if excluded', unit: 'usd', batteryOnly: true },
  { key: 'phase1_fee',                        label: 'Phase 1 fee — total dollar amount',                                     type: 'calc',   formula: 'phase1_fee_base × phase1_fee_pct', unit: 'usd' },
  { key: 'phase1_fee_50pct_upfront',          label: '50% of Phase 1 fee due at signing',                                    type: 'calc',   formula: 'phase1_fee × 50%',                 unit: 'usd' },
  { key: 'phase1_fee_50pct_delivery',         label: '50% of Phase 1 fee due at delivery of Phase 1 deliverables',           type: 'calc',   formula: 'phase1_fee × 50%',                 unit: 'usd' },
  { key: 'phase2_start_days',                 label: 'Days to commence Phase 2 after Notice to Proceed',                     type: 'stable', dflt: '30' },
  { key: 'installation_deadline_months',      label: 'Addendum §2 — months to install after permit/interconnection approval (if no fault of Contractor)', type: 'stable', dflt: '6' },
  { key: 'payment_ntp_pct',                   label: 'Payment due upon NTP and building permits',                             type: 'stable', dflt: '25%', unit: 'pct' },
  { key: 'payment_equipment_pct',             label: 'Payment due upon delivery of equipment to site',                       type: 'stable', dflt: '35%', unit: 'pct' },
  { key: 'payment_installation_pct',          label: 'Payment due upon completion of installation',                          type: 'stable', dflt: '25%', unit: 'pct' },
  { key: 'payment_closeout_pct',              label: 'Payment due upon PTO and closeout docs',                               type: 'stable', dflt: '15%', unit: 'pct' },
  { key: 'prevailing_wage',                   label: 'Prevailing wage',                                                       type: 'job',    fillStatus: 'manual',     widget: 'toggle', options: ['yes', 'no'] },
  { key: 'workmanship_warranty_years',        label: 'Workmanship warranty period in years',                                  type: 'stable', dflt: '1' },
  { key: 'design_warranty_years',             label: 'Phase 1 design and engineering warranty in years',                     type: 'stable', dflt: '1' },
  { key: 'contractor_signatory_name',         label: 'Full name of person signing on behalf of contractor',                   type: 'stable', dflt: '' },
  { key: 'contractor_signatory_title',        label: 'Title of contractor signatory (e.g. President)',                        type: 'stable', dflt: '' },
  { key: 'contract_date',                     label: 'Date contract is signed (same as or later than effective date)',         type: 'job',    fillStatus: 'at_signing' },
  { key: 'customer_name',                     label: 'Full name of customer individual signing the contract',                 type: 'job',    fillStatus: 'at_signing' },
  { key: 'customer_title',                    label: 'Title of customer signatory — leave blank if sole proprietor',          type: 'job',    fillStatus: 'at_signing' },
  { key: 'site_photo',                        label: 'Site photo — appears at top of contract',                               type: 'job',    fillStatus: 'optional',   widget: 'photo' },
];

const LEFT_KEYS  = FIELDS.filter(f => f.type === 'job' || f.type === 'calc').map(f => f.key);
const RIGHT_KEYS = FIELDS.filter(f => f.type === 'stable').map(f => f.key);
const JOB_KEYS   = FIELDS.filter(f => f.type === 'job').map(f => f.key);

const HARDCODED_DEFAULTS = Object.fromEntries(
  FIELDS.filter(f => f.type === 'stable').map(f => [f.key, f.dflt])
);

const LS_KEY = 'wipomo_contract_stable_v1';
const CONTEXT_WORDS      = 12;   // words on each side of {{placeholder}} in export context
const LS_TRANSLATION_KEY = 'wipomo_translation_v2'; // keep v2 — no schema change

// Default translation table: one entry per CSV-mappable internal key.
// expression uses [bracket_field_refs] for CSV lookups and supports
// arithmetic and the functions defined in evalExpression().
const DEFAULT_TRANSLATION = [
  // applies_to: 'both' (default) | 'pv_only' | 'pv_battery'
  { internalKey: 'effective_date',            expression: '[effective_date]',                                              requiredStatus: 'optional',   appliesTo: 'both'       },
  { internalKey: 'customer_name',             expression: '[customer_name]',                                               requiredStatus: 'at_signing', appliesTo: 'both'       },
  { internalKey: 'customer_org_name',         expression: '[owner_name]',                                                  requiredStatus: 'upload',     appliesTo: 'both'       },
  { internalKey: 'customer_address',          expression: '[customer_address]',                                            requiredStatus: 'upload',     appliesTo: 'both'       },
  { internalKey: 'customer_title',            expression: '[customer_title]',                                              requiredStatus: 'at_signing', appliesTo: 'both'       },
  { internalKey: 'customer_tax_status',       expression: '[customer_tax_status]',                                         requiredStatus: 'optional',   appliesTo: 'both'       },
  { internalKey: 'customer_tax_status_other', expression: '[other_tax_status]',                                            requiredStatus: 'optional',   appliesTo: 'both'       },
  // initial_target_capacity: two rows — PV Only uses solar kW only; PV+Battery adds battery.
  { internalKey: 'initial_target_capacity',   expression: 'BUILD_CAPACITY([system_size],[initial_target_capacity])',       requiredStatus: 'upload',     appliesTo: 'pv_only'    },
  { internalKey: 'initial_target_capacity',   expression: 'BUILD_CAPACITY([system_size],[initial_target_capacity],[battery_type])', requiredStatus: 'upload', appliesTo: 'pv_battery' },
  { internalKey: 'estimated_total',           expression: '[estimated_total]',                                             requiredStatus: 'upload',     appliesTo: 'both'       },
  // Battery-specific fields — skipped entirely for PV Only contracts.
  { internalKey: 'battery_size_kwh',          expression: '[battery_size_kwh]',                                            requiredStatus: 'upload',     appliesTo: 'pv_battery' },
  { internalKey: 'battery_cost',              expression: 'EXTRACT_DOLLARS([battery_type])',                               requiredStatus: 'upload',     appliesTo: 'pv_battery' },
  { internalKey: 'include_battery_in_phase1', expression: '[include_battery_in_phase1]',                                   requiredStatus: 'manual',     appliesTo: 'pv_battery' },
  { internalKey: 'prevailing_wage',           expression: '[prevailing_wage]',                                             requiredStatus: 'manual',     appliesTo: 'both'       },
  { internalKey: 'contract_date',             expression: '[contract_date]',                                               requiredStatus: 'at_signing', appliesTo: 'both'       },
  { internalKey: 'site_photo',                expression: '[site_photo]',                                                  requiredStatus: 'optional',   appliesTo: 'both'       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Unit normalisation
// ─────────────────────────────────────────────────────────────────────────────

function normalizePct(val) {
  const s = String(val).trim();
  if (!s) return s;
  if (s.endsWith('%')) return s;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  if (isNaN(n)) return val;
  return (n <= 1 ? +(n * 100).toFixed(4) : n) + '%';
}
function normalizeUsd(val) {
  const s = String(val).trim();
  if (!s) return s;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  if (isNaN(n)) return val;
  return '$' + Math.round(n).toLocaleString('en-US');
}
function normalizeValue(val, unit) {
  if (!unit || !val) return val;
  if (unit === 'pct') return normalizePct(val);
  if (unit === 'usd') return normalizeUsd(val);
  return val;
}
// Match a CSV-loaded string against a known options list, ignoring case and
// non-alphanumeric characters. Optional aliases map (keyed by stripped lowercase)
// is checked first to handle abbreviations like 'c'→'C corporation'.
function normalizeSelectValue(val, options, aliases) {
  if (!val || !options) return val;
  const strip = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const stripped = strip(val);
  if (aliases && stripped in aliases) return aliases[stripped];
  const match = options.find(o => strip(o) === stripped);
  return match !== undefined ? match : val;
}
function normalizeAllValues(vals) {
  const out = { ...vals };
  for (const f of FIELDS) {
    if (f.unit && out[f.key] !== undefined) out[f.key] = normalizeValue(out[f.key], f.unit);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calc helpers
// ─────────────────────────────────────────────────────────────────────────────

function parsePct(str) {
  const n = parseFloat(String(str || '').replace(/[%$,\s]/g, ''));
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}
function parseMoney(str) {
  return parseFloat(String(str || '').replace(/[$,\s]/g, '')) || 0;
}
function fmtUsd(n) {
  if (!n || isNaN(n)) return '';
  return '$' + Math.round(n).toLocaleString('en-US');
}
function calcFields(vals) {
  const total          = parseMoney(vals.estimated_total);
  const battery        = parseMoney(vals.battery_cost);
  const excludeBattery = vals.include_battery_in_phase1 === 'no';
  const base           = excludeBattery ? Math.max(0, total - battery) : total;
  const pct            = parsePct(vals.phase1_fee_pct);
  const fee            = base * pct;
  return {
    phase1_fee_base:           fmtUsd(base),
    phase1_fee:                fmtUsd(fee),
    phase1_fee_50pct_upfront:  fmtUsd(fee * 0.5),
    phase1_fee_50pct_delivery: fmtUsd(fee * 0.5),
  };
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ─────────────────────────────────────────────────────────────────────────────
// Image helpers
// ─────────────────────────────────────────────────────────────────────────────

// Decode a data URL to a Uint8Array for embedding in the docx zip
function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary  = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// 1 inch = 914400 EMUs.  Target max width: 6 inches.
const MAX_WIDTH_EMU  = 6    * 914400;  // 5486400  — 6" max width (fits between 1" margins)
const MAX_HEIGHT_EMU = 2.25 * 914400;  // 2057400  — ¼ of 9" usable page height (11" - 1" top - 1" bottom)

function calcImageEmu(naturalWidth, naturalHeight) {
  const ar = naturalHeight / naturalWidth;
  let cx = MAX_WIDTH_EMU;
  let cy = Math.round(cx * ar);
  if (cy > MAX_HEIGHT_EMU) { cy = MAX_HEIGHT_EMU; cx = Math.round(cy / ar); }
  return { cx, cy };
}

// Build the Word drawing XML for an inline image.
// a: and pic: namespaces are declared inline because the template
// does not declare them on <w:document>.
function buildImageXml(rId, cx, cy) {
  return `
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0">
  <wp:extent cx="${cx}" cy="${cy}"/>
  <wp:docPr id="200" name="SitePhoto"/>
  <wp:cNvGraphicFramePr>
    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
  </wp:cNvGraphicFramePr>
  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:nvPicPr>
          <pic:cNvPr id="200" name="SitePhoto"/>
          <pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
        </pic:nvPicPr>
        <pic:blipFill>
          <a:blip r:embed="${rId}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </pic:blipFill>
        <pic:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </pic:spPr>
      </pic:pic>
    </a:graphicData>
  </a:graphic>
</wp:inline>
</w:drawing></w:r></w:p>`;
}

/// Post-process a rendered docx blob: inject site photo at the top of page 1
async function addPhotoToDocx(docxBlob, photoData) {
  const { dataUrl, mimeType, width, height } = photoData;
  const ext   = mimeType === 'image/png' ? 'png' : 'jpg';
  const rId   = 'rIdSitePhoto99';
  const fname = `word/media/sitePhoto.${ext}`;

  const buf  = await docxBlob.arrayBuffer();
  const zip  = new PizZip(buf);
  const img  = dataUrlToUint8Array(dataUrl);

  // 1. Add image file
  zip.file(fname, img);

  // 2. Add relationship
  const relType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
  const relsXml = zip.file('word/_rels/document.xml.rels').asText();
  const newRel  = `<Relationship Id="${rId}" Type="${relType}" Target="media/sitePhoto.${ext}"/>`;
  zip.file('word/_rels/document.xml.rels', relsXml.replace('</Relationships>', newRel + '</Relationships>'));

  // 3. Register content type for the image — OOXML requires every part to have one.
  //    Without this entry Word flags the file as "unreadable content".
  const mimeMap  = { png: 'image/png', jpg: 'image/jpeg' };
  const imgMime  = mimeMap[ext] || 'image/jpeg';
  let ctXml      = zip.file('[Content_Types].xml').asText();
  // Only add if not already present (idempotent)
  if (!ctXml.includes(`Extension="${ext}"`)) {
    ctXml = ctXml.replace('</Types>', `<Default Extension="${ext}" ContentType="${imgMime}"/></Types>`);
    zip.file('[Content_Types].xml', ctXml);
  }

  // 4. Build image paragraph — centered, no page break, flows into contract below
  const { cx, cy } = calcImageEmu(width, height);
  const topXml = buildImageXml(rId, cx, cy) + '\n<w:p/>';  // one blank line after photo

  // 5. Inject at the very start of <w:body>, before all contract content
  const docXml = zip.file('word/document.xml').asText();
  zip.file('word/document.xml', docXml.replace('<w:body>', '<w:body>' + topXml));

  const out = zip.generate({ type: 'uint8array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────────────────────────────────────

// ── Legacy Makello database export ───────────────────────────────────────────
// The Makello CRM exports a wide CSV: row 0 = field names spread across
// columns, row 1 = corresponding values. This is the opposite orientation from
// the normal contract_input CSV (one row per field, field name in col A).
//
// Detection: the legacy file's first row contains 'owner_name' as one of its
// column headers. The normal contract_input file's first column always starts
// with 'description' or a similar label.
//
// Extract battery cost dollar amount from the battery_type description string.
// The Sky-D export embeds the cost as "$N,NNN.NN" inside battery_type, e.g.:
//   "Tesla Powerwall-3 & Expansion; (27kWh/11.5kW) $27,987.84"  → "27987.84"
// Returns empty string if no dollar amount found.
function parseBatteryCostFromType(batteryType) {
  if (!batteryType) return '';
  const m = String(batteryType).match(/\$\s*([\d,]+(?:\.\d+)?)/);
  return m ? m[1].replace(/,/g, '') : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Translation table — expression evaluator and template context scanner
// ─────────────────────────────────────────────────────────────────────────────

// Evaluate a translation-table expression against a client CSV row (plain object).
// Bracket refs [field_name] look up csvRow[field_name] as a number.
// Supports: +,-,*,/ with parentheses; functions ROUND(x,n), AVERAGE(...),
// SUM(...), MIN(...), MAX(...), ABS(x), BUILD_CAPACITY(s,i,b), EXTRACT_DOLLARS(s).
// Returns a string.
function evalExpression(expr, csvRow) {
  expr = String(expr || '').trim();
  if (!expr) return '';

  // Tokenizer
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '[') {
      const end = expr.indexOf(']', i);
      if (end === -1) throw new Error('Unclosed [');
      tokens.push({ t: 'field', name: expr.slice(i + 1, end) });
      i = end + 1; continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ t: 'num', v: parseFloat(num) }); continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let name = '';
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) name += expr[i++];
      tokens.push({ t: 'func', name: name.toUpperCase() }); continue;
    }
    if ('+-*/(),'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    throw new Error('Unknown token: ' + ch);
  }

  let pos = 0;
  const peek  = () => tokens[pos];
  const next  = () => tokens[pos++];
  const eat   = v  => { const t = next(); if (t?.v !== v) throw new Error('Expected ' + v); };

  function getNum(name) {
    const raw = csvRow[name];
    if (raw === undefined || raw === '') return 0;
    const n = parseFloat(String(raw).replace(/[$,%\s,]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function getStr(name) { return String(csvRow[name] || ''); }

  function args() {
    const a = [];
    if (peek()?.v === ')') return a;
    a.push(expr_());
    while (peek()?.v === ',') { next(); a.push(expr_()); }
    return a;
  }
  // Collect raw field names from argument list (for string-returning functions)
  function fieldArgs() {
    const names = [];
    while (peek()?.v !== ')') {
      const t = peek();
      if (t?.t === 'field') { next(); names.push(t.name); }
      else if (t?.v === ',') next();
      else { expr_(); names.push(null); }
    }
    return names;
  }

  function expr_()  { return add(); }
  function add() {
    let v = mul();
    while (peek()?.t === 'op' && (peek()?.v === '+' || peek()?.v === '-')) {
      const op = next().v; const r = mul();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function mul() {
    let v = unary();
    while (peek()?.t === 'op' && (peek()?.v === '*' || peek()?.v === '/')) {
      const op = next().v; const r = unary();
      v = op === '*' ? v * r : (r !== 0 ? v / r : 0);
    }
    return v;
  }
  function unary() {
    if (peek()?.t === 'op' && peek()?.v === '-') { next(); return -primary(); }
    return primary();
  }
  function primary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end');
    if (t.t === 'num')   { next(); return t.v; }
    if (t.t === 'field') { next(); return getNum(t.name); }
    if (t.t === 'op' && t.v === '(') { next(); const v = expr_(); eat(')'); return v; }
    if (t.t === 'func') {
      const fn = next().name; eat('(');
      if (fn === 'BUILD_CAPACITY') {
        const names = fieldArgs(); eat(')');
        const sys  = names[0] ? getStr(names[0]) : '';
        const init = names[1] ? getStr(names[1]) : '';
        const batt = names[2] ? getStr(names[2]) : '';
        return { __str: buildInitialTargetCapacity(sys || init, batt) };
      }
      if (fn === 'EXTRACT_DOLLARS') {
        const names = fieldArgs(); eat(')');
        return { __str: parseBatteryCostFromType(names[0] ? getStr(names[0]) : '') };
      }
      const a = args(); eat(')');
      switch (fn) {
        case 'ROUND':   return Math.round(a[0] * 10 ** (a[1] ?? 0)) / 10 ** (a[1] ?? 0);
        case 'AVERAGE': return a.length ? a.reduce((x,y) => x+y, 0) / a.length : 0;
        case 'SUM':     return a.reduce((x,y) => x+y, 0);
        case 'MIN':     return a.length ? Math.min(...a) : 0;
        case 'MAX':     return a.length ? Math.max(...a) : 0;
        case 'ABS':     return Math.abs(a[0] ?? 0);
        default: throw new Error('Unknown function: ' + fn);
      }
    }
    throw new Error('Unexpected: ' + JSON.stringify(t));
  }

  try {
    const result = expr_();
    if (result && typeof result === 'object' && '__str' in result) return result.__str || '';
    if (typeof result === 'number') return Number.isInteger(result) ? String(result) : result.toFixed(2);
    return String(result);
  } catch (e) {
    console.warn('evalExpression error:', e.message, '| expr:', expr);
    return '';
  }
}

// Scan a template DOCX at templateUrl, return Map<internalKey, [{heading, context, template}]>.
// heading = nearest preceding section heading + paragraph number within section.
// context = CONTEXT_WORDS words before and after the {{placeholder}}.
// template = short label for which document this occurrence came from.
// Uses regex on raw Word XML to avoid browser DOMParser namespace issues.
async function scanTemplateForContext(templateUrl, templateLabel) {
  try {
    const resp = await fetch(templateUrl);
    if (!resp.ok) return new Map();
    const buf = await resp.arrayBuffer();
    const zip = new PizZip(buf);
    const xmlText = zip.file('word/document.xml')?.asText();
    if (!xmlText) return new Map();

    // Extract all paragraph blocks using regex on raw XML.
    // Each <w:p>...</w:p> block is one paragraph.
    const paraBlocks = [];
    const paraRe = /<w:p[\s>][^]*?<\/w:p>/g;
    let pm;
    while ((pm = paraRe.exec(xmlText)) !== null) paraBlocks.push(pm[0]);

    // Extract all <w:t> text content from a paragraph block.
    function blockText(block) {
      const parts = [];
      const tRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
      let tm;
      while ((tm = tRe.exec(block)) !== null) parts.push(tm[1]);
      return parts.join('');
    }

    // Detect if a paragraph block is a heading (by pStyle or content pattern).
    function blockHeading(block) {
      const styleMatch = block.match(/<w:pStyle\s+w:val="([^"]+)"/);
      const pStyle = styleMatch ? styleMatch[1] : '';
      const txt = blockText(block).trim();
      if (/^[Hh]eading[1-6]$/.test(pStyle) && txt) return txt;
      if (/^(Article|Section|§)\s*\d/.test(txt) && txt.length < 120) return txt;
      return null;
    }

    const contextMap = new Map();
    let heading = '';
    let secPara = 0;

    for (const block of paraBlocks) {
      const h = blockHeading(block);
      if (h) { heading = h; secPara = 0; continue; }
      secPara++;
      const txt = blockText(block);
      const re = /\{\{([^}]+)\}\}/g;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const key = m[1].trim();
        const before = txt.slice(0, m.index).trim().split(/\s+/).filter(Boolean).slice(-CONTEXT_WORDS).join(' ');
        const after  = txt.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean).slice(0, CONTEXT_WORDS).join(' ');
        const ctx    = (before ? '...' + before + ' ' : '') + m[0] + (after ? ' ' + after + '...' : '');
        const loc    = (templateLabel ? '[' + templateLabel + '] ' : '') + (heading ? heading + ', ' : '') + '¶' + secPara;
        if (!contextMap.has(key)) contextMap.set(key, []);
        contextMap.get(key).push({ heading: loc, context: ctx });
      }
    }
    return contextMap;
  } catch (e) {
    console.warn('scanTemplateForContext failed for', templateUrl, e);
    return new Map();
  }
}

// Strip the template label prefix added by scanTemplateForContext.
function stripTemplateLabel(heading) {
  return heading.replace(/^\[(PV Only|PV\+Battery)\]\s*/, '');
}

// Two occurrences are considered the same location when the surrounding text
// (excluding the {{placeholder}} tag itself) is identical after normalisation.
// Quotes are normalised so curly/straight quote differences (common between
// the two templates) don't produce extra columns.
function contextsMatch(ctxA, ctxB) {
  const norm = s => s
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/[‘’‚‛`´]/g, "'")  // curly single → straight
    .replace(/[“”„‟″‶]/g, '"')   // curly double → straight
    .replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(ctxA) === norm(ctxB);
}

// Merge two context maps (PV Only and PV+Battery) into one.
// Strategy per key:
//   - If an occurrence from PV Only matches one from PV+Battery (same context),
//     emit it once with a "★" prefix (appears in both templates).
//   - Unmatched PV Only occurrences get "[PV Only]" prefix.
//   - Unmatched PV+Battery occurrences get "[PV+Bat]" prefix.
// Extra heading/context column pairs are only added when a field genuinely
// appears in a different location across the two templates.
function mergeContextMaps(mapPv, mapBat) {
  const merged = new Map();
  const allKeys = new Set([...mapPv.keys(), ...mapBat.keys()]);
  for (const key of allKeys) {
    const pvOccs  = mapPv.get(key)  || [];
    const batOccs = mapBat.get(key) || [];
    const result  = [];
    const usedBat = new Set();
    for (const pvOcc of pvOccs) {
      const matchIdx = batOccs.findIndex((b, i) => !usedBat.has(i) && contextsMatch(pvOcc.context, b.context));
      if (matchIdx >= 0) {
        usedBat.add(matchIdx);
        result.push({ heading: '★ ' + stripTemplateLabel(pvOcc.heading), context: pvOcc.context });
      } else {
        result.push({ heading: '[PV Only] ' + stripTemplateLabel(pvOcc.heading), context: pvOcc.context });
      }
    }
    for (let i = 0; i < batOccs.length; i++) {
      if (!usedBat.has(i)) {
        result.push({ heading: '[PV+Bat] ' + stripTemplateLabel(batOccs[i].heading), context: batOccs[i].context });
      }
    }
    if (result.length) merged.set(key, result);
  }
  return merged;
}

// Export the active translation table as a CSV file with auto-generated context columns.
// Scans BOTH templates so the export shows every occurrence across PV Only and PV + Battery.
// Columns: internal_key, client_field_expression, required_status, applies_to, heading_N, context_N...
async function exportTranslationCsv(translation) {
  const [mapPv, mapBat] = await Promise.all([
    scanTemplateForContext('./Wipomo_Contract_Template.docx?v=0.4.6',         'PV Only'),
    scanTemplateForContext('./Wipomo_Contract_Template_Battery.docx?v=0.4.6', 'PV+Battery'),
  ]);
  const contextMap = mergeContextMaps(mapPv, mapBat);
  const maxOcc = Math.max(1, ...translation.map(t => (contextMap.get(t.internalKey) || []).length));
  const esc = v => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const commentRow = [`# Wipomo Contract Tool v0.4.7 — translation table exported ${exportDate}`];
  const header = ['internal_key', 'client_field_expression', 'required_status', 'applies_to'];
  for (let i = 1; i <= maxOcc; i++) header.push('heading_' + i, 'context_' + i);
  const rows = [commentRow, header];
  for (const e of translation) {
    const occs = contextMap.get(e.internalKey) || [];
    const row = [e.internalKey, e.expression || '', e.requiredStatus || 'optional', e.appliesTo || 'both'];
    for (let i = 0; i < maxOcc; i++) { const o = occs[i]; row.push(o ? o.heading : '', o ? o.context : ''); }
    rows.push(row);
  }
  const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'wipomo_translation.csv' });
  a.click(); URL.revokeObjectURL(a.href);
}

// Parse an uploaded translation CSV. Returns array of {internalKey, expression, requiredStatus, appliesTo}
// or null if the file is not a valid translation table. Context columns are ignored.
function importTranslationCsv(text) {
  const allRows = Papa.parse(text.trim(), { skipEmptyLines: true }).data;
  // Skip leading comment rows (cells starting with #)
  const rows = allRows.filter(r => !String(r[0] || '').trim().startsWith('#'));
  if (rows.length < 2) return null;
  const hdr = rows[0].map(h => String(h).trim().toLowerCase());
  const ki = hdr.indexOf('internal_key'), ei = hdr.indexOf('client_field_expression');
  const si = hdr.indexOf('required_status'), ai = hdr.indexOf('applies_to');
  if (ki === -1 || ei === -1) return null;
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const key = String(r[ki] || '').trim();
    if (!key) continue;
    result.push({
      internalKey:  key,
      expression:   String(r[ei] || '').trim(),
      requiredStatus: si !== -1 ? String(r[si] || 'optional').trim() : 'optional',
      appliesTo:    ai !== -1 ? String(r[ai] || 'both').trim() : 'both',
    });
  }
  return result.length ? result : null;
}


// Build the system description for {{initial_target_capacity}} from the
// system_size (kW DC) and battery_type string.  The battery_type field
// contains extraneous text (make, model, cost) but always includes a
// parenthesised spec like "(40.5kWh/23kW)" from which kWh and kW are
// extracted.  Examples:
//   system_size=12.18, battery_type="2 x Tesla Powerwall-3 … (40.5kWh/23kW) …"
//     → "12.18 kW DC Solar PV and 40.5kWh/23kW Storage"
//   system_size=0,     battery_type="1 x Enphase 5P Grid-Tied; (5kWh/3.84kW) …"
//     → "5kWh/3.84kW Grid Tied Energy Storage"
//   system_size=6.12,  battery_type="" (no battery)
//     → "6.12 kW DC Solar PV"
function buildInitialTargetCapacity(systemSize, batteryType) {
  const solar = parseFloat(String(systemSize || '').replace(/[^\d.]/g, '')) || 0;
  let battKwh = 0, battKw = 0;
  if (batteryType) {
    const m = String(batteryType).match(
      /\(\s*(\d+(?:\.\d+)?)\s*kWh\s*\/\s*(\d+(?:\.\d+)?)\s*kW\s*\)/i
    );
    if (m) { battKwh = parseFloat(m[1]); battKw = parseFloat(m[2]); }
  }
  if (solar > 0 && battKwh > 0)
    return `${solar} kW DC Solar PV and ${battKwh} kWh Battery Storage`;
  if (solar > 0)
    return `${solar} kW DC Solar PV`;
  if (battKwh > 0)
    return `${battKwh} kWh Battery Storage`;
  return '';
}

function isLegacyCsv(rows) {
  // Client export: row 0 is a wide header row (many columns). Direct format:
  // row 0 has at most 3 columns. Use column count as the reliable discriminator.
  if (rows.length < 2) return false;
  return rows[0].length > 5;
}

function parseLegacyCsv(rows, translation, contractType) {
  const headers = rows[0].map(h => String(h).trim());
  const values  = rows[1] ? rows[1].map(v => String(v).trim()) : [];
  const raw = {};
  headers.forEach((h, i) => { if (h) raw[h] = values[i] || ''; });
  const tbl = translation || DEFAULT_TRANSLATION;
  const ct  = contractType || 'pv_only';
  const out = {};
  for (const entry of tbl) {
    if (!entry.expression) continue;
    // Skip entries that don't apply to the current contract type.
    const applies = entry.appliesTo || 'both';
    if (applies !== 'both' && applies !== ct) continue;
    try {
      const val = evalExpression(entry.expression, raw);
      if (val !== undefined && val !== '' && val !== '0') out[entry.internalKey] = val;
    } catch (_) {}
  }
  return out;
}

function parseCsv(text, translation, contractType) {
  const rows = Papa.parse(text.trim(), { skipEmptyLines: true }).data;

  // Route to legacy parser when the file is a Makello database export
  if (isLegacyCsv(rows)) {
    return { data: parseLegacyCsv(rows, translation, contractType), legacy: true };
  }

  const out = {};
  for (const row of rows) {
    if (row.length < 2) continue;
    const c0 = String(row[0]).trim(), c1 = String(row[1]).trim();
    if (c0.toLowerCase() === 'description' || c0.toLowerCase() === 'field') continue;
    let key, value;
    if (row.length >= 3 && c1.includes('{{')) {
      key = c1.replace(/\{\{|\}\}/g, '').trim(); value = String(row[2]).trim();
    } else { key = c0; value = c1; }
    if (key) out[key] = value;
  }
  return { data: out, legacy: false };
}
function loadStableFromStorage() {
  try { const s = localStorage.getItem(LS_KEY); if (s) return { ...HARDCODED_DEFAULTS, ...JSON.parse(s) }; }
  catch (_) {}
  return null;
}
function saveStableToStorage(vals) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(vals)); } catch (_) {}
}
function downloadBlankCsv() {
  const lines = ['description,placeholder,value',
    ...FIELDS.filter(f => f.type === 'job' && f.widget !== 'photo').map(f => {
      const d = f.label.includes(',') ? `"${f.label}"` : f.label;
      return `${d},{{${f.key}}},`;
    })];
  saveAs(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), 'contract_input_blank.csv');
}

// ─────────────────────────────────────────────────────────────────────────────
// File-save helper — uses File System Access API when available so the user
// can choose the destination directory; falls back to FileSaver otherwise.
// ─────────────────────────────────────────────────────────────────────────────

async function saveWithPicker(content, filename, mimeType) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const ext    = filename.split('.').pop().toLowerCase();
      const accept = ext === 'csv'  ? { 'text/csv':           ['.csv']  }
                   : ext === 'json' ? { 'application/json':   ['.json'] }
                   :                  { 'application/octet-stream': [] };
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: filename, accept }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([content], { type: mimeType }));
      await writable.close();
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;   // user hit Cancel
      // Any other error → fall through to FileSaver
    }
  }
  saveAs(new Blob([content], { type: mimeType }), filename);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  job:    { bg: '#ffffff', bdr: '#e2e8f0', lbl: '#4a5568' },
  stable: { bg: '#ebf8ff', bdr: '#bee3f8', lbl: '#2c5282' },
  calc:   { bg: '#fffff0', bdr: '#faf089', lbl: '#975a16' },
};

// Visual tokens for each fillStatus × fill-state combination.
// leftBdr: the 3px left accent on the card.
// pillText / pillColor: compact status label shown when empty.
//
// 'upload' and 'manual' render identically — both mean "required input" from
//   the user's perspective. The distinction is semantic only (upload = can come
//   from a Makello/CSV file; manual = must be typed or added to the CSV) but
//   there is no meaningful visual difference to show.
// 'optional'   — legitimately blank. Grey.
// 'at_signing' — intentionally blank until contract execution. Deep blue,
//   clearly distinct from the filled green.
const REQUIRED_STATUS = { emptyBdr: '#ed8936', filledBdr: '#48bb78', pillText: '⬆ required', pillColor: '#c05621' };
const FILL_STATUS_CONFIG = {
  upload:     REQUIRED_STATUS,
  manual:     REQUIRED_STATUS,
  optional:   { emptyBdr: '#cbd5e0', filledBdr: '#cbd5e0', pillText: 'optional',    pillColor: '#718096' },
  at_signing: { emptyBdr: '#2b6cb0', filledBdr: '#48bb78', pillText: 'at signing',  pillColor: '#2b6cb0' },
};

function UnitBadge({ unit }) {
  if (!unit) return null;
  const [label, bg, color] = unit === 'pct'
    ? ['%', '#e9d8fd', '#553c9a']
    : ['$', '#c6f6d5', '#276749'];
  return (
    <span style={{ display: 'inline-block', marginLeft: 5, padding: '0 5px', fontSize: 10,
                   borderRadius: 3, background: bg, color, fontWeight: 700, verticalAlign: 'middle' }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field widgets
// ─────────────────────────────────────────────────────────────────────────────

function FieldShell({ field, value, dimmed, children }) {
  const col  = C[field.type] || C.job;
  const fsc  = field.fillStatus ? FILL_STATUS_CONFIG[field.fillStatus] : null;
  const filled = fsc && String(value ?? '').trim() !== '';
  const leftBdr = fsc ? (filled ? fsc.filledBdr : fsc.emptyBdr) : null;

  return (
    <div style={{ background: col.bg,
                  border: `1px solid ${leftBdr || col.bdr}`,
                  borderLeft: `3px solid ${leftBdr || col.bdr}`,
                  borderRadius: 6, padding: '6px 10px',
                  opacity: dimmed ? 0.4 : 1, transition: 'opacity .2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 3, gap: 6 }}>
        <div style={{ fontSize: 11, color: col.lbl, lineHeight: 1.3 }}>
          {field.label}
          <UnitBadge unit={field.unit} />
          {field.type === 'calc' && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#b7791f' }}>= {field.formula}</span>
          )}
        </div>
        {fsc && !filled && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                         textTransform: 'uppercase', color: fsc.pillColor,
                         whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fsc.pillText}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputBase = { width: '100%', border: 'none', background: 'transparent',
                    padding: '2px 0', fontSize: 13, color: '#1a202c', outline: 'none' };

function SelectField({ field, value, locked, onChange }) {
  return (
    <FieldShell field={field} value={value}>
      <select value={value} disabled={locked} onChange={e => onChange && onChange(e.target.value)}
        style={{ ...inputBase, borderBottom: locked ? 'none' : `1px solid ${C[field.type]?.bdr || '#e2e8f0'}`,
                 cursor: locked ? 'default' : 'pointer', appearance: locked ? 'none' : 'auto' }}>
        {TAX_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || '— select —'}</option>)}
      </select>
    </FieldShell>
  );
}

function ToggleField({ field, value, locked, onChange }) {
  return (
    <FieldShell field={field} value={value}>
      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        {(field.options || ['is', 'is not']).map(opt => {
          const active = value === opt;
          return (
            <button key={opt} disabled={locked} onClick={() => !locked && onChange && onChange(opt)}
              style={{ padding: '3px 14px', fontSize: 12, borderRadius: 4, fontWeight: active ? 600 : 400,
                       border: `1px solid ${active ? '#2b6cb0' : '#cbd5e0'}`,
                       background: active ? '#2b6cb0' : '#f7fafc',
                       color: active ? 'white' : '#4a5568',
                       cursor: locked ? 'default' : 'pointer', transition: 'all .15s' }}>
              {opt}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

function PhotoUploadField({ field, photo, onPhotoChange, csvPhotoName }) {
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const img = new window.Image();
      img.onload = () => {
        // Draw through a canvas to bake EXIF orientation into the pixels.
        // Raw JPEG files store pixels at the camera's physical sensor
        // orientation and use an EXIF tag to tell viewers to rotate on
        // display. Browsers honour the tag (naturalWidth/Height are the
        // correctly oriented dimensions), but Word embeds the raw bytes
        // and may ignore the tag, showing the image rotated. Drawing to
        // canvas strips EXIF and produces correctly-oriented pixel data.
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const correctedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        onPhotoChange({
          dataUrl:  correctedDataUrl,
          mimeType: 'image/jpeg',
          width:    img.naturalWidth,
          height:   img.naturalHeight,
          name:     file.name,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <FieldShell field={field} value={photo ? photo.name : ''}>
      {photo ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <img src={photo.dataUrl} alt="site" style={{ height: 64, maxWidth: 96, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
          <div style={{ fontSize: 11, color: '#4a5568', flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{photo.name}</div>
            <div style={{ color: '#718096' }}>{photo.width} × {photo.height} px</div>
          </div>
          <button onClick={() => onPhotoChange(null)}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0',
                     background: '#f7fafc', cursor: 'pointer', color: '#c53030' }}>
            ✕ Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
          style={{ marginTop: 4, padding: '10px 14px', border: '2px dashed #e2e8f0', borderRadius: 5,
                   textAlign: 'center', cursor: 'pointer', fontSize: 12, color: '#718096',
                   background: '#fafafa', transition: 'all .15s' }}
        >
          📷 Drop photo or click to upload (jpg / png / webp)
          {csvPhotoName ? (
            <div style={{ fontSize: 11, color: '#744210', marginTop: 4, background: '#fefcbf',
                          border: '1px solid #f6e05e', borderRadius: 3, padding: '2px 6px' }}>
              Last used: <strong>{csvPhotoName}</strong> — re-upload to include in contract
            </div>
          ) : (
            <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 3 }}>
              Filename saves to CSV as a reminder — photo must be re-uploaded each session
            </div>
          )}
        </div>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" ref={inputRef}
             style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </FieldShell>
  );
}

function FieldRow({ field, value, locked, onChange, dimmed, photo, onPhotoChange, csvPhotoName }) {
  if (field.widget === 'photo')  return <PhotoUploadField field={field} photo={photo} onPhotoChange={onPhotoChange} csvPhotoName={csvPhotoName} />;
  if (field.widget === 'select') return <SelectField field={field} value={value} locked={locked} onChange={onChange} />;
  if (field.widget === 'toggle') return <ToggleField  field={field} value={value} locked={locked} onChange={onChange} />;
  return (
    <FieldShell field={field} value={value} dimmed={dimmed}>
      <input type="text" value={value} readOnly={locked}
        onChange={e => onChange && onChange(e.target.value)}
        onBlur={() => { if (!locked && field.unit && onChange) { const n = normalizeValue(value, field.unit); if (n !== value) onChange(n); } }}
        style={{ ...inputBase, borderBottom: locked ? 'none' : `1px solid ${C[field.type]?.bdr || '#e2e8f0'}`,
                 cursor: locked ? 'default' : 'text' }} />
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility button
// ─────────────────────────────────────────────────────────────────────────────

function Btn({ onClick, children, title, bg = '#edf2f7', bdr = '#cbd5e0', color = '#2d3748' }) {
  return (
    <button onClick={onClick} title={title} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 4,
      cursor: 'pointer', border: `1px solid ${bdr}`, background: bg, color, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-render highlight helpers (sentinel-based)
// ─────────────────────────────────────────────────────────────────────────────

// Unicode interlinear annotation markers — safe sentinels that will never
// appear in contract text and are not escaped by docxtemplater.
const MARK_S = '￹';
const MARK_E = '￺';

// Add yellow highlight to runs that contain sentinel markers, splitting any run
// where the sentinel is mixed with surrounding text into separate runs so that
// only the filled value itself is highlighted.
// w:highlight inserted before </w:rPr> to respect the OOXML element sequence.
function applyHighlightAndStripMarkers(xml) {
  xml = xml.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, run => {
    if (!run.includes(MARK_S) && !run.includes(MARK_E)) return run;

    const openTag  = (run.match(/^(<w:r(?:\s[^>]*)?>)/) || ['', '<w:r>'])[1];
    const rPrBlock = (run.match(/(<w:rPr(?:\/>|>[\s\S]*?<\/w:rPr>))/) || ['', ''])[1];
    const tMatch   = run.match(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/);

    if (!tMatch) return run.split(MARK_S).join('').split(MARK_E).join('');

    const tAttrOrig = tMatch[1];
    const text      = tMatch[2];

    if (!text.includes(MARK_S)) return run.split(MARK_S).join('').split(MARK_E).join('');

    // Build highlighted rPr (w:highlight goes before </w:rPr>)
    const hiRPr = (!rPrBlock || rPrBlock === '<w:rPr/>')
      ? '<w:rPr><w:highlight w:val="yellow"/></w:rPr>'
      : rPrBlock.replace('</w:rPr>', '<w:highlight w:val="yellow"/></w:rPr>');

    // Split text at sentinel boundaries: [before, ￹value￺, after, ...]
    const parts = text.split(/([￹][^￺]*[￺])/);

    return parts.filter(p => p !== '').map(part => {
      const isValue = part.startsWith(MARK_S);
      const content = isValue ? part.slice(1, -1) : part;
      if (!content) return '';
      const thisRPr = isValue ? hiRPr : rPrBlock;
      const tAttr   = (content.startsWith(' ') || content.endsWith(' '))
        ? ' xml:space="preserve"' : (tAttrOrig || '');
      return `${openTag}${thisRPr}<w:t${tAttr}>${content}</w:t></w:r>`;
    }).join('');
  });
  return xml.split(MARK_S).join('').split(MARK_E).join('');
}

// Fix "1 years" → "1 year" in paragraphs where a value of "1" was filled.
// Must be called while sentinels are still in the XML.
// Targets only the first " years..." run that follows the "1" value within
// the same paragraph — other "years" text in the document is untouched.
function fixSingularYears(xml) {
  const s1 = MARK_S + '1' + MARK_E;
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, para => {
    const idx = para.indexOf(s1);
    if (idx === -1) return para;
    const before = para.slice(0, idx + s1.length);
    const after  = para.slice(idx + s1.length)
      .replace(/<w:t([^>]*)>( years)([^<]*)<\/w:t>/, '<w:t$1> year$3</w:t>');
    return before + after;
  });
}

// Inject a right-aligned page-number footer into an outputZip.
// Uses footer_pgnum.xml as the filename to avoid overwriting any footer1.xml
// (or other numbered footers) that may already exist in the template.
function addPageNumbersToZip(zip) {
  const RID   = 'rIdPgFt1';
  const FNAME = 'footer_pgnum.xml';
  if (zip.file('word/document.xml').asText().includes(RID)) return; // already present

  const footerXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:p><w:pPr><w:jc w:val="right"/></w:pPr>',
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>',
    '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>',
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>',
    '<w:r><w:t>1</w:t></w:r>',
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>',
    '</w:p></w:ftr>',
  ].join('');
  zip.file(`word/${FNAME}`, footerXml);

  let rels = zip.file('word/_rels/document.xml.rels').asText();
  rels = rels.replace('</Relationships>',
    `<Relationship Id="${RID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="${FNAME}"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', rels);

  let ct = zip.file('[Content_Types].xml').asText();
  ct = ct.replace('</Types>',
    `<Override PartName="/word/${FNAME}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
  zip.file('[Content_Types].xml', ct);

  let docXml = zip.file('word/document.xml').asText();
  docXml = docXml.replace(/<\/w:sectPr>/g,
    `<w:footerReference w:type="default" r:id="${RID}"/></w:sectPr>`);
  zip.file('word/document.xml', docXml);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-flight validation
// ─────────────────────────────────────────────────────────────────────────────

// Required fields are those with fillStatus 'upload' or 'manual'.
// 'optional' and 'at_signing' fields are never counted as missing.
function getMissingFields(allValues, translation) {
  return FIELDS.filter(f => {
    if (f.type !== 'job') return false;
    if (f.batteryOnly) return false; // battery fields checked separately
    const tEntry = translation ? translation.find(t => t.internalKey === f.key) : null;
    const status = tEntry?.requiredStatus || f.fillStatus || 'optional';
    if (status !== 'upload' && status !== 'manual') return false;
    const val = allValues[f.key];
    if (!val || String(val).trim() === '') return true;
    return false;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [stable,         setStable]         = useState(HARDCODED_DEFAULTS);
  const [job,            setJob]            = useState(() => Object.fromEntries(JOB_KEYS.map(k => [k, ''])));
  const [sitePhoto,      setSitePhoto]      = useState(null);   // { dataUrl, mimeType, width, height, name }
  const [originalJob,    setOriginalJob]    = useState(null);
  const [stableUnlocked, setStableUnlocked] = useState(false);
  const [csvFile,        setCsvFile]        = useState(null);
  const [dragOver,       setDragOver]       = useState(false);
  const [status,         setStatus]         = useState('');
  const [generating,     setGenerating]     = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [diagErrors,     setDiagErrors]     = useState([]);   // unpacked docxtemplater errors
  const [showHelp,       setShowHelp]       = useState(false);
  const [contractType,   setContractType]   = useState('pv_only'); // 'pv_only' | 'pv_battery'
  const [translation,    setTranslation]    = useState(() => {
    try {
      const s = localStorage.getItem(LS_TRANSLATION_KEY);
      if (s) {
        const saved = JSON.parse(s);
        // Append any DEFAULT_TRANSLATION entries missing from the saved table
        // (handles code updates that add new internal keys without clearing localStorage).
        const savedKeys = new Set(saved.map(e => e.internalKey));
        const additions = DEFAULT_TRANSLATION.filter(e => !savedKeys.has(e.internalKey));
        return additions.length ? [...saved, ...additions] : saved;
      }
    } catch (_) {}
    return DEFAULT_TRANSLATION;
  });
  function saveTranslation(t) { setTranslation(t); try { localStorage.setItem(LS_TRANSLATION_KEY, JSON.stringify(t)); } catch (_) {} }
  const [includeAddendum, setIncludeAddendum] = useState(false);
  const [cleanCopy,      setCleanCopy]      = useState(false);
  const [outputPdf,      setOutputPdf]      = useState(false);

  const csvInputRef  = useRef(null);
  const importDefRef = useRef(null);
  const translationInputRef = useRef(null);

  // ── On mount: localStorage → contract_defaults.json → hardcoded ─────────
  useEffect(() => {
    const fromStorage = loadStableFromStorage();
    if (fromStorage) { setStable(fromStorage); setDefaultsLoaded(true); return; }
    fetch('./contract_defaults.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStable(prev => ({ ...HARDCODED_DEFAULTS, ...data })); setDefaultsLoaded(true); })
      .catch(() => setDefaultsLoaded(true));
  }, []);

  useEffect(() => { if (defaultsLoaded) saveStableToStorage(stable); }, [stable, defaultsLoaded]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const calc      = calcFields({ ...stable, ...job });
  const allValues = { ...stable, ...job, ...calc };

  // ── CSV load ─────────────────────────────────────────────────────────────
  function onTranslationFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = importTranslationCsv(ev.target.result);
      if (!parsed) { setStatus('✗ Translation file invalid — check column headers'); return; }
      saveTranslation(parsed);
      setStatus('✓ Translation table loaded and saved as default (' + parsed.length + ' entries)');
    };
    reader.readAsText(file); e.target.value = '';
  }
  function applyCsvData(text, fname) {
    const { data: parsed, legacy } = parseCsv(text, translation, contractType);
    const newJob = { ...job };
    let matched = 0;
    for (const key of JOB_KEYS) {
      if (parsed[key] !== undefined && parsed[key] !== '') {
        const field = FIELDS.find(f => f.key === key);
        let v = normalizeValue(parsed[key], field?.unit);
        if (field?.widget === 'select') v = normalizeSelectValue(v, TAX_STATUS_OPTIONS, TAX_STATUS_ALIASES);
        if (field?.widget === 'toggle') v = normalizeSelectValue(v, field.options);
        newJob[key] = v;
        matched++;
      }
    }
    setJob(newJob); setOriginalJob({ ...newJob }); setCsvFile(fname);
    const fmtNote = legacy ? ' (Makello proposal CSV — partial data)' : '';
    setStatus(matched > 0
      ? `✓ ${fname}${fmtNote} — ${matched} field${matched !== 1 ? 's' : ''} populated`
      : `⚠ ${fname}${fmtNote} — no matching fields found`);
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

  // ── Export CSV ───────────────────────────────────────────────────────────
  async function exportCsv() {
    const today = todayISO();
    const esc   = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = ['description,placeholder,value,notes'];
    for (const f of FIELDS.filter(fi => fi.type === 'job')) {
      let cur, note;
      if (f.widget === 'photo') {
        cur  = sitePhoto ? sitePhoto.name : '';
        note = '';
      } else {
        cur  = job[f.key] ?? '';
        const orig = originalJob ? (originalJob[f.key] ?? '') : '';
        note = (originalJob !== null && cur !== orig) ? `changed ${today}` : '';
      }
      lines.push(`${esc(f.label)},{{${f.key}}},${esc(cur)},${esc(note)}`);
    }
    const slug    = (job.customer_name || 'contract').replace(/[^a-zA-Z0-9]+/g, '_');
    const fname   = `contract_input_${slug}.csv`;
    const content = '\uFEFF' + lines.join('\n');
    const saved   = await saveWithPicker(content, fname, 'text/csv;charset=utf-8');
    if (saved) setStatus('✓ CSV exported');
  }

  // ── Stable defaults ──────────────────────────────────────────────────────
  async function saveDefaultsToFile() {
    const content = JSON.stringify(stable, null, 2);
    const saved   = await saveWithPicker(content, 'contract_defaults.json', 'application/json');
    if (saved) setStatus('contract_defaults.json saved — commit & push to share across computers');
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

  // ── Generate contract ────────────────────────────────────────────────────
  // ── Merge addendum docx into a PizZip that already contains the rendered main contract ──
  // Remaps addendum numbering IDs so they don't collide with the main document's lists.
  async function mergeAddendumInto(outputZip, mergeData) {
    const addResp = await fetch('./addendum_template.docx?v=0.4.6');
    if (!addResp.ok) throw new Error(`Addendum template not found (HTTP ${addResp.status})`);
    const addBuf = await addResp.arrayBuffer();

    // Render addendum placeholders (only installation_deadline_months matters here)
    const addRenderZip = new PizZip(addBuf);
    const addDoc = new window.docxtemplater(addRenderZip, {
      delimiters: { start: '{{', end: '}}' },
    });
    addDoc.render({ installation_deadline_months: mergeData.installation_deadline_months || '6' });

    // ── Remap numbering IDs to avoid collision with main doc ──────────────────
    let mainNumXml = outputZip.file('word/numbering.xml')
      ? outputZip.file('word/numbering.xml').asText() : null;
    let addNumXml = addRenderZip.file('word/numbering.xml')
      ? addRenderZip.file('word/numbering.xml').asText() : null;

    let numOffset = 0;

    if (mainNumXml && addNumXml) {
      // Find the highest abstractNumId and numId currently in the main document
      const mainAbsIds = [...mainNumXml.matchAll(/w:abstractNumId="(\d+)"/g)].map(m => parseInt(m[1]));
      const mainNumIds = [...mainNumXml.matchAll(/<w:num\s+w:numId="(\d+)"/g)].map(m => parseInt(m[1]));
      const maxAbsId  = Math.max(0, ...mainAbsIds);
      const maxNumId  = Math.max(0, ...mainNumIds);
      const absOffset = maxAbsId + 1;
      numOffset = maxNumId + 1;

      // In addendum numbering.xml, offset abstractNum IDs and their cross-references
      // Pattern 1: <w:abstractNum w:abstractNumId="N">
      addNumXml = addNumXml.replace(/(<w:abstractNum\s+w:abstractNumId=")(\d+)(")/g,
        (_, pre, id, suf) => `${pre}${parseInt(id) + absOffset}${suf}`);
      // Pattern 2: <w:abstractNumId w:val="N"/> inside <w:num> (references to abstractNum)
      addNumXml = addNumXml.replace(/(<w:abstractNumId\s+w:val=")(\d+)(")/g,
        (_, pre, id, suf) => `${pre}${parseInt(id) + absOffset}${suf}`);
      // Pattern 3: <w:num w:numId="N">
      addNumXml = addNumXml.replace(/(<w:num\s+w:numId=")(\d+)(")/g,
        (_, pre, id, suf) => `${pre}${parseInt(id) + numOffset}${suf}`);

      // Extract abstractNum and num elements from addendum and append to main numbering.xml
      const addAbstractNums = [...addNumXml.matchAll(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g)].map(m => m[0]);
      const addNums         = [...addNumXml.matchAll(/<w:num\b[\s\S]*?<\/w:num>/g)].map(m => m[0]);
      mainNumXml = mainNumXml.replace('</w:numbering>',
        addAbstractNums.join('\n') + '\n' + addNums.join('\n') + '\n</w:numbering>');
      outputZip.file('word/numbering.xml', mainNumXml);
    }

    // ── Extract addendum body content ─────────────────────────────────────────
    let addDocXml = addDoc.getZip().file('word/document.xml').asText();
    const bodyStart = addDocXml.indexOf('<w:body>') + '<w:body>'.length;
    const bodyEnd   = addDocXml.lastIndexOf('</w:body>');
    let addBody = addDocXml.slice(bodyStart, bodyEnd);
    // Strip the addendum's sectPr (we keep the main document's sectPr)
    const sectPrIdx = addBody.lastIndexOf('<w:sectPr');
    if (sectPrIdx !== -1) addBody = addBody.slice(0, sectPrIdx);

    // Remap numId references in the addendum body paragraphs
    if (numOffset > 0) {
      addBody = addBody.replace(/(<w:numId\s+w:val=")(\d+)(")/g,
        (_, pre, id, suf) => `${pre}${parseInt(id) + numOffset}${suf}`);
    }

    // ── Insert page break + addendum body before main document's sectPr ───────
    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    let mainDocXml = outputZip.file('word/document.xml').asText();
    const mainSectPrIdx = mainDocXml.lastIndexOf('<w:sectPr');
    const insertAt = mainSectPrIdx !== -1 ? mainSectPrIdx : mainDocXml.lastIndexOf('</w:body>');
    mainDocXml = mainDocXml.slice(0, insertAt) + pageBreak + addBody + mainDocXml.slice(insertAt);
    outputZip.file('word/document.xml', mainDocXml);
  }

  // ── PDF image compression helpers ───────────────────────────────────────
  // mammoth embeds photos as full-resolution base64 data URIs. A phone photo
  // can be 4 MB+ of base64, which makes Chrome's PDF output too complex for
  // Adobe Reader to parse. Downscale to 1200 px wide / 82 % JPEG quality
  // before printing — plenty of resolution for a 4" print image at 300 DPI.

  function compressDataUrl(src, maxW, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(src); // fallback: keep original on error
      img.src = src;
    });
  }

  async function compressHtmlImages(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    for (const img of div.querySelectorAll('img[src^="data:"]')) {
      img.src = await compressDataUrl(img.src, 1200, 0.82);
    }
    return div.innerHTML;
  }

  async function generateContract(isDraft = false) {
    setDiagErrors([]);

    // ── Pre-flight: check required fields before touching the template ──────
    const missing = getMissingFields(allValues, translation);
    if (!isDraft && missing.length > 0) {
      setStatus(`✗ ${missing.length} required field${missing.length !== 1 ? 's' : ''} empty — fill them in and try again`);
      setDiagErrors(missing.map(f => ({ id: 'missing', tag: f.key, offset: '', message: f.label })));
      return;
    }

    setGenerating(true); setStatus('Loading template…');
    try {
      const templateFile = contractType === 'pv_battery'
        ? './Wipomo_Contract_Template_Battery.docx?v=0.4.6'
        : './Wipomo_Contract_Template.docx?v=0.4.6';
      const resp = await fetch(templateFile);
      if (!resp.ok) throw new Error(`Template not found (HTTP ${resp.status})`);

      // Keep the raw bytes — we'll open TWO PizZips from this buffer:
      //   renderZip  → fed to docxtemplater just to produce rendered document.xml
      //   outputZip  → fresh copy of the original; only document.xml is replaced
      // This means every other file (fonts, styles, numbering …) is byte-for-byte
      // from the original template and never recompressed by PizZip.
      const templateBuf = await resp.arrayBuffer();

      // 1. Render placeholders
      const renderZip = new PizZip(templateBuf);
      const doc = new window.docxtemplater(renderZip, {
        delimiters: { start: '{{', end: '}}' },
      });
      const mergeData = normalizeAllValues({ ...allValues, site_photo: '' });

      // Map yes/no → is/is not for the prevailing wage contract clause
      if (mergeData.prevailing_wage in PREVAILING_WAGE_OUTPUT)
        mergeData.prevailing_wage = PREVAILING_WAGE_OUTPUT[mergeData.prevailing_wage];

      // Tax status resolution: customer_tax_status_other is UI-only.
      // If "Other" is selected, promote whatever was typed to customer_tax_status.
      // Always clear customer_tax_status_other so it never appears in the document.
      if (mergeData.customer_tax_status === 'Other')
        mergeData.customer_tax_status = mergeData.customer_tax_status_other || '';
      mergeData.customer_tax_status_other = '';

      // Replace blank fields with underscores so the printed document has space
      // to fill in by hand. Skips site_photo (binary), non-job/calc fields, and
      // input-only fields that have already been resolved above.
      const BLANK_LINE = '___________';
      const NO_UNDERSCORE = new Set(['customer_tax_status_other']);
      for (const f of FIELDS) {
        if (f.type !== 'job' && f.type !== 'calc') continue;
        if (f.widget === 'photo') continue;
        if (NO_UNDERSCORE.has(f.key)) continue;
        if (!mergeData[f.key]) mergeData[f.key] = BLANK_LINE;
      }

      // Wrap every value with sentinel markers so post-render processing can
      // locate exactly which runs were filled (for highlighting and year fix).
      const renderData = {};
      for (const [k, v] of Object.entries(mergeData)) {
        renderData[k] = (typeof v === 'string' && v !== '') ? MARK_S + v + MARK_E : v;
      }
      doc.render(renderData);

      // 2. Extract rendered document.xml, strip comment anchors
      let docXml = doc.getZip().file('word/document.xml').asText();
      docXml = docXml
        .replace(/<w:commentRangeStart\b[^/]*\/>/g, '')
        .replace(/<w:commentRangeEnd\b[^/]*\/>/g, '')
        .replace(/<w:commentReference\b[^/]*\/>/g, '');  // remove inline, regardless of run contents

      // Fix "1 years" → "1 year" (sentinels still in place for precision)
      docXml = fixSingularYears(docXml);

      // Highlight filled values then strip sentinels, or just strip for clean copy
      if (!cleanCopy) {
        docXml = applyHighlightAndStripMarkers(docXml);
      } else {
        docXml = docXml.split(MARK_S).join('').split(MARK_E).join('');
      }

      // 3. Patch into a fresh copy of the original ZIP
      let outputZip = new PizZip(templateBuf);
      outputZip.file('word/document.xml', docXml);

      // 4. Remove leftover template comment files + their references
      ['word/comments.xml', 'word/commentsExtended.xml', 'word/commentsIds.xml']
        .forEach(f => { try { outputZip.remove(f); } catch (_) {} });
      let rels = outputZip.file('word/_rels/document.xml.rels').asText();
      rels = rels.replace(/<Relationship\b[^>]*[Cc]omments[^>]*\/>/g, '');
      outputZip.file('word/_rels/document.xml.rels', rels);
      let ct = outputZip.file('[Content_Types].xml').asText();
      ct = ct.replace(/<Override\b[^>]*[Cc]omments[^>]*\/>/g, '');
      outputZip.file('[Content_Types].xml', ct);

      // 5a. Add page numbers to footer
      addPageNumbersToZip(outputZip);

      // 5b. Optionally merge addendum
      if (includeAddendum) {
        setStatus('Merging addendum…');
        await mergeAddendumInto(outputZip, mergeData);
      }

      // 5c. Generate — no compression override so PizZip preserves each file's
      //     original compression method (fonts stay as they were in the template)
      const out    = outputZip.generate({ type: 'uint8array' });
      let docxBlob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      if (sitePhoto) {
        setStatus('Adding site photo…');
        docxBlob = await addPhotoToDocx(docxBlob, sitePhoto);
      }

      const slug   = (allValues.customer_name || 'Contract').replace(/[^a-zA-Z0-9]+/g, '_');
      const ds     = (allValues.contract_date || allValues.effective_date || '').replace(/[^a-zA-Z0-9]+/g, '-');
      const prefix = isDraft ? 'DRAFT_' : '';
      const baseName = `${prefix}Wipomo_Contract_${slug}${ds ? '_' + ds : ''}`;

      if (outputPdf) {
        setStatus('Converting to HTML…');
        const arrayBuffer = await docxBlob.arrayBuffer();
        const { value: rawHtml } = await mammoth.convertToHtml({ arrayBuffer });
        setStatus('Compressing images…');
        const html = await compressHtmlImages(rawHtml);
        setStatus('Opening print dialog…');
        // mammoth does not preserve w:jc alignment or w:sz font size for
        // Normal-style paragraphs. We post-process the DOM to restore them.
        // Guard against DOMContentLoaded having already fired (document.write
        // parses synchronously, so readyState may already be 'complete').
        const titleFixScript = `
          (function () {
            function fixTitle() {
              document.querySelectorAll('p').forEach(function (p) {
                var text = p.textContent.trim();
                var only = p.childElementCount === 1 ? p.children[0] : null;
                if (only && only.tagName === 'STRONG'
                    && text === text.toUpperCase() && text.length > 40) {
                  p.style.textAlign = 'center';
                  p.style.fontSize  = '14pt';
                }
              });
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', fixTitle);
            } else {
              fixTitle();
            }
          })();
        `;
        const printHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
          <title>${baseName}</title>
          <style>
            /* Values sourced directly from Wipomo_Contract_Template.docx styles:
               docDefaults: Arial 11pt, space-after 10pt (200 twips), line 1.15
               Heading1:    Calibri bold #366091 14pt, space-before 24pt        */
            @page { size: letter; margin: 0.75in; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11pt;
                   line-height: 1.15; margin: 0; padding: 0; color: #000; }
            p  { margin: 0 0 10pt; orphans: 3; widows: 3; }
            ul, ol { margin: 0 0 10pt; padding-left: 24pt; }
            li { margin: 0 0 6pt; }
            h1 { font-family: Calibri, 'Trebuchet MS', Arial, sans-serif;
                 font-size: 14pt; font-weight: bold; color: #366091;
                 margin: 24pt 0 0; page-break-after: avoid; }
            h2 { font-size: 13pt; font-weight: bold;
                 margin: 16pt 0 0; page-break-after: avoid; }
            h3 { font-size: 11pt; font-weight: bold;
                 margin: 10pt 0 0; page-break-after: avoid; }
            table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
            td, th { border: 1px solid #000; padding: 3pt 5pt; }
            tr { page-break-inside: avoid; }
            img { max-width: 50%; height: auto; display: block; margin: 6pt auto 14pt; }
          </style>
        </head><body>${html}<script>${titleFixScript}<\/script></body></html>`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        // Delay lets layout settle before print dialog fires
        setTimeout(() => { printWindow.print(); }, 800);
      } else {
        saveAs(docxBlob, `${baseName}.docx`);
      }

      if (isDraft) {
        setStatus(`✓ Draft prepared — ${missing.length} field${missing.length !== 1 ? 's' : ''} left blank`);
      } else {
        const fmt = outputPdf ? 'PDF' : 'contract';
        setStatus(
          sitePhoto && includeAddendum ? `✓ ${fmt} + addendum with photo generated` :
          sitePhoto                    ? `✓ ${fmt} with site photo generated` :
          includeAddendum              ? `✓ ${fmt} + addendum generated` :
                                         `✓ ${fmt.charAt(0).toUpperCase() + fmt.slice(1)} generated`
        );
      }

    } catch (err) {
      console.error('Generation error:', err);

      // Unpack docxtemplater Multi error
      const subErrors = err?.properties?.errors;
      if (Array.isArray(subErrors) && subErrors.length > 0) {
        setDiagErrors(subErrors.map(e => ({
          id:      e?.properties?.id      ?? '?',
          tag:     e?.properties?.xtag    ?? e?.properties?.tag ?? '',
          offset:  e?.properties?.offset  ?? '',
          message: e?.message             ?? String(e),
        })));
        setStatus(`✗ Template error — ${subErrors.length} problem${subErrors.length !== 1 ? 's' : ''} found (see below)`);
      } else {
        setDiagErrors([{ id: 'error', tag: '', offset: '', message: err.message }]);
        setStatus(`✗ ${err.message}`);
      }
    } finally { setGenerating(false); }
  }

  const setJobField    = (key, val) => setJob(prev    => ({ ...prev, [key]: val }));
  // When tax status changes away from Other, clear the specify-type field
  const onTaxStatusChange = (val) => setJob(prev => ({
    ...prev,
    customer_tax_status: val,
    customer_tax_status_other: val === 'Other' ? prev.customer_tax_status_other : '',
  }));
  const setStableField = (key, val) => setStable(prev => ({ ...prev, [key]: val }));
  const statusIsGood   = status.startsWith('✓');
  const missingCount   = getMissingFields(allValues, translation).length;
  const readyToGenerate = missingCount === 0;
  const taxIsOther     = job.customer_tax_status === 'Other';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#1a365d', color: 'white', padding: '10px 20px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Makello Contract Tool (Beta)</span>
        <span style={{ fontSize: 11, opacity: 0.45 }}>v0.4.7</span>
        {/* Contract type selector */}
        <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.35)', fontSize: 12 }}>
          {[['pv_only', 'PV Only'], ['pv_battery', 'PV + Battery']].map(([val, label]) => (
            <button key={val} onClick={() => setContractType(val)}
              style={{ padding: '3px 11px', border: 'none', cursor: 'pointer',
                       background: contractType === val ? 'rgba(255,255,255,0.25)' : 'transparent',
                       color: 'white', fontWeight: contractType === val ? 700 : 400 }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowHelp(h => !h)} title="Help"
          style={{ padding: '2px 10px', fontSize: 12, borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)',
                   background: showHelp ? 'rgba(255,255,255,0.2)' : 'transparent',
                   color: 'white', cursor: 'pointer' }}>
          {showHelp ? '✕ Help' : '? Help'}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Always-visible readiness pill */}
          <span style={{ fontSize: 12, fontWeight: 600,
                         color: readyToGenerate ? '#9ae6b4' : '#fbd38d' }}>
            {readyToGenerate
              ? '✓ All fields ready'
              : `⚠ ${missingCount} field${missingCount !== 1 ? 's' : ''} need filling`}
          </span>
          {/* Action status — appears after operations */}
          {status && (
            <span style={{ fontSize: 12, color: statusIsGood ? '#9ae6b4' : '#feb2b2',
                           borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
              {status}
            </span>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, color: 'white', cursor: 'pointer',
                          opacity: generating ? 0.5 : 1 }}>
            <input type="checkbox" checked={includeAddendum}
                   onChange={e => setIncludeAddendum(e.target.checked)}
                   disabled={generating}
                   style={{ width: 14, height: 14, cursor: 'pointer' }} />
            Include Addendum
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, color: 'white', cursor: 'pointer',
                          opacity: generating ? 0.5 : 1 }}
                 title="Clean Copy: output without yellow field highlighting">
            <input type="checkbox" checked={cleanCopy}
                   onChange={e => setCleanCopy(e.target.checked)}
                   disabled={generating}
                   style={{ width: 14, height: 14, cursor: 'pointer' }} />
            Clean Copy
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, color: 'white', cursor: 'pointer',
                          opacity: generating ? 0.5 : 1 }}
                 title="Output as PDF — opens browser print dialog (Save as PDF). Produces real searchable text, not a scanned image.">
            <input type="checkbox" checked={outputPdf}
                   onChange={e => setOutputPdf(e.target.checked)}
                   disabled={generating}
                   style={{ width: 14, height: 14, cursor: 'pointer' }} />
            Output PDF
          </label>
          {!readyToGenerate && (
            <button onClick={() => generateContract(true)} disabled={generating} style={{
              padding: '6px 18px', fontSize: 13, fontWeight: 600,
              background: generating ? '#4a5568' : '#744210',
              color: 'white', border: '1px solid #d69e2e', borderRadius: 5,
              cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? 'Generating…' : '⬇ Prepare Draft'}
            </button>
          )}
          <button onClick={() => generateContract(false)} disabled={generating} style={{
            padding: '6px 22px', fontSize: 13, fontWeight: 600,
            background: generating ? '#4a5568' : '#2b6cb0',
            color: 'white', border: 'none', borderRadius: 5,
            cursor: generating ? 'not-allowed' : 'pointer' }}>
            {generating ? 'Generating…' : '⬇ Generate Contract'}
          </button>
        </div>
      </div>

      {/* ── Help panel ─────────────────────────────────────────────────── */}
      {showHelp && (
        <div style={{ background: '#ebf8ff', borderBottom: '2px solid #bee3f8', padding: '16px 24px' }}>
          <div style={{ maxWidth: 1200, display: 'grid', gridTemplateColumns: '1.2fr 0.85fr 1.05fr 1.3fr 0.95fr', gap: 22 }}>

            {/* Col 1 — Input CSV */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>Input CSV — Three Formats Accepted</div>

              <div style={{ fontWeight: 600, fontSize: 12, color: '#2c5282', margin: '0 0 3px' }}>Format 1 — Contract Input CSV (native)</div>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                A 3-column file with one row per field:
              </p>
              <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%', marginBottom: 6 }}>
                <thead><tr style={{ background: '#bee3f8' }}>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>Col A</th>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>Col B</th>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>Col C</th>
                </tr></thead>
                <tbody><tr>
                  <td style={{ padding: '3px 6px', color: '#4a5568' }}>Description</td>
                  <td style={{ padding: '3px 6px', fontFamily: 'monospace' }}>{'{{placeholder}}'}</td>
                  <td style={{ padding: '3px 6px', color: '#4a5568' }}>Value</td>
                </tr></tbody>
              </table>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Click <strong>Blank CSV</strong> to download a starter file. Fill Column C, save as CSV, then drag-and-drop or click to load.
              </p>

              <div style={{ fontWeight: 600, fontSize: 12, color: '#2c5282', margin: '0 0 3px' }}>Format 2 — Sky-D export, old schema</div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Wide CSV where row 1 starts with <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>owner_name</code>. Key fields mapped: owner_name, address, total_flat_fee_adders_with_marketing_fee, system_size, battery_type.
              </p>

              <div style={{ fontWeight: 600, fontSize: 12, color: '#2c5282', margin: '0 0 3px' }}>Format 3 — Sky-D export, current schema</div>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Wide CSV where row 1 starts with <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>project_type</code>. More fields populate directly: customer_address, customer_tax_status, estimated_total, prevailing_wage, effective_date, contract_date, and the system size as a kW number.
              </p>

              <div style={{ fontSize: 12, color: '#744210', lineHeight: 1.5, background: '#fffbeb',
                            border: '1px solid #f6e05e', borderRadius: 3, padding: '6px 8px' }}>
                <strong>Site photo:</strong> a CSV can only store a filename, not the image itself. The photo must be re-uploaded every session before generating the contract.
              </div>
            </div>

            {/* Col 2 — Contractor defaults + Template & Output */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>Contractor Defaults</div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Stable fields (contractor name, address, license number, signatory, payment percentages, warranty years, escalation thresholds) are stored in the browser and in <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 3 }}>contract_defaults.json</code>.
              </p>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                <strong>Save Defaults:</strong> saves current values and downloads the file. Commit this file to GitHub so the same defaults load on any computer.
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                <strong>Import Defaults:</strong> loads a previously saved defaults file; useful when setting up on a new computer.
              </p>

              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>Template and Output</div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Two Word templates: <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>Wipomo_Contract_Template.docx</code> (PV Only) and <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>Wipomo_Contract_Template_Battery.docx</code> (PV+Battery). Placeholders use <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>{'{{double-brace}}'}</code> syntax.
              </p>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Check <strong>Clean Copy</strong> to suppress yellow field highlighting. Check <strong>Output PDF</strong> to open the filled contract in a browser print dialog instead of downloading a Word file; choose Save as PDF and keep the tab open until the dialog closes.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                <strong>Include Addendum:</strong> merges <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>addendum_template.docx</code> after the main contract. The addendum deadline field controls the installation window in Addendum §2.
              </p>
            </div>

            {/* Col 3 — Translation table */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>Translation Table</div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                The translation table maps each Makello CSV column name to the internal placeholder in the Word template. It is how the tool bridges the gap when Makello renames a field, or when a calculation is needed rather than a direct copy.
              </p>
              <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 600, color: '#2c5282' }}>Workflow: export, edit, upload</p>
              <ol style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 12, color: '#2d3748', lineHeight: 1.7 }}>
                <li>Click <strong>Export Translation</strong> to download the current table as a CSV.</li>
                <li>Open in Excel or Google Sheets. Edit the <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>client_field_expression</code> column to match the actual column names in your Makello export.</li>
                <li>Save as CSV, then click <strong>Import Translation</strong> to load the updated mapping. Changes take effect immediately for the next Generate.</li>
              </ol>
              <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 600, color: '#2c5282' }}>Column meanings</p>
              <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%', marginBottom: 5 }}>
                <thead><tr style={{ background: '#bee3f8' }}>
                  <th style={{ padding: '3px 5px', textAlign: 'left', width: '38%' }}>Column</th>
                  <th style={{ padding: '3px 5px', textAlign: 'left' }}>Meaning</th>
                </tr></thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>internal_key</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>The <code style={{ background: '#e2e8f0', padding: '1px 2px', borderRadius: 2, fontSize: 10 }}>{'{{placeholder}}'}</code> name in the Word template. Do not change this column.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>client_field_expression</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>A <code style={{ background: '#e2e8f0', padding: '1px 2px', borderRadius: 2, fontSize: 10 }}>[column_name]</code> reference or expression. Edit this when Makello renames a column.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>required_status</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>upload (comes from CSV), manual (entered each job), at_signing, or optional.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>applies_to</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Which contract type uses this row: both, pv_only, or pv_battery. Rows that do not match the selected type are skipped.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>heading_N, context_N</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Auto-generated from the template. A ★ in heading_1 means the same wording appears in both templates.</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: 0, fontSize: 11, color: '#4a5568', lineHeight: 1.4, fontStyle: 'italic' }}>
                Rows starting with # are comments and are skipped on import.
              </p>
            </div>

            {/* Col 4 — Expression language */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>Expression Language</div>
              <p style={{ margin: '0 0 5px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Each row in the translation table can use a full expression, not just a column name. Expressions support arithmetic operators (+, -, *, /), parentheses, numeric literals, field references, and the functions listed below.
              </p>
              <p style={{ margin: '0 0 5px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                <strong>Field references:</strong> wrap the CSV column name in square brackets. Example: <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>[system_size]</code>. Dollar signs, commas, and percent signs are stripped automatically before arithmetic. Example expression: <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 3 }}>[gross_cost] * 0.08</code>.
              </p>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#2c5282', margin: '0 0 4px' }}>Built-in functions</div>
              <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
                <thead><tr style={{ background: '#bee3f8' }}>
                  <th style={{ padding: '3px 5px', textAlign: 'left', width: '40%' }}>Function</th>
                  <th style={{ padding: '3px 5px', textAlign: 'left' }}>Description</th>
                </tr></thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>ROUND(x, n)</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Rounds x to n decimal places. <code style={{ background: '#e2e8f0', padding: '1px 2px', borderRadius: 2, fontSize: 10 }}>ROUND([price], 0)</code> rounds to a whole dollar.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>SUM(a, b, ...)</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Returns the sum of all arguments.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>AVERAGE(a, b, ...)</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Returns the arithmetic mean of all arguments.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>MIN(a, b, ...)</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Returns the smallest value among the arguments.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>MAX(a, b, ...)</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Returns the largest value among the arguments.</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 5px', fontFamily: 'monospace', fontSize: 10 }}>ABS(x)</td>
                    <td style={{ padding: '3px 5px', color: '#4a5568' }}>Returns the absolute value of x (always positive).</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0', background: '#f0f9ff' }}>
                    <td style={{ padding: '4px 5px', fontFamily: 'monospace', fontSize: 10, verticalAlign: 'top' }}>
                      BUILD_CAPACITY(<br/>
                      {'  '}[system_size],<br/>
                      {'  '}[initial_target_capacity]<br/>
                      {'  '}[, [battery_type]])</td>
                    <td style={{ padding: '4px 5px', color: '#4a5568' }}>Builds the system description sentence for <code style={{ background: '#e2e8f0', padding: '1px 2px', borderRadius: 2, fontSize: 10 }}>{'{{initial_target_capacity}}'}</code>. Reads kWh and kW from the parenthesised spec inside battery_type, for example "(40.5kWh/23kW)". The battery_type argument is optional: omit it for PV-only contracts. Examples: "12.18 kW DC Solar PV and 40.5 kWh Battery Storage" (PV+Battery); "6.12 kW DC Solar PV" (PV only).</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0', background: '#f0f9ff' }}>
                    <td style={{ padding: '4px 5px', fontFamily: 'monospace', fontSize: 10, verticalAlign: 'top' }}>
                      EXTRACT_DOLLARS(<br/>
                      {'  '}[battery_type])</td>
                    <td style={{ padding: '4px 5px', color: '#4a5568' }}>Extracts the dollar amount embedded in the battery_type description. The Makello export includes the cost as "$N,NNN.NN" inside the battery_type text. Returns a plain number string without the $ sign. Example: from "Tesla Powerwall-3 (27kWh/11.5kW) $27,987.84" returns "27987.84".</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: '5px 0 0', fontSize: 11, color: '#4a5568', lineHeight: 1.4, fontStyle: 'italic' }}>
                If an expression produces an error (unknown column, division by zero, syntax problem), the field is left blank in the output rather than stopping document generation.
              </p>
            </div>

            {/* Col 5 — Battery / Phase 1 fee */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>PV+Battery Contracts</div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Select <strong>PV+Battery</strong> at the top to switch to the battery contract template. Battery-specific fields appear in the per-job panel: battery capacity (kWh), battery system cost, and the Phase 1 fee basis toggle.
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#2c5282' }}>Include battery cost in Phase 1 fee basis</p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Controls whether the battery storage cost is counted when calculating the Phase 1 fee:
              </p>
              <ul style={{ margin: '0 0 8px', paddingLeft: 16, fontSize: 12, color: '#2d3748', lineHeight: 1.7 }}>
                <li><strong>Yes:</strong> Phase 1 fee = Total Project Cost × Phase 1 fee %</li>
                <li><strong>No:</strong> Phase 1 fee = (Total Project Cost minus Battery Cost) × Phase 1 fee %</li>
              </ul>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                The battery cost is read automatically from the Makello CSV using EXTRACT_DOLLARS on the battery_type column.
              </p>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2c5282', marginBottom: 6 }}>Calculated Fields</div>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                These fields are computed automatically and cannot be edited directly:
              </p>
              <ul style={{ margin: '0 0 6px', paddingLeft: 16, fontSize: 12, color: '#2d3748', lineHeight: 1.7 }}>
                <li>Phase 1 fee basis (total less battery if excluded)</li>
                <li>Phase 1 fee = basis × Phase 1 fee %</li>
                <li>50% upfront = Phase 1 fee × 50%</li>
                <li>50% on delivery = Phase 1 fee × 50%</li>
              </ul>
              <p style={{ margin: 0, fontSize: 12, color: '#2d3748', lineHeight: 1.5 }}>
                Dollar amounts are formatted on blur: enter a bare number and $ is added automatically. Percentage fields work the same way. Values above 1 are treated as already in percent (8 becomes 8%); values of 1 or less are scaled (0.08 becomes 8%).
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── Diagnostic error panel ─────────────────────────────────────── */}
      {diagErrors.length > 0 && (() => {
        const isMissing = diagErrors[0]?.id === 'missing';
        return (
          <div style={{ background: isMissing ? '#fffbeb' : '#fff5f5',
                        borderBottom: `2px solid ${isMissing ? '#f6e05e' : '#fc8181'}`,
                        padding: '10px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13,
                          color: isMissing ? '#744210' : '#c53030', marginBottom: 6 }}>
              {isMissing
                ? `⚠ ${diagErrors.length} required field${diagErrors.length !== 1 ? 's' : ''} empty — fill in before generating:`
                : `⚠ Template errors (${diagErrors.length}) — fix these placeholders then regenerate:`}
            </div>
            <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%', maxWidth: 900 }}>
              {!isMissing && (
                <thead>
                  <tr style={{ color: '#742a2a', borderBottom: '1px solid #feb2b2' }}>
                    <th style={{ textAlign: 'left', padding: '2px 10px 4px 0', width: 120 }}>Error ID</th>
                    <th style={{ textAlign: 'left', padding: '2px 10px 4px 0', width: 160 }}>Tag / Placeholder</th>
                    <th style={{ textAlign: 'left', padding: '2px 10px 4px 0', width: 80  }}>Offset</th>
                    <th style={{ textAlign: 'left', padding: '2px 0 4px 0'               }}>Message</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {diagErrors.map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${isMissing ? '#fef08a' : '#fed7d7'}` }}>
                    {isMissing ? (
                      <td style={{ padding: '3px 0', color: '#92400e' }}>• {e.message}</td>
                    ) : (<>
                      <td style={{ padding: '3px 10px 3px 0', color: '#c53030', fontFamily: 'monospace' }}>{e.id}</td>
                      <td style={{ padding: '3px 10px 3px 0', color: '#744210', fontFamily: 'monospace' }}>
                        {e.tag ? `{{${e.tag}}}` : '—'}
                      </td>
                      <td style={{ padding: '3px 10px 3px 0', color: '#718096' }}>{e.offset !== '' ? e.offset : '—'}</td>
                      <td style={{ padding: '3px 0',           color: '#1a202c' }}>{e.message}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {!isMissing && (
              <div style={{ fontSize: 11, color: '#718096', marginTop: 6 }}>
                Full error object logged to browser console (F12 → Console).
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, padding: 14, maxWidth: 1400, margin: '0 auto', alignItems: 'flex-start' }}>

        {/* LEFT — per-job */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#e6fffa', border: '1px solid #b2f5ea', borderRadius: 7,
                        padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Per-Job Fields</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                   onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                   onClick={() => csvInputRef.current.click()}
                   style={{ border: `2px dashed ${dragOver ? '#319795' : '#81e6d9'}`, borderRadius: 5,
                            padding: '5px 14px', background: dragOver ? '#b2f5ea' : '#f0fff4',
                            cursor: 'pointer', fontSize: 12, color: '#234e52', transition: 'all .15s' }}>
                {csvFile ? <span>📎 {csvFile} — <u>change</u></span> : <span>📄 Drop CSV or <u>click to browse</u></span>}
              </div>
              <input type="file" accept=".csv" ref={csvInputRef} style={{ display: 'none' }} onChange={onCsvFile} />
              <Btn onClick={downloadBlankCsv}><span style={{fontSize:18,lineHeight:1}}>⬇</span> Blank CSV</Btn>
              <Btn onClick={() => exportTranslationCsv(translation)}><span style={{fontSize:18,lineHeight:1}}>⬇</span> Translation</Btn>
              <label style={{ cursor: 'pointer' }}>
                <Btn as="span" onClick={() => translationInputRef.current?.click()}><span style={{fontSize:18,lineHeight:1}}>⬆</span> Translation</Btn>
                <input type="file" accept=".csv" ref={translationInputRef}
                       style={{ display: 'none' }} onChange={onTranslationFile} />
              </label>
              <Btn onClick={exportCsv} bg="#2c7a7b" bdr="#285e61" color="white">↑ Export CSV</Btn>
            </div>
          </div>

          {/* Field status legend */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8, fontSize: 10,
                        fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {[
              { bdr: '#ed8936', text: '⬆ required',   desc: 'needs a value — load a CSV file or type' },
              { bdr: '#2b6cb0', text: 'at signing',    desc: 'intentionally blank until contract execution' },
              { bdr: '#cbd5e0', text: 'optional',      desc: 'can be left blank' },
              { bdr: '#48bb78', text: '✓ filled',      desc: 'has a value' },
            ].map(({ bdr, text, desc }) => (
              <span key={text} title={desc}
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4a5568', cursor: 'default' }}>
                <span style={{ display: 'inline-block', width: 3, height: 14, background: bdr, borderRadius: 2 }} />
                {text}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {LEFT_KEYS.map(key => {
              const field  = FIELDS.find(f => f.key === key);
              // Hide battery-only fields when contract type is PV Only
              if (field.batteryOnly && contractType !== 'pv_battery') return null;
              const value  = field.type === 'calc' ? (calc[key] ?? '') : (job[key] ?? '');
              const dimmed = key === 'customer_tax_status_other' && !taxIsOther;
              return (
                <FieldRow key={key} field={field} value={value}
                          locked={field.type === 'calc'} dimmed={dimmed}
                          onChange={key === 'customer_tax_status'
                            ? onTaxStatusChange
                            : val => setJobField(key, val)}
                          photo={key === 'site_photo' ? sitePhoto : undefined}
                          onPhotoChange={key === 'site_photo' ? setSitePhoto : undefined}
                          csvPhotoName={key === 'site_photo' ? (job.site_photo || '') : undefined} />
              );
            })}
          </div>
        </div>

        {/* RIGHT — stable */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: stableUnlocked ? '#fffbeb' : '#ebf8ff',
                        border: `1px solid ${stableUnlocked ? '#f6e05e' : '#bee3f8'}`,
                        borderRadius: 7, padding: '10px 14px', marginBottom: 10,
                        transition: 'background .2s, border-color .2s' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Contractor Defaults</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {stableUnlocked ? (
                <button onClick={() => setStableUnlocked(false)} style={{ padding: '5px 14px', fontSize: 12,
                  fontWeight: 600, borderRadius: 4, background: '#d69e2e', border: '1px solid #b7791f',
                  color: 'white', cursor: 'pointer' }}>🔒 Lock Defaults</button>
              ) : (
                <button onClick={() => setStableUnlocked(true)} style={{ padding: '5px 14px', fontSize: 12,
                  fontWeight: 600, borderRadius: 4, background: '#2c5282', border: '1px solid #2a4a7f',
                  color: 'white', cursor: 'pointer' }}>✏️ Edit Defaults</button>
              )}
              <Btn onClick={saveDefaultsToFile} bg="#2c5282" bdr="#2a4a7f" color="white"
                   title="Download contract_defaults.json — commit & push to share across computers">
                Save Defaults ↓
              </Btn>
              <Btn onClick={() => importDefRef.current.click()}>Import Defaults</Btn>
              <input type="file" accept=".json" ref={importDefRef} style={{ display: 'none' }} onChange={onImportDefaults} />
              {stableUnlocked && <span style={{ fontSize: 11, color: '#975a16', fontStyle: 'italic' }}>Editing — changes save automatically</span>}
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
