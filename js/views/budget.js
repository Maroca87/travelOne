/**
 * Budget View (Category Allocation & Spending Limits)
 */

import { getAllFromStore, saveItem } from '../db.js';
import { formatMoney, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

export async function renderBudgetView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const expenses = await getAllFromStore('expenses', trip.id);

  // Category Budget Allocations (default proportional splits or stored in trip object)
  const categoryBudgets = trip.categoryBudgets || {
    'Hotel': Math.round(trip.budget * 0.35),
    'Comida': Math.round(trip.budget * 0.25),
    'Transporte': Math.round(trip.budget * 0.20),
    'Compras': Math.round(trip.budget * 0.10),
    'Entretenimiento': Math.round(trip.budget * 0.05),
    'Otros': Math.round(trip.budget * 0.05)
  };

  // Actual spent per category
  const actualSpent = {
    'Hotel': 0, 'Comida': 0, 'Transporte': 0, 'Compras': 0, 'Entretenimiento': 0, 'Otros': 0
  };

  expenses.forEach(e => {
    let cat = e.category || 'Otros';
    if (cat === 'Alimentación') cat = 'Comida';
    if (cat === 'Souvenirs') cat = 'Compras';
    if (cat === 'Tours') cat = 'Entretenimiento';
    if (!actualSpent.hasOwnProperty(cat)) actualSpent['Otros'] += (parseFloat(e.amount) || 0);
    else actualSpent[cat] += (parseFloat(e.amount) || 0);
  });

  const getCategoryIconName = (cat) => {
    switch (cat) {
      case 'Hotel': return 'hotel';
      case 'Comida': return 'utensils';
      case 'Transporte': return 'bus';
      case 'Compras': return 'shopping';
      case 'Entretenimiento': return 'sparkles';
      default: return 'tag';
    }
  };

  const categoriesHTML = Object.keys(categoryBudgets).map(cat => {
    const allocated = categoryBudgets[cat] || 0;
    const spent = actualSpent[cat] || 0;
    const available = allocated - spent;
    const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;

    let barColorClass = '';
    if (pct > 90) barColorClass = 'progress-rose';
    else if (pct > 75) barColorClass = 'progress-amber';

    return `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="icon-badge-box" style="width: 32px; height: 32px;">
              ${renderIcon(getCategoryIconName(cat), { size: 16, color: 'var(--primary-cyan)' })}
            </div>
            <h4 style="font-size: 1.1rem; margin: 0;">${cat}</h4>
          </div>
          <span style="font-size: 0.85rem; font-weight: 700; color: ${available < 0 ? 'var(--accent-rose)' : 'var(--primary-cyan)'};">
            ${pct}% de límite
          </span>
        </div>

        <div class="progress-container" style="height: 10px; margin-bottom: 0.75rem;">
          <div class="progress-bar ${barColorClass}" style="width: ${pct}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); background: var(--bg-surface); padding: 0.6rem 0.85rem; border-radius: var(--radius-md); flex-wrap: wrap; gap: 0.5rem;">
          <div>Presupuesto: <strong style="color: #ffffff;">${formatMoney(allocated, trip.mainCurrency)}</strong></div>
          <div>Gastado: <strong style="color: var(--accent-rose);">${formatMoney(spent, trip.mainCurrency)}</strong></div>
          <div>Disponible: <strong style="color: var(--accent-amber);">${formatMoney(available, trip.mainCurrency)}</strong></div>
        </div>
      </div>
    `;
  }).join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Presupuesto por Categorías</h1>
        <div class="page-subtitle">Monitoreo visual de tus metas de ahorro e inversión en el viaje</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-edit-category-budgets" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('settings', { size: 15 })}
          <span>Ajustar Presupuestos</span>
        </button>
      </div>
    </div>

    ${categoriesHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-edit-category-budgets')?.addEventListener('click', () => {
      openCategoryBudgetsModal(trip, categoryBudgets, refreshView);
    });
  }, 50);

  return container;
}

function openCategoryBudgetsModal(trip, currentBudgets, refreshView) {
  const bodyHTML = `
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
      Establece los límites deseados para cada categoría.
    </p>

    <div class="form-group">
      <label>Presupuesto Hotel / Alojamiento</label>
      <input type="number" id="cat-b-hotel" class="form-control" value="${currentBudgets['Hotel'] || 0}">
    </div>
    <div class="form-group">
      <label>Presupuesto Comida / Restantes</label>
      <input type="number" id="cat-b-comida" class="form-control" value="${currentBudgets['Comida'] || 0}">
    </div>
    <div class="form-group">
      <label>Presupuesto Transporte / Pasajes</label>
      <input type="number" id="cat-b-transporte" class="form-control" value="${currentBudgets['Transporte'] || 0}">
    </div>
    <div class="form-group">
      <label>Presupuesto Compras & Souvenirs</label>
      <input type="number" id="cat-b-compras" class="form-control" value="${currentBudgets['Compras'] || 0}">
    </div>
    <div class="form-group">
      <label>Presupuesto Entretenimiento & Tours</label>
      <input type="number" id="cat-b-ent" class="form-control" value="${currentBudgets['Entretenimiento'] || 0}">
    </div>
    <div class="form-group">
      <label>Presupuesto Imprevistos / Otros</label>
      <input type="number" id="cat-b-otros" class="form-control" value="${currentBudgets['Otros'] || 0}">
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('settings', { size: 18, color: 'var(--primary-cyan)' })} Ajustar Presupuestos por Categoría</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const updatedBudgets = {
      'Hotel': parseFloat(document.getElementById('cat-b-hotel').value) || 0,
      'Comida': parseFloat(document.getElementById('cat-b-comida').value) || 0,
      'Transporte': parseFloat(document.getElementById('cat-b-transporte').value) || 0,
      'Compras': parseFloat(document.getElementById('cat-b-compras').value) || 0,
      'Entretenimiento': parseFloat(document.getElementById('cat-b-ent').value) || 0,
      'Otros': parseFloat(document.getElementById('cat-b-otros').value) || 0
    };

    const updatedTrip = {
      ...trip,
      categoryBudgets: updatedBudgets
    };

    await saveItem('trips', updatedTrip);
    showToast('Presupuestos actualizados');
    refreshView();
    return true;
  });
}

