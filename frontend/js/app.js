// js/app.js
// Core app: navbar rendering, auth modals, router, page init

// ─── Init on DOM ready ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  renderNavbar();
  const page = document.body.dataset.page;
  if (page === 'home')     initHomePage();
  if (page === 'movie')    initMoviePage();
  if (page === 'booking')  initBookingPage();
  if (page === 'payment')  initPaymentPage();
  if (page === 'profile')  initProfilePage();
  if (page === 'admin')    initAdminPage();
  if (page === 'confirmation') initConfirmationPage();
});

// ─── NAVBAR ─────────────────────────────────────────────
function renderNavbar() {
  const user = getUser();
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const isAdmin = user?.role === 'admin';
  const currentPage = document.body.dataset.page;

  navbar.innerHTML = `
    <div class="container">
      <a href="index.html" class="nav-logo">Movie<span>Book</span><span class="dot">.</span></a>
      <ul class="nav-links" id="nav-links">
        <li><a href="index.html" class="${currentPage==='home'?'active':''}">Movies</a></li>
        ${user ? `<li><a href="profile.html" class="${currentPage==='profile'?'active':''}">My Tickets</a></li>` : ''}
        ${isAdmin ? `<li><a href="admin.html" class="${currentPage==='admin'?'active':''}">Admin</a></li>` : ''}
      </ul>
      <div class="nav-actions">
        <button class="btn btn-ghost btn-sm" onclick="toggleDarkMode()" title="Toggle theme">🌙</button>
        ${user
          ? `<div class="nav-user" onclick="window.location.href='profile.html'">
               <div class="nav-avatar">${getInitials(user.name)}</div>
               <span class="nav-user-name">${user.name.split(' ')[0]}</span>
             </div>
             <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>`
          : `<button class="btn btn-secondary btn-sm" onclick="openModal('modal-login')">Login</button>
             <button class="btn btn-primary btn-sm" onclick="openModal('modal-signup')">Sign Up</button>`
        }
        <button class="hamburger" onclick="toggleMenu()" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;
}

function toggleMenu() {
  document.getElementById('nav-links')?.classList.toggle('open');
}

function logout() {
  clearAuth();
  showToast('info', 'Logged out', 'See you next time!');
  setTimeout(() => window.location.href = 'index.html', 800);
}

// ─── AUTH MODALS ─────────────────────────────────────────
function renderAuthModals() {
  const existing = document.getElementById('modal-login');
  if (existing) return; // already mounted

  document.body.insertAdjacentHTML('beforeend', `
  <!-- Login Modal -->
  <div id="modal-login" class="modal-backdrop hidden">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Welcome back</h2>
        <button class="modal-close" onclick="closeModal('modal-login')">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input id="login-email" type="email" class="form-input" placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="login-password" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password">
        </div>
        <div id="login-error" class="form-error hidden"></div>
        <button id="login-btn" class="btn btn-primary btn-full mt-16" onclick="handleLogin()">
          Sign In
        </button>
        <p class="text-center mt-16" style="color:var(--text-3);font-size:0.85rem;">
          Don't have an account? 
          <button class="btn btn-ghost btn-sm" onclick="closeModal('modal-login');openModal('modal-signup')">Sign Up</button>
        </p>
      </div>
    </div>
  </div>

  <!-- Signup Modal -->
  <div id="modal-signup" class="modal-backdrop hidden">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Create account</h2>
        <button class="modal-close" onclick="closeModal('modal-signup')">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input id="signup-name" type="text" class="form-input" placeholder="Your name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input id="signup-email" type="email" class="form-input" placeholder="you@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="signup-password" type="password" class="form-input" placeholder="Min 6 characters">
        </div>
        <div id="signup-error" class="form-error hidden"></div>
        <button id="signup-btn" class="btn btn-primary btn-full mt-16" onclick="handleSignup()">
          Create Account
        </button>
        <p class="text-center mt-16" style="color:var(--text-3);font-size:0.85rem;">
          Already have an account? 
          <button class="btn btn-ghost btn-sm" onclick="closeModal('modal-signup');openModal('modal-login')">Login</button>
        </p>
      </div>
    </div>
  </div>
  `);
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.classList.add('hidden');
  if (!email || !password) { errEl.textContent = 'Email and password required.'; errEl.classList.remove('hidden'); return; }

  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    const data = await API.auth.login({ email, password });
    setAuth(data.token, data.user);
    closeAllModals();
    showToast('success', 'Welcome back!', data.user.name);
    setTimeout(() => {
      renderNavbar();
      if (data.user.role === 'admin') window.location.href = 'admin.html';
    }, 500);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function handleSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('signup-error');
  const btn      = document.getElementById('signup-btn');

  errEl.classList.add('hidden');
  if (!name || !email || !password) { errEl.textContent = 'All fields are required.'; errEl.classList.remove('hidden'); return; }
  if (password.length < 6)           { errEl.textContent = 'Password must be at least 6 chars.'; errEl.classList.remove('hidden'); return; }

  btn.textContent = 'Creating…'; btn.disabled = true;
  try {
    const data = await API.auth.signup({ name, email, password });
    setAuth(data.token, data.user);
    closeAllModals();
    showToast('success', 'Account created!', 'Welcome to MovieBook');
    setTimeout(renderNavbar, 500);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Create Account'; btn.disabled = false;
  }
}

// ─── HOME PAGE ──────────────────────────────────────────
async function initHomePage() {
  renderAuthModals();

  let genres = [];
  let activeGenre = '';
  let activeLang  = '';
  let searchQuery = '';

  // Hero search
  const searchInput = document.getElementById('hero-search');
  const searchBtn   = document.getElementById('hero-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', () => { searchQuery = searchInput.value.trim(); loadMovies(); });
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { searchQuery = searchInput.value.trim(); loadMovies(); }});

  // Load genres for filter
  try {
    const res = await API.movies.getGenres();
    genres = res.data || [];
    renderFilters();
  } catch (e) {}

  function renderFilters() {
    const bar = document.getElementById('filter-bar');
    if (!bar) return;
    const langs = ['English', 'Hindi', 'Telugu', 'Tamil', 'Malayalam'];
    bar.innerHTML = `
      <button class="filter-chip ${!activeGenre?'active':''}" onclick="setGenre('')">All</button>
      ${genres.map(g => `<button class="filter-chip ${activeGenre===g?'active':''}" onclick="setGenre('${g}')">${g}</button>`).join('')}
      <div class="divider" style="width:1px;height:24px;margin:0 4px;"></div>
      ${langs.map(l => `<button class="filter-chip ${activeLang===l?'active':''}" onclick="setLang('${l}')">${l}</button>`).join('')}
    `;
  }

  window.setGenre = (g) => { activeGenre = g; renderFilters(); loadMovies(); };
  window.setLang  = (l) => { activeLang  = (activeLang===l)?'':l; renderFilters(); loadMovies(); };

  async function loadMovies() {
    const grid = document.getElementById('movies-grid');
    if (!grid) return;
    grid.innerHTML = `<div class="loading-page"><div class="spinner"></div><p>Loading movies…</p></div>`;

    try {
      const params = { limit: 24 };
      if (searchQuery) params.search = searchQuery;
      if (activeGenre) params.genre = activeGenre;
      if (activeLang)  params.language = activeLang;

      const res = await API.movies.getAll(params);
      const movies = res.data.movies;

      if (!movies.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🎬</div>
          <h3>No movies found</h3>
          <p>Try a different search or filter</p>
        </div>`;
        return;
      }

      grid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.location.href='movie.html?id=${movie.id}'">
          ${movie.posterUrl
            ? `<img class="movie-poster" src="${movie.posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''
          }
          <div class="movie-poster-placeholder" ${movie.posterUrl?'style="display:none"':''}>🎬</div>
          <div class="movie-overlay">
            <button class="btn btn-primary btn-sm">Book Tickets</button>
          </div>
          <div class="movie-info">
            <div class="movie-title">${movie.title}</div>
            <div class="movie-meta">
              <span class="movie-rating">${formatRating(movie.rating)}</span>
              <span class="movie-duration">${formatDuration(movie.duration)}</span>
              <span class="movie-lang">${movie.language}</span>
            </div>
            ${movie.genre ? `<div class="movie-genre">${movie.genre}</div>` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Failed to load movies. Is the backend running?</p></div>`;
    }
  }

  loadMovies();
}

// ─── MOVIE DETAIL PAGE ──────────────────────────────────
async function initMoviePage() {
  renderAuthModals();

  const params  = new URLSearchParams(window.location.search);
  const movieId = params.get('id');
  if (!movieId) { window.location.href = 'index.html'; return; }

  const content = document.getElementById('movie-content');
  if (!content) return;
  content.innerHTML = `<div class="loading-page"><div class="spinner"></div><p>Loading…</p></div>`;

  let selectedShowId = null;
  let selectedDate = new Date().toISOString().split('T')[0];

  try {
    const res = await API.movies.getById(movieId);
    const movie = res.data;

    // Render movie detail
    content.innerHTML = `
      <div class="movie-detail-hero" style="background:linear-gradient(to right, var(--bg) 40%, transparent),url(${movie.posterUrl||''}) center/cover no-repeat;min-height:360px;display:flex;align-items:center;padding:60px 0;margin-bottom:48px;">
        <div class="container" style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">
          <img src="${movie.posterUrl||''}" alt="${movie.title}" style="width:200px;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.7);flex-shrink:0;" onerror="this.style.display='none'">
          <div>
            <div class="badge badge-red mb-16">${movie.genre || 'Movie'}</div>
            <h1 style="font-size:clamp(1.8rem,4vw,3rem);margin-bottom:12px;">${movie.title}</h1>
            <div class="flex gap-16 mb-16" style="flex-wrap:wrap;">
              <span class="movie-rating" style="font-size:1rem;">${formatRating(movie.rating)}</span>
              <span style="color:var(--text-2);">${formatDuration(movie.duration)}</span>
              <span class="badge badge-gray">${movie.language}</span>
              ${movie.releaseDate ? `<span style="color:var(--text-3);font-size:0.85rem;">Released ${formatDate(movie.releaseDate)}</span>` : ''}
            </div>
            ${movie.description ? `<p style="color:var(--text-2);max-width:600px;margin-bottom:16px;">${movie.description}</p>` : ''}
            ${movie.cast?.length ? `<div style="color:var(--text-3);font-size:0.85rem;"><strong style="color:var(--text-2);">Cast:</strong> ${movie.cast.join(', ')}</div>` : ''}
            <div class="mt-16" style="color:var(--gold);font-size:1.1rem;font-weight:700;">Tickets from ${formatCurrency(movie.ticketPrice)}</div>
          </div>
        </div>
      </div>

      <div class="container">
        <h2 class="section-title mb-16">Select Show</h2>

        <!-- Date selector -->
        <div id="date-tabs" class="flex gap-8 mb-24" style="overflow-x:auto;padding-bottom:4px;"></div>

        <!-- Shows grid -->
        <div id="shows-container"></div>

        <div class="flex mt-24" style="justify-content:flex-end;">
          <button id="btn-select-seats" class="btn btn-primary btn-lg" disabled onclick="goToSeats()">
            Select Seats →
          </button>
        </div>
      </div>
    `;

    // Render date tabs (next 7 days)
    const dateTabs = document.getElementById('date-tabs');
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    dateTabs.innerHTML = days.map(d => {
      const dt = new Date(d + 'T00:00:00');
      const label = i => i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dt.toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short'});
      const idx = days.indexOf(d);
      return `<button class="filter-chip ${d===selectedDate?'active':''}" onclick="selectDate('${d}',this)">${label(idx)}</button>`;
    }).join('');

    window.selectDate = (date, btn) => {
      selectedDate = date;
      selectedShowId = null;
      document.querySelectorAll('#date-tabs .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('btn-select-seats').disabled = true;
      loadShows();
    };

    window.selectShow = (id, el) => {
      selectedShowId = id;
      document.querySelectorAll('.show-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      document.getElementById('btn-select-seats').disabled = false;
    };

    window.goToSeats = () => {
      if (!selectedShowId) return;
      if (!getUser()) { showToast('info', 'Login required', 'Please login to book tickets'); openModal('modal-login'); return; }
      window.location.href = `booking.html?show=${selectedShowId}`;
    };

    async function loadShows() {
      const container = document.getElementById('shows-container');
      container.innerHTML = `<div class="loading-page" style="min-height:150px;"><div class="spinner"></div></div>`;

      try {
        const res = await API.shows.byMovie(movieId, { date: selectedDate });
        const shows = res.data;

        if (!shows.length) {
          container.innerHTML = `<div class="empty-state"><p>No shows scheduled for this date.</p></div>`;
          return;
        }

        container.innerHTML = `<div class="shows-grid">${shows.map(show => {
          const pct = Math.round((1 - show.availableSeats / show.totalSeats) * 100);
          return `
            <div class="show-card" onclick="selectShow(${show.id},this)">
              <div class="show-time">${formatTime(show.showTime)}</div>
              <div class="show-meta">${show.hall}</div>
              <div class="show-availability mt-16">
                <div class="seat-bar"><div class="seat-bar-fill" style="width:${pct}%"></div></div>
                <span style="font-size:0.78rem;color:var(--text-3);white-space:nowrap;">${show.availableSeats} left</span>
              </div>
            </div>`;
        }).join('')}</div>`;
      } catch (e) {
        container.innerHTML = `<div class="empty-state"><p>Failed to load shows.</p></div>`;
      }
    }

    loadShows();

  } catch (err) {
    content.innerHTML = `<div class="empty-state mt-24"><p>Failed to load movie. ${err.message}</p></div>`;
  }
}

// ─── BOOKING / SEAT PICKER ──────────────────────────────
async function initBookingPage() {
  renderAuthModals();
  if (!getUser()) { showToast('info','Login required','Please login first'); openModal('modal-login'); }

  const params = new URLSearchParams(window.location.search);
  const showId = params.get('show');
  if (!showId) { window.location.href = 'index.html'; return; }

  const content = document.getElementById('booking-content');
  if (!content) return;
  content.innerHTML = `<div class="loading-page"><div class="spinner"></div><p>Loading seats…</p></div>`;

  let selectedSeats = []; // array of seat objects

  try {
    const res = await API.shows.seats(showId);
    const { show, seatsByRow } = res.data;

    content.innerHTML = `
      <div class="container" style="padding-top:32px;padding-bottom:64px;">
        <div style="display:grid;grid-template-columns:1fr 320px;gap:32px;align-items:start;">

          <!-- Seat picker -->
          <div>
            <div class="mb-16">
              <h2 class="section-title">${show.movie.title}</h2>
              <p style="color:var(--text-2);font-size:0.9rem;">
                📅 ${formatDate(show.date)} &nbsp;·&nbsp; 🕐 ${formatTime(show.showTime)} &nbsp;·&nbsp; 🏛️ ${show.hall}
              </p>
            </div>

            <div class="card" style="padding:32px;">
              <div class="seat-screen"></div>

              <div class="seat-container" id="seat-layout"></div>

              <div class="seat-legend">
                <div class="legend-item"><div class="legend-dot" style="background:var(--seat-vip);border-color:var(--seat-vip-border)"></div>VIP (2x)</div>
                <div class="legend-item"><div class="legend-dot" style="background:var(--seat-premium);border-color:var(--seat-premium-border)"></div>Premium (1.5x)</div>
                <div class="legend-item"><div class="legend-dot" style="background:var(--seat-available);border-color:var(--seat-avail-border)"></div>Available</div>
                <div class="legend-item"><div class="legend-dot" style="background:var(--red);border-color:var(--red-dark)"></div>Selected</div>
                <div class="legend-item"><div class="legend-dot" style="background:var(--seat-booked);border-color:var(--seat-booked-border)"></div>Booked</div>
              </div>
            </div>
          </div>

          <!-- Booking summary sidebar -->
          <div>
            <div class="booking-summary">
              <div class="booking-summary-header">Booking Summary</div>
              <div class="booking-summary-body" id="booking-sidebar">
                <p class="text-muted" style="font-size:0.85rem;">Select seats to see pricing</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    // Render seats
    function renderSeatLayout() {
      const layout = document.getElementById('seat-layout');
      layout.innerHTML = Object.entries(seatsByRow).map(([row, seats]) => `
        <div class="seat-row">
          <div class="seat-row-label">${row}</div>
          ${seats.map(seat => {
            const isBooked   = seat.status === 'booked' || seat.status === 'reserved';
            const isSelected = selectedSeats.some(s => s.id === seat.id);
            let cls = `seat ${seat.seatType} `;
            if (isBooked)        cls += 'booked';
            else if (isSelected) cls += 'selected';
            else                 cls += 'available';

            return `<div class="${cls}" title="${seat.seatNumber} — ${formatCurrency(seat.price)}"
              ${!isBooked ? `onclick="toggleSeat(${JSON.stringify(seat).replace(/"/g,'&quot;')})"` : ''}
            >${seat.seatNumber.substring(1)}</div>`;
          }).join('')}
        </div>
      `).join('');
    }

    window.toggleSeat = (seat) => {
      const idx = selectedSeats.findIndex(s => s.id === seat.id);
      if (idx >= 0) {
        selectedSeats.splice(idx, 1);
      } else {
        if (selectedSeats.length >= 8) { showToast('info','Max 8 seats','You can select up to 8 seats at a time'); return; }
        selectedSeats.push(seat);
      }
      renderSeatLayout();
      updateSidebar();
    };

    function updateSidebar() {
      const sidebar = document.getElementById('booking-sidebar');
      if (!selectedSeats.length) {
        sidebar.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">Select seats to see pricing</p>`;
        return;
      }

      const subtotal = selectedSeats.reduce((s, seat) => s + parseFloat(seat.price), 0);
      const convenience = Math.round(subtotal * 0.02);
      const total = subtotal + convenience;

      sidebar.innerHTML = `
        <div class="summary-row"><span class="summary-label">Movie</span><span style="font-weight:600;">${show.movie.title}</span></div>
        <div class="summary-row"><span class="summary-label">Date & Time</span><span>${formatDate(show.date).split(',')[0]}, ${formatTime(show.showTime)}</span></div>
        <div class="summary-row"><span class="summary-label">Hall</span><span>${show.hall}</span></div>
        <div class="summary-row">
          <span class="summary-label">Seats (${selectedSeats.length})</span>
          <div class="selected-seats-chips">
            ${selectedSeats.map(s => `<span class="seat-chip ${s.seatType}">${s.seatNumber}</span>`).join('')}
          </div>
        </div>
        <div class="summary-row"><span class="summary-label">Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        <div class="summary-row"><span class="summary-label">Convenience fee</span><span>${formatCurrency(convenience)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>

        <button class="btn btn-primary btn-full mt-16" onclick="proceedToPayment()">
          Proceed to Payment →
        </button>
        <p style="font-size:0.75rem;color:var(--text-3);margin-top:8px;text-align:center;">
          Seats held for 10 minutes after booking
        </p>
      `;
    }

    window.proceedToPayment = async () => {
      if (!getUser()) { openModal('modal-login'); return; }
      if (!selectedSeats.length) { showToast('error','No seats selected'); return; }

      const btn = document.querySelector('#booking-sidebar .btn-primary');
      btn.textContent = 'Reserving seats…'; btn.disabled = true;

      try {
        const res = await API.bookings.initiate({
          showId: parseInt(showId),
          seatIds: selectedSeats.map(s => s.id)
        });

        // Store pending booking data for payment page
        sessionStorage.setItem('mb_pending_booking', JSON.stringify({
          ...res.data,
          movieTitle: show.movie.title,
          date: show.date,
          showTime: show.showTime,
          hall: show.hall
        }));

        window.location.href = `payment.html?booking=${res.data.bookingDbId}`;
      } catch (err) {
        showToast('error', 'Failed to reserve', err.message);
        btn.textContent = 'Proceed to Payment →'; btn.disabled = false;
        // Reload seats to get fresh availability
        window.location.reload();
      }
    };

    renderSeatLayout();

  } catch (err) {
    content.innerHTML = `<div class="empty-state mt-24"><p>Failed to load seats. ${err.message}</p></div>`;
  }
}

// ─── PAYMENT PAGE ───────────────────────────────────────
async function initPaymentPage() {
  if (!getUser()) { window.location.href = 'index.html'; return; }

  const params = new URLSearchParams(window.location.search);
  const bookingDbId = params.get('booking');
  const pendingStr  = sessionStorage.getItem('mb_pending_booking');

  if (!bookingDbId || !pendingStr) { window.location.href = 'index.html'; return; }

  const pending = JSON.parse(pendingStr);
  const content = document.getElementById('payment-content');
  if (!content) return;

  const seatsList = pending.seats.map(s => s.seatNumber).join(', ');
  const totalAmt = formatCurrency(pending.totalPrice);
  const movieInfo = `${pending.movieTitle} · ${formatDate(pending.date)} · ${formatTime(pending.showTime)}`;

  content.innerHTML = `
    <div class="container" style="padding-top:40px;padding-bottom:64px;">
      <div class="payment-container">
        <h2 class="section-title mb-8">Complete Real Payment</h2>
        <p class="text-muted mb-24">${movieInfo}</p>

        <!-- Order summary box -->
        <div class="card" style="padding:20px;margin-bottom:24px;">
          <div class="flex justify-between mb-8">
            <span class="text-muted">Seats: ${seatsList}</span>
            <span style="font-weight:600;">${pending.seats.length} seats</span>
          </div>
          <div class="flex justify-between mb-8">
            <span class="text-muted">Per Seat Price</span>
            <span>${formatCurrency(pending.totalPrice / pending.seats.length)}</span>
          </div>
          <div class="flex justify-between" style="font-size:1.3rem;font-weight:700;color:var(--gold);padding-top:12px;border-top:1px solid var(--border);">
            <span>Total Amount</span><span>${totalAmt}</span>
          </div>
        </div>

        <!-- Real Razorpay Payment Section -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:28px;text-align:center;margin-bottom:24px;">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20px;color:var(--gold);font-weight:600;">
            🔒 Secure Payment via Razorpay
          </div>
          
          <p style="font-size:0.95rem;color:var(--text-2);margin-bottom:20px;">
            Real UPI Payment with Instant Confirmation
          </p>

          <button id="pay-btn" class="btn btn-gold btn-large" style="width:100%;padding:16px;font-size:1rem;font-weight:700;" onclick="initiateRazorpayPayment()">
            💳 Pay ${totalAmt} with Razorpay
          </button>

          <p style="font-size:0.78rem;color:var(--text-3);margin-top:16px;">
            ✓ Multiple UPI apps supported (GPay, PhonePe, Paytm, etc.)<br>
            ✓ Secure & encrypted payment<br>
            ✓ Receipt auto-generated after payment
          </p>
        </div>

        <!-- Receipt email note -->
        <div style="display:flex;align-items:center;gap:8px;padding:12px 14px;background:rgba(52,199,89,0.07);border:1px solid rgba(52,199,89,0.2);border-radius:var(--r-md);font-size:0.82rem;color:#34c759;">
          📧 After successful payment, receipt will be sent to <strong>${getUser()?.email || 'your email'}</strong>
        </div>

        <button class="btn btn-ghost btn-full mt-24" style="font-size:0.82rem;" onclick="window.history.back()">← Go Back</button>
      </div>
    </div>
  `;

  // ── Real Razorpay Payment Handler ──────────────────────────────────
  window.initiateRazorpayPayment = async () => {
    const btn = document.getElementById('pay-btn');
    btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:8px;vertical-align:middle;"></span>Initializing payment...';
    btn.disabled = true;

    try {
      // Step 1: Create Razorpay order
      const orderRes = await API.bookings.createOrder(bookingDbId);
      
      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Failed to create payment order');
      }

      const { orderId, amount, keyId } = orderRes.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: keyId,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        name: 'MovieBook',
        description: `Movie Booking - ${pending.movieTitle}`,
        order_id: orderId,
        notes: {
          bookingId: pending.bookingId,
          seats: seatsList
        },
        handler: async function(response) {
          // Step 3: Verify payment signature
          await verifyRazorpayPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
        },
        modal: {
          ondismiss: function() {
            btn.textContent = `💳 Pay ${totalAmt} with Razorpay`;
            btn.disabled = false;
            showToast('info', 'Payment Cancelled', 'You can try again');
          }
        },
        theme: { color: '#d4af37' }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (error) {
      showToast('error', 'Payment Error', error.message);
      btn.textContent = `💳 Pay ${totalAmt} with Razorpay`;
      btn.disabled = false;
    }
  };

  // ── Verify Razorpay Payment Signature ──────────────────────────────────
  window.verifyRazorpayPayment = async (orderId, paymentId, signature) => {
    const btn = document.getElementById('pay-btn');
    btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:8px;vertical-align:middle;"></span>Verifying...';
    btn.disabled = true;

    try {
      // Verify payment with backend
      const verifyRes = await API.bookings.verifyPayment(bookingDbId, {
        orderId,
        paymentId,
        signature
      });

      if (!verifyRes.success) {
        throw new Error(verifyRes.message || 'Payment verification failed');
      }

      // 🎉 Payment Verified! Show success and redirect
      sessionStorage.removeItem('mb_pending_booking');
      sessionStorage.setItem('mb_confirmed_booking', JSON.stringify(verifyRes.data));
      
      showToast('success', 'Payment Successful!', `UTR: ${verifyRes.data.utr}`);
      
      setTimeout(() => {
        window.location.href = `confirmation.html?booking=${verifyRes.data.bookingId}`;
      }, 1500);
    } catch (error) {
      showToast('error', 'Payment Failed', error.message);
      btn.textContent = `💳 Pay ${totalAmt} with Razorpay`;
      btn.disabled = false;
    }
  };
}

// ─── CONFIRMATION PAGE ──────────────────────────────────
function initConfirmationPage() {
  const content = document.getElementById('confirmation-content');
  if (!content) return;

  const data = JSON.parse(sessionStorage.getItem('mb_confirmed_booking') || '{}');
  const params = new URLSearchParams(window.location.search);
  const failed = params.get('status') === 'failed' || data.failed;

  if (failed) {
    content.innerHTML = `
      <div class="container" style="padding:64px 0;text-align:center;">
        <div style="font-size:4rem;margin-bottom:16px;">❌</div>
        <h2 class="section-title" style="color:var(--red);">Payment Failed</h2>
        <p class="text-muted mb-24">${data.message || 'Your payment could not be processed. Seats have been released.'}</p>
        <button class="btn btn-primary" onclick="window.history.go(-2)">Try Again</button>
        <button class="btn btn-secondary ml-8" onclick="window.location.href='index.html'" style="margin-left:12px;">Browse Movies</button>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="container" style="padding:64px 0;">
      <div style="text-align:center;margin-bottom:40px;">
        <div style="font-size:4rem;margin-bottom:16px;animation:pulse 2s infinite;">🎬</div>
        <h2 class="section-title">Booking Confirmed!</h2>
        <p class="text-muted">Your tickets are ready. Enjoy the movie!</p>
      </div>

      <div class="ticket-card">
        <div class="ticket-header">
          <div style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;margin-bottom:4px;">${data.movieTitle || '—'}</div>
          <div style="color:var(--text-2);font-size:0.85rem;">${formatDate(data.showDate)} · ${formatTime(data.showTime)}</div>
        </div>
        <div class="ticket-body">
          <div class="ticket-row">
            <span class="ticket-label">Booking ID</span>
            <span class="ticket-booking-id">${data.bookingId}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Seats</span>
            <span class="ticket-value">${(data.seats||[]).join(', ')}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Amount Paid</span>
            <span class="ticket-value" style="color:var(--gold)">${formatCurrency(data.totalPaid)}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Payment Method</span>
            <span class="ticket-value">${(data.paymentMethod||'card').toUpperCase()}</span>
          </div>
          <div class="ticket-row">
            <span class="ticket-label">Transaction ID</span>
            <span class="ticket-value" style="font-family:var(--font-mono);font-size:0.8rem;">${data.transactionId}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-12 mt-24" style="justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="window.location.href='profile.html'">View My Bookings</button>
        <button class="btn btn-ghost" onclick="window.location.href='index.html'">Browse More</button>
      </div>
    </div>
  `;
}

// ─── DOWNLOAD RECEIPT ──────────────────────────────────
function downloadTicket(data) {
  if (!data || typeof data !== 'object') {
    showToast('error', 'Download Failed', 'Invalid booking data');
    return;
  }
  
  try {
    const bookingId = data.bookingId || data.id || 'N/A';
    
    // Get PDF download URL
    const pdfUrl = API.bookings.downloadReceiptPDF(bookingId);
    const token = getToken();

    // Create a form to submit with authentication
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = pdfUrl;
    form.style.display = 'none';

    // Add authorization header via a custom fetch
    const link = document.createElement('a');
    link.href = '#';
    link.onclick = (e) => {
      e.preventDefault();
      downloadPDFWithAuth(bookingId, token);
    };
    
    // Directly download with authentication header
    downloadPDFWithAuth(bookingId, token);
    showToast('success', '✓ Downloading Receipt', 'Your PDF receipt is being downloaded...');
  } catch (error) {
    console.error('Download error:', error);
    showToast('error', 'Download Failed', error.message || 'Unable to download receipt');
  }
}

// Helper function to download PDF with authentication
async function downloadPDFWithAuth(bookingId, token) {
  try {
    const pdfUrl = API.bookings.downloadReceiptPDF(bookingId);
    
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    // Create blob from response
    const blob = await response.blob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MovieBook-Receipt-${bookingId}.pdf`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('PDF download error:', error);
    showToast('error', 'Download Failed', error.message);
  }
}

// ─── PROFILE PAGE ───────────────────────────────────────
async function initProfilePage() {
  const user = getUser();
  if (!user) { window.location.href = 'index.html'; return; }

  const content = document.getElementById('profile-content');
  if (!content) return;
  content.innerHTML = `<div class="loading-page"><div class="spinner"></div></div>`;

  try {
    const res = await API.bookings.getMyBookings();
    const bookings = res.data;
    const stats = { total: bookings.length, confirmed: bookings.filter(b=>b.bookingStatus==='confirmed').length };

    content.innerHTML = `
      <div class="container" style="padding-top:32px;padding-bottom:64px;">
        <div style="display:grid;grid-template-columns:280px 1fr;gap:32px;align-items:start;">

          <!-- Profile sidebar -->
          <div class="card" style="padding:28px;text-align:center;position:sticky;top:88px;">
            <div style="width:72px;height:72px;border-radius:50%;background:var(--red);display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;margin:0 auto 16px;">${getInitials(user.name)}</div>
            <h3 style="margin-bottom:4px;">${user.name}</h3>
            <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:16px;">${user.email}</p>
            <div class="flex gap-16 justify-between" style="padding:16px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:16px;">
              <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${stats.total}</div><div style="font-size:0.75rem;color:var(--text-3);">Total</div></div>
              <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:var(--gold);">${stats.confirmed}</div><div style="font-size:0.75rem;color:var(--text-3);">Confirmed</div></div>
            </div>
            <button class="btn btn-danger btn-full btn-sm" onclick="logout()">Logout</button>
          </div>

          <!-- Booking history -->
          <div>
            <h2 class="section-title mb-24">My Tickets</h2>
            ${!bookings.length
              ? `<div class="empty-state"><div class="empty-state-icon">🎟️</div><h3>No bookings yet</h3><p>Book your first movie ticket!</p><button class="btn btn-primary mt-16" onclick="window.location.href='index.html'">Browse Movies</button></div>`
              : bookings.map(b => {
                const statusColors = { confirmed:'badge-green', pending:'badge-gold', cancelled:'badge-gray', failed:'badge-red' };
                return `
                  <div class="card" style="margin-bottom:16px;padding:20px;">
                    <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:12px;">
                      <div class="flex gap-16 items-center" style="flex-wrap:wrap;">
                        <div>
                          <div style="font-weight:700;font-size:1rem;">${b.show?.movie?.title || '—'}</div>
                          <div style="color:var(--text-3);font-size:0.82rem;margin-top:2px;">${formatDate(b.show?.date)} · ${formatTime(b.show?.showTime)}</div>
                          <div style="font-family:var(--font-mono);color:var(--text-2);font-size:0.8rem;margin-top:4px;">${b.bookingId}</div>
                        </div>
                      </div>
                      <div style="text-align:right;">
                        <span class="badge ${statusColors[b.bookingStatus]||'badge-gray'}">${b.bookingStatus}</span>
                        <div style="font-size:1.1rem;font-weight:700;color:var(--gold);margin-top:8px;">${formatCurrency(b.totalPrice)}</div>
                      </div>
                    </div>
                    <div class="divider"></div>
                    <div class="flex justify-between items-center">
                      <div class="selected-seats-chips">
                        ${(b.seats||[]).map(s=>`<span class="seat-chip">${s.seatNumber}</span>`).join('')}
                      </div>
                      <div class="flex gap-8">
                        ${b.bookingStatus==='confirmed'
                          ? `<button class="btn btn-ghost btn-sm" onclick="downloadTicket(${JSON.stringify({
                              bookingId: b.bookingId,
                              show: b.show,
                              seats: b.seats,
                              totalPrice: b.totalPrice,
                              payment: b.payment
                            }).replace(/"/g,'&quot;')})">⬇ Ticket</button>
                             <button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id},this)">Cancel</button>`
                          : ''
                        }
                      </div>
                    </div>
                  </div>`;
              }).join('')}
          </div>
        </div>
      </div>
    `;

    window.cancelBooking = async (id, btn) => {
      if (!confirm('Cancel this booking? Refund will be processed in 3-5 business days.')) return;
      btn.textContent = 'Cancelling…'; btn.disabled = true;
      try {
        await API.bookings.cancel(id);
        showToast('success','Booking cancelled','Refund initiated');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast('error','Failed',err.message);
        btn.textContent = 'Cancel'; btn.disabled = false;
      }
    };

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}