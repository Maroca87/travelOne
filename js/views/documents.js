/**
 * Documents View (Local Trip Files & Travel Passports/Vouchers)
 */

import { getAllFromStore, saveItem, deleteItem } from '../db.js';
import { fileToDataURL, showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon } from '../icons.js';

export async function renderDocumentsView(trip, refreshView) {
  if (!trip) return document.createElement('div');

  const docs = await getAllFromStore('documents', trip.id);

  const getDocIconName = (type) => {
    switch (type) {
      case 'Boletos': return 'tag';
      case 'Identificaciones': return 'user';
      case 'Seguros': return 'shield';
      case 'Comprobantes': return 'receipt';
      default: return 'documents';
    }
  };

  const listHTML = docs.length === 0 ? `
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
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
    <div class="grid-2">
      ${docs.map(doc => {
        return `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span class="badge badge-tourism">${doc.type || 'Documento'}</span>
              <div class="icon-badge-box" style="width: 32px; height: 32px;">
                ${renderIcon(getDocIconName(doc.type), { size: 16, color: 'var(--primary-cyan)' })}
              </div>
            </div>

            <h3 style="font-size: 1.15rem; margin-bottom: 0.35rem;">${doc.name}</h3>
            ${doc.notes ? `
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem; display: flex; align-items: flex-start; gap: 0.35rem;">
                ${renderIcon('notes', { size: 13, color: 'var(--text-muted)' })}
                <span>${doc.notes}</span>
              </div>
            ` : ''}

            ${doc.fileData ? `
              <div style="margin-bottom: 0.75rem; text-align: center; background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md);">
                ${doc.fileData.startsWith('data:image') ? `
                  <img src="${doc.fileData}" class="file-preview-img" style="max-height: 180px; width: 100%; object-fit: contain;">
                ` : `
                  <a href="${doc.fileData}" download="${doc.fileName || 'Documento.pdf'}" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    ${renderIcon('download', { size: 14, color: '#0b1326' })}
                    <span>Descargar ${doc.fileName || 'Archivo PDF'}</span>
                  </a>
                `}
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.75rem;">(Nota guardada sin archivo binario)</div>
            `}

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
              <button class="btn btn-danger btn-sm btn-delete-doc" data-id="${doc.id}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                ${renderIcon('trash', { size: 13 })} Eliminar
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
        <h1>Documentos del Viaje</h1>
        <div class="page-subtitle">Boletos, confirmaciones, identidades y seguros organizados localmente</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="btn-add-doc" style="display: inline-flex; align-items: center; gap: 0.4rem;">
          ${renderIcon('plus', { size: 16, color: '#0b1326' })}
          <span>Guardar Documento</span>
        </button>
      </div>
    </div>

    <!-- Security Disclaimer Alert -->
    <div style="background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
      <div class="icon-badge-box" style="width: 36px; height: 36px;">
        ${renderIcon('lock', { size: 18, color: 'var(--primary-cyan)' })}
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted);">
        <strong>Almacenamiento Local Organizado:</strong> Todos tus documentos se guardan exclusivamente dentro de la memoria de tu navegador (IndexedDB). No se envían a ningún servidor externo.
      </div>
    </div>

    ${listHTML}
  `;

  setTimeout(() => {
    container.querySelector('#btn-add-doc')?.addEventListener('click', () => openDocumentModal(trip, refreshView));
    container.querySelector('#btn-add-doc-empty')?.addEventListener('click', () => openDocumentModal(trip, refreshView));

    container.querySelectorAll('.btn-delete-doc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('¿Eliminar este documento?')) {
          await deleteItem('documents', id);
          showToast('Documento eliminado');
          refreshView();
        }
      });
    });
  }, 50);

  return container;
}

function openDocumentModal(trip, refreshView) {
  let uploadedFileData = null;
  let fileName = '';
  let fileType = '';

  const bodyHTML = `
    <div class="form-group">
      <label>Tipo de Documento *</label>
      <select id="doc-type" class="form-select">
        <option value="Reservaciones">Reservaciones / Confirmaciones</option>
        <option value="Boletos">Boletos de Vuelo / Bus</option>
        <option value="Identificaciones">Identificaciones / Pasaporte</option>
        <option value="Seguros">Seguros de Viaje</option>
        <option value="Comprobantes">Comprobantes de Pago</option>
        <option value="Otros">Otros</option>
      </select>
    </div>

    <div class="form-group">
      <label>Nombre del Documento *</label>
      <input type="text" id="doc-name" class="form-control" placeholder="Ej: Voucher Hotel Porta, Seguro de Viaje..." required>
    </div>

    <div class="form-group">
      <label>Seleccionar Archivo (Imagen o PDF)</label>
      <input type="file" id="doc-file-input" class="form-control" accept="image/*,.pdf">
    </div>

    <div class="form-group">
      <label>Notas / Descripción</label>
      <textarea id="doc-notes" class="form-control" rows="2" placeholder="Números de póliza, asientos, etc."></textarea>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('plus', { size: 18, color: 'var(--primary-cyan)' })} Guardar Documento Local</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const type = document.getElementById('doc-type').value;
    const name = document.getElementById('doc-name').value.trim();
    const notes = document.getElementById('doc-notes').value.trim();
    const fileInput = document.getElementById('doc-file-input');

    if (!name) {
      alert('Por favor indica un nombre para el documento.');
      return false;
    }

    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      fileName = file.name;
      fileType = file.type;
      uploadedFileData = await fileToDataURL(file);
    }

    const docData = {
      tripId: trip.id,
      type,
      name,
      notes,
      fileName,
      fileType,
      fileData: uploadedFileData
    };

    await saveItem('documents', docData);
    showToast('Documento guardado localmente');
    refreshView();
    return true;
  });
}

