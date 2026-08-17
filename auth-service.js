/**
 * GarageOne - AuthService
 * Single-point offline-first local authentication manager.
 * Stores user profiles natively in LocalDB (IndexedDB) and localStorage.
 */

const DEFAULT_PERMISSIONS = {
  tabGarage: true,
  tabMaintenance: true,
  tabFuel: true,
  tabGuantera: true,
  tabAI: true,
  tabReports: true,
  tabSettings: true,
  canManageUsers: true
};

class AuthServiceEngine {
  constructor() {
    this.currentUser = null;
    this.session = null;
    this.cloudSessionActive = false;
    this.passwordRecoveryActive = false;
    this.emailConfirmationActive = false;
    this.onAuthChangedCallbacks = [];
  }

  async init() {
    try {
      await LocalDB.init();
      let storedUserRaw = localStorage.getItem('GARAGEONE_ACTIVE_USER') || localStorage.getItem('GARAGEONE_USER');
      if (storedUserRaw) {
        try {
          this.currentUser = JSON.parse(storedUserRaw);
        } catch (e) {
          this.currentUser = null;
        }
      }

      if (!this.currentUser) {
        const users = await LocalDB.getAll(STORES.USERS);
        if (users && users.length > 0) {
          this.currentUser = users[0];
          localStorage.setItem('GARAGEONE_ACTIVE_USER', JSON.stringify(this.currentUser));
        }
      }
    } catch (e) {
      console.error('[AuthService] Error inicializando sesión local:', e);
    }
  }

  onAuthChanged(cb) {
    if (typeof cb === 'function') {
      this.onAuthChangedCallbacks.push(cb);
    }
  }

  notifyAuthChanged() {
    this.onAuthChangedCallbacks.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }

  isAuthenticated() {
    let isSessionActive = false;
    try {
      isSessionActive = (sessionStorage.getItem('GARAGEONE_SESSION_AUTHENTICATED') === 'true') ||
                        (localStorage.getItem('GARAGEONE_SESSION_AUTHENTICATED') === 'true');
    } catch (e) {}
    return isSessionActive && this.currentUser !== null;
  }

  setSessionAuthenticated(active = true) {
    try {
      if (active) {
        sessionStorage.setItem('GARAGEONE_SESSION_AUTHENTICATED', 'true');
        localStorage.setItem('GARAGEONE_SESSION_AUTHENTICATED', 'true');
      } else {
        sessionStorage.removeItem('GARAGEONE_SESSION_AUTHENTICATED');
        localStorage.removeItem('GARAGEONE_SESSION_AUTHENTICATED');
      }
    } catch (e) {}
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isPasswordRecoveryActive() {
    return this.passwordRecoveryActive;
  }

  isEmailConfirmationActive() {
    return this.emailConfirmationActive;
  }

  hasCloudSession() {
    return false;
  }

  async login(emailOrUser, password) {
    if (!emailOrUser) throw new Error('Ingresa tu correo o nombre de usuario.');
    const users = await LocalDB.getAll(STORES.USERS);
    const cleanQuery = String(emailOrUser).trim().toLowerCase();
    
    let matchedUser = users.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanQuery) ||
      (u.username && u.username.trim().toLowerCase() === cleanQuery)
    );

    if (!matchedUser) {
      throw new Error('El usuario o correo ingresado no está registrado.');
    }

    if (password && matchedUser.password && matchedUser.password !== password) {
      throw new Error('La contraseña ingresada no es correcta.');
    }

    this.currentUser = matchedUser;
    this.setSessionAuthenticated(true);
    try {
      localStorage.setItem('GARAGEONE_ACTIVE_USER', JSON.stringify(matchedUser));
      localStorage.setItem('GARAGEONE_USER', JSON.stringify(matchedUser));
    } catch (e) {}
    this.notifyAuthChanged();
    return this.currentUser;
  }

  async register(emailOrUser, password, userData = {}) {
    if (!emailOrUser) throw new Error('Ingresa un nombre de usuario o correo válido.');

    const users = await LocalDB.getAll(STORES.USERS);
    const rawInput = String(emailOrUser).trim().toLowerCase();

    const targetEmail = (userData.email || (rawInput.includes('@') ? rawInput : `${rawInput}@garageone.local`)).trim().toLowerCase();
    const targetUsername = (userData.username || (rawInput.includes('@') ? rawInput.split('@')[0] : rawInput)).trim().toLowerCase();

    // Validar duplicidad estricta de correo y nombre de usuario
    const existingEmail = users.find(u => u.email && u.email.trim().toLowerCase() === targetEmail);
    if (existingEmail) {
      throw new Error('El correo electrónico ya está registrado. Utiliza un correo diferente.');
    }

    const existingUsername = users.find(u => u.username && u.username.trim().toLowerCase() === targetUsername);
    if (existingUsername) {
      throw new Error('El nombre de usuario ya está registrado. Elige un nombre de usuario diferente.');
    }

    const newUser = {
      id: LocalDB.generateUUID(),
      email: targetEmail,
      username: targetUsername,
      name: userData.name || targetUsername,
      password: password || '',
      role: userData.role || 'estandar',
      permissions: DEFAULT_PERMISSIONS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await LocalDB.put(STORES.USERS, newUser);
    this.currentUser = newUser;
    this.setSessionAuthenticated(true);
    try {
      localStorage.setItem('GARAGEONE_ACTIVE_USER', JSON.stringify(newUser));
      localStorage.setItem('GARAGEONE_USER', JSON.stringify(newUser));
    } catch (e) {}
    this.notifyAuthChanged();
    return this.currentUser;
  }

  async logout() {
    this.currentUser = null;
    this.setSessionAuthenticated(false);
    try {
      localStorage.removeItem('GARAGEONE_ACTIVE_USER');
      localStorage.removeItem('GARAGEONE_USER');
    } catch (e) {}
    this.notifyAuthChanged();
    return true;
  }

  async resetPasswordLocal(emailOrUser, newPassword) {
    if (!emailOrUser) throw new Error('Ingresa un usuario o correo válido.');
    if (!newPassword || newPassword.length < 4) throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
    
    const users = await LocalDB.getAll(STORES.USERS);
    const cleanQuery = String(emailOrUser).trim().toLowerCase();

    let matchedUser = users.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanQuery) ||
      (u.username && u.username.trim().toLowerCase() === cleanQuery)
    );

    if (!matchedUser) {
      throw new Error('No se encontró ninguna cuenta registrada con este nombre o correo.');
    }

    matchedUser.password = newPassword;
    matchedUser.updatedAt = new Date().toISOString();
    await LocalDB.put(STORES.USERS, matchedUser);
    return matchedUser;
  }

  async updatePassword(password) {
    if (!password) throw new Error('Ingresa una contraseña válida.');
    if (this.currentUser) {
      this.currentUser.password = password;
      this.currentUser.updatedAt = new Date().toISOString();
      await LocalDB.put(STORES.USERS, this.currentUser);
      try {
        localStorage.setItem('GARAGEONE_ACTIVE_USER', JSON.stringify(this.currentUser));
      } catch (e) {}
    }
    this.passwordRecoveryActive = false;
    return true;
  }
}

// Global Singleton Instance
window.AuthService = new AuthServiceEngine();
