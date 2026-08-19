/**
 * TravelOne Modal Dialog Engine
 * Manages modal overlays, custom HTML bodies, backdrop dismissals, and asynchronous confirmations.
 * 
 * @module js/components/modal
 */

/**
 * Open an interactive modal dialog overlay.
 * 
 * @param {string} title - Modal header title string or HTML
 * @param {string} bodyHTML - Inner form or content HTML string
 * @param {Function|null} [onConfirm=null] - Async callback when primary action is triggered. Return false to prevent closing.
 * @param {string} [confirmText='Guardar'] - Text label for the primary action button
 */
export function openModal(title, bodyHTML, onConfirm = null, confirmText = 'Guardar') {
  let modalContainer = document.getElementById('travelone-modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'travelone-modal-container';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div class="modal-backdrop active" id="modal-backdrop">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-btn-close">&times;</button>
        </div>
        <div class="modal-body">
          ${bodyHTML}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-btn-cancel">Cancelar</button>
          ${onConfirm ? `<button class="btn btn-primary" id="modal-btn-confirm">${confirmText}</button>` : ''}
        </div>
      </div>
    </div>
  `;

  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-btn-close');
  const cancelBtn = document.getElementById('modal-btn-cancel');
  const confirmBtn = document.getElementById('modal-btn-confirm');

  const closeModal = () => {
    backdrop.classList.remove('active');
    setTimeout(() => {
      modalContainer.innerHTML = '';
    }, 250);
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  if (confirmBtn && onConfirm) {
    confirmBtn.addEventListener('click', async () => {
      const shouldClose = await onConfirm(closeModal);
      if (shouldClose !== false) {
        closeModal();
      }
    });
  }
}
