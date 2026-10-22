# AI Code Review TCO Calculator: Monetization Architecture & Hosting Guide

> **Context:** This project is the interactive top-of-funnel lead magnet and companion calculation engine for the **Agentic Guild** AI Adoption monetization suite. It directly feeds the `$89` AI Code Review Build-vs-Buy Decision Kit and the `$450` 1-on-1 Architecture & Quote Audit.

---

## 1. Role in the Monetization Funnel

The calculator bridges organic social curiosity and paid executive advisory:

```
[ Top of Funnel ]
LinkedIn Posts / BMC Articles / GitHub
        │
        ▼
[ Interactive Calculator (Free Web App) ]  <── You Are Here
  • Sliders: devs, MRs, vendor quotes, maintenance days
  • Real-time visual crossover gauge
  • Immediate TCO verdict & savings calculation
  • 100% client-side: saves state in browser localStorage
        │
        ├─────────────────────────────────────────────────┐
        ▼                                                 ▼
[ Tier 0: Free 1-Page PDF Checklist ]          [ Tier 1: $89 Decision Kit ]
  • 7-Point Diagnostic                           • Excel TCO & Pilot Scorecard
  • Quick readiness gate                         • Designed 20-Page Playbook PDF
  (Lead magnet capture)                          • Fill-in-the-blank CTO Memo (.docx)
        │                                                 │
        └────────────────────────┬────────────────────────┘
                                 ▼
                     [ Tier 2: $450 1-on-1 Audit ]
                       • 60-Min Zoom working session
                       • Custom architecture & vendor quote review
```

### Conversion Triggers Embedded in the App
1. **The Readiness Gate:** Toggling "No" instantly demonstrates that without 1–2 days/week of AI Ops ownership, internal bots degrade into noise, driving buyers to evaluate vendor options or book an advisory call.
2. **Dynamic Crossover Math:** Exposes the hidden `~5%` per-team vendor maintenance factor vs. `1–2 days/week` internal maintenance, proving that 35+ dev organizations often save `$20k–$70k/yr` building internally.
3. **Footer CTAs:** Permanent footer links to the `$89` Decision Kit (`https://buymeacoffee.com/agentic.guild/e/589825`) and `$450` 1-on-1 Audit (`https://buymeacoffee.com/agentic.guild/e/589817`).

---

## 2. Browser State Persistence (localStorage)

To ensure users never lose their company numbers when refreshing, switching tabs, or returning days later:

* **Storage Key:** `aicr-tco-calculator:v1`
* **Persisted Fields:**
  - `hasCapacity` (AI Ops readiness gate toggle)
  - `devs` (Active developer headcount)
  - `mrs` (Monthly PRs/MRs reviewed)
  - `vendor` (Annual vendor seat price)
  - `token` (LLM token cost per review)
  - `eng` (Senior Engineer daily cost)
  - `maint` (Internal weekly maintenance days)
  - `vendorMaint` (Per-team vendor maintenance percentage)
  - `setup` (Initial setup engineering days)
* **Privacy Guarantee:** All data stays strictly inside the user's browser `localStorage`. No telemetry, analytics, cookies, or backend servers receive their team headcount or compensation inputs.
* **Reset Option:** A 1-click **"Reset to defaults"** button allows testing fresh scenarios without manually resetting sliders.

---

## 3. Anonymous Free / Low-Cost Hosting Guide

Currently, the repository is hosted under a personal GitHub profile. To preserve brand independence, avoid exposing personal identifiers, and present a professional corporate presence, use one of the following hosting setups:

### Option A: Cloudflare Pages (Recommended — 100% Free, Zero Personal Trace)
Cloudflare Pages hosts static HTML sites on their global edge network for free with unlimited bandwidth and free SSL.
* **Why it fits:** Completely separates the public URL from your personal GitHub handle.
* **Default URL:** `https://ai-code-review-calculator.pages.dev` (or any name you pick).
* **Custom Domain:** Free SSL on your own domain (e.g., `calculator.agenticguild.com` or `aicodereview.org`).
* **Deploy Methods:**
  1. **Direct Drag & Drop (Zero Git Connection):**
     - Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Upload assets**.
     - Drag the folder containing `index.html`. It goes live in 5 seconds without linking your GitHub account.
  2. **Direct CLI (`wrangler`):**
     ```bash
     npx wrangler pages deploy . --project-name=ai-code-review-tco-calculator
     ```

### Option B: Netlify (Free Tier — Instant Drag & Drop)
* **Default URL:** `https://ai-code-review-calculator.netlify.app`
* **Setup:**
  - Log into [netlify.com](https://www.netlify.com).
  - Drag the project directory into the "Deploy manually" dropzone.
  - Set a custom site name (e.g., `ai-code-review-calculator.netlify.app`).
  - No GitHub connection or author history is displayed.

### Option C: Vercel (Free Hobby Tier)
* **Deploy via CLI:**
  ```bash
  npx vercel --prod
  ```
  Choose a generic project name. It serves at `https://<project-name>.vercel.app`.

### Option D: Dedicated Brand GitHub Organization (If you prefer Git-based CI/CD)
If you want automated GitHub Actions deployment without revealing your personal identity:
1. Create a clean GitHub organization named `agentic-guild` (or `agentic-advisory`).
2. Transfer or push this repository to `github.com/agentic-guild/ai-code-review-tco-calculator`.
3. Enable GitHub Pages on the org repository.
4. Public URL: `https://agentic-guild.github.io/ai-code-review-tco-calculator/` or attach a custom domain with a `CNAME` file.

---

## 4. Maintenance & Local Development

Test changes locally without any dependencies:
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080` in your browser.
