/**
 * TravelOne Helpers & Utility Functions - Costa Rica Edition 🇨🇷
 */

// Format Currency (Default symbol ₡ CRC)
export function formatMoney(amount, currencySymbol = '₡') {
  const num = parseFloat(amount) || 0;
  // If currency symbol is CRC or ₡, use ₡ prefix
  const symbol = (currencySymbol === 'CRC' || currencySymbol === '₡') ? '₡' : currencySymbol;
  return `${symbol} ${num.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Format Date (e.g. "15 de noviembre, 2026")
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Format Short Date (e.g. "15 nov")
export function formatShortDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });
}

// Calculate Days Left Countdown
export function calculateDaysLeft(startDateString) {
  if (!startDateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(startDateString + 'T00:00:00');
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate Trip Duration in Days
export function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Convert File to Base64 Data URL
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Escape HTML for Safety
export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Category Badge Color Utilities
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

// Toast Notification
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
