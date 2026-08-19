/**
 * TravelOne Helpers & Utility Functions
 * Provides formatting for currencies, localized dates, countdowns, Base64 converters,
 * HTML sanitization, and lightweight UI toast notifications.
 * 
 * @module js/utils
 */

/**
 * Format a numeric amount into a localized currency string.
 * Defaults to Costa Rican Colón (₡) or custom currency symbols.
 * 
 * @param {number|string} amount - Numeric value to format
 * @param {string} [currencySymbol='₡'] - Currency ISO code or symbol (e.g. 'CRC', 'USD', '$')
 * @returns {string} Formatted currency string (e.g. '₡ 15,000.00' or '$ 120.00')
 */
export function formatMoney(amount, currencySymbol = '₡') {
  const num = parseFloat(amount) || 0;
  const symbol = (currencySymbol === 'CRC' || currencySymbol === '₡') ? '₡' : currencySymbol;
  return `${symbol} ${num.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) into a localized full Spanish date.
 * 
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted full date (e.g. "15 de noviembre de 2026")
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Format an ISO date string into an abbreviated day and month format.
 * 
 * @param {string} dateString - ISO date string
 * @returns {string} Abbreviated date string (e.g. "15 nov")
 */
export function formatShortDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
}

/**
 * Calculate the number of days remaining until a trip's start date.
 * 
 * @param {string} startDateString - ISO start date (YYYY-MM-DD)
 * @returns {number} Days remaining (positive = future, 0 = today, negative = past)
 */
export function calculateDaysLeft(startDateString) {
  if (!startDateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(startDateString + 'T00:00:00');
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the total duration of a trip in days (inclusive of start and end day).
 * 
 * @param {string} startDate - ISO start date
 * @param {string} endDate - ISO end date
 * @returns {number} Number of days
 */
export function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Convert a File object or Blob to a Base64 encoded Data URL string for local storage.
 * 
 * @param {File|Blob} file - Uploaded file instance
 * @returns {Promise<string>} Base64 Data URL
 */
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Escape HTML special characters to prevent cross-site scripting (XSS).
 * 
 * @param {*} str - Raw input string
 * @returns {string} Sanitized HTML safe string
 */
export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get standard CSS badge class for a given travel category.
 * 
 * @param {string} category - Category name
 * @returns {string} CSS class name
 */
export function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('transporte') || cat.includes('vuelo') || cat.includes('autobús')) return 'badge-transport';
  if (cat.includes('comida') || cat.includes('aliment') || cat.includes('restaurante')) return 'badge-food';
  if (cat.includes('turismo') || cat.includes('atracc') || cat.includes('tour') || cat.includes('museo')) return 'badge-tourism';
  if (cat.includes('compras') || cat.includes('souvenir')) return 'badge-shopping';
  if (cat.includes('hotel')) return 'badge-hotel';
  if (cat.includes('trabajo')) return 'badge-work';
  return 'badge-default';
}

/**
 * Display a temporary floating toast notification to the user.
 * 
 * @param {string} message - Notification text
 * @param {('success'|'error'|'info')} [type='success'] - Notification style type
 */
export function showToast(message, type = 'success') {
  let toast = document.getElementById('travelone-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'travelone-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.className = `toast toast-${type} toast-show`;
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;

  setTimeout(() => {
    toast.className = toast.className.replace('toast-show', '');
  }, 3000);
}

