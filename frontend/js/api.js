// js/api.js
// Centralised API client — all fetch calls go through here

const API_BASE = 'http://127.0.0.1:5000/api';

// ─── Auth helpers ────────────────────────────────────────
const getToken = () => localStorage.getItem('mb_token');
const getUser  = () => { try { return JSON.parse(localStorage.getItem('mb_user')); } catch { return null; } };
const setAuth  = (token, user) => { localStorage.setItem('mb_token', token); localStorage.setItem('mb_user', JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem('mb_token'); localStorage.removeItem('mb_user'); };

// ─── Core fetch wrapper ──────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const data = await res.json();

  if (!res.ok) {
    // Token expired → force logout only if user already has a token
    if (res.status === 401 && token) { clearAuth(); window.location.href = '/'; }
    throw new Error(data.message || 'An error occurred');
  }

  return data;
}

// ─── Auth ────────────────────────────────────────────────
const API = {
  auth: {
    signup: (body) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login:  (body) => apiFetch('/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
    profile: ()    => apiFetch('/auth/profile'),
    updateProfile: (body) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
    changePassword:(body) => apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
  },
  movies: {
    getAll:   (params = {}) => apiFetch('/movies?' + new URLSearchParams(params)),
    getById:  (id)          => apiFetch(`/movies/${id}`),
    getGenres: ()           => apiFetch('/movies/genres'),
  },
  shows: {
    byMovie: (movieId, params = {}) => apiFetch(`/shows/movie/${movieId}?` + new URLSearchParams(params)),
    seats:   (showId)               => apiFetch(`/shows/${showId}/seats`),
  },
  bookings: {
    initiate:   (body) => apiFetch('/bookings/initiate', { method: 'POST', body: JSON.stringify(body) }),
    pay:        (bookingDbId, body) => apiFetch(`/bookings/${bookingDbId}/pay`, { method: 'POST', body: JSON.stringify(body) }),
    createOrder: (bookingDbId) => apiFetch(`/bookings/${bookingDbId}/create-order`, { method: 'POST' }),
    verifyPayment: (bookingDbId, body) => apiFetch(`/bookings/${bookingDbId}/verify-payment`, { method: 'POST', body: JSON.stringify(body) }),
    cancel:     (id)   => apiFetch(`/bookings/${id}/cancel`, { method: 'PUT' }),
    getById:    (id)   => apiFetch(`/bookings/${id}`),
    getMyBookings: () => apiFetch('/bookings/my'),
    downloadReceiptPDF: (id) => `${API_BASE}/bookings/${id}/receipt-pdf`,
  },
  admin: {
    dashboard: ()    => apiFetch('/admin/dashboard'),
    // Movies
    getMovies: ()    => apiFetch('/admin/movies'),
    createMovie:(body) => apiFetch('/admin/movies', { method: 'POST', body: JSON.stringify(body) }),
    updateMovie:(id, body) => apiFetch(`/admin/movies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteMovie:(id) => apiFetch(`/admin/movies/${id}`, { method: 'DELETE' }),
    // Shows
    getShows:  ()    => apiFetch('/admin/shows'),
    createShow:(body) => apiFetch('/admin/shows', { method: 'POST', body: JSON.stringify(body) }),
    updateShow:(id, body) => apiFetch(`/admin/shows/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteShow:(id)  => apiFetch(`/admin/shows/${id}`, { method: 'DELETE' }),
    // Bookings
    getBookings: () => apiFetch('/admin/bookings'),
  }
};

// ─── Toast notifications ─────────────────────────────────
function showToast(type, title, msg = '') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '💬'}</span>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Modal helpers ───────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('hidden'); document.body.style.overflow = ''; }
}
function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
  document.body.style.overflow = '';
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) closeAllModals();
});

// ─── Misc utils ──────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}
function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
}
function formatCurrency(amount) {
  return '₹' + parseFloat(amount).toLocaleString('en-IN');
}
function formatRating(r) {
  return r ? `⭐ ${parseFloat(r).toFixed(1)}` : '—';
}
function formatDuration(mins) {
  if (!mins) return '—';
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}
function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
}

// Dark mode
function toggleDarkMode() {
  document.body.classList.toggle('light');
  localStorage.setItem('mb_theme', document.body.classList.contains('light') ? 'light' : 'dark');
}
function loadTheme() {
  if (localStorage.getItem('mb_theme') === 'light') document.body.classList.add('light');
}

// Download ticket as HTML (print-friendly)
function downloadTicket(booking) {
  const html = `
<!DOCTYPE html><html><head><title>Ticket — ${booking.bookingId}</title>
<style>body{font-family:Georgia,serif;background:#fff;color:#111;padding:40px;max-width:500px;margin:0 auto;}
h1{font-size:28px;margin-bottom:4px;} .sub{color:#888;font-size:13px;}
.divider{border:none;border-top:2px dashed #ccc;margin:20px 0;}
table{width:100%;border-collapse:collapse;} td{padding:10px 0;border-bottom:1px solid #eee;}
td:last-child{text-align:right;font-weight:bold;} .total{font-size:18px;color:#c00;}
@media print{body{padding:0;}}</style></head>
<body>
<h1>🎬 MovieBook</h1><p class="sub">Official Booking Confirmation</p>
<hr class="divider">
<table>
<tr><td>Booking ID</td><td>${booking.bookingId}</td></tr>
<tr><td>Movie</td><td>${booking.show?.movie?.title || '—'}</td></tr>
<tr><td>Date</td><td>${formatDate(booking.show?.date)}</td></tr>
<tr><td>Time</td><td>${formatTime(booking.show?.showTime)}</td></tr>
<tr><td>Hall</td><td>${booking.show?.hall || '—'}</td></tr>
<tr><td>Seats</td><td>${(booking.seats || []).map(s => s.seatNumber).join(', ')}</td></tr>
<tr><td class="total">Total Paid</td><td class="total">${formatCurrency(booking.totalPrice)}</td></tr>
</table>
<hr class="divider">
<p style="font-size:12px;color:#888;">Transaction: ${booking.payment?.transactionId || '—'} · Enjoy the show!</p>
<script>window.print();</script>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}