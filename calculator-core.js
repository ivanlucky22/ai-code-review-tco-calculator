(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalculatorCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORKING_WEEKS_PER_YEAR = 50;
  const WORKING_DAYS_PER_YEAR = WORKING_WEEKS_PER_YEAR * 5;
  const ENGINEERING_COST_UNITS = ['day', 'month', 'year'];
  const REQUIRED_NUMBERS = [
    'developerCount',
    'vendorSeatCostPerDevYear',
    'vendorOverages',
    'vendorSetup',
    'vendorOversightDaysPerWeek',
    'vendorEvaluationDays',
    'monthlyReviews',
    'tokenCostPerReview',
    'reviewRunsPerPR',
    'internalInfrastructure',
    'internalSetupDays',
    'internalMaintenanceYearOneDaysPerWeek',
    'internalMaintenanceDaysPerWeek',
    'engineeringCost',
    'availableOwnerDaysPerWeek',
  ];
  const OPTIONAL_NUMBERS = ['firstYearBudget'];

  function toDailyEngineeringCost(amount, unit) {
    if (unit === 'day') return amount;
    if (unit === 'month') return (amount * 12) / WORKING_DAYS_PER_YEAR;
    return amount / WORKING_DAYS_PER_YEAR;
  }

  function validate(input) {
    const errors = [];
    const labels = {
      developerCount: 'Number of developers',
      vendorSeatCostPerDevYear: 'Vendor license cost per developer per year',
      vendorOverages: 'Annual PR overages or usage charges',
      vendorSetup: 'One-time vendor setup/onboarding cost',
      vendorOversightDaysPerWeek: 'Vendor oversight time in days per week',
      vendorEvaluationDays: 'One-time vendor trial and evaluation engineering days',
      monthlyReviews: 'Pull requests reviewed each month',
      tokenCostPerReview: 'Model token cost per review run',
      reviewRunsPerPR: 'Average review runs per PR',
      internalInfrastructure: 'Annual internal hosting and infrastructure cost',
      internalSetupDays: 'Internal setup, pilot, and evaluation days',
      internalMaintenanceYearOneDaysPerWeek: 'Year 1 average internal maintenance days per week',
      internalMaintenanceDaysPerWeek: 'Ongoing (mature) internal maintenance days per week',
      engineeringCost: 'Fully loaded engineering cost',
      availableOwnerDaysPerWeek: 'Owner capacity available in days per week',
      firstYearBudget: 'First-year budget',
    };
    for (const field of REQUIRED_NUMBERS) {
      const value = input[field];
      if (value === '' || value === null || value === undefined) {
        errors.push(`${labels[field]} is required`);
      } else if (!Number.isFinite(Number(value)) || Number(value) < 0) {
        errors.push(`${labels[field]} must be a non-negative number`);
      }
    }
    for (const field of OPTIONAL_NUMBERS) {
      const value = input[field];
      if (value === '' || value === null || value === undefined) continue;
      if (!Number.isFinite(Number(value)) || Number(value) < 0) {
        errors.push(`${labels[field]} must be a non-negative number`);
      }
    }
    if (!ENGINEERING_COST_UNITS.includes(input.engineeringCostUnit)) {
      errors.push('Choose an engineering cost period: day, month, or year');
    }
    if (input.vendorFeasibility !== undefined && input.vendorFeasibility !== 'yes' && input.vendorFeasibility !== 'no' && input.vendorFeasibility !== 'unknown') {
      errors.push('Choose whether the vendor option meets the mandatory requirements: yes, no, or unknown');
    }
    if (input.internalFeasibility !== undefined && input.internalFeasibility !== 'yes' && input.internalFeasibility !== 'no' && input.internalFeasibility !== 'unknown') {
      errors.push('Choose whether the internal option meets the mandatory requirements: yes, no, or unknown');
    }
    return errors;
  }

  function estimate(input) {
    const errors = validate(input);
    if (errors.length) return { errors, costs: null, decision: null };

    const n = Object.fromEntries(REQUIRED_NUMBERS.map((key) => [key, Number(input[key])]));
    const engineeringCostPerDay = toDailyEngineeringCost(n.engineeringCost, input.engineeringCostUnit);

    const vendorLicense = n.developerCount * n.vendorSeatCostPerDevYear;
    const vendorOversight = n.vendorOversightDaysPerWeek * WORKING_WEEKS_PER_YEAR * engineeringCostPerDay;
    const vendorOngoing = vendorLicense + n.vendorOverages + vendorOversight;
    const vendorEvaluation = n.vendorEvaluationDays * engineeringCostPerDay;
    const vendorYearOne = vendorOngoing + n.vendorSetup + vendorEvaluation;

    const tokenCostPerPR = n.tokenCostPerReview * n.reviewRunsPerPR;
    const internalTokens = n.monthlyReviews * 12 * tokenCostPerPR;
    const internalMaintenance = n.internalMaintenanceDaysPerWeek * WORKING_WEEKS_PER_YEAR * engineeringCostPerDay;
    const internalMaintenanceYearOne = n.internalMaintenanceYearOneDaysPerWeek * WORKING_WEEKS_PER_YEAR * engineeringCostPerDay;
    const internalSetup = n.internalSetupDays * engineeringCostPerDay;
    const internalOngoing = internalTokens + n.internalInfrastructure + internalMaintenance;
    const internalYearOne = internalTokens + n.internalInfrastructure + internalMaintenanceYearOne + internalSetup;

    const vendorState = input.vendorFeasibility || 'yes';
    let internalState = input.internalFeasibility || 'yes';
    let capacityNote = '';
    let internalExcludedByCapacity = false;
    const peakMaintenance = Math.max(n.internalMaintenanceYearOneDaysPerWeek, n.internalMaintenanceDaysPerWeek);
    if (internalState === 'yes' && n.availableOwnerDaysPerWeek < peakMaintenance) {
      internalState = 'no';
      internalExcludedByCapacity = true;
      capacityNote = `Build (internal) excluded: owner capacity (${n.availableOwnerDaysPerWeek} d/wk) is below peak upkeep (${peakMaintenance} d/wk).`;
    }

    const maxYearOne = Math.max(vendorYearOne, internalYearOne);
    const diffYearOne = internalYearOne - vendorYearOne; // >0 means Buy cheaper, <0 means Build cheaper
    const relDiff = maxYearOne > 0 ? Math.abs(diffYearOne) / maxYearOne : 0;

    let decision;
    if (vendorState === 'unknown' || internalState === 'unknown') {
      decision = { status: 'verify-first', message: 'Verify the unknown hard requirements before choosing an option.' };
    } else if (vendorState === 'no' && internalState === 'no') {
      decision = { status: 'none-feasible', message: 'Neither option currently meets the stated requirements. Resolve the constraints or defer the decision.' };
    } else if (vendorState === 'yes' && internalExcludedByCapacity) {
      decision = { status: 'build-excluded-capacity', message: `${capacityNote} Only Buy (vendor) meets capacity; confirm the quote and contract scope before proceeding.` };
    } else if (vendorState === 'yes' && internalState === 'no') {
      decision = { status: 'vendor-only', message: 'Only Buy (vendor) is marked feasible. Confirm the quote and contract scope before proceeding.' };
    } else if (vendorState === 'no' && internalState === 'yes') {
      decision = { status: 'build-only', message: 'Only Build (internal) is marked feasible. Confirm ownership and operating requirements before proceeding.' };
    } else if (relDiff <= 0.1) {
      decision = { status: 'similar-cost', message: 'Close call: Year 1 estimates for Buy (vendor) and Build (internal) are within ±10%. Decide based on constraints, ownership, and measured pilot results.' };
    } else if (vendorYearOne < internalYearOne) {
      decision = { status: 'vendor-lower-cost', message: 'Buy (vendor) estimate is lower in Year 1 under these inputs; this does not override fit or risk.' };
    } else {
      decision = { status: 'build-lower-cost', message: 'Build (internal) estimate is lower in Year 1 under these inputs; this does not override fit or risk.' };
    }

    let ongoingNote = '';
    if (vendorState === 'yes' && internalState === 'yes') {
      const yearOneSign = Math.sign(vendorYearOne - internalYearOne);
      const ongoingSign = Math.sign(vendorOngoing - internalOngoing);
      if (yearOneSign !== 0 && ongoingSign !== 0 && yearOneSign !== ongoingSign) {
        ongoingNote = 'The recurring annual estimates point the other way once one-time costs drop out; weigh both horizons.';
      }
    }

    let budgetNote = '';
    let vendorOverBudget = false;
    let internalOverBudget = false;
    const rawBudget = input.firstYearBudget;
    const hasBudget = rawBudget !== '' && rawBudget !== null && rawBudget !== undefined;
    if (hasBudget && vendorState !== 'unknown' && internalState !== 'unknown') {
      const budget = Number(rawBudget);
      vendorOverBudget = vendorYearOne > budget;
      internalOverBudget = internalYearOne > budget;
      const vendorFits = vendorState === 'yes' && !vendorOverBudget;
      const internalFits = internalState === 'yes' && !internalOverBudget;
      if (vendorState === 'yes' && internalState === 'yes') {
        if (vendorFits && internalFits) {
          budgetNote = 'Both feasible options fit within your first-year budget.';
        } else if (vendorFits) {
          budgetNote = 'Only the Buy (vendor) Year 1 estimate fits within your first-year budget.';
        } else if (internalFits) {
          budgetNote = 'Only the Build (internal) Year 1 estimate fits within your first-year budget.';
        } else {
          budgetNote = 'Neither feasible option fits within your first-year budget; consider a scoped trial or deferring.';
        }
      } else if (vendorState === 'yes') {
        budgetNote = vendorFits
          ? 'The Buy (vendor) Year 1 estimate fits within your first-year budget.'
          : 'The Buy (vendor) Year 1 estimate exceeds your first-year budget; consider a scoped trial or deferring.';
      } else if (internalState === 'yes') {
        budgetNote = internalFits
          ? 'The Build (internal) Year 1 estimate fits within your first-year budget.'
          : 'The Build (internal) Year 1 estimate exceeds your first-year budget; consider a scoped pilot or deferring.';
      }
    }

    let zone = null;
    if (vendorState === 'yes' && internalState === 'yes') {
      let lean = 'close';
      if (relDiff > 0.1) lean = diffYearOne > 0 ? 'buy' : 'build';
      // Piecewise mapping matching 3.5fr | 3fr | 3.5fr track (0-35% Buy, 35-65% Crossover, 65-100% Build)
      let positionPct;
      if (relDiff <= 0.1) {
        const signedRel = maxYearOne > 0 ? -diffYearOne / maxYearOne : 0;
        positionPct = Math.round(50 + (signedRel / 0.1) * 15);
      } else {
        const t = Math.min(1, (relDiff - 0.1) / 0.9);
        positionPct = diffYearOne > 0
          ? Math.round(35 - t * 31)
          : Math.round(65 + t * 31);
      }
      const vendorFixedNonSeatYearOne = vendorYearOne - vendorLicense;
      const vendorFixedNonSeatOngoing = vendorOngoing - vendorLicense;
      const breakEvenDevsYearOne = n.vendorSeatCostPerDevYear > 0
        ? Math.max(0, Math.round((internalYearOne - vendorFixedNonSeatYearOne) / n.vendorSeatCostPerDevYear))
        : null;
      const breakEvenDevsOngoing = n.vendorSeatCostPerDevYear > 0
        ? Math.max(0, Math.round((internalOngoing - vendorFixedNonSeatOngoing) / n.vendorSeatCostPerDevYear))
        : null;
      zone = { lean, positionPct, relDiffPct: Math.round(relDiff * 100), breakEvenDevsYearOne, breakEvenDevsOngoing };
    }

    return {
      errors: [],
      costs: {
        vendor: { license: vendorLicense, overages: n.vendorOverages, setup: n.vendorSetup, evaluation: vendorEvaluation, oversight: vendorOversight, yearOne: vendorYearOne, ongoing: vendorOngoing },
        internal: { tokenCostPerPR, tokens: internalTokens, infrastructure: n.internalInfrastructure, setup: internalSetup, maintenanceYearOne: internalMaintenanceYearOne, maintenance: internalMaintenance, yearOne: internalYearOne, ongoing: internalOngoing },
        engineeringCostPerDay,
        workWeeksPerYear: WORKING_WEEKS_PER_YEAR,
        workDaysPerYear: WORKING_DAYS_PER_YEAR,
      },
      decision: {
        ...decision,
        vendorFeasibility: vendorState,
        internalFeasibility: internalState,
        capacityNote,
        ongoingNote,
        budgetNote,
        vendorOverBudget,
        internalOverBudget,
        zone,
      },
    };
  }

  return { WORKING_WEEKS_PER_YEAR, WORKING_DAYS_PER_YEAR, ENGINEERING_COST_UNITS, REQUIRED_NUMBERS, OPTIONAL_NUMBERS, validate, estimate };
});
