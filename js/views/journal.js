/**
 * TravelOne Diary & Trip Dossier Hub (Pillar 4)
 * Unifies personal travel diary entries, photo memories, executive summary dossiers, and printable XML backups.
 * 
 * @module js/views/journal
 */

import { getAllFromStore, saveItem, deleteItem, exportTripsXML } from '../db.js';
import { formatDate, calculateDuration, formatMoney, fileToDataURL, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon, renderAppLogoSVG } from '../icons.js';

/**
 * Render the unified Diary & Dossier view.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to re-render the view
 * @param {string} [initialTab='journal'] - Initial active tab ('journal' | 'summary')
 * @returns {Promise<HTMLElement>} The rendered container element
 */
export async function renderJournalView(trip, refreshView, initialTab = 'journal') {
  if (!trip) return document.createElement('div');

  const journalEntries = await getAllFromStore('journal', trip.id);
  const itinerary = await getAllFromStore('itinerary', trip.id);
  const reservations = await getAllFromStore('reservations', trip.id);
  const expenses = await getAllFromStore('expenses', trip.id);
  const places = await getAllFromStore('places', trip.id);
  const shopping = await getAllFromStore('shopping', trip.id);
  const checklists = await getAllFromStore('checklists', trip.id);

  let activeTab = initialTab;

  const container = document.createElement('div');

  const renderContent = () => {
    // -------------------------------------------------------------
    // TAB 1: DIARIO DE VIAJE
    // -------------------------------------------------------------
    journalEntries.sort((a, b) => b.date.localeCompare(a.date));

    const diaryListHTML = journalEntries.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('journal', { size: 48, color: 'var(--primary-cyan)' })}
        </div>
        <h3>Tu diario de viaje está vacío</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Guarda anécdotas, fotos, vivencias y sensaciones para recordar tu viaje para siempre.</p>
        <button class="btn btn-primary" id="btn-add-entry-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Escribir Entrada</span>
        </button>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${journalEntries.map(entry => `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <span class="icon-inline" style="font-size: 0.85rem; color: var(--primary-cyan); font-weight: 600;">
                  ${renderIcon('calendar', { size: 14, color: 'var(--primary-cyan)' })} ${formatDate(entry.date)}
                </span>
                ${entry.location ? `
                  <span class="icon-inline" style="font-size: 0.85rem; color: var(--text-muted);">
                    ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })} ${entry.location}
                  </span>
                ` : ''}
              </div>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-edit-entry" data-id="${entry.id}" title="Editar">
                  ${renderIcon('edit', { size: 14 })}
                </button>
                <button class="btn btn-danger btn-sm btn-delete-entry" data-id="${entry.id}" title="Eliminar">
                  ${renderIcon('trash', { size: 14 })}
                </button>
              </div>
            </div>

            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif; color: #ffffff;">${entry.title}</h3>

            <p style="color: var(--text-main); font-size: 0.95rem; line-height: 1.6; white-space: pre-line; margin-bottom: 1rem;">
              ${entry.content}
            </p>

            ${entry.photo ? `
              <div style="margin-top: 0.5rem; border-radius: var(--radius-md); overflow: hidden; max-height: 350px; background: var(--bg-surface); display: flex; justify-content: center; align-items: center; border: 1px solid var(--border-color);">
                <img src="${entry.photo}" alt="${entry.title}" style="max-width: 100%; max-height: 350px; object-fit: contain;">
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    // -------------------------------------------------------------
    // TAB 2: RESUMEN EJECUTIVO & DOSSIER
    // -------------------------------------------------------------
    const duration = calculateDuration(trip.startDate, trip.endDate);
    const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const budget = parseFloat(trip.budget) || 0;
    const visitedPlacesCount = places.filter(p => p.visited).length;
    const completedChecklistCount = checklists.filter(c => c.completed).length;

    const summaryHTML = `
      <!-- Main Overview Header Card -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(0, 242, 254, 0.1), rgba(79, 172, 254, 0.05)); border: 1px solid rgba(0, 242, 254, 0.25);">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center;">
            ${renderAppLogoSVG(48)}
          </div>
          <div>
            <h2 style="font-size: 1.5rem; color: #ffffff; margin-bottom: 0.2rem; font-family: 'Outfit', sans-serif;">${trip.name}</h2>
            <div style="color: var(--primary-cyan); font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
              ${renderIcon('map-pin', { size: 14, color: 'var(--primary-cyan)' })}
              <span>${trip.destination}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-4" style="margin-top: 1.25rem;">
          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Fechas</div>
            <div style="font-weight: 600; font-size: 0.9rem; margin-top: 0.2rem; color: #ffffff;">${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${duration} días de viaje</div>
          </div>

          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Presupuesto vs Gasto</div>
            <div style="font-weight: 700; font-size: 0.9rem; margin-top: 0.2rem; color: var(--accent-amber);">${formatMoney(totalSpent, trip.mainCurrency || 'CRC')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">de ${formatMoney(budget, trip.mainCurrency || 'CRC')}</div>
          </div>

          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Actividades & Reservas</div>
            <div style="font-weight: 600; font-size: 0.9rem; margin-top: 0.2rem; color: #ffffff;">${itinerary.length} Actividades</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${reservations.length} Reservas confirmadas</div>
          </div>

          <div style="background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Lugares & Equipaje</div>
            <div style="font-weight: 600; font-size: 0.9rem; margin-top: 0.2rem; color: #ffffff;">${visitedPlacesCount} de ${places.length} visitados</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${completedChecklistCount} tareas listas</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons for Dossier -->
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button class="btn btn-primary" id="btn-print-summary" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('print', { size: 16, color: '#0b1326' })}
          <span>Imprimir Dossier / Guardar PDF</span>
        </button>
        <button class="btn btn-secondary" id="btn-export-trip-xml" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('download', { size: 16 })}
          <span>Descargar Respaldo XML de este Viaje</span>
        </button>
      </div>

      <!-- Quick Sections Breakdown Grid -->
      <div class="grid grid-2">
        <div class="card">
          <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: #ffffff; display: flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('calendar', { size: 16, color: 'var(--primary-cyan)' })}
            <span>Próximas Actividades</span>
          </h3>
          ${itinerary.slice(0, 5).map(item => `
            <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span><strong>${formatDate(item.date)}</strong> ${item.time || ''} — ${item.title}</span>
              <span class="badge ${item.status === 'Completado' ? 'badge-default' : 'badge-tourism'}">${item.status || 'Pendiente'}</span>
            </div>
          `).join('') || '<div style="color: var(--text-muted); font-size: 0.85rem;">Sin actividades registradas.</div>'}
        </div>

        <div class="card">
          <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: #ffffff; display: flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('hotel', { size: 16, color: 'var(--accent-amber)' })}
            <span>Reservas Clave</span>
          </h3>
          ${reservations.slice(0, 5).map(res => `
            <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span><strong>${res.type}:</strong> ${res.title} (${formatDate(res.date)})</span>
              ${res.confirmationCode ? `<span class="badge badge-default">#${res.confirmationCode}</span>` : ''}
            </div>
          `).join('') || '<div style="color: var(--text-muted); font-size: 0.85rem;">Sin reservas registradas.</div>'}
        </div>
      </div>
    `;

    // -------------------------------------------------------------
    // MAIN SUITE CONTAINER LAYOUT
    // -------------------------------------------------------------
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1>Bitácora & Resumen</h1>
          <div class="page-subtitle">Diario personal de viaje, memorias y dossier ejecutivo</div>
        </div>
        <div class="header-actions">
          ${activeTab === 'journal' ? `
            <button class="btn btn-primary" id="btn-add-entry" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nueva Entrada</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Integrated 2-Tab Pillar Header -->
      <div style="display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; padding-bottom: 2px;">
        <button class="btn btn-sm ${activeTab === 'journal' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-journal" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('journal', { size: 14 })}
          <span>Diario de Viaje (${journalEntries.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-summary" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('summary', { size: 14 })}
          <span>Resumen Ejecutivo & Dossier</span>
        </button>
      </div>

      <!-- Sub-Tab Content -->
      ${activeTab === 'journal' ? `
        <div id="section-journal">${diaryListHTML}</div>
      ` : `
        <div id="section-summary">${summaryHTML}</div>
      `}
    `;

    // Attach Tab Switch Listeners
    document.getElementById('tab-sub-journal')?.addEventListener('click', () => { activeTab = 'journal'; renderContent(); });
    document.getElementById('tab-sub-summary')?.addEventListener('click', () => { activeTab = 'summary'; renderContent(); });

    // Journal Action Handlers
    document.getElementById('btn-add-entry')?.addEventListener('click', () => openJournalModal());
    document.getElementById('btn-add-entry-empty')?.addEventListener('click', () => openJournalModal());

    document.querySelectorAll('.btn-edit-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = journalEntries.find(j => j.id === id);
        if (item) openJournalModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar esta entrada del diario?')) {
          await deleteItem('journal', id);
          showToast('Entrada eliminada', 'info');
          refreshView();
        }
      });
    });

    // Summary Action Handlers
    document.getElementById('btn-print-summary')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btn-export-trip-xml')?.addEventListener('click', async () => {
      try {
        const xml = await exportTripsXML();
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `travelone_${trip.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.xml`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Respaldo XML exportado');
      } catch (err) {
        showToast('Error al exportar XML', 'error');
      }
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT JOURNAL ENTRY
  // -------------------------------------------------------------
  const openJournalModal = (item = null) => {
    const isEdit = item && item.id;
    let currentPhoto = item ? (item.photo || null) : null;

    const bodyHTML = `
      <div class="form-group">
        <label>Título de la Entrada / Vivencia *</label>
        <input type="text" id="j-title" class="form-control" placeholder="Ej. Atardecer inolvidable en la playa, Caminata por el bosque nuboso" value="${item ? item.title : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Fecha *</label>
          <input type="date" id="j-date" class="form-control" value="${item ? item.date : new Date().toISOString().split('T')[0]}" required>
        </div>

        <div class="form-group">
          <label>Lugar / Ciudad</label>
          <input type="text" id="j-location" class="form-control" placeholder="Ej. Monteverde, Puntarenas" value="${item ? (item.location || '') : ''}">
        </div>
      </div>

      <div class="form-group">
        <label>Contenido del Diario / Impresiones *</label>
        <textarea id="j-content" class="form-control" rows="5" placeholder="Describe lo que viste, sentiste, probaste o aprendiste hoy..." required>${item ? (item.content || '') : ''}</textarea>
      </div>

      <div class="form-group">
        <label>Foto de Recuerdo (Opcional)</label>
        <input type="file" id="j-photo" class="form-control" accept="image/*">
        <small style="color: var(--text-dim);">${currentPhoto ? 'Ya cuenta con foto adjunta. Puedes elegir otra para cambiarla.' : 'Se guardará offline en tu dispositivo'}</small>
      </div>
    `;

    openModal(isEdit ? 'Editar Entrada' : 'Nueva Entrada de Bitácora', bodyHTML, async () => {
      const title = document.getElementById('j-title').value.trim();
      const content = document.getElementById('j-content').value.trim();
      const date = document.getElementById('j-date').value;

      if (!title || !content || !date) {
        showToast('Indica título, contenido y fecha', 'error');
        return false;
      }

      const fileInput = document.getElementById('j-photo');
      if (fileInput.files.length > 0) {
        currentPhoto = await fileToDataURL(fileInput.files[0]);
      }

      const entryObj = {
        tripId: trip.id,
        title,
        content,
        date,
        location: document.getElementById('j-location').value.trim(),
        photo: currentPhoto
      };

      if (isEdit) entryObj.id = item.id;
      await saveItem('journal', entryObj);
      showToast(isEdit ? 'Entrada actualizada' : 'Entrada guardada en la bitácora');
      activeTab = 'journal';
      refreshView();
      return true;
    });
  };

  renderContent();
  return container;
}
