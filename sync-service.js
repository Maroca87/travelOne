/**
 * GarageOne - SyncService
 * Single-point manager for local-first offline CRUD operations,
 * transactional write/delete in IndexedDB, and cross-tab reactive events.
 */

class SyncServiceEngine {
  constructor() {
    this.isSyncing = false;
    this.onStateChangedCallbacks = [];
  }

  async init() {
    await LocalDB.init();
    this.registerEventListeners();
    this.notifyStateChanged();
  }

  registerEventListeners() {
    // Cross-Tab Communication Listener
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('garageone_sync_channel');
      channel.onmessage = (e) => {
        if (e.data && e.data.type === 'DATA_UPDATED_CROSS_TAB') {
          this.notifyStateChanged();
        }
      };
      this.broadcastChannel = channel;
    }
  }

  onStateChanged(callback) {
    if (typeof callback === 'function') {
      this.onStateChangedCallbacks.push(callback);
    }
  }

  notifyStateChanged() {
    this.onStateChangedCallbacks.forEach((cb) => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  /**
   * Universal Mandatory CRUD Entry Point (Local IndexedDB Transactional Execution)
   */
  async executeCrud(action, storeName, itemData) {
    const nowIso = new Date().toISOString();
    const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
    const userId = user ? user.id : 'local_user';

    // Standardize Entity Schema
    let entity = { ...itemData };
    if (!entity.id) {
      entity.id = LocalDB.generateUUID();
    }
    entity.updatedAt = nowIso;
    entity.version = (entity.version || 0) + 1;
    entity.isDeleted = (action === 'DELETE');
    if (userId) entity.userId = userId;

    // 1. Direct Transactional Write to Local IndexedDB (Single Source of Truth)
    if (action === 'DELETE') {
      await LocalDB.delete(storeName, entity.id);
    } else {
      await LocalDB.put(storeName, entity);
    }

    // 2. Broadcast Cross-Tab Event
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage({ type: 'DATA_UPDATED_CROSS_TAB' }); } catch (e) {}
    }

    // 3. Notify UI components immediately for instant responsiveness
    this.notifyStateChanged();

    return entity;
  }

  async syncUnified() {
    return { ok: true, reason: 'Almacenamiento local activo.', pushed: 0, pulled: 0, pending: 0, errors: [] };
  }
}

// Global Singleton Instance
window.SyncService = new SyncServiceEngine();
