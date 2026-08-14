/**
 * TravelOne Responsive Navigation Component
 */

export function renderNavigation(activeView, currentTrip) {
  const tripName = currentTrip ? currentTrip.name : 'Sin Viaje';
  
  // Desktop Sidebar HTML
  const sidebarHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-logo">
          <span>✈️ TravelOne</span>
          <span class="brand-badge">PWA</span>
        </div>
      </div>

      <div class="sidebar-nav">
        <a class="nav-item ${activeView === 'home' ? 'active' : ''}" data-view="home">
          <span class="nav-item-icon">🏠</span>
          <span>Mis Viajes</span>
        </a>

        ${currentTrip ? `
          <div style="margin: 0.75rem 0 0.25rem 0.75rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-dim);">
            ${tripName}
          </div>

          <a class="nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
            <span class="nav-item-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a class="nav-item ${activeView === 'itinerary' ? 'active' : ''}" data-view="itinerary">
            <span class="nav-item-icon">📅</span>
            <span>Itinerario</span>
          </a>
          <a class="nav-item ${activeView === 'reservations' ? 'active' : ''}" data-view="reservations">
            <span class="nav-item-icon">🏨</span>
            <span>Reservas</span>
          </a>
          <a class="nav-item ${activeView === 'expenses' ? 'active' : ''}" data-view="expenses">
            <span class="nav-item-icon">💳</span>
            <span>Gastos</span>
          </a>
          <a class="nav-item ${activeView === 'budget' ? 'active' : ''}" data-view="budget">
            <span class="nav-item-icon">🎯</span>
            <span>Presupuesto</span>
          </a>
          <a class="nav-item ${activeView === 'places' ? 'active' : ''}" data-view="places">
            <span class="nav-item-icon">📍</span>
            <span>Lugares</span>
          </a>
          <a class="nav-item ${activeView === 'shopping' ? 'active' : ''}" data-view="shopping">
            <span class="nav-item-icon">🛍️</span>
            <span>Compras</span>
          </a>
          <a class="nav-item ${activeView === 'checklist' ? 'active' : ''}" data-view="checklist">
            <span class="nav-item-icon">✅</span>
            <span>Checklist</span>
          </a>
          <a class="nav-item ${activeView === 'documents' ? 'active' : ''}" data-view="documents">
            <span class="nav-item-icon">📄</span>
            <span>Documentos</span>
          </a>
          <a class="nav-item ${activeView === 'contacts' ? 'active' : ''}" data-view="contacts">
            <span class="nav-item-icon">📇</span>
            <span>Contactos</span>
          </a>
          <a class="nav-item ${activeView === 'journal' ? 'active' : ''}" data-view="journal">
            <span class="nav-item-icon">📖</span>
            <span>Diario</span>
          </a>
          <a class="nav-item ${activeView === 'summary' ? 'active' : ''}" data-view="summary">
            <span class="nav-item-icon">📌</span>
            <span>Resumen</span>
          </a>
        ` : ''}
      </div>
    </aside>
  `;

  // Mobile Bottom Navigation HTML
  const bottomNavHTML = `
    <nav class="bottom-nav">
      <a class="bottom-nav-item ${activeView === 'home' ? 'active' : ''}" data-view="home">
        <span class="icon">🏠</span>
        <span>Inicio</span>
      </a>
      ${currentTrip ? `
        <a class="bottom-nav-item ${activeView === 'itinerary' ? 'active' : ''}" data-view="itinerary">
          <span class="icon">📅</span>
          <span>Itinerario</span>
        </a>
        <a class="bottom-nav-item ${activeView === 'expenses' ? 'active' : ''}" data-view="expenses">
          <span class="icon">💳</span>
          <span>Gastos</span>
        </a>
        <a class="bottom-nav-item ${activeView === 'places' ? 'active' : ''}" data-view="places">
          <span class="icon">📍</span>
          <span>Lugares</span>
        </a>
        <a class="bottom-nav-item ${['dashboard','reservations','budget','shopping','checklist','documents','contacts','journal','summary'].includes(activeView) ? 'active' : ''}" data-view="dashboard">
          <span class="icon">⚙️</span>
          <span>Más</span>
        </a>
      ` : ''}
    </nav>
  `;

  return sidebarHTML + bottomNavHTML;
}
