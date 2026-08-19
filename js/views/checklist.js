/**
 * TravelOne 4-Phase Checklist & Packing View
 * Organizes tasks across four essential travel phases (Before Trip, Packing, During Trip, Return) with live progress tracking.
 * 
 * @module js/views/checklist
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the 4-phase packing and preparation checklist view.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to refresh view after updates
 * @returns {Promise<HTMLElement>} The checklist view DOM container
 */
export async function renderChecklistView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const checklists = await getAllFromStore('checklists', trip.id);

  const totalItems = checklists.length;
  const completedItems = checklists.filter(c => c.completed).length;
  const overallPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const groups = ['Antes del viaje', 'Equipaje', 'Durante el viaje', 'Regreso'];

  const getGroupIconName = (groupName) => {
    switch (groupName) {
      case 'Antes del viaje': return 'plane';
      case 'Equipaje': return 'shopping';
      case 'Durante el viaje': return 'compass';
      case 'Regreso': return 'home';
      default: return 'checklist';
    }
  };

  const groupsHTML = groups.map(groupName => {
    const groupItems = checklists.filter(c => c.group === groupName);
    const groupDone = groupItems.filter(c => c.completed).length;
    const groupPct = groupItems.length > 0 ? Math.round((groupDone / groupItems.length) * 100) : 0;

    return `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div class="icon-badge-box" style="width: 32px; height: 32px;">
              ${renderIcon(getGroupIconName(groupName), { size: 16, color: 'var(--primary-cyan)' })}
            </div>
            <h3 style="font-size: 1.15rem; margin: 0;">${groupName}</h3>
          </div>
          <span style="font-size: 0.85rem; color: var(--text-muted);">${groupDone} de ${groupItems.length} (${groupPct}%)</span>
        </div>

        <div class="progress-container" style="height: 6px; margin-bottom: 1rem;">
          <div class="progress-bar" style="width: ${groupPct}%;"></div>
        </div>

        <div>
          ${groupItems.map(item => `
            <div class="checklist-row ${item.completed ? 'completed' : ''}">
              <input type="checkbox" class="chk-item-toggle" data-id="${item.id}" ${item.completed ? 'checked' : ''}>
              <label style="flex: 1; font-size: 0.9rem; cursor: pointer;">${item.item}</label>
              <button class="btn btn-danger btn-sm btn-delete-checklist" data-id="${item.id}" title="Eliminar" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">
                ${renderIcon('trash', { size: 12 })}
              </button>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 0.75rem;">
          <button class="btn btn-secondary btn-sm btn-add-checklist-item" data-group="${groupName}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            ${renderIcon('plus', { size: 13 })} Añadir a ${groupName}
          </button>
        </div>
      </div>
    `;
  }).join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Listas de Control & Equipaje</h1>
        <div class="page-subtitle">Checklists organizadas para antes, durante y después del viaje</div>
      </div>
    </div>

    <!-- Overall Progress -->
    <div class="card" style="margin-bottom: 1.5rem; text-align: center;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('checklist', { size: 18, color: 'var(--primary-cyan)' })}
          <span>Progreso General del Equipaje & Tareas</span>
        </h3>
        <span style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 700; color: var(--primary-cyan);">${overallPercent}%</span>
      </div>
      <div class="progress-container" style="height: 12px;">
        <div class="progress-bar" style="width: ${overallPercent}%;"></div>
      </div>
    </div>

    ${groupsHTML}
  `;

  setTimeout(() => {
    container.querySelectorAll('.chk-item-toggle').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = parseInt(chk.getAttribute('data-id'));
        const item = checklists.find(c => c.id === id);
        if (item) {
          item.completed = chk.checked;
          await saveItem('checklists', item);
          refreshView();
        }
      });
    });

    container.querySelectorAll('.btn-delete-checklist').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        await deleteItem('checklists', id);
        showToast('Elemento eliminado');
        refreshView();
      });
    });

    container.querySelectorAll('.btn-add-checklist-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.getAttribute('data-group');
        openAddChecklistItemModal(trip, group, refreshView);
      });
    });
  }, 50);

  return container;
}

function openAddChecklistItemModal(trip, groupName, refreshView) {
  const bodyHTML = `
    <div class="form-group">
      <label>Sección / Grupo</label>
      <input type="text" class="form-control" value="${groupName}" disabled>
    </div>

    <div class="form-group">
      <label>Nombre del Elemento / Tarea *</label>
      <input type="text" id="chk-input-name" class="form-control" placeholder="Ej: Pasaporte, Bloqueador, Power Bank..." required>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('plus', { size: 18, color: 'var(--primary-cyan)' })} Añadir a ${groupName}</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const itemText = document.getElementById('chk-input-name').value.trim();
    if (!itemText) {
      alert('Ingresa la descripción del elemento.');
      return false;
    }

    const newItem = {
      tripId: trip.id,
      group: groupName,
      item: itemText,
      completed: false
    };

    await saveItem('checklists', newItem);
    showToast('Elemento añadido');
    refreshView();
    return true;
  });
}

