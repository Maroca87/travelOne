/**
 * Auth View (Local Login & User Registration) - Costa Rica Edition 🇨🇷
 */

import { registerUser, loginUser } from '../db.js';
import { showToast } from '../utils.js';

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
          <img src="./app-logo.png" alt="TravelOne iOS Icon" style="width: 90px; height: 90px; border-radius: 22px; margin-bottom: 0.75rem; box-shadow: 0 10px 25px rgba(0, 242, 254, 0.35); border: 2px solid rgba(255, 255, 255, 0.2);">
          
          <h1 style="font-size: 1.9rem; background: linear-gradient(135deg, var(--primary-cyan), #00b09b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            TravelOne
          </h1>
          <div style="font-size: 0.85rem; color: var(--accent-amber); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.2rem;">
            ¡Pura Vida! • Edición Costa Rica 🇨🇷
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">
            Tu organizador personal de viajes local y offline
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
              <input type="text" id="auth-name" class="form-control" placeholder="Ej: Juan Carlos, María..." required>
            </div>
          ` : ''}

          <div class="form-group">
            <label>Nombre de Usuario *</label>
            <input type="text" id="auth-username" class="form-control" placeholder="Ej: tico_viajero" required>
          </div>

          <div class="form-group">
            <label>Contraseña / PIN *</label>
            <input type="password" id="auth-password" class="form-control" placeholder="••••••••" required>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem;">
            ${isRegisterTab ? '✨ Crear mi Cuenta Local' : '🚀 Iniciar Sesión'}
          </button>
        </form>

        <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem; text-align: center; font-size: 0.75rem; color: var(--text-dim);">
          🔒 Tus usuarios y datos se guardan exclusivamente en tu dispositivo (IndexedDB local).
        </div>
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

    container.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = container.querySelector('#auth-username').value;
      const password = container.querySelector('#auth-password').value;

      try {
        if (isRegisterTab) {
          const name = container.querySelector('#auth-name').value;
          const user = await registerUser(username, name, password);
          showToast(`¡Bienvenido Pura Vida, ${user.name}!`);
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
