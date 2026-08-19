/**
 * Reservations View (Hotels, Flights, Tours, Rentals)
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatDate, formatMoney, fileToDataURL, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

export async function renderReservationsView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const reservations = await getAllFromStore('reservations', trip.id);
  reservations.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const listHTML = reservations.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
        ${renderIcon('hotel', { size: 48, color: 'var(--accent-amber)' })}
      </div>
      <h3>No hay reservas guardadas</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Guarda las confirmaciones de tu hotel, vuelos, transporte o tours.</p>
      <button class="btn btn-primary" id="btn-add-res-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        ${renderIcon('plus', { size: 16, color: '#0b1326' })}
        <span>Registrar Reserva</span>
      </button>
    </div>
  ` : `
    <div class="grid-2">
      ${reservations.map(res => {
        let typeIconName = 'hotel';
        if (res.type === 'Vuelo') typeIconName = 'plane';
        else if (res.type === 'Autobús') typeIconName = 'bus';
        else if (res.type === 'Restaurante') typeIconName = 'utensils';
        else if (res.type === 'Tour') typeIconName = 'ship';
        else if (res.type === 'Alquiler de vehículo') typeIconName = 'car';

        return `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="icon-badge-box icon-badge-amber">
                  ${renderIcon(typeIconName, { size: 18, color: 'var(--accent-amber)' })}
                </div>
                <span class="badge badge-tourism">${res.type}</span>
              </div>
              <div style="font-family: 'Outfit', sans-serif; font-weight: 700; color: var(--accent-amber); font-size: 1.1rem;">
                ${formatMoney(res.price, trip.mainCurrency)}
              </div>
            </div>

            <h3 style="font-size: 1.2rem; margin-bottom: 0.25rem;">${res.name}</h3>
            <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
              <span class="icon-inline">${renderIcon('calendar', { size: 13, color: 'var(--primary-cyan)' })} ${formatDate(res.date)}</span>
              ${res.time ? `<span class="icon-inline">${renderIcon('clock', { size: 13 })} ${res.time}</span>` : ''}
            </div>

            <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                ${renderIcon('key', { size: 13, color: 'var(--accent-amber)' })}
                <span><strong>Conf:</strong> ${res.confirmationNo || 'Sin número registrado'}</span>
              </div>
              ${res.address ? `
                <div style="margin-top: 0.3rem; display: flex; align-items: center; gap: 0.35rem;">
                  ${renderIcon('map-pin', { size: 13, color: 'var(--primary-cyan)' })}
                  <span>${res.address}</span>
                </div>
              ` : ''}
              ${res.contact ? `
                <div style="margin-top: 0.3rem; display: flex; align-items: center; gap: 0.35rem;">
                  ${renderIcon('phone', { size: 13, color: 'var(--primary-cyan)' })}
                  <span>${res.contact}</span>
                </div>
              ` : ''}
            </div>

            ${res.notes ? `
              <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.75rem; display: flex; align-items: flex-start; gap: 0.35rem;">
                ${renderIcon('notes', { size: 13, color: 'var(--text-muted)' })}
                <span>${res.notes}</span>
              </div>
            ` : ''}

            ${res.attachment ? `
              <div style="margin-bottom: 0.75rem;">
                ${res.attachment.startsWith('data:image') ? `
                  <img src="${res.attachment}" class="file-preview-img" style="width: 100%; max-height: 160px; object-fit: cover;">
                ` : `
                  <a href="${res.attachment}" download="Reserva_${res.name}.pdf" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    ${renderIcon('download', { size: 14 })} Descargar Adjunto
                  </a>
                `}
              </div>
            ` : ''}

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
              <button class="btn btn-secondary btn-sm btn-edit-res" data-id="${res.id}" style="display: inline-flex; align-items: center; gap: 0.3rem;">
                ${renderIcon('edit', { size: 13 })} Editar
              </button>
              <button class="btn btn-danger btn-sm btn-delete-res" data-id="${res.id}" title="Eliminar">
                ${renderIcon('trash', { size: 13 })}
              </button>
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
        <h1>Reservaciones</h1>
        <div class="page-subtitle">Hoteles, vuelos, autobuses, tours y alquileres confirmados</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-res" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Nueva Reserva</span>
        </button>
      </div>
    </div>

    ${listHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-add-res')?.addEventListener('click', () => openReservationModal(trip, null, refreshView));
    container.querySelector('#btn-add-res-empty')?.addEventListener('click', () => openReservationModal(trip, null, refreshView));

    container.querySelectorAll('.btn-edit-res').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = reservations.find(r => r.id === id);
        if (item) openReservationModal(trip, item, refreshView);
      });
    });

    container.querySelectorAll('.btn-delete-res').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar esta reserva?')) {
          await deleteItem('reservations', id);
          showToast('Reserva eliminada');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openReservationModal(trip, itemToEdit, refreshView) {
  const isEdit = !!itemToEdit;
  let attachmentData = itemToEdit ? itemToEdit.attachment : null;

  const bodyHTML = `
    <div class="form-group">
      <label>Tipo de Reserva *</label>
      <select id="res-type" class="form-select">
        <option value="Hotel" ${!itemToEdit || itemToEdit.type === 'Hotel' ? 'selected' : ''}>Hotel / Alojamiento</option>
        <option value="Vuelo" ${itemToEdit && itemToEdit.type === 'Vuelo' ? 'selected' : ''}>Vuelo</option>
        <option value="Autobús" ${itemToEdit && itemToEdit.type === 'Autobús' ? 'selected' : ''}>Autobús / Shuttle</option>
        <option value="Restaurante" ${itemToEdit && itemToEdit.type === 'Restaurante' ? 'selected' : ''}>Restaurante</option>
        <option value="Tour" ${itemToEdit && itemToEdit.type === 'Tour' ? 'selected' : ''}>Tour / Excursión</option>
        <option value="Alquiler de vehículo" ${itemToEdit && itemToEdit.type === 'Alquiler de vehículo' ? 'selected' : ''}>Alquiler de Vehículo</option>
        <option value="Otra reserva" ${itemToEdit && itemToEdit.type === 'Otra reserva' ? 'selected' : ''}>Otra Reserva</option>
      </select>
    </div>

    <div class="form-group">
      <label>Nombre del Proveedor / Servicio *</label>
      <input type="text" id="res-name" class="form-control" value="${itemToEdit ? itemToEdit.name : ''}" placeholder="Ej: Porta Hotel Antigua, Avianca..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Fecha *</label>
        <input type="date" id="res-date" class="form-control" value="${itemToEdit ? itemToEdit.date : trip.startDate}" required>
      </div>

      <div class="form-group">
        <label>Hora</label>
        <input type="time" id="res-time" class="form-control" value="${itemToEdit ? itemToEdit.time || '' : ''}">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Número de Reserva / Confirmación</label>
        <input type="text" id="res-conf" class="form-control" value="${itemToEdit ? itemToEdit.confirmationNo || '' : ''}" placeholder="Ej: HTL-8829">
      </div>

      <div class="form-group">
        <label>Precio Total (${trip.mainCurrency})</label>
        <input type="number" step="0.01" id="res-price" class="form-control" value="${itemToEdit ? itemToEdit.price || '' : ''}" placeholder="0.00">
      </div>
    </div>

    <div class="form-group">
      <label>Dirección / Ubicación</label>
      <input type="text" id="res-address" class="form-control" value="${itemToEdit ? itemToEdit.address || '' : ''}" placeholder="Ej: 8va Calle Poniente No. 1">
    </div>

    <div class="form-group">
      <label>Teléfono o Email de Contacto</label>
      <input type="text" id="res-contact" class="form-control" value="${itemToEdit ? itemToEdit.contact || '' : ''}" placeholder="Ej: +502 7931 0600">
    </div>

    <div class="form-group">
      <label>Adjuntar Comprobante o Imagen (Local)</label>
      <input type="file" id="res-file" class="form-control" accept="image/*,.pdf">
      <div id="res-file-info" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">
        ${attachmentData ? 'Archivo adjunto guardado en dispositivo' : ''}
      </div>
    </div>

    <div class="form-group">
      <label>Notas Adicionales</label>
      <textarea id="res-notes" class="form-control" rows="2" placeholder="Detalles de check-in, políticas de cancelación, etc.">${itemToEdit ? itemToEdit.notes || '' : ''}</textarea>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon(isEdit ? 'edit' : 'plus', { size: 20, color: 'var(--primary-cyan)' })} ${isEdit ? 'Editar Reserva' : 'Nueva Reserva'}</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const type = document.getElementById('res-type').value;
    const name = document.getElementById('res-name').value.trim();
    const date = document.getElementById('res-date').value;
    const time = document.getElementById('res-time').value;
    const confirmationNo = document.getElementById('res-conf').value.trim();
    const price = parseFloat(document.getElementById('res-price').value) || 0;
    const address = document.getElementById('res-address').value.trim();
    const contact = document.getElementById('res-contact').value.trim();
    const notes = document.getElementById('res-notes').value.trim();
    const fileInput = document.getElementById('res-file');

    if (!name || !date) {
      alert('Por favor indica nombre y fecha de reserva.');
      return false;
    }

    if (fileInput && fileInput.files[0]) {
      attachmentData = await fileToDataURL(fileInput.files[0]);
    }

    const resData = {
      ...(itemToEdit || {}),
      tripId: trip.id,
      type,
      name,
      date,
      time,
      confirmationNo,
      price,
      address,
      contact,
      notes,
      attachment: attachmentData
    };

    await saveItem('reservations', resData);
    showToast(isEdit ? 'Reserva actualizada' : 'Reserva guardada');
    refreshView();
    return true;
  });
}

