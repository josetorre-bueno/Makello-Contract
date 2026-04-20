# Wipomo Contract Tool — Claude Code Project

**Owner:** Jose Torre-Bueno (jose.torrebueno@cc-energy.org), Center for Community Energy
**Purpose:** Browser-based tool that ingests a Makello/Wipomo CSV and fills a Word contract template, then downloads the result as a .docx
**Deployed at:** tools.cc-energy.org (GitHub Pages, same as other CCE tools)

---

## Stack

Same pattern as all other CCE tools (see `~/Downloads/Project Files/CLAUDE.md` for full architecture):
- Pure browser app — HTML wrapper + React/JSX via Babel CDN, no build step
- `docxtemplater.js` fills Word `.docx` templates client-side (no server needed)
- `PizZip` handles the underlying zip/docx packaging
- Local dev: `python3 -m http.server 8080` from this directory

**Two-file pattern:**
- `contract_tool.html` — stable HTML wrapper
- `contract_tool_app_vX.Y.Z.jsx` — versioned JSX module

---

## Input: Makello CSV format

Charlie's system exports a CSV with `Field,Value` rows (one field per row, not columnar).
Sample file: `restartofcontractautomationtool/contract_1e18896c265fbb3cb0656a5436a63589.csv`

Key fields used by the contract tool:

| CSV field | Used for |
|-----------|----------|
| `owner_name` | Customer name on contract |
| `contact_name` | Signatory name |
| `address` | Project site address |
| `system_size` | PV kW (e.g. 1.74) |
| `battery_type` | Battery description with cost |
| `battery_size_kwh` | Battery kWh capacity |
| `start_date` | Phase 2 start / NTP date |
| `end_date` | Completion date |
| `cancellation_start_date` / `cancellation_end_date` | Cancellation window |
| `gross_cost` | Estimated total project cost |
| `first_payment` … `fifth_payment` | Payment schedule amounts |
| `authority_having_jurisdiction` | AHJ for permit reference |

Fields NOT in the CSV (entered manually in the UI):
- Contractor name, address, license number, signatory
- Contract execution date
- Phase 1 fee %, days, payment schedule percentages
- Prevailing wage applicability
- Warranty periods
- Customer tax status
- Site photo (image upload)

---

## Template: `Wipomo_Contract_Template.docx`

Word document with `{{placeholder}}` fields (docxtemplater syntax).
Original source: `Moutaz Alsayed - The Stone Collector_ Two Phase Solar Construction Contract Commercial.docx`
Unpacked XML: `unpacked/` directory

### All 31 placeholders

| Placeholder | Source |
|-------------|--------|
| `{{effective_date}}` | Manual |
| `{{contractor_name}}` | Manual (stable — same contractor every time) |
| `{{contractor_address}}` | Manual (stable) |
| `{{contractor_license_no}}` | Manual (stable) |
| `{{customer_org_name}}` | CSV `owner_name` |
| `{{customer_address}}` | CSV `address` |
| `{{customer_tax_status}}` | Manual |
| `{{customer_tax_status_other}}` | Manual (conditional) |
| `{{initial_target_capacity}}` | CSV: formatted from `system_size` + `battery_type` |
| `{{material_escalation_threshold_pct}}` | Manual (stable default: 5%) |
| `{{labor_escalation_threshold_pct}}` | Manual (stable default: 5%) |
| `{{phase1_completion_days}}` | Manual (stable default: 75) |
| `{{phase1_fee_pct}}` | Manual (stable default: 8%) |
| `{{estimated_total}}` | CSV `gross_cost` |
| `{{phase1_fee}}` | Calculated: `estimated_total × phase1_fee_pct` |
| `{{phase1_fee_50pct_upfront}}` | Calculated: `phase1_fee × 0.5` |
| `{{phase1_fee_50pct_delivery}}` | Calculated: `phase1_fee × 0.5` |
| `{{phase2_start_days}}` | Manual (stable default: 30) |
| `{{payment_ntp_pct}}` | Manual (stable default: 25%) |
| `{{payment_equipment_pct}}` | Manual (stable default: 35%) |
| `{{payment_installation_pct}}` | Manual (stable default: 25%) |
| `{{payment_closeout_pct}}` | Manual (stable default: 15%) |
| `{{prevailing_wage}}` | Manual: "is" or "is not" |
| `{{workmanship_warranty_years}}` | Manual (stable default: 1) |
| `{{design_warranty_years}}` | Manual (stable default: 1) |
| `{{contractor_signatory_name}}` | Manual (stable) |
| `{{contractor_signatory_title}}` | Manual (stable) |
| `{{contract_date}}` | Manual (same as effective_date) |
| `{{customer_name}}` | CSV `contact_name` |
| `{{customer_title}}` | Manual (blank if sole proprietor) |
| `{{site_photo}}` | Image upload (per job) |

---

## UI design

**Two panels:**
1. **Left — CSV upload:** Drop or select the Makello CSV; auto-populates the derived fields and shows a preview of what was parsed.
2. **Right — Manual fields:** Contractor info (pre-filled, editable), per-job fields (date, prevailing wage, tax status, site photo), stable defaults shown but editable.

**Generate button** → runs docxtemplater → triggers .docx download named after the customer + date.

---

## Files

| File | Description |
|------|-------------|
| `Wipomo_Contract_Template.docx` | Word template with `{{}}` placeholders |
| `contract_fields.csv` | Field manifest: placeholder → description → stability flag |
| `restartofcontractautomationtool/` | Previous session outputs (sample contract PDF + CSV) |
| `restartofcontractautomationtool/contract_1e18896c265fbb3cb0656a5436a63589.csv` | Sample Makello CSV for Foo Barson (test data) |
| `restartofcontractautomationtool/HIC GREEN SOLAR.docx` | Contractor HIC template (may be relevant) |
| `unpacked/` | Unzipped contents of the Word template (XML) |

---

## Version numbering

**Every change, no matter how small, must:**
1. Increment the minor version number (`vX.Y.Z` → `vX.Y+1.Z`)
2. Update the date/time stamp in the file header comment
3. Copy the previous version file to the new filename (never edit the old file in place)
4. Update `contract_tool.html` to point to the new filename
5. Add a changelog entry at the top of the new file describing what changed

Format: `vX.Y.Z` — never abbreviate. A single-character typo fix is still a version bump.
A new copy is always created — old versions are kept as the revision history.

---

## Coding standards

### CSV files — character encoding

**Always prepend a UTF-8 BOM (`\uFEFF`) to every generated CSV file.**

Without the BOM, Excel on macOS/Windows interprets UTF-8 as the system default encoding and renders
em-dashes, percent signs, accented characters, and other non-ASCII glyphs as garbled characters
(commonly visible as the Swedish Å — the `Ã` / `Â` artifacts from mis-reading UTF-8 byte sequences).

The BOM tells Excel to open the file as UTF-8, preserving all characters correctly.

Implementation in JavaScript:
```js
saveAs(
  new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' }),
  'filename.csv'
);
```

This applies to **every** `saveAs` call that produces a `.csv` file, including blank templates and
exported/updated input files.

---

## Status

App built through v0.1.3. Current feature state:
- Two-column layout: per-job fields (left) + stable contractor defaults (right)
- CSV load (drop or browse), blank CSV download, CSV export with change notes (Col D)
- Tax status dropdown, prevailing wage is/is not toggle
- Unit normalisation: % and $ added automatically on blur and before merge
- Stable defaults persist via localStorage + `contract_defaults.json` (fetched on load)
- Lock/unlock: ✏️ Edit Defaults / 🔒 Lock Defaults verb-first buttons
- Image insertion ({{site_photo}}) deferred to v0.2
