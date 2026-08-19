/**
 * TravelOne Itinerary & Logistics Hub (Pillar 1)
 * Unifies the daily timeline schedule, bucket list places with instant scheduling, and reservations/bookings.
 * 
 * @module js/views/itinerary
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { formatDate, formatMoney, getCategoryBadgeClass, fileToDataURL, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the unified Itinerary & Logistics view.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to re-render the view
 * @param {string} [initialTab='timeline'] - Initial active tab ('timeline' | 'places' | 'reservations')
 * @returns {Promise<HTMLElement>} The rendered container element
 */
export async function renderItineraryView(trip, refreshView, initialTab = 'timeline') {
  if (!trip) return document.createElement('div');

  const activities = await getAllFromStore('itinerary', trip.id);
  const places = await getAllFromStore('places', trip.id);
  const reservations = await getAllFromStore('reservations', trip.id);

  let activeTab = initialTab;
  let placeCatFilter = 'todos';
  let placeStatusFilter = 'todos';

  const container = document.createElement('div');

  const renderContent = () => {
    // -------------------------------------------------------------
    // TAB 1: CRONOGRAMA DIARIO (Activities + Embedded Reservations)
    // -------------------------------------------------------------
    const groupedByDate = {};
    activities.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(item => {
      if (!groupedByDate[item.date]) groupedByDate[item.date] = { activities: [], reservations: [] };
      groupedByDate[item.date].activities.push(item);
    });

    // Embed reservations that match dates into the daily schedule
    reservations.forEach(res => {
      if (res.date) {
        if (!groupedByDate[res.date]) groupedByDate[res.date] = { activities: [], reservations: [] };
        groupedByDate[res.date].reservations.push(res);
      }
    });

    const datesList = Object.keys(groupedByDate).sort();

    const timelineHTML = datesList.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('calendar', { size: 48, color: 'var(--primary-cyan)' })}
        </div>
        <h3>No hay actividades planificadas</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Añade tu primera actividad o agenda un lugar de tu catálogo para construir tu itinerario.</p>
        <button class="btn btn-primary" id="btn-add-act-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Actividad</span>
        </button>
      </div>
    ` : datesList.map(date => {
      const dayData = groupedByDate[date];

      return `
        <div style="margin-bottom: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
            <h3 style="font-size: 1.15rem; color: var(--primary-cyan); display: flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('calendar', { size: 18, color: 'var(--primary-cyan)' })}
              <span>${formatDate(date)}</span>
            </h3>
            <div style="display: flex; gap: 0.5rem;">
              <span class="badge badge-default">${dayData.activities.length} actividades</span>
              ${dayData.reservations.length > 0 ? `<span class="badge badge-hotel icon-inline">${renderIcon('hotel', { size: 12 })} ${dayData.reservations.length} reservas hoy</span>` : ''}
            </div>
          </div>

          <!-- Embedded Day Reservations Banner (if any) -->
          ${dayData.reservations.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
              ${dayData.reservations.map(res => `
                <div style="background: rgba(246, 211, 101, 0.08); border: 1px solid rgba(246, 211, 101, 0.25); border-radius: var(--radius-md); padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div style="background: var(--bg-card); padding: 0.5rem; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
                      ${renderIcon(res.type === 'Hotel' ? 'hotel' : (res.type === 'Vuelo' ? 'plane' : 'tag'), { size: 18, color: 'var(--accent-amber)' })}
                    </div>
                    <div>
                      <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-amber); font-weight: 700;">Reserva Vinculada: ${res.type}</div>
                      <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${res.title}</div>
                      ${res.time ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${res.time}</div>` : ''}
                    </div>
                  </div>
                  ${res.confirmationCode ? `<span class="badge badge-default" style="font-family: monospace;">#${res.confirmationCode}</span>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="timeline">
            ${dayData.activities.map(item => {
              const isCompleted = item.status === 'Completado';
              return `
                <div class="timeline-item ${isCompleted ? 'completed' : ''}">
                  <div class="timeline-point"></div>
                  <div class="timeline-card">
                    <div class="timeline-header">
                      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="timeline-time">${item.time || '--:--'}</span>
                        <span class="badge ${getCategoryBadgeClass(item.category)}">${item.category}</span>
                        ${isCompleted ? `<span class="badge badge-default" style="color: var(--accent-emerald); display: inline-flex; align-items: center; gap: 0.25rem;">${renderIcon('check', { size: 12 })} Listo</span>` : ''}
                      </div>
                      <div class="timeline-actions">
                        <button class="btn btn-secondary btn-sm btn-edit-act" data-id="${item.id}" title="Editar actividad">
                          ${renderIcon('edit', { size: 14 })}
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-act" data-id="${item.id}" title="Eliminar actividad">
                          ${renderIcon('trash', { size: 14 })}
                        </button>
                      </div>
                    </div>

                    <h4 style="margin: 0.35rem 0; font-size: 1.05rem; font-family: 'Outfit', sans-serif;">${item.title}</h4>
                    
                    ${item.location ? `
                      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
                        ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })}
                        <span>${item.location}${item.address ? ` — ${item.address}` : ''}</span>
                      </div>
                    ` : ''}

                    ${item.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.4rem 0;">${item.notes}</p>` : ''}

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
                      <div style="font-weight: 700; color: var(--accent-amber); font-family: 'Outfit', sans-serif;">
                        ${item.cost > 0 ? formatMoney(item.cost, trip.mainCurrency || 'CRC') : '<span style="color: var(--text-dim); font-size: 0.85rem; font-weight: normal;">Gratis / Incluido</span>'}
                      </div>
                      <button class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-toggle-act-status" data-id="${item.id}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
                        ${isCompleted ? 'Marcar pendiente' : 'Marcar completado'}
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // -------------------------------------------------------------
    // TAB 2: LUGARES POR VISITAR (Bucket List with Schedule Action)
    // -------------------------------------------------------------
    const filteredPlaces = places.filter(p => {
      const matchCat = placeCatFilter === 'todos' || p.category === placeCatFilter;
      const matchStatus = placeStatusFilter === 'todos' ||
        (placeStatusFilter === 'visitados' && p.visited) ||
        (placeStatusFilter === 'pendientes' && !p.visited);
      return matchCat && matchStatus;
    });

    const placesListHTML = filteredPlaces.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('map-pin', { size: 48, color: 'var(--text-dim)' })}
        </div>
        <h3>No hay lugares guardados</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Agrega atracciones y puntos de interés que desees visitar durante tu viaje.</p>
        <button class="btn btn-primary" id="btn-add-place-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Lugar</span>
        </button>
      </div>
    ` : filteredPlaces.map(p => {
      let priorityBadge = '';
      if (p.priority === 'Alta') priorityBadge = `<span class="badge icon-inline" style="background: rgba(255,117,140,0.15); color: var(--accent-rose);">${renderIcon('flame', { size: 12, color: 'var(--accent-rose)' })} Alta</span>`;
      else if (p.priority === 'Media') priorityBadge = `<span class="badge icon-inline" style="background: rgba(246,211,101,0.15); color: var(--accent-amber);">${renderIcon('star', { size: 12, color: 'var(--accent-amber)' })} Media</span>`;
      else priorityBadge = `<span class="badge badge-default icon-inline">${renderIcon('leaf', { size: 12, color: '#00f260' })} Baja</span>`;

      return `
        <div class="card" style="opacity: ${p.visited ? 0.75 : 1}; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <span class="badge badge-tourism">${p.category || 'Atracción'}</span>
            <div>${priorityBadge}</div>
          </div>

          <h4 style="font-size: 1.15rem; font-family: 'Outfit', sans-serif; margin-bottom: 0.35rem; color: #ffffff;">${p.name}</h4>

          ${p.location ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
              ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })}
              <span>${p.location}</span>
            </div>
          ` : ''}

          ${p.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.4rem 0; flex: 1;">${p.notes}</p>` : '<div style="flex: 1;"></div>'}

          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; color: var(--accent-amber); font-family: 'Outfit', sans-serif; font-size: 0.95rem;">
              ${p.estCost > 0 ? formatMoney(p.estCost, trip.mainCurrency || 'CRC') : '<span style="color: var(--text-dim); font-size: 0.8rem; font-weight: normal;">Entrada libre</span>'}
            </div>
            <button class="btn btn-sm ${p.visited ? 'btn-secondary' : 'btn-primary'} btn-toggle-place-visited" data-id="${p.id}" style="font-size: 0.75rem; padding: 0.25rem 0.55rem;">
              ${p.visited ? 'Visitado' : 'Por visitar'}
            </button>
          </div>

          <!-- Cross-Module Action: Schedule directly into Itinerary -->
          <div style="display: flex; gap: 0.4rem; margin-top: 0.75rem;">
            <button class="btn btn-secondary btn-sm btn-schedule-place" data-id="${p.id}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; font-size: 0.8rem; background: rgba(0,242,254,0.1); border-color: rgba(0,242,254,0.25); color: var(--primary-cyan);" title="Programar en el itinerario">
              ${renderIcon('calendar', { size: 14, color: 'var(--primary-cyan)' })}
              <span>Agendar al Itinerario</span>
            </button>
            <button class="btn btn-secondary btn-sm btn-edit-place" data-id="${p.id}" title="Editar">
              ${renderIcon('edit', { size: 14 })}
            </button>
            <button class="btn btn-danger btn-sm btn-delete-place" data-id="${p.id}" title="Eliminar">
              ${renderIcon('trash', { size: 14 })}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // -------------------------------------------------------------
    // TAB 3: RESERVAS & VOUCHERS
    // -------------------------------------------------------------
    reservations.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

    const reservationsListHTML = reservations.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('hotel', { size: 48, color: 'var(--accent-amber)' })}
        </div>
        <h3>No tienes reservas registradas</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Guarda tus hoteles, vuelos, tours, alquileres y comprobantes en un solo lugar seguro.</p>
        <button class="btn btn-primary" id="btn-add-res-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Reserva</span>
        </button>
      </div>
    ` : reservations.map(res => {
      let iconName = 'hotel';
      let typeBadgeClass = 'badge-hotel';
      if (res.type === 'Vuelo' || res.type === 'Transporte' || res.type === 'Autobús') {
        iconName = res.type === 'Vuelo' ? 'plane' : 'bus';
        typeBadgeClass = 'badge-transport';
      } else if (res.type === 'Tour' || res.type === 'Atracción') {
        iconName = 'map-pin';
        typeBadgeClass = 'badge-tourism';
      } else if (res.type === 'Restaurante') {
        iconName = 'utensils';
        typeBadgeClass = 'badge-food';
      }

      return `
        <div class="card" style="display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="background: rgba(255,255,255,0.06); padding: 0.4rem; border-radius: var(--radius-sm); display: flex;">
                ${renderIcon(iconName, { size: 18, color: 'var(--accent-amber)' })}
              </div>
              <span class="badge ${typeBadgeClass}">${res.type}</span>
            </div>
            ${res.confirmationCode ? `<span class="badge badge-default" style="font-family: monospace; font-weight: 700;">#${res.confirmationCode}</span>` : ''}
          </div>

          <h4 style="font-size: 1.15rem; font-family: 'Outfit', sans-serif; margin-bottom: 0.35rem; color: #ffffff;">${res.title}</h4>
          
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
            ${renderIcon('calendar', { size: 14, color: 'var(--primary-cyan)' })}
            <span>${formatDate(res.date)}${res.time ? ` — ${res.time}` : ''}</span>
          </div>

          ${res.location ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
              ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })}
              <span>${res.location}${res.address ? ` — ${res.address}` : ''}</span>
            </div>
          ` : ''}

          ${res.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.4rem 0; flex: 1;">${res.notes}</p>` : '<div style="flex: 1;"></div>'}

          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; color: var(--accent-amber); font-family: 'Outfit', sans-serif;">
              ${res.cost > 0 ? formatMoney(res.cost, trip.mainCurrency || 'CRC') : '<span style="color: var(--text-dim); font-size: 0.85rem; font-weight: normal;">Confirmado</span>'}
            </div>
            ${res.attachment ? `
              <a href="${res.attachment}" download="${res.attachmentName || 'comprobante'}" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem;">
                ${renderIcon('download', { size: 13 })} Voucher
              </a>
            ` : ''}
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
            <button class="btn btn-secondary btn-sm btn-edit-res" data-id="${res.id}" style="flex: 1;">Editar</button>
            <button class="btn btn-danger btn-sm btn-delete-res" data-id="${res.id}" title="Eliminar">
              ${renderIcon('trash', { size: 14 })}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // -------------------------------------------------------------
    // MAIN SUITE CONTAINER LAYOUT
    // -------------------------------------------------------------
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1>Itinerario & Logística</h1>
          <div class="page-subtitle">Organiza tu cronograma diario, administra lugares por visitar y controla tus reservas en un solo lugar</div>
        </div>
        <div class="header-actions">
          ${activeTab === 'timeline' ? `
            <button class="btn btn-primary" id="btn-add-activity" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nueva Actividad</span>
            </button>
          ` : (activeTab === 'places' ? `
            <button class="btn btn-primary" id="btn-add-place" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nuevo Lugar</span>
            </button>
          ` : `
            <button class="btn btn-primary" id="btn-add-reservation" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nueva Reserva</span>
            </button>
          `)}
        </div>
      </div>

      <!-- Integrated 3-Tab Pillar Header -->
      <div style="display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; padding-bottom: 2px;">
        <button class="btn btn-sm ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-timeline" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('calendar', { size: 14 })}
          <span>Cronograma Diario (${activities.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'places' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-places" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('map-pin', { size: 14 })}
          <span>Lugares por Visitar (${places.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'reservations' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-reservations" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('hotel', { size: 14 })}
          <span>Reservas & Vouchers (${reservations.length})</span>
        </button>
      </div>

      <!-- Sub-Tab Content -->
      ${activeTab === 'timeline' ? `
        <div id="section-timeline">${timelineHTML}</div>
      ` : (activeTab === 'places' ? `
        <!-- Places Filter Bar -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; background: var(--bg-card); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <select id="filter-place-cat" class="form-select" style="flex: 1; min-width: 150px;">
            <option value="todos" ${placeCatFilter === 'todos' ? 'selected' : ''}>Todas las categorías</option>
            <option value="Atracción" ${placeCatFilter === 'Atracción' ? 'selected' : ''}>Atracciones</option>
            <option value="Parque Nacional" ${placeCatFilter === 'Parque Nacional' ? 'selected' : ''}>Parques Nacionales</option>
            <option value="Restaurante" ${placeCatFilter === 'Restaurante' ? 'selected' : ''}>Restaurantes</option>
            <option value="Playa" ${placeCatFilter === 'Playa' ? 'selected' : ''}>Playas</option>
            <option value="Mirador" ${placeCatFilter === 'Mirador' ? 'selected' : ''}>Miradores</option>
            <option value="Museo" ${placeCatFilter === 'Museo' ? 'selected' : ''}>Museos</option>
          </select>
          <select id="filter-place-status" class="form-select" style="flex: 1; min-width: 150px;">
            <option value="todos" ${placeStatusFilter === 'todos' ? 'selected' : ''}>Todos los estados</option>
            <option value="pendientes" ${placeStatusFilter === 'pendientes' ? 'selected' : ''}>Pendientes por visitar</option>
            <option value="visitados" ${placeStatusFilter === 'visitados' ? 'selected' : ''}>Ya visitados</option>
          </select>
        </div>
        <div class="grid grid-3" id="section-places">${placesListHTML}</div>
      ` : `
        <div class="grid grid-3" id="section-reservations">${reservationsListHTML}</div>
      `)}
    `;

    // Attach Tab Switch Listeners
    document.getElementById('tab-sub-timeline')?.addEventListener('click', () => { activeTab = 'timeline'; renderContent(); });
    document.getElementById('tab-sub-places')?.addEventListener('click', () => { activeTab = 'places'; renderContent(); });
    document.getElementById('tab-sub-reservations')?.addEventListener('click', () => { activeTab = 'reservations'; renderContent(); });

    // Place Filter Listeners
    document.getElementById('filter-place-cat')?.addEventListener('change', (e) => { placeCatFilter = e.target.value; renderContent(); });
    document.getElementById('filter-place-status')?.addEventListener('change', (e) => { placeStatusFilter = e.target.value; renderContent(); });

    // Activity Handlers
    document.getElementById('btn-add-activity')?.addEventListener('click', () => openActivityModal());
    document.getElementById('btn-add-act-empty')?.addEventListener('click', () => openActivityModal());

    document.querySelectorAll('.btn-edit-act').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = activities.find(a => a.id === parseInt(btn.getAttribute('data-id')));
        if (item) openActivityModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-act').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar esta actividad?')) {
          await deleteItem('itinerary', id);
          showToast('Actividad eliminada', 'info');
          refreshView();
        }
      });
    });

    document.querySelectorAll('.btn-toggle-act-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = activities.find(a => a.id === id);
        if (item) {
          item.status = item.status === 'Completado' ? 'Pendiente' : 'Completado';
          await saveItem('itinerary', item);
          showToast(item.status === 'Completado' ? '¡Actividad completada!' : 'Actividad marcada como pendiente');
          refreshView();
        }
      });
    });

    // Place Handlers
    document.getElementById('btn-add-place')?.addEventListener('click', () => openPlaceModal());
    document.getElementById('btn-add-place-empty')?.addEventListener('click', () => openPlaceModal());

    document.querySelectorAll('.btn-schedule-place').forEach(btn => {
      btn.addEventListener('click', () => {
        const place = places.find(p => p.id === parseInt(btn.getAttribute('data-id')));
        if (place) {
          // Pre-populate activity modal from place data
          openActivityModal({
            title: place.name,
            category: 'Turismo',
            location: place.location || '',
            cost: place.estCost || 0,
            notes: place.notes || '',
            date: trip.startDate || '',
            time: '10:00',
            status: 'Pendiente'
          });
        }
      });
    });

    document.querySelectorAll('.btn-toggle-place-visited').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = places.find(p => p.id === id);
        if (item) {
          item.visited = !item.visited;
          await saveItem('places', item);
          showToast(item.visited ? '¡Lugar marcado como visitado!' : 'Lugar marcado como pendiente');
          refreshView();
        }
      });
    });

    document.querySelectorAll('.btn-edit-place').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = places.find(p => p.id === parseInt(btn.getAttribute('data-id')));
        if (item) openPlaceModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-place').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar este lugar?')) {
          await deleteItem('places', id);
          showToast('Lugar eliminado', 'info');
          refreshView();
        }
      });
    });

    // Reservation Handlers
    document.getElementById('btn-add-reservation')?.addEventListener('click', () => openReservationModal());
    document.getElementById('btn-add-res-empty')?.addEventListener('click', () => openReservationModal());

    document.querySelectorAll('.btn-edit-res').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = reservations.find(r => r.id === parseInt(btn.getAttribute('data-id')));
        if (item) openReservationModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-res').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar esta reserva?')) {
          await deleteItem('reservations', id);
          showToast('Reserva eliminada', 'info');
          refreshView();
        }
      });
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT ACTIVITY
  // -------------------------------------------------------------
  const openActivityModal = (item = null) => {
    const isEdit = item && item.id;
    const bodyHTML = `
      <div class="form-group">
        <label>Título de la actividad *</label>
        <input type="text" id="act-title" class="form-control" placeholder="Ej. Tour Canopy, Almuerzo típico" value="${item ? item.title : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Fecha *</label>
          <input type="date" id="act-date" class="form-control" value="${item ? item.date : (trip.startDate || '')}" required>
        </div>
        <div class="form-group">
          <label>Hora</label>
          <input type="time" id="act-time" class="form-control" value="${item ? (item.time || '') : '09:00'}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Categoría</label>
          <select id="act-category" class="form-select">
            ${['Turismo', 'Comida', 'Transporte', 'Hotel', 'Compras', 'Trabajo', 'Otro'].map(cat => `
              <option value="${cat}" ${item && item.category === cat ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Costo Estimado (${trip.mainCurrency || 'CRC'})</label>
          <input type="number" step="any" id="act-cost" class="form-control" placeholder="0" value="${item ? (item.cost || 0) : 0}">
        </div>
      </div>

      <div class="form-group">
        <label>Lugar / Ciudad</label>
        <input type="text" id="act-location" class="form-control" placeholder="Ej. Parque La Fortuna" value="${item ? (item.location || '') : ''}">
      </div>

      <div class="form-group">
        <label>Notas adicionales</label>
        <textarea id="act-notes" class="form-control" rows="2" placeholder="Recordatorios, reservas previas, etc.">${item ? (item.notes || '') : ''}</textarea>
      </div>
    `;

    openModal(isEdit ? 'Editar Actividad' : 'Nueva Actividad', bodyHTML, async () => {
      const title = document.getElementById('act-title').value.trim();
      const date = document.getElementById('act-date').value;
      if (!title || !date) {
        showToast('El título y la fecha son obligatorios', 'error');
        return false;
      }

      const actObj = {
        tripId: trip.id,
        title,
        date,
        time: document.getElementById('act-time').value,
        category: document.getElementById('act-category').value,
        cost: parseFloat(document.getElementById('act-cost').value) || 0,
        location: document.getElementById('act-location').value.trim(),
        notes: document.getElementById('act-notes').value.trim(),
        status: item ? (item.status || 'Pendiente') : 'Pendiente'
      };

      if (isEdit) actObj.id = item.id;
      await saveItem('itinerary', actObj);
      showToast(isEdit ? 'Actividad actualizada' : 'Actividad añadida');
      refreshView();
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT PLACE
  // -------------------------------------------------------------
  const openPlaceModal = (item = null) => {
    const isEdit = item && item.id;
    const bodyHTML = `
      <div class="form-group">
        <label>Nombre del Lugar / Atracción *</label>
        <input type="text" id="place-name" class="form-control" placeholder="Ej. Volcán Arenal, Playa Manuel Antonio" value="${item ? item.name : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Categoría</label>
          <select id="place-category" class="form-select">
            ${['Atracción', 'Parque Nacional', 'Restaurante', 'Playa', 'Mirador', 'Museo', 'Otro'].map(c => `
              <option value="${c}" ${item && item.category === c ? 'selected' : ''}>${c}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Prioridad</label>
          <select id="place-priority" class="form-select">
            <option value="Alta" ${item && item.priority === 'Alta' ? 'selected' : ''}>Alta (Imprescindible)</option>
            <option value="Media" ${!item || item.priority === 'Media' ? 'selected' : ''}>Media (Recomendado)</option>
            <option value="Baja" ${item && item.priority === 'Baja' ? 'selected' : ''}>Baja (Opcional)</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Ubicación / Región</label>
          <input type="text" id="place-location" class="form-control" placeholder="Ej. San Carlos, Alajuela" value="${item ? (item.location || '') : ''}">
        </div>

        <div class="form-group">
          <label>Costo Entrada (${trip.mainCurrency || 'CRC'})</label>
          <input type="number" step="any" id="place-cost" class="form-control" placeholder="0" value="${item ? (item.estCost || 0) : 0}">
        </div>
      </div>

      <div class="form-group">
        <label>Notas / Tips para la visita</label>
        <textarea id="place-notes" class="form-control" rows="2" placeholder="Horarios recomendados, ropa necesaria, etc.">${item ? (item.notes || '') : ''}</textarea>
      </div>
    `;

    openModal(isEdit ? 'Editar Lugar' : 'Nuevo Lugar por Visitar', bodyHTML, async () => {
      const name = document.getElementById('place-name').value.trim();
      if (!name) {
        showToast('El nombre del lugar es obligatorio', 'error');
        return false;
      }

      const placeObj = {
        tripId: trip.id,
        name,
        category: document.getElementById('place-category').value,
        priority: document.getElementById('place-priority').value,
        location: document.getElementById('place-location').value.trim(),
        estCost: parseFloat(document.getElementById('place-cost').value) || 0,
        notes: document.getElementById('place-notes').value.trim(),
        visited: item ? item.visited : false
      };

      if (isEdit) placeObj.id = item.id;
      await saveItem('places', placeObj);
      showToast(isEdit ? 'Lugar actualizado' : 'Lugar agregado');
      activeTab = 'places';
      refreshView();
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT RESERVATION
  // -------------------------------------------------------------
  const openReservationModal = (item = null) => {
    const isEdit = item && item.id;
    let currentAttachment = item ? (item.attachment || null) : null;
    let currentAttachmentName = item ? (item.attachmentName || null) : null;

    const bodyHTML = `
      <div class="form-group">
        <label>Título de la Reserva *</label>
        <input type="text" id="res-title" class="form-control" placeholder="Ej. Hotel Arenal Kioro, Vuelo San José - Miami" value="${item ? item.title : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Tipo de Reserva</label>
          <select id="res-type" class="form-select">
            ${['Hotel', 'Vuelo', 'Tour', 'Transporte', 'Restaurante', 'Alquiler de Auto', 'Otro'].map(t => `
              <option value="${t}" ${item && item.type === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Código de Confirmación / Localizador</label>
          <input type="text" id="res-code" class="form-control" placeholder="Ej. ABC123XYZ" value="${item ? (item.confirmationCode || '') : ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Fecha *</label>
          <input type="date" id="res-date" class="form-control" value="${item ? item.date : (trip.startDate || '')}" required>
        </div>
        <div class="form-group">
          <label>Hora</label>
          <input type="time" id="res-time" class="form-control" value="${item ? (item.time || '') : '15:00'}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Lugar / Proveedor</label>
          <input type="text" id="res-location" class="form-control" placeholder="Ej. Aeropuerto SJO, Booking.com" value="${item ? (item.location || '') : ''}">
        </div>

        <div class="form-group">
          <label>Costo Total (${trip.mainCurrency || 'CRC'})</label>
          <input type="number" step="any" id="res-cost" class="form-control" placeholder="0" value="${item ? (item.cost || 0) : 0}">
        </div>
      </div>

      <div class="form-group">
        <label>Comprobante / Voucher (Imagen o PDF)</label>
        <input type="file" id="res-file" class="form-control" accept="image/*,.pdf">
        <small style="color: var(--text-dim);" id="res-file-label">${currentAttachmentName ? `Archivo actual: ${currentAttachmentName}` : 'Se almacena de forma segura en tu dispositivo'}</small>
      </div>

      <div class="form-group">
        <label>Notas / Políticas de cancelación</label>
        <textarea id="res-notes" class="form-control" rows="2" placeholder="Check-in a las 3:00 PM, desayuno incluido...">${item ? (item.notes || '') : ''}</textarea>
      </div>
    `;

    openModal(isEdit ? 'Editar Reserva' : 'Nueva Reserva & Voucher', bodyHTML, async () => {
      const title = document.getElementById('res-title').value.trim();
      const date = document.getElementById('res-date').value;
      if (!title || !date) {
        showToast('El título y la fecha son obligatorios', 'error');
        return false;
      }

      const fileInput = document.getElementById('res-file');
      if (fileInput.files.length > 0) {
        currentAttachment = await fileToDataURL(fileInput.files[0]);
        currentAttachmentName = fileInput.files[0].name;
      }

      const resObj = {
        tripId: trip.id,
        title,
        type: document.getElementById('res-type').value,
        confirmationCode: document.getElementById('res-code').value.trim(),
        date,
        time: document.getElementById('res-time').value,
        location: document.getElementById('res-location').value.trim(),
        cost: parseFloat(document.getElementById('res-cost').value) || 0,
        notes: document.getElementById('res-notes').value.trim(),
        attachment: currentAttachment,
        attachmentName: currentAttachmentName
      };

      if (isEdit) resObj.id = item.id;
      await saveItem('reservations', resObj);
      showToast(isEdit ? 'Reserva actualizada' : 'Reserva agregada');
      activeTab = 'reservations';
      refreshView();
      return true;
    });
  };

  renderContent();
  return container;
}


