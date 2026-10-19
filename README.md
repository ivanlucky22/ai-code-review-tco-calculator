# AI Code Review Build-vs-Buy TCO Calculator

Interactive 12-month Total Cost of Ownership (TCO) calculator comparing **Commercial AI Code Review Vendor Seat Licenses (`$400–$700/dev/yr`)** against **Internal Cloud CI Agent Token Compute (`~$1.70/MR`) + Ongoing AI Ops Maintenance (`1–2 days/week` Senior Engineer capacity)**.

## What It Models

1. **Step 1 — AI Ops & Infrastructure Readiness Gate (Pass/Fail)**
   - Evaluates organizational readiness across the 4-stage AI Ops Ownership Maturity Scale and backup ownership requirements.
2. **Step 2 — Team Size & Cost Baseline Parameters**
   - `N_devs` (Active developers, with `15`, `35`, `60`, and `100` dev scenario presets)
   - `M_reviews` (Monthly PRs/MRs reviewed across the org)
   - `C_token` (Average LLM + CI compute cost per internal review, benchmark `~$1.70/review`)
   - `C_eng_day` (Daily Senior Engineer cost = Annual Salary ÷ 250 working days)
   - `D_maint` (Weekly rule maintenance, false-positive suppression & quality evaluation days)
   - `D_setup` (Initial v1 Cloud CI Agent build + historical MR pattern mining days)
   - `P_vendor_std` & `P_vendor_ent` (Standard `$400/yr` vs. Enterprise `$700/yr` vendor quotes)
3. **Step 3 & 4 — 12-Month TCO Breakdown, Crossover Curve & Scenario Matrix**
   - Compares **Option A (Vendor Standard)**, **Option B (Vendor Enterprise)**, and **Option C (Internal Build Year 1 & Year 2+)**.
   - Plots the live TCO crossover curve from `10` to `140+` developers and exports a 1-click Markdown summary or shareable URL with query parameters.

## Running Locally

Open `index.html` directly in any browser or serve locally:

```bash
python3 -m http.server 8080
```
