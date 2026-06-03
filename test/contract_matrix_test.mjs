// Wipomo Contract Tool — browser matrix test harness
// Version: v0.7.0
// Updated: 2026-06-03 12:48 PT
// Part of: Makello Contract Tool
//
// Drives the REAL app in Chrome (via puppeteer-core + the installed Chrome)
// across the settings matrix, generating a draft .docx for each combination,
// then hands the downloads to validate_docx_matrix.py.
//
// Matrix: contractType {pv_only, pv_battery} × guarantee {on,off} × addendum {on,off} × clean {on,off}
//   = 16 .docx files. Uses "Generate Draft" so missing required fields don't
//   block generation (the full pipeline — clean/highlight + addendum merge +
//   numbering — still runs, which is what we're testing).
//
// Prereq:  npm install --no-save puppeteer-core
//          python3 in PATH; local server running on http://localhost:8080
// Run:     node test/contract_matrix_test.mjs
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Target defaults to the local server; override to test a deployed build, e.g.
//   TARGET_URL=https://beta.makello-contract.pages.dev/ node test/contract_matrix_test.mjs
const URL = process.env.TARGET_URL || 'http://localhost:8080/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SAMPLE_CSV = path.resolve('restartofcontractautomationtool/contract_1e18896c265fbb3cb0656a5436a63589.csv');
const OUT = '/tmp/harness_out';
const AUTH_TOKEN = 'granted_dd3d4cb583e45cb3'; // 'granted_' + HASH.slice(0,16) from contract_auth.js

const sleep = ms => new Promise(r => setTimeout(r, ms));

function freshDir(d) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }

async function waitForNewDocx(dir, before, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const now = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));
    const fresh = now.filter(f => !before.has(f));
    // ensure not still downloading (.crdownload gone)
    const partial = fs.readdirSync(dir).some(f => f.endsWith('.crdownload'));
    if (fresh.length && !partial) return fresh[0];
    await sleep(250);
  }
  throw new Error('timed out waiting for .docx download');
}

// In page context: set a checkbox (located by nearby label text) to a desired state.
async function setCheckbox(page, labelText, desired) {
  const changed = await page.evaluate((labelText, desired) => {
    const boxes = [...document.querySelectorAll('input[type="checkbox"]')];
    for (const b of boxes) {
      const txt = (b.closest('label')?.textContent || b.parentElement?.textContent || '').trim();
      if (txt.includes(labelText)) {
        if (b.checked !== desired) { b.click(); return true; }
        return false;
      }
    }
    throw new Error('checkbox not found: ' + labelText);
  }, labelText, desired);
  if (changed) await sleep(150);
}

async function clickButtonByText(page, text) {
  const ok = await page.evaluate((text) => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find(b => b.textContent.trim() === text || b.textContent.trim().includes(text));
    if (!b) return false;
    b.click(); return true;
  }, text);
  if (!ok) throw new Error('button not found: ' + text);
  await sleep(150);
}

async function main() {
  freshDir(OUT);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    // Isolated profile so the harness launches even when the user's Chrome is
    // already open (shared default profile → WS-endpoint launch timeout).
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
           '--no-first-run', '--no-default-browser-check',
           '--user-data-dir=/tmp/chrome-harness-profile'],
  });
  const page = await browser.newPage();

  // Bypass auth gate + force FileSaver download path (disable showSaveFilePicker)
  await page.evaluateOnNewDocument((token) => {
    try { sessionStorage.setItem('wipomo_auth', token); } catch (_) {}
    delete window.showSaveFilePicker;
  }, AUTH_TOKEN);

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });

  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  console.log('→ loading', URL);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for translation table to load (Generate Draft button present & app live)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(b => /Draft/.test(b.textContent)),
    { timeout: 20000 });
  console.log('→ app loaded, uploading sample CSV');

  const csvInput = await page.waitForSelector('input[type="file"][accept=".csv"]', { timeout: 10000 });
  await csvInput.uploadFile(SAMPLE_CSV);
  await sleep(1200); // let parse + render settle

  const matrix = [];
  for (const type of ['pv_only', 'pv_battery'])
    for (const guarantee of ['on', 'off'])
      for (const addendum of ['on', 'off'])
        for (const clean of ['on', 'off'])
          matrix.push({ type, guarantee, addendum, clean });

  for (const combo of matrix) {
    const tag = `type=${combo.type}__guarantee=${combo.guarantee}__addendum=${combo.addendum}__clean=${combo.clean}`;
    process.stdout.write(`→ ${tag} ... `);
    await clickButtonByText(page, combo.type === 'pv_battery' ? 'PV + Battery' : 'PV Only');
    await setCheckbox(page, 'Include Production Guarantee', combo.guarantee === 'on');
    await setCheckbox(page, 'Include Addendum', combo.addendum === 'on');
    await setCheckbox(page, 'Clean Copy', combo.clean === 'on');
    await setCheckbox(page, 'Output PDF', false); // always docx

    const before = new Set(fs.readdirSync(OUT).filter(f => f.endsWith('.docx')));
    await clickButtonByText(page, 'Draft');
    const file = await waitForNewDocx(OUT, before);
    fs.renameSync(path.join(OUT, file), path.join(OUT, tag + '.docx'));
    console.log('saved', tag + '.docx');
  }

  await browser.close();

  if (errors.length) {
    console.log('\n⚠️  page errors during run:');
    errors.slice(0, 20).forEach(e => console.log('   ' + e));
  }

  console.log('\n→ validating downloads\n' + '='.repeat(60));
  try {
    const out = execFileSync('python3', ['test/validate_docx_matrix.py', OUT], { encoding: 'utf-8' });
    console.log(out);
  } catch (e) {
    console.log(e.stdout || '');
    process.exitCode = 1;
  }
}

main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(1); });
