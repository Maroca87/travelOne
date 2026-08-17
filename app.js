/* ==========================================================================
   AutoCare - Core Logic (v14: Bi-Directional Seamless iOS Swipe Physics)
   ========================================================================== */

// GarageOne Core Application Engine - Supabase + IndexedDB Offline First

let appState = {
  currency: 'CRC',
  geminiApiKey: '',
  groqApiKey: '',
  aiEngineMode: 'groq_key',
  vehicles: [],
  activeVehicleId: '',
  documents: [],
  services: [],
  fuels: [],
  reminders: [],
  users: [],
  emergencyContacts: [
    { id: 'c1', name: 'Grúa / Auxilio 24/7 INS', phone: '800-800-911', category: 'Auxilio' },
    { id: 'c2', name: 'Taller Mecánico Central', phone: '2222-3333', category: 'Taller' },
    { id: 'c3', name: 'Asistencia de Emergencia', phone: '911', category: 'Emergencia' }
  ]
};

let currentUser = null;
let isAuthenticated = false;

const USER_KEY = 'GARAGEONE_USER';
const USERS_KEY = 'GARAGEONE_USERS_LIST';

const DEFAULT_ADMIN_USER = {
  id: '00000000-0000-4000-a000-000000000001',
  username: 'admin',
  name: 'Administrador Principal',
  email: 'admin@garageone.app',
  password: '1234',
  role: 'admin',
  permissions: {
    tabGarage: true,
    tabMaintenance: true,
    tabFuel: true,
    tabGuantera: true,
    tabAI: true,
    tabReports: true,
    tabSettings: true,
    canManageUsers: false
  },
  pinEnabled: false,
  pin: '',
  createdAt: new Date().toISOString()
};

const ADMIN_PASSWORD_KEY = 'GARAGEONE_ADMIN_PWD';

function getStoredAdminPassword() {
  try { return localStorage.getItem(ADMIN_PASSWORD_KEY) || '1234'; } catch (e) { return '1234'; }
}

function storeAdminPassword(pwd) {
  try { localStorage.setItem(ADMIN_PASSWORD_KEY, pwd); } catch (e) {}
}

function getRolePermissionsPreset(role) {
  if (role === 'admin') {
    return { tabGarage: true, tabMaintenance: true, tabFuel: true, tabGuantera: true, tabAI: true, tabReports: true, tabSettings: true, canManageUsers: true };
  } else if (role === 'mecanico') {
    return { tabGarage: true, tabMaintenance: true, tabFuel: false, tabGuantera: true, tabAI: true, tabReports: true, tabSettings: true, canManageUsers: false };
  } else if (role === 'cliente') {
    return { tabGarage: true, tabMaintenance: false, tabFuel: true, tabGuantera: true, tabAI: true, tabReports: true, tabSettings: true, canManageUsers: false };
  } else {
    return { tabGarage: true, tabMaintenance: true, tabFuel: true, tabGuantera: true, tabAI: true, tabReports: true, tabSettings: true, canManageUsers: false };
  }
}

// Security: Helper to escape user HTML inputs
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// SVG Vector Icons Collection
const SVG_ICONS = {
  car: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h2m8 0h2"/></svg>`,
  oil: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"/><path d="m14 10-2 2-2-2"/><path d="M5 18a7 7 0 1 0 14 0 7 7 0 0 0-14 0z"/></svg>`,
  brakes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6m-9-9h6m6 0h6"/></svg>`,
  tires: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5m0 8v5m-9-9h5m8 0h5"/></svg>`,
  filters: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`,
  spark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  battery: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="16" height="12" rx="2"/><line x1="22" y1="11" x2="22" y2="15"/><line x1="6" y1="13" x2="10" y2="13"/><line x1="14" y1="13" x2="14" y2="13"/></svg>`,
  transmission: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  belt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
  document: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  fuel: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M15 11h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-3-3"/><path d="M3 22h12"/><path d="M7 9h4"/></svg>`,
  wrench: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  zap: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  alertTriangle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd60a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 1 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  alertCircle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
};

const DEFAULT_SYSTEM_CATEGORIES = ['Aceite', 'Frenos', 'Llantas', 'Filtros', 'Bujías', 'Batería', 'Transmisión', 'Correa', 'Trámite', 'Otro'];
let SERVICE_CATEGORIES = ['Aceite', 'Frenos', 'Llantas', 'Filtros', 'Bujías', 'Batería', 'Transmisión', 'Correa', 'Trámite', 'Otro'];

/**
 * Determina si el nombre de una categoría corresponde a una categoría predefinida por el sistema.
 * @param {string} catName - Nombre de la categoría a evaluar.
 * @returns {boolean} True si la categoría es predefinida por el sistema, false en caso contrario.
 */
function isDefaultCategory(catName) {
  if (!catName || typeof catName !== 'string') return false;
  const lowerName = catName.trim().toLowerCase();
  return DEFAULT_SYSTEM_CATEGORIES.some(def => def.toLowerCase() === lowerName);
}

// Default Seed Data
const DEFAULT_STATE = {
  currency: 'CRC',
  distanceUnit: 'km',
  language: 'es',
  geminiApiKey: '',
  vehicles: [],
  activeVehicleId: '',
  documents: [],
  services: [],
  fuels: [],
  reminders: [],
  emergencyContacts: [
    {
      id: 'c1',
      name: 'Grúa / Auxilio 24/7 INS',
      phone: '800-800-911',
      category: 'Auxilio'
    },
    {
      id: 'c2',
      name: 'Taller Mecánico Central',
      phone: '2222-3333',
      category: 'Taller'
    },
    {
      id: 'c3',
      name: 'Asistencia de Emergencia',
      phone: '911',
      category: 'Emergencia'
    }
  ]
};

appState = loadState();
currentUser = loadUser();
isAuthenticated = false;
let failedLoginAttempts = 0;
let lockoutUntil = 0;

function formatCurrency(amount) {
  const num = Number(amount || 0);
  const curr = appState.currency || 'CRC';
  const hasDecimals = num % 1 !== 0;
  const opts = hasDecimals
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 2 };

  if (curr === 'CRC') return '₡' + num.toLocaleString('es-CR', opts);
  if (curr === 'USD') return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '₡' + num.toLocaleString('es-CR', opts);
}

/**
 * Obtiene la unidad de distancia configurada para el vehículo ('km' o 'mi').
 * @param {Object} [veh] - Objeto del vehículo. Por defecto usa el vehículo activo.
 * @returns {string} 'km' o 'mi'
 */
function getVehicleUnit(veh = getActiveVehicle()) {
  return (veh && veh.unitDistance) ? veh.unitDistance : 'km';
}

/**
 * Formatea un valor numérico de distancia con la unidad correspondiente del vehículo ('km' o 'mi').
 * @param {number|string} val - Distancia a formatear.
 * @param {Object} [veh] - Objeto del vehículo. Por defecto usa el vehículo activo.
 * @returns {string} Cadena formateada (ej. "124,855 km" o "5,000 mi")
 */
function formatVehicleDistance(val, veh = getActiveVehicle()) {
  const unit = getVehicleUnit(veh);
  const num = Number(val || 0);
  return `${num.toLocaleString()} ${unit}`;
}

/**
 * Actualiza la etiqueta del odómetro en el modal de crear/editar vehículo según la unidad elegida.
 * @param {string} unit - 'km' o 'mi'
 */
function updateVehicleModalUnitLabel(unit) {
  const lbl = document.getElementById('lblVehKm');
  if (lbl) lbl.textContent = unit === 'mi' ? 'Millaje Inicial (mi)' : 'Odómetro Inicial (km)';
}

/**
 * Actualiza la etiqueta del kilometraje/millaje en el modal de registrar servicio según el vehículo activo.
 */
function updateServiceModalUnitLabel() {
  const veh = getActiveVehicle();
  const unit = getVehicleUnit(veh);
  const lbl = document.getElementById('lblServKm');
  if (lbl) lbl.textContent = unit === 'mi' ? 'Millaje (mi)' : 'Kilometraje (km)';
}

/**
 * Actualiza la etiqueta del kilometraje/millaje en el modal de recarga de gasolina según el vehículo activo.
 */
function updateFuelModalUnitLabel() {
  const veh = getActiveVehicle();
  const unit = getVehicleUnit(veh);
  const lbl = document.getElementById('lblFuelKm');
  if (lbl) lbl.textContent = unit === 'mi' ? 'Millaje en Odómetro (mi)' : 'Kilometraje en Odómetro (km)';
}

/**
 * Actualiza la etiqueta del intervalo en el modal de crear/editar categoría de servicio según la unidad del vehículo activo.
 */
function updateNewCategoryModalUnitLabel() {
  const veh = getActiveVehicle();
  const unit = getVehicleUnit(veh);
  const lbl = document.getElementById('lblNewCatIntervalKm');
  const input = document.getElementById('newCatIntervalKm');
  if (lbl) {
    lbl.textContent = unit === 'mi' ? 'Intervalo recomendado por millas (Opcional)' : 'Intervalo recomendado por kilómetros (Opcional)';
  }
  if (input) {
    input.placeholder = unit === 'mi' ? 'Ej. 3000' : 'Ej. 5000';
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    if (modalId === 'modalNewCategory') {
      updateNewCategoryModalUnitLabel();
      renderCustomCategoriesList();
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
  }
}

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  setTodayDates();
  await initAsyncStorage();

  // Close modals when clicking dark backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    });
  });

  // Reset slid-open swipe items on document click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.swipe-container')) {
      resetAllSwipeItems();
    }
  });

  // Close active modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => closeModal(m.id));
    }
  });
});

// BroadcastChannel for Live Cross-Tab & Web/App User Sync
const userSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('garageone_user_database_sync') : null;

function getUsersList() {
  const storedAdminPwd = getStoredAdminPassword();
  const adminUserWithPassword = { ...DEFAULT_ADMIN_USER, password: storedAdminPwd, createdByAdmin: true };

  if (appState.users && appState.users.length > 0) {
    let hasAdmin = appState.users.some(u => u && u.username && u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      appState.users.unshift(adminUserWithPassword);
    } else {
      // Update admin password in list
      const adminIdx = appState.users.findIndex(u => u && u.username && u.username.toLowerCase() === 'admin');
      if (adminIdx !== -1) appState.users[adminIdx].password = storedAdminPwd;
    }
    return appState.users;
  }
  try {
    const raw = localStorage.getItem(USERS_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    let hasAdmin = list.some(u => u && u.username && u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      list.unshift(adminUserWithPassword);
    } else {
      const adminIdx = list.findIndex(u => u && u.username && u.username.toLowerCase() === 'admin');
      if (adminIdx !== -1) list[adminIdx].password = storedAdminPwd;
    }
    return list;
  } catch (e) {
    return [adminUserWithPassword];
  }
}

async function saveUsersList(usersList) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(usersList));
  } catch (e) {}

  for (const u of usersList) {
    await LocalDB.put(STORES.USERS, u);
  }
  appState.users = usersList;

  if (userSyncChannel) {
    try { userSyncChannel.postMessage({ type: 'USER_DATABASE_UPDATED' }); } catch (e) {}
  }
  if (typeof SyncService !== 'undefined' && SyncService.syncUnified) {
    SyncService.syncUnified();
  }
}

function loadUser() {
  try {
    const u = localStorage.getItem(USER_KEY);
    if (u) {
      const parsed = JSON.parse(u);
      if (parsed && (parsed.username || parsed.name || parsed.email)) return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getUserStorageKey(user = currentUser) {
  if (user && (user.id || user.username)) {
    const keyStr = (user.id || user.username).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `AUTOCARE_DATA_USER_${keyStr}`;
  }
  return 'AUTOCARE_DATA_USER_default';
}

async function saveUser(user) {
  currentUser = user;
  if (user) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {}
    await SyncService.executeCrud(user.id ? 'UPDATE' : 'CREATE', STORES.USERS, user);
  } else {
    localStorage.removeItem(USER_KEY);
  }
  appState = loadState();
}

let currentRecoveryOTP = null;
let currentRecoveryTargetUser = null;

function showLoginForm() {
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const formForgotPass = document.getElementById('formForgotPass');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const loginUser = document.getElementById('loginUser');

  if (formLogin) formLogin.style.display = 'block';
  if (formRegister) formRegister.style.display = 'none';
  if (formForgotPass) formForgotPass.style.display = 'none';

  const defaultUser = currentUser ? (currentUser.username || currentUser.name || '') : '';
  if (loginUser && !loginUser.value) {
    loginUser.value = defaultUser;
  }

  const username = loginUser && loginUser.value ? loginUser.value : defaultUser;
  if (authTitle) authTitle.textContent = username ? `Hola, ${escapeHtml(username)}` : 'Bienvenido a GarageOne';
  if (authSubtitle) authSubtitle.textContent = 'Ingresa tu usuario y contraseña para acceder';
}

function showRegisterForm() {
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const formForgotPass = document.getElementById('formForgotPass');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');

  if (formLogin) formLogin.style.display = 'none';
  if (formRegister) formRegister.style.display = 'block';
  if (formForgotPass) formForgotPass.style.display = 'none';
  if (authTitle) authTitle.textContent = 'GarageOne';
  if (authSubtitle) authSubtitle.textContent = 'Crea tu usuario único de acceso';
}

/**
 * Muestra una animación fluida con el logo oficial de GarageOne
 * antes de ingresar al garaje o cambiar de sesión.
 */
function triggerGarageEntryAnimation(callback) {
  const splash = document.getElementById('splashScreen');
  if (!splash) {
    if (typeof callback === 'function') callback();
    return;
  }

  splash.classList.remove('fade-out');
  splash.style.display = 'flex';

  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      splash.classList.remove('fade-out');
      if (typeof callback === 'function') callback();
    }, 400);
  }, 1200);
}

function showForgotPasswordForm() {
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const formForgotPass = document.getElementById('formForgotPass');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');

  const step1 = document.getElementById('forgotStep1');
  const step2 = document.getElementById('forgotStep2');
  const forgotInput = document.getElementById('forgotUserOrEmail');
  const forgotUserError = document.getElementById('forgotUserError');
  const forgotPassError = document.getElementById('forgotPassError');

  if (forgotInput) forgotInput.value = '';
  if (forgotUserError) forgotUserError.style.display = 'none';
  if (forgotPassError) forgotPassError.style.display = 'none';

  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';

  if (formLogin) formLogin.style.display = 'none';
  if (formRegister) formRegister.style.display = 'none';
  if (formForgotPass) formForgotPass.style.display = 'block';
  if (authTitle) authTitle.textContent = 'Recuperar Contraseña';
  if (authSubtitle) authSubtitle.textContent = 'Ingresa tu nombre de usuario o correo registrado';
}

let localRecoveryTargetUser = null;

async function verifyRecoveryUser() {
  const input = document.getElementById('forgotUserOrEmail');
  const err = document.getElementById('forgotUserError');
  if (err) err.style.display = 'none';

  const val = input ? input.value.trim().toLowerCase() : '';
  if (!val) {
    if (err) { err.textContent = 'Por favor ingresa tu usuario o correo electrónico registrado.'; err.style.display = 'block'; }
    return;
  }

  const users = await LocalDB.getAll(STORES.USERS);
  const matched = users.find(u => 
    (u.username && u.username.trim().toLowerCase() === val) || 
    (u.email && u.email.trim().toLowerCase() === val)
  );

  if (matched) {
    localRecoveryTargetUser = matched;
    const targetLabel = document.getElementById('forgotEmailSentTarget');
    if (targetLabel) targetLabel.textContent = `${matched.name || matched.username} (${matched.email || matched.username})`;
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
  } else {
    if (err) { err.textContent = 'No se encontró ningún usuario registrado con esos datos.'; err.style.display = 'block'; }
  }
}

async function handleForgotPassword(e) {
  if (e) e.preventDefault();

  const newPassInput = document.getElementById('forgotNewPassword');
  const confirmPassInput = document.getElementById('forgotConfirmPassword');
  const passError = document.getElementById('forgotPassError');

  if (passError) passError.style.display = 'none';

  const newPassword = newPassInput ? newPassInput.value.trim() : '';
  const confirmPassword = confirmPassInput ? confirmPassInput.value.trim() : '';

  if (!localRecoveryTargetUser) {
    if (passError) {
      passError.textContent = 'Debes verificar primero tu cuenta de usuario.';
      passError.style.display = 'block';
    }
    return;
  }

  if (!newPassword || newPassword.length < 4) {
    if (passError) {
      passError.textContent = 'La nueva contraseña debe tener al menos 4 caracteres.';
      passError.style.display = 'block';
    }
    return;
  }

  if (newPassword !== confirmPassword) {
    if (passError) {
      passError.textContent = 'Las contraseñas no coinciden.';
      passError.style.display = 'block';
    }
    return;
  }

  try {
    await AuthService.resetPasswordLocal(localRecoveryTargetUser.email || localRecoveryTargetUser.username, newPassword);
    localRecoveryTargetUser = null;
    if (newPassInput) newPassInput.value = '';
    if (confirmPassInput) confirmPassInput.value = '';
    alert('Contraseña restablecida con éxito. Ya puedes iniciar sesión con tu nueva contraseña.');
    showLoginForm();
  } catch (err) {
    if (passError) {
      passError.textContent = err.message || 'No se pudo restablecer la contraseña.';
      passError.style.display = 'block';
    }
  }
}

function checkAuth() {
  const authScreen = document.getElementById('authScreen');
  const appShell = document.getElementById('appShell');

  currentUser = AuthService.getCurrentUser();
  isAuthenticated = AuthService.isAuthenticated();

  if (isAuthenticated) {
    triggerGarageEntryAnimation(() => {
      if (authScreen) authScreen.style.display = 'none';
      if (appShell) appShell.style.display = 'block';
      try {
        loadAppStateFromDB().then(() => {
          switchTab('tabGarage');
          renderApp();
          renderUserSettings();
        });
      } catch (err) {
        console.error('Error al renderizar la app:', err);
      }
    });
  } else {
    if (authScreen) authScreen.style.display = 'flex';
    if (appShell) appShell.style.display = 'none';
    showLoginForm();
  }
}

async function handleRegister(e) {
  if (e) e.preventDefault();

  const userInput = document.getElementById('regUser');
  const emailInput = document.getElementById('regEmail');
  const passInput = document.getElementById('regPassword');
  const confirmPassInput = document.getElementById('regConfirmPassword');

  const userError = document.getElementById('userError');
  const emailError = document.getElementById('emailError');
  const passError = document.getElementById('passError');
  const confirmPassError = document.getElementById('confirmPassError');

  if (userError) userError.style.display = 'none';
  if (emailError) emailError.style.display = 'none';
  if (passError) passError.style.display = 'none';
  if (confirmPassError) confirmPassError.style.display = 'none';

  const username = userInput ? userInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';
  const confirmPassword = confirmPassInput ? confirmPassInput.value.trim() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (emailError) {
      emailError.textContent = 'Por favor ingresa un correo electrónico válido.';
      emailError.style.display = 'block';
    }
    return;
  }

  if (!password || password.length < 6) {
    if (passError) {
      passError.textContent = 'La contraseña debe tener al menos 6 caracteres para Supabase Auth.';
      passError.style.display = 'block';
    }
    return;
  }

  if (password !== confirmPassword) {
    if (confirmPassError) {
      confirmPassError.textContent = 'Las contraseñas no coinciden.';
      confirmPassError.style.display = 'block';
    }
    return;
  }

  try {
    await AuthService.register(email, password, { username, name: username });
    currentUser = AuthService.getCurrentUser();
    isAuthenticated = AuthService.isAuthenticated();
    checkAuth();
  } catch (err) {
    if (passError) {
      passError.textContent = err.message || 'Error registrando la cuenta en Supabase.';
      passError.style.display = 'block';
    }
  }
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const userInput = document.getElementById('loginUser');
  const pinInput = document.getElementById('loginPin');
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.style.display = 'none';

  const emailOrUser = userInput ? userInput.value.trim() : '';
  const password = pinInput ? String(pinInput.value).trim() : '';

  if (!emailOrUser || !password) {
    if (loginError) {
      loginError.textContent = 'Por favor ingresa tu correo y contraseña registrados.';
      loginError.style.display = 'block';
    }
    return;
  }

  try {
    await AuthService.login(emailOrUser, password);
    currentUser = AuthService.getCurrentUser();
    isAuthenticated = AuthService.isAuthenticated();
    if (pinInput) pinInput.value = '';
    checkAuth();
  } catch (err) {
    if (loginError) {
      loginError.textContent = err.message || 'Credenciales incorrectas o error de autenticación.';
      loginError.style.display = 'block';
    }
  }
}

async function handleLogout() {
  await AuthService.logout();
  currentUser = null;
  isAuthenticated = false;
  // Reiniciar estado en memoria para aislamiento total entre usuarios
  appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  appState.vehicles = [];
  appState.services = [];
  appState.fuels = [];
  appState.documents = [];
  appState.reminders = [];
  appState.emergencyContacts = [];
  appState.backupHistory = [];
  appState.activeVehicleId = null;
  checkAuth();
}

function resetUserPin(e) {
  if (e) e.preventDefault();
  if (confirm('¿Deseas cerrar sesión para ingresar con otro usuario o registrar una cuenta nueva?')) {
    handleLogout();
  }
}

function onAuthMethodChange(method) {
  const pinContainer = document.getElementById('pinSetupContainer');
  const pwdContainer = document.getElementById('changePasswordContainer');
  const authMethodPwdLabel = document.getElementById('authMethodPwdLabel');
  const authMethodPinLabel = document.getElementById('authMethodPinLabel');

  if (method === 'pin') {
    if (pinContainer) pinContainer.style.display = 'block';
    if (pwdContainer) pwdContainer.style.display = 'none';
    if (authMethodPinLabel) authMethodPinLabel.style.borderColor = 'rgba(56,189,248,0.5)';
    if (authMethodPwdLabel) authMethodPwdLabel.style.borderColor = 'rgba(255,255,255,0.1)';
    // Store preference
    if (currentUser) {
      currentUser.authMethod = 'pin';
      saveUser(currentUser);
    }
  } else {
    if (pinContainer) pinContainer.style.display = 'none';
    if (pwdContainer) pwdContainer.style.display = 'block';
    if (authMethodPwdLabel) authMethodPwdLabel.style.borderColor = 'rgba(56,189,248,0.5)';
    if (authMethodPinLabel) authMethodPinLabel.style.borderColor = 'rgba(255,255,255,0.1)';
    // Disable PIN when switching back to password
    if (currentUser) {
      currentUser.authMethod = 'password';
      currentUser.pinEnabled = false;
      saveUser(currentUser);
    }
  }
}

function togglePinOption(enabled) {
  // Legacy compatibility: delegates to onAuthMethodChange
  onAuthMethodChange(enabled ? 'pin' : 'password');
  const radio = document.getElementById(enabled ? 'authMethodPin' : 'authMethodPwd');
  if (radio) radio.checked = true;
}

function saveNewPin() {
  const pinInput = document.getElementById('settingPinInput');
  const statusEl = document.getElementById('settingPinStatus');
  const pinVal = pinInput ? pinInput.value.trim() : '';

  if (!pinVal || pinVal.length < 4 || isNaN(pinVal)) {
    if (statusEl) {
      statusEl.style.color = '#ff453a';
      statusEl.textContent = 'El PIN debe ser un número de 4 a 6 dígitos.';
      statusEl.style.display = 'block';
    }
    return;
  }

  if (currentUser) {
    currentUser.pinEnabled = true;
    currentUser.authMethod = 'pin';
    currentUser.pin = String(pinVal);
    saveUser(currentUser);
    if (statusEl) {
      statusEl.style.color = '#30d158';
      statusEl.textContent = '¡PIN guardado y activado exitosamente!';
      statusEl.style.display = 'block';
    }
    if (pinInput) pinInput.value = '';
    renderUserSettings();
  }
}

function saveChangePassword() {
  const currentPassInput = document.getElementById('currentPasswordInput');
  const newPassInput = document.getElementById('newPasswordInput');
  const confirmPassInput = document.getElementById('confirmNewPasswordInput');
  const statusEl = document.getElementById('changePasswordStatus');

  const currentPass = currentPassInput ? currentPassInput.value.trim() : '';
  const newPass = newPassInput ? newPassInput.value.trim() : '';
  const confirmPass = confirmPassInput ? confirmPassInput.value.trim() : '';

  const showStatus = (msg, color) => {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      statusEl.style.display = 'block';
    }
  };

  if (!currentUser) {
    showStatus('No hay sesión activa.', '#ff453a');
    return;
  }

  // Verify current password against stored user password
  const storedPass = currentUser.password || (currentUser.username === 'admin' ? getStoredAdminPassword() : '');
  if (!currentPass || String(storedPass) !== String(currentPass)) {
    showStatus('La contraseña actual es incorrecta.', '#ff453a');
    return;
  }

  if (!newPass || newPass.length < 4) {
    showStatus('La nueva contraseña debe tener al menos 4 caracteres.', '#ff453a');
    return;
  }

  if (newPass !== confirmPass) {
    showStatus('Las contraseñas no coinciden.', '#ff453a');
    return;
  }

  currentUser.password = newPass;
  currentUser.authMethod = 'password';
  currentUser.pinEnabled = false;

  // If admin user, also persist the new password in the dedicated key
  if (currentUser.username && currentUser.username.toLowerCase() === 'admin') {
    storeAdminPassword(newPass);
  }

  saveUser(currentUser);

  // Also update the users list so it persists correctly
  try {
    const raw = localStorage.getItem(USERS_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    const idx = list.findIndex(u => u && u.id === currentUser.id);
    if (idx !== -1) {
      list[idx].password = newPass;
      localStorage.setItem(USERS_KEY, JSON.stringify(list));
    }
  } catch (e) {}

  if (currentPassInput) currentPassInput.value = '';
  if (newPassInput) newPassInput.value = '';
  if (confirmPassInput) confirmPassInput.value = '';
  showStatus('¡Contraseña actualizada exitosamente!', '#30d158');
}

function lockApp() {
  isAuthenticated = false;
  const authScreen = document.getElementById('authScreen');
  const appShell = document.getElementById('appShell');
  const loginUser = document.getElementById('loginUser');
  const loginPin = document.getElementById('loginPin');
  const loginError = document.getElementById('loginError');

  if (appShell) appShell.style.display = 'none';
  if (authScreen) authScreen.style.display = 'flex';

  showLoginForm();
  if (currentUser && loginUser) {
    loginUser.value = currentUser.username || currentUser.name || '';
  }
  if (loginPin) {
    loginPin.value = '';
    loginPin.focus();
  }
  if (loginError) {
    loginError.style.display = 'block';
    loginError.style.color = '#38bdf8';
    loginError.textContent = 'Aplicación Bloqueada. Ingresa tu contraseña para desbloquear.';
  }
}

async function handleLogout() {
  if (typeof AuthService !== 'undefined' && AuthService.logout) {
    await AuthService.logout();
  }

  isAuthenticated = false;
  currentUser = null;
  
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('GARAGEONE_ACTIVE_USER');
    localStorage.removeItem('GARAGEONE_USER');
    for (let v = 1; v <= 30; v++) {
      localStorage.removeItem(`AUTOCARE_USER_V${v}`);
    }
  } catch (e) {}

  const loginUser = document.getElementById('loginUser');
  if (loginUser) loginUser.value = '';
  const loginPin = document.getElementById('loginPin');
  if (loginPin) loginPin.value = '';
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.style.display = 'none';

  const regUser = document.getElementById('regUser');
  if (regUser) regUser.value = '';
  const regEmail = document.getElementById('regEmail');
  if (regEmail) regEmail.value = '';
  const regPassword = document.getElementById('regPassword');
  if (regPassword) regPassword.value = '';
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  if (regConfirmPassword) regConfirmPassword.value = '';

  checkAuth();
}

// State Management
function sanitizeState(parsed) {
  let state = { ...JSON.parse(JSON.stringify(DEFAULT_STATE)), ...parsed };
  if (state.vehicles && Array.isArray(state.vehicles)) {
    state.vehicles = state.vehicles.filter(v => {
      if (!v || !v.id || v.id === 'v1') return false;
      const vName = String(v.name || '').toLowerCase();
      return !vName.includes('vitara') && !vName.includes('toyota');
    });
    if (state.vehicles.length > 0) {
      if (!state.vehicles.some(v => v && v.id === state.activeVehicleId)) {
        state.activeVehicleId = state.vehicles[0].id;
      }
    } else {
      state.activeVehicleId = '';
    }
  } else {
    state.vehicles = [];
    state.activeVehicleId = '';
  }
  state.documents = (state.documents || []).filter(d => d && d.vehicleId !== 'v1');
  state.services = (state.services || []).filter(s => s && s.vehicleId !== 'v1');
  state.fuels = (state.fuels || []).filter(f => f && f.vehicleId !== 'v1');
  state.reminders = (state.reminders || []).filter(r => r && r.vehicleId !== 'v1');
  state.emergencyContacts = state.emergencyContacts || DEFAULT_STATE.emergencyContacts;
  return state;
}

function syncServiceCategoriesWithState() {
  if (!appState.serviceCategories || !Array.isArray(appState.serviceCategories)) {
    appState.serviceCategories = [];
  }
  const defaultCats = ['Aceite', 'Frenos', 'Llantas', 'Filtros', 'Bujías', 'Batería', 'Transmisión', 'Correa', 'Trámite', 'Otro'];
  
  defaultCats.forEach(defName => {
    if (!SERVICE_CATEGORIES.includes(defName)) {
      SERVICE_CATEGORIES.push(defName);
    }
    if (!appState.serviceCategories.some(c => (c.name || c).toLowerCase() === defName.toLowerCase())) {
      appState.serviceCategories.push({
        id: 'cat_def_' + defName.toLowerCase(),
        name: defName,
        affectsHealth: false
      });
    }
  });

  appState.serviceCategories.forEach(c => {
    const catName = typeof c === 'string' ? c : (c.name || '');
    if (catName && !SERVICE_CATEGORIES.includes(catName)) {
      SERVICE_CATEGORIES.push(catName);
    }
  });

  if (appState.services && Array.isArray(appState.services)) {
    appState.services.forEach(s => {
      if (s.category && !SERVICE_CATEGORIES.includes(s.category)) {
        SERVICE_CATEGORIES.push(s.category);
        if (!appState.serviceCategories.some(c => (c.name || c).toLowerCase() === s.category.toLowerCase())) {
          appState.serviceCategories.push({
            id: 'cat_srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: s.category,
            affectsHealth: false
          });
        }
      }
    });
  }
}

function loadState() {
  let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  try {
    const key = getUserStorageKey(currentUser);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = sanitizeState(parsed);
    }
  } catch (e) { console.error('Error loading state from cache:', e); }
  const finalState = sanitizeState(state);

  if (finalState.serviceCategories && Array.isArray(finalState.serviceCategories)) {
    appState.serviceCategories = finalState.serviceCategories;
  }
  syncServiceCategoriesWithState();
  return finalState;
}

function saveState() {
  try {
    syncServiceCategoriesWithState();
    const uId = currentUser ? currentUser.id : null;
    const key = getUserStorageKey(currentUser);
    if (uId) {
      if (Array.isArray(appState.vehicles)) appState.vehicles.forEach(v => { if (v && !v.userId) v.userId = uId; });
      if (Array.isArray(appState.services)) appState.services.forEach(s => { if (s && !s.userId) s.userId = uId; });
      if (Array.isArray(appState.fuels)) appState.fuels.forEach(f => { if (f && !f.userId) f.userId = uId; });
      if (Array.isArray(appState.documents)) appState.documents.forEach(d => { if (d && !d.userId) d.userId = uId; });
      if (Array.isArray(appState.reminders)) appState.reminders.forEach(r => { if (r && !r.userId) r.userId = uId; });
      if (Array.isArray(appState.emergencyContacts)) appState.emergencyContacts.forEach(c => { if (c && !c.userId) c.userId = uId; });
      if (Array.isArray(appState.backupHistory)) appState.backupHistory.forEach(b => { if (b && !b.userId) b.userId = uId; });
    }
    localStorage.setItem(key, JSON.stringify(appState));
  } catch (e) {}

  if (appState.vehicles && Array.isArray(appState.vehicles)) {
    LocalDB.putMany(STORES.VEHICLES, appState.vehicles);
  }
  if (appState.documents && Array.isArray(appState.documents)) {
    LocalDB.putMany(STORES.DOCUMENTS, appState.documents);
  }
  if (appState.reminders && Array.isArray(appState.reminders)) {
    LocalDB.putMany(STORES.REMINDERS, appState.reminders);
  }
  if (appState.services && Array.isArray(appState.services)) {
    LocalDB.putMany(STORES.SERVICES, appState.services);
  }
  if (appState.fuels && Array.isArray(appState.fuels)) {
    LocalDB.putMany(STORES.FUELS, appState.fuels);
  }
}

function resetAllSwipeItems() {
  document.querySelectorAll('.swipe-content').forEach(el => {
    el.style.transform = 'translateX(0px)';
  });
}

// High-Capacity Storage Engine (IndexedDB + LocalStorage 50MB Expansion)
const IDB_NAME = 'GarageOneDB';
const IDB_STORE = 'appStateStore';

function openIDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function loadStateFromIDB() {
  return new Promise((resolve) => {
    openIDB().then(db => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get('appState');
        req.onsuccess = (e) => resolve(e.target.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    }).catch(() => resolve(null));
  });
}

function loadUsersListFromIDB() {
  return new Promise((resolve) => {
    openIDB().then(db => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get('usersList');
        req.onsuccess = (e) => resolve(e.target.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    }).catch(() => resolve(null));
  });
}

async function loadAppStateFromDB() {
  currentUser = AuthService.getCurrentUser();
  const allVehicles = await LocalDB.getAll(STORES.VEHICLES);
  const allServices = await LocalDB.getAll(STORES.SERVICES);
  const allFuels = await LocalDB.getAll(STORES.FUELS);
  const allDocuments = await LocalDB.getAll(STORES.DOCUMENTS);
  const allReminders = await LocalDB.getAll(STORES.REMINDERS);
  appState.users = await LocalDB.getAll(STORES.USERS);

  if (currentUser && currentUser.id) {
    const uId = currentUser.id;
    const isLegacyAdmin = (currentUser.username && currentUser.username.toLowerCase() === 'admin');

    appState.vehicles = (allVehicles || []).filter(v => v && (v.userId === uId || (!v.userId && isLegacyAdmin)));
    appState.services = (allServices || []).filter(s => s && (s.userId === uId || (!s.userId && isLegacyAdmin)));
    appState.fuels = (allFuels || []).filter(f => f && (f.userId === uId || (!f.userId && isLegacyAdmin)));
    appState.documents = (allDocuments || []).filter(d => d && (d.userId === uId || (!d.userId && isLegacyAdmin)));
    appState.reminders = (allReminders || []).filter(r => r && (r.userId === uId || (!r.userId && isLegacyAdmin)));
  } else {
    appState.vehicles = [];
    appState.services = [];
    appState.fuels = [];
    appState.documents = [];
    appState.reminders = [];
  }

  if (appState.vehicles.length > 0) {
    if (!appState.activeVehicleId || !appState.vehicles.some(v => v.id === appState.activeVehicleId)) {
      appState.activeVehicleId = appState.vehicles[0].id;
    }
  } else {
    appState.activeVehicleId = null;
  }
  syncServiceCategoriesWithState();
}

async function initAsyncStorage() {
  await LocalDB.init();
  await AuthService.init();
  await SyncService.init();

  currentUser = AuthService.getCurrentUser();
  isAuthenticated = AuthService.isAuthenticated();

  await loadAppStateFromDB();

  SyncService.onStateChanged(async () => {
    await loadAppStateFromDB();
    renderApp();
    renderRemindersTab();
    renderReports();
    renderGuantera();
    renderUserSettings();
  });

  checkAuth();
  renderApp();
}



function getStorageUsage() {
  try {
    const raw = JSON.stringify(appState);
    const bytes = new Blob([raw]).size;
    const kb = (bytes / 1024).toFixed(1);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    const maxMb = 50;
    const percent = Math.min(100, Math.round((bytes / (maxMb * 1024 * 1024)) * 100));
    return { bytes, kb, mb, percent, maxMb };
  } catch (e) {
    return { bytes: 0, kb: '0', mb: '0', percent: 0, maxMb: 50 };
  }
}

function renderStorageStats() {
  const container = document.getElementById('storageUsageContainer');
  if (!container) return;

  const usage = getStorageUsage();
  let barColor = '#38bdf8';
  if (usage.percent > 70) barColor = '#ffd60a';
  if (usage.percent > 90) barColor = '#ff453a';

  const totalPhotos = (appState.services || []).filter(s => s.receipt).length +
                     (appState.documents || []).filter(d => d.file).length +
                     (appState.vehicles || []).filter(v => v.photo).length;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; margin-bottom:6px;">
      <span>Espacio Ocupado: <strong>${usage.mb} MB</strong> (${usage.kb} KB)</span>
    </div>
    <div style="width:100%; height:10px; background:rgba(255,255,255,0.08); border-radius:5px; overflow:hidden; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05);">
      <div style="width:${Math.max(1, Math.min(100, usage.percent))}%; height:100%; background:${barColor}; border-radius:5px; transition:width 0.3s ease; box-shadow:0 0 10px ${barColor}66;"></div>
    </div>
    <div style="font-size:0.78rem; color:#cbd5e1; line-height:1.4;">
      • ${appState.vehicles ? appState.vehicles.length : 0} vehículo(s) • ${appState.services ? appState.services.length : 0} servicio(s) • ${totalPhotos} archivo(s) almacenados.
    </div>
  `;
}

function autoOptimizeStorageImagesSilent() {
  const compressDataUrl = (dataUrl, maxDim = 500, quality = 0.5, callback) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return callback(dataUrl);
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w <= maxDim && h <= maxDim && dataUrl.length < 40000) return callback(dataUrl);

      if (w > h && w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => callback(dataUrl);
    img.src = dataUrl;
  };

  let tasks = [];
  (appState.services || []).forEach(s => {
    if (s.receipt && s.receipt.length > 40000) {
      tasks.push(cb => compressDataUrl(s.receipt, 500, 0.5, res => { s.receipt = res; cb(); }));
    }
  });

  (appState.documents || []).forEach(d => {
    if (d.file && d.file.length > 40000) {
      tasks.push(cb => compressDataUrl(d.file, 500, 0.5, res => { d.file = res; cb(); }));
    }
  });

  (appState.vehicles || []).forEach(v => {
    if (v.photo && v.photo.length > 40000) {
      tasks.push(cb => compressDataUrl(v.photo, 500, 0.5, res => { v.photo = res; cb(); }));
    }
  });

  if (tasks.length === 0) return;

  let completed = 0;
  tasks.forEach(fn => {
    fn(() => {
      completed++;
      if (completed === tasks.length) {
        saveStateToIDB(appState);
      }
    });
  });
}

function setTodayDates() {
  const todayStr = new Date().toISOString().split('T')[0];
  if (document.getElementById('servDate')) document.getElementById('servDate').value = todayStr;
  if (document.getElementById('fuelDate')) document.getElementById('fuelDate').value = todayStr;
}

function getActiveVehicle() {
  return appState.vehicles.find(v => v.id === appState.activeVehicleId) || appState.vehicles[0];
}

function switchTab(tabId, el) {
  if (currentUser && currentUser.role !== 'admin' && currentUser.permissions) {
    if (currentUser.permissions[tabId] === false) {
      alert('No tienes permisos asignados para acceder a este módulo.');
      if (tabId !== 'tabGarage') {
        switchTab('tabGarage');
      }
      return;
    }
  }

  resetAllSwipeItems();
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.header-icon-btn').forEach(b => b.classList.remove('active'));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');

  const btnRem = document.getElementById('btnHeaderReminders');
  const btnSet = document.getElementById('btnHeaderSettings');
  if (btnRem) {
    btnRem.style.display = 'flex';
    if (tabId === 'tabReminders') btnRem.classList.add('active');
    else btnRem.classList.remove('active');
  }
  if (btnSet) {
    btnSet.style.display = 'flex';
    if (tabId === 'tabSettings') btnSet.classList.add('active');
    else btnSet.classList.remove('active');
  }

  const navMap = {
    'tabGarage': 0,
    'tabMaintenance': 1,
    'tabFuel': 2,
    'tabGuantera': 3,
    'tabHealth': 4,
    'tabAI': 4,
    'tabReports': 5
  };
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  if (navMap[tabId] !== undefined && navItems[navMap[tabId]]) {
    navItems[navMap[tabId]].classList.add('active');
  }

  const logBox = document.getElementById('aiDiagnosticLog');
  if (logBox && tabId !== 'tabAI' && tabId !== 'tabHealth') {
    logBox.style.display = 'none';
    logBox.innerHTML = '';
  }

  if (tabId === 'tabReminders') renderRemindersTab();
  if (tabId === 'tabHealth' || tabId === 'tabAI') renderVehicleHealth();
  if (tabId === 'tabReports') renderReports();
  if (tabId === 'tabSettings') renderUserSettings();
  if (tabId === 'tabGuantera') renderGuantera();

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function selectActiveVehicle(vehId) {
  resetAllSwipeItems();
  appState.activeVehicleId = vehId;
  saveState();
  updateServiceModalUnitLabel();
  updateFuelModalUnitLabel();
  updateNewCategoryModalUnitLabel();
  renderApp();
  renderRemindersTab();
  renderVehicleHealth();
  renderReports();
  renderGuantera();
}

function renderVehicleSelectorPills() {
  const container = document.getElementById('vehicleSelectorPills');
  if (!container) return;

  if (!appState.vehicles || appState.vehicles.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = appState.vehicles.map(v => {
    const isActive = v.id === appState.activeVehicleId;
    return `<button class="pill ${isActive ? 'active' : ''}" onclick="selectActiveVehicle('${v.id}')">${escapeHtml(v.name)} ${v.plate ? `(${escapeHtml(v.plate)})` : ''}</button>`;
  }).join('');

  html += `<button class="pill" onclick="openVehicleModal()" style="border-style:dashed;">+ Nuevo Carro</button>`;
  container.innerHTML = html;
}

function renderApp() {
  renderVehicleSelectorPills();
  renderUserReminders();
  renderMiniVehiclesList();
  renderMaintenanceFilterPills();
  populateServCategorySelect();
  renderCustomCategoriesList();
  renderGuantera();
  renderVehicleHealth();
  const heroEl = document.getElementById('activeVehicleHero');
  if (!heroEl) return;

  const veh = getActiveVehicle();
  if (!veh) {
    heroEl.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <h3>No tienes vehículos registrados</h3>
        <p class="subtitle" style="margin-bottom:12px;">Agrega tu primer auto para comenzar</p>
        <button class="btn btn-primary" onclick="openVehicleModal()">+ Agregar Vehículo</button>
      </div>
    `;
    return;
  }

  const plateText = escapeHtml(veh.plate) || 'SIN PLACA';
  const yearText = veh.year || 'N/A';
  const typeText = escapeHtml(veh.type) || 'N/A';

  heroEl.innerHTML = `
    <div class="hero-main-info">
      <div class="hero-veh-details">
        <div class="hero-title">${escapeHtml(veh.name)}</div>
        <div class="hero-specs-row">
          <div class="hero-spec-item">
            <span class="spec-label" data-i18n="lblPlate">Placa</span>
            <span class="spec-value hero-plate-badge">${plateText}</span>
          </div>
          <div class="hero-spec-item">
            <span class="spec-label" data-i18n="lblYear">Año</span>
            <span class="spec-value">${yearText}</span>
          </div>
          <div class="hero-spec-item">
            <span class="spec-label" data-i18n="lblModelType">Tipo</span>
            <span class="spec-value">${typeText}</span>
          </div>
        </div>
      </div>
      <div class="hero-odometer-box" onclick="openOdometerModal()" style="cursor:pointer;" title="Toca para actualizar odómetro">
        <span class="hero-odometer-lbl"><span data-i18n="lblOdometer">Odómetro</span> ${SVG_ICONS.zap}</span>
        <span class="hero-odometer-val">${formatVehicleDistance(veh.km, veh)}</span>
      </div>
    </div>
    ${veh.photo ? `<img src="${veh.photo}" class="hero-image-preview" alt="Foto Vehículo">` : ''}
  `;

  renderServiceList(veh.id);
  renderFuelList(veh.id);

  setTimeout(initSwipeListeners, 50);
}

function openOdometerModal() {
  const veh = getActiveVehicle();
  if (!veh) { alert('Primero registra un vehículo.'); return; }
  const input = document.getElementById('quickOdometerInput');
  if (input) input.value = veh.km || '';
  openModal('modalOdometer');
}

async function saveOdometer(e) {
  if (e) e.preventDefault();
  const veh = getActiveVehicle();
  if (!veh) { alert('No hay vehículo activo.'); return; }
  const input = document.getElementById('quickOdometerInput');
  const newKm = input ? parseInt(input.value) : NaN;

  if (isNaN(newKm) || newKm < 0) {
    alert('Ingresa un kilometraje válido.');
    return;
  }

  veh.km = newKm;
  veh.updatedAt = new Date().toISOString();

  await SyncService.executeCrud('UPDATE', STORES.VEHICLES, veh);
  saveState();
  closeModal('modalOdometer');
  renderApp();
  renderRemindersTab();
}

function renderMiniVehiclesList() {
  const container = document.getElementById('allVehiclesList');
  if (!container) return;

  if (!appState.vehicles || appState.vehicles.length === 0) {
    container.innerHTML = '<p class="subtitle" style="text-align:center; padding:10px;">No hay vehículos registrados.</p>';
    return;
  }

  container.innerHTML = appState.vehicles.map(v => {
    const isActive = v.id === appState.activeVehicleId;
    return `
      <div class="swipe-container" style="margin-bottom:8px;">
        <div class="swipe-action-bg">
          <button type="button" class="swipe-action-btn" onclick="deleteVehicleDirect('${v.id}', event)">
            ${SVG_ICONS.trash}
            <span>Eliminar</span>
          </button>
        </div>
        <div class="swipe-content vehicle-mini-item ${isActive ? 'active-veh' : ''}" style="background:var(--bg-card); border:1px solid ${isActive ? 'rgba(56,189,248,0.4)' : 'var(--border-color)'}; border-radius:var(--radius-md); padding:12px 14px; display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div style="cursor:pointer; flex:1;" onclick="selectActiveVehicle('${v.id}')">
            <strong style="font-size:0.95rem; color:#ffffff;">${escapeHtml(v.name)} (${v.year}) ${isActive ? '<span style="color:#38bdf8; font-size:0.75rem; margin-left:6px; font-weight:700;">(Activo)</span>' : ''}</strong>
            <div class="veh-info-sub">${escapeHtml(v.type || '')} • ${escapeHtml(v.plate || 'SIN PLACA')} • ${formatVehicleDistance(v.km, v)}</div>
          </div>
          <div class="veh-actions" onclick="event.stopPropagation()">
            <button class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:4px 8px;" onclick="openVehicleModal('${v.id}')">${SVG_ICONS.edit || ''} Editar</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  setTimeout(initSwipeListeners, 50);
}

// Bi-Directional Seamless iOS Swipe Physics Engine
function initSwipeListeners() {
  const items = document.querySelectorAll('.swipe-content');
  items.forEach(el => {
    if (el.dataset.swipeInit) return;
    el.dataset.swipeInit = 'true';

    let startX = 0;
    let startY = 0;
    let initialOffset = 0;
    let isSwiping = false;
    let isPressed = false;
    let currentX = 0;

    const getCoords = (e) => {
      if (e.touches && e.touches[0]) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const handleStart = (e) => {
      const coords = getCoords(e);
      startX = coords.x;
      startY = coords.y;
      isPressed = true;
      isSwiping = false;
      const transformVal = window.getComputedStyle(el).transform;
      if (transformVal !== 'none') {
        const matrix = new WebKitCSSMatrix(transformVal);
        initialOffset = matrix.m41 || 0;
      } else {
        initialOffset = 0;
      }
    };

    const handleMove = (e) => {
      if (!isPressed) return;
      const coords = getCoords(e);
      const deltaX = coords.x - startX;
      const deltaY = coords.y - startY;

      if (!isSwiping) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          isSwiping = true;
          el.classList.add('swiping');
        } else {
          return;
        }
      }

      let newX = initialOffset + deltaX;
      if (newX > 0) newX = 0;
      if (newX < -90) newX = -90;

      currentX = newX;
      el.style.transform = `translateX(${newX}px)`;
    };

    const handleEnd = () => {
      if (!isPressed) return;
      isPressed = false;

      if (isSwiping) {
        el.classList.remove('swiping');
        if (currentX < -40) {
          el.style.transform = `translateX(-80px)`;
        } else {
          el.style.transform = `translateX(0px)`;
        }
      }
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: true });
    el.addEventListener('touchend', handleEnd, { passive: true });

    el.addEventListener('mousedown', handleStart);
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseup', handleEnd);
    el.addEventListener('mouseleave', handleEnd);

    // Auto-close when clicking on the open item body
    el.addEventListener('click', (evt) => {
      if (isSwiping) {
        evt.stopPropagation();
        return;
      }
      const transformVal = window.getComputedStyle(el).transform;
      const matrix = new WebKitCSSMatrix(transformVal);
      if (matrix.m41 < -10) {
        evt.stopPropagation();
        el.style.transform = `translateX(0px)`;
      }
    });
  });
}

// Direct Deletion Functions
async function deleteVehicleDirect(vehId, event = null) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }
  if (!vehId) return;

  if (!confirm('¿Estás seguro de que deseas eliminar este vehículo? Al eliminarlo, se borrarán sus servicios, recargas de gasolina, recordatorios y los datos de salud asociados al vehículo. (Los documentos de Guantera y las configuraciones de servicios permanecerán intactos).')) {
    return;
  }

  const servicesToDelete = (appState.services || []).filter(s => s.vehicleId === vehId);
  const fuelsToDelete = (appState.fuels || []).filter(f => f.vehicleId === vehId);
  const remindersToDelete = (appState.reminders || []).filter(r => r.vehicleId === vehId);

  // 1. Delete from IndexedDB FIRST to prevent race conditions during state reload
  try {
    await LocalDB.delete(STORES.VEHICLES, vehId);
    for (const s of servicesToDelete) {
      await LocalDB.delete(STORES.SERVICES, s.id);
    }
    for (const f of fuelsToDelete) {
      await LocalDB.delete(STORES.FUELS, f.id);
    }
    for (const r of remindersToDelete) {
      await LocalDB.delete(STORES.REMINDERS, r.id);
    }
  } catch (e) {
    console.error('Error al eliminar vehículo y registros en IndexedDB:', e);
  }

  // 2. Remove from in-memory appState immediately (keep documents, emergencyContacts, serviceCategories intact)
  appState.vehicles = (appState.vehicles || []).filter(v => v.id !== vehId);
  appState.services = (appState.services || []).filter(s => s.vehicleId !== vehId);
  appState.fuels = (appState.fuels || []).filter(f => f.vehicleId !== vehId);
  appState.reminders = (appState.reminders || []).filter(r => r.vehicleId !== vehId);

  if (appState.activeVehicleId === vehId) {
    appState.activeVehicleId = appState.vehicles.length > 0 ? appState.vehicles[0].id : '';
  }

  saveState();

  // 3. Immediately re-render UI in real time
  renderApp();
  if (typeof renderRemindersTab === 'function') renderRemindersTab();
  if (typeof renderGuantera === 'function') renderGuantera();
  if (typeof renderVehicleHealth === 'function') renderVehicleHealth();
}

async function deleteServiceDirect(servId, event = null) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }
  if (!servId) return;
  if (!confirm('¿Eliminar este registro de mantenimiento?')) return;
  await SyncService.executeCrud('DELETE', STORES.SERVICES, { id: servId });
  await loadAppStateFromDB();
  renderApp();
}

async function deleteFuelDirect(fuelId, event = null) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }
  if (!fuelId) return;
  if (!confirm('¿Eliminar esta recarga de combustible?')) return;
  await SyncService.executeCrud('DELETE', STORES.FUELS, { id: fuelId });
  await loadAppStateFromDB();
  renderApp();
}

// User Configured Reminders Engine (100% User-Managed)
let currentReminderFilter = 'all';

function filterReminders(filterType, el) {
  currentReminderFilter = filterType;
  document.querySelectorAll('#reminderFilterPills .pill').forEach(p => p.classList.remove('active'));
  if (el && el.classList.contains('pill')) {
    el.classList.add('active');
  } else {
    // If clicked from summary stats card, highlight matching pill
    const matchingPill = document.querySelector(`#reminderFilterPills .pill[onclick*="'${filterType}'"]`);
    if (matchingPill) matchingPill.classList.add('active');
  }
  renderRemindersTab();
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Tu navegador o dispositivo no soporta notificaciones de sistema.');
    return;
  }
  const handlePermission = (permission) => {
    if (permission === 'granted') {
      alert('¡Notificaciones activadas con éxito! GarageOne te avisará de tus recordatorios pendientes.');
      checkAndSendDueNotifications();
    } else if (permission === 'denied') {
      alert('Permiso de notificaciones no concedido.');
    }
  };

  try {
    const res = Notification.requestPermission();
    if (res && typeof res.then === 'function') {
      res.then(handlePermission);
    } else {
      Notification.requestPermission(handlePermission);
    }
  } catch (e) {
    console.error('Error al solicitar permiso de notificaciones:', e);
  }
}

function checkAndSendDueNotifications() {
  // No-op: Notificaciones emergentes push eliminadas. La lógica se gestiona mediante Calendario (.ics)
}

function getReminderCategoryIcon(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('aceite')) return SVG_ICONS.oil || SVG_ICONS.wrench;
  if (cat.includes('freno') || cat.includes('llanta')) return SVG_ICONS.brakes || SVG_ICONS.wrench;
  if (cat.includes('documento') || cat.includes('marchamo') || cat.includes('rtv') || cat.includes('seguro')) return SVG_ICONS.document || SVG_ICONS.wrench;
  if (cat.includes('filtro')) return SVG_ICONS.filters || SVG_ICONS.wrench;
  if (cat.includes('bater') || cat.includes('buj')) return SVG_ICONS.spark || SVG_ICONS.battery;
  return SVG_ICONS.wrench;
}

function getReminderStatus(r, veh) {
  if (!r) return { status: 'ontrack' };

  if (r.completed) {
    return {
      status: 'completed',
      isUrgent: false,
      isUpcoming: false,
      isOnTrack: false,
      isCompleted: true,
      remainingKm: null,
      diffDays: null,
      progressPercent: 100,
      badgeHtml: '<span class="badge-subtle badge-green">⭐ Completado</span>'
    };
  }

  const currentKm = (veh && veh.km) ? Number(veh.km) : 0;
  let isUrgent = false;
  let isUpcoming = false;
  let remainingKm = null;
  let diffDays = null;
  let progressPercent = 0;

  if (r.targetKm) {
    const targetKm = Number(r.targetKm);
    remainingKm = targetKm - currentKm;
    if (targetKm > 0) {
      progressPercent = Math.min(100, Math.max(0, Math.round((currentKm / targetKm) * 100)));
    }
    if (remainingKm <= 0) isUrgent = true;
    else if (remainingKm <= 2000) isUpcoming = true;
  }

  if (r.targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = String(r.targetDate).split('-');
    if (parts.length === 3) {
      const targetD = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      targetD.setHours(0, 0, 0, 0);
      diffDays = Math.round((targetD - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) isUrgent = true;
      else if (diffDays <= 30 && !isUrgent) isUpcoming = true;
    }
  }

  let status = 'ontrack';
  let badgeHtml = '<span class="badge-subtle badge-blue">Al Día</span>';

  if (isUrgent) {
    status = 'urgent';
    badgeHtml = '<span class="badge-subtle badge-red">Vencido</span>';
  } else if (isUpcoming) {
    status = 'upcoming';
    badgeHtml = '<span class="badge-subtle badge-yellow">Próximo</span>';
  }

  return {
    status,
    isUrgent,
    isUpcoming,
    isOnTrack: status === 'ontrack',
    isCompleted: false,
    remainingKm,
    diffDays,
    progressPercent,
    badgeHtml
  };
}

function exportReminderToCalendar(reminder, vehName) {
  if (!reminder || !reminder.targetDate) {
    alert('Selecciona una fecha para el recordatorio.');
    return;
  }

  const title = `GarageOne: ${reminder.title || 'Recordatorio'}`;
  const vehStr = vehName || (getActiveVehicle() ? getActiveVehicle().name : 'Vehículo');
  const description = `GarageOne - ${vehStr}\nCategoría: ${reminder.category || 'Mantenimiento'}${reminder.notes ? '\nNota: ' + reminder.notes : ''}`;

  const [year, month, day] = reminder.targetDate.split('-').map(Number);
  const [hour, minute] = (reminder.time || '09:00').split(':').map(Number);

  const localDate = new Date(year, month - 1, day, hour, minute, 0);
  const endDate = new Date(localDate.getTime() + 30 * 60 * 1000);

  const formatICSDate = (dateObj) => {
    return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startUTC = formatICSDate(localDate);
  const endUTC = formatICSDate(endDate);

  const rruleMap = {
    daily: 'RRULE:FREQ=DAILY',
    weekly: 'RRULE:FREQ=WEEKLY',
    monthly: 'RRULE:FREQ=MONTHLY',
    yearly: 'RRULE:FREQ=YEARLY'
  };

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GarageOne//App//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    'STATUS:CONFIRMED'
  ];

  if (reminder.repeat && rruleMap[reminder.repeat]) {
    icsLines.push(rruleMap[reminder.repeat]);
  }

  icsLines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  const icsContent = icsLines.join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameClean = (reminder.title || 'recordatorio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `recordatorio_${fileNameClean}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

function exportReminderToCalendarDirect(remId, event = null) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }
  const rem = (appState.reminders || []).find(r => r.id === remId);
  const veh = getActiveVehicle();
  if (rem) {
    exportReminderToCalendar(rem, veh ? veh.name : '');
  }
}

function renderRemindersListHelper(remindersList, veh) {
  if (!remindersList || remindersList.length === 0) {
    return `<p class="subtitle" style="text-align:center; padding:20px;">No hay recordatorios registrados.</p>`;
  }

  const repeatLabels = {
    none: 'Una vez',
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual'
  };

  return remindersList.map(r => {
    const categoryIcon = getReminderCategoryIcon(r.category);
    let metaParts = [];

    if (r.targetDate) {
      metaParts.push(`Fecha: <strong>${r.targetDate}${r.time ? ' ' + r.time : ''}</strong>`);
    }
    if (r.repeat && r.repeat !== 'none') {
      metaParts.push(`Frecuencia: <strong>${repeatLabels[r.repeat] || r.repeat}</strong>`);
    }
    if (r.category) {
      metaParts.push(escapeHtml(r.category));
    }

    return `
      <div class="swipe-container">
        <div class="swipe-action-bg">
          <button type="button" class="swipe-action-btn" onclick="deleteReminderDirect('${r.id}', event)">
            ${SVG_ICONS.trash}
            <span>Eliminar</span>
          </button>
        </div>
        <div class="swipe-content log-item-card" onclick="openReminderModal('${r.id}')">
          <div class="log-item-main" style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
            <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
              <div class="log-icon-badge">${categoryIcon}</div>
              <div style="min-width:0; flex:1;">
                <div class="log-title">${escapeHtml(r.title)}</div>
                <div class="log-meta">${metaParts.join(' • ')}</div>
                ${r.notes ? `<div class="log-meta" style="font-style:italic;">Nota: ${escapeHtml(r.notes)}</div>` : ''}
              </div>
            </div>
            ${r.targetDate ? `
              <button type="button" class="btn btn-sm" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:6px 10px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px; cursor:pointer; flex-shrink:0;" onclick="exportReminderToCalendarDirect('${r.id}', event)" title="Agendar en Calendario Nativo (Alarma Offline / Pantalla Bloqueada)">
                ${SVG_ICONS.calendar || ''}
                <span>Agendar</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderUserReminders() {
  const container = document.getElementById('userRemindersList');
  if (!container) return;
  const veh = getActiveVehicle();
  if (!veh) { container.innerHTML = ''; return; }

  const reminders = (appState.reminders || []).filter(r => !r.vehicleId || r.vehicleId === veh.id);
  container.innerHTML = renderRemindersListHelper(reminders, veh);
  setTimeout(initSwipeListeners, 50);
}

function renderRemindersTab() {
  const container = document.getElementById('fullRemindersList');
  if (!container) return;
  const veh = getActiveVehicle();
  if (!veh) { container.innerHTML = '<p class="subtitle" style="text-align:center; padding:20px;">No hay vehículo activo.</p>'; return; }

  const reminders = (appState.reminders || []).filter(r => !r.vehicleId || r.vehicleId === veh.id);
  container.innerHTML = renderRemindersListHelper(reminders, veh);
  setTimeout(initSwipeListeners, 50);
}

function openReminderModal(remId = null) {
  const form = document.getElementById('formReminder');
  if (form) form.reset();
  document.getElementById('remId').value = '';
  document.getElementById('modalReminderTitle').textContent = 'Nuevo Recordatorio';

  if (remId) {
    const r = (appState.reminders || []).find(item => item.id === remId);
    if (r) {
      document.getElementById('modalReminderTitle').textContent = 'Editar Recordatorio';
      document.getElementById('remId').value = r.id;
      document.getElementById('remTitle').value = r.title;
      document.getElementById('remCategory').value = r.category || 'Mantenimiento';
      document.getElementById('remTargetDate').value = r.targetDate || '';
      if (document.getElementById('remTime')) document.getElementById('remTime').value = r.time || '';
      if (document.getElementById('remRepeat')) document.getElementById('remRepeat').value = r.repeat || 'none';
      document.getElementById('remNotes').value = r.notes || '';
    }
  }

  openModal('modalReminder');
}

async function saveReminder(e) {
  e.preventDefault();
  const veh = getActiveVehicle();
  if (!veh) { alert('Primero debes registrar un vehículo.'); return; }

  const remId = document.getElementById('remId').value;
  const title = document.getElementById('remTitle').value.trim();
  const category = document.getElementById('remCategory').value;
  const targetDate = document.getElementById('remTargetDate').value;
  const time = document.getElementById('remTime') ? document.getElementById('remTime').value : '';
  const repeat = document.getElementById('remRepeat') ? document.getElementById('remRepeat').value : 'none';
  const notes = document.getElementById('remNotes').value.trim();

  if (!title) return;

  // Solicitar permiso de notificaciones proactivamente si está en default
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      Notification.requestPermission();
    } catch (e) {}
  }

  let targetRem = null;

  if (remId) {
    targetRem = (appState.reminders || []).find(r => r.id === remId);
    if (targetRem) {
      targetRem.title = title;
      targetRem.category = category;
      targetRem.targetDate = targetDate;
      targetRem.time = time;
      targetRem.repeat = repeat;
      targetRem.notes = notes;
      targetRem.updatedAt = new Date().toISOString();
      await SyncService.executeCrud('UPDATE', STORES.REMINDERS, targetRem);
    }
  } else {
    targetRem = {
      id: 'rem_' + Date.now(),
      vehicleId: veh.id,
      title, category, targetDate, time, repeat, notes,
      createdAt: new Date().toISOString()
    };
    appState.reminders = appState.reminders || [];
    appState.reminders.push(targetRem);
    await SyncService.executeCrud('CREATE', STORES.REMINDERS, targetRem);
  }

  saveState();
  closeModal('modalReminder');
  document.getElementById('formReminder').reset();
  renderUserReminders();
  renderRemindersTab();
  checkAndSendDueNotifications();

  if (targetRem && targetRem.targetDate) {
    setTimeout(() => {
      if (confirm(`¿Agendar "${targetRem.title}" en tu calendario?`)) {
        exportReminderToCalendar(targetRem, veh ? veh.name : '');
      }
    }, 200);
  }
}

async function deleteReminderDirect(remId, event = null) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }
  if (!remId) return;
  if (!confirm('¿Eliminar este recordatorio?')) return;
  await SyncService.executeCrud('DELETE', STORES.REMINDERS, { id: remId });
  await loadAppStateFromDB();
  renderUserReminders();
  renderRemindersTab();
}

// Emergency Contacts & Important Phone Numbers Engine
function renderEmergencyContacts() {
  const container = document.getElementById('emergencyContactsList');
  if (!container) return;

  const contacts = appState.emergencyContacts || [];
  if (contacts.length === 0) {
    container.innerHTML = `<p class="subtitle" style="text-align:center; color:rgba(255,255,255,0.7); width:100%; grid-column: 1 / -1;">No hay números guardados.</p>`;
    return;
  }

  container.innerHTML = contacts.map(c => `
    <div class="swipe-container">
      <div class="swipe-action-bg">
        <button class="swipe-action-btn" onclick="deleteEmergencyContactDirect('${c.id}')">
          ${SVG_ICONS.trash}
          <span>${t('deleteBtn', 'Eliminar')}</span>
        </button>
      </div>
      <div class="swipe-content contact-card-item" onclick="openContactModal('${c.id}')">
        <div class="contact-info">
          <span class="contact-name">${escapeHtml(c.name)}</span>
          <span class="contact-sub">${escapeHtml(c.category)} • ${escapeHtml(c.phone)}</span>
          ${c.notes ? `<span class="contact-sub" style="font-style:italic;">${escapeHtml(c.notes)}</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:6px;" onclick="event.stopPropagation()">
          <button class="btn-call-direct" onclick="callContact('${escapeHtml(c.phone)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>${t('callBtn', 'Llamar')}</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  setTimeout(initSwipeListeners, 50);
}

function openContactModal(contactId = null) {
  const form = document.getElementById('formContact');
  if (form) form.reset();
  document.getElementById('contactId').value = '';
  document.getElementById('modalContactTitle').textContent = 'Nuevo Contacto Importante';

  if (contactId) {
    const c = (appState.emergencyContacts || []).find(item => item.id === contactId);
    if (c) {
      document.getElementById('modalContactTitle').textContent = 'Editar Contacto';
      document.getElementById('contactId').value = c.id;
      document.getElementById('contactName').value = c.name;
      document.getElementById('contactPhone').value = c.phone;
      document.getElementById('contactCategory').value = c.category || 'Auxilio';
      if (document.getElementById('contactNotes')) document.getElementById('contactNotes').value = c.notes || '';
    }
  }

  openModal('modalContact');
}

function saveEmergencyContact(e) {
  e.preventDefault();
  const contactId = document.getElementById('contactId').value;
  const name = document.getElementById('contactName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const category = document.getElementById('contactCategory').value;
  const notes = document.getElementById('contactNotes') ? document.getElementById('contactNotes').value.trim() : '';

  if (!name || !phone) return;

  appState.emergencyContacts = appState.emergencyContacts || [];

  if (contactId) {
    const existing = appState.emergencyContacts.find(c => c.id === contactId);
    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.category = category;
      existing.notes = notes;
    }
  } else {
    const newContact = {
      id: 'c_' + Date.now(),
      name, phone, category, notes
    };
    appState.emergencyContacts.push(newContact);
  }

  saveState();
  closeModal('modalContact');
  document.getElementById('formContact').reset();
  renderEmergencyContacts();
}

function deleteEmergencyContactDirect(contactId) {
  appState.emergencyContacts = (appState.emergencyContacts || []).filter(c => c.id !== contactId);
  saveState();
  renderEmergencyContacts();
}

function callContact(phone) {
  if (!phone) return;
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  window.location.href = `tel:${cleanPhone}`;
}

// Render Dynamic Filter Pills for Maintenance Tab
function renderMaintenanceFilterPills() {
  const container = document.getElementById('maintenanceFilterPills');
  if (!container) return;

  let html = `<button class="pill ${currentFilter === 'all' ? 'active' : ''}" onclick="filterLogs('all', this)">Todos</button>`;
  
  SERVICE_CATEGORIES.forEach(cat => {
    html += `<button class="pill ${currentFilter === cat ? 'active' : ''}" onclick="filterLogs('${cat}', this)">${escapeHtml(cat)}</button>`;
  });
  
  container.innerHTML = html;
}

/**
 * Pobla el selector de categorías al crear o editar un servicio.
 * Excluye los servicios predefinidos del sistema para mostrar únicamente
 * los creados manualmente por el usuario.
 */
function populateServCategorySelect() {
  const select = document.getElementById('servCategory');
  if (!select) return;

  const currentVal = select.value;
  let html = '';

  const allCatsSet = new Set(DEFAULT_SYSTEM_CATEGORIES);

  (appState.serviceCategories || []).forEach(c => {
    const name = typeof c === 'string' ? c : (c ? c.name : '');
    if (name) allCatsSet.add(name);
  });

  (SERVICE_CATEGORIES || []).forEach(cat => {
    if (cat && typeof cat === 'string') allCatsSet.add(cat);
  });

  const categoriesList = Array.from(allCatsSet);

  categoriesList.forEach(cat => {
    html += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`;
  });

  html += `<option value="__NEW__">+ Crear nuevo servicio...</option>`;

  select.innerHTML = html;

  if (currentVal && select.querySelector(`option[value="${escapeHtml(currentVal)}"]`)) {
    select.value = currentVal;
  }
}

function openNewCategoryModal() {
  if (document.getElementById('formNewCategory')) {
    document.getElementById('formNewCategory').reset();
  }
  if (document.getElementById('editCatOldName')) {
    document.getElementById('editCatOldName').value = '';
  }
  if (document.getElementById('newCatName')) {
    document.getElementById('newCatName').value = '';
  }
  if (document.getElementById('modalNewCategoryTitle')) {
    document.getElementById('modalNewCategoryTitle').textContent = 'Crear Nuevo Servicio';
  }
  if (document.getElementById('newCatAffectsHealth')) {
    document.getElementById('newCatAffectsHealth').checked = false;
  }
  if (document.getElementById('newCatHealthFieldsContainer')) {
    document.getElementById('newCatHealthFieldsContainer').style.display = 'none';
  }
  if (document.getElementById('newCatIntervalKm')) {
    document.getElementById('newCatIntervalKm').value = '';
  }
  if (document.getElementById('newCatIntervalMonths')) {
    document.getElementById('newCatIntervalMonths').value = '';
  }
  updateNewCategoryModalUnitLabel();
  openModal('modalNewCategory');
}

/**
 * Maneja el cambio de selección en el selector de categoría de servicios.
 * @param {string} val - Valor seleccionado.
 */
function handleServCategoryChange(val) {
  if (val === '__NEW__') {
    openNewCategoryModal();
    const select = document.getElementById('servCategory');
    if (select) select.selectedIndex = 0;
  }
}

/**
 * Renderiza la lista de servicios personalizados disponibles creados por el usuario.
 * Omite los servicios predefinidos por el sistema.
 */
function renderCustomCategoriesList() {
  const container = document.getElementById('customCategoriesListContainer');
  if (!container) return;

  syncServiceCategoriesWithState();

  const customCatsSet = new Set();
  (appState.serviceCategories || []).forEach(c => {
    const name = typeof c === 'string' ? c : (c ? c.name : '');
    if (name && !isDefaultCategory(name)) {
      customCatsSet.add(name);
    }
  });

  (SERVICE_CATEGORIES || []).forEach(c => {
    if (c && typeof c === 'string' && !isDefaultCategory(c)) {
      customCatsSet.add(c);
    }
  });

  const cats = Array.from(customCatsSet);
  const healthCats = appState.serviceCategories || [];

  if (cats.length === 0) {
    container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:10px;">No hay servicios personalizados creados por el usuario.</div>`;
    return;
  }

  container.innerHTML = cats.map(cat => {
    const hInfo = healthCats.find(c => (typeof c === 'object' && c && c.name ? c.name.toLowerCase() : String(c).toLowerCase()) === cat.toLowerCase());
    const isHealth = hInfo && (hInfo.affectsHealth === true || String(hInfo.affectsHealth) === 'true');
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; font-size:0.83rem; border:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:var(--text-primary); font-weight:600;">${escapeHtml(cat)}</span>
          ${isHealth ? '<span style="font-size:0.7rem; color:#38bdf8; background:rgba(56,189,248,0.12); padding:2px 6px; font-weight:600;">Salud</span>' : ''}
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.72rem; padding:3px 8px;" onclick="loadCategoryForEdit('${escapeHtml(cat)}')">Editar</button>
          <button type="button" class="btn btn-tertiary btn-sm" style="font-size:0.72rem; padding:3px 8px; color:#ff453a;" onclick="deleteCategory('${escapeHtml(cat)}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Carga los datos de una categoría personalizada para su edición en el modal.
 * @param {string} catName - Nombre del servicio a editar.
 */
function loadCategoryForEdit(catName) {
  updateNewCategoryModalUnitLabel();
  document.getElementById('editCatOldName').value = catName;
  document.getElementById('newCatName').value = catName;
  document.getElementById('modalNewCategoryTitle').textContent = 'Editar Servicio';

  const healthCats = appState.serviceCategories || [];
  const hInfo = healthCats.find(c => c.name && c.name.toLowerCase() === catName.toLowerCase());

  const affectsCheck = document.getElementById('newCatAffectsHealth');
  const container = document.getElementById('newCatHealthFieldsContainer');

  if (hInfo && hInfo.affectsHealth === true) {
    if (affectsCheck) affectsCheck.checked = true;
    if (container) container.style.display = 'block';
    if (document.getElementById('newCatIntervalKm')) document.getElementById('newCatIntervalKm').value = hInfo.recommendedIntervalKm || '';
    if (document.getElementById('newCatIntervalMonths')) document.getElementById('newCatIntervalMonths').value = hInfo.recommendedIntervalMonths || '';
  } else {
    if (affectsCheck) affectsCheck.checked = false;
    if (container) container.style.display = 'none';
    if (document.getElementById('newCatIntervalKm')) document.getElementById('newCatIntervalKm').value = '';
    if (document.getElementById('newCatIntervalMonths')) document.getElementById('newCatIntervalMonths').value = '';
  }
}

/**
 * Alias para cargar una categoría para su edición.
 * @param {string} oldName - Nombre previo del servicio.
 */
function editCategoryName(oldName) {
  loadCategoryForEdit(oldName);
}

/**
 * Elimina una categoría personalizada creada por el usuario.
 * @param {string} catName - Nombre del servicio a eliminar.
 */
function deleteCategory(catName) {
  if (isDefaultCategory(catName)) {
    alert('Los servicios predefinidos por el sistema no se pueden eliminar.');
    return;
  }
  if (!confirm(`¿Eliminar el servicio "${catName}"?`)) return;

  const idx = SERVICE_CATEGORIES.indexOf(catName);
  if (idx !== -1) {
    SERVICE_CATEGORIES.splice(idx, 1);
  }

  if (appState.serviceCategories && Array.isArray(appState.serviceCategories)) {
    appState.serviceCategories = appState.serviceCategories.filter(c => {
      const cName = typeof c === 'string' ? c : (c.name || '');
      return cName.toLowerCase() !== catName.toLowerCase();
    });
  }

  saveState();
  populateServCategorySelect();
  renderMaintenanceFilterPills();
  renderCustomCategoriesList();
  if (typeof renderVehicleHealth === 'function') renderVehicleHealth();
}

/**
 * Guarda o actualiza un servicio personalizado creado manualmente por el usuario.
 * @param {Event} e - Evento de envío del formulario.
 */
function saveNewCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCatName').value.trim();
  if (!name) return;

  const oldName = document.getElementById('editCatOldName')?.value || '';

  if (oldName && oldName !== name) {
    const idx = SERVICE_CATEGORIES.indexOf(oldName);
    if (idx !== -1) SERVICE_CATEGORIES[idx] = name;
    (appState.services || []).forEach(s => {
      if (s.category === oldName) s.category = name;
    });
  } else if (!SERVICE_CATEGORIES.includes(name)) {
    SERVICE_CATEGORIES.push(name);
  }

  const affectsHealth = document.getElementById('newCatAffectsHealth')?.checked || false;
  const intervalKm = Number(document.getElementById('newCatIntervalKm')?.value) || 0;
  const intervalMonths = Number(document.getElementById('newCatIntervalMonths')?.value) || 0;

  if (!appState.serviceCategories) appState.serviceCategories = [];
  const existingIdx = appState.serviceCategories.findIndex(c => c.name && c.name.toLowerCase() === (oldName || name).toLowerCase());

  if (existingIdx !== -1) {
    appState.serviceCategories[existingIdx] = {
      ...appState.serviceCategories[existingIdx],
      name,
      affectsHealth,
      recommendedIntervalKm: intervalKm,
      recommendedIntervalMonths: intervalMonths,
      isCustom: true
    };
  } else {
    appState.serviceCategories.push({
      id: 'cat_custom_' + Date.now(),
      name,
      affectsHealth,
      recommendedIntervalKm: intervalKm,
      recommendedIntervalMonths: intervalMonths,
      isCustom: true
    });
  }

  saveState();
  closeModal('modalNewCategory');
  document.getElementById('formNewCategory').reset();
  if (document.getElementById('editCatOldName')) document.getElementById('editCatOldName').value = '';
  if (document.getElementById('modalNewCategoryTitle')) document.getElementById('modalNewCategoryTitle').textContent = 'Crear Nuevo Servicio';
  if (document.getElementById('newCatHealthFieldsContainer')) document.getElementById('newCatHealthFieldsContainer').style.display = 'none';

  populateServCategorySelect();
  renderMaintenanceFilterPills();
  renderCustomCategoriesList();
  if (typeof renderVehicleHealth === 'function') renderVehicleHealth();

  const select = document.getElementById('servCategory');
  if (select) select.value = name;
}

// Guantera Digital Functions
function renderGuantera() {
  renderEmergencyContacts();
  const container = document.getElementById('documentList');
  if (!container) return;

  const veh = getActiveVehicle();
  if (!veh) {
    container.innerHTML = '<p class="subtitle" style="text-align:center; padding:20px;">No hay vehículo activo.</p>';
    return;
  }

  const docs = (appState.documents || []).filter(d => d.vehicleId === veh.id);

  if (docs.length === 0) {
    container.innerHTML = `<p class="subtitle" style="text-align:center; padding:20px;">No has registrado ningún documento a la guantera digital</p>`;
    return;
  }

  docs.sort((a, b) => new Date(a.expDate) - new Date(b.expDate));

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = docs.map(d => {
    let badgeClass = 'badge-green';
    let statusText = 'Vigente';

    const diffDays = Math.ceil((new Date(d.expDate) - new Date(today)) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      badgeClass = 'badge-red';
      statusText = `VENCIDO (${Math.abs(diffDays)}d)`;
    } else if (diffDays <= 30) {
      badgeClass = 'badge-blue';
      statusText = `Vence en ${diffDays}d`;
    }

    return `
      <div class="swipe-container">
        <div class="swipe-action-bg">
          <button type="button" class="swipe-action-btn" onclick="deleteDocumentDirect('${d.id}', event)">
            ${SVG_ICONS.trash}
            <span>Eliminar</span>
          </button>
        </div>
        <div class="swipe-content log-item-card" onclick="openDocumentModal('${d.id}')">
          <div class="log-item-main">
            <div class="log-icon-badge">${SVG_ICONS.document}</div>
            <div>
              <div class="log-title">${escapeHtml(d.title)}</div>
              <div class="log-meta">Vence: <strong>${d.expDate || d.expirationDate || ''}</strong> ${d.phone ? '• Tel: ' + escapeHtml(d.phone) : ''}</div>
              ${d.notes ? `<div class="log-meta" style="font-style:italic;">Nota: ${escapeHtml(d.notes)}</div>` : ''}
            </div>
          </div>
          <div class="log-item-side" style="display:flex; flex-direction:column; align-items:flex-end; justify-content:center; gap:4px; flex-shrink:0; min-width:max-content; text-align:right;">
            <span class="badge-subtle ${badgeClass}" style="white-space:nowrap; font-weight:700;">${statusText}</span>
            ${d.file ? `<button class="btn btn-secondary btn-sm" style="margin-top:4px; padding:2px 8px; font-size:0.75rem;" onclick="event.stopPropagation(); viewDocumentFile('${d.id}')">Ver Adjunto</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openDocumentModal(docId = null) {
  const form = document.getElementById('formDocument');
  if (form) form.reset();
  document.getElementById('docId').value = '';
  if (document.getElementById('docFile')) document.getElementById('docFile').value = '';
  document.getElementById('modalDocumentTitle').textContent = 'Agregar Documento';

  if (docId) {
    const d = (appState.documents || []).find(item => item.id === docId);
    if (d) {
      document.getElementById('modalDocumentTitle').textContent = 'Editar Documento';
      document.getElementById('docId').value = d.id;
      document.getElementById('docType').value = d.type;
      document.getElementById('docTitle').value = d.title;
      document.getElementById('docExpDate').value = d.expDate;
      document.getElementById('docPhone').value = d.phone || '';
      if (document.getElementById('docNotes')) document.getElementById('docNotes').value = d.notes || '';
    }
  }

  openModal('modalDocument');
}

function saveDocument(e) {
  e.preventDefault();
  const veh = getActiveVehicle();
  if (!veh) { alert('Primero debes registrar un vehículo.'); return; }

  const docId = document.getElementById('docId').value;
  const type = document.getElementById('docType').value;
  const title = document.getElementById('docTitle').value;
  const expDate = document.getElementById('docExpDate').value;
  const phone = document.getElementById('docPhone').value;
  const notes = document.getElementById('docNotes') ? document.getElementById('docNotes').value.trim() : '';
  const fileInput = document.getElementById('docFile');

  let targetDoc = docId ? (appState.documents || []).find(d => d.id === docId) : null;

  const processAndSave = (fileBase64) => {
    if (targetDoc) {
      targetDoc.type = type;
      targetDoc.title = title;
      targetDoc.expDate = expDate;
      targetDoc.phone = phone;
      targetDoc.notes = notes;
      if (fileBase64) targetDoc.file = fileBase64;
    } else {
      const newDoc = {
        id: 'd_' + Date.now(),
        vehicleId: veh.id,
        type, title, expDate, phone, notes, file: fileBase64
      };
      appState.documents = appState.documents || [];
      appState.documents.push(newDoc);
    }

    saveState();
    closeModal('modalDocument');
    document.getElementById('formDocument').reset();
    renderApp();
  };

  if (fileInput.files && fileInput.files[0]) {
    readAndCompressImage(fileInput.files[0], processAndSave);
  } else {
    processAndSave('');
  }
}

async function deleteDocumentDirect(docId, event = null) {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch (e) {}
  }
  if (!docId) return;
  if (confirm('¿Eliminar este documento de la Guantera?')) {
    await SyncService.executeCrud('DELETE', STORES.DOCUMENTS, { id: docId });
    await loadAppStateFromDB();
    renderApp();
  }
}

function viewDocumentFile(docId) {
  const doc = (appState.documents || []).find(d => d.id === docId);
  if (doc && doc.file) {
    document.getElementById('receiptContainer').innerHTML = `
      <img src="${doc.file}" alt="Documento ${escapeHtml(doc.title)}">
    `;
    openModal('modalReceiptViewer');
  }
}

function renderAiSettingsInputs() {
  const modeSelect = document.getElementById('aiEngineModeSelect');
  const groqInput = document.getElementById('groqApiKeyInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');

  let mode = appState.aiEngineMode || 'gemini_key';
  if (mode !== 'gemini_key' && mode !== 'groq_key') mode = 'gemini_key';
  appState.aiEngineMode = mode;

  if (modeSelect) modeSelect.value = mode;
  if (groqInput) groqInput.value = appState.groqApiKey || '';
  if (geminiInput) geminiInput.value = appState.geminiApiKey || '';

  onAiEngineModeChange(mode);
}

// AI Mechanical Diagnostic & Prediction Engine
function renderAIDiagnostic() {
  renderAiSettingsInputs();

  const statusBanner = document.getElementById('aiConnectionStatusBanner');
  if (statusBanner) {
    statusBanner.innerHTML = '';
    statusBanner.style.display = 'none';
  }

  const container = document.getElementById('aiDiagnosticCard');
  if (!container) return;

  const veh = getActiveVehicle();
  if (!veh) {
    container.innerHTML = '<p class="subtitle" style="text-align:center; padding:12px;">Agrega tu primer vehículo en la pestaña Garaje para generar un diagnóstico inteligente de salud vehicular y recomendaciones de IA.</p>';
    return;
  }

  const services = appState.services.filter(s => s.vehicleId === veh.id);
  const fuels = appState.fuels.filter(f => f.vehicleId === veh.id);
  const reminders = (appState.reminders || []).filter(r => r.vehicleId === veh.id && !r.completed);

  let currentYear = new Date().getFullYear();
  let vehicleAge = Math.max(1, currentYear - veh.year);
  let avgKmPerYear = Math.round(veh.km / vehicleAge);

  let lastService = services.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  let healthScore = 95;
  if (veh.km > 100000) healthScore -= 10;
  if (veh.km > 180000) healthScore -= 10;
  if (vehicleAge > 10) healthScore -= 10;
  if (services.length === 0) healthScore -= 15;
  healthScore = Math.max(50, healthScore);

  let healthStatusText = healthScore >= 85 ? 'Estado Excelente' : healthScore >= 70 ? 'Buen Estado' : 'Atención Requerida';
  let healthBadgeClass = healthScore >= 85 ? 'badge-green' : healthScore >= 70 ? 'badge-yellow' : 'badge-red';

  let nextOilKm = Math.ceil((veh.km + 5000) / 5000) * 5000;
  let nextTimingBeltKm = 100000;
  if (veh.km >= 100000) nextTimingBeltKm = Math.ceil((veh.km + 80000) / 80000) * 80000;

  container.innerHTML = `
    <div class="ai-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
      <div>
        <h3 style="margin:0; font-size:1.05rem; display:flex; align-items:center; gap:6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Diagnóstico y Predicción IA - ${escapeHtml(veh.name)}
        </h3>
        <span style="font-size:0.78rem; color:var(--text-secondary);">${veh.year} • ${escapeHtml(veh.plate || 'Sin Placa')} • ${formatVehicleDistance(veh.km, veh)}</span>
      </div>
      <span class="badge-subtle ${healthBadgeClass}" style="font-size:0.78rem; font-weight:700;">${healthScore}% ${healthStatusText}</span>
    </div>

    <div style="background:rgba(255,255,255,0.06); padding:10px 12px; border-radius:10px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#cbd5e1; margin-bottom:6px;">
        <span>Índice de Salud y Conservación Vehicular</span>
        <strong style="color:#38bdf8;">${healthScore} / 100 PTS</strong>
      </div>
      <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
        <div style="width:${healthScore}%; height:100%; background:${healthScore >= 85 ? '#30d158' : healthScore >= 70 ? '#ffd60a' : '#ff453a'}; border-radius:4px;"></div>
      </div>
    </div>

    <div class="ai-item-row" style="margin-bottom:10px; background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.2); padding:10px 12px; border-radius:10px;">
      <div class="ai-item-title" style="font-weight:700; color:#38bdf8; font-size:0.88rem; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Predicción Inteligente de Mantenimientos Futuros
      </div>
      <div class="ai-item-body" style="font-size:0.83rem; color:#cbd5e1; line-height:1.4;">
        • <strong>Próximo Cambio de Aceite Sintético:</strong> Estimado a los <strong style="color:#ffffff;">${formatVehicleDistance(nextOilKm, veh)}</strong> (${formatVehicleDistance(Math.max(100, nextOilKm - veh.km), veh)} restantes).<br>
        • <strong>Revisión del Sistema de Frenos:</strong> Inspección recomendada de pastillas y discos en <strong style="color:#ffffff;">3 meses</strong>.<br>
        • <strong>Correa / Cadena de Distribución:</strong> Sustitución o revisión preventiva programada hacia los <strong style="color:#ffffff;">${formatVehicleDistance(nextTimingBeltKm, veh)}</strong>.
      </div>
    </div>
  `;

  updateAiStatusHeader();
  renderAiChatHistory();
}

let currentActiveAiChatId = null;

async function renderAiChatHistory() {
  const container = document.getElementById('aiChatHistoryList');
  if (!container) return;

  if (!currentUser || !currentUser.id) {
    container.innerHTML = '<p class="subtitle" style="font-size:0.8rem; text-align:center;">Inicia sesión para ver tu historial de IA.</p>';
    return;
  }

  const allChats = await LocalDB.getAll(STORES.AI_CHATS);
  const userChats = (allChats || [])
    .filter(c => c && c.userId === currentUser.id && !c.isDeleted)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  if (userChats.length === 0) {
    container.innerHTML = '<p class="subtitle" style="font-size:0.8rem; margin:4px 0; text-align:center;">No tienes conversaciones anteriores guardadas.</p>';
    return;
  }

  const recent = userChats.slice(0, 10);

  container.innerHTML = recent.map(chat => {
    const isActive = chat.id === currentActiveAiChatId;
    const msgCount = (chat.messages || []).length;
    const dateStr = (chat.updatedAt || chat.createdAt || '').split('T')[0];

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:${isActive ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isActive ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}; padding:8px 12px; border-radius:8px;">
        <div style="cursor:pointer; flex:1; overflow:hidden;" onclick="loadAiChat('${chat.id}')">
          <strong style="font-size:0.85rem; color:${isActive ? '#38bdf8' : '#ffffff'}; display:block; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(chat.title || 'Consulta de IA')}</strong>
          <span style="font-size:0.75rem; color:var(--text-secondary);">${dateStr} • ${msgCount} mensaje(s)</span>
        </div>
        <button type="button" class="btn btn-tertiary btn-sm" style="color:#ff453a; font-size:0.75rem; padding:2px 6px;" onclick="deleteAiChat('${chat.id}', event)">Eliminar</button>
      </div>
    `;
  }).join('');
}

async function loadAiChat(chatId) {
  const chat = await LocalDB.get(STORES.AI_CHATS, chatId);
  if (!chat || chat.userId !== currentUser.id) return;

  currentActiveAiChatId = chat.id;
  const responseBox = document.getElementById('aiChatResponse');
  if (!responseBox) return;

  responseBox.style.display = 'block';

  const formatText = (txt) => {
    return (txt || '')
      .replace(/### (.*?)\n/g, '<h4 style="color:#38bdf8; margin:12px 0 4px 0; font-size:0.95rem;">$1</h4>')
      .replace(/## (.*?)\n/g, '<h3 style="color:#ffffff; margin:14px 0 6px 0; font-size:1.05rem;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px;">$1</code>')
      .replace(/\n/g, '<br>');
  };

  let html = `<div style="display:inline-flex; align-items:center; gap:6px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:4px 10px; border-radius:12px; font-size:0.78rem; font-weight:700; margin-bottom:12px;">Conversación Retomada: ${escapeHtml(chat.title)}</div><br>`;

  (chat.messages || []).forEach(m => {
    if (m.role === 'user') {
      html += `<div style="margin-top:10px; font-weight:700; color:#38bdf8;">Tú: ${escapeHtml(m.content)}</div>`;
    } else {
      html += `<div style="margin-top:6px; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">${formatText(m.content)}</div>`;
    }
  });

  responseBox.innerHTML = html;
  renderAiChatHistory();
}

function startNewAiChat() {
  currentActiveAiChatId = null;
  const responseBox = document.getElementById('aiChatResponse');
  const input = document.getElementById('aiUserQuestion');
  if (responseBox) {
    responseBox.style.display = 'none';
    responseBox.innerHTML = '';
  }
  if (input) input.value = '';
  renderAiChatHistory();
}

async function deleteAiChat(chatId, e) {
  if (e) e.stopPropagation();
  if (confirm('¿Deseas borrar esta conversación de tu historial?')) {
    await SyncService.executeCrud('DELETE', STORES.AI_CHATS, { id: chatId });
    if (currentActiveAiChatId === chatId) {
      startNewAiChat();
    } else {
      renderAiChatHistory();
    }
  }
}

function askQuickPrompt(promptText) {
  const input = document.getElementById('aiUserQuestion');
  if (input) {
    input.value = promptText;
    askAIAssistantDirect(promptText);
  }
}

function askAIAssistant(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('aiUserQuestion');
  const question = input ? input.value.trim() : '';
  if (question) askAIAssistantDirect(question);
}

async function executeAiQuery(promptText, userQuestion) {
  const mode = appState.aiEngineMode || 'gemini_key';
  const apiKey = (mode === 'gemini_key') ? (appState.geminiApiKey || '').trim() : (appState.groqApiKey || '').trim();
  const providerName = (mode === 'gemini_key') ? 'Google Gemini' : 'Groq Llama 3.3';

  if (!apiKey) return { success: false, error: 'Sin clave de API' };

  if (mode === 'gemini_key') {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : '';
        if (text) return { success: true, text, providerName };
      }
    } catch (e) {}
  } else if (mode === 'groq_key') {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Eres un experto mecánico automotriz e IA de GarageOne.' },
            { role: 'user', content: promptText }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
        if (text) return { success: true, text, providerName };
      }
    } catch (e) {}
  }

  return { success: false, error: 'Error procesando respuesta con servidor remoto' };
}

async function askAIAssistantDirect(question) {
  const input = document.getElementById('aiUserQuestion');
  const responseBox = document.getElementById('aiChatResponse');

  if (!question || !responseBox) return;

  responseBox.style.display = 'block';
  responseBox.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg> <span style="color:#38bdf8; font-weight:600;">Analizando consulta...</span></div>';

  try {
    const veh = getActiveVehicle();
    const services = veh ? appState.services.filter(s => s.vehicleId === veh.id).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
    const reminders = veh ? (appState.reminders || []).filter(r => r.vehicleId === veh.id && !r.completed) : [];

    const recentServicesText = services.slice(0, 5).map(s => `- ${s.date}: ${s.category} (${s.title}) - ${formatCurrency(s.cost)}`).join('\n') || 'Sin servicios previos registrados';
    const pendingRemindersText = reminders.map(r => `- ${r.title} (${r.category}) ${r.targetKm ? 'Meta: ' + formatVehicleDistance(r.targetKm, veh) : ''}`).join('\n') || 'Sin recordatorios pendientes';

    const vehContext = veh 
      ? `${veh.name} (Año ${veh.year}, ${veh.type}, ${formatVehicleDistance(veh.km, veh)} en Odómetro, Placa: ${veh.plate || 'N/A'})` 
      : 'vehículo no seleccionado';

    const formatText = (txt) => {
      return (txt || '')
        .replace(/### (.*?)\n/g, '<h4 style="color:#38bdf8; margin:12px 0 4px 0; font-size:0.95rem;">$1</h4>')
        .replace(/## (.*?)\n/g, '<h3 style="color:#ffffff; margin:14px 0 6px 0; font-size:1.05rem;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px;">$1</code>')
        .replace(/\n/g, '<br>');
    };

    const promptText = `Eres el Asistente Técnico, Mecánico Experto e Inteligencia Artificial Principal de GarageOne.
Información del Vehículo Actual: ${vehContext}
Mantenimientos Recientes: ${recentServicesText}
Recordatorios: ${pendingRemindersText}
Consulta: "${question}"`;

    let responseText = '';
    let isLive = false;

    const mode = appState.aiEngineMode || 'gemini_key';
    const activeKey = (mode === 'gemini_key') ? appState.geminiApiKey : appState.groqApiKey;

    if (appState.aiApiConnected && activeKey && activeKey.trim().length > 5) {
      const aiRes = await executeAiQuery(promptText, question);
      if (aiRes.success) {
        isLive = true;
        const liveBadge = `<div style="display:inline-flex; align-items:center; gap:6px; background:rgba(48,209,88,0.15); color:#30d158; border:1px solid rgba(48,209,88,0.3); padding:4px 10px; border-radius:12px; font-size:0.78rem; font-weight:700; margin-bottom:12px;">🟢 Respuesta en Vivo con IA (${escapeHtml(aiRes.providerName)})</div><br>`;
        responseText = aiRes.text;
        responseBox.innerHTML = liveBadge + formatText(aiRes.text);
        if (input) input.value = '';
      }
    }

    if (!isLive) {
      const offlineBadge = `<div style="display:inline-flex; align-items:center; gap:6px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:4px 10px; border-radius:12px; font-size:0.78rem; font-weight:700; margin-bottom:12px;">Asistente Mecánico Offline (Conocimiento Local)</div><br>`;
      responseText = getSmartOfflineResponse(question, veh, vehContext, recentServicesText, pendingRemindersText);
      responseBox.innerHTML = offlineBadge + formatText(responseText);
      if (input) input.value = '';
    }

    if (currentUser && currentUser.id) {
      let chatObj = currentActiveAiChatId ? await LocalDB.get(STORES.AI_CHATS, currentActiveAiChatId) : null;
      if (!chatObj || chatObj.userId !== currentUser.id) {
        chatObj = {
          id: 'chat_' + LocalDB.generateUUID(),
          userId: currentUser.id,
          vehicleId: veh ? veh.id : null,
          title: question.length > 35 ? question.substring(0, 35) + '...' : question,
          messages: []
        };
        currentActiveAiChatId = chatObj.id;
      }
      chatObj.messages = chatObj.messages || [];
      chatObj.messages.push({ role: 'user', content: question, timestamp: new Date().toISOString() });
      chatObj.messages.push({ role: 'assistant', content: responseText, timestamp: new Date().toISOString() });

      await SyncService.executeCrud(chatObj.version ? 'UPDATE' : 'CREATE', STORES.AI_CHATS, chatObj);
      renderAiChatHistory();
    }
  } catch (err) {
    console.error('Error en IA:', err);
    const offlineBadge = `<div style="display:inline-flex; align-items:center; gap:6px; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:4px 10px; border-radius:12px; font-size:0.78rem; font-weight:700; margin-bottom:12px;">Asistente Mecánico Offline</div><br>`;
    const responseText = getSmartOfflineResponse(question, getActiveVehicle(), '', '', '');
    responseBox.innerHTML = offlineBadge + (responseText ? responseText.replace(/\n/g, '<br>') : 'Asistencia procesada.');
    if (input) input.value = '';
  }
}

function getSmartOfflineResponse(question, veh, vehContext, recentServicesText, pendingRemindersText) {
  const qLower = (question || '').toLowerCase().trim();
  const userName = currentUser ? (currentUser.name || currentUser.username).split(' ')[0] : 'amigo';
  const vehName = veh ? veh.name : 'tu vehículo';
  const vehKm = veh ? formatVehicleDistance(veh.km, veh) : '0';

  let response = '';

  // Diagnóstico de Códigos OBD-II
  if (qLower.includes('p0300')) {
    response = `**[Código OBD-II: P0300 - Misfire / Falla Múltiple de Encendido]**\n\n` +
      `**Severidad:** ALTA (Riesgo de daño al catalizador por gasolina no quemada).\n\n` +
      `**Posibles Causas:**\n` +
      `• Bujías desgastadas o descalibradas.\n` +
      `• Bobinas de encendido (Coils) defectuosas o con fuga de chispa.\n` +
      `• Inyectores sucios o presión de combustible baja.\n` +
      `• Entrada de aire no medida (fuga en junta de múltiple de admisión).\n\n` +
      `**Solución Recomendada:** Reemplazar juego de bujías, probar resistencia de bobinas y borrar códigos con escáner.`;
  }
  else if (qLower.includes('p0420')) {
    response = `**[Código OBD-II: P0420 - Eficiencia de Catalizador por Debajo del Umbral]**\n\n` +
      `**Severidad:** MODERADA.\n\n` +
      `**Posibles Causas:**\n` +
      `• Convertidor catalítico degradado o tapado.\n` +
      `• Sensor de oxígeno posterior (Bank 1 Sensor 2) descalibrado.\n` +
      `• Fuga en el sistema de escape antes del catalizador.\n\n` +
      `**Solución Recomendada:** Inspeccionar fugas de escape, verificar lecturas del sensor de O2 posterior y comprobar temperatura de entrada/salida del catalizador.`;
  }
  else if (qLower.includes('p0171')) {
    response = `**[Código OBD-II: P0171 - Sistema Mezcla Demasiado Pobre (Banco 1)]**\n\n` +
      `**Severidad:** MODERADA.\n\n` +
      `**Posibles Causas:**\n` +
      `• Sensor MAF (Flujo de Aire) sucio o defectuoso.\n` +
      `• Chupón / Fuga de vacío en mangueras de admisión.\n` +
      `• Filtro de gasolina obstruido o bomba de combustible débil.\n\n` +
      `**Solución Recomendada:** Limpiar sensor MAF con limpia-contactos especial sin residuo e inspeccionar mangueras de vacío.`;
  }
  else if (qLower.includes('check engine') || qLower.includes('luz de motor') || qLower.includes('testigo') || qLower.includes('obd')) {
    response = `**[Diagnóstico de Luz Check Engine]**\n\n` +
      `**Evaluación:** La computadora de a bordo ha detectado una anomalía en las emisiones o la combustión de **${escapeHtml(vehName)}** (${vehKm} KM).\n\n` +
      `**Causas Frecuentes:**\n` +
      `1. **Sensor de Oxígeno / MAF:** Fallas en lectura de aire/combustible.\n` +
      `2. **Bujías / Bobinas:** Desgaste que genera pequeñas fallas de encendido.\n` +
      `3. **Sistema EVAP:** Tapón de gasolina flojo o válvula purge sucia.\n\n` +
      `**Pasos:**\n` +
      `• Si la luz es **fija**, puedes conducir con precaución hacia el taller.\n` +
      `• Si la luz **parpadea**, apaga el motor de inmediato para proteger el catalizador.`;
  }
  else if (qLower.includes('freno') || qLower.includes('chillido') || qLower.includes('pedal') || qLower.includes('vibracion al frenar')) {
    response = `**[Diagnóstico del Sistema de Frenos]**\n\n` +
      `**Severidad:** MODERADA / ALTA.\n\n` +
      `**Análisis Técnico para ${escapeHtml(vehName)}:**\n` +
      `• **Chillido metálico:** Indicador de fricción de pastillas al límite (reemplazo urgente).\n` +
      `• **Pedal esponjoso / Blando:** Aire en la tubería o líquido DOT3/DOT4 degradado.\n` +
      `• **Vibración al frenar a alta velocidad:** Discos de freno alabeados (torcidos por calor).\n\n` +
      `**Solución Recomendada:** Revisar espesor de pastillas, medir grosor de discos con micrómetro y realizar purga/reemplazo de líquido de frenos.`;
  }
  else if (qLower.includes('calienta') || qLower.includes('temperatura') || qLower.includes('refrigerante') || qLower.includes('vapor') || qLower.includes('radiador') || qLower.includes('coolant')) {
    response = `**[Diagnóstico de Sobrecalentamiento]**\n\n` +
      `**Severidad:** CRÍTICA (Riesgo de soplar empaque de culata o torcer el bloque del motor).\n\n` +
      `**Causas Principales:**\n` +
      `• Termostato trabado en cerrado.\n` +
      `• Electroventilador / Abanico no enciende (relevador o termoswitch dañados).\n` +
      `• Fuga en mangueras, radiador o bomba de agua.\n` +
      `• Fuga interna por empaque de cabezote soplado.\n\n` +
      `**Acción Inmediata:** Apaga el vehículo de inmediato y deja enfriar el motor 30-40 min. **NUNCA abras la tapa del radiador mientras esté caliente.**`;
  }
  else if (qLower.includes('humo') || qLower.includes('escape')) {
    response = `**[Diagnóstico por Color de Humo en el Escape]**\n\n` +
      `**Identificación:**\n` +
      `• **Humo Blanco Denso (Olor dulce):** Refrigerante ingresando a cilindros (empaque de culata quemado).\n` +
      `• **Humo Azul / Grisáceo:** Motor quemando aceite (sellos de válvula o anillos de pistón gastados).\n` +
      `• **Humo Negro:** Mezcla rica de gasolina (filtro de aire sucio, inyector goteando o sensor MAF defectuoso).\n\n` +
      `**Recomendación:** Revisa el nivel de aceite y refrigerante inmediatamente en tu **${escapeHtml(vehName)}**.`;
  }
  else if (qLower.includes('bateria') || qLower.includes('arranca') || qLower.includes('alternador') || qLower.includes('start')) {
    response = `**[Diagnóstico del Sistema Eléctrico y Arranque]**\n\n` +
      `**Síntomas Comunes:**\n` +
      `• **Chasquido "Tak-Tak-Tak" al girar la llave:** Batería baja o bornes sulfatados.\n` +
      `• **Motor gira lento:** Batería al final de vida útil (duración típica: 2 a 3 años).\n` +
      `• **Luz de batería encendida en tablero:** Alternador no genera carga (debe marcar 13.8V a 14.4V encendido).\n\n` +
      `**Acción Recomendada:** Limpiar bornes con agua y bicarbonato, y medir voltaje con multímetro.`;
  }
  else if (qLower.includes('vibracion') || qLower.includes('volante') || qLower.includes('alineacion') || qLower.includes('balanceo') || qLower.includes('ruido') || qLower.includes('crujido')) {
    response = `**[Diagnóstico de Dirección, Suspensión y Transmisión]**\n\n` +
      `**Análisis Técnico para ${escapeHtml(vehName)} (${vehKm} KM):**\n` +
      `• **Vibración en volante a >80 km/h:** Llantas desbalanceadas o aro golpeado.\n` +
      `• **Golpe seco en huecos / terreno irregular:** Bujes de meseta, bocinas o cabezales de compensadores vencidos.\n` +
      `• **Crujido al girar volante completo:** Punta de eje (junta homocinética) desgranada.\n\n` +
      `**Recomendación:** Lleva el vehículo a inspección de tren delantero y alineación.`;
  }
  else if (qLower.includes('aceite') || qLower.includes('viscosidad') || qLower.includes('filtro')) {
    response = `**[Recomendaciones de Aceite y Lubricación]**\n\n` +
      `**Información Técnica:**\n` +
      `• **Aceite 100% Sintético (5W-30 / 5W-20 / 0W-20):** Intervalo recomendado cada 8.000 a 10.000 KM.\n` +
      `• **Aceite Semi-Sintético (10W-40):** Intervalo recomendado cada 7.000 KM.\n` +
      `• **Aceite Mineral (20W-50 / 15W-40):** Intervalo recomendado cada 5.000 KM.\n\n` +
      `**Consejo:** Reemplaza el filtro de aceite en CADA cambio sin excepción para proteger el motor.`;
  }
  else if (qLower.includes('hola') || qLower.includes('buenas') || qLower.includes('saludos') || qLower.includes('como estas')) {
    response = `**¡Hola ${escapeHtml(userName)}! Bienvenido a GarageOne.**\n\n` +
      `Estoy listo para ayudarte con tu **${escapeHtml(vehName)}** (${vehKm} KM).\n\n` +
      `Puedes preguntarme sobre ruidos, mantenimientos, fallas eléctricas, cambio de aceite o códigos del tablero. ¿En qué te puedo asesorar hoy?`;
  }
  else if (qLower.includes('gracias')) {
    response = `**¡Con mucho gusto, ${escapeHtml(userName)}!**\n\nRecuerda registrar tus mantenimientos y recargas de combustible en GarageOne para llevar un control perfecto de tu vehículo. ¡Maneja seguro!`;
  }
  else {
    response = `**[Asistencia Técnica GarageOne - Conocimiento Mecánico]**\n\n` +
      `Procesando tu consulta: *"**${escapeHtml(question)}**"*\n\n` +
      `• **Estado Vehicular (${escapeHtml(vehName)}):** Con un kilometraje / millaje actual de **${vehKm}**, se recomienda mantener la rutina preventiva de cambio de aceite y filtro en sus intervalos correspondientes, así como inspeccionar el líquido de frenos y la suspensión.\n` +
      `• **Asesoría:** Si tienes un síntoma específico como ruidos, sobrecalentamiento, luces de advertencia o fugas, descríbelo y te daré un diagnóstico detallado con nivel de riesgo.`;
  }

  return response;
}

function updateAiStatusHeader() {
  const badge = document.getElementById('aiModeStatusBadge');
  const banner = document.getElementById('aiTopStatusBanner');
  let mode = appState.aiEngineMode || 'gemini_key';
  if (mode !== 'gemini_key' && mode !== 'groq_key') mode = 'gemini_key';

  const isConnected = (appState.aiApiConnected === true);
  let activeKey = (mode === 'gemini_key') ? appState.geminiApiKey : appState.groqApiKey;
  let providerName = (mode === 'gemini_key') ? 'Google Gemini' : 'Groq Llama 3.3';

  const hasValidKey = !!(activeKey && activeKey.trim().length > 5);
  const isOnline = isConnected && hasValidKey;

  let statusText = isOnline ? `Conectado con ${providerName} (En Vivo)` : 'Usando Modo Offline (Autónomo)';

  if (badge) {
    if (isOnline) {
      badge.className = 'badge-subtle badge-green';
      badge.style.background = 'rgba(48,209,88,0.15)';
      badge.style.color = '#30d158';
      badge.style.borderColor = 'rgba(48,209,88,0.3)';
      badge.textContent = `Conectado: ${providerName}`;
    } else {
      badge.className = 'badge-subtle badge-blue';
      badge.style.background = 'rgba(142,142,147,0.15)';
      badge.style.color = '#94a3b8';
      badge.style.borderColor = 'rgba(142,142,147,0.3)';
      badge.textContent = 'Modo Offline (Sin Conexión)';
    }
  }

  if (banner) {
    const dotColor = isOnline ? '#30d158' : '#8e8e93';
    const bgStyle = isOnline 
      ? 'background:rgba(48,209,88,0.12); border:1px solid rgba(48,209,88,0.4); color:#30d158;' 
      : 'background:rgba(142,142,147,0.12); border:1px solid rgba(142,142,147,0.3); color:#e2e8f0;';
    const shadowStyle = `box-shadow:0 0 10px ${dotColor};`;

    banner.setAttribute('style', `margin-bottom:14px; padding:12px 14px; border-radius:12px; font-size:0.88rem; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:10px; ${bgStyle}`);
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${dotColor}; ${shadowStyle}"></span>
        <span>${statusText}</span>
      </div>
    `;
  }
}

async function connectAiProvider() {
  const groqInput = document.getElementById('groqApiKeyInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const modeSelect = document.getElementById('aiEngineModeSelect');
  const logBox = document.getElementById('aiDiagnosticLog');

  let mode = modeSelect ? modeSelect.value : (appState.aiEngineMode || 'gemini_key');
  if (mode !== 'groq_key' && mode !== 'gemini_key') mode = 'gemini_key';
  appState.aiEngineMode = mode;

  if (groqInput && groqInput.value.trim()) appState.groqApiKey = groqInput.value.trim();
  if (geminiInput && geminiInput.value.trim()) appState.geminiApiKey = geminiInput.value.trim();
  saveState();

  const providerName = (mode === 'gemini_key') ? 'Google Gemini' : 'Groq';
  const apiKey = (mode === 'gemini_key') ? appState.geminiApiKey : appState.groqApiKey;

  if (!apiKey || apiKey.trim().length < 5) {
    appState.aiApiConnected = false;
    saveState();
    updateAiStatusHeader();
    if (logBox) {
      logBox.style.display = 'block';
      logBox.innerHTML = `<span style="color:#ff453a; font-weight:700;">[ERROR] Por favor ingresa una API Key válida para ${providerName} antes de conectar.</span>`;
    }
    return;
  }

  try {
    let success = false;
    let errorMsg = '';
    if (mode === 'gemini_key') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
      const res = await fetch(url);
      success = res.ok;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errorMsg = (d.error && d.error.message) ? d.error.message : `HTTP ${res.status}`;
      }
    } else {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Ping' }] })
      });
      success = res.ok;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        errorMsg = (d.error && d.error.message) ? d.error.message : `HTTP ${res.status}`;
      }
    }

    if (success) {
      appState.aiApiConnected = true;
      saveState();
      updateAiStatusHeader();
      if (logBox) {
        logBox.style.display = 'none';
        logBox.innerHTML = '';
      }
    } else {
      appState.aiApiConnected = false;
      saveState();
      updateAiStatusHeader();
      if (logBox) {
        logBox.style.display = 'block';
        logBox.innerHTML = `<span style="color:#ff453a; font-weight:700;">[ERROR] Conexión fallida con ${providerName}: ${escapeHtml(errorMsg)}</span>`;
      }
    }
  } catch (e) {
    appState.aiApiConnected = false;
    saveState();
    updateAiStatusHeader();
    if (logBox) {
      logBox.style.display = 'block';
      logBox.innerHTML = `<span style="color:#ff453a; font-weight:700;">[ERROR de Red] ${escapeHtml(e.message)}</span>`;
    }
  }
}

function disconnectAiProvider() {
  appState.aiEngineMode = 'gemini_key';
  appState.groqApiKey = '';
  appState.geminiApiKey = '';
  appState.aiApiConnected = false;
  saveState();

  const modeSelect = document.getElementById('aiEngineModeSelect');
  const groqInput = document.getElementById('groqApiKeyInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const logBox = document.getElementById('aiDiagnosticLog');

  if (modeSelect) modeSelect.value = 'gemini_key';
  if (groqInput) groqInput.value = '';
  if (geminiInput) geminiInput.value = '';

  if (logBox) {
    logBox.style.display = 'none';
    logBox.innerHTML = '';
  }

  updateAiStatusHeader();
}

function onGeminiKeyInput(val) {
  appState.geminiApiKey = (val || '').trim();
  saveState();
}

function onGroqKeyInput(val) {
  appState.groqApiKey = (val || '').trim();
  saveState();
}

function onAiEngineModeChange(mode) {
  if (mode !== 'gemini_key' && mode !== 'groq_key') mode = 'gemini_key';
  appState.aiEngineMode = mode;

  const groqInput = document.getElementById('groqApiKeyInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');

  if (groqInput && groqInput.value.trim()) appState.groqApiKey = groqInput.value.trim();
  if (geminiInput && geminiInput.value.trim()) appState.geminiApiKey = geminiInput.value.trim();

  saveState();

  const groqContainer = document.getElementById('groqKeyContainer');
  const geminiContainer = document.getElementById('geminiKeyContainer');

  if (groqContainer) groqContainer.style.display = (mode === 'groq_key') ? 'block' : 'none';
  if (geminiContainer) geminiContainer.style.display = (mode === 'gemini_key') ? 'block' : 'none';

  if (mode === 'gemini_key' && geminiInput) geminiInput.value = appState.geminiApiKey || '';
  if (mode === 'groq_key' && groqInput) groqInput.value = appState.groqApiKey || '';

  updateAiStatusHeader();
}

async function runAiDiagnostic() {
  const logBox = document.getElementById('aiDiagnosticLog');
  if (logBox) {
    logBox.style.display = 'block';
    logBox.innerHTML = '<span style="color:#38bdf8; font-weight:700;">Iniciando diagnóstico en tiempo real...</span>';
  }

  const veh = getActiveVehicle();
  const prompt = veh 
    ? `Realiza un diagnóstico de salud vehicular y recomendaciones de mantenimiento preventivo para el vehículo ${veh.name} (${veh.year}, ${(Number(veh.km)||0).toLocaleString()} km).`
    : `Realiza un diagnóstico y guía general de mantenimiento preventivo automotriz.`;

  const input = document.getElementById('aiUserQuestion');
  if (input) input.value = prompt;
  await askAIAssistantDirect(prompt);
}

function setAppTheme(themeName) {
  applyAppTheme();
}

function applyAppTheme() {
  appState.theme = 'dark';
  document.body.classList.remove('theme-light');
}

function renderUserSettingsAI() {
  applyAppTheme();
  const logBox = document.getElementById('aiDiagnosticLog');
  if (logBox) {
    logBox.style.display = 'none';
    logBox.innerHTML = '';
  }

  const modeSelect = document.getElementById('aiEngineModeSelect');
  const groqInput = document.getElementById('groqApiKeyInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const memoryBadge = document.getElementById('aiMemoryCountBadge');

  let mode = appState.aiEngineMode || 'gemini_key';
  if (mode !== 'groq_key' && mode !== 'gemini_key') mode = 'gemini_key';
  appState.aiEngineMode = mode;
  saveState();

  if (modeSelect) {
    modeSelect.value = mode;
    onAiEngineModeChange(mode);
  }

  if (groqInput) {
    groqInput.value = appState.groqApiKey || '';
  }

  if (geminiInput) {
    geminiInput.value = appState.geminiApiKey || '';
  }

  if (memoryBadge) {
    const count = (appState.aiLearnedMemory || []).length;
    memoryBadge.textContent = `${count} Consultas Aprendidas`;
  }
}

async function fetchGeminiModelsList(apiKey) {
  const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) return { success: false, error: 'API Key de Google Gemini no ingresada.' };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    const status = res.status;
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.models && Array.isArray(data.models)) {
      const validModels = data.models.filter(m => 
        m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
      );
      return { success: true, models: validModels, rawModels: data.models };
    } else if (data.error) {
      if (status === 400) return { success: false, error: `Petición Inválida (400): ${data.error.message}`, status };
      if (status === 401 || status === 403) return { success: false, error: `API Key Inválida o Sin Permisos (${status}): Revisa tu clave en aistudio.google.com/app/apikey`, status };
      if (status === 404) return { success: false, error: `Recurso No Encontrado (404): ${data.error.message}`, status };
      if (status === 429) return { success: false, error: `Límite de Cuota Excedido (429): Has alcanzado el límite de peticiones de Gemini.`, status };
      if (status >= 500) return { success: false, error: `Error Interno de Google (${status}): Servidores de Gemini temporalmente no disponibles.`, status };
      return { success: false, error: `Google Gemini API Error (${status}): ${data.error.message}`, status };
    }
  } catch (e) {
    return { success: false, error: `Error de red al consultar modelos Gemini: ${e.message}` };
  }
  return { success: false, error: 'No se pudo consultar la lista de modelos de Gemini.' };
}

async function executeGeminiQuery(promptText, apiKey) {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) return { success: false, error: 'API Key de Gemini no proporcionada.' };

  const listResult = await fetchGeminiModelsList(cleanKey);
  if (!listResult.success) {
    return { success: false, error: listResult.error };
  }

  const validModels = listResult.models;
  if (!validModels || validModels.length === 0) {
    return { success: false, error: 'No se encontraron modelos compatibles con generateContent para esta API Key.' };
  }

  // Dynamic model selection prioritizing active models returned by Google's API:
  let selectedModel = validModels.find(m => m.name.includes('gemini-3.6-flash'))
    || validModels.find(m => m.name.includes('gemini-3.5-flash'))
    || validModels.find(m => m.name.includes('gemini-3-flash'))
    || validModels.find(m => m.name.includes('flash'))
    || validModels.find(m => m.name.includes('gemini'))
    || validModels[0];

  const modelPath = selectedModel.name; 
  const displayName = selectedModel.displayName || selectedModel.name.replace('models/', '');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${cleanKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    const data = await res.json();
    const status = res.status;

    if (res.ok && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      appState.aiApiConnected = true;
      saveState();
      return { success: true, text: data.candidates[0].content.parts[0].text, providerName: `Google ${displayName} (En Vivo)` };
    } else if (data.error) {
      appState.aiApiConnected = false;
      saveState();
      if (status === 400) return { success: false, error: `Petición Inválida (400): ${data.error.message}` };
      if (status === 401 || status === 403) return { success: false, error: `API Key Inválida o Sin Permisos (${status}): ${data.error.message}` };
      if (status === 404) return { success: false, error: `Modelo No Encontrado (${modelPath}): ${data.error.message}` };
      if (status === 429) return { success: false, error: `Límite de Cuota Excedido (429): ${data.error.message}` };
      if (status >= 500) return { success: false, error: `Error Interno de Google (${status}): ${data.error.message}` };
      return { success: false, error: `Google Gemini Error (${status}): ${data.error.message}` };
    }
  } catch (e) {
    appState.aiApiConnected = false;
    saveState();
    return { success: false, error: `Error de red al conectar con Gemini: ${e.message}` };
  }

  appState.aiApiConnected = false;
  saveState();
  return { success: false, error: 'Sin respuesta de Gemini.' };
}

async function executeAiQuery(promptText, rawQuestion) {
  let mode = appState.aiEngineMode || 'gemini_key';
  const validModes = ['gemini_key', 'groq_key', 'openai_key', 'claude_key', 'openrouter_key'];
  if (!validModes.includes(mode)) mode = 'gemini_key';

  // 1. Google Gemini API Engine
  if (mode === 'gemini_key') {
    if (!appState.geminiApiKey || appState.geminiApiKey.trim().length <= 5) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: 'Token / API Key de Google Gemini no ingresado.' };
    }
    return await executeGeminiQuery(promptText, appState.geminiApiKey);
  }

  // 2. Groq API Engine
  if (mode === 'groq_key') {
    if (!appState.groqApiKey || appState.groqApiKey.trim().length <= 5) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: 'Token / API Key de Groq no ingresado.' };
    }
    try {
      const cleanGroqKey = appState.groqApiKey.trim().replace(/^["']|["']$/g, '');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanGroqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Eres el Asistente Técnico, Mecánico Experto e Inteligencia Artificial de GarageOne.' },
            { role: 'user', content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      });
      const data = await res.json();
      if (res.ok && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        appState.aiApiConnected = true;
        saveState();
        return { success: true, text: data.choices[0].message.content, providerName: 'Groq Llama 3.3 (En Vivo)' };
      } else if (data.error) {
        appState.aiApiConnected = false;
        saveState();
        return { success: false, error: `Groq Error: ${data.error.message || res.statusText}` };
      }
    } catch (e) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: `Error de red Groq: ${e.message}` };
    }
  }

  // 3. OpenAI ChatGPT Engine
  if (mode === 'openai_key') {
    if (!appState.openaiApiKey || appState.openaiApiKey.trim().length <= 5) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: 'Token / API Key de OpenAI no ingresado.' };
    }
    try {
      const cleanKey = appState.openaiApiKey.trim().replace(/^["']|["']$/g, '');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: promptText }]
        })
      });
      const data = await res.json();
      if (res.ok && data.choices && data.choices[0] && data.choices[0].message) {
        appState.aiApiConnected = true;
        saveState();
        return { success: true, text: data.choices[0].message.content, providerName: 'OpenAI GPT-4o Mini (En Vivo)' };
      } else {
        appState.aiApiConnected = false;
        saveState();
        return { success: false, error: `OpenAI Error: ${(data.error && data.error.message) || res.statusText}` };
      }
    } catch (e) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: `Error de red OpenAI: ${e.message}` };
    }
  }

  // 4. Anthropic Claude Engine
  if (mode === 'claude_key') {
    if (!appState.claudeApiKey || appState.claudeApiKey.trim().length <= 5) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: 'Token / API Key de Anthropic Claude no ingresado.' };
    }
    try {
      const cleanKey = appState.claudeApiKey.trim();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: promptText }]
        })
      });
      const data = await res.json();
      if (res.ok && data.content && data.content[0] && data.content[0].text) {
        appState.aiApiConnected = true;
        saveState();
        return { success: true, text: data.content[0].text, providerName: 'Anthropic Claude (En Vivo)' };
      } else {
        appState.aiApiConnected = false;
        saveState();
        return { success: false, error: `Claude Error: ${(data.error && data.error.message) || res.statusText}` };
      }
    } catch (e) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: `Error de red Claude: ${e.message}` };
    }
  }

  // 5. OpenRouter Engine
  if (mode === 'openrouter_key') {
    if (!appState.openrouterApiKey || appState.openrouterApiKey.trim().length <= 5) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: 'Token / API Key de OpenRouter no ingresado.' };
    }
    try {
      const cleanKey = appState.openrouterApiKey.trim();
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: promptText }]
        })
      });
      const data = await res.json();
      if (res.ok && data.choices && data.choices[0] && data.choices[0].message) {
        appState.aiApiConnected = true;
        saveState();
        return { success: true, text: data.choices[0].message.content, providerName: 'OpenRouter (En Vivo)' };
      } else {
        appState.aiApiConnected = false;
        saveState();
        return { success: false, error: `OpenRouter Error: ${(data.error && data.error.message) || res.statusText}` };
      }
    } catch (e) {
      appState.aiApiConnected = false;
      saveState();
      return { success: false, error: `Error de red OpenRouter: ${e.message}` };
    }
  }

  appState.aiApiConnected = false;
  saveState();
  return { success: false, error: 'Sin conexión a IA en línea configurada.' };
}

async function runAiDiagnostic() {
  const logBox = document.getElementById('aiDiagnosticLog');
  const badge = document.getElementById('aiModeStatusBadge');
  if (!logBox) return;

  logBox.style.display = 'block';
  logBox.innerHTML = '<span style="color:#38bdf8;">Iniciando Generación de Diagnóstico Real...</span><br>';

  const groqInput = document.getElementById('groqApiKeyInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const modeSelect = document.getElementById('aiEngineModeSelect');
  let selectedMode = modeSelect ? modeSelect.value : (appState.aiEngineMode || 'groq_key');
  if (selectedMode !== 'groq_key' && selectedMode !== 'gemini_key') selectedMode = 'groq_key';

  if (groqInput && groqInput.value.trim()) appState.groqApiKey = groqInput.value.trim();
  if (geminiInput && geminiInput.value.trim()) appState.geminiApiKey = geminiInput.value.trim();
  saveState();

  const activeGroqKey = (appState.groqApiKey || '').trim();
  const activeGeminiKey = (appState.geminiApiKey || '').trim();

  if (selectedMode === 'groq_key' && !activeGroqKey) {
    logBox.innerHTML += `<span style="color:#38bdf8;">[AVISO] Groq Llama 3.3: Ingresa tu API Key en la configuración para generar el reporte.</span>`;
    return;
  }
  if (selectedMode === 'gemini_key' && !activeGeminiKey) {
    logBox.innerHTML += `<span style="color:#38bdf8;">[AVISO] Google Gemini API: Ingresa tu API Key en la configuración para generar el reporte.</span>`;
    return;
  }

  const veh = getActiveVehicle();
  if (!veh) {
    logBox.innerHTML += `<span style="color:#38bdf8;">[AVISO] Debes tener un vehículo activo para generar el diagnóstico.</span>`;
    return;
  }

  logBox.innerHTML += '<span style="color:#38bdf8;">Conectando con el motor de Inteligencia Artificial para analizar tu vehículo...</span><br>';

  const promptText = `Actúa como un Ingeniero Mecánico Experto. Realiza una evaluación exhaustiva del estado de este vehículo basándote en la siguiente información:
Vehículo: ${veh.name} (Año ${veh.year}, ${veh.type})
Odómetro / Distancia Actual: ${formatVehicleDistance(veh.km, veh)}
Servicios Previos Registrados: ${appState.services.filter(s => s.vehicleId === veh.id).length}

Estructura tu respuesta exactamente así:
### Diagnóstico de Salud
(Brinda un resumen rápido de cómo se encuentra el auto según su edad y kilometraje)

### Predicción de Desgaste
(Lista de componentes que están próximos a fallar o requerir cambio)

### Recomendaciones Críticas
(Qué debe hacer el dueño inmediatamente)`;

  const aiRes = await executeAiQuery(promptText, "Generar diagnóstico integral");

  if (aiRes.success) {
    appState.aiApiConnected = true;
    saveState();
    logBox.style.display = 'none';

    // Formatear texto y mostrar en el card
    const formatText = (txt) => {
      return txt
        .replace(/### (.*?)\n/g, '<h4 style="color:#38bdf8; margin:12px 0 4px 0; font-size:1.05rem;">$1</h4>')
        .replace(/## (.*?)\n/g, '<h3 style="color:#ffffff; margin:14px 0 6px 0; font-size:1.05rem;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    };

    const container = document.getElementById('aiDiagnosticCard');
    if (container) {
      container.innerHTML = `
        <div class="ai-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div>
            <h3 style="margin:0; font-size:1.05rem; display:flex; align-items:center; gap:6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Reporte de IA Generado - ${escapeHtml(veh.name)}
            </h3>
            <span style="font-size:0.78rem; color:var(--text-secondary);">${veh.year} • ${veh.km.toLocaleString()} KM • Reporte en Vivo</span>
          </div>
          <span class="badge-subtle badge-green" style="font-size:0.78rem; font-weight:700;">IA Conectada (${escapeHtml(aiRes.providerName)})</span>
        </div>
        <div style="background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.2); padding:14px; border-radius:10px; font-size:0.88rem; color:#cbd5e1; line-height:1.5;">
          ${formatText(aiRes.text)}
        </div>
      `;
    }
  } else {
    appState.aiApiConnected = false;
    saveState();
    logBox.innerHTML += `<br><span style="color:#ff453a;">[ERROR] Error al contactar la IA: ${escapeHtml(aiRes.error || 'Problema de red')}</span>`;
  }
}


function saveGeminiKey(key) {
  appState.geminiApiKey = key.trim();
  saveState();
}



// Vehicle CRUD
function openVehicleModal(vehId = null) {
  const form = document.getElementById('formVehicle');
  if (form) form.reset();
  if (document.getElementById('vehId')) document.getElementById('vehId').value = '';
  if (document.getElementById('vehPhotoFile')) document.getElementById('vehPhotoFile').value = '';
  if (document.getElementById('modalVehicleTitle')) document.getElementById('modalVehicleTitle').textContent = 'Nuevo Vehículo';

  if (vehId) {
    const v = appState.vehicles.find(item => item.id === vehId);
    if (v) {
      if (document.getElementById('modalVehicleTitle')) document.getElementById('modalVehicleTitle').textContent = 'Editar Vehículo';
      if (document.getElementById('vehId')) document.getElementById('vehId').value = v.id;
      if (document.getElementById('vehType')) document.getElementById('vehType').value = v.type || 'Sedán';

      const elMake = document.getElementById('vehMake');
      const elModel = document.getElementById('vehModel');

      if (elMake) elMake.value = v.brand || v.make || '';
      if (elModel) elModel.value = v.model || '';

      if (document.getElementById('vehYear')) document.getElementById('vehYear').value = v.year || '';
      if (document.getElementById('vehPlate')) document.getElementById('vehPlate').value = v.plate || '';
      if (document.getElementById('vehKm')) document.getElementById('vehKm').value = v.km || 0;
      if (document.getElementById('vehVin')) document.getElementById('vehVin').value = v.vin || '';
      if (document.getElementById('vehUnit')) document.getElementById('vehUnit').value = v.unitDistance || 'km';
      updateVehicleModalUnitLabel(v.unitDistance || 'km');
    }
  } else {
    if (document.getElementById('vehUnit')) document.getElementById('vehUnit').value = 'km';
    updateVehicleModalUnitLabel('km');
  }

  openModal('modalVehicle');
}

function editVehicle(vehId) {
  openVehicleModal(vehId);
}

function saveVehicle(e) {
  if (e) e.preventDefault();
  const vehIdEl = document.getElementById('vehId');
  const vehId = vehIdEl ? vehIdEl.value : '';

  const typeEl = document.getElementById('vehType');
  const type = typeEl ? typeEl.value : 'Sedán';

  const makeEl = document.getElementById('vehMake');
  const modelEl = document.getElementById('vehModel');

  let brand = makeEl ? makeEl.value.trim() : '';
  let model = modelEl ? modelEl.value.trim() : '';
  let name = `${brand} ${model}`.trim() || type;

  if (!brand || !model) {
    alert('Por favor ingresa la Marca y Modelo de tu vehículo.');
    return;
  }

  const yearInputVal = document.getElementById('vehYear') ? document.getElementById('vehYear').value : '';
  const year = parseInt(yearInputVal, 10);
  const plate = document.getElementById('vehPlate') ? document.getElementById('vehPlate').value.trim() : '';
  const kmInputVal = document.getElementById('vehKm') ? document.getElementById('vehKm').value : '0';
  const km = parseInt(kmInputVal, 10);
  const vin = document.getElementById('vehVin') ? document.getElementById('vehVin').value.trim() : '';
  const unitEl = document.getElementById('vehUnit');
  const unitDistance = unitEl ? unitEl.value : 'km';
  const photoInput = document.getElementById('vehPhotoFile');

  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < 1900 || year > currentYear + 2) {
    alert(`Por favor ingresa un año válido para el vehículo (entre 1900 y ${currentYear + 2}).`);
    return;
  }
  const safeKm = isNaN(km) || km < 0 ? 0 : km;

  let targetVeh = vehId ? appState.vehicles.find(v => v.id === vehId) : null;

  const processAndSave = async (photoBase64) => {
    const vehData = {
      id: vehId || undefined,
      type, brand, make: brand, model, name, year, plate, km: safeKm, vin, unitDistance,
      photo: photoBase64 || (targetVeh ? targetVeh.photo : '')
    };

    const saved = await SyncService.executeCrud(targetVeh ? 'UPDATE' : 'CREATE', STORES.VEHICLES, vehData);
    appState.activeVehicleId = saved.id;

    closeModal('modalVehicle');
    const form = document.getElementById('formVehicle');
    if (form) form.reset();
    renderApp();
  };

  if (photoInput && photoInput.files && photoInput.files[0]) {
    readAndCompressImage(photoInput.files[0], processAndSave);
  } else {
    processAndSave('');
  }
}

// Maintenance Log List (iOS Swipe-to-Delete)
let currentFilter = 'all';

function filterLogs(cat, el) {
  currentFilter = cat;
  document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderServiceList(appState.activeVehicleId);
}

function renderServiceList(vehId) {
  const container = document.getElementById('serviceLogList');
  if (!container) return;
  const veh = appState.vehicles.find(v => v.id === vehId) || getActiveVehicle();
  const targetId = veh ? veh.id : vehId;

  (appState.services || []).forEach(s => {
    if (!s.vehicleId && veh) {
      s.vehicleId = veh.id;
    }
  });

  let list = (appState.services || []).filter(s => {
    if (!s.vehicleId) return true;
    if (targetId && s.vehicleId === targetId) return true;
    if (appState.vehicles.length <= 1) return true;
    return false;
  });

  if (currentFilter !== 'all') {
    list = list.filter(s => s.category === currentFilter);
  }

  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    container.innerHTML = `<p class="subtitle" style="text-align:center; padding:20px;">Sin registros en esta categoría.</p>`;
    return;
  }

  const svgCategoryMap = {
    'Aceite': SVG_ICONS.oil,
    'Frenos': SVG_ICONS.brakes,
    'Llantas': SVG_ICONS.tires,
    'Filtros': SVG_ICONS.filters,
    'Bujías': SVG_ICONS.spark,
    'Batería': SVG_ICONS.battery,
    'Transmisión': SVG_ICONS.transmission,
    'Correa': SVG_ICONS.belt,
    'Trámite': SVG_ICONS.document,
    'Otro': SVG_ICONS.wrench
  };

  container.innerHTML = list.map(s => `
    <div class="swipe-container">
      <div class="swipe-action-bg">
        <button type="button" class="swipe-action-btn" onclick="deleteServiceDirect('${s.id}', event)">
          ${SVG_ICONS.trash}
          <span>Eliminar</span>
        </button>
      </div>
      <div class="swipe-content log-item-card" onclick="openServiceModal('${s.id}')">
        <div class="log-item-main">
          <div class="log-icon-badge">${svgCategoryMap[s.category] || SVG_ICONS.wrench}</div>
          <div>
            <div class="log-title">${escapeHtml(s.title)}</div>
            <div class="log-meta">${s.date} • ${formatVehicleDistance(s.km, veh)} ${s.shop ? `• ${escapeHtml(s.shop)}` : ''}</div>
            ${s.notes ? `<div class="log-meta" style="font-style:italic;">Nota: ${escapeHtml(s.notes)}</div>` : ''}
            ${s.receipt ? `<span class="receipt-chip" onclick="event.stopPropagation(); viewReceipt('${s.id}')">${SVG_ICONS.document} Ver Adjunto</span>` : ''}
          </div>
        </div>
        <div class="log-item-side">
          <div class="log-cost">${formatCurrency(s.cost)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function openServiceModal(servId = null) {
  const form = document.getElementById('formService');
  if (form) form.reset();
  document.getElementById('servId').value = '';
  if (document.getElementById('servReceiptFile')) document.getElementById('servReceiptFile').value = '';
  document.getElementById('modalServiceTitle').textContent = 'Registrar Mantenimiento';
  populateServCategorySelect();
  setTodayDates();
  updateServiceModalUnitLabel();

  if (servId) {
    const s = appState.services.find(item => item.id === servId);
    if (s) {
      document.getElementById('modalServiceTitle').textContent = 'Editar Mantenimiento';
      document.getElementById('servId').value = s.id;
      document.getElementById('servCategory').value = s.category;
      document.getElementById('servCost').value = s.cost;
      document.getElementById('servDate').value = s.date;
      document.getElementById('servKm').value = s.km;
      document.getElementById('servShop').value = s.shop || '';
      if (document.getElementById('servNotes')) document.getElementById('servNotes').value = s.notes || '';
    }
  }

  openModal('modalService');
}

// Fuel Log List (iOS Swipe-to-Delete)
function renderFuelList(vehId) {
  const container = document.getElementById('fuelLogList');
  if (!container) return;
  const veh = appState.vehicles.find(v => v.id === vehId) || getActiveVehicle();
  const targetId = veh ? veh.id : vehId;

  (appState.fuels || []).forEach(f => {
    if (!f.vehicleId && veh) {
      f.vehicleId = veh.id;
    }
  });

  let list = (appState.fuels || []).filter(f => {
    if (!f.vehicleId) return true;
    if (targetId && f.vehicleId === targetId) return true;
    if (appState.vehicles.length <= 1) return true;
    return false;
  });
  list.sort((a, b) => Number(b.km) - Number(a.km));

  const effEl = document.getElementById('fuelEfficiencyVal');
  const costEl = document.getElementById('costPerKmVal');
  const unitStr = veh ? getVehicleUnit(veh) : 'km';

  if (list.length >= 2) {
    let sortedAsc = [...list].sort((a, b) => Number(a.km) - Number(b.km));
    let totalKmDiff = Number(sortedAsc[sortedAsc.length - 1].km) - Number(sortedAsc[0].km);
    let totalVolume = sortedAsc.reduce((sum, f) => sum + Number(f.volume || f.liters || 0), 0);
    let totalCost = sortedAsc.reduce((sum, f) => sum + Number(f.cost || 0), 0);

    let efficiency = (totalKmDiff > 0 && totalVolume > 0) ? (totalKmDiff / totalVolume).toFixed(1) : 0;
    let costPerKm = totalKmDiff > 0 ? (totalCost / totalKmDiff) : 0;

    if (effEl) effEl.textContent = efficiency > 0 ? `${efficiency} ${unitStr}/L` : `0 ${unitStr}/L`;
    if (costEl) costEl.textContent = costPerKm > 0 ? `${formatCurrency(costPerKm)}/${unitStr}` : `${formatCurrency(0)}/${unitStr}`;
  } else if (list.length === 1) {
    let f = list[0];
    let vol = Number(f.volume || f.liters || 0);
    let cost = Number(f.cost || 0);
    let km = Number(f.km || (veh ? veh.km : 0));

    let costPerKm = (km > 0 && cost > 0) ? (cost / km) : 0;
    let efficiency = (km > 0 && vol > 0) ? (km / vol).toFixed(1) : 0;

    if (effEl) effEl.textContent = efficiency > 0 ? `${efficiency} ${unitStr}/L` : `0 ${unitStr}/L`;
    if (costEl) costEl.textContent = costPerKm > 0 ? `${formatCurrency(costPerKm)}/${unitStr}` : `${formatCurrency(0)}/${unitStr}`;
  } else {
    if (effEl) effEl.textContent = `0 ${unitStr}/L`;
    if (costEl) costEl.textContent = `${formatCurrency(0)}/${unitStr}`;
  }

  if (list.length === 0) {
    container.innerHTML = `<p class="subtitle" style="text-align:center; padding:20px;">Sin registros de gasolina.</p>`;
    return;
  }

  container.innerHTML = list.map(f => `
    <div class="swipe-container">
      <div class="swipe-action-bg">
        <button type="button" class="swipe-action-btn" onclick="deleteFuelDirect('${f.id}', event)">
          ${SVG_ICONS.trash}
          <span>Eliminar</span>
        </button>
      </div>
      <div class="swipe-content log-item-card" onclick="openFuelModal('${f.id}')">
        <div class="log-item-main">
          <div class="log-icon-badge">${SVG_ICONS.fuel}</div>
          <div>
            <div class="log-title">${f.volume || f.liters || 0} Litros</div>
            <div class="log-meta">${f.date} • Odómetro: ${formatVehicleDistance(f.km, veh)}</div>
            ${f.notes ? `<div class="log-meta" style="font-style:italic;">Nota: ${escapeHtml(f.notes)}</div>` : ''}
            ${f.receipt ? `<span class="receipt-chip" onclick="event.stopPropagation(); viewFuelReceipt('${f.id}')">${SVG_ICONS.document} Ver Adjunto</span>` : ''}
          </div>
        </div>
        <div class="log-item-side">
          <div class="log-cost">${formatCurrency(f.cost)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function openFuelModal(fuelId = null) {
  const form = document.getElementById('formFuel');
  if (form) form.reset();
  document.getElementById('fuelId').value = '';
  if (document.getElementById('fuelReceiptFile')) document.getElementById('fuelReceiptFile').value = '';
  document.getElementById('modalFuelTitle').textContent = 'Registrar Gasolina';
  setTodayDates();
  updateFuelModalUnitLabel();

  if (fuelId) {
    const f = appState.fuels.find(item => item.id === fuelId);
    if (f) {
      document.getElementById('modalFuelTitle').textContent = 'Editar Gasolina';
      document.getElementById('fuelId').value = f.id;
      document.getElementById('fuelCost').value = f.cost;
      const volEl = document.getElementById('fuelLiters') || document.getElementById('fuelVolume');
      if (volEl) volEl.value = f.volume || f.liters || '';
      document.getElementById('fuelKm').value = f.km;
      document.getElementById('fuelDate').value = f.date;
      if (document.getElementById('fuelNotes')) document.getElementById('fuelNotes').value = f.notes || '';
    }
  }

  openModal('modalFuel');
}

// User Settings Render
function renderUserSettings() {
  if (currentUser) {
    const profileNameEl = document.getElementById('userProfileName');
    if (profileNameEl) profileNameEl.textContent = (currentUser.username || currentUser.name || '-') + (currentUser.role === 'admin' ? ' (Admin)' : '');

    const profileEmailEl = document.getElementById('userProfileEmail');
    if (profileEmailEl) profileEmailEl.textContent = currentUser.email || 'No registrado';

    // Only show change password container, hide PIN
    const pinContainer = document.getElementById('pinSetupContainer');
    const pwdContainer = document.getElementById('changePasswordContainer');
    if (pinContainer) pinContainer.style.display = 'none';
    if (pwdContainer) pwdContainer.style.display = 'block';

    // Hide auth method selector (PIN vs Password)
    const authMethodSelector = document.querySelector('.settings-card h3');
    const pinMethodRow = document.getElementById('authMethodPwdLabel');
    if (pinMethodRow) pinMethodRow.closest('div[style]') && (pinMethodRow.closest('div[style]').style.display = 'none');
  }

  const settingCurr = document.getElementById('settingCurrency');
  if (settingCurr) settingCurr.value = appState.currency || 'CRC';

  const settingLang = document.getElementById('settingLanguage');
  if (settingLang) settingLang.value = appState.language || 'es';

  const geminiInput = document.getElementById('geminiApiKeyInput');
  const geminiBadge = document.getElementById('geminiStatusBadge');
  if (geminiInput) geminiInput.value = appState.geminiApiKey || '';
  if (geminiBadge) {
    if (appState.geminiApiKey) {
      geminiBadge.className = 'badge-subtle badge-green';
      geminiBadge.textContent = 'Conectada ⭐';
    } else {
      geminiBadge.className = 'badge-subtle badge-blue';
      geminiBadge.textContent = 'No configurada';
    }
  }

  const symbol = appState.currency === 'USD' ? '$' : '₡';
  document.querySelectorAll('.currency-lbl').forEach(el => el.textContent = symbol);

  applyNavigationPermissions();
  renderStorageStats();

  const backupFreqEl = document.getElementById('backupFrequency');
  const backupTimeEl = document.getElementById('backupTime');
  if (backupFreqEl) backupFreqEl.value = appState.backupFrequency || 'off';
  if (backupTimeEl && appState.backupTime) backupTimeEl.value = appState.backupTime;
  updateBackupScheduleSettings();
  renderBackupHistory();

  applyLanguageTranslations();
}

/**
 * Calcula e informa la fecha y hora exactas del próximo respaldo automático.
 */
function calculateNextBackupSchedule(frequency, timeStr = '03:00') {
  if (!frequency || frequency === 'off') return '';

  const parts = (timeStr || '03:00').split(':');
  const targetHour = parseInt(parts[0], 10) || 0;
  const targetMinute = parseInt(parts[1], 10) || 0;

  const now = new Date();
  let nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMinute, 0, 0);

  if (frequency === 'daily') {
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 7);
    }
  } else if (frequency === 'monthly') {
    if (nextDate <= now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }

  const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateFormatted = nextDate.toLocaleDateString('es-ES', optionsDate);
  const timeFormatted = nextDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `Próximo respaldo automático programado: <br><strong>${dateFormatted}</strong> a las <strong>${timeFormatted}</strong>`;
}

function updateBackupScheduleSettings() {
  const freqEl = document.getElementById('backupFrequency');
  const timeEl = document.getElementById('backupTime');
  const timeGroup = document.getElementById('backupTimeGroup');
  const previewEl = document.getElementById('backupNextSchedule');

  const freq = freqEl ? freqEl.value : 'off';
  const timeStr = timeEl ? timeEl.value : '03:00';

  appState.backupFrequency = freq;
  appState.backupTime = timeStr;
  saveState();

  if (freq === 'off') {
    if (timeGroup) timeGroup.style.display = 'none';
    if (previewEl) {
      previewEl.style.display = 'none';
      previewEl.innerHTML = '';
    }
  } else {
    if (timeGroup) timeGroup.style.display = 'block';
    if (previewEl) {
      previewEl.style.display = 'block';
      previewEl.innerHTML = calculateNextBackupSchedule(freq, timeStr);
    }
  }
}

function saveBackupFrequency(val) {
  updateBackupScheduleSettings();
}

function changeCurrencySetting(val) {
  appState.currency = val;
  saveState();
  renderUserSettings();
  renderApp();
}

async function runSupabaseDiagnostic() {
  const resultEl = document.getElementById('supabaseDiagResult');
  const badgeEl = document.getElementById('supabaseSyncBadge');
  if (resultEl) resultEl.innerHTML = '<span style="color:#38bdf8;">&#9203; Ejecutando diagn\u00f3stico...</span>';
  if (badgeEl) { badgeEl.style.background = 'rgba(56,189,248,0.15)'; badgeEl.style.color = '#38bdf8'; badgeEl.textContent = 'Probando...'; }

  if (typeof window.SupabaseService === 'undefined' || !window.SupabaseService) {
    if (resultEl) resultEl.innerHTML = '<span style="color:#ff453a;">&#10060; SupabaseService no est\u00e1 disponible.</span>';
    return;
  }

  const diag = await window.SupabaseService.testConnection();
  const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
  let html = '';
  html += `<div style="margin-bottom:4px;">${diag.sdkLoaded ? '&#9989;' : '&#10060;'} SDK Supabase: <strong>${diag.sdkLoaded ? 'Cargado' : 'No cargado (CDN error)'}</strong></div>`;
  html += `<div style="margin-bottom:4px;">${diag.isConfigured ? '&#9989;' : '&#10060;'} Cliente: <strong>${diag.isConfigured ? 'Inicializado' : 'No inicializado'}</strong></div>`;
  html += `<div style="margin-bottom:4px;color:${diag.authUser ? '#30d158' : '#ffd60a'}">${diag.authUser ? '&#9989;' : '&#9888;'} Sesi\u00f3n Auth: <strong>${diag.authUser ? diag.authUser.substring(0, 18) + '...' : 'Sin sesi\u00f3n — datos no se sincronizan'}</strong></div>`;

  if (user) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id || '');
    html += `<div style="margin-bottom:4px;color:${isUUID ? '#30d158' : '#ffd60a'}">${isUUID ? '&#9989;' : '&#9888;'} ID Usuario: <strong>${isUUID ? 'UUID v\u00e1lido (sync OK)' : 'ID local \u2014 inicia sesi\u00f3n con Supabase Auth para sync'}</strong></div>`;
  }

  if (diag.isConfigured && Object.keys(diag.tables).length > 0) {
    html += `<div style="margin-top:8px;font-weight:600;font-size:0.8rem;opacity:0.6;margin-bottom:4px;">Tablas en Supabase:</div>`;
    for (const [table, status] of Object.entries(diag.tables)) {
      const isRLS = !status.ok && ((status.code === '42501') || ((status.error || '').toLowerCase().includes('policy')) || ((status.error || '').toLowerCase().includes('permission')));
      html += `<div style="font-size:0.8rem;margin-bottom:2px;">${status.ok ? '&#9989;' : '&#10060;'} <strong>${table}</strong>: ${status.ok ? 'Accesible' : (isRLS ? '&#9888; RLS activo \u2014 requiere sesi\u00f3n auth' : (status.error || 'Error'))}</div>`;
    }
  }

  if (diag.errors && diag.errors.length > 0) {
    html += `<div style="margin-top:8px;color:#ff453a;font-size:0.8rem;"><strong>Errores:</strong><br>${diag.errors.join('<br>')}</div>`;
  }

  const allOk = diag.isConfigured && diag.authUser && diag.sdkLoaded;
  if (badgeEl) {
    if (allOk) { badgeEl.style.background = 'rgba(48,209,88,0.15)'; badgeEl.style.color = '#30d158'; badgeEl.textContent = 'Conectado'; }
    else if (diag.isConfigured) { badgeEl.style.background = 'rgba(255,214,10,0.15)'; badgeEl.style.color = '#ffd60a'; badgeEl.textContent = 'Parcial'; }
    else { badgeEl.style.background = 'rgba(255,69,58,0.15)'; badgeEl.style.color = '#ff453a'; badgeEl.textContent = 'Sin conexion'; }
  }
  if (resultEl) resultEl.innerHTML = html;
}

async function forceSyncNow() {
  const resultEl = document.getElementById('supabaseDiagResult');
  const badgeEl = document.getElementById('supabaseSyncBadge');
  if (badgeEl) { badgeEl.style.background = 'rgba(56,189,248,0.15)'; badgeEl.style.color = '#38bdf8'; badgeEl.textContent = 'Sincronizando...'; }
  if (typeof SyncService !== 'undefined' && SyncService.syncUnified) {
    SyncService.isSyncing = false;
    await SyncService.syncUnified();
    await loadAppStateFromDB();
    renderApp();
    if (typeof renderRemindersTab === 'function') renderRemindersTab();
    if (typeof renderGuantera === 'function') renderGuantera();
    renderUserSettings();
    if (badgeEl) { badgeEl.style.background = 'rgba(48,209,88,0.15)'; badgeEl.style.color = '#30d158'; badgeEl.textContent = 'Sincronizado'; }
    if (resultEl) resultEl.innerHTML = '<div style="color:#30d158;margin-bottom:8px;">&#9989; Sincronizaci\u00f3n manual completada. Datos actualizados.</div>' + resultEl.innerHTML;
  } else {
    if (badgeEl) { badgeEl.style.background = 'rgba(255,69,58,0.15)'; badgeEl.style.color = '#ff453a'; badgeEl.textContent = 'Error'; }
  }
}

/**
 * Pobla el desplegable de filtro por mes en el módulo de reportes.
 * Extrae los meses únicos (YYYY-MM) de los servicios y recargas de combustible del vehículo activo.
 */
function populateReportMonthFilter() {
  const select = document.getElementById('reportMonthFilter');
  if (!select) return;

  const currentVal = select.value || 'all';
  const vehId = appState.activeVehicleId;
  const services = (appState.services || []).filter(s => s && s.vehicleId === vehId);
  const fuels = (appState.fuels || []).filter(f => f && f.vehicleId === vehId);

  const monthsSet = new Set();

  services.forEach(s => {
    if (s.date && typeof s.date === 'string' && s.date.length >= 7) {
      monthsSet.add(s.date.substring(0, 7));
    }
  });

  fuels.forEach(f => {
    if (f.date && typeof f.date === 'string' && f.date.length >= 7) {
      monthsSet.add(f.date.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  let html = `<option value="all">Todos los meses (Histórico)</option>`;
  sortedMonths.forEach(mKey => {
    const [year, monthNum] = mKey.split('-');
    const monthIndex = parseInt(monthNum, 10) - 1;
    const monthName = monthNamesEs[monthIndex] || mKey;
    const label = `${monthName} ${year}`;
    html += `<option value="${mKey}">${escapeHtml(label)}</option>`;
  });

  select.innerHTML = html;
  if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
    select.value = currentVal;
  } else {
    select.value = 'all';
  }
}

/**
 * Renderiza el módulo de reportes y finanzas, aplicando el filtro por mes seleccionado.
 */
function renderReports() {
  populateReportMonthFilter();

  const vehId = appState.activeVehicleId;
  const selectedMonth = document.getElementById('reportMonthFilter')?.value || 'all';

  let services = (appState.services || []).filter(s => s && (!s.vehicleId || s.vehicleId === vehId || appState.vehicles.length <= 1));
  let fuels = (appState.fuels || []).filter(f => f && (!f.vehicleId || f.vehicleId === vehId || appState.vehicles.length <= 1));

  if (selectedMonth !== 'all') {
    services = services.filter(s => s.date && s.date.startsWith(selectedMonth));
    fuels = fuels.filter(f => f.date && f.date.startsWith(selectedMonth));
  }

  const totalServSpend = services.reduce((sum, s) => sum + Number(s.cost || 0), 0);
  const totalFuelSpend = fuels.reduce((sum, f) => sum + Number(f.cost || 0), 0);
  const totalCombinedSpend = totalServSpend + totalFuelSpend;

  const servEl = document.getElementById('totalServiceSpend');
  const fuelEl = document.getElementById('totalFuelSpend');
  const combinedEl = document.getElementById('totalCombinedSpend');

  if (servEl) servEl.textContent = formatCurrency(totalServSpend);
  if (fuelEl) fuelEl.textContent = formatCurrency(totalFuelSpend);
  if (combinedEl) combinedEl.textContent = formatCurrency(totalCombinedSpend);

  renderCategoryDonutChart(services);
  renderMonthlyExpensesChart(services, fuels);
}

function renderMonthlyExpensesChart(services, fuels) {
  const chartContainer = document.getElementById('monthlyExpensesChart');
  if (!chartContainer) return;

  if (services.length === 0 && fuels.length === 0) {
    chartContainer.innerHTML = '<p class="subtitle">Registra mantenimientos o gasolina para ver desglose mensual.</p>';
    return;
  }

  const monthlyTotals = {};

  services.forEach(s => {
    if (!s.date) return;
    const monthKey = s.date.substring(0, 7); // •"YYYY-MM"
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + s.cost;
  });

  fuels.forEach(f => {
    if (!f.date) return;
    const monthKey = f.date.substring(0, 7); // •"YYYY-MM"
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + f.cost;
  });

  const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => b.localeCompare(a));

  if (sortedMonths.length === 0) {
    chartContainer.innerHTML = '<p class="subtitle">Sin datos de fecha válidos para desglosar.</p>';
    return;
  }

  const maxMonthSpend = Math.max(...Object.values(monthlyTotals));
  const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  let html = `<div style="display:flex; flex-direction:column; gap:10px; width:100%;">`;

  sortedMonths.forEach(mKey => {
    const [year, monthNum] = mKey.split('-');
    const monthName = monthNamesEs[parseInt(monthNum, 10) - 1] || mKey;
    const total = monthlyTotals[mKey];
    const percent = maxMonthSpend > 0 ? Math.round((total / maxMonthSpend) * 100) : 0;

    html += `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
          <span><strong>${monthName} ${year}</strong></span>
          <span style="font-weight:700; color:#30d158;">${formatCurrency(total)}</span>
        </div>
        <div style="width:100%; height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
          <div style="width:${percent}%; height:100%; background:linear-gradient(90deg, #0a84ff, #30d158); border-radius:4px;"></div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  chartContainer.innerHTML = html;
}

function renderCategoryDonutChart(services) {
  const chartContainer = document.getElementById('categoryChart');
  if (services.length === 0) {
    chartContainer.innerHTML = '<p class="subtitle">Registra servicios para ver desglose de gastos.</p>';
    return;
  }

  const categoryTotals = {};
  services.forEach(s => {
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + s.cost;
  });

  const categories = Object.keys(categoryTotals);
  let html = `<div style="display:flex; flex-direction:column; gap:8px; width:100%;">`;
  let grandTotal = services.reduce((sum, s) => sum + s.cost, 0);

  categories.forEach((cat) => {
    let cost = categoryTotals[cat];
    let percent = grandTotal > 0 ? Math.round((cost / grandTotal) * 100) : 0;

    html += `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
          <span>${escapeHtml(cat)}</span>
          <span style="font-weight:700;">${formatCurrency(cost)} (${percent}%)</span>
        </div>
        <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
          <div style="width:${percent}%; height:100%; background:#ffffff; border-radius:3px;"></div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  chartContainer.innerHTML = html;
}

// Modals
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    if (id === 'modalService' && !document.getElementById('servId').value) {
      const form = document.getElementById('formService');
      if (form) form.reset();
      document.getElementById('servId').value = '';
      setTodayDates();
    } else if (id === 'modalFuel' && !document.getElementById('fuelId').value) {
      const form = document.getElementById('formFuel');
      if (form) form.reset();
      document.getElementById('fuelId').value = '';
      setTodayDates();
    } else if (id === 'modalDocument' && !document.getElementById('docId').value) {
      const form = document.getElementById('formDocument');
      if (form) form.reset();
      document.getElementById('docId').value = '';
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// Forms
function saveOdometer(e) {
  e.preventDefault();
  const km = parseInt(document.getElementById('quickOdometerInput').value);
  const veh = getActiveVehicle();
  if (veh && km) {
    veh.km = km;
    saveState();
    closeModal('modalOdometer');
    renderApp();
  }
}

function saveService(e) {
  e.preventDefault();
  const veh = getActiveVehicle();
  if (!veh) { alert('Primero debes registrar un vehículo.'); return; }
  const servId = document.getElementById('servId').value;
  const category = document.getElementById('servCategory').value;
  const title = category || 'Servicio Mecánico';
  const cost = parseFloat(document.getElementById('servCost').value);
  const date = document.getElementById('servDate').value;
  const km = parseInt(document.getElementById('servKm').value);
  const shop = document.getElementById('servShop').value.trim();
  const notes = document.getElementById('servNotes') ? document.getElementById('servNotes').value.trim() : '';
  const receiptInput = document.getElementById('servReceiptFile');

  const safeCost = isNaN(cost) || cost < 0 ? 0 : cost;
  const safeKm = isNaN(km) || km < 0 ? veh.km : km;

  let targetServ = servId ? appState.services.find(s => s.id === servId) : null;

  const processAndSave = async (receiptBase64) => {
    const servData = {
      id: servId || undefined,
      vehicleId: veh.id,
      category, title, cost: safeCost, date, km: safeKm, shop, notes,
      receipt: receiptBase64 || (targetServ ? targetServ.receipt : '')
    };

    await SyncService.executeCrud(targetServ ? 'UPDATE' : 'CREATE', STORES.SERVICES, servData);

    if (safeKm > veh.km) {
      veh.km = safeKm;
      await SyncService.executeCrud('UPDATE', STORES.VEHICLES, veh);
    }

    await loadAppStateFromDB();
    closeModal('modalService');
    document.getElementById('formService').reset();
    setTodayDates();

    // Reset filter to 'all' so that all services are immediately visible for editing or deleting
    currentFilter = 'all';
    renderMaintenanceFilterPills();
    renderApp();
    if (typeof renderVehicleHealth === 'function') renderVehicleHealth();
  };

  if (receiptInput && receiptInput.files && receiptInput.files[0]) {
    readAndCompressImage(receiptInput.files[0], processAndSave);
  } else {
    processAndSave('');
  }
}

async function saveFuel(e) {
  e.preventDefault();
  const veh = getActiveVehicle();
  if (!veh) { alert('Primero debes registrar un vehículo.'); return; }
  const fuelId = document.getElementById('fuelId').value;
  const cost = parseFloat(document.getElementById('fuelCost').value);
  const volumeInput = document.getElementById('fuelLiters') || document.getElementById('fuelVolume');
  const volume = volumeInput ? parseFloat(volumeInput.value) : NaN;
  const km = parseInt(document.getElementById('fuelKm').value);
  const date = document.getElementById('fuelDate').value;
  const notes = document.getElementById('fuelNotes') ? document.getElementById('fuelNotes').value.trim() : '';
  const receiptInput = document.getElementById('fuelReceiptFile');

  const safeCost = isNaN(cost) || cost < 0 ? 0 : cost;
  const safeVolume = isNaN(volume) || volume <= 0 ? 1 : volume;
  const safeKm = isNaN(km) || km < 0 ? veh.km : km;

  let targetFuel = fuelId ? appState.fuels.find(f => f.id === fuelId) : null;

  const processAndSave = async (receiptBase64) => {
    const fuelData = {
      id: fuelId || undefined,
      vehicleId: veh.id,
      cost: safeCost, volume: safeVolume, liters: safeVolume, km: safeKm, date, notes,
      receipt: receiptBase64 || (targetFuel ? targetFuel.receipt : '')
    };

    await SyncService.executeCrud(targetFuel ? 'UPDATE' : 'CREATE', STORES.FUELS, fuelData);

    if (safeKm > veh.km) {
      veh.km = safeKm;
      await SyncService.executeCrud('UPDATE', STORES.VEHICLES, veh);
    }

    await loadAppStateFromDB();
    closeModal('modalFuel');
    document.getElementById('formFuel').reset();
    setTodayDates();
    renderApp();
  };

  if (receiptInput && receiptInput.files && receiptInput.files[0]) {
    readAndCompressImage(receiptInput.files[0], processAndSave);
  } else {
    processAndSave('');
  }
}

function viewReceipt(serviceId) {
  const serv = appState.services.find(s => s.id === serviceId);
  if (serv && serv.receipt) {
    const container = document.getElementById('receiptContainer');
    if (serv.receipt.startsWith('data:application/pdf')) {
      container.innerHTML = `<iframe src="${serv.receipt}" style="width:100%; height:450px; border:none; border-radius:8px;"></iframe>`;
    } else {
      container.innerHTML = `<img src="${serv.receipt}" alt="Factura de ${escapeHtml(serv.title)}">`;
    }
    openModal('modalReceiptViewer');
  }
}

function viewFuelReceipt(fuelId) {
  const f = appState.fuels.find(item => item.id === fuelId);
  if (f && f.receipt) {
    const container = document.getElementById('receiptContainer');
    if (f.receipt.startsWith('data:application/pdf')) {
      container.innerHTML = `<iframe src="${f.receipt}" style="width:100%; height:450px; border:none; border-radius:8px;"></iframe>`;
    } else {
      container.innerHTML = `<img src="${f.receipt}" alt="Comprobante de Recarga de Gasolina">`;
    }
    openModal('modalReceiptViewer');
  }
}

/**
 * Genera el informe técnico y expediente formal del vehículo,
 * permitiendo su visualización completa o filtrada según el mes seleccionado.
 */
function generateCertifiedReport() {
  const veh = getActiveVehicle();
  if (!veh) return;

  const selectedMonth = document.getElementById('reportMonthFilter')?.value || 'all';

  let services = (appState.services || []).filter(s => !s.vehicleId || s.vehicleId === veh.id || appState.vehicles.length <= 1).sort((a, b) => new Date(b.date) - new Date(a.date));
  let fuels = (appState.fuels || []).filter(f => !f.vehicleId || f.vehicleId === veh.id || appState.vehicles.length <= 1);
  const reminders = (appState.reminders || []).filter(r => (!r.vehicleId || r.vehicleId === veh.id || appState.vehicles.length <= 1) && !r.completed);

  let periodLabel = 'Histórico Completo';
  if (selectedMonth !== 'all') {
    services = services.filter(s => s.date && s.date.startsWith(selectedMonth));
    fuels = fuels.filter(f => f.date && f.date.startsWith(selectedMonth));
    const [year, monthNum] = selectedMonth.split('-');
    const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = monthNamesEs[parseInt(monthNum, 10) - 1] || selectedMonth;
    periodLabel = `Período: ${monthName} ${year}`;
  }

  const totalServSpend = services.reduce((sum, s) => sum + Number(s.cost || 0), 0);
  const totalFuelSpend = fuels.reduce((sum, f) => sum + Number(f.cost || 0), 0);
  const totalSpend = totalServSpend + totalFuelSpend;

  const lastService = services[0];
  const emissionDate = new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });

  const container = document.getElementById('certifiedDocumentContent');
  if (!container) return;

  container.innerHTML = `
    <div class="cert-header" style="border-bottom:2px solid #000000; padding-bottom:12px; margin-bottom:16px; background:#ffffff; color:#000000;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h1 style="color:#000000; margin:0 0 4px 0; font-size:1.4rem; text-transform:uppercase; letter-spacing:0.5px;">GARAGEONE - EXPEDIENTE TÉCNICO Y MANTENIMIENTO</h1>
          <p style="color:#475569; margin:0; font-size:0.85rem; font-weight:600;">Reporte Detallado de Servicios Mecánicos para Taller • ${escapeHtml(periodLabel)}</p>
        </div>
        <div style="text-align:right; font-size:0.8rem; color:#475569;">
          <div>Emisión: <strong style="color:#000000;">${emissionDate}</strong></div>
          <div>Propietario: <strong style="color:#000000;">${currentUser ? escapeHtml(currentUser.name) : 'Cliente'}</strong></div>
        </div>
      </div>
    </div>

    <!-- Vehicle Specs Box -->
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:16px; color:#0f172a;">
      <h3 style="margin:0 0 8px 0; font-size:1rem; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">Ficha del Vehículo</h3>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:8px; font-size:0.85rem; color:#1e293b;">
        <div><strong style="color:#0f172a;">Vehículo:</strong> ${escapeHtml(veh.name)}</div>
        <div><strong style="color:#0f172a;">Placa / Matrícula:</strong> ${escapeHtml(veh.plate) || 'SIN PLACA'}</div>
        <div><strong style="color:#0f172a;">Año:</strong> ${veh.year}</div>
        <div><strong style="color:#0f172a;">Tipo:</strong> ${escapeHtml(veh.type)}</div>
        <div><strong style="color:#0f172a;">Odómetro Actual:</strong> ${formatVehicleDistance(veh.km, veh)}</div>
        <div><strong style="color:#0f172a;">Última Revisión:</strong> ${lastService ? lastService.date : 'Sin registro'}</div>
      </div>
    </div>

    <!-- Financial & Service Overview -->
    <div style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
      <div style="flex:1; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; text-align:center;">
        <span style="display:block; font-size:0.75rem; color:#64748b; text-transform:uppercase;">Total Servicios</span>
        <strong style="font-size:1.1rem; color:#0f172a;">${services.length} Mantenimiento(s)</strong>
      </div>
      <div style="flex:1; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; text-align:center;">
        <span style="display:block; font-size:0.75rem; color:#64748b; text-transform:uppercase;">Inversión Mantenimiento</span>
        <strong style="font-size:1.1rem; color:#0f172a;">${formatCurrency(totalServSpend)}</strong>
      </div>
      <div style="flex:1; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; text-align:center;">
        <span style="display:block; font-size:0.75rem; color:#64748b; text-transform:uppercase;">Total Combustible</span>
        <strong style="font-size:1.1rem; color:#0f172a;">${formatCurrency(totalFuelSpend)} (${fuels.length} cargas)</strong>
      </div>
    </div>

    <!-- Detailed Services Table -->
    <h3 style="margin:16px 0 8px 0; font-size:1.05rem; color:#0f172a; border-bottom:2px solid #0f172a; padding-bottom:4px;">
      Historial Detallado de Trabajos y Repuestos (${escapeHtml(periodLabel)})
    </h3>

    ${services.length === 0 ? `
      <p style="text-align:center; padding:16px; color:#64748b; font-style:italic;">No hay servicios registrados para este período.</p>
    ` : `
      <table class="cert-table" style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:0.82rem; background:#ffffff; color:#0f172a;">
        <thead>
          <tr style="background:#0f172a; color:#ffffff; text-align:left;">
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a;">Fecha</th>
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a;">${(veh && veh.unitDistance === 'mi') ? 'MILLAS' : 'KM'}</th>
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a;">Categoría</th>
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a;">Trabajo Realizado</th>
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a;">Detalles / Repuestos / Garantía</th>
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a;">Taller / Mecánico</th>
            <th style="padding:8px; border:1px solid #0f172a; color:#ffffff; background:#0f172a; text-align:right;">Costo</th>
          </tr>
        </thead>
        <tbody>
          ${services.map((s, idx) => `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; color:#0f172a; border-bottom:1px solid #cbd5e1;">
              <td style="padding:8px; border:1px solid #cbd5e1; color:#0f172a; white-space:nowrap;"><strong style="color:#0f172a;">${s.date}</strong></td>
              <td style="padding:8px; border:1px solid #cbd5e1; color:#0f172a; white-space:nowrap;">${formatVehicleDistance(s.km, veh)}</td>
              <td style="padding:8px; border:1px solid #cbd5e1; color:#0f172a;"><strong style="color:#0f172a;">${escapeHtml(s.category)}</strong></td>
              <td style="padding:8px; border:1px solid #cbd5e1; color:#0f172a;"><strong style="color:#0f172a;">${escapeHtml(s.title)}</strong></td>
              <td style="padding:8px; border:1px solid #cbd5e1; color:#334155;">${escapeHtml(s.notes) || '<span style="color:#94a3b8;">Sin notas adicionales</span>'}</td>
              <td style="padding:8px; border:1px solid #cbd5e1; color:#0f172a;">${escapeHtml(s.shop) || 'Mecánico Privado'}</td>
              <td style="padding:8px; border:1px solid #cbd5e1; color:#0f172a; text-align:right; font-weight:700;">${formatCurrency(s.cost)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <!-- Pending / Recommended Maintenance for Mechanic -->
    ${reminders.length > 0 ? `
      <div style="margin-top:16px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:12px; color:#78350f;">
        <h4 style="margin:0 0 6px 0; color:#b45309; font-size:0.95rem;">Mantenimientos Pendientes y Próximos (Para Atención del Mecánico)</h4>
        <ul style="margin:0; padding-left:20px; font-size:0.83rem; color:#78350f;">
          ${reminders.map(r => `
            <li style="margin-bottom:4px;">
              <strong style="color:#78350f;">${escapeHtml(r.title)}</strong> (${escapeHtml(r.category)}) 
              ${r.targetKm ? ` • Meta: ${formatVehicleDistance(r.targetKm, veh)}` : ''}
              ${r.targetDate ? ` • Fecha Meta: ${r.targetDate}` : ''}
              ${r.notes ? ` • <em>${escapeHtml(r.notes)}</em>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <div style="margin-top:24px; border-top:1px solid #cbd5e1; padding-top:10px; font-size:0.75rem; color:#64748b; text-align:center; background:#ffffff;">
      GarageOne • Expediente Vehicular Inteligente • Documento preparado para entrega al Taller / Mecánico
    </div>
  `;

  openModal('modalCertifiedReport');
}

/**
 * Genera y descarga el archivo PDF del expediente técnico con alineación y márgenes ajustados.
 * Utiliza un clon limpio en el DOM para evitar desplazamientos visuales y asegurar máxima nitidez.
 */
function downloadReportPDF() {
  const veh = getActiveVehicle();
  const element = document.getElementById('certifiedDocumentContent');
  if (!element || !veh) return;

  const cleanName = (veh.plate || veh.name).replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Expediente_Mecanico_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = '820px';
  wrapper.style.minHeight = '100vh';
  wrapper.style.zIndex = '999999';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#0f172a';
  wrapper.style.overflowY = 'auto';
  wrapper.style.padding = '15px';
  wrapper.style.boxSizing = 'border-box';

  const clone = element.cloneNode(true);
  clone.style.width = '790px';
  clone.style.maxWidth = '100%';
  clone.style.margin = '0 auto';
  clone.style.background = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.fontFamily = 'Arial, Helvetica, sans-serif';
  clone.style.boxSizing = 'border-box';

  const allNodes = clone.querySelectorAll('*');
  allNodes.forEach(el => {
    if (el.tagName === 'TH' || (el.style && el.style.background && el.style.background.includes('0f172a'))) {
      el.style.color = '#ffffff';
    } else {
      el.style.color = '#0f172a';
    }
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  if (window.html2pdf) {
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     fileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: false, 
        allowTaint: true,
        scrollY: 0, 
        scrollX: 0,
        windowWidth: 820,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(clone).save().then(() => {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }).catch(err => {
      console.error('Error al generar PDF con html2pdf:', err);
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      window.print();
    });
  } else {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    window.print();
  }
}

function readAndCompressImage(file, callback) {
  if (!file) return callback('');
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 600;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = function() {
      callback(e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// XML Backup Serialization & Deserialization Engine
function objectToXML(obj, rootName = 'GarageOneBackup') {
  function serialize(val, name) {
    if (val === null || val === undefined) {
      return `<${name} type="null"/>`;
    }
    const type = typeof val;
    if (type === 'boolean' || type === 'number') {
      return `<${name} type="${type}">${val}</${name}>`;
    }
    if (type === 'string') {
      const escaped = val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `<${name} type="string">${escaped}</${name}>`;
    }
    if (Array.isArray(val)) {
      let children = val.map(item => serialize(item, 'item')).join('');
      return `<${name} type="array">${children}</${name}>`;
    }
    if (type === 'object') {
      let children = Object.keys(val).map(key => {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        return serialize(val[key], safeKey);
      }).join('');
      return `<${name} type="object">${children}</${name}>`;
    }
    return `<${name}/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(obj, rootName)}`;
}

function xmlToObject(xmlStr) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Formato XML inválido o corrupto.');
  }

  function parseNode(node) {
    const type = node.getAttribute('type');
    if (type === 'null') return null;
    if (type === 'boolean') return node.textContent === 'true';
    if (type === 'number') return Number(node.textContent);
    if (type === 'string') return node.textContent;
    if (type === 'array') {
      const result = [];
      for (let child of node.children) {
        if (child.tagName === 'item') {
          result.push(parseNode(child));
        }
      }
      return result;
    }
    if (type === 'object') {
      const result = {};
      for (let child of node.children) {
        result[child.tagName] = parseNode(child);
      }
      return result;
    }
    if (node.children.length === 0) {
      return node.textContent;
    }
    const obj = {};
    for (let child of node.children) {
      obj[child.tagName] = parseNode(child);
    }
    return obj;
  }

  return parseNode(xmlDoc.documentElement);
}



// Report Sharing (Text & Email)
function shareReportText() {
  const veh = getActiveVehicle();
  if (!veh) return;
  const services = appState.services.filter(s => s.vehicleId === veh.id);
  const fuels = appState.fuels.filter(f => f.vehicleId === veh.id);
  const totalServ = services.reduce((sum, s) => sum + s.cost, 0);
  const totalFuel = fuels.reduce((sum, f) => sum + f.cost, 0);

  const text = `Expediente de Vehículo - GarageOne\n\n` +
    `• Vehículo: ${veh.name} (${veh.year})\n` +
    `• Placa: ${veh.plate || 'N/A'}\n` +
    `• Odómetro: ${veh.km.toLocaleString()} KM\n\n` +
    `Resumen de Inversión:\n` +
    `• Mantenimiento: ${formatCurrency(totalServ)} (${services.length} servicios)\n` +
    `• Combustible: ${formatCurrency(totalFuel)} (${fuels.length} cargas)\n` +
    `• Total Invertido: ${formatCurrency(totalServ + totalFuel)}\n\n` +
    `Generado con GarageOne.`;

  if (navigator.share) {
    navigator.share({
      title: `Expediente ${veh.name}`,
      text: text
    }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Resumen copiado al portapapeles.');
    }).catch(() => {
      alert(text);
    });
  } else {
    alert(text);
  }
}

function shareReportEmail() {
  const veh = getActiveVehicle();
  if (!veh) return;
  const services = appState.services.filter(s => s.vehicleId === veh.id);
  const fuels = appState.fuels.filter(f => f.vehicleId === veh.id);
  const totalServ = services.reduce((sum, s) => sum + s.cost, 0);
  const totalFuel = fuels.reduce((sum, f) => sum + f.cost, 0);

  const subject = `Expediente de Mantenimiento - ${veh.name} (${veh.plate || 'GarageOne'})`;
  const body = `HISTORIAL DE MANTENIMIENTO Y SERVICIOS - GARAGEONE\n\n` +
    `Vehículo: ${veh.name} (${veh.year})\n` +
    `Placa: ${veh.plate || 'N/A'}\n` +
    `Odómetro Actual: ${formatVehicleDistance(veh.km, veh)}\n\n` +
    `RESUMEN FINANCIERO:\n` +
    `- Total Mantenimiento: ${formatCurrency(totalServ)} (${services.length} registros)\n` +
    `- Total Combustible: ${formatCurrency(totalFuel)} (${fuels.length} recargas)\n` +
    `- Inversión Total: ${formatCurrency(totalServ + totalFuel)}\n\n` +
    `Generado por GarageOne.`;

  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Internationalization (i18n) Engine
const I18N_DICT = {
  es: {
    navGarage: 'Garaje',
    navServices: 'Servicios',
    navFuel: 'Gasolina',
    navGlovebox: 'Guantera',
    navHealth: 'Salud',
    navAI: 'IA',
    navReports: 'Reportes',
    subtitleGarage: 'Tu taller y control vehicular inteligente',
    titleMaintenance: 'Servicios y Mantenimientos',
    subMaintenance: 'Historial mecánico y preventivo',
    btnAddService: '+ Registrar Servicio',
    titleFuel: 'Control de Gasolina',
    subFuel: 'Registro de recargas y consumo de combustible',
    btnAddFuel: '+ Registrar Gasolina',
    guanteraTitle: 'Guantera Digital',
    guanteraSubtitle: 'Papeles, seguro, RTV y directorio de asistencia',
    contactsTitle: 'Números Importantes',
    contactsSubtitle: 'Desliza para borrar. Toca para llamar a talleres, grúa o seguro',
    btnAddContact: '+ Guardar Número',
    docsTitle: 'Documentos del Vehículo',
    btnAddDoc: '+ Agregar Documento',
    titleHealth: 'Salud del Vehículo',
    subHealth: 'Diagnóstico predictivo y estado de componentes',
    titleAI: 'Asistente IA Mecánico',
    subAI: 'Análisis inteligente y consultas mecánicas',
    aiQueryTitle: 'Consulta a la IA',
    aiQuerySub: 'Preguntas rápidas o consulta personalizada:',
    btnAskAI: 'Consultar a la IA',
    titleReports: 'Reportes y Finanzas',
    subReports: 'Inversión detallada en mantenimientos y combustible',
    cardTotalServ: 'Total Mantenimiento',
    cardTotalFuel: 'Total Combustible',
    cardCatBreakdown: 'Desglose de Gastos por Categoría',
    cardMonthBreakdown: 'Desglose de Gastos por Mes',
    reportTitle: 'Historial de Mantenimientos y Reparaciones',
    reportSubtitle: 'Genera un documento formal con todas las reparaciones mecánicas, servicios, talleres y fechas registradas para este vehículo, listo para compartir o imprimir en PDF.',
    btnViewReport: 'Ver / Imprimir Expediente (PDF)',
    btnShareText: 'Compartir Texto',
    btnShareEmail: 'Correo',
    titleSettings: 'Ajustes Generales',
    subSettings: 'Configuración de cuenta e intervalos',
    profileTitle: 'Perfil de Usuario',
    lblUsername: 'Usuario',
    secAuthTitle: 'Seguridad y Autenticación',
    lblChangePass: 'Cambiar Contraseña',
    lblCurrentPass: 'Contraseña Actual',
    lblNewPass: 'Nueva Contraseña',
    lblConfirmPass: 'Confirmar Nueva Contraseña',
    btnSavePass: 'Guardar Nueva Contraseña',
    pinTitle: 'Acceso con PIN',
    pinSubtitle: 'Permite desbloquear la app con un PIN numérico',
    btnSavePin: 'Guardar PIN',
    prefTitle: 'Preferencias',
    lblLanguage: 'Idioma de la App / App Language',
    lblCurrency: 'Moneda del Sistema / Currency',
    lblDistanceUnit: 'Unidad de Distancia / Distance Unit',
    backupTitle: 'Respaldo y Seguridad',
    btnExport: 'Exportar Datos (JSON)',
    btnImport: 'Importar Datos (JSON)',
    btnLogout: 'Bloquear / Cerrar Sesión',
    certifiedModalTitle: 'Expediente de Venta',
    btnPrint: 'Imprimir / PDF',
    noVehicles: 'No hay vehículos registrados.',
    noServices: 'Sin mantenimientos registrados para este vehículo.',
    noFuels: 'Sin recargas de gasolina registradas.',
    noReminders: 'No hay recordatorios pendientes.',
    noDocs: 'Sin documentos registrados en la guantera.',
    noContacts: 'No hay números guardados.',
    callBtn: 'Llamar',
    deleteBtn: 'Eliminar',
    urgentBadge: 'Atención requerida',
    okBadge: 'Al día',
    validDoc: 'Vigente',
    expiredDoc: 'Vencido',
    dueSoonDoc: 'Por vencer',
    lblPlate: 'Placa',
    lblYear: 'Año',
    lblModelType: 'Tipo',
    lblOdometer: 'Odómetro',
    myReminders: 'Mis Recordatorios',
    myVehicles: 'Mis Vehículos',
    btnNew: '+ Nuevo',
    noPlate: 'SIN PLACA',
    myReminders: 'Mis Recordatorios',
    myVehicles: 'Mis Vehículos',
    btnNew: '+ Nuevo',
    noPlate: 'SIN PLACA',
    notAvailable: 'N/A',
    tapToUpdateOdometer: 'Toca para actualizar odómetro'
  }
};

function t(key, fallback = '') {
  if (I18N_DICT.es && I18N_DICT.es[key]) return I18N_DICT.es[key];
  return fallback || key;
}

function applyLanguageTranslations() {
  const dict = I18N_DICT.es;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict && dict[key]) {
      el.textContent = dict[key];
    }
  });
}

// Admin User & Roles Management Engine
function applyNavigationPermissions() {
  if (!currentUser) return;
  const perms = currentUser.permissions || getRolePermissionsPreset(currentUser.role || 'estandar');

  const tabIds = ['tabGarage', 'tabMaintenance', 'tabFuel', 'tabGuantera', 'tabAI', 'tabReports'];
  const navMap = {
    'tabGarage': 0,
    'tabMaintenance': 1,
    'tabFuel': 2,
    'tabGuantera': 3,
    'tabAI': 4,
    'tabReports': 5
  };

  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  tabIds.forEach(tId => {
    const idx = navMap[tId];
    if (navItems[idx]) {
      const allowed = perms[tId] !== false;
      navItems[idx].style.display = allowed ? 'inline-flex' : 'none';
    }
  });
}

// ================================================================
// Admin users module: removed per user request (v606)
// Users are managed via the login/register portal
// ================================================================
function renderAdminUsersList() { /* module removed */ }
function openAdminUserModal() { /* module removed */ }
function saveAdminUser(e) { if (e) e.preventDefault(); /* module removed */ }
function deleteAdminUser() { /* module removed */ }
function handleAdminRolePresetChange() { /* module removed */ }



/* ==========================================================================
   Modulo: Salud del Vehiculo (Motor de Analisis y Asistente Inteligente)
   ========================================================================== */

const DEFAULT_HEALTH_SETTINGS = {
  oilKm: 5000,
  tiresKm: 50000,
  brakePadsKm: 30000,
  brakeDiscsKm: 80000,
  batteryMonths: 36,
  filtersKm: 15000,
  beltKm: 60000,
  beltMonths: 48,
  weights: {
    oil: 20,
    tires: 20,
    brakes: 20,
    battery: 15,
    filters: 10,
    belts: 10,
    docs: 5
  }
};

function getHealthSettings() {
  if (appState.healthSettings && typeof appState.healthSettings === 'object') {
    return {
      ...DEFAULT_HEALTH_SETTINGS,
      ...appState.healthSettings,
      weights: { ...DEFAULT_HEALTH_SETTINGS.weights, ...(appState.healthSettings.weights || {}) }
    };
  }
  try {
    const stored = localStorage.getItem('GARAGEONE_HEALTH_SETTINGS');
    if (stored) {
      const parsed = JSON.parse(stored);
      appState.healthSettings = parsed;
      return {
        ...DEFAULT_HEALTH_SETTINGS,
        ...parsed,
        weights: { ...DEFAULT_HEALTH_SETTINGS.weights, ...(parsed.weights || {}) }
      };
    }
  } catch (e) {}
  appState.healthSettings = DEFAULT_HEALTH_SETTINGS;
  return DEFAULT_HEALTH_SETTINGS;
}

function openHealthSettingsModal() {
  const cfg = getHealthSettings();

  const elOil = document.getElementById('hsOilKm');
  const elTires = document.getElementById('hsTiresKm');
  const elPads = document.getElementById('hsBrakePadsKm');
  const elDiscs = document.getElementById('hsBrakeDiscsKm');
  const elBat = document.getElementById('hsBatteryMonths');
  const elFilt = document.getElementById('hsFiltersKm');
  const elBeltKm = document.getElementById('hsBeltKm');
  const elBeltM = document.getElementById('hsBeltMonths');

  const hwOil = document.getElementById('hwOil');
  const hwTires = document.getElementById('hwTires');
  const hwBrakes = document.getElementById('hwBrakes');
  const hwBat = document.getElementById('hwBattery');
  const hwFilt = document.getElementById('hwFilters');
  const hwBelts = document.getElementById('hwBelts');
  const hwDocs = document.getElementById('hwDocs');

  if (elOil) elOil.value = cfg.oilKm;
  if (elTires) elTires.value = cfg.tiresKm;
  if (elPads) elPads.value = cfg.brakePadsKm;
  if (elDiscs) elDiscs.value = cfg.brakeDiscsKm;
  if (elBat) elBat.value = cfg.batteryMonths;
  if (elFilt) elFilt.value = cfg.filtersKm;
  if (elBeltKm) elBeltKm.value = cfg.beltKm;
  if (elBeltM) elBeltM.value = cfg.beltMonths;

  if (hwOil) hwOil.value = cfg.weights.oil;
  if (hwTires) hwTires.value = cfg.weights.tires;
  if (hwBrakes) hwBrakes.value = cfg.weights.brakes;
  if (hwBat) hwBat.value = cfg.weights.battery;
  if (hwFilt) hwFilt.value = cfg.weights.filters;
  if (hwBelts) hwBelts.value = cfg.weights.belts;
  if (hwDocs) hwDocs.value = cfg.weights.docs;

  openModal('modalHealthSettings');
}

function saveHealthSettings(e) {
  if (e) e.preventDefault();

  const cfg = {
    oilKm: Number(document.getElementById('hsOilKm').value) || 5000,
    tiresKm: Number(document.getElementById('hsTiresKm').value) || 50000,
    brakePadsKm: Number(document.getElementById('hsBrakePadsKm').value) || 30000,
    brakeDiscsKm: Number(document.getElementById('hsBrakeDiscsKm').value) || 80000,
    batteryMonths: Number(document.getElementById('hsBatteryMonths').value) || 36,
    filtersKm: Number(document.getElementById('hsFiltersKm').value) || 15000,
    beltKm: Number(document.getElementById('hsBeltKm').value) || 60000,
    beltMonths: Number(document.getElementById('hsBeltMonths').value) || 48,
    weights: {
      oil: Number(document.getElementById('hwOil').value) || 20,
      tires: Number(document.getElementById('hwTires').value) || 20,
      brakes: Number(document.getElementById('hwBrakes').value) || 20,
      battery: Number(document.getElementById('hwBattery').value) || 15,
      filters: Number(document.getElementById('hwFilters').value) || 10,
      belts: Number(document.getElementById('hwBelts').value) || 10,
      docs: Number(document.getElementById('hwDocs').value) || 5
    }
  };

  appState.healthSettings = cfg;
  try {
    localStorage.setItem('GARAGEONE_HEALTH_SETTINGS', JSON.stringify(cfg));
  } catch (err) {}
  saveState();
  closeModal('modalHealthSettings');
  renderVehicleHealth();
}

function navigateToHealthHistory(targetTab, filterKeyword) {
  switchTab(targetTab);
  if (targetTab === 'tabMaintenance' && filterKeyword) {
    const input = document.getElementById('maintenanceSearchInput');
    if (input) {
      input.value = filterKeyword;
      if (typeof renderMaintenanceList === 'function') renderMaintenanceList();
    }
  }
}

function quickAddHealthService(categoryKey) {
  if (typeof openServiceModal === 'function') {
    openServiceModal();
    setTimeout(() => {
      const catSelect = document.getElementById('servCategory');
      if (catSelect) {
        let matchOption = Array.from(catSelect.options).find(o => 
          o.value.toLowerCase().includes(categoryKey.toLowerCase()) || 
          o.text.toLowerCase().includes(categoryKey.toLowerCase())
        );
        if (matchOption) catSelect.value = matchOption.value;
      }
    }, 100);
  }
}

function getRelativeTimeString(timestamp) {
  if (!timestamp) return 'Hace unos momentos';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Hace unos momentos';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function calculateMonthsDiff(d1Str, d2Str) {
  if (!d1Str) return 0;
  const d1 = new Date(d1Str);
  const d2 = d2Str ? new Date(d2Str) : new Date();
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return Math.max(0, months);
}

function calculateDaysDiff(d1Str) {
  if (!d1Str) return 999;
  const target = new Date(d1Str);
  const today = new Date();
  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateVehicleHealth(veh) {
  const cfg = getHealthSettings();
  if (!veh) return null;

  const isMiles = veh.unitDistance === 'mi';
  const unitLabel = isMiles ? 'mi' : 'km';
  const convertToKm = (val) => isMiles ? Number(val || 0) * 1.60934 : Number(val || 0);
  const convertFromKm = (kmVal) => isMiles ? Math.round(kmVal / 1.60934) : Math.round(kmVal);

  const currentKm = convertToKm(veh.km);
  const services = (appState.services || []).filter(s => !s.vehicleId || s.vehicleId === veh.id || appState.vehicles.length <= 1);
  const documents = (appState.documents || []).filter(d => !d.vehicleId || d.vehicleId === veh.id || appState.vehicles.length <= 1);
  const reminders = (appState.reminders || []).filter(r => !r.vehicleId || r.vehicleId === veh.id || appState.vehicles.length <= 1);
  const fuels = (appState.fuels || []).filter(f => !f.vehicleId || f.vehicleId === veh.id || appState.vehicles.length <= 1);

  const missingItems = [];

  // 1. Aceite
  const oilServices = services.filter(s => 
    (s.category && s.category.toLowerCase() === 'aceite') ||
    (s.title && s.title.toLowerCase().includes('aceite')) ||
    (s.description && s.description.toLowerCase().includes('aceite'))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  let oilData = { hasData: false, score: 0, categoryKey: 'aceite', remainingKm: cfg.oilKm, detail: 'Sin historial registrado', alert: null };
  if (oilServices.length > 0) {
    const lastOil = oilServices[0];
    const lastKm = convertToKm(lastOil.mileage || lastOil.km || veh.km);
    const interval = convertToKm(lastOil.nextKm) > 0 ? (convertToKm(lastOil.nextKm) - lastKm) : cfg.oilKm;
    const effInterval = interval > 0 ? interval : cfg.oilKm;
    const kmUsed = Math.max(0, currentKm - lastKm);
    const remKm = Math.max(0, effInterval - kmUsed);
    const score = Math.max(0, Math.min(100, Math.round(100 - (kmUsed / effInterval) * 100)));
    const dispRem = convertFromKm(remKm);

    oilData = {
      hasData: true,
      score: score,
      categoryKey: 'aceite',
      remainingKm: dispRem,
      usedKm: convertFromKm(kmUsed),
      interval: convertFromKm(effInterval),
      lastDate: lastOil.date,
      oilType: lastOil.title || 'Aceite de motor',
      detail: `Restan ${dispRem.toLocaleString()} ${unitLabel}`
    };
    if (remKm <= 1000) {
      oilData.alert = `Proximo cambio de aceite en ${dispRem.toLocaleString()} ${unitLabel}.`;
    }
  } else {
    missingItems.push({ name: 'Ultimo cambio de aceite', key: 'aceite' });
  }

  // 2. Llantas
  const tireServices = services.filter(s =>
    (s.category && (s.category.toLowerCase() === 'llantas' || s.category.toLowerCase() === 'neumaticos')) ||
    (s.title && (s.title.toLowerCase().includes('llanta') || s.title.toLowerCase().includes('neumatic'))) ||
    (s.description && s.description.toLowerCase().includes('llanta'))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  let tireData = { hasData: false, score: 0, categoryKey: 'llantas', remainingKm: cfg.tiresKm, detail: 'Sin historial de llantas', alert: null };
  if (tireServices.length > 0) {
    const lastTire = tireServices[0];
    const lastKm = convertToKm(lastTire.mileage || lastTire.km || veh.km);
    const lifespan = cfg.tiresKm;
    const kmUsed = Math.max(0, currentKm - lastKm);
    const remKm = Math.max(0, lifespan - kmUsed);
    const score = Math.max(0, Math.min(100, Math.round(100 - (kmUsed / lifespan) * 100)));
    const condText = score >= 60 ? 'Buenas condiciones' : (score >= 30 ? 'Desgaste moderado' : 'Reemplazo cercano');
    const dispRem = convertFromKm(remKm);

    tireData = {
      hasData: true,
      score: score,
      categoryKey: 'llantas',
      remainingKm: dispRem,
      usedKm: convertFromKm(kmUsed),
      condition: condText,
      detail: `${condText} • Restan ${dispRem.toLocaleString()} ${unitLabel}`
    };
    if (score < 25) {
      tireData.alert = `La vida util de llantas es inferior al 25% (restan ${dispRem.toLocaleString()} ${unitLabel}).`;
    }
  } else {
    missingItems.push({ name: 'Cambio de llantas', key: 'llantas' });
  }

  // 3. Frenos
  const brakeServices = services.filter(s =>
    (s.category && s.category.toLowerCase() === 'frenos') ||
    (s.title && (s.title.toLowerCase().includes('freno') || s.title.toLowerCase().includes('pastilla') || s.title.toLowerCase().includes('disco'))) ||
    (s.description && s.description.toLowerCase().includes('freno'))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  let brakeData = { hasData: false, score: 0, categoryKey: 'frenos', remainingKm: cfg.brakePadsKm, detail: 'Sin historial de frenos', alert: null };
  if (brakeServices.length > 0) {
    const lastBrake = brakeServices[0];
    const lastKm = convertToKm(lastBrake.mileage || lastBrake.km || veh.km);
    const isDisc = (lastBrake.title || '').toLowerCase().includes('disco');
    const lifespan = isDisc ? cfg.brakeDiscsKm : cfg.brakePadsKm;
    const kmUsed = Math.max(0, currentKm - lastKm);
    const remKm = Math.max(0, lifespan - kmUsed);
    const score = Math.max(0, Math.min(100, Math.round(100 - (kmUsed / lifespan) * 100)));
    const dispRem = convertFromKm(remKm);

    brakeData = {
      hasData: true,
      score: score,
      categoryKey: 'frenos',
      remainingKm: dispRem,
      usedKm: convertFromKm(kmUsed),
      detail: `Restan ${dispRem.toLocaleString()} ${unitLabel}`
    };
    if (score < 25) {
      brakeData.alert = `Desgaste de frenos critico. Restan solo ${dispRem.toLocaleString()} ${unitLabel}.`;
    }
  } else {
    missingItems.push({ name: 'Cambio de frenos', key: 'frenos' });
  }

  // 4. Bateria
  const batServices = services.filter(s =>
    (s.category && (s.category.toLowerCase() === 'bateria' || s.category.toLowerCase() === 'bateria')) ||
    (s.title && (s.title.toLowerCase().includes('bateria') || s.title.toLowerCase().includes('bateria')))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  let batteryData = { hasData: false, score: 0, categoryKey: 'bateria', remainingMonths: cfg.batteryMonths, detail: 'Sin historial de bateria', alert: null };
  if (batServices.length > 0) {
    const lastBat = batServices[0];
    const monthsElapsed = calculateMonthsDiff(lastBat.date);
    const lifespanM = cfg.batteryMonths;
    const remMonths = Math.max(0, lifespanM - monthsElapsed);
    const score = Math.max(0, Math.min(100, Math.round(100 - (monthsElapsed / lifespanM) * 100)));

    batteryData = {
      hasData: true,
      score: score,
      categoryKey: 'bateria',
      remainingMonths: remMonths,
      monthsElapsed: monthsElapsed,
      detail: `Instalada hace ${monthsElapsed} meses • Restan ${remMonths} meses`
    };
    if (monthsElapsed >= Math.floor(lifespanM * 0.8)) {
      batteryData.alert = `La bateria supera el 80% de su vida util (instalada hace ${monthsElapsed} meses).`;
    }
  } else {
    missingItems.push({ name: 'Ultimo cambio de bateria', key: 'bateria' });
  }

  // 5. Filtros
  const filterServices = services.filter(s =>
    (s.category && s.category.toLowerCase() === 'filtros') ||
    (s.title && (s.title.toLowerCase().includes('filtro') || s.title.toLowerCase().includes('filter')))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  let filterData = { hasData: false, score: 0, categoryKey: 'filtros', remainingKm: cfg.filtersKm, detail: 'Sin historial de filtros', alert: null };
  if (filterServices.length > 0) {
    const lastFilt = filterServices[0];
    const lastKm = convertToKm(lastFilt.mileage || lastFilt.km || veh.km);
    const kmUsed = Math.max(0, currentKm - lastKm);
    const remKm = Math.max(0, cfg.filtersKm - kmUsed);
    const score = Math.max(0, Math.min(100, Math.round(100 - (kmUsed / cfg.filtersKm) * 100)));
    const dispRem = convertFromKm(remKm);

    filterData = {
      hasData: true,
      score: score,
      categoryKey: 'filtros',
      remainingKm: dispRem,
      detail: `Restan ${dispRem.toLocaleString()} ${unitLabel}`
    };
    if (score < 25) {
      filterData.alert = `Filtros requieren reemplazo cercano (restan ${dispRem.toLocaleString()} ${unitLabel}).`;
    }
  } else {
    missingItems.push({ name: 'Cambio de filtros', key: 'filtros' });
  }

  // 6. Correas
  const beltServices = services.filter(s =>
    (s.category && (s.category.toLowerCase() === 'correa' || s.category.toLowerCase() === 'correas')) ||
    (s.title && (s.title.toLowerCase().includes('correa') || s.title.toLowerCase().includes('distribucion') || s.title.toLowerCase().includes('banda')))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  let beltData = { hasData: false, score: 0, categoryKey: 'correa', detail: 'Sin historial de correas', alert: null };
  if (beltServices.length > 0) {
    const lastBelt = beltServices[0];
    const lastKm = convertToKm(lastBelt.mileage || lastBelt.km || veh.km);
    const kmUsed = Math.max(0, currentKm - lastKm);
    const kmPct = (kmUsed / cfg.beltKm) * 100;
    const monthsElapsed = calculateMonthsDiff(lastBelt.date);
    const monthPct = (monthsElapsed / cfg.beltMonths) * 100;

    const worstWear = Math.max(kmPct, monthPct);
    const score = Math.max(0, Math.min(100, Math.round(100 - worstWear)));
    const remKm = Math.max(0, cfg.beltKm - kmUsed);
    const dispRem = convertFromKm(remKm);

    beltData = {
      hasData: true,
      score: score,
      categoryKey: 'correa',
      remainingKm: dispRem,
      detail: `Uso: ${Math.round(worstWear)}% • Restan ${dispRem.toLocaleString()} ${unitLabel}`
    };
    if (score < 25) {
      beltData.alert = `Correa de distribucion supera el 75% de desgaste estimado.`;
    }
  } else {
    missingItems.push({ name: 'Revision de correas', key: 'correa' });
  }

  // 7. Documentacion
  let docScores = [];
  let docAlerts = [];
  let docDetails = [];

  if (documents.length > 0) {
    documents.forEach(doc => {
      const days = calculateDaysDiff(doc.expiryDate || doc.expirationDate || doc.fechaVencimiento);
      let statusText = 'Vigente';
      let docScore = 100;

      if (days <= 0) {
        statusText = 'Vencido';
        docScore = 0;
        docAlerts.push(`${doc.name || doc.type || 'Documento'} se encuentra VENCIDO.`);
      } else if (days <= 30) {
        statusText = `Vence en ${days} dias`;
        docScore = 50;
        docAlerts.push(`${doc.name || doc.type || 'Documento'} vence en ${days} dias.`);
      } else {
        statusText = 'Vigente';
        docScore = 100;
      }
      docScores.push(docScore);
      docDetails.push(`${doc.name || doc.type}: ${statusText}`);
    });
  }

  const hasDocsData = documents.length > 0;
  const docAvgScore = hasDocsData ? Math.round(docScores.reduce((a, b) => a + b, 0) / docScores.length) : 0;
  if (!hasDocsData) missingItems.push({ name: 'Documentacion del vehiculo', key: 'guantera' });

  const docData = {
    hasData: hasDocsData,
    score: docAvgScore,
    categoryKey: 'guantera',
    details: docDetails.length > 0 ? docDetails.join(' • ') : 'Sin documentos registrados',
    alerts: docAlerts
  };

  // 8. Recordatorios
  let dueRem = 0, upcomingRem = 0, pendingRem = 0;
  reminders.forEach(r => {
    const days = calculateDaysDiff(r.dueDate || r.date);
    if (r.status === 'completed' || r.completed) return;
    if (days < 0) dueRem++;
    else if (days <= 7) upcomingRem++;
    else pendingRem++;
  });

  // 9. Gastos
  const currentYear = new Date().getFullYear();
  let totalHistoric = 0;
  let yearTotal = 0;

  services.forEach(s => {
    const cost = Number(s.cost || s.totalCost || 0);
    totalHistoric += cost;
    if (s.date && new Date(s.date).getFullYear() === currentYear) {
      yearTotal += cost;
    }
  });

  fuels.forEach(f => {
    const cost = Number(f.cost || f.totalCost || 0);
    totalHistoric += cost;
    if (f.date && new Date(f.date).getFullYear() === currentYear) {
      yearTotal += cost;
    }
  });

  const monthlyAvg = yearTotal > 0 ? Math.round(yearTotal / Math.max(1, new Date().getMonth() + 1)) : 0;

  // RELIABILITY & SCORE CALCULATION
  const componentsList = [
    { name: 'Aceite', data: oilData, weight: cfg.weights.oil },
    { name: 'Llantas', data: tireData, weight: cfg.weights.tires },
    { name: 'Frenos', data: brakeData, weight: cfg.weights.brakes },
    { name: 'Bateria', data: batteryData, weight: cfg.weights.battery },
    { name: 'Filtros', data: filterData, weight: cfg.weights.filters },
    { name: 'Correas', data: beltData, weight: cfg.weights.belts },
    { name: 'Documentacion', data: docData, weight: cfg.weights.docs }
  ];

  const presentComponents = componentsList.filter(c => c.data.hasData);
  const confidencePct = Math.round((presentComponents.length / componentsList.length) * 100);

  let evaluatedWeightSum = 0;
  let weightedHealthSum = 0;

  if (presentComponents.length > 0) {
    presentComponents.forEach(c => {
      evaluatedWeightSum += c.weight;
      weightedHealthSum += (c.data.score * c.weight);
    });
  }

  const rawHealthPct = evaluatedWeightSum > 0 
    ? Math.round(weightedHealthSum / evaluatedWeightSum)
    : 0;

  // Summary Metrics Breakdown
  const evaluatedCount = presentComponents.length;
  const healthyCount = presentComponents.filter(c => c.data.score >= 70).length;
  const warningCount = presentComponents.filter(c => c.data.score < 70).length;
  const noDataCount = componentsList.length - presentComponents.length;

  // Confidence Levels: Low (<50%), Medium (50-70%), High (>70%)
  let overallHealthPct = null;
  let ratingLabel = 'SIN INFORMACION SUFICIENTE';
  let ratingClass = 'health-status-nodata';
  let ratingColor = '#64748b';
  let confidenceColor = '#ef4444';
  let confidenceMsg = 'No hay suficiente historial para calcular una salud confiable.';

  if (confidencePct >= 70) {
    overallHealthPct = rawHealthPct;
    confidenceColor = '#10b981';
    confidenceMsg = 'El analisis es altamente confiable porque existe suficiente historial del vehiculo.';
    if (rawHealthPct >= 95) {
      ratingLabel = 'EXCELENTE';
      ratingClass = 'health-status-excellent';
      ratingColor = '#3b82f6';
    } else if (rawHealthPct >= 85) {
      ratingLabel = 'MUY BUENO';
      ratingClass = 'health-status-verygood';
      ratingColor = '#10b981';
    } else if (rawHealthPct >= 70) {
      ratingLabel = 'BUENO';
      ratingClass = 'health-status-good';
      ratingColor = '#eab308';
    } else if (rawHealthPct >= 50) {
      ratingLabel = 'REQUIERE ATENCION';
      ratingClass = 'health-status-warning';
      ratingColor = '#f97316';
    } else {
      ratingLabel = 'CRITICO';
      ratingClass = 'health-status-critical';
      ratingColor = '#ef4444';
    }
  } else if (confidencePct >= 50) {
    overallHealthPct = rawHealthPct;
    ratingLabel = 'SALUD ESTIMADA';
    ratingClass = 'health-status-warning';
    ratingColor = '#f97316';
    confidenceColor = '#f97316';
    confidenceMsg = 'El analisis es una estimacion. Agregue mas datos para mayor precision.';
  }

  // Aggregate Smart Alerts
  const allSmartAlerts = [];
  if (oilData.alert) allSmartAlerts.push({ type: 'warning', text: oilData.alert });
  if (tireData.alert) allSmartAlerts.push({ type: 'danger', text: tireData.alert });
  if (brakeData.alert) allSmartAlerts.push({ type: 'danger', text: brakeData.alert });
  if (batteryData.alert) allSmartAlerts.push({ type: 'warning', text: batteryData.alert });
  if (filterData.alert) allSmartAlerts.push({ type: 'info', text: filterData.alert });
  if (beltData.alert) allSmartAlerts.push({ type: 'danger', text: beltData.alert });
  if (docData.alerts && docData.alerts.length > 0) {
    docData.alerts.forEach(a => allSmartAlerts.push({ type: 'warning', text: a }));
  }
  if (dueRem > 0) {
    allSmartAlerts.push({ type: 'danger', text: `Tienes ${dueRem} recordatorio(s) de servicio VENCIDOS.` });
  }

  // Maintenance Assistant Smart Answers
  let lowestComp = null;
  if (presentComponents.length > 0) {
    const sorted = [...presentComponents].sort((a, b) => a.data.score - b.data.score);
    lowestComp = sorted[0];
  }

  let firstAction = 'Todo funciona correctamente.';
  if (dueRem > 0) {
    firstAction = `Atender ${dueRem} recordatorio(s) vencido(s).`;
  } else if (lowestComp && lowestComp.data.score < 70) {
    firstAction = `Revisar ${lowestComp.name} (${lowestComp.data.score}% de vida util).`;
  } else if (oilData.hasData && oilData.remainingKm <= 1000) {
    firstAction = `Cambiar aceite pronto (restan ${oilData.remainingKm.toLocaleString()} km).`;
  } else if (missingItems.length > 0) {
    firstAction = `Registrar ${missingItems[0].name.toLowerCase()} para aumentar la confiabilidad.`;
  }

  let worstWearText = lowestComp ? `${lowestComp.name} (${lowestComp.data.score}%)` : 'Sin datos suficientes';
  let nextServiceText = 'No hay servicios inmediatos pendientes.';
  if (oilData.hasData && oilData.remainingKm > 0) {
    nextServiceText = `Cambio de aceite (${oilData.remainingKm.toLocaleString()} km restantes)`;
  } else if (dueRem > 0) {
    nextServiceText = `${dueRem} servicio(s) vencido(s) en Recordatorios`;
  }

  let docStatusSummary = docData.hasData ? (docData.alerts.length > 0 ? `${docData.alerts.length} por vencer/vencidos` : 'Todos vigentes') : 'Sin documentos registrados';
  const lastEvaluationText = getRelativeTimeString(veh.lastHealthUpdate || Date.now());

  // 10. Componentes Adicionales / Mantenimientos Específicos
  const customCategories = (appState.serviceCategories || []).filter(c => typeof c === 'object' && c !== null && (c.affectsHealth === true || String(c.affectsHealth) === 'true'));
  const customComponentsData = [];

  customCategories.forEach(cat => {
    const catNameLower = (cat.name || '').toLowerCase().trim();
    if (!catNameLower) return;

    const catServices = services.filter(s => {
      const sCat = (s.category || '').toLowerCase().trim();
      const sTitle = (s.title || '').toLowerCase().trim();
      const sNotes = (s.notes || '').toLowerCase().trim();
      return sCat === catNameLower || (sCat && catNameLower.includes(sCat)) || (sCat && sCat.includes(catNameLower)) || (sTitle && sTitle.includes(catNameLower)) || (sNotes && sNotes.includes(catNameLower));
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (catServices.length > 0) {
      const lastS = catServices[0];
      const lastKm = Number(lastS.mileage || lastS.km || currentKm);
      const kmUsed = Math.max(0, currentKm - lastKm);
      const monthsElapsed = calculateMonthsDiff(lastS.date);

      let wearKmPct = cat.recommendedIntervalKm > 0 ? (kmUsed / cat.recommendedIntervalKm) * 100 : 0;
      let wearMonthsPct = cat.recommendedIntervalMonths > 0 ? (monthsElapsed / cat.recommendedIntervalMonths) * 100 : 0;
      let wearPct = Math.max(wearKmPct, wearMonthsPct);
      let score = Math.max(0, Math.min(100, Math.round(100 - wearPct)));

      let remKm = cat.recommendedIntervalKm > 0 ? Math.max(0, cat.recommendedIntervalKm - kmUsed) : null;
      let remMonths = cat.recommendedIntervalMonths > 0 ? Math.max(0, cat.recommendedIntervalMonths - monthsElapsed) : null;

      let detailParts = [];
      if (remKm !== null) detailParts.push(`Restan ${remKm.toLocaleString()} km`);
      if (remMonths !== null) detailParts.push(`Restan ${remMonths} meses`);
      let detail = detailParts.length > 0 ? detailParts.join(' • ') : `Último: ${lastS.date || 'Reciente'}`;

      customComponentsData.push({
        id: cat.id,
        name: cat.name,
        hasData: true,
        score: score,
        detail: detail,
        lastDate: lastS.date
      });
    } else {
      let detailParts = [];
      if (cat.recommendedIntervalKm) detailParts.push(`Intervalo: ${cat.recommendedIntervalKm.toLocaleString()} km`);
      if (cat.recommendedIntervalMonths) detailParts.push(`Intervalo: ${cat.recommendedIntervalMonths} meses`);
      let detail = detailParts.length > 0 ? detailParts.join(' • ') : 'Sin historial registrado';

      customComponentsData.push({
        id: cat.id,
        name: cat.name,
        hasData: false,
        score: 0,
        detail: detail
      });
    }
  });

  return {
    veh,
    overallHealthPct,
    rawHealthPct,
    ratingLabel,
    ratingClass,
    ratingColor,
    confidencePct,
    confidenceColor,
    confidenceMsg,
    missingItems,
    evaluatedCount,
    healthyCount,
    warningCount,
    noDataCount,
    firstAction,
    worstWearText,
    nextServiceText,
    docStatusSummary,
    lastEvaluationText,
    allSmartAlerts,
    oilData,
    tireData,
    brakeData,
    batteryData,
    filterData,
    beltData,
    docData,
    customComponentsData,
    remindersSummary: { dueRem, upcomingRem, pendingRem },
    expensesSummary: { yearTotal, monthlyAvg, totalHistoric }
  };
}

function renderVehicleHealth() {
  const container = document.getElementById('healthDashboardContainer');
  if (!container) return;

  const veh = getActiveVehicle();
  if (!veh) {
    container.innerHTML = `
      <div class="health-hero-card" style="text-align:center; padding:30px 18px;">
        <h2 style="font-size:1.2rem; color:var(--text-primary); margin-bottom:8px;">No hay vehículo activo</h2>
        <p class="subtitle">Registra o selecciona un vehículo en la pestaña Garaje para visualizar la Salud del Vehículo.</p>
        <button class="btn btn-primary" onclick="switchTab('tabGarage')" style="margin-top:14px;">Ir al Garaje</button>
      </div>
    `;
    return;
  }

  const h = calculateVehicleHealth(veh);
  if (!h) return;

  // SVG Circle Stroke calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const scoreVal = h.overallHealthPct !== null ? h.overallHealthPct : 0;
  const strokeOffset = circumference - (scoreVal / 100) * circumference;

  // Render Smart Alerts Block
  let alertsHtml = '';
  if (h.allSmartAlerts.length > 0) {
    alertsHtml = `
      <div class="health-alerts-container">
        <h3 style="font-size:0.92rem; font-weight:700; margin-bottom:8px; color:var(--text-primary);">
          Alertas Inteligentes (${h.allSmartAlerts.length})
        </h3>
        ${h.allSmartAlerts.map(a => `
          <div class="health-alert-item health-alert-${a.type}">
            <span style="font-weight:700;">•</span>
            <span>${escapeHtml(a.text)}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    alertsHtml = `
      <div class="health-alerts-container">
        <div class="health-alert-item health-alert-success">
          <span><strong>Sin observaciones críticas.</strong> Todos los componentes evaluados operan dentro de parámetros normales.</span>
        </div>
      </div>
    `;
  }

  // Render Reliability Confidence Banner with Progress Bar & Actionable Tips
  let confidenceTipsHtml = '';
  if (h.missingItems.length > 0) {
    confidenceTipsHtml = `
      <div class="health-confidence-tips">
        <strong>Para aumentar la confiabilidad del análisis registra:</strong>
        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">
          ${h.missingItems.map(item => `
            <button type="button" class="btn btn-secondary btn-sm btn-quick-add" onclick="quickAddHealthService('${item.key}')" style="font-size:0.75rem; padding:4px 10px;">
              + ${escapeHtml(item.name)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- MAIN HERO SCORE CARD -->
    <div class="health-hero-card">
      <div class="health-hero-header">
        <div class="health-hero-title">
          ${escapeHtml(veh.name || 'Vehículo')} (${veh.year || ''})
        </div>
        <span style="font-size:0.8rem; color:#94a3b8; font-weight:600;">${formatVehicleDistance(veh.km, veh)}</span>
      </div>

      <div class="health-hero-body">
        <div class="health-gauge-box">
          <div class="health-circle-gauge">
            <svg class="health-circle-svg" viewBox="0 0 100 100">
              <circle class="health-circle-bg" cx="50" cy="50" r="${radius}"/>
              <circle class="health-circle-fill" cx="50" cy="50" r="${radius}" 
                style="stroke:${h.ratingColor}; stroke-dasharray:${circumference}; stroke-dashoffset:${strokeOffset};"/>
            </svg>
            <div class="health-gauge-val" style="font-size:${h.overallHealthPct !== null ? '1.35rem' : '0.9rem'};">
              ${h.overallHealthPct !== null ? h.overallHealthPct + '%' : '--%'}
            </div>
          </div>
          <span style="font-size:0.72rem; color:#94a3b8; margin-top:6px; font-weight:700; text-transform:uppercase;">Salud</span>
        </div>

        <div class="health-summary-info">
          <div class="health-status-badge ${h.ratingClass}">
            <span>${h.ratingLabel}</span>
          </div>

          <div class="health-hero-text">
            ${h.overallHealthPct === null ? 'No hay suficientes datos registrados para calcular un porcentaje de salud verídico.' : (h.allSmartAlerts.length === 0 ? 'Sin observaciones críticas detectadas.' : `Se han detectado ${h.allSmartAlerts.length} observación(es) de mantenimiento.`)}
          </div>

          <div class="health-next-service">
            <strong>Próximo servicio:</strong> ${escapeHtml(h.nextServiceText)}
          </div>

          <div style="font-size:0.74rem; color:#94a3b8; margin-top:8px; font-weight:600;">
            Última evaluación: ${escapeHtml(h.lastEvaluationText)}
          </div>
        </div>
      </div>
    </div>

    <!-- GENERAL EVALUATION SUMMARY CARDS -->
    <div class="health-summary-grid">
      <div class="health-summary-box">
        <div class="health-summary-val" style="color:#38bdf8;">${h.evaluatedCount} / 7</div>
        <div class="health-summary-lbl">Evaluados</div>
      </div>
      <div class="health-summary-box">
        <div class="health-summary-val" style="color:#34d399;">${h.healthyCount}</div>
        <div class="health-summary-lbl">Saludables</div>
      </div>
      <div class="health-summary-box">
        <div class="health-summary-val" style="color:#fb923c;">${h.warningCount}</div>
        <div class="health-summary-lbl">Advertencias</div>
      </div>
      <div class="health-summary-box">
        <div class="health-summary-val" style="color:#94a3b8;">${h.noDataCount}</div>
        <div class="health-summary-lbl">Sin Datos</div>
      </div>
    </div>

    <!-- ENHANCED CONFIDENCE INDICATOR -->
    <div class="health-confidence-banner">
      <div class="health-confidence-header">
        <div class="health-confidence-title">
          Confiabilidad del Análisis
        </div>
        <strong style="color:${h.confidenceColor}; font-size:0.95rem;">${h.confidencePct}%</strong>
      </div>
      <div class="confidence-bar-bg">
        <div class="confidence-bar-fill" style="width:${h.confidencePct}%; background:${h.confidenceColor};"></div>
      </div>
      <div style="font-size:0.78rem; color:#cbd5e1; font-weight:500;">
        ${escapeHtml(h.confidenceMsg)}
      </div>
      ${confidenceTipsHtml}
    </div>

    <!-- SMART MAINTENANCE ASSISTANT PANEL -->
    <div class="health-assistant-card">
      <h3 style="font-size:0.9rem; font-weight:800; color:var(--text-primary);">
        Diagnóstico y Recomendaciones Rápidas
      </h3>
      <div class="health-assistant-grid">
        <div class="health-assistant-item">
          <div class="health-assistant-q">¿Qué revisar primero?</div>
          <div class="health-assistant-a">${escapeHtml(h.firstAction)}</div>
        </div>
        <div class="health-assistant-item">
          <div class="health-assistant-q">Mayor desgaste</div>
          <div class="health-assistant-a">${escapeHtml(h.worstWearText)}</div>
        </div>
        <div class="health-assistant-item">
          <div class="health-assistant-q">Documentación</div>
          <div class="health-assistant-a">${escapeHtml(h.docStatusSummary)}</div>
        </div>
      </div>
    </div>

    <!-- SMART ALERTS -->
    ${alertsHtml}

    <!-- SECCIÓN 1: COMPONENTES PRINCIPALES (ESTÁNDAR) -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h3 style="font-size:0.95rem; font-weight:800; color:var(--text-primary); margin:0;">Componentes Principales</h3>
    </div>

    <div class="health-grid">
      <!-- 1. Aceite -->
      <div class="health-card ${!h.oilData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.oilData.hasData ? 'health-icon-nodata' : ''}">
              Aceite
            </div>
            <div class="health-card-score" style="color:${!h.oilData.hasData ? '#64748b' : (h.oilData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.oilData.hasData ? h.oilData.score + '%' : 'Sin historial'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.oilData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.oilData.hasData ? '100%' : h.oilData.score + '%'}; background:${!h.oilData.hasData ? '#475569' : (h.oilData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.oilData.detail)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.oilData.hasData ? 'Servicios' : 'Sin datos'}</span>
          ${h.oilData.hasData 
            ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', 'aceite')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
            : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('aceite')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar primer servicio</button>`
          }
        </div>
      </div>

      <!-- 2. Llantas -->
      <div class="health-card ${!h.tireData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.tireData.hasData ? 'health-icon-nodata' : ''}">
              Llantas
            </div>
            <div class="health-card-score" style="color:${!h.tireData.hasData ? '#64748b' : (h.tireData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.tireData.hasData ? h.tireData.score + '%' : 'Sin historial'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.tireData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.tireData.hasData ? '100%' : h.tireData.score + '%'}; background:${!h.tireData.hasData ? '#475569' : (h.tireData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.tireData.detail)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.tireData.hasData ? 'Servicios' : 'Sin datos'}</span>
          ${h.tireData.hasData 
            ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', 'llantas')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
            : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('llantas')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar primer servicio</button>`
          }
        </div>
      </div>

      <!-- 3. Frenos -->
      <div class="health-card ${!h.brakeData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.brakeData.hasData ? 'health-icon-nodata' : ''}">
              Frenos
            </div>
            <div class="health-card-score" style="color:${!h.brakeData.hasData ? '#64748b' : (h.brakeData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.brakeData.hasData ? h.brakeData.score + '%' : 'Sin historial'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.brakeData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.brakeData.hasData ? '100%' : h.brakeData.score + '%'}; background:${!h.brakeData.hasData ? '#475569' : (h.brakeData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.brakeData.detail)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.brakeData.hasData ? 'Servicios' : 'Sin datos'}</span>
          ${h.brakeData.hasData 
            ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', 'frenos')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
            : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('frenos')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar primer servicio</button>`
          }
        </div>
      </div>

      <!-- 4. Batería -->
      <div class="health-card ${!h.batteryData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.batteryData.hasData ? 'health-icon-nodata' : ''}">
              Batería
            </div>
            <div class="health-card-score" style="color:${!h.batteryData.hasData ? '#64748b' : (h.batteryData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.batteryData.hasData ? h.batteryData.score + '%' : 'Sin historial'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.batteryData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.batteryData.hasData ? '100%' : h.batteryData.score + '%'}; background:${!h.batteryData.hasData ? '#475569' : (h.batteryData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.batteryData.detail)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.batteryData.hasData ? 'Servicios' : 'Sin datos'}</span>
          ${h.batteryData.hasData 
            ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', 'bateria')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
            : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('bateria')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar primer servicio</button>`
          }
        </div>
      </div>

      <!-- 5. Filtros -->
      <div class="health-card ${!h.filterData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.filterData.hasData ? 'health-icon-nodata' : ''}">
              Filtros
            </div>
            <div class="health-card-score" style="color:${!h.filterData.hasData ? '#64748b' : (h.filterData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.filterData.hasData ? h.filterData.score + '%' : 'Sin historial'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.filterData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.filterData.hasData ? '100%' : h.filterData.score + '%'}; background:${!h.filterData.hasData ? '#475569' : (h.filterData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.filterData.detail)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.filterData.hasData ? 'Servicios' : 'Sin datos'}</span>
          ${h.filterData.hasData 
            ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', 'filtro')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
            : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('filtros')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar primer servicio</button>`
          }
        </div>
      </div>

      <!-- 6. Correas -->
      <div class="health-card ${!h.beltData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.beltData.hasData ? 'health-icon-nodata' : ''}">
              Correas
            </div>
            <div class="health-card-score" style="color:${!h.beltData.hasData ? '#64748b' : (h.beltData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.beltData.hasData ? h.beltData.score + '%' : 'Sin historial'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.beltData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.beltData.hasData ? '100%' : h.beltData.score + '%'}; background:${!h.beltData.hasData ? '#475569' : (h.beltData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.beltData.detail)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.beltData.hasData ? 'Servicios' : 'Sin datos'}</span>
          ${h.beltData.hasData 
            ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', 'correa')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
            : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('correa')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar primer servicio</button>`
          }
        </div>
      </div>

      <!-- 7. Documentación -->
      <div class="health-card ${!h.docData.hasData ? 'health-card-nodata' : ''}">
        <div>
          <div class="health-card-header">
            <div class="health-card-title ${!h.docData.hasData ? 'health-icon-nodata' : ''}">
              Documentación
            </div>
            <div class="health-card-score" style="color:${!h.docData.hasData ? '#64748b' : (h.docData.score >= 50 ? '#34d399' : '#f87171')};">
              ${h.docData.hasData ? h.docData.score + '%' : 'Sin documentos'}
            </div>
          </div>
          <div class="health-card-progress">
            <div class="health-card-progress-fill ${!h.docData.hasData ? 'health-card-progress-nodata' : ''}" style="width:${!h.docData.hasData ? '100%' : h.docData.score + '%'}; background:${!h.docData.hasData ? '#475569' : (h.docData.score >= 50 ? '#10b981' : '#ef4444')};"></div>
          </div>
          <div class="health-card-details">
            ${escapeHtml(h.docData.details)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">${h.docData.hasData ? 'Guantera' : 'Sin datos'}</span>
          <button class="btn btn-secondary btn-sm" onclick="switchTab('tabGuantera')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>
        </div>
      </div>

      <!-- Recordatorios Summary -->
      <div class="health-card">
        <div>
          <div class="health-card-header">
            <div class="health-card-title">Recordatorios</div>
            <div class="health-card-score" style="color:#38bdf8;">
              ${h.remindersSummary.dueRem > 0 ? `<span style="color:#f87171;">${h.remindersSummary.dueRem} vencido(s)</span>` : 'Al día'}
            </div>
          </div>
          <div class="health-card-details" style="margin-top:6px;">
            ${h.remindersSummary.pendingRem} pendiente(s) • ${h.remindersSummary.upcomingRem} próximo(s)
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">Alertas</span>
          <button class="btn btn-secondary btn-sm" onclick="switchTab('tabReminders')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>
        </div>
      </div>

      <!-- Gastos Summary -->
      <div class="health-card">
        <div>
          <div class="health-card-header">
            <div class="health-card-title">Gastos e Inversión</div>
            <div class="health-card-score" style="color:#38bdf8; font-size:0.9rem;">
              ${formatCurrency(h.expensesSummary.yearTotal)}
            </div>
          </div>
          <div class="health-card-details">
            Invertido este año: ${formatCurrency(h.expensesSummary.yearTotal)}<br>
            Promedio mensual: ${formatCurrency(h.expensesSummary.monthlyAvg)}<br>
            Total histórico: ${formatCurrency(h.expensesSummary.totalHistoric)}
          </div>
        </div>
        <div class="health-card-footer">
          <span style="font-size:0.75rem; color:var(--text-secondary);">Reportes</span>
          <button class="btn btn-secondary btn-sm" onclick="switchTab('tabReports')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 2: COMPONENTES ADICIONALES / MANTENIMIENTOS ESPECÍFICOS -->
    <div style="margin-top:24px; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:18px;">
      <h3 style="font-size:0.95rem; font-weight:800; color:#38bdf8; margin:0 0 2px 0;">Componentes Adicionales / Mantenimientos Específicos</h3>
      <p class="subtitle" style="font-size:0.8rem; margin:0;">Servicios personalizados configurados para participar en el análisis de salud.</p>
    </div>

    ${h.customComponentsData && h.customComponentsData.length > 0 ? `
      <div class="health-grid">
        ${h.customComponentsData.map(c => `
          <div class="health-card ${!c.hasData ? 'health-card-nodata' : ''}">
            <div>
              <div class="health-card-header">
                <div class="health-card-title ${!c.hasData ? 'health-icon-nodata' : ''}">
                  ${escapeHtml(c.name)}
                </div>
                <div class="health-card-score" style="color:${!c.hasData ? '#64748b' : (c.score >= 50 ? '#34d399' : '#f87171')};">
                  ${c.hasData ? c.score + '%' : 'Sin historial'}
                </div>
              </div>
              <div class="health-card-progress">
                <div class="health-card-progress-fill ${!c.hasData ? 'health-card-progress-nodata' : ''}" 
                     style="width:${!c.hasData ? '100%' : c.score + '%'}; background:${!c.hasData ? '#475569' : (c.score >= 50 ? '#10b981' : '#ef4444')};"></div>
              </div>
              <div class="health-card-details">
                ${escapeHtml(c.detail)}
              </div>
            </div>
            <div class="health-card-footer">
              <span style="font-size:0.75rem; color:var(--text-secondary);">${c.hasData ? 'Personalizado' : 'Sin datos'}</span>
              ${c.hasData 
                ? `<button class="btn btn-secondary btn-sm" onclick="navigateToHealthHistory('tabMaintenance', '${escapeHtml(c.name)}')" style="font-size:0.75rem; padding:4px 10px;">Ver historial</button>`
                : `<button class="btn btn-sm btn-quick-add" onclick="quickAddHealthService('${escapeHtml(c.name)}')" style="font-size:0.75rem; padding:4px 10px;">+ Registrar</button>`
              }
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:12px; padding:18px; text-align:center;">
        <p class="subtitle" style="margin:0; font-size:0.83rem;">No hay mantenimientos específicos configurados para participar en Salud. Puedes activarlos al crear o editar un servicio en la pestaña Mantenimiento (+ Crear servicio).</p>
      </div>
    `}
  `;
}

// Category Editor Helper Functions
function openServiceCategoryModal(catId = null) {
  const form = document.getElementById('formServiceCategory');
  if (form) form.reset();

  document.getElementById('catId').value = '';
  document.getElementById('modalCategoryTitle').textContent = 'Nuevo Tipo de Servicio';
  
  const affectsCheck = document.getElementById('catAffectsHealth');
  if (affectsCheck) affectsCheck.checked = false;
  toggleHealthCategoryInputs(false);

  if (catId) {
    const categories = appState.serviceCategories || [];
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      document.getElementById('modalCategoryTitle').textContent = 'Editar Tipo de Servicio';
      document.getElementById('catId').value = cat.id;
      document.getElementById('catName').value = cat.name || '';
      
      const affects = cat.affectsHealth === true;
      if (affectsCheck) affectsCheck.checked = affects;
      toggleHealthCategoryInputs(affects);

      if (document.getElementById('catIntervalKm')) document.getElementById('catIntervalKm').value = cat.recommendedIntervalKm || '';
      if (document.getElementById('catIntervalMonths')) document.getElementById('catIntervalMonths').value = cat.recommendedIntervalMonths || '';
    }
  }

  openModal('modalServiceCategory');
}

function toggleHealthCategoryInputs(checked) {
  const container = document.getElementById('catHealthFieldsContainer');
  if (container) container.style.display = checked ? 'block' : 'none';
}

/**
 * Guarda o actualiza un tipo de servicio desde el modal de configuración de salud/categorías.
 * Marca explícitamente el servicio como manual (isCustom: true).
 * @param {Event} e - Evento de envío de formulario.
 */
function saveServiceCategory(e) {
  if (e) e.preventDefault();
  const catId = document.getElementById('catId')?.value;
  const name = (document.getElementById('catName')?.value || '').trim();
  if (!name) return;

  const affectsHealth = document.getElementById('catAffectsHealth')?.checked || false;
  const intervalKm = Number(document.getElementById('catIntervalKm')?.value) || 0;
  const intervalMonths = Number(document.getElementById('catIntervalMonths')?.value) || 0;

  if (!appState.serviceCategories) appState.serviceCategories = [];

  if (!SERVICE_CATEGORIES.includes(name)) {
    SERVICE_CATEGORIES.push(name);
  }

  if (catId) {
    const idx = appState.serviceCategories.findIndex(c => c.id === catId);
    if (idx !== -1) {
      appState.serviceCategories[idx] = {
        ...appState.serviceCategories[idx],
        name,
        affectsHealth,
        recommendedIntervalKm: intervalKm,
        recommendedIntervalMonths: intervalMonths,
        isCustom: true
      };
    }
  } else {
    const newCat = {
      id: 'cat_custom_' + Date.now(),
      name,
      affectsHealth,
      recommendedIntervalKm: intervalKm,
      recommendedIntervalMonths: intervalMonths,
      isCustom: true
    };
    appState.serviceCategories.push(newCat);
  }

  saveState();
  closeModal('modalServiceCategory');
  populateServCategorySelect();
  renderCustomCategoriesList();
  if (typeof renderVehicleHealth === 'function') renderVehicleHealth();
}




/**
 * Genera el reporte técnico con la selección de filtro de mes actual
 * y desencadena la descarga directa en formato PDF.
 */
function downloadReportPDFDirect() {
  generateCertifiedReport();
  if (typeof downloadReportPDF === 'function') {
    downloadReportPDF();
  } else if (typeof window.print === 'function') {
    window.print();
  }
}

function createManualBackup() {
  try {
    const xmlStr = objectToXML(appState);
    const now = new Date();
    const backupItem = {
      id: 'bk_' + Date.now(),
      filename: `GarageOne_Backup_${now.toISOString().substring(0,10)}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.xml`,
      date: now.toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }),
      timestamp: Date.now(),
      sizeKb: Math.round(xmlStr.length / 1024) || 1,
      type: 'manual',
      xmlData: xmlStr
    };

    appState.backupHistory = [backupItem, ...(appState.backupHistory || [])].slice(0, 3);
    saveState();
    renderBackupHistory();

    const status = document.getElementById('backupStatus');
    if (status) status.textContent = 'Respaldo generado y guardado en el historial.';
  } catch (e) {
    console.error('Error al generar respaldo manual:', e);
  }
}

function renderBackupHistory() {
  const container = document.getElementById('backupHistory');
  if (!container) return;

  const history = appState.backupHistory || [];
  if (history.length === 0) {
    container.innerHTML = `<div style="font-size:0.78rem; color:var(--text-secondary); text-align:center; padding:8px;">No hay respaldos en el historial.</div>`;
    return;
  }

  container.innerHTML = history.map(item => `
    <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div style="flex:1; overflow:hidden;">
        <div style="font-size:0.83rem; font-weight:700; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(item.filename)}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${item.date} • ${item.sizeKb} KB ${item.type === 'auto' ? '• Auto' : ''}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 8px; font-size:0.75rem;" onclick="downloadBackupItem('${item.id}')">Descargar</button>
        <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 8px; font-size:0.75rem; color:#ff453a; border-color:rgba(255,69,58,0.3);" onclick="deleteBackupItem('${item.id}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function downloadBackupItem(id) {
  const item = (appState.backupHistory || []).find(b => b.id === id);
  if (!item || !item.xmlData) return;
  const blob = new Blob([item.xmlData], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", url);
  dlAnchorElem.setAttribute("download", item.filename);
  document.body.appendChild(dlAnchorElem);
  dlAnchorElem.click();
  dlAnchorElem.remove();
  URL.revokeObjectURL(url);
}

function deleteBackupItem(id) {
  if (confirm('¿Eliminar este respaldo del historial?')) {
    appState.backupHistory = (appState.backupHistory || []).filter(b => b.id !== id);
    saveState();
    renderBackupHistory();
  }
}

function saveBackupFrequency(freq) {
  appState.backupFrequency = freq;
  saveState();
  if (freq !== 'off') {
    checkAndTriggerAutoBackup(true);
  }
}

function checkAndTriggerAutoBackup(forceCheck = false) {
  const freq = appState.backupFrequency || 'off';
  if (freq === 'off') return;

  const now = Date.now();
  const lastTime = appState.lastAutoBackupTimestamp || 0;
  let intervalMs = 86400000; // daily
  if (freq === 'weekly') intervalMs = 604800000;
  if (freq === 'monthly') intervalMs = 2592000000;

  if (now - lastTime >= intervalMs || (forceCheck && (now - lastTime >= intervalMs))) {
    const xmlStr = objectToXML(appState);
    const nowDate = new Date();
    const backupItem = {
      id: 'bk_' + now,
      filename: `GarageOne_AutoBackup_${nowDate.toISOString().substring(0,10)}_${String(nowDate.getHours()).padStart(2,'0')}${String(nowDate.getMinutes()).padStart(2,'0')}.xml`,
      date: nowDate.toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }),
      timestamp: now,
      sizeKb: Math.round(xmlStr.length / 1024) || 1,
      type: 'auto',
      xmlData: xmlStr
    };

    appState.backupHistory = [backupItem, ...(appState.backupHistory || [])].slice(0, 3);
    appState.lastAutoBackupTimestamp = now;
    saveState();
    renderBackupHistory();
  }
}

function importBackupXml(e) {
  const file = e.target && e.target.files ? e.target.files[0] : null;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const xmlStr = evt.target.result;
      const parsedData = xmlToObject(xmlStr);
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Archivo XML no válido');
      }
      if (confirm('¿Deseas restaurar los datos desde este archivo XML? Se actualizará la información del sistema.')) {
        if (parsedData.vehicles && Array.isArray(parsedData.vehicles)) appState.vehicles = parsedData.vehicles;
        if (parsedData.services && Array.isArray(parsedData.services)) appState.services = parsedData.services;
        if (parsedData.fuels && Array.isArray(parsedData.fuels)) appState.fuels = parsedData.fuels;
        if (parsedData.documents && Array.isArray(parsedData.documents)) appState.documents = parsedData.documents;
        if (parsedData.reminders && Array.isArray(parsedData.reminders)) appState.reminders = parsedData.reminders;
        if (parsedData.serviceCategories && Array.isArray(parsedData.serviceCategories)) appState.serviceCategories = parsedData.serviceCategories;
        if (parsedData.backupHistory && Array.isArray(parsedData.backupHistory)) appState.backupHistory = parsedData.backupHistory;
        if (parsedData.activeVehicleId) appState.activeVehicleId = parsedData.activeVehicleId;
        saveState();
        await loadAppStateFromDB();
        renderApp();
        renderBackupHistory();
        alert('Respaldo XML restaurado con éxito.');
      }
    } catch (err) {
      alert('Error al importar el respaldo XML: ' + err.message);
    }
  };
  reader.readAsText(file);
}