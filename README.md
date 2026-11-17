# AI Code Review: Build vs. Buy Cost Calculator

A static, browser-based calculator for comparing buyer-entered first-year and recurring cost estimates for an internal AI code-review approach and a commercial vendor option.

## What it does

- Pre-loads an illustrative starting scenario (`50` developers, `$500/dev/yr` vendor seat, `100` team PRs/month, `$100,000/yr` fully loaded engineering cost) that you can adjust via sliders or direct input.
- Separates one-time setup and evaluation from recurring annual costs using 50 working weeks (250 working days) per year, with automatic `/ day`, `/ month`, and `/ year` engineering rate conversion.
- Visualizes where your inputs land across **Buy zone**, **Crossover Zone (±10%)**, and **Build zone**, along with break-even team size.
- Checks owner capacity against peak maintenance and flags any Year 1 estimate that exceeds an optional budget cap.
- Runs entirely in the browser with no analytics, local storage, or server submissions.

As an illustrative reference (not an industry benchmark), one real-world CI setup saw about $2 per review run on frontier models (roughly $4 per PR at ~2 review runs per PR) in model tokens, excluding engineering time and infrastructure. Use your own current data and vendor quote.

## Cost scope

- **Buy (Vendor) Year 1:** `(developers × seat price/dev/year)` + annual PR overages + one-time setup + trial/evaluation engineering + annualized oversight.
- **Buy (Vendor) recurring annual:** `(developers × seat price/dev/year)` + annual PR overages + annualized oversight.
- **Build (Internal) Year 1:** annual model-token use (`team PRs/month × 12 × token cost per review run × review runs per PR`) + annual hosting/infrastructure + one-time setup/pilot engineering + Year 1 average maintenance effort.
- **Build (Internal) recurring annual:** annual model-token use + annual hosting/infrastructure + mature maintenance effort.

Owner capacity is checked against the larger of the two maintenance estimates. When Year 1 and recurring comparisons favor different options, the result says so. An optional first-year budget input checks whether feasible Year 1 estimates fit within the buyer's budget.

All rates and amounts are buyer inputs. Engineering time is annualized using 50 working weeks; enter 0 only if you have confirmed the cost or capacity is zero. Any omitted cost remains outside the estimate.

## Run and test locally

Open `index.html` in a modern browser, or run a local static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

Run the calculation and feasibility tests with Node.js:

```bash
node --test calculator-core.test.js
node --check calculator-core.js
node --check calculator.js
```

No build step or third-party runtime dependency is required.
