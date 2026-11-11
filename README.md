# AI Code Review: Build vs. Buy Cost Calculator

A static, browser-based calculator for comparing buyer-entered first-year and recurring cost estimates for an internal AI code-review approach and a commercial vendor option.

## What it does

- Checks whether each option is marked as meeting the buyer's hard requirements before showing a cost-based result.
- Requires the buyer to enter current vendor pricing, review overages, setup, oversight, internal token cost, infrastructure, engineering effort, and owner capacity.
- Separates one-time setup from recurring annual costs and uses 50 working weeks to annualize weekly engineering effort.
- Reports when an option is marked infeasible, when requirements remain unknown, or when neither option is currently feasible; cost does not override those constraints.
- Stores inputs in the current browser's local storage. The page contains no analytics or code that submits the entered values to a server.

The companion checklist reports an owner-observed cost of about $2 per pull request in model tokens, excluding engineering time and infrastructure. That is one person's experience, not a benchmark or a default for this calculator. Use your own current data and quote. The estimates are scenario-specific and are not guarantees or substitutes for security, legal, or procurement review.

## Cost scope

- **Vendor Year 1:** annual license/seat quote for the buyer's scope + annual overages/usage charges + one-time setup + one-time trial/evaluation engineering + annualized customer oversight.
- **Vendor recurring annual estimate:** annual license/seat quote for the buyer's scope + annual overages/usage charges + annualized customer oversight.
- **Internal Year 1:** annual model-token use + annual hosting/infrastructure + one-time setup, pilot, and evaluation engineering + Year 1 average maintenance effort.
- **Internal recurring annual estimate:** annual model-token use + annual hosting/infrastructure + mature maintenance effort.

Owner capacity is checked against the larger of the two maintenance estimates. When Year 1 and recurring comparisons favor different options, the result says so.

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
