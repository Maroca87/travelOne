/**
 * TravelOne Preparation & Safety Hub (Pillar 3)
 * Unifies 4-phase checklists, document/voucher vault, and emergency contacts directory.
 * 
 * @module js/views/checklist
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { fileToDataURL, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

/**
 * Render the unified Preparation & Safety view.
 * 
 * @param {Object} trip - The active trip model
 * @param {Function} refreshView - Callback to re-render the view
 * @param {string} [initialTab='checklist'] - Initial active tab ('checklist' | 'documents' | 'contacts')
 * @returns {Promise<HTMLElement>} The rendered container element
 */
export async function renderChecklistView(trip, refreshView, initialTab = 'checklist') {
  if (!trip) return document.createElement('div');

  const checklists = await getAllFromStore('checklists', trip.id);
  const docs = await getAllFromStore('documents', trip.id);
  const contacts = await getAllFromStore('contacts', trip.id);

  let activeTab = initialTab;

  const container = document.createElement('div');

  const renderContent = () => {
    // -------------------------------------------------------------
    // TAB 1: CHECKLIST 4 FASES
    // -------------------------------------------------------------
    const totalItems = checklists.length;
    const completedItems = checklists.filter(c => c.completed).length;
    const overallPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const groups = ['Antes del viaje', 'Equipaje', 'Durante el viaje', 'Regreso'];

    const getGroupIconName = (groupName) => {
      switch (groupName) {
        case 'Antes del viaje': return 'plane';
        case 'Equipaje': return 'shopping';
        case 'Durante el viaje': return 'compass';
        case 'Regreso': return 'home';
        default: return 'checklist';
      }
    };

    const checklistGroupsHTML = groups.map(groupName => {
      const groupItems = checklists.filter(c => c.group === groupName);
      const groupDone = groupItems.filter(c => c.completed).length;
      const groupPct = groupItems.length > 0 ? Math.round((groupDone / groupItems.length) * 100) : 0;

      return `
        <div class="card" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="background: rgba(255,255,255,0.06); padding: 0.45rem; border-radius: var(--radius-sm); display: flex;">
                ${renderIcon(getGroupIconName(groupName), { size: 16, color: 'var(--primary-cyan)' })}
              </div>
              <h3 style="font-size: 1.1rem; margin: 0; font-family: 'Outfit', sans-serif; color: #ffffff;">${groupName}</h3>
            </div>
            <span style="font-size: 0.85rem; color: var(--text-muted);">${groupDone} de ${groupItems.length} (${groupPct}%)</span>
          </div>

          <div class="progress-container" style="height: 6px; margin-bottom: 0.85rem;">
            <div class="progress-bar" style="width: ${groupPct}%;"></div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.45rem;">
            ${groupItems.length === 0 ? `
              <div style="font-size: 0.85rem; color: var(--text-dim); padding: 0.5rem 0;">No hay elementos en esta fase.</div>
            ` : groupItems.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); gap: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.65rem; cursor: pointer; flex: 1; margin: 0; font-size: 0.92rem; ${item.completed ? 'text-decoration: line-through; color: var(--text-dim);' : 'color: var(--text-main);'}">
                  <input type="checkbox" class="chk-toggle-task" data-id="${item.id}" ${item.completed ? 'checked' : ''} style="accent-color: var(--primary-cyan); width: 18px; height: 18px;">
                  <span>${item.text}</span>
                </label>
                <div style="display: flex; gap: 0.25rem;">
                  <button class="btn btn-secondary btn-sm btn-edit-chk" data-id="${item.id}" title="Editar" style="padding: 0.2rem 0.4rem;">
                    ${renderIcon('edit', { size: 12 })}
                  </button>
                  <button class="btn btn-danger btn-sm btn-delete-chk" data-id="${item.id}" title="Eliminar" style="padding: 0.2rem 0.4rem;">
                    ${renderIcon('trash', { size: 12 })}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // -------------------------------------------------------------
    // TAB 2: BÓVEDA DE DOCUMENTOS
    // -------------------------------------------------------------
    const getDocIconName = (type) => {
      switch (type) {
        case 'Boletos': return 'plane';
        case 'Identificaciones': return 'user';
        case 'Seguros': return 'shield';
        case 'Comprobantes': return 'receipt';
        default: return 'documents';
      }
    };

    const documentsListHTML = docs.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('documents', { size: 48, color: 'var(--primary-cyan)' })}
        </div>
        <h3>Sin documentos guardados</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Guarda boletos, confirmaciones, seguros o identificaciones localmente en tu dispositivo.</p>
        <button class="btn btn-primary" id="btn-add-doc-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Documento</span>
        </button>
      </div>
    ` : `
      <div class="grid grid-3">
        ${docs.map(doc => `
          <div class="card" style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span class="badge badge-tourism">${doc.type || 'Documento'}</span>
              <div style="background: rgba(255,255,255,0.06); padding: 0.4rem; border-radius: var(--radius-sm); display: flex;">
                ${renderIcon(getDocIconName(doc.type), { size: 16, color: 'var(--primary-cyan)' })}
              </div>
            </div>

            <h4 style="font-size: 1.1rem; font-family: 'Outfit', sans-serif; margin-bottom: 0.35rem; color: #ffffff;">${doc.name}</h4>

            ${doc.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.35rem 0; flex: 1;">${doc.notes}</p>` : '<div style="flex: 1;"></div>'}

            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              ${doc.fileData ? `
                <a href="${doc.fileData}" download="${doc.fileName || doc.name}" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem;">
                  ${renderIcon('download', { size: 13 })} Descargar Archivo
                </a>
              ` : '<span style="font-size: 0.8rem; color: var(--text-dim);">Solo texto</span>'}

              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-edit-doc" data-id="${doc.id}" title="Editar">
                  ${renderIcon('edit', { size: 14 })}
                </button>
                <button class="btn btn-danger btn-sm btn-delete-doc" data-id="${doc.id}" title="Eliminar">
                  ${renderIcon('trash', { size: 14 })}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // -------------------------------------------------------------
    // TAB 3: DIRECTORIO DE CONTACTOS & S.O.S
    // -------------------------------------------------------------
    const contactsListHTML = contacts.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
          ${renderIcon('contacts', { size: 48, color: 'var(--primary-cyan)' })}
        </div>
        <h3>Directorio de contactos vacío</h3>
        <p style="color: var(--text-muted); margin: 0.5rem 0 1.5rem 0;">Guarda teléfonos de tu hotel, guías de tour, embajada o números de emergencia.</p>
        <button class="btn btn-primary" id="btn-add-contact-empty" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Agregar Contacto</span>
        </button>
      </div>
    ` : `
      <div class="grid grid-3">
        ${contacts.map(c => `
          <div class="card" style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span class="badge badge-tourism">${c.type || 'Contacto'}</span>
              <div style="background: rgba(255,255,255,0.06); padding: 0.4rem; border-radius: var(--radius-sm); display: flex;">
                ${renderIcon('user', { size: 16, color: 'var(--primary-cyan)' })}
              </div>
            </div>

            <h4 style="font-size: 1.1rem; font-family: 'Outfit', sans-serif; margin-bottom: 0.35rem; color: #ffffff;">${c.name}</h4>

            <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; margin: 0.5rem 0; flex: 1;">
              ${c.phone ? `
                <div style="margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
                  ${renderIcon('phone', { size: 14, color: 'var(--primary-cyan)' })}
                  <span><a href="tel:${c.phone}" style="color: var(--primary-cyan); text-decoration: none; font-weight: 600;">${c.phone}</a></span>
                </div>
              ` : ''}
              ${c.email ? `
                <div style="margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
                  ${renderIcon('mail', { size: 14, color: 'var(--primary-cyan)' })}
                  <span><a href="mailto:${c.email}" style="color: var(--text-main); text-decoration: none;">${c.email}</a></span>
                </div>
              ` : ''}
              ${c.notes ? `<div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem;">${c.notes}</div>` : ''}
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.35rem; margin-top: 0.5rem;">
              <button class="btn btn-secondary btn-sm btn-edit-contact" data-id="${c.id}" title="Editar">
                ${renderIcon('edit', { size: 14 })}
              </button>
              <button class="btn btn-danger btn-sm btn-delete-contact" data-id="${c.id}" title="Eliminar">
                ${renderIcon('trash', { size: 14 })}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // -------------------------------------------------------------
    // MAIN SUITE CONTAINER LAYOUT
    // -------------------------------------------------------------
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1>Preparativos & Equipaje</h1>
          <div class="page-subtitle">Checklists de viaje, documentos offline y directorio de emergencias</div>
        </div>
        <div class="header-actions">
          ${activeTab === 'checklist' ? `
            <button class="btn btn-primary" id="btn-add-task" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nueva Tarea</span>
            </button>
          ` : (activeTab === 'documents' ? `
            <button class="btn btn-primary" id="btn-add-document" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nuevo Documento</span>
            </button>
          ` : `
            <button class="btn btn-primary" id="btn-add-contact" style="display: inline-flex; align-items: center; gap: 0.4rem;">
              ${renderIcon('plus', { size: 16, color: '#0b1326' })}
              <span>Nuevo Contacto</span>
            </button>
          `)}
        </div>
      </div>

      <!-- Integrated 3-Tab Pillar Header -->
      <div style="display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; padding-bottom: 2px;">
        <button class="btn btn-sm ${activeTab === 'checklist' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-checklist" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('checklist', { size: 14 })}
          <span>Checklist 4 Fases (${completedItems}/${totalItems})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'documents' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-documents" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('documents', { size: 14 })}
          <span>Bóveda de Documentos (${docs.length})</span>
        </button>
        <button class="btn btn-sm ${activeTab === 'contacts' ? 'btn-primary' : 'btn-secondary'}" id="tab-sub-contacts" style="border-radius: var(--radius-md) var(--radius-md) 0 0; display: inline-flex; align-items: center; gap: 0.4rem; flex-shrink: 0; white-space: nowrap;">
          ${renderIcon('contacts', { size: 14 })}
          <span>Contactos & Emergencias (${contacts.length})</span>
        </button>
      </div>

      <!-- Sub-Tab Content -->
      ${activeTab === 'checklist' ? `
        <div id="section-checklist">${checklistGroupsHTML}</div>
      ` : (activeTab === 'documents' ? `
        <div id="section-documents">${documentsListHTML}</div>
      ` : `
        <div id="section-contacts">${contactsListHTML}</div>
      `)}
    `;

    // Attach Tab Switch Listeners
    document.getElementById('tab-sub-checklist')?.addEventListener('click', () => { activeTab = 'checklist'; renderContent(); });
    document.getElementById('tab-sub-documents')?.addEventListener('click', () => { activeTab = 'documents'; renderContent(); });
    document.getElementById('tab-sub-contacts')?.addEventListener('click', () => { activeTab = 'contacts'; renderContent(); });

    // Checklist Action Handlers
    document.getElementById('btn-add-task')?.addEventListener('click', () => openChecklistModal());

    document.querySelectorAll('.chk-toggle-task').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = parseInt(chk.getAttribute('data-id'));
        const item = checklists.find(c => c.id === id);
        if (item) {
          item.completed = chk.checked;
          await saveItem('checklists', item);
          showToast(item.completed ? '¡Tarea completada!' : 'Tarea pendiente');
          refreshView();
        }
      });
    });

    document.querySelectorAll('.btn-edit-chk').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = checklists.find(c => c.id === id);
        if (item) openChecklistModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-chk').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar esta tarea?')) {
          await deleteItem('checklists', id);
          showToast('Tarea eliminada', 'info');
          refreshView();
        }
      });
    });

    // Document Action Handlers
    document.getElementById('btn-add-document')?.addEventListener('click', () => openDocumentModal());
    document.getElementById('btn-add-doc-empty')?.addEventListener('click', () => openDocumentModal());

    document.querySelectorAll('.btn-edit-doc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = docs.find(d => d.id === id);
        if (item) openDocumentModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-doc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar este documento?')) {
          await deleteItem('documents', id);
          showToast('Documento eliminado', 'info');
          refreshView();
        }
      });
    });

    // Contact Action Handlers
    document.getElementById('btn-add-contact')?.addEventListener('click', () => openContactModal());
    document.getElementById('btn-add-contact-empty')?.addEventListener('click', () => openContactModal());

    document.querySelectorAll('.btn-edit-contact').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const item = contacts.find(c => c.id === id);
        if (item) openContactModal(item);
      });
    });

    document.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Deseas eliminar este contacto?')) {
          await deleteItem('contacts', id);
          showToast('Contacto eliminado', 'info');
          refreshView();
        }
      });
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT CHECKLIST ITEM
  // -------------------------------------------------------------
  const openChecklistModal = (item = null) => {
    const isEdit = item && item.id;
    const bodyHTML = `
      <div class="form-group">
        <label>Tarea / Artículo para equipaje *</label>
        <input type="text" id="chk-text" class="form-control" placeholder="Ej. Renovar pasaporte, Protector solar, Check-in de vuelo" value="${item ? item.text : ''}" required>
      </div>

      <div class="form-group">
        <label>Fase de Viaje</label>
        <select id="chk-group" class="form-select">
          ${['Antes del viaje', 'Equipaje', 'Durante el viaje', 'Regreso'].map(g => `
            <option value="${g}" ${item && item.group === g ? 'selected' : ''}>${g}</option>
          `).join('')}
        </select>
      </div>
    `;

    openModal(isEdit ? 'Editar Tarea' : 'Nueva Tarea / Equipaje', bodyHTML, async () => {
      const text = document.getElementById('chk-text').value.trim();
      if (!text) {
        showToast('El texto de la tarea es obligatorio', 'error');
        return false;
      }

      const chkObj = {
        tripId: trip.id,
        text,
        group: document.getElementById('chk-group').value,
        completed: item ? item.completed : false
      };

      if (isEdit) chkObj.id = item.id;
      await saveItem('checklists', chkObj);
      showToast(isEdit ? 'Tarea actualizada' : 'Tarea guardada');
      activeTab = 'checklist';
      refreshView();
      return true;
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT DOCUMENT
  // -------------------------------------------------------------
  const openDocumentModal = (item = null) => {
    const isEdit = item && item.id;
    let currentFileData = item ? (item.fileData || null) : null;
    let currentFileName = item ? (item.fileName || null) : null;

    const bodyHTML = `
      <div class="form-group">
        <label>Nombre del Documento *</label>
        <input type="text" id="doc-name" class="form-control" placeholder="Ej. Póliza Seguro de Viaje, Pasaporte, Boleto Aéreo" value="${item ? item.name : ''}" required>
      </div>

      <div class="form-group">
        <label>Tipo de Documento</label>
        <select id="doc-type" class="form-select">
          ${['Boletos', 'Identificaciones', 'Seguros', 'Comprobantes', 'Otro'].map(t => `
            <option value="${t}" ${item && item.type === t ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Archivo Adjunto (Imagen o PDF)</label>
        <input type="file" id="doc-file" class="form-control" accept="image/*,.pdf">
        <small style="color: var(--text-dim);" id="doc-file-label">${currentFileName ? `Archivo actual: ${currentFileName}` : 'Se almacena en tu dispositivo para acceso offline'}</small>
      </div>

      <div class="form-group">
        <label>Notas / Números de póliza o referencia</label>
        <textarea id="doc-notes" class="form-control" rows="2" placeholder="Número de asistencia médica, teléfono de emergencias de la póliza...">${item ? (item.notes || '') : ''}</textarea>
      </div>
    `;

    openModal(isEdit ? 'Editar Documento' : 'Nuevo Documento', bodyHTML, async () => {
      const name = document.getElementById('doc-name').value.trim();
      if (!name) {
        showToast('El nombre del documento es obligatorio', 'error');
        return false;
      }

      const fileInput = document.getElementById('doc-file');
      if (fileInput.files.length > 0) {
        currentFileData = await fileToDataURL(fileInput.files[0]);
        currentFileName = fileInput.files[0].name;
      }

      const docObj = {
        tripId: trip.id,
        name,
        type: document.getElementById('doc-type').value,
        notes: document.getElementById('doc-notes').value.trim(),
        fileData: currentFileData,
        fileName: currentFileName
      };

      if (isEdit) docObj.id = item.id;
      await saveItem('documents', docObj);
      showToast(isEdit ? 'Documento actualizado' : 'Documento guardado');
      activeTab = 'documents';
      refreshView();
      return true;
    });
  };

  // -------------------------------------------------------------
  // MODAL: ADD / EDIT CONTACT
  // -------------------------------------------------------------
  const openContactModal = (item = null) => {
    const isEdit = item && item.id;
    const bodyHTML = `
      <div class="form-group">
        <label>Nombre / Entidad *</label>
        <input type="text" id="cnt-name" class="form-control" placeholder="Ej. Hotel Arenal Recepción, Guía Carlos, Embajada" value="${item ? item.name : ''}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Teléfono</label>
          <input type="tel" id="cnt-phone" class="form-control" placeholder="+506 2222-0000" value="${item ? (item.phone || '') : ''}">
        </div>

        <div class="form-group">
          <label>Tipo de Contacto</label>
          <select id="cnt-type" class="form-select">
            ${['Emergencias', 'Hospedaje', 'Transporte', 'Guía', 'Embajada / Consulado', 'Otro'].map(t => `
              <option value="${t}" ${item && item.type === t ? 'selected' : ''}>${t}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Correo Electrónico</label>
        <input type="email" id="cnt-email" class="form-control" placeholder="contacto@hotel.com" value="${item ? (item.email || '') : ''}">
      </div>

      <div class="form-group">
        <label>Notas / Dirección</label>
        <textarea id="cnt-notes" class="form-control" rows="2" placeholder="Horario de atención, extensión telefónica...">${item ? (item.notes || '') : ''}</textarea>
      </div>
    `;

    openModal(isEdit ? 'Editar Contacto' : 'Nuevo Contacto de Emergencia', bodyHTML, async () => {
      const name = document.getElementById('cnt-name').value.trim();
      if (!name) {
        showToast('El nombre del contacto es obligatorio', 'error');
        return false;
      }

      const cntObj = {
        tripId: trip.id,
        name,
        phone: document.getElementById('cnt-phone').value.trim(),
        type: document.getElementById('cnt-type').value,
        email: document.getElementById('cnt-email').value.trim(),
        notes: document.getElementById('cnt-notes').value.trim()
      };

      if (isEdit) cntObj.id = item.id;
      await saveItem('contacts', cntObj);
      showToast(isEdit ? 'Contacto actualizado' : 'Contacto guardado');
      activeTab = 'contacts';
      refreshView();
      return true;
    });
  };

  renderContent();
  return container;
}
