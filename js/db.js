/**
 * TravelOne Local Database Engine (IndexedDB Native)
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

      // Child stores
      const childStores = ['itinerary', 'reservations', 'expenses', 'places', 'shopping', 'checklists', 'documents', 'contacts', 'journal'];
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
      console.error('IndexedDB Error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// User Management Methods
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

export async function loginUser(username, password) {
  const users = await getAllFromStore('users');
  const normalizedUsername = username.trim().toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === normalizedUsername && u.password === password.trim());
  if (!user) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  return user;
}

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

// Trash & Restoration Operations
export async function moveToTrash(tripId) {
  const trip = await getItemById('trips', tripId);
  if (!trip) throw new Error('Viaje no encontrado');

  trip.previousStatus = trip.status !== 'papelera' ? trip.status : 'planificando';
  trip.status = 'papelera';
  trip.deletedAt = new Date().toISOString();

  await saveItem('trips', trip);
  return trip;
}

export async function restoreTrip(tripId) {
  const trip = await getItemById('trips', tripId);
  if (!trip) throw new Error('Viaje no encontrado');

  trip.status = trip.previousStatus || 'planificando';
  delete trip.deletedAt;

  await saveItem('trips', trip);
  return trip;
}

export async function permanentDeleteTrip(tripId) {
  const db = await openDB();
  const childStores = ['itinerary', 'reservations', 'expenses', 'places', 'shopping', 'checklists', 'documents', 'contacts', 'journal'];
  
  for (const storeName of childStores) {
    const items = await getAllFromStore(storeName, tripId);
    for (const item of items) {
      await deleteItem(storeName, item.id);
    }
  }
  await deleteItem('trips', tripId);
  return true;
}

export async function emptyTrash(userId) {
  const trips = await getAllFromStore('trips');
  const trashTrips = trips.filter(t => t.status === 'papelera' && (!userId || !t.userId || t.userId === userId));

  for (const trip of trashTrips) {
    await permanentDeleteTrip(trip.id);
  }
  return true;
}

// XML Backup Export Engine
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
    xml += `      <coverEmoji>${escapeXML(trip.coverEmoji || '✈️')}</coverEmoji>\n`;

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

// XML Import Engine
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
      coverEmoji: getTagVal(tripNode, 'coverEmoji') || '✈️'
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

function escapeXML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
