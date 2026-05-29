# Wipomo Contract Tool — Claude Code Project

**Owner:** Jose Torre-Bueno (jose.torrebueno@cc-energy.org), Center for Community Energy
**Purpose:** Browser-based tool that ingests a Makello/Wipomo CSV and fills a Word contract template, then downloads the result as a .docx
**Deployed at:** contract.cc-energy.org (production) · beta.makello-contract.pages.dev (beta)
**GitHub repo:** https://github.com/josetorre-bueno/Makello-Contract
**Current version:** v0.6.8 (beta); production trails behind — promote with `wrangler ... --branch main`
**Memory files:** `memory/` directory — project context, deployment, template placeholders. Read at session start.

---

## Stack

Same pattern as all other CCE tools (see `~/Downloads/Project Files/CLAUDE.md` for full architecture):
- Pure browser app — HTML wrapper + React/JSX via Babel CDN, no build step
- `docxtemplater.js` fills Word `.docx` templates client-side (no server needed)
- `PizZip` handles the underlying zip/docx packaging
- Local dev: `python3 -m http.server 8080` from this directory

**Two-file pattern:**
- `contract_tool.html` — stable HTML wrapper
- `contract_tool_app_vX.Y.Z.jsx` — versioned JSX module (rename-on-bump)

---

## Deployment

**Hosting:** Cloudflare Pages (free tier). GitHub auto-deploy is currently disconnected (as of 2026-04-30) — deploy manually via Wrangler CLI (see below).

**URLs:**
- `contract.cc-energy.org` — custom domain (primary)
- `makello-contract.pages.dev` — Cloudflare default URL

**DNS:** `contract.cc-energy.org` is a CNAME in EasyDNS pointing to `makello-contract.pages.dev`. DNS is managed at EasyDNS (accessed via Cloudways sysadmin account).

**Cloudflare account:** Jose.torrebueno@cc-energy.org — credentials recorded separately. Dashboard at dash.cloudflare.com. The `makello-contract` Pages project is listed under Workers & Pages.

**Note:** This repo was accidentally developed inside the `josetorre-bueno/cce-solar-tools` repo during the session of 2026-04-25 (v0.2.8–v0.3.5). All work was moved to this repo on the same day. The CCE solar tools project at `tools.cc-energy.org` is a separate Cloudflare Pages project connected to `josetorre-bueno/cce-solar-tools`.

**How to add a new Pages project with custom domain in Cloudflare:**

1. Go to dash.cloudflare.com → **Workers & Pages**
2. Click **Create application**
3. At the bottom of the screen click **"Looking to deploy Pages? Get started"** (easy to miss — the main options on that screen are all for Workers)
4. Choose **Continue with GitHub**, select the repository
5. Set: Branch = `main`, Framework preset = None, Build command = blank (or `true` if a value is required), Output directory = `/`
6. Click **Save and Deploy**
7. Once deployed, click **Add a custom domain**
8. Enter the desired subdomain (e.g. `contract.cc-energy.org`)
9. Choose **Begin CNAME setup** (not "Cloudflare DNS" — DNS is at EasyDNS)
10. Cloudflare shows the CNAME record to add: host = subdomain (e.g. `contract`), points to = `projectname.pages.dev`
11. Log into EasyDNS (via Cloudways sysadmin account), add that CNAME record
12. Cloudflare polls automatically — domain activates within minutes to an hour

**Note:** The "Create application" flow defaults to Workers. The Pages entry point is the small "Get started" link at the bottom of that screen. If you end up in a flow that asks for `npx wrangler deploy` as a build command or shows `*.workers.dev` URLs, you are in the Workers path — go back and use the "Get started" link instead.

---

**Deploy method (GitHub auto-deploy disconnected as of 2026-04-30):**
Push to GitHub as usual, then deploy to Cloudflare with Wrangler:
```bash
cd /tmp/makello-contract
git pull                     # get latest from GitHub
npx wrangler pages deploy . --project-name makello-contract --branch main
```
If the `/tmp` clone is gone: `git clone https://github.com/josetorre-bueno/Makello-Contract /tmp/makello-contract` first.
Wrangler auth token persists in `~/.wrangler/` — no login needed after first run per machine.

**GitHub push (always do this first, then Wrangler deploy):**
```bash
cp "/Users/jtorrebueno/Desktop/Current/Wipomo Contract tool/contract_tool_app_vX.Y.Z.jsx" /tmp/makello-contract/
cp "/Users/jtorrebueno/Desktop/Current/Wipomo Contract tool/index.html" /tmp/makello-contract/
cd /tmp/makello-contract
git add contract_tool_app_vX.Y.Z.jsx index.html
git commit -m "Contract tool vX.Y.Z — description"
git push
npx wrangler pages deploy . --project-name makello-contract --branch main
```

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
| `{{customer_tax_status_other}}` | **Removed from template** — input-only UI field. If "Other" selected, its value is promoted to `{{customer_tax_status}}` at merge time. Always cleared to blank in output. |
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
| `{{prevailing_wage}}` | UI toggle shows "yes"/"no"; mapped to "is"/"is not" at merge time to fit contract clause language |
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
| `Wipomo_Contract_Template.docx` | Active PV-only Word template — no battery placeholders |
| `Wipomo_Contract_Template_Battery.docx` | Active PV+Battery Word template |
| `addendum_template.docx` | Addendum merged after main contract when "Include Addendum" toggled |
| `contract_fields.csv` | Field manifest: placeholder → description → stability flag |
| `contract_input_blank.csv` | Blank CSV template for download |
| `contract_defaults.json` | Saved stable-field defaults |
| `translation_defaults.csv` | Shipped translation table (single source since v0.5.0) — CSV column → internal key, render-time formulas, required_status, applies_to |
| `test/` | Browser matrix test harness (`contract_matrix_test.mjs` + `validate_docx_matrix.py` + README) — drives the real app in headless Chrome across settings combos, validates each .docx. See README; `TARGET_URL` env var tests a deployed build. |
| `old_versions/` | All prior JSX versions (v0.1.x through v0.6.7) — gitignored |
| `archive/` | Superseded templates, reference docs, test CSVs — gitignored |
| `restartofcontractautomationtool/` | Sample Makello CSV (Foo Barson test data) — gitignored |
| `unpacked/` | Unzipped XML of original template (reference only — edit active templates directly) |

---

## Version numbering

Follow the global config versioning rules. Contract tool uses **rename-on-bump** pattern.

**Every change, no matter how small, must:**
1. Increment the **patch** version number (`vX.Y.Z` → `vX.Y.Z+1`)
2. Update the date/time stamp in the file header comment
3. Copy the previous version file to the new filename (never edit the old file in place)
4. Update `index.html` to point to the new filename
5. Add a changelog entry at the top of the new file describing what changed

Format: `vX.Y.Z` — never abbreviate. A single-character typo fix is still a patch bump.
Old versions are kept as local revision history in `old_versions/` (gitignored).

---

## Coding standards

See global config for CSV UTF-8 BOM requirement, cache-busting, and local testing rules. All apply here.

---

## Development location

Both folders are active. JSX is developed in `Project Files/` and copied here. Templates are edited directly in this folder.

| Folder | Role |
|--------|------|
| `~/Desktop/Current/Wipomo Contract tool/` | Canonical source of truth. Templates, index.html, contract_auth.js, final JSX |
| `~/Desktop/Current/Project Files/` | JSX development copies are kept here too for cross-project access |

---

## Status

Current version: **v0.6.8** (2026-05-29) — on beta; production trails behind.

Feature state:
- Two-column layout: per-job fields (left) + stable contractor defaults (right)
- Contract type selector: PV Only vs PV+Battery — selects which Word template is used
- Battery fields visible only when PV+Battery selected; hidden and skipped for PV Only
- **Translation table (v0.5.0+): single source of truth is the shipped `translation_defaults.csv`, fetched on mount.** Upload/Export Translation buttons and localStorage translation were removed; a failed CSV fetch blocks usage (loud, no silent fallback). Columns: internal_key, client_field_expression, required_status, applies_to ('both'|'pv_only'|'pv_battery'), heading/context pairs.
- initial_target_capacity: two translation rows, one per contract type
- Two active templates: Wipomo_Contract_Template.docx (PV Only), Wipomo_Contract_Template_Battery.docx (PV+Battery). PV Only has no battery placeholders.
- **Render-time formulas (v0.6.0): derived fields are declared in `translation_defaults.csv` (entries containing `{{...}}`), evaluated on every render — moved out of JS calcFields.** evalExpression(): infix arithmetic, `[csv_col]` (raw CSV) and `{{internal_key}}` (live merged value) refs, `IF(cond,a,b)`, `==`/`!=`, `"string literals"`, percent-aware asNum, functions ROUND/AVERAGE/SUM/MIN/MAX/ABS/BUILD_CAPACITY/EXTRACT_DOLLARS.
- Three CSV formats: contract_input (3-column), old Makello vertical schema, current Sky-D/Makello schema
- Tax status dropdown with fuzzy CSV matching; "Other" value promoted at merge
- Prevailing wage toggle: yes/no in UI → is/is not in document (still a hardcoded special case — see memory goal to move to translator)
- Dollar amounts rounded to whole dollars; % and $ added automatically on blur
- Blank fields replaced with ___________ in output; filled fields highlighted yellow
- Clean Copy switch suppresses highlighting (strips sentinels instead of adding `<w:highlight>`)
- Peach (`FFC080`) shading is a source-template editing aid only — stripped from output at ingest (v0.6.3); `highlight_placeholders.py` helper applies/migrates it
- **Provenance footer (v0.6.8): every page footer carries `Makello vX.Y.Z · <gen-date>` (left) + page number (right). Single `const VERSION`.**
- Field status color coding: amber = required, deep blue = at signing, grey = optional, green = filled. **effective_date is at-signing (v0.6.8)** — blank to fill at execution, set in BOTH FIELDS and translation required_status.
- Stable defaults persist via localStorage; Lock/Unlock defaults
- Site photo image insertion ({{site_photo}})
- Auth gate: contract_auth.js with show/hide password toggle
- "Include Addendum" toggle: merges addendum_template.docx; installation_deadline_months controls Addendum §2. **v0.6.7: numbering.xml merge keeps OOXML schema order (all `<w:abstractNum>` before all `<w:num>`) — earlier order violation made Word drop bullets / renumber continuously in addendum-merged .docx.**
- Optional PDF output via mammoth → browser print dialog (note: mammoth ignores numbering.xml, so PDFs always rendered lists fine even when the v0.6.7 bug was live)
- Help panel accessible from header
- **Test harness in `test/`** — drives the real app in headless Chrome across contractType × addendum × cleanCopy, validates each .docx (well-formedness, numbering order, peach, highlight, addendum, battery). Runs against localhost or a deployed `TARGET_URL`.
