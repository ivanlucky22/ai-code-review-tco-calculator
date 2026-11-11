'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { estimate, REQUIRED_NUMBERS, WORKING_WEEKS_PER_YEAR } = require('./calculator-core.js');

const complete = (overrides = {}) => ({
  vendorLicense: '1000',
  vendorOverages: '200',
  vendorSetup: '300',
  vendorOversightDaysPerWeek: '0.1',
  vendorEvaluationDays: '2',
  monthlyReviews: '50',
  tokenCostPerReview: '2',
  internalInfrastructure: '400',
  internalSetupDays: '4',
  internalMaintenanceYearOneDaysPerWeek: '1',
  internalMaintenanceDaysPerWeek: '0.5',
  engineeringCostPerDay: '400',
  availableOwnerDaysPerWeek: '1.5',
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
  assert.equal(result.costs.internal.tokens, 1200);
  assert.equal(result.costs.internal.maintenanceYearOne, 20000);
  assert.equal(result.costs.internal.maintenance, 10000);
  assert.equal(result.costs.internal.ongoing, 11600);
  assert.equal(result.costs.internal.yearOne, 23200);
  assert.equal(result.decision.status, 'vendor-lower-cost');
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
  const requiredIds = [...REQUIRED_NUMBERS, 'vendorFeasibility', 'internalFeasibility'];
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
    vendorLicense: '23200',
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
  // Vendor Year 1 = 25000 + 0 + 0 + 0 = 25000 vs internal 23200 -> internal cheaper in Year 1.
  // Vendor recurring = 25000 vs internal 11600 -> internal cheaper ongoing: same direction, no note.
  assert.equal(estimate(complete({ vendorLicense: '25000', vendorOverages: '0', vendorSetup: '0', vendorOversightDaysPerWeek: '0', vendorEvaluationDays: '0' })).decision.ongoingNote, '');
  // Vendor Year 1 = 15000 < internal 23200, but vendor recurring 15000 > internal 11600.
  const mixed = estimate(complete({ vendorLicense: '15000', vendorOverages: '0', vendorSetup: '0', vendorOversightDaysPerWeek: '0', vendorEvaluationDays: '0' }));
  assert.equal(mixed.decision.status, 'vendor-lower-cost');
  assert.match(mixed.decision.ongoingNote, /recurring annual estimates point the other way/);
});

test('every element id in the page is unique', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});
