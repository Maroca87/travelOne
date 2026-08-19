/**
 * TravelOne Trip Dashboard View
 * Executive command center displaying metrics, budget progress, upcoming events, and access to the 4 core pillars.
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
  const shopping = await getAllFromStore('shopping', trip.id);
  const checklists = await getAllFromStore('checklists', trip.id);
  const documents = await getAllFromStore('documents', trip.id);
  const journal = await getAllFromStore('journal', trip.id);

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
  const completedTasksCount = checklists.filter(c => c.completed).length;
  const pendingPlacesCount = places.filter(p => !p.visited).length;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-title-group">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
          <div style="display: flex; align-items: center;">
            ${renderAppLogoSVG(36)}
          </div>
          <h1 style="margin: 0; font-family: 'Outfit', sans-serif;">${trip.name}</h1>
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
          <span>Ver Resumen Ejecutivo</span>
        </button>
      </div>
    </div>

    <!-- Quick Metrics Row -->
    <div class="grid grid-4" style="margin-bottom: 1.5rem;">
      <div class="card stat-card">
        <div class="stat-icon" style="background: rgba(0, 242, 254, 0.1); color: var(--primary-cyan);">
          ${renderIcon('hourglass', { size: 24, color: 'var(--primary-cyan)' })}
        </div>
        <div>
          <div class="stat-label">Días Restantes</div>
          <div class="stat-value" style="color: var(--primary-cyan); font-family: 'Outfit', sans-serif;">
            ${daysLeft > 0 ? `${daysLeft} días` : (daysLeft === 0 ? '¡Hoy!' : 'Concluido')}
          </div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="background: rgba(246, 211, 101, 0.12); color: var(--accent-amber);">
          ${renderIcon('coins', { size: 24, color: 'var(--accent-amber)' })}
        </div>
        <div>
          <div class="stat-label">Saldo Disponible</div>
          <div class="stat-value" style="color: ${available < 0 ? 'var(--accent-rose)' : 'var(--accent-amber)'}; font-family: 'Outfit', sans-serif;">
            ${formatMoney(available, trip.mainCurrency || 'CRC')}
          </div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="background: rgba(0, 242, 96, 0.12); color: var(--accent-emerald);">
          ${renderIcon('calendar', { size: 24, color: 'var(--accent-emerald)' })}
        </div>
        <div>
          <div class="stat-label">Actividades</div>
          <div class="stat-value" style="color: #ffffff; font-family: 'Outfit', sans-serif;">
            ${itinerary.length} agenda
          </div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="background: rgba(161, 140, 209, 0.12); color: var(--accent-purple);">
          ${renderIcon('checklist', { size: 24, color: 'var(--accent-purple)' })}
        </div>
        <div>
          <div class="stat-label">Preparativos</div>
          <div class="stat-value" style="color: #ffffff; font-family: 'Outfit', sans-serif;">
            ${completedTasksCount}/${checklists.length} listos
          </div>
        </div>
      </div>
    </div>

    <!-- Budget Overview Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem; color: #ffffff;">
          ${renderIcon('wallet', { size: 18, color: 'var(--primary-cyan)' })}
          <span>Control Financiero del Viaje</span>
        </h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${spentPercent}% del presupuesto consumido</span>
      </div>

      <div class="progress-container" style="height: 10px; margin-bottom: 1rem;">
        <div class="progress-bar ${spentPercent > 85 ? 'progress-rose' : (spentPercent > 65 ? 'progress-amber' : '')}" style="width: ${spentPercent}%;"></div>
      </div>

      <div class="grid grid-3" style="text-align: center; background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md);">
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto Total</div>
          <div style="font-weight: 700; color: #ffffff; font-family: 'Outfit', sans-serif;">${formatMoney(budget, trip.mainCurrency || 'CRC')}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Total Gastado</div>
          <div style="font-weight: 700; color: var(--accent-rose); font-family: 'Outfit', sans-serif;">${formatMoney(totalSpent, trip.mainCurrency || 'CRC')}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Dinero Disponible</div>
          <div style="font-weight: 700; color: var(--accent-emerald); font-family: 'Outfit', sans-serif;">${formatMoney(available, trip.mainCurrency || 'CRC')}</div>
        </div>
      </div>
    </div>

    <!-- Next Up Grid -->
    <div class="grid grid-2" style="margin-bottom: 1.5rem;">
      <!-- Next Activity Card -->
      <div class="card card-interactive" id="card-next-activity" style="cursor: pointer;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-cyan); text-transform: uppercase;">Próxima Actividad</span>
          ${renderIcon('calendar', { size: 16, color: 'var(--primary-cyan)' })}
        </div>
        ${nextActivity ? `
          <h4 style="font-size: 1.15rem; margin-bottom: 0.25rem; font-family: 'Outfit', sans-serif; color: #ffffff;">${nextActivity.title}</h4>
          <div style="color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="icon-inline">${renderIcon('clock', { size: 13 })} ${nextActivity.time || 'Hora pendiente'}</span>
            ${nextActivity.location ? `<span class="icon-inline">${renderIcon('map-pin', { size: 13 })} ${nextActivity.location}</span>` : ''}
          </div>
        ` : `
          <div style="color: var(--text-muted); font-size: 0.9rem;">No hay actividades pendientes en el itinerario.</div>
        `}
      </div>

      <!-- Next Reservation Card -->
      <div class="card card-interactive" id="card-next-reservation" style="cursor: pointer;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-amber); text-transform: uppercase;">Próxima Reserva</span>
          ${renderIcon('hotel', { size: 16, color: 'var(--accent-amber)' })}
        </div>
        ${nextReservation ? `
          <h4 style="font-size: 1.15rem; margin-bottom: 0.25rem; font-family: 'Outfit', sans-serif; color: #ffffff;">${nextReservation.title}</h4>
          <div style="color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="icon-inline">${renderIcon('tag', { size: 13 })} ${nextReservation.type}</span>
            ${nextReservation.confirmationCode ? `<span>Conf: #${nextReservation.confirmationCode}</span>` : ''}
          </div>
        ` : `
          <div style="color: var(--text-muted); font-size: 0.9rem;">No hay reservas registradas aún.</div>
        `}
      </div>
    </div>

    <!-- 4 Core Unified Pillars Quick Launch -->
    <h3 style="font-size: 1.15rem; margin-bottom: 1rem; color: #ffffff;">Pilares del Viaje</h3>
    <div class="grid grid-4">
      <div class="card card-interactive module-shortcut" data-view="itinerary" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div style="background: rgba(0, 242, 254, 0.1); padding: 0.75rem; border-radius: var(--radius-md); display: flex;">
          ${renderIcon('calendar', { size: 24, color: 'var(--primary-cyan)' })}
        </div>
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: #ffffff;">Itinerario & Logística</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${itinerary.length} act. • ${places.length} lugares</div>
        </div>
      </div>

      <div class="card card-interactive module-shortcut" data-view="expenses" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div style="background: rgba(246, 211, 101, 0.1); padding: 0.75rem; border-radius: var(--radius-md); display: flex;">
          ${renderIcon('wallet', { size: 24, color: 'var(--accent-amber)' })}
        </div>
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: #ffffff;">Finanzas & Control</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${expenses.length} gastos • ${shopping.length} compras</div>
        </div>
      </div>

      <div class="card card-interactive module-shortcut" data-view="checklist" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div style="background: rgba(0, 242, 96, 0.1); padding: 0.75rem; border-radius: var(--radius-md); display: flex;">
          ${renderIcon('checklist', { size: 24, color: 'var(--accent-emerald)' })}
        </div>
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: #ffffff;">Preparativos & Equipaje</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${checklists.length} tareas • ${documents.length} docs</div>
        </div>
      </div>

      <div class="card card-interactive module-shortcut" data-view="journal" style="display: flex; align-items: center; gap: 1rem; cursor: pointer;">
        <div style="background: rgba(255, 117, 140, 0.1); padding: 0.75rem; border-radius: var(--radius-md); display: flex;">
          ${renderIcon('journal', { size: 24, color: 'var(--accent-rose)' })}
        </div>
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: #ffffff;">Bitácora & Resumen</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${journal.length} entradas • Dossier</div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Handlers Synchronously
  container.querySelectorAll('.module-shortcut').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = card.getAttribute('data-view');
      if (targetView) onNavigate(targetView);
    });
  });

  container.querySelector('#card-next-activity')?.addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('itinerary');
  });

  container.querySelector('#card-next-reservation')?.addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('itinerary');
  });

  container.querySelector('#btn-quick-summary')?.addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('journal');
  });

  return container;
}
