/**
 * TravelOne Responsive Navigation Component
 * Generates the desktop sidebar, mobile header bar, and fixed bottom tab bar for the 4 core pillars.
 * 
 * @module js/components/nav
 */

import { renderIcon, renderAppLogoSVG } from '../icons.js';

/**
 * Render the complete application navigation layout.
 * 
 * @param {string} activeView - The currently selected view name
 * @param {Object|null} currentTrip - The active trip model or null
 * @param {Object|null} currentUser - The authenticated user profile or null
 * @returns {string} Combined HTML markup for sidebar and mobile navigation
 */
export function renderNavigation(activeView, currentTrip, currentUser) {
  const tripName = currentTrip ? currentTrip.name : 'Sin Viaje';
  const userName = currentUser ? currentUser.name : 'Usuario';

  // Mobile Top Bar HTML
  const mobileTopBarHTML = `
    <header class="mobile-top-bar">
      <div class="mobile-brand">
        ${renderAppLogoSVG(32)}
        <div>
          <div class="mobile-brand-title">TravelOne</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 0.3rem;">
            ${renderIcon('user', { size: 12, color: 'var(--primary-cyan)' })}
            <span>${userName}</span>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-danger btn-sm" id="btn-mobile-logout" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
          ${renderIcon('logout', { size: 14 })}
          <span>Salir</span>
        </button>
      </div>
    </header>
  `;
  
  // Desktop Sidebar HTML
  const sidebarHTML = `
    <aside class="sidebar">
      <div class="sidebar-header" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${renderAppLogoSVG(42)}
          <div class="brand-logo">
            <span>TravelOne</span>
            <span class="brand-badge">PWA</span>
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; display: flex; align-items: center; gap: 0.35rem;">
          ${renderIcon('user', { size: 14, color: 'var(--primary-cyan)' })}
          <span>Hola, <strong>${userName}</strong></span>
        </div>
      </div>

      <div class="sidebar-nav">
        <a class="nav-item ${activeView === 'home' ? 'active' : ''}" data-view="home">
          <span class="nav-item-icon">${renderIcon('home', { size: 19 })}</span>
          <span>Mis Viajes</span>
        </a>

        ${currentTrip ? `
          <div style="margin: 0.85rem 0 0.35rem 0.75rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim); display: flex; align-items: center; gap: 0.4rem;">
            ${renderIcon('plane', { size: 13, color: 'var(--primary-cyan)' })}
            <span>${tripName}</span>
          </div>

          <a class="nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
            <span class="nav-item-icon">${renderIcon('dashboard', { size: 19 })}</span>
            <span>Dashboard</span>
          </a>

          <a class="nav-item ${['itinerary', 'places', 'reservations'].includes(activeView) ? 'active' : ''}" data-view="itinerary">
            <span class="nav-item-icon">${renderIcon('calendar', { size: 19 })}</span>
            <span>Itinerario & Logística</span>
          </a>

          <a class="nav-item ${['expenses', 'budget', 'shopping'].includes(activeView) ? 'active' : ''}" data-view="expenses">
            <span class="nav-item-icon">${renderIcon('wallet', { size: 19 })}</span>
            <span>Finanzas de Viaje</span>
          </a>

          <a class="nav-item ${['checklist', 'documents', 'contacts'].includes(activeView) ? 'active' : ''}" data-view="checklist">
            <span class="nav-item-icon">${renderIcon('checklist', { size: 19 })}</span>
            <span>Preparativos & Equipaje</span>
          </a>

          <a class="nav-item ${['journal', 'summary'].includes(activeView) ? 'active' : ''}" data-view="journal">
            <span class="nav-item-icon">${renderIcon('journal', { size: 19 })}</span>
            <span>Bitácora & Resumen</span>
          </a>
        ` : ''}
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: auto;">
        <button class="btn btn-danger btn-sm" id="btn-app-logout" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
          ${renderIcon('logout', { size: 16 })}
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  `;

  // Mobile Bottom Navigation HTML (5 Clear Options)
  const bottomNavHTML = `
    <nav class="bottom-nav">
      <a class="bottom-nav-item ${activeView === 'home' ? 'active' : ''}" data-view="home">
        <span class="icon">${renderIcon('home', { size: 20 })}</span>
        <span>Inicio</span>
      </a>
      ${currentTrip ? `
        <a class="bottom-nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
          <span class="icon">${renderIcon('dashboard', { size: 20 })}</span>
          <span>Panel</span>
        </a>
        <a class="bottom-nav-item ${['itinerary', 'places', 'reservations'].includes(activeView) ? 'active' : ''}" data-view="itinerary">
          <span class="icon">${renderIcon('calendar', { size: 20 })}</span>
          <span>Itinerario</span>
        </a>
        <a class="bottom-nav-item ${['expenses', 'budget', 'shopping'].includes(activeView) ? 'active' : ''}" data-view="expenses">
          <span class="icon">${renderIcon('wallet', { size: 20 })}</span>
          <span>Finanzas</span>
        </a>
        <a class="bottom-nav-item ${['checklist', 'documents', 'contacts'].includes(activeView) ? 'active' : ''}" data-view="checklist">
          <span class="icon">${renderIcon('checklist', { size: 20 })}</span>
          <span>Preparar</span>
        </a>
        <a class="bottom-nav-item ${['journal', 'summary'].includes(activeView) ? 'active' : ''}" data-view="journal">
          <span class="icon">${renderIcon('journal', { size: 20 })}</span>
          <span>Bitácora</span>
        </a>
      ` : ''}
    </nav>
  `;

  return mobileTopBarHTML + sidebarHTML + bottomNavHTML;
}
