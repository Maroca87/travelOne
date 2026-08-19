/**
 * TravelOne Quick Travel Tools Component
 * Provides a floating action button (FAB) for multi-currency conversion with custom currencies and tip calculator.
 * 
 * @module js/components/quickTools
 */

import { openModal } from './modal.js';
import { formatMoney } from '../utils.js';
import { renderIcon } from '../icons.js';

/**
 * Standard currency catalog with symbols and default USD base exchange rates.
 * @type {Array<{code: string, name: string, symbol: string, basePerUSD: number}>}
 */
export const CURRENCIES = [
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', basePerUSD: 1.0 },
  { code: 'CRC', name: 'Colón Costarricense', symbol: '₡', basePerUSD: 505.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', basePerUSD: 0.92 },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', basePerUSD: 0.78 },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', basePerUSD: 17.5 },
  { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q', basePerUSD: 7.75 },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', basePerUSD: 4100.0 },
  { code: 'JPY', name: 'Yen Japonés', symbol: '¥', basePerUSD: 155.0 },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: '$', basePerUSD: 1.37 },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', basePerUSD: 5.4 },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', basePerUSD: 950.0 },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', basePerUSD: 920.0 },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', basePerUSD: 3.75 },
  { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', basePerUSD: 0.89 }
];

/**
 * Render the Floating Action Button (FAB) HTML for quick tools.
 * 
 * @returns {string} HTML markup string for the FAB button
 */
export function renderQuickToolsFAB() {
  return `
    <button class="quick-tools-fab" id="fab-quick-tools" title="Herramientas de Viaje">
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
  const defaultMain = (trip && trip.mainCurrency) ? trip.mainCurrency : 'CRC';
  let fromCode = (defaultMain === 'USD') ? 'USD' : 'USD';
  let toCode = defaultMain;

  const getCurrency = (code) => CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  const getBaseRate = (from, to) => {
    // If trip has custom exchange rates for USD, use it for CRC
    let fromBase = getCurrency(from).basePerUSD;
    let toBase = getCurrency(to).basePerUSD;

    if (trip && trip.exchangeRates) {
      if (from === 'USD' && to === defaultMain && trip.exchangeRates.USD) {
        return trip.exchangeRates.USD;
      }
      if (to === 'USD' && from === defaultMain && trip.exchangeRates.USD) {
        return 1 / trip.exchangeRates.USD;
      }
    }
    return toBase / fromBase;
  };

  let currentRate = getBaseRate(fromCode, toCode);

  const bodyHTML = `
    <!-- Tool Tabs -->
    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
      <button class="btn btn-sm btn-primary" id="tab-tool-converter" style="display: inline-flex; align-items: center; gap: 0.35rem;">
        ${renderIcon('exchange', { size: 14 })}
        <span>Conversor de Divisas</span>
      </button>
      <button class="btn btn-sm btn-secondary" id="tab-tool-tips" style="display: inline-flex; align-items: center; gap: 0.35rem;">
        ${renderIcon('utensils', { size: 14 })}
        <span>Calculadora de Propinas</span>
      </button>
    </div>

    <!-- CONVERTER PANEL -->
    <div id="panel-tool-converter">
      <!-- Currency Pickers with Swap Button -->
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
        <div style="flex: 1;">
          <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">De (Moneda Origen):</label>
          <select id="sel-from-curr" class="form-select">
            ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === fromCode ? 'selected' : ''}>${c.code} — ${c.name} (${c.symbol})</option>`).join('')}
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-swap-curr" title="Invertir monedas" style="margin-top: 1.3rem; padding: 0.55rem 0.75rem; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center;">
          ${renderIcon('exchange', { size: 18, color: 'var(--primary-cyan)' })}
        </button>

        <div style="flex: 1;">
          <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">A (Moneda Destino):</label>
          <select id="sel-to-curr" class="form-select">
            ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === toCode ? 'selected' : ''}>${c.code} — ${c.name} (${c.symbol})</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Editable Exchange Rate -->
      <div style="background: var(--bg-card); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
        <div style="font-size: 0.85rem; color: var(--text-muted);" id="lbl-rate-info">
          Tipo de cambio: <strong>1 ${fromCode} =</strong>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <input type="number" step="0.0001" id="input-rate-custom" class="form-control" style="width: 140px; padding: 0.35rem 0.5rem; text-align: right;" value="${currentRate.toFixed(4)}">
          <span id="lbl-rate-target-code" style="font-weight: 700; color: var(--primary-cyan); font-size: 0.9rem;">${toCode}</span>
        </div>
      </div>

      <!-- Live Conversion Fields -->
      <div class="form-row">
        <div class="form-group">
          <label id="lbl-input-from">Monto en ${fromCode} (${getCurrency(fromCode).symbol})</label>
          <input type="number" step="any" id="input-amt-from" class="form-control" style="font-size: 1.15rem; font-weight: 600;" placeholder="0.00">
        </div>
        <div class="form-group">
          <label id="lbl-input-to">Equivalente en ${toCode} (${getCurrency(toCode).symbol})</label>
          <input type="number" step="any" id="input-amt-to" class="form-control" style="font-size: 1.15rem; font-weight: 600;" placeholder="0.00">
        </div>
      </div>

      <!-- Quick Preset Increment Buttons -->
      <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-secondary btn-sm btn-quick-amt" data-val="10">+10</button>
        <button class="btn btn-secondary btn-sm btn-quick-amt" data-val="50">+50</button>
        <button class="btn btn-secondary btn-sm btn-quick-amt" data-val="100">+100</button>
        <button class="btn btn-secondary btn-sm btn-quick-amt" data-val="500">+500</button>
        <button class="btn btn-secondary btn-sm btn-quick-amt" data-val="1000">+1,000</button>
      </div>

      <!-- Result Banner -->
      <div style="background: var(--bg-surface); padding: 1.25rem 1rem; border-radius: var(--radius-md); text-align: center; margin-top: 1rem; border: 1px solid var(--border-color);" id="box-conv-result">
        <span style="color: var(--text-muted); font-size: 0.9rem;">Ingresa un monto para ver la conversión al instante</span>
      </div>
    </div>

    <!-- TIP CALCULATOR PANEL (Hidden by default) -->
    <div id="panel-tool-tips" style="display: none;">
      <div class="form-group">
        <label>Monto Total de la Cuenta</label>
        <input type="number" step="any" id="tip-amount" class="form-control" placeholder="0.00" style="font-size: 1.15rem; font-weight: 600;">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Porcentaje de Propina (%)</label>
          <select id="tip-percent" class="form-select">
            <option value="10" selected>10% (Servicio estándar)</option>
            <option value="12">12%</option>
            <option value="15">15% (Excelente servicio)</option>
            <option value="18">18%</option>
            <option value="20">20% (Extraordinario)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Dividir entre personas</label>
          <input type="number" id="tip-people" class="form-control" value="1" min="1">
        </div>
      </div>

      <div style="background: var(--bg-surface); padding: 1.25rem; border-radius: var(--radius-md); text-align: center; margin-top: 0.75rem; border: 1px solid var(--border-color);" id="tip-results">
        <div style="font-size: 0.9rem; color: var(--text-muted);">Propina sugerida: <strong>0.00</strong></div>
        <div style="font-size: 1.35rem; font-weight: 700; color: var(--accent-amber); margin-top: 0.35rem;">Total con Propina: 0.00</div>
        <div style="font-size: 1rem; color: var(--primary-cyan); margin-top: 0.35rem;" id="tip-per-person">Por persona: 0.00</div>
      </div>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('calculator', { size: 20, color: 'var(--primary-cyan)' })} Herramientas de Viaje</span>`;
  openModal(modalTitle, bodyHTML, null, null);

  setTimeout(() => {
    // Elements
    const tabConverter = document.getElementById('tab-tool-converter');
    const tabTips = document.getElementById('tab-tool-tips');
    const panelConverter = document.getElementById('panel-tool-converter');
    const panelTips = document.getElementById('panel-tool-tips');

    const selFrom = document.getElementById('sel-from-curr');
    const selTo = document.getElementById('sel-to-curr');
    const btnSwap = document.getElementById('btn-swap-curr');
    const inputRate = document.getElementById('input-rate-custom');
    const lblRateInfo = document.getElementById('lbl-rate-info');
    const lblRateTargetCode = document.getElementById('lbl-rate-target-code');

    const lblInputFrom = document.getElementById('lbl-input-from');
    const lblInputTo = document.getElementById('lbl-input-to');
    const inputAmtFrom = document.getElementById('input-amt-from');
    const inputAmtTo = document.getElementById('input-amt-to');
    const boxResult = document.getElementById('box-conv-result');

    // Tab Switching
    tabConverter?.addEventListener('click', () => {
      tabConverter.className = 'btn btn-sm btn-primary';
      tabTips.className = 'btn btn-sm btn-secondary';
      panelConverter.style.display = 'block';
      panelTips.style.display = 'none';
    });

    tabTips?.addEventListener('click', () => {
      tabTips.className = 'btn btn-sm btn-primary';
      tabConverter.className = 'btn btn-sm btn-secondary';
      panelTips.style.display = 'block';
      panelConverter.style.display = 'none';
    });

    // Converter Logic
    const refreshRateAndLabels = () => {
      fromCode = selFrom.value;
      toCode = selTo.value;
      currentRate = getBaseRate(fromCode, toCode);

      inputRate.value = currentRate.toFixed(4);
      lblRateInfo.innerHTML = `Tipo de cambio: <strong>1 ${fromCode} =</strong>`;
      lblRateTargetCode.textContent = toCode;

      const fromCurr = getCurrency(fromCode);
      const toCurr = getCurrency(toCode);
      lblInputFrom.textContent = `Monto en ${fromCode} (${fromCurr.symbol})`;
      lblInputTo.textContent = `Equivalente en ${toCode} (${toCurr.symbol})`;

      updateCalc('from');
    };

    const updateCalc = (source) => {
      const rate = parseFloat(inputRate.value) || 1;
      const fromCurr = getCurrency(fromCode);
      const toCurr = getCurrency(toCode);

      if (source === 'from') {
        const valFrom = parseFloat(inputAmtFrom.value);
        if (isNaN(valFrom) || valFrom === 0) {
          inputAmtTo.value = '';
          boxResult.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">Ingresa un monto para ver la conversión</span>`;
          return;
        }
        const valTo = valFrom * rate;
        inputAmtTo.value = valTo.toFixed(2);
        boxResult.innerHTML = `
          <div style="font-size: 1.05rem; color: var(--text-muted); margin-bottom: 0.25rem;">
            ${fromCurr.symbol} ${valFrom.toLocaleString('es-CR')} ${fromCode} equivale a:
          </div>
          <div style="font-size: 1.45rem; font-weight: 800; color: var(--accent-amber); font-family: 'Outfit', sans-serif;">
            ${toCurr.symbol} ${valTo.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCode}
          </div>
        `;
      } else if (source === 'to') {
        const valTo = parseFloat(inputAmtTo.value);
        if (isNaN(valTo) || valTo === 0) {
          inputAmtFrom.value = '';
          boxResult.innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">Ingresa un monto para ver la conversión</span>`;
          return;
        }
        const valFrom = valTo / rate;
        inputAmtFrom.value = valFrom.toFixed(2);
        boxResult.innerHTML = `
          <div style="font-size: 1.05rem; color: var(--text-muted); margin-bottom: 0.25rem;">
            ${toCurr.symbol} ${valTo.toLocaleString('es-CR')} ${toCode} equivale a:
          </div>
          <div style="font-size: 1.45rem; font-weight: 800; color: var(--primary-cyan); font-family: 'Outfit', sans-serif;">
            ${fromCurr.symbol} ${valFrom.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fromCode}
          </div>
        `;
      }
    };

    selFrom?.addEventListener('change', refreshRateAndLabels);
    selTo?.addEventListener('change', refreshRateAndLabels);

    btnSwap?.addEventListener('click', (e) => {
      e.preventDefault();
      const temp = selFrom.value;
      selFrom.value = selTo.value;
      selTo.value = temp;
      refreshRateAndLabels();
    });

    inputRate?.addEventListener('input', () => updateCalc('from'));
    inputAmtFrom?.addEventListener('input', () => updateCalc('from'));
    inputAmtTo?.addEventListener('input', () => updateCalc('to'));

    document.querySelectorAll('.btn-quick-amt').forEach(btn => {
      btn.addEventListener('click', () => {
        const addVal = parseFloat(btn.getAttribute('data-val')) || 0;
        const curVal = parseFloat(inputAmtFrom.value) || 0;
        inputAmtFrom.value = (curVal + addVal).toFixed(0);
        updateCalc('from');
      });
    });

    // Tip Calculator Listeners
    const tipAmt = document.getElementById('tip-amount');
    const tipPct = document.getElementById('tip-percent');
    const tipPpl = document.getElementById('tip-people');
    const tipRes = document.getElementById('tip-results');

    const updateTips = () => {
      const amount = parseFloat(tipAmt.value) || 0;
      const percent = parseFloat(tipPct.value) || 10;
      const people = parseInt(tipPpl.value) || 1;

      const tipVal = amount * (percent / 100);
      const total = amount + tipVal;
      const perP = total / (people > 0 ? people : 1);

      tipRes.innerHTML = `
        <div style="font-size: 0.9rem; color: var(--text-muted);">Propina (${percent}%): <strong>${tipVal.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
        <div style="font-size: 1.35rem; font-weight: 700; color: var(--accent-amber); margin-top: 0.25rem;">Total a Pagar: ${total.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div style="font-size: 1rem; color: var(--primary-cyan); margin-top: 0.35rem;">Por persona (${people}): <strong>${perP.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
      `;
    };

    tipAmt?.addEventListener('input', updateTips);
    tipPct?.addEventListener('change', updateTips);
    tipPpl?.addEventListener('input', updateTips);
  }, 50);
}


