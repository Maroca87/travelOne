/**
 * GarageOne - LocalDB Engine (IndexedDB Native Store)
 * Primary offline-first storage engine for high-capacity structured data.
 * Serves as the single local cache and local source of truth.
 */

const DB_NAME = 'GarageOne_LocalDB_v2';
const DB_VERSION = 2;

const STORES = {
  VEHICLES: 'vehicles',
  SERVICES: 'services',
  FUELS: 'fuels',
  DOCUMENTS: 'documents',
  REMINDERS: 'reminders',
  USERS: 'users',
  AI_CHATS: 'ai_chats',
  SYNC_QUEUE: 'sync_queue',
  BACKUPS: 'backups'
};

const LocalDB = {
  dbInstance: null,

  async init() {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.error('IndexedDB no está soportado en este entorno.');
        return resolve(null);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Entities object stores
        if (!db.objectStoreNames.contains(STORES.VEHICLES)) {
          const store = db.createObjectStore(STORES.VEHICLES, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.SERVICES)) {
          const store = db.createObjectStore(STORES.SERVICES, { keyPath: 'id' });
          store.createIndex('vehicleId', 'vehicleId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.FUELS)) {
          const store = db.createObjectStore(STORES.FUELS, { keyPath: 'id' });
          store.createIndex('vehicleId', 'vehicleId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const store = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
          store.createIndex('vehicleId', 'vehicleId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.REMINDERS)) {
          const store = db.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
          store.createIndex('vehicleId', 'vehicleId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const store = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          store.createIndex('username', 'username', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.AI_CHATS)) {
          const store = db.createObjectStore(STORES.AI_CHATS, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Infrastructure object stores
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'queueId' });
        }
        if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
          const store = db.createObjectStore(STORES.BACKUPS, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.dbInstance = e.target.result;
        console.log('[LocalDB] IndexedDB inicializado con éxito.');
        this.requestStoragePersistence();
        resolve(this.dbInstance);
      };

      request.onerror = (e) => {
        console.error('[LocalDB] Error abriendo IndexedDB:', e.target.error);
        resolve(null);
      };
    });
  },

  async requestStoragePersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          const granted = await navigator.storage.persist();
          console.log(`[LocalDB] Almacenamiento persistente concedido: ${granted}`);
        }
      } catch (e) {
        console.warn('[LocalDB] Error al solicitar almacenamiento persistente:', e);
      }
    }
  },

  async getStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMb = (estimate.usage / (1024 * 1024)).toFixed(2);
        const quotaMb = (estimate.quota / (1024 * 1024)).toFixed(2);
        return { usageMb, quotaMb, rawUsage: estimate.usage, rawQuota: estimate.quota };
      } catch (e) {
        console.warn('[LocalDB] Error estimando cuota de almacenamiento:', e);
      }
    }
    return { usageMb: '0.00', quotaMb: '50.00+', rawUsage: 0, rawQuota: 52428800 };
  },

  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  async getAll(storeName) {
    const db = await this.init();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  async get(storeName, key) {
    const db = await this.init();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  async put(storeName, item) {
    const db = await this.init();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => {
          console.error(`[LocalDB] Error guardando en store ${storeName}:`, e.target.error);
          resolve(false);
        };
      } catch (e) {
        resolve(false);
      }
    });
  },

  async putMany(storeName, items) {
    if (!Array.isArray(items) || items.length === 0) return true;
    const db = await this.init();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async delete(storeName, key) {
    const db = await this.init();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async clear(storeName) {
    const db = await this.init();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
};

window.LocalDB = LocalDB;
window.STORES = STORES;
