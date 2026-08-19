/**
 * TravelOne Home & Trip Hub View
 * Manages active trips, historical completed travels, trash recycling, and XML backup import/export.
 * 
 * @module js/views/home
 */

import { getAllFromStore, saveItem, moveToTrash, restoreTrip, permanentDeleteTrip, emptyTrash, importTripsXML, exportTripsXML } from '../db.js';
import { formatDate, calculateDaysLeft, calculateDuration, formatMoney, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon, renderAppLogoSVG } from '../icons.js';

/**
 * Render the main Home view showcasing user trips, filters, and management actions.
 * 
 * @param {Function} onSelectTrip - Callback when user selects a trip (receives tripId)
 * @param {Object|null} currentUser - Active authenticated user profile
 * @returns {Promise<HTMLElement>} The resolved home view container
 */
export async function renderHomeView(onSelectTrip, currentUser) {
  const allTrips = await getAllFromStore('trips');
  // Scoped to current logged in user if userId exists
  const userTrips = currentUser ? allTrips.filter(t => !t.userId || t.userId === currentUser.id) : allTrips;

  let activeTab = 'active'; // 'active' | 'history' | 'trash'
  let searchQuery = '';
  let selectedYear = 'todos';
  let selectedDestination = 'todos';
  let sortOrder = 'desc';

  const container = document.createElement('div');

  const renderContent = () => {
    // 1. Separate Trips by Status
    const activeTrips = userTrips.filter(t => t.status === 'planificando' || t.status === 'en_curso');
    const historyTrips = userTrips.filter(t => t.status === 'finalizado');
    const trashTrips = userTrips.filter(t => t.status === 'papelera');

    // Filter History Trips
    let filteredHistory = [...historyTrips];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredHistory = filteredHistory.filter(t => t.name.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q));
    }
    if (selectedYear !== 'todos') {
      filteredHistory = filteredHistory.filter(t => t.startDate && t.startDate.startsWith(selectedYear));
    }
    if (selectedDestination !== 'todos') {
      filteredHistory = filteredHistory.filter(t => t.destination.toLowerCase().includes(selectedDestination.toLowerCase()));
    }
    filteredHistory.sort((a, b) => {
      const dA = a.startDate || '';
      const dB = b.startDate || '';
      return sortOrder === 'desc' ? dB.localeCompare(dA) : dA.localeCompare(dB);
    });

    // Unique Years and Destinations for Filters
    const availableYears = [...new Set(historyTrips.map(t => t.startDate ? t.startDate.substring(0, 4) : '').filter(Boolean))].sort().reverse();
    const availableDestinations = [...new Set(historyTrips.map(t => t.destination).filter(Boolean))].sort();

    const getStatusBadge = (status) => {
      switch (status) {
        case 'en_curso': return `<span class="status-badge status-in-progress icon-inline">${renderIcon('zap', { size: 12 })} En curso</span>`;
        case 'planificando': return `<span class="status-badge status-pending icon-inline">${renderIcon('checklist', { size: 12 })} Planificando</span>`;
        case 'finalizado': return `<span class="status-badge status-completed icon-inline">${renderIcon('check-circle', { size: 12 })} Finalizado</span>`;
        case 'papelera': return `<span class="status-badge status-pending icon-inline" style="background: rgba(255,117,140,0.15); color: var(--accent-rose);">${renderIcon('trash', { size: 12 })} En Papelera</span>`;
        default: return '';
      }
    };

    // Render Cards Function
    const renderTripCards = (list, isTrashView = false, isHistoryView = false) => {
      if (list.length === 0) {
        const emptyIcon = isTrashView ? renderIcon('trash', { size: 48, color: 'var(--text-dim)' }) : (isHistoryView ? renderIcon('history', { size: 48, color: 'var(--text-dim)' }) : renderAppLogoSVG(56));
        return `
          <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
            <div style="margin-bottom: 1rem; display: flex; justify-content: center;">${emptyIcon}</div>
            <h3>${isTrashView ? 'La papelera está vacía' : (isHistoryView ? 'No hay viajes en el historial' : 'No tienes viajes activos')}</h3>
            <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">
              ${isTrashView ? 'Los viajes que elimines aparecerán aquí conservando toda su información.' : (isHistoryView ? 'Los viajes que finalices se guardarán aquí de forma permanente.' : 'Crea tu próximo viaje para organizar itinerario, gastos y más.')}
            </p>
            ${!isTrashView && !isHistoryView ? `<button class="btn btn-primary" id="btn-create-first-trip">${renderIcon('plus', { size: 16, color: '#0b1326' })} Crear nuevo viaje</button>` : ''}
          </div>
        `;
      }

      return list.map(trip => {
        const daysLeft = calculateDaysLeft(trip.startDate);
        const duration = calculateDuration(trip.startDate, trip.endDate);
        
        let countdownText = '';
        if (trip.status === 'en_curso') {
          countdownText = `<span class="icon-inline" style="color: var(--accent-amber); font-weight: 700;">${renderIcon('zap', { size: 14, color: 'var(--accent-amber)' })} ¡En curso!</span>`;
        } else if (daysLeft > 0) {
          countdownText = `<span class="icon-inline" style="color: var(--primary-cyan); font-weight: 700;">${renderIcon('hourglass', { size: 14, color: 'var(--primary-cyan)' })} Faltan ${daysLeft} días</span>`;
        } else if (daysLeft === 0) {
          countdownText = `<span class="icon-inline" style="color: var(--accent-amber); font-weight: 700;">${renderIcon('sparkles', { size: 14, color: 'var(--accent-amber)' })} ¡Empieza hoy!</span>`;
        } else {
          countdownText = `<span class="icon-inline" style="color: var(--text-dim);">${renderIcon('check-circle', { size: 14, color: 'var(--text-dim)' })} Concluido</span>`;
        }

        return `
          <div class="card card-interactive trip-card" data-id="${trip.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center;">
                ${renderAppLogoSVG(38)}
              </div>
              <div>${getStatusBadge(trip.status)}</div>
            </div>


            <h3 style="font-size: 1.35rem; margin-bottom: 0.25rem;">${trip.name}</h3>
            <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
              ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })}
              <span>${trip.destination}</span>
            </div>

            <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-md);">
              ${renderIcon('calendar', { size: 14, color: 'var(--primary-cyan)' })}
              <div>${formatDate(trip.startDate)} — ${formatDate(trip.endDate)} (${duration} días)</div>
            </div>

            ${isTrashView ? `
              <div style="font-size: 0.8rem; color: var(--accent-rose); margin-bottom: 0.75rem; background: rgba(255, 117, 140, 0.1); padding: 0.4rem 0.65rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.35rem;">
                ${renderIcon('trash', { size: 13, color: 'var(--accent-rose)' })}
                <span>Enviado a papelera el: <strong>${formatDate(trip.deletedAt ? trip.deletedAt.split('T')[0] : '')}</strong></span>
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto</div>
                  <div style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #ffffff;">${formatMoney(trip.budget, trip.mainCurrency || 'CRC')}</div>
                </div>
                <div>${countdownText}</div>
              </div>
            `}

            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
              ${isTrashView ? `
                <button class="btn btn-secondary btn-sm btn-restore-trip" data-id="${trip.id}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
                  ${renderIcon('restore', { size: 14 })} Restaurar
                </button>
                <button class="btn btn-danger btn-sm btn-perm-delete-trip" data-id="${trip.id}" title="Eliminar definitivamente" style="display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
                  ${renderIcon('trash', { size: 14 })}
                </button>
              ` : `
                <button class="btn btn-primary btn-sm btn-open-trip" data-id="${trip.id}" style="flex: 1;">Abrir Viaje</button>
                ${isHistoryView ? `<button class="btn btn-secondary btn-sm btn-restore-trip" data-id="${trip.id}" title="Restaurar a activo" style="display: flex; align-items: center; gap: 0.3rem;">${renderIcon('restore', { size: 14 })} Activar</button>` : ''}
                <button class="btn btn-danger btn-sm btn-move-trash-trip" data-id="${trip.id}" title="Enviar a papelera">
                  ${renderIcon('trash', { size: 14 })}
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    };

    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1>Gestión de Viajes</h1>
          <div class="page-subtitle">Organiza tus viajes activos, consulta tu historial y administra la papelera</div>
        </div>
        <div class="header-actions">
          <label class="btn btn-secondary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('download', { size: 15 })}
            <span>Importar XML</span>
            <input type="file" id="input-import-xml" accept=".xml" style="display: none;">
          </label>
          <button class="btn btn-secondary" id="btn-export-all-xml" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('save', { size: 15 })}
            <span>Respaldar XML</span>
          </button>
          <button class="btn btn-primary" id="btn-add-trip" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('plus', { size: 15, color: '#0b1326' })}
            <span>Nuevo Viaje</span>
          </button>
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button class="btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}" id="tab-active" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plane', { size: 14 })}
          <span>Mis Viajes (${activeTrips.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}" id="tab-history" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('history', { size: 14 })}
          <span>Historial (${historyTrips.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'trash' ? 'btn-primary' : 'btn-secondary'}" id="tab-trash" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('trash', { size: 14 })}
          <span>Papelera (${trashTrips.length})</span>
        </button>
      </div>

      <!-- History Filter Controls -->
      ${activeTab === 'history' ? `
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; background: var(--bg-card); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <input type="text" id="hist-search" class="form-control" style="flex: 2; min-width: 200px;" placeholder="Buscar por nombre o destino..." value="${searchQuery}">
          
          <select id="hist-year" class="form-select" style="flex: 1; min-width: 130px;">
            <option value="todos">Todos los años</option>
            ${availableYears.map(y => `<option value="${y}" ${selectedYear === y ? 'selected' : ''}>${y}</option>`).join('')}
          </select>

          <select id="hist-dest" class="form-select" style="flex: 1; min-width: 140px;">
            <option value="todos">Todos los destinos</option>
            ${availableDestinations.map(d => `<option value="${d}" ${selectedDestination === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>

          <select id="hist-sort" class="form-select" style="flex: 1; min-width: 140px;">
            <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Más recientes primero</option>
            <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>Más antiguos primero</option>
          </select>
        </div>
      ` : ''}

      <!-- Trash Controls Header -->
      ${activeTab === 'trash' && trashTrips.length > 0 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: rgba(255, 117, 140, 0.1); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); border: 1px solid rgba(255, 117, 140, 0.25);">
          <div style="font-size: 0.9rem; color: var(--accent-rose); font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('info', { size: 16, color: 'var(--accent-rose)' })}
            <span>Los viajes en papelera conservan toda su información. No se eliminan automáticamente.</span>
          </div>
          <button class="btn btn-danger btn-sm" id="btn-empty-trash" style="display: inline-flex; align-items: center; gap: 0.35rem;">
            ${renderIcon('trash', { size: 14 })} Vaciar Papelera
          </button>
        </div>
      ` : ''}

      <!-- Grid Display -->
      <div class="grid-3">
        ${activeTab === 'active' ? renderTripCards(activeTrips, false, false) : ''}
        ${activeTab === 'history' ? renderTripCards(filteredHistory, false, true) : ''}
        ${activeTab === 'trash' ? renderTripCards(trashTrips, true, false) : ''}
      </div>
    `;

    // Attach Event Handlers
    setTimeout(() => {
      // Tab switching
      container.querySelector('#tab-active')?.addEventListener('click', () => { activeTab = 'active'; renderContent(); });
      container.querySelector('#tab-history')?.addEventListener('click', () => { activeTab = 'history'; renderContent(); });
      container.querySelector('#tab-trash')?.addEventListener('click', () => { activeTab = 'trash'; renderContent(); });

      // Search & Filters in History
      container.querySelector('#hist-search')?.addEventListener('input', (e) => { searchQuery = e.target.value; renderContent(); });
      container.querySelector('#hist-year')?.addEventListener('change', (e) => { selectedYear = e.target.value; renderContent(); });
      container.querySelector('#hist-dest')?.addEventListener('change', (e) => { selectedDestination = e.target.value; renderContent(); });
      container.querySelector('#hist-sort')?.addEventListener('change', (e) => { sortOrder = e.target.value; renderContent(); });

      // Open trip
      container.querySelectorAll('.btn-open-trip, .trip-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const tripId = el.getAttribute('data-id');
          onSelectTrip(tripId);
        });
      });

      container.querySelectorAll('.btn-open-trip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tripId = btn.getAttribute('data-id');
          onSelectTrip(tripId);
        });
      });

      // Add trip
      container.querySelector('#btn-add-trip')?.addEventListener('click', () => openNewTripModal(onSelectTrip, currentUser, () => renderHomeView(onSelectTrip, currentUser)));
      container.querySelector('#btn-create-first-trip')?.addEventListener('click', () => openNewTripModal(onSelectTrip, currentUser, () => renderHomeView(onSelectTrip, currentUser)));

      // Move to Trash (Soft Delete)
      container.querySelectorAll('.btn-move-trash-trip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tripId = btn.getAttribute('data-id');
          await moveToTrash(tripId);
          showToast('Viaje movido a la Papelera', 'info');
          const updated = await getAllFromStore('trips');
          userTrips.length = 0;
          userTrips.push(...(currentUser ? updated.filter(t => !t.userId || t.userId === currentUser.id) : updated));
          renderContent();
        });
      });

      // Restore Trip
      container.querySelectorAll('.btn-restore-trip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tripId = btn.getAttribute('data-id');
          await restoreTrip(tripId);
          showToast('Viaje restaurado con éxito');
          const updated = await getAllFromStore('trips');
          userTrips.length = 0;
          userTrips.push(...(currentUser ? updated.filter(t => !t.userId || t.userId === currentUser.id) : updated));
          renderContent();
        });
      });

      // Permanent Delete Trip
      container.querySelectorAll('.btn-perm-delete-trip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tripId = btn.getAttribute('data-id');
          if (confirm('Esta acción eliminará permanentemente el viaje y toda la información asociada.')) {
            await permanentDeleteTrip(tripId);
            showToast('Viaje eliminado definitivamente', 'info');
            const updated = await getAllFromStore('trips');
            userTrips.length = 0;
            userTrips.push(...(currentUser ? updated.filter(t => !t.userId || t.userId === currentUser.id) : updated));
            renderContent();
          }
        });
      });

      // Empty Trash
      container.querySelector('#btn-empty-trash')?.addEventListener('click', async () => {
        if (confirm('¿Vaciar la papelera? Esta acción eliminará permanentemente todos los viajes en papelera y toda su información.')) {
          await emptyTrash(currentUser ? currentUser.id : null);
          showToast('Papelera vaciada');
          const updated = await getAllFromStore('trips');
          userTrips.length = 0;
          userTrips.push(...(currentUser ? updated.filter(t => !t.userId || t.userId === currentUser.id) : updated));
          renderContent();
        }
      });

      // Export All XML
      container.querySelector('#btn-export-all-xml')?.addEventListener('click', async () => {
        try {
          const xmlData = await exportTripsXML(null, currentUser ? currentUser.id : null);
          const blob = new Blob([xmlData], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `TravelOne_Respaldo_Completo.xml`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Respaldo XML exportado correctamente');
        } catch (err) {
          alert('Error al exportar XML: ' + err.message);
        }
      });

      // Import XML
      container.querySelector('#input-import-xml')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const xmlText = await file.text();
          const result = await importTripsXML(xmlText, currentUser ? currentUser.id : null);
          showToast(`¡Se importaron ${result.importedCount} viajes desde el archivo XML!`);
          if (result.lastTripId) onSelectTrip(result.lastTripId);
        } catch (err) {
          alert('Error al importar archivo XML: ' + err.message);
        }
      });
    }, 50);
  };

  renderContent();
  return container;
}

function openNewTripModal(onSelectTrip, currentUser, onRefresh) {
  const bodyHTML = `
    <div class="form-group">
      <label>Nombre del Viaje *</label>
      <input type="text" id="trip-name" class="form-control" required>
    </div>

    <div class="form-group">
      <label>Destino Principal *</label>
      <input type="text" id="trip-destination" class="form-control" required>
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
        <input type="number" step="1" id="trip-budget" class="form-control">
      </div>

      <div class="form-group">
        <label>Moneda Principal</label>
        <select id="trip-currency" class="form-select">
          <option value="CRC" selected>CRC (₡ - Colones)</option>
          <option value="USD">USD ($ - Dólares)</option>
          <option value="EUR">EUR (€ - Euros)</option>
          <option value="MXN">MXN ($ - Pesos MX)</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Estado Inicial</label>
        <select id="trip-status" class="form-select">
          <option value="planificando" selected>Planificando</option>
          <option value="en_curso">En curso</option>
          <option value="finalizado">Finalizado (Historial)</option>
        </select>
      </div>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('sparkles', { size: 20, color: 'var(--primary-cyan)' })} Crear Nuevo Viaje</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const name = document.getElementById('trip-name').value.trim();
    const destination = document.getElementById('trip-destination').value.trim();
    const startDate = document.getElementById('trip-start-date').value;
    const endDate = document.getElementById('trip-end-date').value;
    const budget = parseFloat(document.getElementById('trip-budget').value) || 0;
    const mainCurrency = document.getElementById('trip-currency').value;
    const status = document.getElementById('trip-status').value;

    if (!name || !destination || !startDate || !endDate) {
      alert('Por favor completa los campos obligatorios (*)');
      return false;
    }

    const newTrip = {
      id: 'trip-' + Date.now(),
      userId: currentUser ? currentUser.id : null,
      name,
      destination,
      startDate,
      endDate,
      budget,
      mainCurrency,
      secondaryCurrencies: ['USD'],
      exchangeRates: { USD: 500 },
      status,
      createdAt: new Date().toISOString()
    };

    await saveItem('trips', newTrip);
    showToast(`¡Viaje "${name}" creado!`);
    onSelectTrip(newTrip.id);
    return true;
  });
}

