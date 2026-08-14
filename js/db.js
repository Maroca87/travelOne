/**
 * TravelOne Local Database Engine (IndexedDB Native) - Costa Rica Edition 🇨🇷
 */

const DB_NAME = 'TravelOneDB';
const DB_VERSION = 2;

let dbInstance = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
      }

      // Trips store
      if (!db.objectStoreNames.contains('trips')) {
        const store = db.createObjectStore('trips', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      } else {
        const store = request.transaction.objectStore('trips');
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
        }
      }

      // Itinerary store
      if (!db.objectStoreNames.contains('itinerary')) {
        const store = db.createObjectStore('itinerary', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }

      // Reservations store
      if (!db.objectStoreNames.contains('reservations')) {
        const store = db.createObjectStore('reservations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }

      // Expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }

      // Places store
      if (!db.objectStoreNames.contains('places')) {
        const store = db.createObjectStore('places', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
        store.createIndex('visited', 'visited', { unique: false });
      }

      // Shopping list store
      if (!db.objectStoreNames.contains('shopping')) {
        const store = db.createObjectStore('shopping', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
        store.createIndex('bought', 'bought', { unique: false });
      }

      // Checklist store
      if (!db.objectStoreNames.contains('checklists')) {
        const store = db.createObjectStore('checklists', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
        store.createIndex('group', 'group', { unique: false });
      }

      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
      }

      // Contacts store
      if (!db.objectStoreNames.contains('contacts')) {
        const store = db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
      }

      // Journal store
      if (!db.objectStoreNames.contains('journal')) {
        const store = db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
        store.createIndex('tripId', 'tripId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// User Management Methods
export async function registerUser(username, name, password) {
  const db = await openDB();
  const existingUsers = await getAllFromStore('users');
  const normalizedUsername = username.trim().toLowerCase();
  
  if (existingUsers.some(u => u.username.toLowerCase() === normalizedUsername)) {
    throw new Error('El nombre de usuario ya está registrado');
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    username: normalizedUsername,
    name: name.trim(),
    password: password.trim(),
    createdAt: new Date().toISOString()
  };

  await saveItem('users', newUser);
  return newUser;
}

export async function loginUser(username, password) {
  const users = await getAllFromStore('users');
  const normalizedUsername = username.trim().toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === normalizedUsername && u.password === password.trim());
  if (!user) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  return user;
}

// Generic Store Access Methods
export async function getAllFromStore(storeName, tripId = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    let request;
    if (tripId && store.indexNames.contains('tripId')) {
      const index = store.index('tripId');
      request = index.getAll(tripId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getItemById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveItem(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteItem(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTripAndData(tripId) {
  const db = await openDB();
  const stores = ['itinerary', 'reservations', 'expenses', 'places', 'shopping', 'checklists', 'documents', 'contacts', 'journal'];
  
  for (const storeName of stores) {
    const items = await getAllFromStore(storeName, tripId);
    for (const item of items) {
      await deleteItem(storeName, item.id);
    }
  }
  await deleteItem('trips', tripId);
  return true;
}

// Export full Trip Data to JSON object
export async function exportTripJSON(tripId) {
  const trip = await getItemById('trips', tripId);
  if (!trip) throw new Error('Viaje no encontrado');

  const itinerary = await getAllFromStore('itinerary', tripId);
  const reservations = await getAllFromStore('reservations', tripId);
  const expenses = await getAllFromStore('expenses', tripId);
  const places = await getAllFromStore('places', tripId);
  const shopping = await getAllFromStore('shopping', tripId);
  const checklists = await getAllFromStore('checklists', tripId);
  const documents = await getAllFromStore('documents', tripId);
  const contacts = await getAllFromStore('contacts', tripId);
  const journal = await getAllFromStore('journal', tripId);

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    trip,
    itinerary,
    reservations,
    expenses,
    places,
    shopping,
    checklists,
    documents,
    contacts,
    journal
  };
}

// Import Trip Data from JSON object
export async function importTripJSON(data, currentUserId = null) {
  if (!data || !data.trip || !data.trip.id) {
    throw new Error('Formato de datos de viaje no válido');
  }

  const tripToSave = { ...data.trip };
  if (currentUserId) {
    tripToSave.userId = currentUserId;
  }

  await saveItem('trips', tripToSave);

  const saveCollection = async (storeName, collection) => {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        const itemCopy = { ...item, tripId: data.trip.id };
        await saveItem(storeName, itemCopy);
      }
    }
  };

  await saveCollection('itinerary', data.itinerary);
  await saveCollection('reservations', data.reservations);
  await saveCollection('expenses', data.expenses);
  await saveCollection('places', data.places);
  await saveCollection('shopping', data.shopping);
  await saveCollection('checklists', data.checklists);
  await saveCollection('documents', data.documents);
  await saveCollection('contacts', data.contacts);
  await saveCollection('journal', data.journal);

  return tripToSave;
}
