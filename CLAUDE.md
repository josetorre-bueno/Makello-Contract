# Wipomo Contract Tool — Claude Code Project

**Owner:** Jose Torre-Bueno (jose.torrebueno@cc-energy.org), Center for Community Energy
**Purpose:** Browser-based tool that ingests a Makello/Wipomo CSV and fills a Word contract template, then downloads the result as a .docx
**Deployed at:** contract.cc-energy.org
**GitHub repo:** https://github.com/josetorre-bueno/Makello-Contract
**Current version:** v0.3.5
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

**Hosting:** Cloudflare Pages (free tier), auto-deploys on every push to the `main` branch of `josetorre-bueno/Makello-Contract`.

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

**GitHub upload method:** Git clone lives at `/tmp/makello-contract`. After editing files locally, copy and push:
```bash
cp ~/Downloads/Wipomo\ Contract\ tool/contract_tool_app_vX.Y.Z.jsx /tmp/makello-contract/
cp ~/Downloads/Wipomo\ Contract\ tool/contract_tool.html /tmp/makello-contract/
cd /tmp/makello-contract
git add contract_tool_app_vX.Y.Z.jsx contract_tool.html
git commit -m "Contract tool vX.Y.Z — description"
git push
```
The clone lives in `/tmp` and may not persist between sessions. If missing: `git clone https://github.com/josetorre-bueno/Makello-Contract /tmp/makello-contract`

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
| `Wipomo_Contract_Template.docx` | Word template with `{{}}` placeholders |
| `contract_fields.csv` | Field manifest: placeholder → description → stability flag |
| `restartofcontractautomationtool/` | Previous session outputs (sample contract PDF + CSV) |
| `restartofcontractautomationtool/contract_1e18896c265fbb3cb0656a5436a63589.csv` | Sample Makello CSV for Foo Barson (test data) |
| `restartofcontractautomationtool/HIC GREEN SOLAR.docx` | Contractor HIC template (may be relevant) |
| `unpacked/` | Unzipped contents of the Word template (XML) |

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

## Status

Current version: **v0.3.5** (2026-04-25)

Feature state:
- Two-column layout: per-job fields (left) + stable contractor defaults (right)
- CSV load (drop or browse), blank CSV download, CSV export with change notes
- Legacy Makello CSV detection: vertical format (`owner_name`, `address`, `gross_cost` → mapped fields)
- Tax status dropdown with fuzzy CSV matching: accepts `c`, `C corp`, `s`, `S corp`, `non-profit`, `501(c)3`, etc.
- Tax status "Other" handling: UI-only input field, value promoted to `customer_tax_status` at merge; `customer_tax_status_other` always blank in output
- Prevailing wage toggle: yes/no in UI → is/is not in document
- Dollar amounts rounded to whole dollars (no cents)
- Blank fields replaced with `___________` in output for hand-writing space (except resolved/photo fields)
- Field status color coding: amber = required, deep blue = at signing, grey = optional, green = filled
- Unit normalisation: % and $ added automatically on blur and before merge
- Stable defaults persist via localStorage
- Lock/unlock: ✏️ Edit Defaults / 🔒 Lock Defaults
- Site photo image insertion ({{site_photo}}) supported
- Auth gate: `contract_auth.js` (Makello-specific password)
