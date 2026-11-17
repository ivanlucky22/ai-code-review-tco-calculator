'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { estimate, REQUIRED_NUMBERS, OPTIONAL_NUMBERS, WORKING_WEEKS_PER_YEAR, WORKING_DAYS_PER_YEAR } = require('./calculator-core.js');

const complete = (overrides = {}) => ({
  developerCount: '10',
  vendorSeatCostPerDevYear: '100',
  vendorOverages: '200',
  vendorSetup: '300',
  vendorOversightDaysPerWeek: '0.1',
  vendorEvaluationDays: '2',
  monthlyReviews: '50',
  tokenCostPerReview: '2',
  reviewRunsPerPR: '2',
  internalInfrastructure: '400',
  internalSetupDays: '4',
  internalMaintenanceYearOneDaysPerWeek: '1',
  internalMaintenanceDaysPerWeek: '0.5',
  engineeringCost: '400',
  engineeringCostUnit: 'day',
  availableOwnerDaysPerWeek: '1.5',
  firstYearBudget: '',
  vendorFeasibility: 'yes',
  internalFeasibility: 'yes',
  ...overrides,
});

test('uses 50 working weeks and separates Year 1 setup from ongoing cost', () => {
  assert.equal(WORKING_WEEKS_PER_YEAR, 50);
  assert.equal(WORKING_DAYS_PER_YEAR, 250);
  const result = estimate(complete());
  assert.deepEqual(result.errors, []);
  assert.equal(result.costs.vendor.license, 1000);
  assert.equal(result.costs.vendor.oversight, 2000);
  assert.equal(result.costs.vendor.ongoing, 3200);
  assert.equal(result.costs.vendor.evaluation, 800);
  assert.equal(result.costs.vendor.yearOne, 4300);
  assert.equal(result.costs.internal.tokenCostPerPR, 4);
  assert.equal(result.costs.internal.tokens, 2400);
  assert.equal(result.costs.internal.maintenanceYearOne, 20000);
  assert.equal(result.costs.internal.maintenance, 10000);
  assert.equal(result.costs.internal.ongoing, 12800);
  assert.equal(result.costs.internal.yearOne, 24400);
  assert.equal(result.decision.status, 'vendor-lower-cost');
  assert.equal(result.decision.budgetNote, '');
});

test('converts engineering cost from month and year using 250 working days', () => {
  const byYear = estimate(complete({ engineeringCost: '100000', engineeringCostUnit: 'year' }));
  assert.equal(byYear.costs.engineeringCostPerDay, 400);
  assert.equal(byYear.costs.vendor.yearOne, 4300);

  const byMonth = estimate(complete({ engineeringCost: String((400 * 250) / 12), engineeringCostUnit: 'month' }));
  assert.equal(Math.round(byMonth.costs.engineeringCostPerDay), 400);
  assert.equal(Math.round(byMonth.costs.vendor.yearOne), 4300);
});

test('does not recommend either option while any relevant feasibility is unknown', () => {
  assert.equal(estimate(complete({ vendorFeasibility: 'unknown' })).decision.status, 'verify-first');
  assert.equal(estimate(complete({ internalFeasibility: 'unknown' })).decision.status, 'verify-first');
});

test('reports no feasible option when both fail hard requirements', () => {
  assert.equal(estimate(complete({ vendorFeasibility: 'no', internalFeasibility: 'no' })).decision.status, 'none-feasible');
});

test('limits the feasible path when exactly one option passes', () => {
  assert.equal(estimate(complete({ vendorFeasibility: 'yes', internalFeasibility: 'no' })).decision.status, 'vendor-only');
  assert.equal(estimate(complete({ vendorFeasibility: 'no', internalFeasibility: 'yes' })).decision.status, 'build-only');
});

test('treats insufficient owner capacity as internal infeasibility', () => {
  const result = estimate(complete({ availableOwnerDaysPerWeek: '0.75' }));
  assert.equal(result.decision.internalFeasibility, 'no');
  assert.match(result.decision.capacityNote, /below peak upkeep/);
  assert.equal(result.decision.status, 'build-excluded-capacity');
});

test('withholds estimates and recommendation when inputs are incomplete or invalid', () => {
  assert.ok(estimate(complete({ developerCount: '' })).errors.length > 0);
  assert.equal(estimate(complete({ vendorSeatCostPerDevYear: '-1' })).decision, null);
});

test('calculator markup exposes every required input and referenced element', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const browserJs = fs.readFileSync(path.join(__dirname, 'calculator.js'), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const requiredIds = [...REQUIRED_NUMBERS, ...OPTIONAL_NUMBERS, 'engineeringCostUnit'];
  for (const id of requiredIds) assert.ok(ids.has(id), `missing input element: ${id}`);
  for (const [, id] of browserJs.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.has(id), `missing referenced element: ${id}`);
  assert.match(html, /calculator-core\.js/);
  assert.match(html, /calculator\.js/);
});

test('does not retain unsupported calculator headline claims', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  for (const claim of ['$1.70', '$400/dev', '5% of engineering time', 'within 60 days', 'break-even at']) {
    assert.ok(!html.toLowerCase().includes(claim.toLowerCase()), `unsupported claim remains: ${claim}`);
  }
});

test('reports equal Year 1 totals without arbitrarily choosing a winner', () => {
  const input = complete({
    developerCount: '10',
    vendorSeatCostPerDevYear: '2440',
    vendorOverages: '0',
    vendorSetup: '0',
    vendorOversightDaysPerWeek: '0',
    vendorEvaluationDays: '0',
  });
  assert.equal(estimate(input).decision.status, 'similar-cost');
});

test('checks owner capacity against the heavier Year 1 maintenance estimate', () => {
  const result = estimate(complete({ availableOwnerDaysPerWeek: '0.75' }));
  assert.equal(result.decision.internalFeasibility, 'no');
});

test('flags when Year 1 and recurring cost comparisons point in different directions', () => {
  assert.equal(estimate(complete({ developerCount: '10', vendorSeatCostPerDevYear: '2600', vendorOverages: '0', vendorSetup: '0', vendorOversightDaysPerWeek: '0', vendorEvaluationDays: '0' })).decision.ongoingNote, '');
  const mixed = estimate(complete({ developerCount: '10', vendorSeatCostPerDevYear: '1500', vendorOverages: '0', vendorSetup: '0', vendorOversightDaysPerWeek: '0', vendorEvaluationDays: '0' }));
  assert.equal(mixed.decision.status, 'vendor-lower-cost');
  assert.match(mixed.decision.ongoingNote, /recurring annual estimates point the other way/);
});

test('validates and compares optional first-year budget against feasible Year 1 totals', () => {
  assert.ok(estimate(complete({ firstYearBudget: '-100' })).errors.length > 0);
  assert.match(estimate(complete({ firstYearBudget: '30000' })).decision.budgetNote, /Both feasible options fit/);
  assert.match(estimate(complete({ firstYearBudget: '10000' })).decision.budgetNote, /Only the Buy \(vendor\) Year 1 estimate fits/);
  assert.match(estimate(complete({ firstYearBudget: '2000' })).decision.budgetNote, /Neither feasible option fits/);
  assert.equal(estimate(complete({ firstYearBudget: '10000', vendorFeasibility: 'unknown' })).decision.budgetNote, '');
});

test('matches checklist token-cost-per-PR wording in page and readme', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  assert.ok(!html.includes('$2 per PR'));
  assert.ok(!readme.includes('$2 per pull request'));
  assert.match(html, /\$2 per review run/);
  assert.match(readme, /\$2 per review run/);
});

test('computes Buy/Build cost zone and break-even developer count when both options are feasible', () => {
  const buyZone = estimate(complete({ developerCount: '10', vendorSeatCostPerDevYear: '600' }));
  assert.equal(buyZone.decision.zone.lean, 'buy');
  assert.ok(buyZone.decision.zone.positionPct < 45);
  assert.equal(buyZone.decision.zone.breakEvenDevsYearOne, 35);

  const buildZone = estimate(complete({ developerCount: '100', vendorSeatCostPerDevYear: '600' }));
  assert.equal(buildZone.decision.zone.lean, 'build');
  assert.ok(buildZone.decision.zone.positionPct > 55);

  const infeasible = estimate(complete({ vendorFeasibility: 'no' }));
  assert.equal(infeasible.decision.zone, null);
});

test('every element id in the page is unique', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});

test('zone marker position always falls inside the segment matching lean', () => {
  const buy = estimate(complete({ developerCount: '10', vendorSeatCostPerDevYear: '600' }));
  assert.equal(buy.decision.zone.lean, 'buy');
  assert.ok(buy.decision.zone.positionPct < 40, `expected <40, got ${buy.decision.zone.positionPct}`);

  const build = estimate(complete({ developerCount: '100', vendorSeatCostPerDevYear: '600' }));
  assert.equal(build.decision.zone.lean, 'build');
  assert.ok(build.decision.zone.positionPct > 60, `expected >60, got ${build.decision.zone.positionPct}`);

  // Equal Year 1 totals -> within ±10% close band
  const close = estimate(complete({
    developerCount: '10',
    vendorSeatCostPerDevYear: '2440',
    vendorOverages: '0',
    vendorSetup: '0',
    vendorOversightDaysPerWeek: '0',
    vendorEvaluationDays: '0',
  }));
  assert.equal(close.decision.zone.lean, 'close');
  assert.equal(close.decision.status, 'similar-cost');
  assert.ok(close.decision.zone.positionPct >= 40 && close.decision.zone.positionPct <= 60, `expected 40..60, got ${close.decision.zone.positionPct}`);
});

test('owner capacity below peak upkeep triggers build-excluded-capacity status', () => {
  const result = estimate(complete({ availableOwnerDaysPerWeek: '0.5' }));
  assert.equal(result.decision.status, 'build-excluded-capacity');
  assert.equal(result.decision.internalFeasibility, 'no');
  assert.match(result.decision.message, /Build \(internal\) excluded/);
});

test('over-budget flags reflect firstYearBudget accurately', () => {
  const result = estimate(complete({ developerCount: '100', vendorSeatCostPerDevYear: '600', firstYearBudget: '30000' }));
  assert.equal(result.decision.vendorOverBudget, true);
  assert.equal(result.decision.internalOverBudget, false);
});
