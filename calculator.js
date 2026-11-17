'use strict';

(() => {
  const UNIT_SLIDER_CONFIG = {
    day: { max: 2000, step: 25 },
    month: { max: 40000, step: 500 },
    year: { max: 400000, step: 5000 },
  };
  const EXAMPLE_DEFAULTS = {
    developerCount: '100',
    vendorSeatCostPerDevYear: '600',
    monthlyReviews: '100',
    engineeringCost: '100000',
    engineeringCostUnit: 'year',
    vendorOverages: '0',
    vendorSetup: '0',
    vendorOversightDaysPerWeek: '0.1',
    vendorEvaluationDays: '2',
    tokenCostPerReview: '2',
    reviewRunsPerPR: '2',
    internalInfrastructure: '600',
    internalSetupDays: '5',
    internalMaintenanceYearOneDaysPerWeek: '1',
    internalMaintenanceDaysPerWeek: '0.5',
    availableOwnerDaysPerWeek: '1.5',
    firstYearBudget: '',
  };

  const numberFields = [...window.CalculatorCore.REQUIRED_NUMBERS, ...window.CalculatorCore.OPTIONAL_NUMBERS];
  const selectFields = ['engineeringCostUnit'];
  const allFields = [...numberFields, ...selectFields];
  const $ = (id) => document.getElementById(id);
  const sliders = [...document.querySelectorAll('input[type="range"][data-for]')];
  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const moneyPrecise = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  let lastUnit = 'year';
  let canonicalEngDailyRate = null;
  let hasValidResults = false;
  let resultsInView = true;
  let srTimer = null;

  function updateStickyVisibility() {
    $('stickySummary').hidden = !hasValidResults || resultsInView;
  }

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      resultsInView = entries[0].isIntersecting;
      updateStickyVisibility();
    }, { threshold: 0.1 });
    observer.observe($('results'));
  }

  function updateEngineeringSliderRange(unit) {
    const slider = document.querySelector('input[type="range"][data-for="engineeringCost"]');
    const cfg = UNIT_SLIDER_CONFIG[unit] || UNIT_SLIDER_CONFIG.day;
    slider.max = String(cfg.max);
    slider.step = String(cfg.step);
  }

  function updateEngineeringRateHint() {
    const hint = $('engineeringRateHint');
    if (!hint) return;
    if (canonicalEngDailyRate === null || !Number.isFinite(canonicalEngDailyRate)) {
      hint.textContent = '';
      return;
    }
    const days = window.CalculatorCore.WORKING_DAYS_PER_YEAR;
    hint.textContent = `= ${money(canonicalEngDailyRate)}/day at ${days} working days/yr`;
  }

  function setCanonicalDailyFromInput() {
    const raw = $('engineeringCost').value;
    if (raw === '' || !Number.isFinite(Number(raw))) {
      canonicalEngDailyRate = null;
      updateEngineeringRateHint();
      return;
    }
    const amount = Number(raw);
    const unit = $('engineeringCostUnit').value || 'day';
    const daysPerYear = window.CalculatorCore.WORKING_DAYS_PER_YEAR;
    canonicalEngDailyRate = unit === 'day' ? amount : unit === 'month' ? (amount * 12) / daysPerYear : amount / daysPerYear;
    updateEngineeringRateHint();
  }

  function syncSliderFromInput(id) {
    const slider = document.querySelector(`input[type="range"][data-for="${id}"]`);
    if (!slider) return;
    const raw = $(id).value;
    if (raw === '' || !Number.isFinite(Number(raw))) {
      slider.value = slider.min || '0';
      return;
    }
    const num = Number(raw);
    const min = Number(slider.min || 0);
    const max = Number(slider.max || 100);
    slider.value = String(Math.min(Math.max(num, min), max));
  }

  function syncAllSliders() {
    updateEngineeringSliderRange($('engineeringCostUnit').value);
    for (const id of numberFields) syncSliderFromInput(id);
  }

  function applyValues(values) {
    for (const id of allFields) {
      if (Object.hasOwn(values, id)) $(id).value = values[id];
    }
    lastUnit = $('engineeringCostUnit').value || 'day';
    setCanonicalDailyFromInput();
    syncAllSliders();
  }

  function readInput() {
    return Object.fromEntries(allFields.map((id) => [id, $(id).value]));
  }

  function convertEngineeringCostUnit(toUnit) {
    if (canonicalEngDailyRate === null || !Number.isFinite(canonicalEngDailyRate)) return;
    const daysPerYear = window.CalculatorCore.WORKING_DAYS_PER_YEAR;
    const converted = toUnit === 'day'
      ? canonicalEngDailyRate
      : toUnit === 'month'
        ? (canonicalEngDailyRate * daysPerYear) / 12
        : canonicalEngDailyRate * daysPerYear;
    $('engineeringCost').value = String(Math.round(converted));
    updateEngineeringRateHint();
  }

  function clearFieldInvalidStates() {
    for (const id of numberFields) $(id).removeAttribute('aria-invalid');
  }

  function markInvalidFields(input) {
    for (const id of numberFields) {
      const raw = input[id];
      if (id === 'firstYearBudget' && raw === '') continue;
      if (raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0 || (id === 'developerCount' && Number(raw) < 1)) {
        $(id).setAttribute('aria-invalid', 'true');
      }
    }
  }

  function scheduleSrSummary(text) {
    if (srTimer) clearTimeout(srTimer);
    srTimer = setTimeout(() => {
      $('srSummary').textContent = text;
    }, 500);
  }

  function showEstimate() {
    const input = readInput();
    const hasAnyInput = numberFields.some((id) => input[id] !== '');
    const result = window.CalculatorCore.estimate(input);
    const emptyHint = $('emptyHint');
    const errors = $('inputErrors');
    const results = $('results');
    const staleBadge = $('staleBadge');
    const stickySummary = $('stickySummary');
    errors.replaceChildren();
    clearFieldInvalidStates();

    if (!hasAnyInput) {
      hasValidResults = false;
      results.hidden = true;
      results.classList.remove('stale-results');
      staleBadge.hidden = true;
      stickySummary.hidden = true;
      emptyHint.hidden = false;
      errors.hidden = true;
      return;
    }

    emptyHint.hidden = true;

    if (result.errors.length) {
      markInvalidFields(input);
      if (hasValidResults) {
        results.hidden = false;
        results.classList.add('stale-results');
        staleBadge.hidden = false;
      } else {
        results.hidden = true;
        stickySummary.hidden = true;
      }
      errors.hidden = false;
      const invalidErrors = result.errors.filter((msg) => !msg.endsWith('is required') && !msg.startsWith('Choose whether'));
      const missingCount = result.errors.length - invalidErrors.length;
      const intro = document.createElement('p');
      if (invalidErrors.length) {
        intro.textContent = missingCount
          ? `Fix ${invalidErrors.length} invalid value(s) and complete ${missingCount} remaining field(s):`
          : 'Fix the invalid input(s) below:';
        errors.appendChild(intro);
        const list = document.createElement('ul');
        for (const message of invalidErrors) {
          const item = document.createElement('li');
          item.textContent = message;
          list.appendChild(item);
        }
        errors.appendChild(list);
      } else {
        intro.textContent = `${missingCount} field${missingCount === 1 ? '' : 's'} remaining — enter 0 where confirmed zero.`;
        errors.appendChild(intro);
      }
      return;
    }

    hasValidResults = true;
    errors.hidden = true;
    results.classList.remove('stale-results');
    staleBadge.hidden = true;

    const { vendor, internal } = result.costs;
    $('vendorYearOne').textContent = money(vendor.yearOne);
    $('vendorOngoing').textContent = money(vendor.ongoing);
    $('vendorLicenseCost').textContent = money(vendor.license);
    $('vendorOveragesCost').textContent = money(vendor.overages);
    $('vendorSetupCost').textContent = money(vendor.setup);
    $('vendorEvaluationCost').textContent = money(vendor.evaluation);
    $('vendorOversight').textContent = money(vendor.oversight);
    $('vendorOverBudgetBadge').hidden = !result.decision.vendorOverBudget;

    $('internalYearOne').textContent = money(internal.yearOne);
    $('internalOngoing').textContent = money(internal.ongoing);
    $('internalTokenCostPerPR').textContent = moneyPrecise(internal.tokenCostPerPR);
    $('internalTokens').textContent = money(internal.tokens);
    $('internalInfrastructureCost').textContent = money(internal.infrastructure);
    $('internalSetupCost').textContent = money(internal.setup);
    $('internalMaintenanceYearOne').textContent = money(internal.maintenanceYearOne);
    $('internalMaintenance').textContent = money(internal.maintenance);
    $('internalOverBudgetBadge').hidden = !result.decision.internalOverBudget;
    results.hidden = false;

    const zoneBox = $('zoneBox');
    const zone = result.decision.zone;
    let zoneSummaryLabel = result.decision.status;
    if (!zone) {
      zoneBox.hidden = true;
    } else {
      zoneBox.hidden = false;
      $('zoneMarker').style.left = `${zone.positionPct}%`;
      zoneSummaryLabel = zone.lean === 'close'
        ? `Close call (±10%)`
        : zone.lean === 'buy'
          ? `Buy zone (${zone.relDiffPct}% lower Year 1)`
          : `Build zone (${zone.relDiffPct}% lower Year 1)`;
      $('zoneTrack').setAttribute('aria-label', `Buy vs. Build cost spectrum: ${zoneSummaryLabel}`);

      const parts = [];
      if (zone.breakEvenDevsYearOne > 0) parts.push(`~${zone.breakEvenDevsYearOne} devs (Year 1)`);
      if (zone.breakEvenDevsOngoing > 0) parts.push(`~${zone.breakEvenDevsOngoing} devs (recurring)`);
      const monthlyPRs = Number(input.monthlyReviews);
      $('zoneDetail').textContent = parts.length
        ? `Buy is cheaper below ${parts.join(' / ')}, holding PRs/month at ${monthlyPRs}.`
        : '';
    }

    updateStickyVisibility();
    $('stickyText').innerHTML = `<strong>Buy:</strong> ${money(vendor.yearOne)} Yr 1 &middot; <strong>Build:</strong> ${money(internal.yearOne)} Yr 1 &middot; ${zoneSummaryLabel}`;
    scheduleSrSummary(`Buy Year 1 ${money(vendor.yearOne)}, Build Year 1 ${money(internal.yearOne)}. ${result.decision.message}`);
  }

  for (const id of allFields) {
    $(id).addEventListener('input', () => {
      if (id === 'engineeringCost') setCanonicalDailyFromInput();
      syncSliderFromInput(id);
      showEstimate();
    });
    if (selectFields.includes(id)) {
      $(id).addEventListener('change', () => {
        if (id === 'engineeringCostUnit') {
          const nextUnit = $('engineeringCostUnit').value;
          convertEngineeringCostUnit(nextUnit);
          lastUnit = nextUnit;
          updateEngineeringSliderRange(nextUnit);
          syncSliderFromInput('engineeringCost');
        }
        showEstimate();
      });
    }
  }

  for (const slider of sliders) {
    slider.addEventListener('input', () => {
      const targetId = slider.dataset.for;
      $(targetId).value = slider.value;
      if (targetId === 'engineeringCost') setCanonicalDailyFromInput();
      showEstimate();
    });
  }

  $('exampleBtn').addEventListener('click', () => {
    applyValues(EXAMPLE_DEFAULTS);
    showEstimate();
  });

  $('resetBtn').addEventListener('click', () => {
    for (const id of numberFields) $(id).value = '';
    $('engineeringCostUnit').value = 'year';
    lastUnit = 'year';
    canonicalEngDailyRate = null;
    updateEngineeringRateHint();
    syncAllSliders();
    showEstimate();
  });

  applyValues(EXAMPLE_DEFAULTS);
  showEstimate();
})();
