# Wipomo Contract Tool — Outstanding Issues & Future Improvements

_Last updated: 2026-05-29. Add new items at the bottom of the relevant section._

## Pending content / awaiting approval
1. **Production guarantee clause** — add to **both** templates (PV-only + PV+Battery) once
   the language is approved. (Added 2026-05-29.) Remember: after editing the template XML,
   run the well-formedness check and bump the version so the `?v=` cache-bust changes.

## DSL / architecture improvements (tabled)
2. **Add `EXTRACT('regex', [field])` to `evalExpression`** — a generic regex extractor to
   replace the specialised `BUILD_CAPACITY` / `EXTRACT_DOLLARS` functions (which break
   silently when the upstream CSV format drifts). Proposed 2026-05-28, parked. Enables #3.
3. **Move hardcoded special cases into `translation_defaults.csv`** — two value transforms
   are still hardcoded in the JSX merge-prep:
   - `prevailing_wage` (yes → "is" / no → "is not") — likely expressible today with the
     existing `IF(...)` DSL, no new code.
   - `customer_tax_status_other` promotion — needs the fuzzier #2 (regex/EXTRACT).
   Goal: zero special-case transforms in code, so CSV/format changes never need a release.
4. **Date arithmetic in `evalExpression`** — support `[effective_date] + 30` as *calendar*
   math (add days; only `+`/`-` valid in date mode). Needs a separate date code path; not built.

## UX / niceties (tabled)
5. **"Your saved defaults differ from shipped" indicator** — stable defaults keep a per-user
   `localStorage` override; show a hint when the local copy differs from the shipped
   `contract_defaults.json`. Proposed (v0.5.0), not built.

## Optional / low priority
6. **`_headers`: strict `no-store` for `/`** — the root path currently returns
   `max-age=0, must-revalidate` (safe — revalidates every load). Add an explicit `/` rule if
   strict `no-store` is wanted. Cosmetic; no current staleness.

## In-flight (action, not a defect)
- **Promote beta → production** — v0.6.8 is on beta for user testing. When approved:
  `cd /tmp/makello-contract && git checkout beta && wrangler pages deploy . --project-name makello-contract --branch main`.
