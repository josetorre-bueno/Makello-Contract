# Deployment
# Updated: 2026-04-26

**Hosting:** Cloudflare Pages (`makello-contract.pages.dev`), auto-deploys on push to `main`
**URL:** https://contract.cc-energy.org
**DNS:** EasyDNS — CNAME `contract` → `makello-contract.pages.dev`
**Cloudflare account:** jose.torrebueno@cc-energy.org

**Auth gate:** `contract_auth.js` — SHA-256 hash of Wipomo-specific password. Session token key `wipomo_auth` — independent of CCE tools (`cce_auth`). Knowing one password does not unlock the other.

**Entry point:** `index.html` (renamed from `contract_tool.html` so bare domain works without a path)

**Git clone for pushing updates:**
`git clone https://github.com/josetorre-bueno/Makello-Contract.git /tmp/makello-contract`
Clone lives in `/tmp` — may not persist between sessions.

**Files that must be deployed together:**
- `index.html`
- `contract_tool_app_vX.Y.Z.jsx`
- `contract_auth.js`
- `Wipomo_Contract_Template.docx`
- `contract_defaults.json`
