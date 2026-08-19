/**
 * TravelOne Quick Travel Tools Component
 * Provides floating action button (FAB) triggering live offline currency conversion and tip calculations.
 * 
 * @module js/components/quickTools
 */

import { openModal } from './modal.js';
import { formatMoney } from '../utils.js';
import { renderIcon } from '../icons.js';

/**
 * Render the Floating Action Button (FAB) HTML for quick tools.
 * 
 * @returns {string} HTML markup string for the FAB button
 */
export function renderQuickToolsFAB() {
  return `
    <button class="quick-tools-fab" id="fab-quick-tools" title="Herramientas rápidas">
      ${renderIcon('calculator', { size: 24, color: '#0b1326' })}
    </button>
  `;
}

/**
 * Open the interactive modal for multi-currency conversion and tip calculation.
 * 
 * @param {Object|null} trip - Current active trip context with currency and rate settings
 */
export function openCurrencyConverterModal(trip) {
  const rate = (trip && trip.exchangeRates && trip.exchangeRates.USD) ? trip.exchangeRates.USD : 500;
  const mainCur = (trip && trip.mainCurrency) ? trip.mainCurrency : 'CRC';

  const bodyHTML = `
    <div class="form-group">
      <label>Tipo de Cambio Manual (1 USD = ? ${mainCur})</label>
      <input type="number" step="0.01" id="tool-exchange-rate" class="form-control" value="${rate}">
    </div>

    <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1rem 0;">

    <div class="form-row">
      <div class="form-group">
        <label>Monto en Dólares ($ USD)</label>
        <input type="number" step="0.01" id="tool-usd-input" class="form-control" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>Equivalente en Colones (₡ ${mainCur})</label>
        <input type="number" step="0.01" id="tool-main-input" class="form-control" placeholder="0.00">
      </div>
    </div>

    <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); text-align: center; margin-top: 0.5rem;" id="tool-conversion-result">
      <span style="color: var(--text-muted); font-size: 0.9rem;">Ingresa un valor arriba para convertir</span>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('exchange', { size: 20, color: 'var(--primary-cyan)' })} Conversor Rápido de Moneda</span>`;
  openModal(modalTitle, bodyHTML, null, null);

  setTimeout(() => {
    const rateEl = document.getElementById('tool-exchange-rate');
    const usdEl = document.getElementById('tool-usd-input');
    const mainEl = document.getElementById('tool-main-input');
    const resEl = document.getElementById('tool-conversion-result');

    const updateCalc = (source) => {
      const currentRate = parseFloat(rateEl.value) || 1;
      if (source === 'usd') {
        const usd = parseFloat(usdEl.value) || 0;
        const mainVal = usd * currentRate;
        mainEl.value = mainVal ? mainVal.toFixed(0) : '';
        resEl.innerHTML = `<strong style="font-size: 1.2rem; color: var(--primary-cyan);">$${usd.toFixed(2)} USD</strong> = <strong style="font-size: 1.2rem; color: var(--accent-amber);">${formatMoney(mainVal, mainCur)}</strong>`;
      } else if (source === 'main') {
        const mainVal = parseFloat(mainEl.value) || 0;
        const usd = mainVal / currentRate;
        usdEl.value = usd ? usd.toFixed(2) : '';
        resEl.innerHTML = `<strong style="font-size: 1.2rem; color: var(--accent-amber);">${formatMoney(mainVal, mainCur)}</strong> = <strong style="font-size: 1.2rem; color: var(--primary-cyan);">$${usd.toFixed(2)} USD</strong>`;
      }
    };

    usdEl?.addEventListener('input', () => updateCalc('usd'));
    mainEl?.addEventListener('input', () => updateCalc('main'));
    rateEl?.addEventListener('input', () => updateCalc('usd'));
  }, 50);
}

export function openTipCalculatorModal() {
  const bodyHTML = `
    <div class="form-group">
      <label>Monto Total de la Cuenta (₡ Colones)</label>
      <input type="number" step="1" id="tip-amount" class="form-control" placeholder="0">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Porcentaje de Propina (%)</label>
        <select id="tip-percent" class="form-select">
          <option value="10" selected>10% (Servicio voluntario)</option>
          <option value="12">12%</option>
          <option value="15">15% (Excelente servicio)</option>
          <option value="20">20%</option>
        </select>
      </div>

      <div class="form-group">
        <label>Dividir entre personas</label>
        <input type="number" id="tip-people" class="form-control" value="1" min="1">
      </div>
    </div>

    <div style="background: var(--bg-surface); padding: 1.25rem; border-radius: var(--radius-md); text-align: center; margin-top: 0.5rem;" id="tip-results">
      <div style="font-size: 0.9rem; color: var(--text-muted);">Propina sugerida: <strong>₡ 0</strong></div>
      <div style="font-size: 1.3rem; font-weight: 700; color: var(--accent-amber); margin-top: 0.25rem;">Total con Propina: ₡ 0</div>
      <div style="font-size: 1rem; color: var(--primary-cyan); margin-top: 0.25rem;" id="tip-per-person">Por persona: ₡ 0</div>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('utensils', { size: 20, color: 'var(--accent-amber)' })} Calculadora de Propinas</span>`;
  openModal(modalTitle, bodyHTML, null, null);

  setTimeout(() => {
    const amountEl = document.getElementById('tip-amount');
    const percentEl = document.getElementById('tip-percent');
    const peopleEl = document.getElementById('tip-people');
    const resEl = document.getElementById('tip-results');

    const updateTip = () => {
      const amount = parseFloat(amountEl.value) || 0;
      const percent = parseFloat(percentEl.value) || 10;
      const people = parseInt(peopleEl.value) || 1;

      const tipValue = amount * (percent / 100);
      const total = amount + tipValue;
      const perPerson = total / (people > 0 ? people : 1);

      resEl.innerHTML = `
        <div style="font-size: 0.9rem; color: var(--text-muted);">Propina (${percent}%): <strong>${formatMoney(tipValue)}</strong></div>
        <div style="font-size: 1.3rem; font-weight: 700; color: var(--accent-amber); margin-top: 0.25rem;">Total a Pagar: ${formatMoney(total)}</div>
        <div style="font-size: 1rem; color: var(--primary-cyan); margin-top: 0.35rem;">Cada persona (${people}): <strong>${formatMoney(perPerson)}</strong></div>
      `;
    };

    amountEl?.addEventListener('input', updateTip);
    percentEl?.addEventListener('change', updateTip);
    peopleEl?.addEventListener('input', updateTip);
  }, 50);
}

