'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { estimate, REQUIRED_NUMBERS, OPTIONAL_NUMBERS, WORKING_WEEKS_PER_YEAR } = require('./calculator-core.js');

const complete = (overrides = {}) => ({
  vendorLicense: '1000',
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
  engineeringCostPerDay: '400',
  availableOwnerDaysPerWeek: '1.5',
  firstYearBudget: '',
  vendorFeasibility: 'yes',
  internalFeasibility: 'yes',
  ...overrides,
});

test('uses 50 working weeks and separates Year 1 setup from ongoing cost', () => {
  assert.equal(WORKING_WEEKS_PER_YEAR, 50);
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
  assert.match(result.decision.capacityNote, /below the internal maintenance estimate/);
  assert.equal(result.decision.status, 'vendor-only');
});

test('withholds estimates and recommendation when inputs are incomplete or invalid', () => {
  assert.ok(estimate(complete({ vendorLicense: '' })).errors.length > 0);
  assert.equal(estimate(complete({ vendorLicense: '-1' })).decision, null);
});

test('calculator markup exposes every required input and referenced element', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const browserJs = fs.readFileSync(path.join(__dirname, 'calculator.js'), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const requiredIds = [...REQUIRED_NUMBERS, ...OPTIONAL_NUMBERS, 'vendorFeasibility', 'internalFeasibility'];
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
    vendorLicense: '24400',
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
  // Vendor Year 1 = 26000 vs internal 24400 -> internal cheaper in Year 1.
  // Vendor recurring = 26000 vs internal 12800 -> internal cheaper ongoing: same direction, no note.
  assert.equal(estimate(complete({ vendorLicense: '26000', vendorOverages: '0', vendorSetup: '0', vendorOversightDaysPerWeek: '0', vendorEvaluationDays: '0' })).decision.ongoingNote, '');
  // Vendor Year 1 = 15000 < internal 24400, but vendor recurring 15000 > internal 12800.
  const mixed = estimate(complete({ vendorLicense: '15000', vendorOverages: '0', vendorSetup: '0', vendorOversightDaysPerWeek: '0', vendorEvaluationDays: '0' }));
  assert.equal(mixed.decision.status, 'vendor-lower-cost');
  assert.match(mixed.decision.ongoingNote, /recurring annual estimates point the other way/);
});

test('validates and compares optional first-year budget against feasible Year 1 totals', () => {
  assert.ok(estimate(complete({ firstYearBudget: '-100' })).errors.length > 0);
  assert.match(estimate(complete({ firstYearBudget: '30000' })).decision.budgetNote, /Both feasible options fit/);
  assert.match(estimate(complete({ firstYearBudget: '10000' })).decision.budgetNote, /Only the vendor Year 1 estimate fits/);
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

test('every element id in the page is unique', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});
