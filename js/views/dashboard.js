/**
 * TravelOne Trip Dashboard View
 * Displays executive trip metrics, progress bars, upcoming activities, next reservations, and module quick launch cards.
 * 
 * @module js/views/dashboard
 */

import { getAllFromStore } from '../db.js';
import { formatDate, calculateDaysLeft, calculateDuration, formatMoney } from '../utils.js';
import { renderIcon, renderAppLogoSVG } from '../icons.js';

/**
 * Render the comprehensive dashboard view for a selected trip.
 * 
 * @param {Object} trip - The active trip object
 * @param {Function} onNavigate - Navigation callback to transition between views
 * @returns {Promise<HTMLElement>} The dashboard view DOM container
 */
export async function renderDashboardView(trip, onNavigate) {
  if (!trip) return document.createElement('div');

  const itinerary = await getAllFromStore('itinerary', trip.id);
  const reservations = await getAllFromStore('reservations', trip.id);
  const expenses = await getAllFromStore('expenses', trip.id);
  const places = await getAllFromStore('places', trip.id);
  const checklists = await getAllFromStore('checklists', trip.id);

  // Calculations
  const daysLeft = calculateDaysLeft(trip.startDate);
  const duration = calculateDuration(trip.startDate, trip.endDate);

  const totalSpent = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const budget = parseFloat(trip.budget) || 0;
  const available = budget - totalSpent;
  const spentPercent = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  // Next activity
  const upcomingActivities = itinerary.filter(a => a.status !== 'Completado');
  const nextActivity = upcomingActivities.length > 0 ? upcomingActivities[0] : null;

  // Next reservation
  const nextReservation = reservations.length > 0 ? reservations[0] : null;

  // Counts
  const pendingPlacesCount = places.filter(p => !p.visited).length;
  const pendingTasksCount = checklists.filter(c => !c.completed).length;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
          <div style="display: flex; align-items: center;">
            ${renderAppLogoSVG(36)}
          </div>
          <h1>${trip.name}</h1>
        </div>

        <div class="page-subtitle" style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <span class="icon-inline">${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })} ${trip.destination}</span>
          <span>•</span>
          <span class="icon-inline">${renderIcon('calendar', { size: 14, color: 'var(--text-muted)' })} ${formatDate(trip.startDate)} al ${formatDate(trip.endDate)} (${duration} días)</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" id="btn-quick-summary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('summary', { size: 15 })}
          <span>Resumen Completo</span>
        </button>
      </div>
    </div>

    <!-- Quick Metrics Row -->
    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="metric-card">
        <div class="metric-icon">
          ${renderIcon('hourglass', { size: 24, color: 'var(--primary-cyan)' })}
        </div>
        <div class="metric-data">
          <div class="label">Días Restantes</div>
          <div class="value" style="color: var(--primary-cyan);">${daysLeft > 0 ? `${daysLeft} días` : (daysLeft === 0 ? '¡Hoy!' : 'Concluido')}</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon" style="background: rgba(246, 211, 101, 0.12); color: var(--accent-amber);">
          ${renderIcon('coins', { size: 24, color: 'var(--accent-amber)' })}
        </div>
        <div class="metric-data">
          <div class="label">Disponible</div>
          <div class="value" style="color: ${available < 0 ? 'var(--accent-rose)' : 'var(--accent-amber)'};">${formatMoney(available, trip.mainCurrency)}</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon" style="background: rgba(0, 242, 96, 0.12); color: #00f260;">
          ${renderIcon('calendar', { size: 24, color: '#00f260)' })}
        </div>
        <div class="metric-data">
          <div class="label">Actividades</div>
          <div class="value">${itinerary.length} totales</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon" style="background: rgba(161, 140, 209, 0.12); color: var(--accent-purple);">
          ${renderIcon('check-circle', { size: 24, color: 'var(--accent-purple)' })}
        </div>
        <div class="metric-data">
          <div class="label">Tareas Pendientes</div>
          <div class="value">${pendingTasksCount} items</div>
        </div>
      </div>
    </div>

    <!-- Budget Overview Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('budget', { size: 18, color: 'var(--primary-cyan)' })}
          <span>Presupuesto & Gastos</span>
        </h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${spentPercent}% consumido</span>
      </div>

      <div class="progress-container" style="height: 12px; margin-bottom: 1rem;">
        <div class="progress-bar ${spentPercent > 85 ? 'progress-rose' : (spentPercent > 65 ? 'progress-amber' : '')}" style="width: ${spentPercent}%;"></div>
      </div>

      <div class="grid-3" style="text-align: center; background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md);">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto Total</div>
          <div style="font-weight: 700; color: #ffffff;">${formatMoney(budget, trip.mainCurrency)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Total Gastado</div>
          <div style="font-weight: 700; color: var(--accent-rose);">${formatMoney(totalSpent, trip.mainCurrency)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Dinero Disponible</div>
          <div style="font-weight: 700; color: var(--accent-amber);">${formatMoney(available, trip.mainCurrency)}</div>
        </div>
      </div>
    </div>

    <!-- Next Up Grid -->
    <div class="grid-2" style="margin-bottom: 1.5rem;">
      <!-- Next Activity Card -->
      <div class="card card-interactive" id="card-next-activity">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-cyan); text-transform: uppercase;">Próxima Actividad</span>
          ${renderIcon('calendar', { size: 16, color: 'var(--primary-cyan)' })}
        </div>
        ${nextActivity ? `
          <h4 style="font-size: 1.15rem; margin-bottom: 0.25rem;">${nextActivity.title}</h4>
          <div style="color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="icon-inline">${renderIcon('clock', { size: 13 })} ${nextActivity.time}</span>
            <span class="icon-inline">${renderIcon('map-pin', { size: 13 })} ${nextActivity.location}</span>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-dim);">${nextActivity.notes || ''}</div>
        ` : `
          <div style="color: var(--text-muted); font-size: 0.9rem;">No hay actividades pendientes en el itinerario.</div>
        `}
      </div>

      <!-- Next Reservation Card -->
      <div class="card card-interactive" id="card-next-reservation">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-amber); text-transform: uppercase;">Próxima Reserva</span>
          ${renderIcon('hotel', { size: 16, color: 'var(--accent-amber)' })}
        </div>
        ${nextReservation ? `
          <h4 style="font-size: 1.15rem; margin-bottom: 0.25rem;">${nextReservation.name}</h4>
          <div style="color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="icon-inline">${renderIcon('tag', { size: 13 })} ${nextReservation.type}</span>
            <span>Conf: #${nextReservation.confirmationNo || 'S/N'}</span>
          </div>
          <div style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.35rem;">
            ${renderIcon('map-pin', { size: 12 })}
            <span>${nextReservation.address || ''}</span>
          </div>
        ` : `
          <div style="color: var(--text-muted); font-size: 0.9rem;">No hay reservas registradas aún.</div>
        `}
      </div>
    </div>

    <!-- Quick Navigation Shortcuts -->
    <h3 style="font-size: 1.1rem; margin-bottom: 1rem;">Módulos del Viaje</h3>
    <div class="grid-4">
      <div class="card card-interactive module-shortcut" data-view="itinerary" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div class="icon-badge-box">
          ${renderIcon('calendar', { size: 20, color: 'var(--primary-cyan)' })}
        </div>
        <div>
          <div style="font-weight: 700;">Itinerario</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${itinerary.length} actividades</div>
        </div>
      </div>

      <div class="card card-interactive module-shortcut" data-view="reservations" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div class="icon-badge-box icon-badge-amber">
          ${renderIcon('hotel', { size: 20, color: 'var(--accent-amber)' })}
        </div>
        <div>
          <div style="font-weight: 700;">Reservas</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${reservations.length} confirmadas</div>
        </div>
      </div>

      <div class="card card-interactive module-shortcut" data-view="places" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div class="icon-badge-box icon-badge-green">
          ${renderIcon('map-pin', { size: 20, color: '#00f260' })}
        </div>
        <div>
          <div style="font-weight: 700;">Lugares</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${pendingPlacesCount} por visitar</div>
        </div>
      </div>

      <div class="card card-interactive module-shortcut" data-view="expenses" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div class="icon-badge-box icon-badge-rose">
          ${renderIcon('credit-card', { size: 20, color: 'var(--accent-rose)' })}
        </div>
        <div>
          <div style="font-weight: 700;">Gastos</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${expenses.length} registros</div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Handlers
  setTimeout(() => {
    container.querySelectorAll('.module-shortcut').forEach(card => {
      card.addEventListener('click', () => {
        const targetView = card.getAttribute('data-view');
        onNavigate(targetView);
      });
    });

    container.querySelector('#card-next-activity')?.addEventListener('click', () => onNavigate('itinerary'));
    container.querySelector('#card-next-reservation')?.addEventListener('click', () => onNavigate('reservations'));
    container.querySelector('#btn-quick-summary')?.addEventListener('click', () => onNavigate('summary'));
  }, 50);

  return container;
}

