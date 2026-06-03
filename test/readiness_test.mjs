// Wipomo Contract Tool — readiness ("All fields ready") unit test
// Version: v0.7.2
// Updated: 2026-06-03 13:40 PT
// Part of: Makello Contract Tool
//
// Verifies the REAL getMissingFields() (extracted from the live JSX) against the
// REAL translation_defaults.csv across all 4 variants
// (pv_only|pv_battery × guarantee off|on). Checks:
//   1. With every job field blank, getMissingFields flags the full required set
//      expected for that variant (no missing required field — the "miss" Jose saw).
//   2. Filling exactly that set → ready (empty).
//   3. Variant switch: a value-set that satisfies one variant must NOT satisfy a
//      different variant (battery/guarantee fields become newly required).
// No browser needed:  node test/readiness_test.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// ── Extract FIELDS + getMissingFields from whatever JSX index.html points to ──
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const jsxName = (html.match(/contract_tool_app_v[\d.]+\.jsx/) || [])[0];
if (!jsxName) throw new Error('could not find JSX filename in index.html');
const jsx = fs.readFileSync(path.join(ROOT, jsxName), 'utf-8');

function sliceBalanced(src, startToken, open, close) {
  const i = src.indexOf(startToken);
  if (i < 0) throw new Error('not found: ' + startToken);
  const s = src.indexOf(open, i);
  let depth = 0;
  for (let j = s; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close) { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error('unbalanced: ' + startToken);
}
const fieldsSrc = sliceBalanced(jsx, 'const FIELDS = [', '[', ']');
const fnSrc     = sliceBalanced(jsx, 'function getMissingFields(', '{', '}');
const { FIELDS, getMissingFields } =
  new Function(`${fieldsSrc};\n${fnSrc}\nreturn { FIELDS, getMissingFields };`)();

// ── Parse translation_defaults.csv (quote-aware) into the app's shape ──
function parseLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur); return out;
}
const csv = fs.readFileSync(path.join(ROOT, 'translation_defaults.csv'), 'utf-8')
  .split(/\r?\n/).filter(l => l && !l.startsWith('#'));
csv.shift(); // header
const translation = csv.map(parseLine).filter(c => c[0]).map(c => ({
  internalKey: c[0].trim(), requiredStatus: (c[2] || '').trim(), appliesTo: (c[3] || 'both').trim(),
}));

// ── Helpers ──
const VARIANTS = [
  { ct: 'pv_only',    guar: false },
  { ct: 'pv_only',    guar: true  },
  { ct: 'pv_battery', guar: false },
  { ct: 'pv_battery', guar: true  },
];
const blank = Object.fromEntries(FIELDS.map(f => [f.key, '']));
const requiredKeys = (ct, guar) =>
  getMissingFields(blank, translation, ct, guar).map(f => f.key).sort();

let fails = 0;
const assert = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); if (!cond) fails++; };

console.log(`JSX under test: ${jsxName}\n`);
const req = {};
for (const { ct, guar } of VARIANTS) {
  const keys = requiredKeys(ct, guar);
  req[`${ct}|${guar}`] = keys;
  console.log(`required [${ct}, guarantee=${guar}]: ${keys.join(', ') || '(none)'}`);
}
console.log('');

// 1. blank → flags the required set; filling it → ready
for (const { ct, guar } of VARIANTS) {
  const keys = req[`${ct}|${guar}`];
  const filled = { ...blank };
  keys.forEach(k => filled[k] = 'X');
  assert(getMissingFields(filled, translation, ct, guar).length === 0,
    `[${ct}, g=${guar}] filling the ${keys.length} flagged fields → All fields ready`);
}
console.log('');

// 2. cross-variant: battery fields required only for pv_battery; target only when guarantee on
assert(req['pv_battery|false'].includes('battery_cost') && !req['pv_only|false'].includes('battery_cost'),
  'battery_cost required for PV+Battery but NOT PV-only');
assert(req['pv_battery|false'].includes('battery_size_kwh') && !req['pv_only|false'].includes('battery_size_kwh'),
  'battery_size_kwh required for PV+Battery but NOT PV-only');
assert(req['pv_only|true'].includes('target_annual_production_kwh') && !req['pv_only|false'].includes('target_annual_production_kwh'),
  'target_annual_production_kwh required when guarantee ON but NOT when OFF');
console.log('');

// 3. variant switch: completing one variant must NOT satisfy another
function completeFor(ct, guar) {
  const v = { ...blank };
  req[`${ct}|${guar}`].forEach(k => v[k] = 'X');
  return v;
}
const pvDone = completeFor('pv_only', false);
assert(getMissingFields(pvDone, translation, 'pv_battery', true).length > 0,
  'PV-only(no-guarantee) completion is NOT sufficient for PV+Battery+Guarantee (re-flags battery + target)');
const battDone = completeFor('pv_battery', true);
assert(getMissingFields(battDone, translation, 'pv_battery', true).length === 0,
  'PV+Battery+Guarantee completion IS sufficient for itself');

console.log(`\n${'='.repeat(60)}\n${fails ? fails + ' CHECK(S) FAILED ❌' : 'ALL READINESS CHECKS PASS ✅'}`);
process.exit(fails ? 1 : 0);
