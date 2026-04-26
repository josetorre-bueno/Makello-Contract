# Template Placeholders
# Updated: 2026-04-26
# File: Wipomo_Contract_Template.docx

All active `{{placeholder}}` fields. Note: `{{customer_tax_status_other}}` has been removed
from the template — if "Other" is selected, its value is promoted to `{{customer_tax_status}}`
at merge time and never appears in the document.

| Placeholder | Source | Notes |
|-------------|--------|-------|
| `{{effective_date}}` | Manual | |
| `{{contractor_name}}` | Stable default | |
| `{{contractor_address}}` | Stable default | |
| `{{contractor_license_no}}` | Stable default | |
| `{{customer_org_name}}` | CSV `owner_name` | |
| `{{customer_address}}` | CSV `address` | |
| `{{customer_tax_status}}` | Manual dropdown | Fuzzy match; "Other" value promoted here |
| `{{initial_target_capacity}}` | CSV: `system_size` + `battery_type` | Formatted string |
| `{{material_escalation_threshold_pct}}` | Stable default (5%) | |
| `{{labor_escalation_threshold_pct}}` | Stable default (5%) | |
| `{{phase1_completion_days}}` | Stable default (75) | |
| `{{phase1_fee_pct}}` | Stable default (8%) | |
| `{{estimated_total}}` | CSV `gross_cost` | |
| `{{phase1_fee}}` | Calculated: `estimated_total × phase1_fee_pct` | |
| `{{phase1_fee_50pct_upfront}}` | Calculated: `phase1_fee × 0.5` | |
| `{{phase1_fee_50pct_delivery}}` | Calculated: `phase1_fee × 0.5` | |
| `{{phase2_start_days}}` | Stable default (30) | |
| `{{payment_ntp_pct}}` | Stable default (25%) | |
| `{{payment_equipment_pct}}` | Stable default (35%) | |
| `{{payment_installation_pct}}` | Stable default (25%) | |
| `{{payment_closeout_pct}}` | Stable default (15%) | |
| `{{prevailing_wage}}` | Manual toggle | UI: yes/no → document: "is"/"is not" |
| `{{workmanship_warranty_years}}` | Stable default (1) | |
| `{{design_warranty_years}}` | Stable default (1) | |
| `{{contractor_signatory_name}}` | Stable default | |
| `{{contractor_signatory_title}}` | Stable default | |
| `{{contract_date}}` | Manual (same as effective_date) | |
| `{{customer_name}}` | CSV `contact_name` | |
| `{{customer_title}}` | Manual | Blank if sole proprietor |
| `{{site_photo}}` | Image upload | Per-job; browser security requires manual upload |
