/**
 * TravelOne Bucket List & Places to Visit View
 * Manages destination points of interest, tourist attractions, priority levels, estimated admissions, and visited check-offs.
 * 
 * @module js/views/places
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatMoney, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the places and attractions bucket list view.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to refresh view after updates
 * @returns {Promise<HTMLElement>} The places view DOM container
 */
export async function renderPlacesView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const places = await getAllFromStore('places', trip.id);

  let currentCategoryFilter = 'todos';
  let currentStatusFilter = 'todos';

  const filterAndRenderPlaces = () => {
    const filtered = places.filter(p => {
      const matchCat = currentCategoryFilter === 'todos' || p.category === currentCategoryFilter;
      const matchStatus = currentStatusFilter === 'todos' ||
        (currentStatusFilter === 'visitados' && p.visited) ||
        (currentStatusFilter === 'pendientes' && !p.visited);
      return matchCat && matchStatus;
    });

    if (filtered.length === 0) {
      return `
        <div class="card" style="text-align: center; padding: 2.5rem 1.5rem; grid-column: 1 / -1;">
          <div style="margin-bottom: 0.5rem; display: flex; justify-content: center;">
            ${renderIcon('map-pin', { size: 40, color: 'var(--text-dim)' })}
          </div>
          <div style="color: var(--text-muted);">No se encontraron lugares con estos filtros.</div>
        </div>
      `;
    }

    return filtered.map(p => {
      let priorityBadge = '';
      if (p.priority === 'Alta') priorityBadge = `<span class="badge icon-inline" style="background: rgba(255,117,140,0.15); color: var(--accent-rose);">${renderIcon('flame', { size: 12, color: 'var(--accent-rose)' })} Alta</span>`;
      else if (p.priority === 'Media') priorityBadge = `<span class="badge icon-inline" style="background: rgba(246,211,101,0.15); color: var(--accent-amber);">${renderIcon('star', { size: 12, color: 'var(--accent-amber)' })} Media</span>`;
      else priorityBadge = `<span class="badge badge-default icon-inline">${renderIcon('leaf', { size: 12, color: '#00f260' })} Baja</span>`;

      return `
        <div class="card" style="opacity: ${p.visited ? 0.75 : 1};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <span class="badge badge-tourism">${p.category || 'Atracción'}</span>
            <div>${priorityBadge}</div>
          </div>

          <h3 style="font-size: 1.2rem; margin-bottom: 0.2rem; ${p.visited ? 'text-decoration: line-through;' : ''}">${p.name}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.35rem;">
            ${renderIcon('map-pin', { size: 13, color: 'var(--primary-cyan)' })}
            <span>${p.address || 'Sin dirección especificada'}</span>
          </div>

          ${p.approxPrice ? `
            <div style="font-size: 0.85rem; color: var(--accent-amber); font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
              ${renderIcon('coins', { size: 13, color: 'var(--accent-amber)' })}
              <span>Aprox: ${formatMoney(p.approxPrice, trip.mainCurrency)}</span>
            </div>
          ` : ''}

          ${p.notes ? `
            <div style="font-size: 0.8rem; color: var(--text-dim); background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; display: flex; align-items: flex-start; gap: 0.35rem;">
              ${renderIcon('notes', { size: 13, color: 'var(--text-muted)' })}
              <span>${p.notes}</span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.65rem; margin-top: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; color: ${p.visited ? '#00f260' : 'var(--text-muted)'}; font-weight: 600;">
              <input type="checkbox" class="chk-toggle-visited" data-id="${p.id}" ${p.visited ? 'checked' : ''} style="accent-color: var(--primary-cyan); width: 18px; height: 18px;">
              <span class="icon-inline">${p.visited ? `${renderIcon('check', { size: 14, color: '#00f260' })} Visitado` : 'Pendiente de visitar'}</span>
            </label>

            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm btn-edit-place" data-id="${p.id}" title="Editar">
                ${renderIcon('edit', { size: 13 })}
              </button>
              <button class="btn btn-danger btn-sm btn-delete-place" data-id="${p.id}" title="Eliminar">
                ${renderIcon('trash', { size: 13 })}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Lugares por Visitar</h1>
        <div class="page-subtitle">Restaurantes, cafeterías, miradores, museos y atracciones imperdibles</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-place" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Lugar</span>
        </button>
      </div>
    </div>

    <!-- Filters Row -->
    <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
      <select id="filter-place-category" class="form-select" style="max-width: 200px;">
        <option value="todos">Todas las categorías</option>
        <option value="Restaurante">Restaurante</option>
        <option value="Cafetería">Cafetería</option>
        <option value="Atracción">Atracción</option>
        <option value="Museo">Museo</option>
        <option value="Tienda">Tienda</option>
        <option value="Mercado">Mercado</option>
        <option value="Mirador">Mirador</option>
        <option value="Souvenirs">Souvenirs</option>
        <option value="Otros">Otros</option>
      </select>

      <select id="filter-place-status" class="form-select" style="max-width: 200px;">
        <option value="todos">Todos los estados</option>
        <option value="pendientes">Pendientes por visitar</option>
        <option value="visitados">Visitados</option>
      </select>
    </div>

    <div class="grid-3" id="places-grid-container">
      ${filterAndRenderPlaces()}
    </div>
  `;

  const attachEvents = () => {
    container.querySelector('#filter-place-category')?.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      container.querySelector('#places-grid-container').innerHTML = filterAndRenderPlaces();
      attachEvents();
    });

    container.querySelector('#filter-place-status')?.addEventListener('change', (e) => {
      currentStatusFilter = e.target.value;
      container.querySelector('#places-grid-container').innerHTML = filterAndRenderPlaces();
      attachEvents();
    });

    container.querySelectorAll('.chk-toggle-visited').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = parseInt(chk.getAttribute('data-id'));
        const place = places.find(p => p.id === id);
        if (place) {
          place.visited = chk.checked;
          await saveItem('places', place);
          showToast(place.visited ? `¡Marcado "${place.name}" como visitado!` : `Lugar puesto en pendientes`);
          refreshView();
        }
      });
    });

    container.querySelectorAll('.btn-edit-place').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const place = places.find(p => p.id === id);
        if (place) openPlaceModal(trip, place, refreshView);
      });
    });

    container.querySelectorAll('.btn-delete-place').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar este lugar?')) {
          await deleteItem('places', id);
          showToast('Lugar eliminado');
          refreshView();
        }
      });
    });
  };

  setTimeout(() => {
    container.querySelector('#btn-add-place')?.addEventListener('click', () => openPlaceModal(trip, null, refreshView));
    attachEvents();
  }, 50);

  return container;
}

function openPlaceModal(trip, itemToEdit, refreshView) {
  const isEdit = !!itemToEdit;

  const bodyHTML = `
    <div class="form-group">
      <label>Nombre del Lugar *</label>
      <input type="text" id="place-name" class="form-control" value="${itemToEdit ? itemToEdit.name : ''}" placeholder="Ej: Arco de Santa Catalina, Frida's..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Categoría</label>
        <select id="place-category" class="form-select">
          <option value="Restaurante" ${itemToEdit && itemToEdit.category === 'Restaurante' ? 'selected' : ''}>Restaurante</option>
          <option value="Cafetería" ${itemToEdit && itemToEdit.category === 'Cafetería' ? 'selected' : ''}>Cafetería</option>
          <option value="Atracción" ${!itemToEdit || itemToEdit.category === 'Atracción' ? 'selected' : ''}>Atracción</option>
          <option value="Museo" ${itemToEdit && itemToEdit.category === 'Museo' ? 'selected' : ''}>Museo</option>
          <option value="Tienda" ${itemToEdit && itemToEdit.category === 'Tienda' ? 'selected' : ''}>Tienda</option>
          <option value="Mercado" ${itemToEdit && itemToEdit.category === 'Mercado' ? 'selected' : ''}>Mercado</option>
          <option value="Mirador" ${itemToEdit && itemToEdit.category === 'Mirador' ? 'selected' : ''}>Mirador</option>
          <option value="Souvenirs" ${itemToEdit && itemToEdit.category === 'Souvenirs' ? 'selected' : ''}>Souvenirs</option>
          <option value="Otros" ${itemToEdit && itemToEdit.category === 'Otros' ? 'selected' : ''}>Otros</option>
        </select>
      </div>

      <div class="form-group">
        <label>Prioridad</label>
        <select id="place-priority" class="form-select">
          <option value="Alta" ${itemToEdit && itemToEdit.priority === 'Alta' ? 'selected' : ''}>Alta (Imprescindible)</option>
          <option value="Media" ${!itemToEdit || itemToEdit.priority === 'Media' ? 'selected' : ''}>Media</option>
          <option value="Baja" ${itemToEdit && itemToEdit.priority === 'Baja' ? 'selected' : ''}>Baja (Opcional)</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Dirección</label>
        <input type="text" id="place-address" class="form-control" value="${itemToEdit ? itemToEdit.address || '' : ''}" placeholder="Ej: Calle del Arco">
      </div>

      <div class="form-group">
        <label>Precio Aproximado (${trip.mainCurrency})</label>
        <input type="number" step="0.01" id="place-price" class="form-control" value="${itemToEdit ? itemToEdit.approxPrice || '' : ''}" placeholder="0.00">
      </div>
    </div>

    <div class="form-group">
      <label>Notas / Recomendaciones</label>
      <textarea id="place-notes" class="form-control" rows="2" placeholder="Plato recomendado, horario de mejor vista, etc.">${itemToEdit ? itemToEdit.notes || '' : ''}</textarea>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon(isEdit ? 'edit' : 'plus', { size: 20, color: 'var(--primary-cyan)' })} ${isEdit ? 'Editar Lugar' : 'Agregar Lugar'}</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const name = document.getElementById('place-name').value.trim();
    const category = document.getElementById('place-category').value;
    const priority = document.getElementById('place-priority').value;
    const address = document.getElementById('place-address').value.trim();
    const approxPrice = parseFloat(document.getElementById('place-price').value) || 0;
    const notes = document.getElementById('place-notes').value.trim();

    if (!name) {
      alert('Por favor indica el nombre del lugar.');
      return false;
    }

    const placeData = {
      ...(itemToEdit || {}),
      tripId: trip.id,
      name,
      category,
      priority,
      address,
      approxPrice,
      notes,
      visited: itemToEdit ? itemToEdit.visited : false
    };

    await saveItem('places', placeData);
    showToast(isEdit ? 'Lugar actualizado' : 'Lugar guardado');
    refreshView();
    return true;
  });
}

