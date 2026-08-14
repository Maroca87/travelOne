/**
 * Travel Journal View (Personal Memories & Diary)
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatDate, fileToDataURL, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';

export async function renderJournalView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const journalEntries = await getAllFromStore('journal', trip.id);
  journalEntries.sort((a, b) => b.date.localeCompare(a.date));

  const listHTML = journalEntries.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">📖</div>
      <h3>Tu diario personal está vacío</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Escribe recuerdos, anécdotas e impresiones de tu viaje para conservar la memoria de tus momentos favoritos.</p>
      <button class="btn btn-primary" id="btn-add-journal-empty">+ Escribir Entrada</button>
    </div>
  ` : `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      ${journalEntries.map(entry => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <span style="font-size: 0.85rem; color: var(--primary-cyan); font-weight: 600;">📆 ${formatDate(entry.date)}</span>
              ${entry.location ? `<span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 0.5rem;">📍 ${entry.location}</span>` : ''}
            </div>
            <button class="btn btn-danger btn-sm btn-delete-journal" data-id="${entry.id}">🗑️</button>
          </div>

          <h3 style="font-size: 1.3rem; margin-bottom: 0.75rem; color: #ffffff;">${entry.title}</h3>

          <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.6; white-space: pre-line; margin-bottom: 1rem;">
            ${entry.text}
          </p>

          ${entry.photo ? `
            <div style="margin-top: 0.75rem;">
              <img src="${entry.photo}" class="file-preview-img" style="max-height: 250px; border-radius: var(--radius-md); object-fit: cover;">
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Diario del Viaje</h1>
        <div class="page-subtitle">Tus memorias, impresiones y momentos inolvidables en ${trip.destination}</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-journal">+ Escribir Entrada</button>
      </div>
    </div>

    ${listHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-add-journal')?.addEventListener('click', () => openJournalModal(trip, refreshView));
    container.querySelector('#btn-add-journal-empty')?.addEventListener('click', () => openJournalModal(trip, refreshView));

    container.querySelectorAll('.btn-delete-journal').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar esta entrada de tu diario?')) {
          await deleteItem('journal', id);
          showToast('Entrada eliminada');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openJournalModal(trip, refreshView) {
  let photoData = null;

  const bodyHTML = `
    <div class="form-group">
      <label>Título de la Entrada *</label>
      <input type="text" id="jnl-title" class="form-control" placeholder="Ej: ¡Hoy visitamos Antigua Guatemala!" required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Fecha *</label>
        <input type="date" id="jnl-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
      </div>

      <div class="form-group">
        <label>Lugar / Ubicación</label>
        <input type="text" id="jnl-location" class="form-control" placeholder="Ej: Calle del Arco, Antigua">
      </div>
    </div>

    <div class="form-group">
      <label>Historia / Texto de la memoria *</label>
      <textarea id="jnl-text" class="form-control" rows="5" placeholder="¿Qué descubriste hoy? ¿Cómo estuvo el clima? ¿Qué sentiste?" required></textarea>
    </div>

    <div class="form-group">
      <label>Adjuntar Foto de Recuerdo</label>
      <input type="file" id="jnl-photo" class="form-control" accept="image/*">
    </div>
  `;

  openModal('📖 Escribir en el Diario', bodyHTML, async () => {
    const title = document.getElementById('jnl-title').value.trim();
    const date = document.getElementById('jnl-date').value;
    const location = document.getElementById('jnl-location').value.trim();
    const text = document.getElementById('jnl-text').value.trim();
    const photoInput = document.getElementById('jnl-photo');

    if (!title || !text || !date) {
      alert('Por favor especifica título, fecha y texto.');
      return false;
    }

    if (photoInput && photoInput.files[0]) {
      photoData = await fileToDataURL(photoInput.files[0]);
    }

    const journalData = {
      tripId: trip.id,
      title,
      date,
      location,
      text,
      photo: photoData
    };

    await saveItem('journal', journalData);
    showToast('Entrada guardada en el diario');
    refreshView();
    return true;
  });
}
