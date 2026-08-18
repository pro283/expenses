// Auth state observer
auth.onAuthStateChanged(user => {
  if (user) {
    window.currentUser = user;
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
      window.location.href = 'dashboard.html';
    }
  } else {
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }
});

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatPKR(amount) {
  return 'PKR ' + new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMonthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function getUserMonthRef(uid, monthKey) {
  return database.ref(`users/${uid}/months/${monthKey}`);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
