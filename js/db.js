/**
 * TravelOne Local Database Engine (IndexedDB Native)
 * Provides persistent offline storage, relational indexing, user auth stores,
 * trash management, and XML import/export backup capabilities.
 * 
 * @module js/db
 */

const DB_NAME = 'TravelOneDB';
const DB_VERSION = 2;

/**
 * Cached active IndexedDB connection instance.
 * @type {IDBDatabase|null}
 */
let dbInstance = null;

/**
 * Open and initialize the IndexedDB database instance with all object stores and indexes.
 * 
 * @returns {Promise<IDBDatabase>} Resolved with active IDBDatabase instance
 */
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

      // Child stores with relational tripId foreign index
      const childStores = [
        'itinerary',
        'reservations',
        'expenses',
        'places',
        'shopping',
        'checklists',
        'documents',
        'contacts',
        'journal'
      ];
      for (const storeName of childStores) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('tripId', 'tripId', { unique: false });
        }
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Initialization Error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ==========================================
// User Management & Authentication Methods
// ==========================================

/**
 * Register a new user in the local database.
 * 
 * @param {string} username - Unique handle
 * @param {string} name - Full display name
 * @param {string} password - Password or PIN
 * @returns {Promise<Object>} The registered user profile
 * @throws {Error} If username already exists
 */
export async function registerUser(username, name, password) {
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

/**
 * Authenticate a user with username and password.
 * 
 * @param {string} username - User handle
 * @param {string} password - Password/PIN
 * @returns {Promise<Object>} Authenticated user profile
 * @throws {Error} If credentials do not match
 */
export async function loginUser(username, password) {
  const users = await getAllFromStore('users');
  const normalizedUsername = username.trim().toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === normalizedUsername && u.password === password.trim());
  if (!user) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  return user;
}

/**
 * Reset a user's password.
 * 
 * @param {string} username - Registered user handle
 * @param {string} newPassword - New password or PIN
 * @returns {Promise<Object>} Updated user profile
 * @throws {Error} If user does not exist
 */
export async function resetPassword(username, newPassword) {
  const users = await getAllFromStore('users');
  const normalizedUsername = username.trim().toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === normalizedUsername);
  if (!user) {
    throw new Error('El nombre de usuario no existe');
  }
  user.password = newPassword.trim();
  await saveItem('users', user);
  return user;
}

// ==========================================
// Generic Store CRUD Operations
// ==========================================

/**
 * Retrieve all records from a specified store, optionally filtered by tripId index.
 * 
 * @param {string} storeName - Target object store name
 * @param {string|number|null} [tripId=null] - Optional trip foreign key filter
 * @returns {Promise<Array<Object>>} Array of records
 */
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

/**
 * Retrieve a single record by its primary key ID.
 * 
 * @param {string} storeName - Target object store
 * @param {string|number} id - Primary key value
 * @returns {Promise<Object|undefined>} The found record or undefined
 */
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

/**
 * Save or update a record in the specified store.
 * 
 * @param {string} storeName - Target object store
 * @param {Object} item - Record object to insert or update
 * @returns {Promise<string|number>} Primary key of the saved item
 */
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

/**
 * Delete a single record by primary key ID.
 * 
 * @param {string} storeName - Target object store
 * @param {string|number} id - Primary key ID to remove
 * @returns {Promise<boolean>} Resolves true when deleted
 */
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

// ==========================================
// Trash & Trip Lifecycle Operations
// ==========================================

/**
 * Soft-delete a trip by setting its status to 'papelera'.
 * Preserves previous status for clean restoration.
 * 
 * @param {string} tripId - ID of the trip
 * @returns {Promise<Object>} Updated trip object
 */
export async function moveToTrash(tripId) {
  const trip = await getItemById('trips', tripId);
  if (!trip) throw new Error('Viaje no encontrado');

  trip.previousStatus = trip.status !== 'papelera' ? trip.status : 'planificando';
  trip.status = 'papelera';
  trip.deletedAt = new Date().toISOString();

  await saveItem('trips', trip);
  return trip;
}

/**
 * Restore a soft-deleted trip from trash to its previous active status.
 * 
 * @param {string} tripId - ID of the trip to restore
 * @returns {Promise<Object>} Restored trip object
 */
export async function restoreTrip(tripId) {
  const trip = await getItemById('trips', tripId);
  if (!trip) throw new Error('Viaje no encontrado');

  trip.status = trip.previousStatus || 'planificando';
  delete trip.deletedAt;

  await saveItem('trips', trip);
  return trip;
}

/**
 * Permanently delete a trip and all its associated child records cascadingly.
 * 
 * @param {string} tripId - ID of the trip
 * @returns {Promise<boolean>} Resolves true when permanently deleted
 */
export async function permanentDeleteTrip(tripId) {
  const childStores = [
    'itinerary',
    'reservations',
    'expenses',
    'places',
    'shopping',
    'checklists',
    'documents',
    'contacts',
    'journal'
  ];
  
  for (const storeName of childStores) {
    const items = await getAllFromStore(storeName, tripId);
    for (const item of items) {
      await deleteItem(storeName, item.id);
    }
  }
  await deleteItem('trips', tripId);
  return true;
}

/**
 * Permanently delete all trips marked as 'papelera' for a given user.
 * 
 * @param {string|null} [userId=null] - User ID scope
 * @returns {Promise<boolean>} Resolves true when trash is purged
 */
export async function emptyTrash(userId = null) {
  const trips = await getAllFromStore('trips');
  const trashTrips = trips.filter(t => t.status === 'papelera' && (!userId || !t.userId || t.userId === userId));

  for (const trip of trashTrips) {
    await permanentDeleteTrip(trip.id);
  }
  return true;
}

// ==========================================
// XML Backup Export & Import Engine
// ==========================================

/**
 * Escape XML special characters to maintain valid document syntax.
 * 
 * @param {*} str - Raw input value
 * @returns {string} XML-safe sanitized string
 */
function escapeXML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a complete XML string backup of one or all trips including all child collections.
 * 
 * @param {string|null} [tripId=null] - Specific trip ID to backup (or null for all)
 * @param {string|null} [userId=null] - User filter scope
 * @returns {Promise<string>} Well-formed XML document string
 */
export async function exportTripsXML(tripId = null, userId = null) {
  let trips = [];
  if (tripId) {
    const singleTrip = await getItemById('trips', tripId);
    if (singleTrip) trips = [singleTrip];
  } else {
    trips = await getAllFromStore('trips');
    if (userId) {
      trips = trips.filter(t => !t.userId || t.userId === userId);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<travelone_backup version="1.0" exportDate="${new Date().toISOString()}">\n`;
  xml += `  <trips>\n`;

  for (const trip of trips) {
    xml += `    <trip id="${escapeXML(trip.id)}">\n`;
    xml += `      <name>${escapeXML(trip.name)}</name>\n`;
    xml += `      <destination>${escapeXML(trip.destination)}</destination>\n`;
    xml += `      <startDate>${escapeXML(trip.startDate)}</startDate>\n`;
    xml += `      <endDate>${escapeXML(trip.endDate)}</endDate>\n`;
    xml += `      <status>${escapeXML(trip.status)}</status>\n`;
    xml += `      <previousStatus>${escapeXML(trip.previousStatus || '')}</previousStatus>\n`;
    xml += `      <deletedAt>${escapeXML(trip.deletedAt || '')}</deletedAt>\n`;
    xml += `      <budget>${trip.budget || 0}</budget>\n`;
    xml += `      <mainCurrency>${escapeXML(trip.mainCurrency || 'CRC')}</mainCurrency>\n`;
    xml += `      <coverIcon>${escapeXML(trip.coverIcon || trip.coverEmoji || 'plane')}</coverIcon>\n`;

    // Export child collections
    const collections = {
      itinerary: await getAllFromStore('itinerary', trip.id),
      reservations: await getAllFromStore('reservations', trip.id),
      expenses: await getAllFromStore('expenses', trip.id),
      places: await getAllFromStore('places', trip.id),
      shopping: await getAllFromStore('shopping', trip.id),
      checklists: await getAllFromStore('checklists', trip.id),
      documents: await getAllFromStore('documents', trip.id),
      contacts: await getAllFromStore('contacts', trip.id),
      journal: await getAllFromStore('journal', trip.id)
    };

    for (const [colName, items] of Object.entries(collections)) {
      xml += `      <${colName}>\n`;
      for (const item of items) {
        xml += `        <item>\n`;
        for (const [key, val] of Object.entries(item)) {
          if (key === 'tripId') continue;
          xml += `          <${key}>${escapeXML(val)}</${key}>\n`;
        }
        xml += `        </item>\n`;
      }
      xml += `      </${colName}>\n`;
    }

    xml += `    </trip>\n`;
  }

  xml += `  </trips>\n`;
  xml += `</travelone_backup>`;
  return xml;
}

/**
 * Parse and restore trips and collections from a valid TravelOne XML backup file.
 * 
 * @param {string} xmlString - Raw XML backup text
 * @param {string|null} [currentUserId=null] - Active user ID to assign imported trips
 * @returns {Promise<{importedCount: number, lastTripId: string|null}>} Summary of imported records
 * @throws {Error} If XML syntax or structure is malformed
 */
export async function importTripsXML(xmlString, currentUserId = null) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Error de lectura en el archivo XML de respaldo');
  }

  const tripNodes = xmlDoc.querySelectorAll('trips > trip');
  if (tripNodes.length === 0) {
    throw new Error('No se encontraron viajes válidos en el archivo XML');
  }

  let importedCount = 0;
  let lastTripId = null;

  for (const tripNode of tripNodes) {
    const tripId = tripNode.getAttribute('id') || ('trip-' + Date.now());
    lastTripId = tripId;

    const getTagVal = (parent, tag) => {
      const el = parent.querySelector(tag);
      return el ? el.textContent : '';
    };

    const tripObj = {
      id: tripId,
      userId: currentUserId || null,
      name: getTagVal(tripNode, 'name'),
      destination: getTagVal(tripNode, 'destination'),
      startDate: getTagVal(tripNode, 'startDate'),
      endDate: getTagVal(tripNode, 'endDate'),
      status: getTagVal(tripNode, 'status') || 'planificando',
      previousStatus: getTagVal(tripNode, 'previousStatus') || '',
      deletedAt: getTagVal(tripNode, 'deletedAt') || null,
      budget: parseFloat(getTagVal(tripNode, 'budget')) || 0,
      mainCurrency: getTagVal(tripNode, 'mainCurrency') || 'CRC',
      coverIcon: getTagVal(tripNode, 'coverIcon') || getTagVal(tripNode, 'coverEmoji') || 'plane'
    };

    await saveItem('trips', tripObj);

    // Child collections
    const colNames = ['itinerary', 'reservations', 'expenses', 'places', 'shopping', 'checklists', 'documents', 'contacts', 'journal'];
    for (const colName of colNames) {
      const itemNodes = tripNode.querySelectorAll(`${colName} > item`);
      for (const itemNode of itemNodes) {
        const itemObj = { tripId };
        for (const child of itemNode.children) {
          const key = child.tagName;
          let val = child.textContent;
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(val) && val.trim() !== '') val = Number(val);
          itemObj[key] = val;
        }
        await saveItem(colName, itemObj);
      }
    }

    importedCount++;
  }

  return { importedCount, lastTripId };
}

