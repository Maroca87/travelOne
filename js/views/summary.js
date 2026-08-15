/**
 * Trip Summary & Backup Export View (XML Support)
 */

import { getAllFromStore, exportTripsXML } from '../db.js';
import { formatDate, calculateDuration, formatMoney, showToast } from '../utils.js';

export async function renderSummaryView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const itinerary = await getAllFromStore('itinerary', trip.id);
  const reservations = await getAllFromStore('reservations', trip.id);
  const expenses = await getAllFromStore('expenses', trip.id);
  const places = await getAllFromStore('places', trip.id);
  const shopping = await getAllFromStore('shopping', trip.id);
  const checklists = await getAllFromStore('checklists', trip.id);

  const duration = calculateDuration(trip.startDate, trip.endDate);
  const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const budget = parseFloat(trip.budget) || 0;

  const visitedPlacesCount = places.filter(p => p.visited).length;
  const completedChecklistCount = checklists.filter(c => c.completed).length;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Resumen General del Viaje</h1>
        <div class="page-subtitle">Vista consolidada e imprimible de todas las secciones de tu viaje</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-export-xml">💾 Respaldo XML</button>
        <button class="btn btn-primary" id="btn-print-summary">🖨️ Imprimir / Guardar PDF</button>
      </div>
    </div>

    <!-- Main Overview Header Card -->
    <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(0, 242, 254, 0.1), rgba(79, 172, 254, 0.05)); border: 1px solid rgba(0, 242, 254, 0.25);">
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
        <span style="font-size: 2.5rem;">${trip.coverEmoji || '✈️'}</span>
        <div>
          <h2 style="font-size: 1.6rem; color: #ffffff;">${trip.name}</h2>
          <div style="color: var(--primary-cyan); font-weight: 600;">📍 ${trip.destination}</div>
        </div>
      </div>

      <div class="grid-3" style="margin-top: 1rem; background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Fechas</div>
          <div style="font-weight: 700; color: #ffffff;">${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Duración</div>
          <div style="font-weight: 700; color: var(--primary-cyan);">${duration} Días</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto vs Gastado</div>
          <div style="font-weight: 700; color: var(--accent-amber);">${formatMoney(totalSpent, trip.mainCurrency)} / ${formatMoney(budget, trip.mainCurrency)}</div>
        </div>
      </div>
    </div>

    <!-- Metrics Breakdown Grid -->
    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="metric-card">
        <div class="metric-icon">📅</div>
        <div class="metric-data">
          <div class="label">Itinerario</div>
          <div class="value">${itinerary.length} actividades</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon" style="background: rgba(246, 211, 101, 0.12); color: var(--accent-amber);">🏨</div>
        <div class="metric-data">
          <div class="label">Reservas</div>
          <div class="value">${reservations.length} confirmadas</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon" style="background: rgba(0, 242, 96, 0.12); color: #00f260;">📍</div>
        <div class="metric-data">
          <div class="label">Lugares Visitados</div>
          <div class="value">${visitedPlacesCount} de ${places.length}</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon" style="background: rgba(161, 140, 209, 0.12); color: var(--accent-purple);">✅</div>
        <div class="metric-data">
          <div class="label">Checklist</div>
          <div class="value">${completedChecklistCount} de ${checklists.length}</div>
        </div>
      </div>
    </div>

    <!-- Quick Highlights -->
    <div class="grid-2" style="margin-bottom: 1.5rem;">
      <!-- Itinerary Preview Card -->
      <div class="card">
        <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: var(--primary-cyan);">📅 Resumen de Actividades Clave</h3>
        ${itinerary.slice(0, 5).map(a => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">
            <div>⏰ ${a.time} - <strong>${a.title}</strong> (${a.location || ''})</div>
            <div style="color: var(--text-muted);">${formatDate(a.date)}</div>
          </div>
        `).join('')}
        ${itinerary.length > 5 ? `<div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.5rem;">+ ${itinerary.length - 5} actividades más...</div>` : ''}
      </div>

      <!-- Reservations Preview Card -->
      <div class="card">
        <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: var(--accent-amber);">🏨 Confirmaciones de Reserva</h3>
        ${reservations.slice(0, 5).map(r => `
          <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">
            <div><strong>${r.name}</strong> (${r.type})</div>
            <div style="color: var(--primary-cyan);">Conf: #${r.confirmationNo || 'S/N'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  setTimeout(() => {
    container.querySelector('#btn-print-summary')?.addEventListener('click', () => {
      window.print();
    });

    container.querySelector('#btn-export-xml')?.addEventListener('click', async () => {
      try {
        const xmlStr = await exportTripsXML(trip.id);
        const blob = new Blob([xmlStr], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TravelOne_Respaldo_${trip.name.replace(/\s+/g, '_')}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Respaldo XML descargado');
      } catch (err) {
        alert('Error al exportar XML: ' + err.message);
      }
    });
  }, 50);

  return container;
}
