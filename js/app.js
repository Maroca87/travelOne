/**
 * TravelOne PWA Main Application Controller
 * Manages client-side routing, user authentication lifecycle, active trip context,
 * offline service worker registration, and dynamic view rendering.
 * 
 * @module js/app
 */

import { seedDemoDataIfNeeded } from './seed.js';
import { getAllFromStore, getItemById } from './db.js';
import { renderNavigation } from './components/nav.js';
import { renderQuickToolsFAB, openCurrencyConverterModal } from './components/quickTools.js';

import { renderAuthView } from './views/auth.js';
import { renderHomeView } from './views/home.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderItineraryView } from './views/itinerary.js';
import { renderExpensesView } from './views/expenses.js';
import { renderChecklistView } from './views/checklist.js';
import { renderJournalView } from './views/journal.js';

/**
 * Main application class controlling view state and user session.
 */
class TravelOneApp {
  /**
   * Instantiate application state from persistent local storage.
   */
  constructor() {
    /** @type {string} Current active view identifier */
    this.activeView = 'home';
    /** @type {Object|null} Logged in user profile or null */
    this.currentUser = JSON.parse(localStorage.getItem('travelone_current_user')) || null;
    /** @type {string|null} ID of the currently selected trip */
    this.currentTripId = localStorage.getItem('travelone_current_trip_id') || null;
    /** @type {Object|null} Active trip model instance */
    this.currentTrip = null;
    /** @type {HTMLElement} Root layout DOM element */
    this.appLayout = document.getElementById('app-layout');
  }

  /**
   * Initialize application services, database seeds, and service workers.
   * 
   * @returns {Promise<void>}
   */
  async init() {
    // 1. Seed demo dataset if database is empty
    await seedDemoDataIfNeeded();

    // 2. Hydrate active trip if user is authenticated
    if (this.currentUser && this.currentTripId) {
      this.currentTrip = await getItemById('trips', this.currentTripId);
      if (!this.currentTrip) {
        const trips = await getAllFromStore('trips');
        const userTrips = trips.filter(t => !t.userId || t.userId === this.currentUser.id);
        this.currentTrip = userTrips[0] || null;
        this.currentTripId = this.currentTrip ? this.currentTrip.id : null;
      }
    }

    // 3. Register Service Worker for offline PWA operation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('Service Worker registration skipped/failed:', err);
      });
    }

    // 4. Initial view render
    await this.render();
  }

  /**
   * Set logged-in user profile and transition to home view.
   * 
   * @param {Object} user - User profile object
   * @returns {Promise<void>}
   */
  async setAuthUser(user) {
    this.currentUser = user;
    localStorage.setItem('travelone_current_user', JSON.stringify(user));
    
    // Auto-select user's first active trip if available
    const trips = await getAllFromStore('trips');
    const userTrips = trips.filter(t => (!t.userId || t.userId === user.id) && t.status !== 'papelera');
    this.currentTrip = userTrips[0] || null;
    this.currentTripId = this.currentTrip ? this.currentTrip.id : null;
    if (this.currentTripId) {
      localStorage.setItem('travelone_current_trip_id', this.currentTripId);
    }
    this.activeView = 'home';
    await this.render();
  }

  /**
   * Clear session state and return to authentication screen.
   * 
   * @returns {Promise<void>}
   */
  async logout() {
    this.currentUser = null;
    this.currentTrip = null;
    this.currentTripId = null;
    localStorage.removeItem('travelone_current_user');
    localStorage.removeItem('travelone_current_trip_id');
    await this.render();
  }

  /**
   * Select an active trip and switch to dashboard view.
   * 
   * @param {string|null} tripId - Target trip ID or null to return home
   * @returns {Promise<void>}
   */
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

  /**
   * Switch the current active view.
   * 
   * @param {string} viewName - Target view name identifier
   * @returns {Promise<void>}
   */
  async setView(viewName) {
    this.activeView = viewName;
    await this.render();
    window.scrollTo(0, 0);
  }

  /**
   * Render the complete UI based on current authentication state and active view.
   * 
   * @returns {Promise<void>}
   */
  async render() {
    // If not authenticated, render AuthView exclusively
    if (!this.currentUser) {
      this.appLayout.innerHTML = '';
      const authElem = renderAuthView((user) => this.setAuthUser(user));
      this.appLayout.appendChild(authElem);
      return;
    }

    // Render navigation framework (desktop sidebar + mobile top/bottom bars)
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

    // Route view rendering to the 4 Core Unified Pillars
    switch (this.activeView) {
      case 'home':
        viewElement = await renderHomeView((tripId) => this.setTrip(tripId), this.currentUser);
        break;
      case 'dashboard':
        viewElement = await renderDashboardView(this.currentTrip, (v) => this.setView(v));
        break;
      case 'itinerary':
        viewElement = await renderItineraryView(this.currentTrip, refreshCurrentView, 'timeline');
        break;
      case 'places':
        viewElement = await renderItineraryView(this.currentTrip, refreshCurrentView, 'places');
        break;
      case 'reservations':
        viewElement = await renderItineraryView(this.currentTrip, refreshCurrentView, 'reservations');
        break;
      case 'expenses':
        viewElement = await renderExpensesView(this.currentTrip, refreshCurrentView, 'expenses');
        break;
      case 'budget':
        viewElement = await renderExpensesView(this.currentTrip, refreshCurrentView, 'budget');
        break;
      case 'shopping':
        viewElement = await renderExpensesView(this.currentTrip, refreshCurrentView, 'shopping');
        break;
      case 'checklist':
        viewElement = await renderChecklistView(this.currentTrip, refreshCurrentView, 'checklist');
        break;
      case 'documents':
        viewElement = await renderChecklistView(this.currentTrip, refreshCurrentView, 'documents');
        break;
      case 'contacts':
        viewElement = await renderChecklistView(this.currentTrip, refreshCurrentView, 'contacts');
        break;
      case 'journal':
        viewElement = await renderJournalView(this.currentTrip, refreshCurrentView, 'journal');
        break;
      case 'summary':
        viewElement = await renderJournalView(this.currentTrip, refreshCurrentView, 'summary');
        break;
      default:
        viewElement = await renderHomeView((tripId) => this.setTrip(tripId), this.currentUser);
    }

    viewContainer.appendChild(viewElement);

    // Attach navigation link event listeners
    this.appLayout.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute('data-view');
        if (targetView) this.setView(targetView);
      });
    });

    // Attach logout event listeners
    this.appLayout.querySelector('#btn-app-logout')?.addEventListener('click', () => this.logout());
    this.appLayout.querySelector('#btn-mobile-logout')?.addEventListener('click', () => this.logout());

    // Attach Quick Tools FAB listener
    const fabBtn = this.appLayout.querySelector('#fab-quick-tools');
    if (fabBtn) {
      fabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCurrencyConverterModal(this.currentTrip);
      });
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new TravelOneApp();
  app.init();
});

