/**
 * Contacts View (Trip Emergency Directory)
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

export async function renderContactsView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const contacts = await getAllFromStore('contacts', trip.id);

  const listHTML = contacts.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
        ${renderIcon('contacts', { size: 48, color: 'var(--primary-cyan)' })}
      </div>
      <h3>Directorio de contactos vacío</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Guarda teléfonos de tu hotel, guías de tour, emergencias o acompañantes.</p>
      <button class="btn btn-primary" id="btn-add-contact-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        ${renderIcon('plus', { size: 16, color: '#0b1326' })}
        <span>Agregar Contacto</span>
      </button>
    </div>
  ` : `
    <div class="grid-2">
      ${contacts.map(c => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="icon-badge-box" style="width: 32px; height: 32px;">
                ${renderIcon('user', { size: 16, color: 'var(--primary-cyan)' })}
              </div>
              <h3 style="font-size: 1.15rem; margin: 0;">${c.name}</h3>
            </div>
            <span class="badge badge-tourism">${c.type || 'Contacto'}</span>
          </div>

          <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 0.75rem;">
            ${c.phone ? `
              <div style="margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
                ${renderIcon('phone', { size: 13, color: 'var(--primary-cyan)' })}
                <span><strong>Tel:</strong> <a href="tel:${c.phone}" style="color: var(--primary-cyan); text-decoration: none;">${c.phone}</a></span>
              </div>
            ` : ''}
            ${c.email ? `
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                ${renderIcon('mail', { size: 13, color: 'var(--primary-cyan)' })}
                <span><strong>Email:</strong> <a href="mailto:${c.email}" style="color: var(--primary-cyan); text-decoration: none;">${c.email}</a></span>
              </div>
            ` : ''}
          </div>

          ${c.notes ? `
            <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.75rem; display: flex; align-items: flex-start; gap: 0.35rem;">
              ${renderIcon('notes', { size: 13, color: 'var(--text-muted)' })}
              <span>${c.notes}</span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
            <button class="btn btn-secondary btn-sm btn-edit-contact" data-id="${c.id}" style="display: inline-flex; align-items: center; gap: 0.3rem;">
              ${renderIcon('edit', { size: 13 })} Editar
            </button>
            <button class="btn btn-danger btn-sm btn-delete-contact" data-id="${c.id}" title="Eliminar">
              ${renderIcon('trash', { size: 13 })}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Contactos del Viaje</h1>
        <div class="page-subtitle">Directorio telefónico y correos de hoteles, tours y emergencias</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-contact" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Contacto</span>
        </button>
      </div>
    </div>

    ${listHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-add-contact')?.addEventListener('click', () => openContactModal(trip, null, refreshView));
    container.querySelector('#btn-add-contact-empty')?.addEventListener('click', () => openContactModal(trip, null, refreshView));

    container.querySelectorAll('.btn-edit-contact').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = contacts.find(c => c.id === id);
        if (item) openContactModal(trip, item, refreshView);
      });
    });

    container.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar este contacto?')) {
          await deleteItem('contacts', id);
          showToast('Contacto eliminado');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openContactModal(trip, itemToEdit, refreshView) {
  const isEdit = !!itemToEdit;

  const bodyHTML = `
    <div class="form-group">
      <label>Nombre del Contacto / Entidad *</label>
      <input type="text" id="cnt-name" class="form-control" value="${itemToEdit ? itemToEdit.name : ''}" placeholder="Ej: Porta Hotel Antigua, Guía Carlos..." required>
    </div>

    <div class="form-group">
      <label>Tipo / Categoría</label>
      <select id="cnt-type" class="form-select">
        <option value="Hotel" ${!itemToEdit || itemToEdit.type === 'Hotel' ? 'selected' : ''}>Hotel / Alojamiento</option>
        <option value="Transporte" ${itemToEdit && itemToEdit.type === 'Transporte' ? 'selected' : ''}>Transporte</option>
        <option value="Tours" ${itemToEdit && itemToEdit.type === 'Tours' ? 'selected' : ''}>Tours / Guía</option>
        <option value="Restaurantes" ${itemToEdit && itemToEdit.type === 'Restaurantes' ? 'selected' : ''}>Restaurante</option>
        <option value="Acompañante" ${itemToEdit && itemToEdit.type === 'Acompañante' ? 'selected' : ''}>Acompañante del Viaje</option>
        <option value="Emergencia" ${itemToEdit && itemToEdit.type === 'Emergencia' ? 'selected' : ''}>Contacto de Emergencia</option>
        <option value="Otros" ${itemToEdit && itemToEdit.type === 'Otros' ? 'selected' : ''}>Otros</option>
      </select>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Teléfono</label>
        <input type="tel" id="cnt-phone" class="form-control" value="${itemToEdit ? itemToEdit.phone || '' : ''}" placeholder="+502 5555 1234">
      </div>

      <div class="form-group">
        <label>Email</label>
        <input type="email" id="cnt-email" class="form-control" value="${itemToEdit ? itemToEdit.email || '' : ''}" placeholder="contacto@ejemplo.com">
      </div>
    </div>

    <div class="form-group">
      <label>Notas</label>
      <input type="text" id="cnt-notes" class="form-control" value="${itemToEdit ? itemToEdit.notes || '' : ''}" placeholder="Horarios de atención, persona de contacto...">
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon(isEdit ? 'edit' : 'plus', { size: 20, color: 'var(--primary-cyan)' })} ${isEdit ? 'Editar Contacto' : 'Agregar Contacto'}</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const name = document.getElementById('cnt-name').value.trim();
    const type = document.getElementById('cnt-type').value;
    const phone = document.getElementById('cnt-phone').value.trim();
    const email = document.getElementById('cnt-email').value.trim();
    const notes = document.getElementById('cnt-notes').value.trim();

    if (!name) {
      alert('Por favor especifica el nombre del contacto.');
      return false;
    }

    const contactData = {
      ...(itemToEdit || {}),
      tripId: trip.id,
      name,
      type,
      phone,
      email,
      notes
    };

    await saveItem('contacts', contactData);
    showToast(isEdit ? 'Contacto actualizado' : 'Contacto guardado');
    refreshView();
    return true;
  });
}

