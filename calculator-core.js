(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalculatorCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORKING_WEEKS_PER_YEAR = 50;
  const REQUIRED_NUMBERS = [
    'vendorLicense',
    'vendorOverages',
    'vendorSetup',
    'vendorOversightDaysPerWeek',
    'vendorEvaluationDays',
    'monthlyReviews',
    'tokenCostPerReview',
    'internalInfrastructure',
    'internalSetupDays',
    'internalMaintenanceYearOneDaysPerWeek',
    'internalMaintenanceDaysPerWeek',
    'engineeringCostPerDay',
    'availableOwnerDaysPerWeek',
  ];

  function validate(input) {
    const errors = [];
    const labels = {
      vendorLicense: 'Annual vendor license/seat quote for your team',
      vendorOverages: 'Annual PR overages or usage charges',
      vendorSetup: 'One-time vendor setup/onboarding cost',
      vendorOversightDaysPerWeek: 'Vendor oversight time in days per week',
      vendorEvaluationDays: 'One-time vendor trial and evaluation engineering days',
      monthlyReviews: 'Pull requests reviewed each month',
      tokenCostPerReview: 'Model token cost per PR review',
      internalInfrastructure: 'Annual internal hosting and infrastructure cost',
      internalSetupDays: 'Internal setup, pilot, and evaluation days',
      internalMaintenanceYearOneDaysPerWeek: 'Year 1 average internal maintenance days per week',
      internalMaintenanceDaysPerWeek: 'Ongoing (mature) internal maintenance days per week',
      engineeringCostPerDay: 'Fully loaded engineering cost per day',
      availableOwnerDaysPerWeek: 'Owner capacity available in days per week',
    };
    for (const field of REQUIRED_NUMBERS) {
      const value = input[field];
      if (value === '' || value === null || value === undefined) {
        errors.push(`${labels[field]} is required`);
      } else if (!Number.isFinite(Number(value)) || Number(value) < 0) {
        errors.push(`${labels[field]} must be a non-negative number`);
      }
    }
    if (input.vendorFeasibility !== 'yes' && input.vendorFeasibility !== 'no' && input.vendorFeasibility !== 'unknown') {
      errors.push('Choose whether the vendor option meets the mandatory requirements: yes, no, or unknown');
    }
    if (input.internalFeasibility !== 'yes' && input.internalFeasibility !== 'no' && input.internalFeasibility !== 'unknown') {
      errors.push('Choose whether the internal option meets the mandatory requirements: yes, no, or unknown');
    }
    return errors;
  }

  function estimate(input) {
    const errors = validate(input);
    if (errors.length) return { errors, costs: null, decision: null };

    const n = Object.fromEntries(REQUIRED_NUMBERS.map((key) => [key, Number(input[key])]));
    const vendorLicense = n.vendorLicense;
    const vendorOversight = n.vendorOversightDaysPerWeek * WORKING_WEEKS_PER_YEAR * n.engineeringCostPerDay;
    const vendorOngoing = vendorLicense + n.vendorOverages + vendorOversight;
    const vendorEvaluation = n.vendorEvaluationDays * n.engineeringCostPerDay;
    const vendorYearOne = vendorOngoing + n.vendorSetup + vendorEvaluation;

    const internalTokens = n.monthlyReviews * 12 * n.tokenCostPerReview;
    const internalMaintenance = n.internalMaintenanceDaysPerWeek * WORKING_WEEKS_PER_YEAR * n.engineeringCostPerDay;
    const internalMaintenanceYearOne = n.internalMaintenanceYearOneDaysPerWeek * WORKING_WEEKS_PER_YEAR * n.engineeringCostPerDay;
    const internalSetup = n.internalSetupDays * n.engineeringCostPerDay;
    const internalOngoing = internalTokens + n.internalInfrastructure + internalMaintenance;
    const internalYearOne = internalTokens + n.internalInfrastructure + internalMaintenanceYearOne + internalSetup;

    const vendorState = input.vendorFeasibility;
    let internalState = input.internalFeasibility;
    let capacityNote = '';
    const peakMaintenance = Math.max(n.internalMaintenanceYearOneDaysPerWeek, n.internalMaintenanceDaysPerWeek);
    if (internalState === 'yes' && n.availableOwnerDaysPerWeek < peakMaintenance) {
      internalState = 'no';
      capacityNote = 'Available owner time is below the internal maintenance estimate.';
    }

    let decision;
    if (vendorState === 'unknown' || internalState === 'unknown') {
      decision = { status: 'verify-first', message: 'Verify the unknown hard requirements before choosing an option.' };
    } else if (vendorState === 'no' && internalState === 'no') {
      decision = { status: 'none-feasible', message: 'Neither option currently meets the stated requirements. Resolve the constraints or defer the decision.' };
    } else if (vendorState === 'yes' && internalState === 'no') {
      decision = { status: 'vendor-only', message: 'Only the vendor option is marked feasible. Confirm the quote and contract scope before proceeding.' };
    } else if (vendorState === 'no' && internalState === 'yes') {
      decision = { status: 'build-only', message: 'Only the internal option is marked feasible. Confirm ownership and operating requirements before proceeding.' };
    } else if (vendorYearOne < internalYearOne) {
      decision = { status: 'vendor-lower-cost', message: 'The vendor estimate is lower in Year 1 under these inputs; this does not override fit or risk.' };
    } else if (internalYearOne < vendorYearOne) {
      decision = { status: 'build-lower-cost', message: 'The internal estimate is lower in Year 1 under these inputs; this does not override fit or risk.' };
    } else {
      decision = { status: 'similar-cost', message: 'The Year 1 estimates are equal under these inputs. Decide based on constraints, ownership, and measured pilot results.' };
    }

    let ongoingNote = '';
    if (vendorState === 'yes' && internalState === 'yes') {
      const yearOneSign = Math.sign(vendorYearOne - internalYearOne);
      const ongoingSign = Math.sign(vendorOngoing - internalOngoing);
      if (yearOneSign !== 0 && ongoingSign !== 0 && yearOneSign !== ongoingSign) {
        ongoingNote = 'The recurring annual estimates point the other way once one-time costs drop out; weigh both horizons.';
      }
    }

    return {
      errors: [],
      costs: {
        vendor: { license: vendorLicense, overages: n.vendorOverages, setup: n.vendorSetup, evaluation: vendorEvaluation, oversight: vendorOversight, yearOne: vendorYearOne, ongoing: vendorOngoing },
        internal: { tokens: internalTokens, infrastructure: n.internalInfrastructure, setup: internalSetup, maintenanceYearOne: internalMaintenanceYearOne, maintenance: internalMaintenance, yearOne: internalYearOne, ongoing: internalOngoing },
        workWeeksPerYear: WORKING_WEEKS_PER_YEAR,
      },
      decision: { ...decision, vendorFeasibility: vendorState, internalFeasibility: internalState, capacityNote, ongoingNote },
    };
  }

  return { WORKING_WEEKS_PER_YEAR, REQUIRED_NUMBERS, validate, estimate };
});
