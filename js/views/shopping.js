/**
 * Shopping List View (Souvenirs & Travel Items)
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatMoney, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';

export async function renderShoppingView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const shoppingItems = await getAllFromStore('shopping', trip.id);

  const totalEstimated = shoppingItems.reduce((sum, item) => sum + ((parseFloat(item.estPrice) || 0) * (parseInt(item.quantity) || 1)), 0);
  const totalRealSpent = shoppingItems.filter(item => item.bought).reduce((sum, item) => sum + ((parseFloat(item.realPrice) || 0) * (parseInt(item.quantity) || 1)), 0);

  const listHTML = shoppingItems.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🛍️</div>
      <h3>Lista de compras vacía</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Añade recuerdos, souvenirs, café o regalos que deseas comprar durante tu viaje.</p>
      <button class="btn btn-primary" id="btn-add-shop-empty">+ Agregar Artículo</button>
    </div>
  ` : `
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      ${shoppingItems.map(item => {
        const qty = parseInt(item.quantity) || 1;
        const estTotal = (parseFloat(item.estPrice) || 0) * qty;
        const realTotal = (parseFloat(item.realPrice) || 0) * qty;

        return `
          <div class="card" style="opacity: ${item.bought ? 0.8 : 1};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <input type="checkbox" class="chk-toggle-bought" data-id="${item.id}" ${item.bought ? 'checked' : ''} style="accent-color: var(--primary-cyan); width: 20px; height: 20px; cursor: pointer;">
                <div>
                  <h4 style="font-size: 1.1rem; ${item.bought ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${item.product}</h4>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">
                    📍 ${item.place || 'Lugar pendiente'} • 📦 Cantidad: ${qty} • <span class="badge badge-shopping">${item.category || 'Souvenirs'}</span>
                  </div>
                </div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 0.8rem; color: var(--text-dim);">Est: ${formatMoney(estTotal, trip.mainCurrency)}</div>
                ${item.bought ? `
                  <div style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #00f260; font-size: 1.05rem;">
                    Real: ${formatMoney(realTotal, trip.mainCurrency)}
                  </div>
                ` : ''}
              </div>
            </div>

            ${item.notes ? `<div style="font-size: 0.8rem; color: var(--text-dim); background: var(--bg-surface); padding: 0.4rem 0.65rem; border-radius: var(--radius-sm); margin-top: 0.5rem;">📝 ${item.notes}</div>` : ''}

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm btn-edit-shop" data-id="${item.id}">✏️ Editar</button>
              <button class="btn btn-danger btn-sm btn-delete-shop" data-id="${item.id}">🗑️</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Lista de Compras & Souvenirs</h1>
        <div class="page-subtitle">Presupuesto estimado vs gasto real en regalos y compras</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-shop">+ Agregar Artículo</button>
      </div>
    </div>

    <!-- Summary Metrics Grid -->
    <div class="grid-2" style="margin-bottom: 1.5rem;">
      <div class="card">
        <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto Estimado Total</div>
        <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--primary-cyan); margin: 0.2rem 0;">
          ${formatMoney(totalEstimated, trip.mainCurrency)}
        </div>
      </div>

      <div class="card">
        <div style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase;">Total Real Gastado (Comprados)</div>
        <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: #00f260; margin: 0.2rem 0;">
          ${formatMoney(totalRealSpent, trip.mainCurrency)}
        </div>
      </div>
    </div>

    ${listHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-add-shop')?.addEventListener('click', () => openShoppingModal(trip, null, refreshView));
    container.querySelector('#btn-add-shop-empty')?.addEventListener('click', () => openShoppingModal(trip, null, refreshView));

    container.querySelectorAll('.chk-toggle-bought').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = parseInt(chk.getAttribute('data-id'));
        const item = shoppingItems.find(s => s.id === id);
        if (item) {
          item.bought = chk.checked;
          if (item.bought && !item.realPrice) item.realPrice = item.estPrice;
          await saveItem('shopping', item);
          showToast(item.bought ? `¡Comprado "${item.product}"!` : `Artículo marcado como no comprado`);
          refreshView();
        }
      });
    });

    container.querySelectorAll('.btn-edit-shop').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = shoppingItems.find(s => s.id === id);
        if (item) openShoppingModal(trip, item, refreshView);
      });
    });

    container.querySelectorAll('.btn-delete-shop').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar este artículo de compras?')) {
          await deleteItem('shopping', id);
          showToast('Artículo eliminado');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openShoppingModal(trip, itemToEdit, refreshView) {
  const isEdit = !!itemToEdit;

  const bodyHTML = `
    <div class="form-group">
      <label>Producto / Artículo *</label>
      <input type="text" id="shop-product" class="form-control" value="${itemToEdit ? itemToEdit.product : ''}" placeholder="Ej: Café tostado, Huipil, Chocolates..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Categoría</label>
        <select id="shop-category" class="form-select">
          <option value="Souvenirs" ${!itemToEdit || itemToEdit.category === 'Souvenirs' ? 'selected' : ''}>Souvenirs</option>
          <option value="Ropa" ${itemToEdit && itemToEdit.category === 'Ropa' ? 'selected' : ''}>Ropa</option>
          <option value="Electrónica" ${itemToEdit && itemToEdit.category === 'Electrónica' ? 'selected' : ''}>Electrónica</option>
          <option value="Comida" ${itemToEdit && itemToEdit.category === 'Comida' ? 'selected' : ''}>Comida / Bebida</option>
          <option value="Regalos" ${itemToEdit && itemToEdit.category === 'Regalos' ? 'selected' : ''}>Regalos</option>
          <option value="Otros" ${itemToEdit && itemToEdit.category === 'Otros' ? 'selected' : ''}>Otros</option>
        </select>
      </div>

      <div class="form-group">
        <label>Cantidad</label>
        <input type="number" id="shop-qty" class="form-control" value="${itemToEdit ? itemToEdit.quantity || 1 : 1}" min="1">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Precio Estimado Unitario (${trip.mainCurrency})</label>
        <input type="number" step="0.01" id="shop-est-price" class="form-control" value="${itemToEdit ? itemToEdit.estPrice || '' : ''}" placeholder="0.00">
      </div>

      <div class="form-group">
        <label>Precio Real Pagado Unitario (${trip.mainCurrency})</label>
        <input type="number" step="0.01" id="shop-real-price" class="form-control" value="${itemToEdit ? itemToEdit.realPrice || '' : ''}" placeholder="0.00">
      </div>
    </div>

    <div class="form-group">
      <label>Lugar o Tienda donde comprarlo</label>
      <input type="text" id="shop-place" class="form-control" value="${itemToEdit ? itemToEdit.place || '' : ''}" placeholder="Ej: Mercado de Artesanías">
    </div>

    <div class="form-group">
      <label>Notas</label>
      <input type="text" id="shop-notes" class="form-control" value="${itemToEdit ? itemToEdit.notes || '' : ''}" placeholder="Tallas, colores, destinatario...">
    </div>
  `;

  openModal(isEdit ? '✏️ Editar Artículo' : '➕ Agregar a Lista de Compras', bodyHTML, async () => {
    const product = document.getElementById('shop-product').value.trim();
    const category = document.getElementById('shop-category').value;
    const quantity = parseInt(document.getElementById('shop-qty').value) || 1;
    const estPrice = parseFloat(document.getElementById('shop-est-price').value) || 0;
    const realPrice = parseFloat(document.getElementById('shop-real-price').value) || 0;
    const place = document.getElementById('shop-place').value.trim();
    const notes = document.getElementById('shop-notes').value.trim();

    if (!product) {
      alert('Por favor especifica el nombre del producto.');
      return false;
    }

    const shopData = {
      ...(itemToEdit || {}),
      tripId: trip.id,
      product,
      category,
      quantity,
      estPrice,
      realPrice,
      place,
      notes,
      bought: itemToEdit ? itemToEdit.bought : false
    };

    await saveItem('shopping', shopData);
    showToast(isEdit ? 'Artículo actualizado' : 'Artículo guardado');
    refreshView();
    return true;
  });
}
