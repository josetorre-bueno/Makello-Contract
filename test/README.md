# Contract Tool — automated test harness

Drives the **real app** in Chrome across the settings matrix and validates every
generated `.docx`. Catches the class of bug fixed in v0.6.7 (addendum-merge
numbering ordering) plus highlight/clean, peach-strip, addendum, and battery
content regressions.

## What it does

`contract_matrix_test.mjs` launches the installed Chrome via `puppeteer-core`,
bypasses the password gate, uploads the sample Makello CSV, then for every combo
of:

- contract type — `pv_only` / `pv_battery`
- Include Addendum — on / off
- Clean Copy — on / off

clicks **Generate Draft** (skips required-field validation, runs the full
pipeline) and saves the download. Then `validate_docx_matrix.py` checks each file:

1. every `word/*.xml` is well-formed
2. `numbering.xml` schema order — all `<w:abstractNum>` before all `<w:num>`
3. no peach (`FFC080`) editing-aid shading leaks into output
4. yellow highlight count matches the Clean Copy flag
5. addendum content present iff Include Addendum was on (`"Indemnified Parties"`)
6. battery clauses present iff contract type is `pv_battery`

## Run

```bash
# 1. serve the app from the repo root
python3 -m http.server 8080

# 2. one-time (per machine): install the driver (no Chromium download)
npm install --no-save puppeteer-core

# 3. run the matrix (against the local server)
node test/contract_matrix_test.mjs
```

To run the same matrix against a **deployed** build instead, set `TARGET_URL`
(no local server needed):

```bash
TARGET_URL=https://beta.makello-contract.pages.dev/ node test/contract_matrix_test.mjs
```

Output `.docx` files land in `/tmp/harness_out/` named by combo, e.g.
`type=pv_battery__addendum=on__clean=off.docx`, so failures are easy to open.

## Readiness test (no browser)

`node test/readiness_test.mjs` — verifies the **"All fields ready"** check
(`getMissingFields`, extracted live from the JSX) against the real
`translation_defaults.csv` across all 4 variants (pv_only|pv_battery ×
guarantee off|on). Confirms every required field is flagged when blank, that
filling exactly that set → ready, and that **completing one variant does not
satisfy another** (battery/guarantee fields are re-required on switch). The
matrix harness above uses *Draft* mode, which bypasses this gate, so this test
is what actually exercises readiness.

## Notes

- Uses the sample CSV at `restartofcontractautomationtool/` (gitignored — local
  only). Point `SAMPLE_CSV` in the `.mjs` at another file to test other data.
- Auth token in the harness mirrors `contract_auth.js`; update if the password
  hash changes.
- Validate already-generated files without re-driving the browser:
  `python3 test/validate_docx_matrix.py /tmp/harness_out`
