/**
 * Checklist View (4-Phase Prep & Packing Checklists)
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { showToast } from '../utils.js';
import { openModal } from '../components/modal.js';

export async function renderChecklistView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const checklists = await getAllFromStore('checklists', trip.id);

  const totalItems = checklists.length;
  const completedItems = checklists.filter(c => c.completed).length;
  const overallPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const groups = ['Antes del viaje', 'Equipaje', 'Durante el viaje', 'Regreso'];

  const groupsHTML = groups.map(groupName => {
    const groupItems = checklists.filter(c => c.group === groupName);
    const groupDone = groupItems.filter(c => c.completed).length;
    const groupPct = groupItems.length > 0 ? Math.round((groupDone / groupItems.length) * 100) : 0;

    let groupIcon = '📋';
    if (groupName === 'Antes del viaje') groupIcon = '✈️';
    else if (groupName === 'Equipaje') groupIcon = '🧳';
    else if (groupName === 'Durante el viaje') groupIcon = '🗺️';
    else if (groupName === 'Regreso') groupIcon = '🏠';

    return `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.35rem;">${groupIcon}</span>
            <h3 style="font-size: 1.15rem;">${groupName}</h3>
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
              <button class="btn btn-danger btn-sm btn-delete-checklist" data-id="${item.id}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">✕</button>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 0.75rem;">
          <button class="btn btn-secondary btn-sm btn-add-checklist-item" data-group="${groupName}">+ Añadir a ${groupName}</button>
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
        <h3 style="font-size: 1.1rem;">Progreso General del Equipaje & Tareas</h3>
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

  openModal(`➕ Añadir a ${groupName}`, bodyHTML, async () => {
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
