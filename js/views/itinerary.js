/**
 * TravelOne Itinerary Timeline View
 * Manages chronological daily schedules, activity categories, costs, locations, and completion statuses.
 * 
 * @module js/views/itinerary
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatDate, formatMoney, getCategoryBadgeClass, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the daily timeline view of activities for a trip.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to re-render the view
 * @returns {Promise<HTMLElement>} The rendered itinerary container
 */
export async function renderItineraryView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const items = await getAllFromStore('itinerary', trip.id);

  // Group items by date
  const groupedByDate = {};
  items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(item => {
    if (!groupedByDate[item.date]) groupedByDate[item.date] = [];
    groupedByDate[item.date].push(item);
  });

  const datesList = Object.keys(groupedByDate).sort();

  const daysTimelineHTML = datesList.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
        ${renderIcon('calendar', { size: 48, color: 'var(--primary-cyan)' })}
      </div>
      <h3>No hay actividades planificadas</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Añade tu primera actividad para construir el itinerario de tu viaje.</p>
      <button class="btn btn-primary" id="btn-add-activity-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        ${renderIcon('plus', { size: 16, color: '#0b1326' })}
        <span>Agregar Actividad</span>
      </button>
    </div>
  ` : datesList.map(date => {
    const dayItems = groupedByDate[date];

    return `
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
          <h3 style="font-size: 1.2rem; color: var(--primary-cyan); display: flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('calendar', { size: 18, color: 'var(--primary-cyan)' })}
            <span>${formatDate(date)}</span>
          </h3>
          <span class="badge badge-default">${dayItems.length} actividades</span>
        </div>

        <div class="timeline">
          ${dayItems.map(item => {
            let statusBadge = '';
            if (item.status === 'Completado') statusBadge = `<span class="status-badge status-completed icon-inline">${renderIcon('check', { size: 12 })} Completado</span>`;
            else if (item.status === 'En progreso') statusBadge = `<span class="status-badge status-in-progress icon-inline">${renderIcon('zap', { size: 12 })} En progreso</span>`;
            else statusBadge = `<span class="status-badge status-pending icon-inline">${renderIcon('hourglass', { size: 12 })} Pendiente</span>`;

            return `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.4rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <span class="timeline-time" style="display: inline-flex; align-items: center; gap: 0.3rem;">
                        ${renderIcon('clock', { size: 13 })} ${item.time || '08:00'}
                      </span>
                      <h4 style="font-size: 1.05rem; display: inline;">${item.title}</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <span class="badge ${getCategoryBadgeClass(item.category)}">${item.category || 'Otros'}</span>
                      ${statusBadge}
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                      ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })}
                      <span><strong>${item.location || 'Lugar no especificado'}</strong> ${item.address ? `(${item.address})` : ''}</span>
                    </div>
                    ${item.cost ? `<div style="font-weight: 700; color: var(--accent-amber);">${formatMoney(item.cost, trip.mainCurrency)}</div>` : ''}
                  </div>

                  ${item.notes ? `
                    <div style="font-size: 0.8rem; color: var(--text-dim); background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin-top: 0.5rem; display: flex; align-items: flex-start; gap: 0.35rem;">
                      ${renderIcon('notes', { size: 14, color: 'var(--text-muted)' })}
                      <span>${item.notes}</span>
                    </div>
                  ` : ''}

                  <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
                    <button class="btn btn-secondary btn-sm btn-edit-activity" data-id="${item.id}" style="display: inline-flex; align-items: center; gap: 0.3rem;">
                      ${renderIcon('edit', { size: 13 })} Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-activity" data-id="${item.id}" title="Eliminar">
                      ${renderIcon('trash', { size: 13 })}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Itinerario del Viaje</h1>
        <div class="page-subtitle">Timeline día a día de tus actividades en ${trip.destination}</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-activity" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Actividad</span>
        </button>
      </div>
    </div>

    ${daysTimelineHTML}
  `;

  // Attach Event Handlers
  setTimeout(() => {
    container.querySelector('#btn-add-activity')?.addEventListener('click', () => openActivityModal(trip, null, refreshView));
    container.querySelector('#btn-add-activity-empty')?.addEventListener('click', () => openActivityModal(trip, null, refreshView));

    container.querySelectorAll('.btn-edit-activity').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = items.find(i => i.id === id);
        if (item) openActivityModal(trip, item, refreshView);
      });
    });

    container.querySelectorAll('.btn-delete-activity').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar esta actividad?')) {
          await deleteItem('itinerary', id);
          showToast('Actividad eliminada');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openActivityModal(trip, itemToEdit, refreshView) {
  const isEdit = !!itemToEdit;
  const initialDate = itemToEdit ? itemToEdit.date : trip.startDate;

  const bodyHTML = `
    <div class="form-group">
      <label>Nombre / Título de la Actividad *</label>
      <input type="text" id="act-title" class="form-control" value="${itemToEdit ? itemToEdit.title : ''}" placeholder="Ej: Visita al Museo, Almuerzo..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Fecha *</label>
        <input type="date" id="act-date" class="form-control" value="${initialDate}" required>
      </div>

      <div class="form-group">
        <label>Hora *</label>
        <input type="time" id="act-time" class="form-control" value="${itemToEdit ? itemToEdit.time : '09:00'}" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Categoría</label>
        <select id="act-category" class="form-select">
          <option value="Transporte" ${itemToEdit && itemToEdit.category === 'Transporte' ? 'selected' : ''}>Transporte</option>
          <option value="Comida" ${itemToEdit && itemToEdit.category === 'Comida' ? 'selected' : ''}>Comida</option>
          <option value="Turismo" ${!itemToEdit || itemToEdit.category === 'Turismo' ? 'selected' : ''}>Turismo</option>
          <option value="Compras" ${itemToEdit && itemToEdit.category === 'Compras' ? 'selected' : ''}>Compras</option>
          <option value="Hotel" ${itemToEdit && itemToEdit.category === 'Hotel' ? 'selected' : ''}>Hotel</option>
          <option value="Trabajo" ${itemToEdit && itemToEdit.category === 'Trabajo' ? 'selected' : ''}>Trabajo</option>
          <option value="Tiempo libre" ${itemToEdit && itemToEdit.category === 'Tiempo libre' ? 'selected' : ''}>Tiempo libre</option>
          <option value="Otros" ${itemToEdit && itemToEdit.category === 'Otros' ? 'selected' : ''}>Otros</option>
        </select>
      </div>

      <div class="form-group">
        <label>Estado</label>
        <select id="act-status" class="form-select">
          <option value="Pendiente" ${!itemToEdit || itemToEdit.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="En progreso" ${itemToEdit && itemToEdit.status === 'En progreso' ? 'selected' : ''}>En progreso</option>
          <option value="Completado" ${itemToEdit && itemToEdit.status === 'Completado' ? 'selected' : ''}>Completado</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Lugar</label>
        <input type="text" id="act-location" class="form-control" value="${itemToEdit ? itemToEdit.location || '' : ''}" placeholder="Ej: Antigua Guatemala">
      </div>

      <div class="form-group">
        <label>Costo Estimado (${trip.mainCurrency})</label>
        <input type="number" step="0.01" id="act-cost" class="form-control" value="${itemToEdit ? itemToEdit.cost || '' : ''}" placeholder="0.00">
      </div>
    </div>

    <div class="form-group">
      <label>Dirección (Opcional)</label>
      <input type="text" id="act-address" class="form-control" value="${itemToEdit ? itemToEdit.address || '' : ''}" placeholder="Ej: 5ta Avenida Norte #12">
    </div>

    <div class="form-group">
      <label>Notas / Detalles</label>
      <textarea id="act-notes" class="form-control" rows="2" placeholder="Recordatorios, qué llevar, etc.">${itemToEdit ? itemToEdit.notes || '' : ''}</textarea>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon(isEdit ? 'edit' : 'plus', { size: 20, color: 'var(--primary-cyan)' })} ${isEdit ? 'Editar Actividad' : 'Nueva Actividad'}</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const title = document.getElementById('act-title').value.trim();
    const date = document.getElementById('act-date').value;
    const time = document.getElementById('act-time').value;
    const category = document.getElementById('act-category').value;
    const status = document.getElementById('act-status').value;
    const location = document.getElementById('act-location').value.trim();
    const address = document.getElementById('act-address').value.trim();
    const cost = parseFloat(document.getElementById('act-cost').value) || 0;
    const notes = document.getElementById('act-notes').value.trim();

    if (!title || !date || !time) {
      alert('Por favor indica título, fecha y hora.');
      return false;
    }

    const activityData = {
      ...(itemToEdit || {}),
      tripId: trip.id,
      title,
      date,
      time,
      category,
      status,
      location,
      address,
      cost,
      notes
    };

    await saveItem('itinerary', activityData);
    showToast(isEdit ? 'Actividad actualizada' : 'Actividad agregada');
    refreshView();
    return true;
  });
}

