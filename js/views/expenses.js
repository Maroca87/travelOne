/**
 * TravelOne Expense Tracker View
 * Manages travel expenditures, category distribution progress bars, multi-payer breakdowns, and expense creation.
 * 
 * @module js/views/expenses
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatDate, formatMoney, getCategoryBadgeClass, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the expense manager view with summary analytics and transaction logs.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to refresh view after updates
 * @returns {Promise<HTMLElement>} The expenses view DOM element
 */
export async function renderExpensesView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const expenses = await getAllFromStore('expenses', trip.id);
  expenses.sort((a, b) => b.date.localeCompare(a.date));

  const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const budget = parseFloat(trip.budget) || 0;
  const available = budget - totalSpent;
  const spentPercent = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  // Breakdown by category
  const byCategory = {};
  expenses.forEach(e => {
    const cat = e.category || 'Otros';
    byCategory[cat] = (byCategory[cat] || 0) + (parseFloat(e.amount) || 0);
  });

  // Breakdown by person
  const byPerson = {};
  expenses.forEach(e => {
    const person = e.paidBy || 'Yo';
    byPerson[person] = (byPerson[person] || 0) + (parseFloat(e.amount) || 0);
  });

  const categoryBreakdownHTML = Object.keys(byCategory).length === 0 ? `
    <div style="font-size: 0.85rem; color: var(--text-muted);">Sin gastos registrados.</div>
  ` : Object.entries(byCategory).map(([cat, amount]) => {
    const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
    return `
      <div style="margin-bottom: 0.65rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.2rem;">
          <span>${cat}</span>
          <span style="font-weight: 700; color: #ffffff;">${formatMoney(amount, trip.mainCurrency)} (${pct}%)</span>
        </div>
        <div class="progress-container" style="height: 6px;">
          <div class="progress-bar" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  const personBreakdownHTML = Object.keys(byPerson).length === 0 ? '' : `
    <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
      <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">Pagado Por</div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        ${Object.entries(byPerson).map(([person, amount]) => `
          <div style="background: var(--bg-surface); padding: 0.4rem 0.75rem; border-radius: var(--radius-full); font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;">
            ${renderIcon('user', { size: 13, color: 'var(--primary-cyan)' })}
            <span>${person}: <strong style="color: var(--primary-cyan);">${formatMoney(amount, trip.mainCurrency)}</strong></span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const listHTML = expenses.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
        ${renderIcon('credit-card', { size: 48, color: 'var(--accent-rose)' })}
      </div>
      <h3>No hay gastos registrados</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Añade tus gastos de transporte, hotel, comida o compras para llevar el control.</p>
      <button class="btn btn-primary" id="btn-add-exp-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        ${renderIcon('plus', { size: 16, color: '#0b1326' })}
        <span>Registrar Gasto</span>
      </button>
    </div>
  ` : `
    <div class="card">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.4rem;">
        ${renderIcon('receipt', { size: 18, color: 'var(--primary-cyan)' })}
        <span>Historial de Gastos</span>
      </h3>
      <div style="display: flex; flex-direction: column; gap: 0.65rem;">
        ${expenses.map(e => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.85rem 1rem; border-radius: var(--radius-md); gap: 0.5rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 180px;">
              <div style="font-weight: 600; color: #ffffff;">${e.description}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.2rem;">
                <span class="icon-inline">${renderIcon('calendar', { size: 12 })} ${formatDate(e.date)}</span>
                <span>•</span>
                <span class="icon-inline">${renderIcon('user', { size: 12 })} ${e.paidBy || 'Yo'}</span>
                ${e.notes ? `<span>•</span> <span class="icon-inline">${renderIcon('notes', { size: 12 })} ${e.notes}</span>` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge ${getCategoryBadgeClass(e.category)}">${e.category || 'Otros'}</span>
              <span style="font-family: 'Outfit', sans-serif; font-weight: 700; color: var(--accent-amber); font-size: 1.1rem;">
                ${formatMoney(e.amount, e.currency || trip.mainCurrency)}
              </span>
              <button class="btn btn-secondary btn-sm btn-edit-exp" data-id="${e.id}" title="Editar">
                ${renderIcon('edit', { size: 13 })}
              </button>
              <button class="btn btn-danger btn-sm btn-delete-exp" data-id="${e.id}" title="Eliminar">
                ${renderIcon('trash', { size: 13 })}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Registro de Gastos</h1>
        <div class="page-subtitle">Control de presupuesto y lista detallada de gastos</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-exp" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Registrar Gasto</span>
        </button>
      </div>
    </div>

    <!-- Summary Metrics Grid -->
    <div class="grid-3" style="margin-bottom: 1.5rem;">
      <div class="card">
        <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto Total</div>
        <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: #ffffff; margin: 0.2rem 0;">${formatMoney(budget, trip.mainCurrency)}</div>
        <div class="progress-container"><div class="progress-bar" style="width: 100%;"></div></div>
      </div>

      <div class="card">
        <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Total Gastado</div>
        <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--accent-rose); margin: 0.2rem 0;">${formatMoney(totalSpent, trip.mainCurrency)}</div>
        <div class="progress-container"><div class="progress-bar progress-rose" style="width: ${spentPercent}%;"></div></div>
      </div>

      <div class="card">
        <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Disponible</div>
        <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: ${available < 0 ? 'var(--accent-rose)' : 'var(--accent-amber)'}; margin: 0.2rem 0;">${formatMoney(available, trip.mainCurrency)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${100 - spentPercent}% libre</div>
      </div>
    </div>

    <!-- Category & Payer Breakdown Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.4rem;">
        ${renderIcon('budget', { size: 18, color: 'var(--accent-amber)' })}
        <span>Distribución por Categoría</span>
      </h3>
      ${categoryBreakdownHTML}
      ${personBreakdownHTML}
    </div>

    <!-- Expenses List -->
    ${listHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-add-exp')?.addEventListener('click', () => openExpenseModal(trip, null, refreshView));
    container.querySelector('#btn-add-exp-empty')?.addEventListener('click', () => openExpenseModal(trip, null, refreshView));

    container.querySelectorAll('.btn-edit-exp').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = expenses.find(e => e.id === id);
        if (item) openExpenseModal(trip, item, refreshView);
      });
    });

    container.querySelectorAll('.btn-delete-exp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar este gasto?')) {
          await deleteItem('expenses', id);
          showToast('Gasto eliminado');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openExpenseModal(trip, itemToEdit, refreshView) {
  const isEdit = !!itemToEdit;

  const bodyHTML = `
    <div class="form-group">
      <label>Descripción del Gasto *</label>
      <input type="text" id="exp-desc" class="form-control" value="${itemToEdit ? itemToEdit.description : ''}" placeholder="Ej: Almuerzo en Antigua, Taxi..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Monto *</label>
        <input type="number" step="0.01" id="exp-amount" class="form-control" value="${itemToEdit ? itemToEdit.amount : ''}" placeholder="0.00" required>
      </div>

      <div class="form-group">
        <label>Moneda</label>
        <select id="exp-currency" class="form-select">
          <option value="${trip.mainCurrency || 'CRC'}" selected>${trip.mainCurrency || 'CRC'}</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Categoría</label>
        <select id="exp-category" class="form-select">
          <option value="Alimentación" ${itemToEdit && itemToEdit.category === 'Alimentación' ? 'selected' : ''}>Alimentación</option>
          <option value="Hotel" ${itemToEdit && itemToEdit.category === 'Hotel' ? 'selected' : ''}>Hotel</option>
          <option value="Transporte" ${itemToEdit && itemToEdit.category === 'Transporte' ? 'selected' : ''}>Transporte</option>
          <option value="Compras" ${itemToEdit && itemToEdit.category === 'Compras' ? 'selected' : ''}>Compras</option>
          <option value="Souvenirs" ${itemToEdit && itemToEdit.category === 'Souvenirs' ? 'selected' : ''}>Souvenirs</option>
          <option value="Tours" ${itemToEdit && itemToEdit.category === 'Tours' ? 'selected' : ''}>Tours / Atracciones</option>
          <option value="Entretenimiento" ${itemToEdit && itemToEdit.category === 'Entretenimiento' ? 'selected' : ''}>Entretenimiento</option>
          <option value="Otros" ${itemToEdit && itemToEdit.category === 'Otros' ? 'selected' : ''}>Otros</option>
        </select>
      </div>

      <div class="form-group">
        <label>Fecha *</label>
        <input type="date" id="exp-date" class="form-control" value="${itemToEdit ? itemToEdit.date : new Date().toISOString().split('T')[0]}" required>
      </div>
    </div>

    <div class="form-group">
      <label>Persona que pagó</label>
      <input type="text" id="exp-paidby" class="form-control" value="${itemToEdit ? itemToEdit.paidBy || 'Yo' : 'Yo'}" placeholder="Ej: Yo, Carlos, Grupo...">
    </div>

    <div class="form-group">
      <label>Notas</label>
      <input type="text" id="exp-notes" class="form-control" value="${itemToEdit ? itemToEdit.notes || '' : ''}" placeholder="Efectivo, Tarjeta, etc.">
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon(isEdit ? 'edit' : 'plus', { size: 20, color: 'var(--primary-cyan)' })} ${isEdit ? 'Editar Gasto' : 'Registrar Gasto'}</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const description = document.getElementById('exp-desc').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const currency = document.getElementById('exp-currency').value;
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const paidBy = document.getElementById('exp-paidby').value.trim() || 'Yo';
    const notes = document.getElementById('exp-notes').value.trim();

    if (!description || !amount || !date) {
      alert('Por favor completa la descripción, monto y fecha.');
      return false;
    }

    const expData = {
      ...(itemToEdit || {}),
      tripId: trip.id,
      description,
      amount,
      currency,
      category,
      date,
      paidBy,
      notes
    };

    await saveItem('expenses', expData);
    showToast(isEdit ? 'Gasto actualizado' : 'Gasto registrado');
    refreshView();
    return true;
  });
}

