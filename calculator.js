'use strict';

(() => {
  const STORAGE_KEY = 'aicr-tco-calculator:inputs';
  const numberFields = [...window.CalculatorCore.REQUIRED_NUMBERS];
  const selectFields = ['vendorFeasibility', 'internalFeasibility'];
  const allFields = [...numberFields, ...selectFields];
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  function readInput() {
    return Object.fromEntries(allFields.map((id) => [id, $(id).value]));
  }

  function saveInput() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readInput()));
      $('saveStatus').textContent = 'Inputs are saved in this browser only.';
    } catch (_) {
      $('saveStatus').textContent = 'Browser storage is unavailable; inputs remain on this page until it is closed.';
    }
  }

  function restoreInput() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      for (const id of allFields) {
        if (Object.hasOwn(saved, id)) $(id).value = saved[id];
      }
      $('saveStatus').textContent = 'Restored inputs saved in this browser.';
    } catch (_) {
      $('saveStatus').textContent = 'Inputs are saved in this browser only.';
    }
  }

  function showEstimate() {
    const result = window.CalculatorCore.estimate(readInput());
    const errors = $('inputErrors');
    const results = $('results');
    const verdict = $('verdict');
    errors.replaceChildren();
    results.hidden = true;
    verdict.hidden = true;

    if (result.errors.length) {
      errors.hidden = false;
      const intro = document.createElement('p');
      intro.textContent = 'Complete each input with your own value. Enter 0 only when you have confirmed there is no cost or capacity for that item.';
      errors.appendChild(intro);
      const list = document.createElement('ul');
      for (const message of result.errors) {
        const item = document.createElement('li');
        item.textContent = message;
        list.appendChild(item);
      }
      errors.appendChild(list);
      saveInput();
      return;
    }

    errors.hidden = true;
    const { vendor, internal } = result.costs;
    $('vendorYearOne').textContent = money(vendor.yearOne);
    $('vendorOngoing').textContent = money(vendor.ongoing);
    $('vendorLicenseCost').textContent = money(vendor.license);
    $('vendorOveragesCost').textContent = money(vendor.overages);
    $('vendorSetupCost').textContent = money(vendor.setup);
    $('vendorEvaluationCost').textContent = money(vendor.evaluation);
    $('vendorOversight').textContent = money(vendor.oversight);
    $('internalYearOne').textContent = money(internal.yearOne);
    $('internalOngoing').textContent = money(internal.ongoing);
    $('internalTokens').textContent = money(internal.tokens);
    $('internalInfrastructureCost').textContent = money(internal.infrastructure);
    $('internalSetupCost').textContent = money(internal.setup);
    $('internalMaintenanceYearOne').textContent = money(internal.maintenanceYearOne);
    $('internalMaintenance').textContent = money(internal.maintenance);
    results.hidden = false;

    verdict.className = `verdict ${result.decision.status}`;
    verdict.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = 'Feasibility and cost summary';
    const message = document.createElement('p');
    message.textContent = result.decision.message;
    verdict.append(heading, message);
    for (const text of [result.decision.capacityNote, result.decision.ongoingNote]) {
      if (!text) continue;
      const note = document.createElement('p');
      note.textContent = text;
      verdict.appendChild(note);
    }
    verdict.hidden = false;
    saveInput();
  }

  for (const id of allFields) {
    $(id).addEventListener('input', showEstimate);
    if (selectFields.includes(id)) $(id).addEventListener('change', showEstimate);
  }
  $('resetBtn').addEventListener('click', () => {
    for (const id of allFields) $(id).value = '';
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage may be disabled */ }
    $('inputErrors').hidden = true;
    $('results').hidden = true;
    $('verdict').hidden = true;
    $('saveStatus').textContent = 'Inputs cleared.';
  });

  restoreInput();
  showEstimate();
})();
