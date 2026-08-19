/**
 * TravelOne Financial Suite Hub (Pillar 2)
 * Unifies expense tracking, category budget allocations & limits, and shopping/souvenirs with auto-sync.
 * 
 * @module js/views/expenses
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatDate, formatMoney, getCategoryBadgeClass, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the unified Financial Suite view.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to re-render the view
 * @param {string} [initialTab='expenses'] - Initial active tab ('expenses' | 'budget' | 'shopping')
 * @returns {Promise<HTMLElement>} The rendered container element
 */
export async function renderExpensesView(trip, refreshView, initialTab = 'expenses') {
  if (!trip) return document.createElement('div');

  const expenses = await getAllFromStore('expenses', trip.id);
  const shoppingItems = await getAllFromStore('shopping', trip.id);

  let activeTab = initialTab;
  let expenseCatFilter = 'todos';

  const container = document.createElement('div');

  const renderContent = () => {
    // -------------------------------------------------------------
    // FINANCIAL CALCULATIONS & SHARED METRICS
    // -------------------------------------------------------------
    const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const budget = parseFloat(trip.budget) || 0;
    const available = budget - totalSpent;
    const spentPercent = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

    // Category allocations & actuals
    const defaultBudgets = {
      'Hotel': Math.round(budget * 0.35),
      'Comida': Math.round(budget * 0.25),
      'Transporte': Math.round(budget * 0.20),
      'Compras': Math.round(budget * 0.10),
      'Tours': Math.round(budget * 0.05),
      'Otros': Math.round(budget * 0.05)
    };
    const categoryBudgets = trip.categoryBudgets || defaultBudgets;

    const actualSpentByCat = {
      'Hotel': 0, 'Comida': 0, 'Transporte': 0, 'Compras': 0, 'Tours': 0, 'Otros': 0
    };
    expenses.forEach(e => {
      let cat = e.category || 'Otros';
      if (cat === 'Alimentación') cat = 'Comida';
      if (cat === 'Souvenirs') cat = 'Compras';
      if (cat === 'Turismo' || cat === 'Entretenimiento') cat = 'Tours';
      if (!actualSpentByCat.hasOwnProperty(cat)) actualSpentByCat['Otros'] += (parseFloat(e.amount) || 0);
      else actualSpentByCat[cat] += (parseFloat(e.amount) || 0);
    });

    // Payer breakdown
    const byPerson = {};
    expenses.forEach(e => {
      const p = e.paidBy || 'Yo';
      byPerson[p] = (byPerson[p] || 0) + (parseFloat(e.amount) || 0);
    });

    // -------------------------------------------------------------
    // TAB 1: REGISTRO DE GASTOS
    // -------------------------------------------------------------
    expenses.sort((a, b) => b.date.localeCompare(a.date));

    const filteredExpenses = expenses.filter(e => {
      return expenseCatFilter === 'todos' || e.category === expenseCatFilter;
    });

    const expensesListHTML = filteredExpenses.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('wallet', { size: 48, color: 'var(--accent-emerald)' })}
        </div>
        <h3>No hay gastos registrados</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Lleva el control de cada pago, propina o compra durante tu viaje.</p>
        <button class="btn btn-primary" id="btn-add-exp-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Registrar Gasto</span>
        </button>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 0.65rem;">
        ${filteredExpenses.map(e => `
          <div class="card" style="padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="background: rgba(255,255,255,0.06); padding: 0.6rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;">
                ${renderIcon(e.category === 'Hotel' ? 'hotel' : (e.category === 'Comida' || e.category === 'Alimentación' ? 'utensils' : (e.category === 'Transporte' ? 'bus' : (e.category === 'Compras' ? 'shopping' : 'tag'))), { size: 20, color: 'var(--primary-cyan)' })}
              </div>
              <div>
                <h4 style="font-size: 1.05rem; font-family: 'Outfit', sans-serif; margin-bottom: 0.2rem; color: #ffffff;">${e.description}</h4>
                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span>${formatDate(e.date)}</span>
                  <span>•</span>
                  <span class="badge ${getCategoryBadgeClass(e.category)}">${e.category}</span>
                  <span>•</span>
                  <span>Pagó: <strong>${e.paidBy || 'Yo'}</strong></span>
                  ${e.method ? `<span>(${e.method})</span>` : ''}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="text-align: right;">
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-amber); font-family: 'Outfit', sans-serif;">
                  ${formatMoney(e.amount, trip.mainCurrency || 'CRC')}
                </div>
                ${e.notes ? `<div style="font-size: 0.75rem; color: var(--text-dim); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e.notes}</div>` : ''}
              </div>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-edit-exp" data-id="${e.id}" title="Editar">
                  ${renderIcon('edit', { size: 14 })}
                </button>
                <button class="btn btn-danger btn-sm btn-delete-exp" data-id="${e.id}" title="Eliminar">
                  ${renderIcon('trash', { size: 14 })}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // -------------------------------------------------------------
    // TAB 2: PRESUPUESTO & LÍMITES
    // -------------------------------------------------------------
    const budgetCategoriesHTML = Object.keys(categoryBudgets).map(cat => {
      const allocated = categoryBudgets[cat] || 0;
      const spent = actualSpentByCat[cat] || 0;
      const diff = allocated - spent;
      const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
      const isOver = spent > allocated;

      let barColor = 'var(--primary-cyan)';
      if (pct > 80 && !isOver) barColor = 'var(--accent-amber)';
      if (isOver) barColor = 'var(--accent-rose)';

      return `
        <div class="card" style="margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge ${getCategoryBadgeClass(cat)}">${cat}</span>
              <span style="font-weight: 700; font-size: 1rem; color: #ffffff;">${formatMoney(spent, trip.mainCurrency || 'CRC')}</span>
              <span style="font-size: 0.85rem; color: var(--text-muted);">de ${formatMoney(allocated, trip.mainCurrency || 'CRC')}</span>
            </div>
            <div>
              ${isOver ? `
                <span class="badge" style="background: rgba(255,117,140,0.15); color: var(--accent-rose); font-weight: 700;">
                  Excedido por ${formatMoney(Math.abs(diff), trip.mainCurrency || 'CRC')}
                </span>
              ` : `
                <span style="font-size: 0.85rem; color: var(--accent-emerald);">
                  Disponible: ${formatMoney(diff, trip.mainCurrency || 'CRC')}
                </span>
              `}
            </div>
          </div>

          <div class="progress-container" style="height: 8px; margin: 0.4rem 0;">
            <div class="progress-bar" style="width: ${pct}%; background: ${barColor};"></div>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-align: right;">${pct}% utilizado</div>
        </div>
      `;
    }).join('');

    // -------------------------------------------------------------
    // TAB 3: COMPRAS & SOUVENIRS
    // -------------------------------------------------------------
    const totalEstShopping = shoppingItems.reduce((sum, item) => sum + ((parseFloat(item.estPrice) || 0) * (parseInt(item.quantity) || 1)), 0);
    const totalRealShopping = shoppingItems.filter(item => item.bought).reduce((sum, item) => sum + ((parseFloat(item.realPrice) || parseFloat(item.estPrice) || 0) * (parseInt(item.quantity) || 1)), 0);

    const shoppingListHTML = shoppingItems.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('shopping', { size: 48, color: 'var(--primary-cyan)' })}
        </div>
        <h3>No hay artículos en la lista de compras</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Lleva el registro de souvenirs, café, artesanías o regalos para tus amigos y familiares.</p>
        <button class="btn btn-primary" id="btn-add-shop-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Artículo</span>
        </button>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 0.65rem;">
        ${shoppingItems.map(item => {
          const qty = parseInt(item.quantity) || 1;
          const estTotal = (parseFloat(item.estPrice) || 0) * qty;
          const realPriceUnit = parseFloat(item.realPrice) || parseFloat(item.estPrice) || 0;
          const realTotal = realPriceUnit * qty;

          return `
            <div class="card" style="opacity: ${item.bought ? 0.8 : 1}; padding: 1rem 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <input type="checkbox" class="chk-toggle-bought" data-id="${item.id}" ${item.bought ? 'checked' : ''} style="accent-color: var(--primary-cyan); width: 20px; height: 20px; cursor: pointer;">
                  <div>
                    <h4 style="font-size: 1.05rem; font-family: 'Outfit', sans-serif; ${item.bought ? 'text-decoration: line-through; color: var(--text-muted);' : 'color: #ffffff;'}">${item.product}</h4>
                    <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.2rem;">
                      ${item.recipient ? `<span>Para: <strong>${item.recipient}</strong></span> <span>•</span>` : ''}
                      <span>Cant: ${qty}</span>
                      <span>•</span>
                      <span class="badge badge-shopping">${item.category || 'Souvenirs'}</span>
                      ${item.place ? `<span>•</span> <span>Lugar: ${item.place}</span>` : ''}
                    </div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1rem;">
                  <div style="text-align: right;">
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-amber); font-family: 'Outfit', sans-serif;">
                      ${formatMoney(item.bought ? realTotal : estTotal, trip.mainCurrency || 'CRC')}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">
                      ${item.bought ? 'Comprado' : `Est: ${formatMoney(estTotal, trip.mainCurrency || 'CRC')}`}
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.35rem;">
                    <button class="btn btn-secondary btn-sm btn-edit-shop" data-id="${item.id}" title="Editar">
                      ${renderIcon('edit', { size: 14 })}
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-shop" data-id="${item.id}" title="Eliminar">
                      ${renderIcon('trash', { size: 14 })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // -------------------------------------------------------------
    // MAIN SUITE CONTAINER LAYOUT
    // -------------------------------------------------------------
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1>Finanzas de Viaje</h1>
          <div class="page-subtitle">Control de gastos, presupuestos por categoría y lista de compras</div>
        </div>
        <div class="header-actions">
          ${activeTab === 'expenses' ? `
            <button class="btn btn-primary" id="btn-add-expense" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nuevo Gasto</span>
            </button>
          ` : (activeTab === 'budget' ? `
            <button class="btn btn-secondary" id="btn-edit-budget-limits" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('edit', { size: 16 })}
              <span>Ajustar Presupuesto</span>
            </button>
          ` : `
            <button class="btn btn-primary" id="btn-add-shop-item" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nuevo Artículo</span>
            </button>
          `)}
        </div>
      </div>

      <!-- Financial Metric Cards Top Banner -->
      <div class="grid grid-3" style="margin-bottom: 1.5rem;">
        <div class="card stat-card">
          <div class="stat-icon" style="background: rgba(0,242,254,0.1); color: var(--primary-cyan);">
            ${renderIcon('wallet', { size: 24, color: 'var(--primary-cyan)' })}
          </div>
          <div>
            <div class="stat-label">Presupuesto Total</div>
            <div class="stat-value" style="color: var(--primary-cyan); font-family: 'Outfit', sans-serif;">
              ${formatMoney(budget, trip.mainCurrency || 'CRC')}
            </div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-icon" style="background: rgba(246,211,101,0.1); color: var(--accent-amber);">
            ${renderIcon('tag', { size: 24, color: 'var(--accent-amber)' })}
          </div>
          <div>
            <div class="stat-label">Total Gastado</div>
            <div class="stat-value" style="color: var(--accent-amber); font-family: 'Outfit', sans-serif;">
              ${formatMoney(totalSpent, trip.mainCurrency || 'CRC')}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">${spentPercent}% del presupuesto</div>
          </div>
        </div>

        <div class="card stat-card">
          <div class="stat-icon" style="background: ${available >= 0 ? 'rgba(0,242,96,0.1)' : 'rgba(255,117,140,0.1)'}; color: ${available >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
            ${renderIcon(available >= 0 ? 'check' : 'alert', { size: 24, color: available >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' })}
          </div>
          <div>
            <div class="stat-label">Saldo Disponible</div>
            <div class="stat-value" style="color: ${available >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-family: 'Outfit', sans-serif;">
              ${formatMoney(available, trip.mainCurrency || 'CRC')}
            </div>
          </div>
        </div>
      </div>

      <!-- Integrated 3-Tab Pillar Header -->
      <div style="display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; padding-bottom: 2px;">
        <button class="btn btn-sm ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-expenses" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('wallet', { size: 14 })}
          <span>Registro de Gastos (${expenses.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'budget' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-budget" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('calculator', { size: 14 })}
          <span>Presupuesto & Límites</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'shopping' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-shopping" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('shopping', { size: 14 })}
          <span>Compras & Souvenirs (${shoppingItems.length})</span>
        </button>
      </div>

      <!-- Sub-Tab Content -->
      ${activeTab === 'expenses' ? `
        <!-- Filter Bar -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; background: var(--bg-card); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <select id="filter-exp-cat" class="form-select" style="flex: 1; min-width: 150px;">
            <option value="todos" ${expenseCatFilter === 'todos' ? 'selected' : ''}>Todas las categorías</option>
            <option value="Comida" ${expenseCatFilter === 'Comida' ? 'selected' : ''}>Comida / Restaurantes</option>
            <option value="Hotel" ${expenseCatFilter === 'Hotel' ? 'selected' : ''}>Hospedaje</option>
            <option value="Transporte" ${expenseCatFilter === 'Transporte' ? 'selected' : ''}>Transporte</option>
            <option value="Tours" ${expenseCatFilter === 'Tours' ? 'selected' : ''}>Tours & Entradas</option>
            <option value="Compras" ${expenseCatFilter === 'Compras' ? 'selected' : ''}>Compras & Souvenirs</option>
            <option value="Otros" ${expenseCatFilter === 'Otros' ? 'selected' : ''}>Otros gastos</option>
          </select>
        </div>
        <div id="section-expenses">${expensesListHTML}</div>
      ` : (activeTab === 'budget' ? `
        <div id="section-budget">
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1.15rem; margin-bottom: 1rem; color: #ffffff;">Límites y Distribución por Categoría</h3>
            ${budgetCategoriesHTML}
          </div>
        </div>
      ` : `
        <div id="section-shopping">
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 0.75rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Total Estimado: <strong style="color: #ffffff;">${formatMoney(totalEstShopping, trip.mainCurrency || 'CRC')}</strong>
            </div>
            <div style="font-size: 0.85rem; color: var(--accent-emerald);">
              Gasto Real en Compras: <strong style="color: var(--accent-amber);">${formatMoney(totalRealShopping, trip.mainCurrency || 'CRC')}</strong>
            </div>
          </div>
          ${shoppingListHTML}
        </div>
      `)}
    `;

    // Attach Tab Switch Listeners
    document.getElementById('tab-sub-expenses')?.addEventListener('click', () => { activeTab = 'expenses'; renderContent(); });
    document.getElementById('tab-sub-budget')?.addEventListener('click', () => { activeTab = 'budget'; renderContent(); });
    document.getElementById('tab-sub-shopping')?.addEventListener('click', () => { activeTab = 'shopping'; renderContent(); });

    // Filter Listeners
    document.getElementById('filter-exp-cat')?.addEventListener('change', (e) => { expenseCatFilter = e.target.value; renderContent(); });

    // Expense Action Handlers
    document.getElementById('btn-add-expense')?.addEventListener('click', () => openExpenseModal());
    document.getElementById('btn-add-exp-empty')?.addEventListener('click', () => openExpenseModal());

    document.querySelectorAll('.btn-edit-exp').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = expenses.find(e => e.id === id);
        if (item) openExpenseModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-exp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar este registro de gasto?')) {
          await deleteItem('expenses', id);
          showToast('Gasto eliminado', 'info');
          refreshView();
        }
      });
    });

    // Budget Edit Handler
    document.getElementById('btn-edit-budget-limits')?.addEventListener('click', () => openBudgetModal());

    // Shopping Action Handlers
    document.getElementById('btn-add-shop-item')?.addEventListener('click', () => openShoppingModal());
    document.getElementById('btn-add-shop-empty')?.addEventListener('click', () => openShoppingModal());

    document.querySelectorAll('.chk-toggle-bought').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = parseInt(chk.getAttribute('data-id'));
        const item = shoppingItems.find(s => s.id === id);
        if (item) {
          item.bought = chk.checked;
          await saveItem('shopping', item);

          // Cross-Module: Auto-offer to register in Gastos when checked as bought
          if (item.bought) {
            const cost = (parseFloat(item.realPrice) || parseFloat(item.estPrice) || 0) * (parseInt(item.quantity) || 1);
            if (cost > 0 && confirm(`¿Deseas registrar este souvenir (${item.product}) como un gasto de ${formatMoney(cost, trip.mainCurrency || 'CRC')} en tu libro de gastos?`)) {
              await saveItem('expenses', {
                tripId: trip.id,
                description: `Compra: ${item.product} (x${item.quantity || 1})`,
                amount: cost,
                category: 'Compras',
                date: new Date().toISOString().split('T')[0],
                paidBy: 'Yo',
                method: 'Efectivo / Tarjeta',
                notes: `Registrado automáticamente desde Compras (${item.place || 'Tienda'})`
              });
              showToast('¡Artículo marcado y registrado en Gastos!');
            } else {
              showToast('Artículo marcado como comprado');
            }
          } else {
            showToast('Artículo marcado como pendiente');
          }
          refreshView();
        }
      });
    });

    document.querySelectorAll('.btn-edit-shop').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = shoppingItems.find(s => s.id === id);
        if (item) openShoppingModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-shop').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar este artículo de compras?')) {
          await deleteItem('shopping', id);
          showToast('Artículo eliminado', 'info');
          refreshView();
        }
      });
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT EXPENSE
  // -------------------------------------------------------------
  const openExpenseModal = (item = null) => {
    const isEdit = item && item.id;
    const bodyHTML = `
      <div class="form-group">
        <label>Descripción del Gasto *</label>
        <input type="text" id="exp-desc" class="form-control" placeholder="Ej. Almuerzo mariscos, Taxi aeropuerto" value="${item ? item.description : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Monto (${trip.mainCurrency || 'CRC'}) *</label>
          <input type="number" step="any" id="exp-amount" class="form-control" placeholder="0.00" value="${item ? item.amount : ''}" required style="font-size: 1.1rem; font-weight: 700;">
        </div>

        <div class="form-group">
          <label>Fecha *</label>
          <input type="date" id="exp-date" class="form-control" value="${item ? item.date : new Date().toISOString().split('T')[0]}" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Categoría</label>
          <select id="exp-category" class="form-select">
            ${['Comida', 'Hotel', 'Transporte', 'Tours', 'Compras', 'Otros'].map(c => `
              <option value="${c}" ${item && item.category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Pagado por</label>
          <input type="text" id="exp-paid-by" class="form-control" placeholder="Ej. Yo, Pareja, Amigos" value="${item ? (item.paidBy || 'Yo') : 'Yo'}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Método de Pago</label>
          <select id="exp-method" class="form-select">
            ${['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia / SINPE', 'Otro'].map(m => `
              <option value="${m}" ${item && item.method === m ? 'selected' : ''}>${m}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Notas / Ubicación</label>
          <input type="text" id="exp-notes" class="form-control" placeholder="Ej. Restaurante El Mirador" value="${item ? (item.notes || '') : ''}">
        </div>
      </div>
    `;

    openModal(isEdit ? 'Editar Gasto' : 'Nuevo Gasto', bodyHTML, async () => {
      const description = document.getElementById('exp-desc').value.trim();
      const amount = parseFloat(document.getElementById('exp-amount').value);
      const date = document.getElementById('exp-date').value;

      if (!description || isNaN(amount) || amount <= 0 || !date) {
        showToast('Indica descripción, monto válido y fecha', 'error');
        return false;
      }

      const expObj = {
        tripId: trip.id,
        description,
        amount,
        date,
        category: document.getElementById('exp-category').value,
        paidBy: document.getElementById('exp-paid-by').value.trim() || 'Yo',
        method: document.getElementById('exp-method').value,
        notes: document.getElementById('exp-notes').value.trim()
      };

      if (isEdit) expObj.id = item.id;
      await saveItem('expenses', expObj);
      showToast(isEdit ? 'Gasto actualizado' : 'Gasto registrado');
      activeTab = 'expenses';
      refreshView();
      return true;
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADJUST BUDGET LIMITS
  // -------------------------------------------------------------
  const openBudgetModal = () => {
    const curBudgets = trip.categoryBudgets || {
      'Hotel': Math.round(trip.budget * 0.35),
      'Comida': Math.round(trip.budget * 0.25),
      'Transporte': Math.round(trip.budget * 0.20),
      'Compras': Math.round(trip.budget * 0.10),
      'Tours': Math.round(trip.budget * 0.05),
      'Otros': Math.round(trip.budget * 0.05)
    };

    const bodyHTML = `
      <div class="form-group">
        <label>Presupuesto Total del Viaje (${trip.mainCurrency || 'CRC'})</label>
        <input type="number" step="any" id="edit-total-budget" class="form-control" value="${trip.budget || 0}" style="font-size: 1.15rem; font-weight: 700;">
      </div>

      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Distribuye los límites máximos deseados para cada rubro:</div>

      <div class="form-row">
        <div class="form-group">
          <label>Hospedaje / Hotel</label>
          <input type="number" step="any" id="b-hotel" class="form-control" value="${curBudgets.Hotel || 0}">
        </div>
        <div class="form-group">
          <label>Comida & Bebidas</label>
          <input type="number" step="any" id="b-food" class="form-control" value="${curBudgets.Comida || 0}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Transporte</label>
          <input type="number" step="any" id="b-trans" class="form-control" value="${curBudgets.Transporte || 0}">
        </div>
        <div class="form-group">
          <label>Tours & Entradas</label>
          <input type="number" step="any" id="b-tours" class="form-control" value="${curBudgets.Tours || 0}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Compras & Souvenirs</label>
          <input type="number" step="any" id="b-shop" class="form-control" value="${curBudgets.Compras || 0}">
        </div>
        <div class="form-group">
          <label>Otros imprevistos</label>
          <input type="number" step="any" id="b-other" class="form-control" value="${curBudgets.Otros || 0}">
        </div>
      </div>
    `;

    openModal('Ajustar Presupuesto & Límites', bodyHTML, async () => {
      const newTotal = parseFloat(document.getElementById('edit-total-budget').value) || 0;
      trip.budget = newTotal;
      trip.categoryBudgets = {
        'Hotel': parseFloat(document.getElementById('b-hotel').value) || 0,
        'Comida': parseFloat(document.getElementById('b-food').value) || 0,
        'Transporte': parseFloat(document.getElementById('b-trans').value) || 0,
        'Tours': parseFloat(document.getElementById('b-tours').value) || 0,
        'Compras': parseFloat(document.getElementById('b-shop').value) || 0,
        'Otros': parseFloat(document.getElementById('b-other').value) || 0
      };

      await saveItem('trips', trip);
      showToast('Presupuesto actualizado correctamente');
      activeTab = 'budget';
      refreshView();
      return true;
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT SHOPPING ITEM
  // -------------------------------------------------------------
  const openShoppingModal = (item = null) => {
    const isEdit = item && item.id;
    const bodyHTML = `
      <div class="form-group">
        <label>Artículo / Souvenir *</label>
        <input type="text" id="shop-prod" class="form-control" placeholder="Ej. Café de altura, Camiseta artesanal, Imán" value="${item ? item.product : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Cantidad</label>
          <input type="number" id="shop-qty" class="form-control" value="${item ? (item.quantity || 1) : 1}" min="1">
        </div>

        <div class="form-group">
          <label>Para quién (Destinatario)</label>
          <input type="text" id="shop-recip" class="form-control" placeholder="Ej. Mamá, Familia, Yo" value="${item ? (item.recipient || '') : ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Precio Estimado Unitario (${trip.mainCurrency || 'CRC'})</label>
          <input type="number" step="any" id="shop-est-price" class="form-control" placeholder="0.00" value="${item ? (item.estPrice || 0) : 0}">
        </div>

        <div class="form-group">
          <label>Lugar / Tienda</label>
          <input type="text" id="shop-place" class="form-control" placeholder="Ej. Mercado Central, Tienda del volcán" value="${item ? (item.place || '') : ''}">
        </div>
      </div>

      <div class="form-group">
        <label>Notas adicionales</label>
        <textarea id="shop-notes" class="form-control" rows="2" placeholder="Talla, color, empaque especial...">${item ? (item.notes || '') : ''}</textarea>
      </div>
    `;

    openModal(isEdit ? 'Editar Artículo' : 'Nuevo Souvenir / Compra', bodyHTML, async () => {
      const product = document.getElementById('shop-prod').value.trim();
      if (!product) {
        showToast('El nombre del artículo es obligatorio', 'error');
        return false;
      }

      const shopObj = {
        tripId: trip.id,
        product,
        quantity: parseInt(document.getElementById('shop-qty').value) || 1,
        recipient: document.getElementById('shop-recip').value.trim(),
        estPrice: parseFloat(document.getElementById('shop-est-price').value) || 0,
        realPrice: item ? (item.realPrice || 0) : 0,
        place: document.getElementById('shop-place').value.trim(),
        notes: document.getElementById('shop-notes').value.trim(),
        bought: item ? item.bought : false
      };

      if (isEdit) shopObj.id = item.id;
      await saveItem('shopping', shopObj);
      showToast(isEdit ? 'Artículo actualizado' : 'Artículo agregado a la lista');
      activeTab = 'shopping';
      refreshView();
      return true;
    });
  };

  renderContent();
  return container;
}
