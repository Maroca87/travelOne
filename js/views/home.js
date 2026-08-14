/**
 * Home View ("Mis Viajes")
 */

import { getAllFromStore, saveItem, deleteTripAndData, importTripJSON } from '../db.js';
import { formatDate, calculateDaysLeft, calculateDuration, formatMoney, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';

export async function renderHomeView(onSelectTrip) {
  const trips = await getAllFromStore('trips');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'en_curso': return `<span class="status-badge status-in-progress">⚡ En curso</span>`;
      case 'planificando': return `<span class="status-badge status-pending">📋 Planificando</span>`;
      case 'finalizado': return `<span class="status-badge status-completed">✅ Finalizado</span>`;
      default: return '';
    }
  };

  const tripsListHTML = trips.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">✈️</div>
      <h3>¡No tienes viajes registrados aún!</h3>
      <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Crea tu primer viaje para organizar tu itinerario, gastos, reservas y más.</p>
      <button class="btn btn-primary" id="btn-create-first-trip">+ Crear mi primer viaje</button>
    </div>
  ` : trips.map(trip => {
    const daysLeft = calculateDaysLeft(trip.startDate);
    const duration = calculateDuration(trip.startDate, trip.endDate);
    
    let countdownText = '';
    if (trip.status === 'en_curso') {
      countdownText = `<span style="color: var(--accent-amber); font-weight: 700;">¡En curso ahora!</span>`;
    } else if (daysLeft > 0) {
      countdownText = `<span style="color: var(--primary-cyan); font-weight: 700;">⏳ Faltan ${daysLeft} días</span>`;
    } else if (daysLeft === 0) {
      countdownText = `<span style="color: var(--accent-amber); font-weight: 700;">🎉 ¡Empieza hoy!</span>`;
    } else {
      countdownText = `<span style="color: var(--text-dim);">Viaje concluido</span>`;
    }

    return `
      <div class="card card-interactive trip-card" data-id="${trip.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <span style="font-size: 2rem;">${trip.coverEmoji || '✈️'}</span>
          <div>${getStatusBadge(trip.status)}</div>
        </div>

        <h3 style="font-size: 1.35rem; margin-bottom: 0.25rem;">${trip.name}</h3>
        <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem;">📍 ${trip.destination}</div>

        <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-md);">
          <div>📅 ${formatDate(trip.startDate)} — ${formatDate(trip.endDate)} (${duration} días)</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto</div>
            <div style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #ffffff;">${formatMoney(trip.budget, trip.mainCurrency || 'Q')}</div>
          </div>
          <div>${countdownText}</div>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-primary btn-sm btn-open-trip" data-id="${trip.id}" style="flex: 1;">Abrir Viaje</button>
          <button class="btn btn-danger btn-sm btn-delete-trip" data-id="${trip.id}" title="Eliminar viaje">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Mis Viajes</h1>
        <div class="page-subtitle">Organiza tus aventuras personales de forma local y sencilla</div>
      </div>
      <div class="header-actions">
        <label class="btn btn-secondary" style="cursor: pointer;">
          📥 Importar JSON
          <input type="file" id="input-import-json" accept=".json" style="display: none;">
        </label>
        <button class="btn btn-primary" id="btn-add-trip">+ Nuevo Viaje</button>
      </div>
    </div>

    <div class="grid-3" style="margin-top: 1.5rem;">
      ${tripsListHTML}
    </div>
  `;

  // Attach Event Handlers
  setTimeout(() => {
    container.querySelectorAll('.btn-open-trip, .trip-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-trip')) return;
        const tripId = el.getAttribute('data-id');
        onSelectTrip(tripId);
      });
    });

    container.querySelector('#btn-add-trip')?.addEventListener('click', () => openNewTripModal(onSelectTrip));
    container.querySelector('#btn-create-first-trip')?.addEventListener('click', () => openNewTripModal(onSelectTrip));

    // Delete trip listener
    container.querySelectorAll('.btn-delete-trip').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        if (confirm('¿Estás seguro de eliminar este viaje y toda su información local?')) {
          await deleteTripAndData(tripId);
          showToast('Viaje eliminado', 'info');
          onSelectTrip(null);
        }
      });
    });

    // Import JSON listener
    container.querySelector('#input-import-json')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const importedTrip = await importTripJSON(json);
        showToast(`Viaje "${importedTrip.name}" importado exitosamente`);
        onSelectTrip(importedTrip.id);
      } catch (err) {
        alert('Error al importar el archivo JSON: ' + err.message);
      }
    });
  }, 50);

  return container;
}

function openNewTripModal(onSelectTrip) {
  const bodyHTML = `
    <div class="form-group">
      <label>Nombre del Viaje *</label>
      <input type="text" id="trip-name" class="form-control" placeholder="Ej: Guatemala 2026, Costa Rica..." required>
    </div>

    <div class="form-group">
      <label>Destino Principal *</label>
      <input type="text" id="trip-destination" class="form-control" placeholder="Ej: Antigua & Atitlán, San José..." required>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Fecha Inicial *</label>
        <input type="date" id="trip-start-date" class="form-control" required>
      </div>

      <div class="form-group">
        <label>Fecha Final *</label>
        <input type="date" id="trip-end-date" class="form-control" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Presupuesto Total Estimado</label>
        <input type="number" step="0.01" id="trip-budget" class="form-control" placeholder="3000">
      </div>

      <div class="form-group">
        <label>Moneda Principal</label>
        <select id="trip-currency" class="form-select">
          <option value="GTQ" selected>GTQ (Q - Quetzales)</option>
          <option value="USD">USD ($ - Dólares)</option>
          <option value="EUR">EUR (€ - Euros)</option>
          <option value="MXN">MXN ($ - Pesos MX)</option>
          <option value="CRC">CRC (₡ - Colones CR)</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Emoji del Viaje</label>
        <input type="text" id="trip-emoji" class="form-control" value="✈️" maxLength="4">
      </div>

      <div class="form-group">
        <label>Estado Inicial</label>
        <select id="trip-status" class="form-select">
          <option value="planificando" selected>Planificando</option>
          <option value="en_curso">En curso</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>
    </div>
  `;

  openModal('✨ Crear Nuevo Viaje', bodyHTML, async () => {
    const name = document.getElementById('trip-name').value.trim();
    const destination = document.getElementById('trip-destination').value.trim();
    const startDate = document.getElementById('trip-start-date').value;
    const endDate = document.getElementById('trip-end-date').value;
    const budget = parseFloat(document.getElementById('trip-budget').value) || 0;
    const mainCurrency = document.getElementById('trip-currency').value;
    const coverEmoji = document.getElementById('trip-emoji').value.trim() || '✈️';
    const status = document.getElementById('trip-status').value;

    if (!name || !destination || !startDate || !endDate) {
      alert('Por favor completa los campos obligatorios (*)');
      return false;
    }

    const newTrip = {
      id: 'trip-' + Date.now(),
      name,
      destination,
      startDate,
      endDate,
      budget,
      mainCurrency,
      secondaryCurrencies: ['USD'],
      exchangeRates: { USD: 7.70 },
      coverEmoji,
      status,
      createdAt: new Date().toISOString()
    };

    await saveItem('trips', newTrip);
    showToast(`¡Viaje "${name}" creado!`);
    onSelectTrip(newTrip.id);
    return true;
  });
}
