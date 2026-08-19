/**
 * Auth View (Local Login & User Registration)
 */

import { registerUser, loginUser, resetPassword } from '../db.js';
import { showToast } from '../utils.js';
import { openModal } from '../components/modal.js';
import { renderIcon, renderAppLogoSVG } from '../icons.js';

export function renderAuthView(onAuthSuccess) {
  let isRegisterTab = false;

  const container = document.createElement('div');
  container.className = 'auth-page-container';
  container.style.cssText = `
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: radial-gradient(circle at top right, #13243f, #0b1326);
  `;

  const renderCard = () => {
    container.innerHTML = `
      <div class="card" style="width: 100%; max-width: 440px; border-color: rgba(0, 242, 254, 0.3); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="display: inline-block; margin-bottom: 0.75rem;">
            ${renderAppLogoSVG(88)}
          </div>
          
          <h1 style="font-size: 1.9rem; background: linear-gradient(135deg, var(--primary-cyan), #00b09b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            TravelOne
          </h1>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">
            Organizador personal de viajes local y offline
          </div>
        </div>

        <!-- Tab Switcher -->
        <div style="display: flex; background: var(--bg-surface); padding: 0.3rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <button class="btn btn-sm" id="btn-tab-login" style="flex: 1; border-radius: var(--radius-sm); ${!isRegisterTab ? 'background: linear-gradient(135deg, var(--primary-cyan), var(--primary-blue)); color: #0b1326; font-weight: 700;' : 'background: transparent; color: var(--text-muted);'}">
            Iniciar Sesión
          </button>
          <button class="btn btn-sm" id="btn-tab-register" style="flex: 1; border-radius: var(--radius-sm); ${isRegisterTab ? 'background: linear-gradient(135deg, var(--primary-cyan), var(--primary-blue)); color: #0b1326; font-weight: 700;' : 'background: transparent; color: var(--text-muted);'}">
            Crear Cuenta
          </button>
        </div>

        <!-- Form Body -->
        <form id="auth-form">
          ${isRegisterTab ? `
            <div class="form-group">
              <label>Nombre Completo *</label>
              <input type="text" id="auth-name" class="form-control" required>
            </div>
          ` : ''}

          <div class="form-group">
            <label>Nombre de Usuario *</label>
            <input type="text" id="auth-username" class="form-control" required>
          </div>

          <div class="form-group">
            <label>Contraseña / PIN *</label>
            <input type="password" id="auth-password" class="form-control" required>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            ${isRegisterTab ? `${renderIcon('sparkles', { size: 18, color: '#0b1326' })} Crear Cuenta` : `${renderIcon('rocket', { size: 18, color: '#0b1326' })} Iniciar Sesión`}
          </button>
        </form>

        ${!isRegisterTab ? `
          <div style="text-align: center; margin-top: 1rem;">
            <button class="btn btn-secondary btn-sm" id="btn-forgot-password" style="font-size: 0.8rem; background: transparent; border: none; color: var(--primary-cyan); display: inline-flex; align-items: center; gap: 0.35rem;">
              ${renderIcon('key', { size: 14, color: 'var(--primary-cyan)' })} ¿Olvidaste tu contraseña?
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Attach events
    container.querySelector('#btn-tab-login').addEventListener('click', () => {
      isRegisterTab = false;
      renderCard();
    });

    container.querySelector('#btn-tab-register').addEventListener('click', () => {
      isRegisterTab = true;
      renderCard();
    });

    container.querySelector('#btn-forgot-password')?.addEventListener('click', () => {
      openPasswordRecoveryModal();
    });

    container.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = container.querySelector('#auth-username').value;
      const password = container.querySelector('#auth-password').value;

      try {
        if (isRegisterTab) {
          const name = container.querySelector('#auth-name').value;
          const user = await registerUser(username, name, password);
          showToast(`¡Bienvenido, ${user.name}!`);
          onAuthSuccess(user);
        } else {
          const user = await loginUser(username, password);
          showToast(`¡Hola de nuevo, ${user.name}!`);
          onAuthSuccess(user);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  };

  renderCard();
  return container;
}

function openPasswordRecoveryModal() {
  const bodyHTML = `
    <div class="form-group">
      <label>Ingresa tu Nombre de Usuario registrado *</label>
      <input type="text" id="rec-username" class="form-control" required>
    </div>

    <div class="form-group">
      <label>Nueva Contraseña / PIN *</label>
      <input type="password" id="rec-new-password" class="form-control" required>
    </div>
  `;

  const modalTitle = `<span class="icon-inline">${renderIcon('key', { size: 20, color: 'var(--primary-cyan)' })} Recuperar / Restablecer Contraseña</span>`;

  openModal(modalTitle, bodyHTML, async () => {
    const username = document.getElementById('rec-username').value.trim();
    const newPassword = document.getElementById('rec-new-password').value.trim();

    if (!username || !newPassword) {
      alert('Por favor ingresa usuario y nueva contraseña.');
      return false;
    }

    try {
      await resetPassword(username, newPassword);
      showToast('Contraseña restablecida exitosamente');
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  });
}

