/**
 * TravelOne PWA Application Controller - Costa Rica Edition 🇨🇷
 */

import { seedDemoDataIfNeeded } from './seed.js';
import { getAllFromStore, getItemById } from './db.js';
import { renderNavigation } from './components/nav.js';
import { renderQuickToolsFAB, openCurrencyConverterModal } from './components/quickTools.js';

import { renderAuthView } from './views/auth.js';
import { renderHomeView } from './views/home.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderItineraryView } from './views/itinerary.js';
import { renderReservationsView } from './views/reservations.js';
import { renderExpensesView } from './views/expenses.js';
import { renderBudgetView } from './views/budget.js';
import { renderPlacesView } from './views/places.js';
import { renderShoppingView } from './views/shopping.js';
import { renderChecklistView } from './views/checklist.js';
import { renderDocumentsView } from './views/documents.js';
import { renderContactsView } from './views/contacts.js';
import { renderJournalView } from './views/journal.js';
import { renderSummaryView } from './views/summary.js';

class TravelOneApp {
  constructor() {
    this.activeView = 'home';
    this.currentUser = JSON.parse(localStorage.getItem('travelone_current_user')) || null;
    this.currentTripId = localStorage.getItem('travelone_current_trip_id') || 'trip-cr-2026';
    this.currentTrip = null;
    this.appLayout = document.getElementById('app-layout');
  }

  async init() {
    // 1. Seed demo user & data if needed
    await seedDemoDataIfNeeded();

    // 2. Load default user if none set
    if (!this.currentUser) {
      const users = await getAllFromStore('users');
      if (users.length > 0) {
        this.currentUser = users[0];
        localStorage.setItem('travelone_current_user', JSON.stringify(this.currentUser));
      }
    }

    // 3. Load active trip
    if (this.currentTripId) {
      this.currentTrip = await getItemById('trips', this.currentTripId);
      if (!this.currentTrip) {
        const trips = await getAllFromStore('trips');
        this.currentTrip = trips[0] || null;
        this.currentTripId = this.currentTrip ? this.currentTrip.id : null;
      }
    }

    // 4. Register Service Worker for offline PWA functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('Service Worker registration skipped/failed:', err);
      });
    }

    // 5. Render main application view
    await this.render();
  }

  async setAuthUser(user) {
    this.currentUser = user;
    localStorage.setItem('travelone_current_user', JSON.stringify(user));
    
    // Find user's last trip or first trip
    const trips = await getAllFromStore('trips');
    const userTrips = trips.filter(t => !t.userId || t.userId === user.id);
    this.currentTrip = userTrips[0] || null;
    this.currentTripId = this.currentTrip ? this.currentTrip.id : null;
    if (this.currentTripId) {
      localStorage.setItem('travelone_current_trip_id', this.currentTripId);
    }
    this.activeView = 'home';
    await this.render();
  }

  async logout() {
    this.currentUser = null;
    localStorage.removeItem('travelone_current_user');
    await this.render();
  }

  async setTrip(tripId) {
    if (!tripId) {
      this.currentTripId = null;
      this.currentTrip = null;
      localStorage.removeItem('travelone_current_trip_id');
      this.activeView = 'home';
    } else {
      this.currentTripId = tripId;
      this.currentTrip = await getItemById('trips', tripId);
      localStorage.setItem('travelone_current_trip_id', tripId);
      this.activeView = 'dashboard';
    }
    await this.render();
  }

  async setView(viewName) {
    this.activeView = viewName;
    await this.render();
    window.scrollTo(0, 0);
  }

  async render() {
    // If not authenticated, render AuthView
    if (!this.currentUser) {
      this.appLayout.innerHTML = '';
      const authElem = renderAuthView((user) => this.setAuthUser(user));
      this.appLayout.appendChild(authElem);
      return;
    }

    // Render navigation (sidebar + bottom nav)
    const navHTML = renderNavigation(this.activeView, this.currentTrip, this.currentUser);
    const fabHTML = this.currentTrip ? renderQuickToolsFAB() : '';

    this.appLayout.innerHTML = `
      ${navHTML}
      <main class="main-content" id="view-container"></main>
      ${fabHTML}
    `;

    const viewContainer = document.getElementById('view-container');
    let viewElement = document.createElement('div');

    const refreshCurrentView = () => this.render();

    switch (this.activeView) {
      case 'home':
        viewElement = await renderHomeView((tripId) => this.setTrip(tripId), this.currentUser);
        break;
      case 'dashboard':
        viewElement = await renderDashboardView(this.currentTrip, (v) => this.setView(v));
        break;
      case 'itinerary':
        viewElement = await renderItineraryView(this.currentTrip, refreshCurrentView);
        break;
      case 'reservations':
        viewElement = await renderReservationsView(this.currentTrip, refreshCurrentView);
        break;
      case 'expenses':
        viewElement = await renderExpensesView(this.currentTrip, refreshCurrentView);
        break;
      case 'budget':
        viewElement = await renderBudgetView(this.currentTrip, refreshCurrentView);
        break;
      case 'places':
        viewElement = await renderPlacesView(this.currentTrip, refreshCurrentView);
        break;
      case 'shopping':
        viewElement = await renderShoppingView(this.currentTrip, refreshCurrentView);
        break;
      case 'checklist':
        viewElement = await renderChecklistView(this.currentTrip, refreshCurrentView);
        break;
      case 'documents':
        viewElement = await renderDocumentsView(this.currentTrip, refreshCurrentView);
        break;
      case 'contacts':
        viewElement = await renderContactsView(this.currentTrip, refreshCurrentView);
        break;
      case 'journal':
        viewElement = await renderJournalView(this.currentTrip, refreshCurrentView);
        break;
      case 'summary':
        viewElement = await renderSummaryView(this.currentTrip, refreshCurrentView);
        break;
      default:
        viewElement = await renderHomeView((tripId) => this.setTrip(tripId), this.currentUser);
    }

    viewContainer.appendChild(viewElement);

    // Attach navigation click listeners
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute('data-view');
        this.setView(targetView);
      });
    });

    // Logout listener
    document.getElementById('btn-app-logout')?.addEventListener('click', () => {
      this.logout();
    });

    // Attach Quick Tools FAB listener
    const fabBtn = document.getElementById('fab-quick-tools');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        openCurrencyConverterModal(this.currentTrip);
      });
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const app = new TravelOneApp();
  app.init();
});
