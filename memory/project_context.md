# Project Context
# Updated: 2026-04-26

Browser-based tool that ingests a Makello/Wipomo CSV export and fills a Word contract template (`Wipomo_Contract_Template.docx`), then downloads the result as a .docx file.

**Owner:** Jose Torre-Bueno / Center for Community Energy
**For:** Charlie Johnson's Wipomo/Makello team (solar construction contracts)
**Current version:** v0.3.5 (2026-04-25)
**Repo:** https://github.com/josetorre-bueno/Makello-Contract

## Stack
Pure browser app — HTML wrapper (`index.html`) + versioned JSX (`contract_tool_app_vX.Y.Z.jsx`). React/Babel via CDN, no build step. `docxtemplater.js` fills Word templates client-side. PizZip handles zip/docx packaging.

## Input CSV formats
Two formats supported:
1. **Standard contract CSV** — `Field,Value` rows (one field per row). Export from contract input UI.
2. **Legacy Makello wide CSV** — all field names in row 1, all values in row 2. Detected automatically by checking if row 0 contains `owner_name` as a column header. Partial data only — maps `owner_name`, `address`, `gross_cost`.

## Current feature state
- Two-column layout: per-job fields (left) + stable contractor defaults (right)
- CSV load (drop or browse), blank CSV download, CSV export with change notes
- Tax status dropdown with fuzzy matching (accepts `c`, `C corp`, `non-profit`, `501(c)3`, etc.)
- Tax status "Other": UI input only — value promoted to `customer_tax_status` at merge
- Prevailing wage toggle: yes/no in UI → is/is not in document
- Dollar amounts rounded to whole dollars
- Blank fields replaced with `___________` in output
- Field status color coding: amber=required, deep blue=at signing, grey=optional, green=filled
- Stable defaults persist via localStorage
- Lock/unlock contractor defaults
- Site photo image insertion (`{{site_photo}}`)
- Auth gate: `contract_auth.js` (Wipomo-specific password, separate from CCE tools)
- Legacy Makello CSV detection (v0.3.5)
