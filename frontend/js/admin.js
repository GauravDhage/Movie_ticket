// js/admin.js
// Admin panel — dashboard, movie/show CRUD, booking viewer

async function initAdminPage() {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    showToast('error', 'Access denied', 'Admin only area');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return;
  }

  const content = document.getElementById('admin-content');
  if (!content) return;

  // Render admin shell
  content.innerHTML = `
    <div style="display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 72px);">

      <!-- Sidebar -->
      <div style="background:var(--bg-2);border-right:1px solid var(--border);padding:24px 0;">
        <div style="padding:0 20px 24px;color:var(--text-3);font-size:0.72rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Admin Panel</div>
        <nav id="admin-nav">
          ${[
            { id:'dashboard', label:'📊 Dashboard', icon:'' },
            { id:'movies',    label:'🎬 Movies', icon:'' },
            { id:'shows',     label:'🎭 Shows', icon:'' },
            { id:'bookings',  label:'🎟️ Bookings', icon:'' },
          ].map(tab => `
            <button class="admin-nav-btn" data-tab="${tab.id}" onclick="adminNav('${tab.id}')"
              style="display:flex;align-items:center;width:100%;padding:12px 20px;background:none;border:none;color:var(--text-2);font-size:0.9rem;cursor:pointer;transition:all 0.2s;text-align:left;gap:10px;border-left:3px solid transparent;">
              ${tab.label}
            </button>
          `).join('')}
        </nav>
      </div>

      <!-- Main content -->
      <div style="padding:32px;overflow-y:auto;" id="admin-main">
        <div class="loading-page"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  // Style active nav item
  window.adminNav = (tab) => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => {
      const active = b.dataset.tab === tab;
      b.style.color = active ? 'var(--text-1)' : 'var(--text-2)';
      b.style.background = active ? 'var(--surface)' : 'none';
      b.style.borderLeftColor = active ? 'var(--red)' : 'transparent';
    });
    loadAdminTab(tab);
  };

  adminNav('dashboard'); // Default tab
}

async function loadAdminTab(tab) {
  const main = document.getElementById('admin-main');
  main.innerHTML = `<div class="loading-page"><div class="spinner"></div></div>`;

  try {
    if (tab === 'dashboard') await renderDashboard(main);
    if (tab === 'movies')    await renderMoviesAdmin(main);
    if (tab === 'shows')     await renderShowsAdmin(main);
    if (tab === 'bookings')  await renderBookingsAdmin(main);
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
  }
}

// ─── DASHBOARD ────────────────────────────────────────
async function renderDashboard(el) {
  const res = await API.admin.dashboard();
  const { stats, recentBookings } = res.data;

  el.innerHTML = `
    <h2 class="section-title mb-24">Dashboard</h2>

    <div class="stats-grid">
      <div class="stat-card red">
        <div class="stat-icon">🎬</div>
        <div class="stat-value">${stats.totalMovies}</div>
        <div class="stat-label">Active Movies</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-icon">🎟️</div>
        <div class="stat-value">${stats.confirmedBookings}</div>
        <div class="stat-label">Confirmed Bookings</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${stats.totalUsers}</div>
        <div class="stat-label">Registered Users</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${formatCurrency(stats.totalRevenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
    </div>

    <h3 class="mb-16">Recent Bookings</h3>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Booking ID</th><th>User</th><th>Movie</th><th>Amount</th><th>Status</th><th>Date</th>
        </tr></thead>
        <tbody>
          ${recentBookings.map(b => `<tr>
            <td style="font-family:var(--font-mono);font-size:0.82rem;">${b.bookingId}</td>
            <td><div>${b.user?.name||'—'}</div><div style="font-size:0.75rem;color:var(--text-3);">${b.user?.email||''}</div></td>
            <td>${b.show?.movie?.title||'—'}</td>
            <td>${formatCurrency(b.totalPrice)}</td>
            <td><span class="badge ${b.bookingStatus==='confirmed'?'badge-green':b.bookingStatus==='pending'?'badge-gold':'badge-gray'}">${b.bookingStatus}</span></td>
            <td style="color:var(--text-3);font-size:0.82rem;">${new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── MOVIES ADMIN ─────────────────────────────────────
async function renderMoviesAdmin(el) {
  const res = await API.admin.getMovies();
  const movies = res.data;

  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <h2 class="section-title">Movies</h2>
      <button class="btn btn-primary" onclick="openMovieForm()">+ Add Movie</button>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Movie</th><th>Duration</th><th>Rating</th><th>Language</th><th>Price</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${movies.map(m => `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <img src="${m.posterUrl||''}" style="width:36px;height:52px;object-fit:cover;border-radius:4px;background:var(--surface-2);" onerror="this.style.display='none'">
                <div>
                  <div style="font-weight:600;">${m.title}</div>
                  <div style="font-size:0.75rem;color:var(--text-3);">${m.genre||''}</div>
                </div>
              </div>
            </td>
            <td>${formatDuration(m.duration)}</td>
            <td>${formatRating(m.rating)}</td>
            <td><span class="badge badge-gray">${m.language}</span></td>
            <td>${formatCurrency(m.ticketPrice)}</td>
            <td><span class="badge ${m.isActive?'badge-green':'badge-gray'}">${m.isActive?'Active':'Inactive'}</span></td>
            <td>
              <div class="flex gap-8">
                <button class="btn btn-ghost btn-sm" onclick="openMovieForm(${JSON.stringify(m).replace(/"/g,'&quot;')})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMovie(${m.id})">Delete</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Movie Form Modal -->
    <div id="modal-movie-form" class="modal-backdrop hidden">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h2 class="modal-title" id="movie-form-title">Add Movie</h2>
          <button class="modal-close" onclick="closeModal('modal-movie-form')">✕</button>
        </div>
        <div class="modal-body" id="movie-form-body"></div>
      </div>
    </div>
  `;

  window.deleteMovie = async (id) => {
    if (!confirm('Delete this movie?')) return;
    try { await API.admin.deleteMovie(id); showToast('success','Movie deleted'); await renderMoviesAdmin(el); }
    catch (err) { showToast('error','Failed',err.message); }
  };

  window.openMovieForm = (movie = null) => {
    document.getElementById('movie-form-title').textContent = movie ? 'Edit Movie' : 'Add Movie';
    document.getElementById('movie-form-body').innerHTML = `
      <div class="grid-2">
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Title *</label>
          <input id="mf-title" class="form-input" value="${movie?.title||''}">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Description</label>
          <textarea id="mf-desc" class="form-input" rows="3">${movie?.description||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Duration (minutes) *</label>
          <input id="mf-duration" type="number" class="form-input" value="${movie?.duration||120}">
        </div>
        <div class="form-group">
          <label class="form-label">Rating (0–10)</label>
          <input id="mf-rating" type="number" step="0.1" class="form-input" value="${movie?.rating||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Genre</label>
          <input id="mf-genre" class="form-input" value="${movie?.genre||''}" placeholder="Action, Drama, ...">
        </div>
        <div class="form-group">
          <label class="form-label">Language</label>
          <select id="mf-language" class="form-input">
            ${['English','Hindi','Telugu','Tamil','Malayalam','Kannada'].map(l=>`<option ${(movie?.language||'English')===l?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Poster URL</label>
          <input id="mf-poster" class="form-input" value="${movie?.posterUrl||''}" placeholder="https://...">
        </div>
        <div class="form-group">
          <label class="form-label">Ticket Price (₹) *</label>
          <input id="mf-price" type="number" class="form-input" value="${movie?.ticketPrice||250}">
        </div>
        <div class="form-group">
          <label class="form-label">Release Date</label>
          <input id="mf-release" type="date" class="form-input" value="${movie?.releaseDate||''}">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Cast (comma-separated)</label>
          <input id="mf-cast" class="form-input" value="${(movie?.cast||[]).join(', ')}" placeholder="Actor 1, Actor 2">
        </div>
      </div>
      <div id="movie-form-error" class="form-error hidden"></div>
      <div class="modal-footer" style="margin:0;padding:16px 0 0;">
        <button class="btn btn-secondary" onclick="closeModal('modal-movie-form')">Cancel</button>
        <button class="btn btn-primary" onclick="saveMovie(${movie?.id||'null'})">Save Movie</button>
      </div>
    `;
    openModal('modal-movie-form');
  };

  window.saveMovie = async (id) => {
    const body = {
      title:       document.getElementById('mf-title').value.trim(),
      description: document.getElementById('mf-desc').value.trim(),
      duration:    parseInt(document.getElementById('mf-duration').value),
      rating:      parseFloat(document.getElementById('mf-rating').value) || null,
      genre:       document.getElementById('mf-genre').value.trim(),
      language:    document.getElementById('mf-language').value,
      posterUrl:   document.getElementById('mf-poster').value.trim(),
      ticketPrice: parseFloat(document.getElementById('mf-price').value),
      releaseDate: document.getElementById('mf-release').value || null,
      cast:        document.getElementById('mf-cast').value.split(',').map(s=>s.trim()).filter(Boolean)
    };

    const errEl = document.getElementById('movie-form-error');
    if (!body.title || !body.duration) { errEl.textContent='Title and duration are required.'; errEl.classList.remove('hidden'); return; }

    try {
      if (id) await API.admin.updateMovie(id, body);
      else    await API.admin.createMovie(body);
      closeModal('modal-movie-form');
      showToast('success', id ? 'Movie updated!' : 'Movie created!');
      await renderMoviesAdmin(el);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  };
}

// ─── SHOWS ADMIN ──────────────────────────────────────
async function renderShowsAdmin(el) {
  const [showsRes, moviesRes] = await Promise.all([API.admin.getShows(), API.admin.getMovies()]);
  const shows = showsRes.data;
  const movies = moviesRes.data.filter(m => m.isActive);

  el.innerHTML = `
    <div class="flex justify-between items-center mb-24">
      <h2 class="section-title">Shows</h2>
      <button class="btn btn-primary" onclick="openShowForm(${JSON.stringify(movies).replace(/"/g,'&quot;')})">+ Add Show</button>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Movie</th><th>Date</th><th>Time</th><th>Hall</th><th>Seats</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${shows.map(s => `<tr>
            <td style="font-weight:600;">${s.movie?.title||'—'}</td>
            <td>${formatDate(s.date)}</td>
            <td style="font-family:var(--font-mono);">${formatTime(s.showTime)}</td>
            <td>${s.hall}</td>
            <td>${s.availableSeats}/${s.totalSeats}</td>
            <td><span class="badge ${s.isActive?'badge-green':'badge-gray'}">${s.isActive?'Active':'Inactive'}</span></td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="deleteShow(${s.id})">Delete</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Show Form Modal -->
    <div id="modal-show-form" class="modal-backdrop hidden">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Add Show</h2>
          <button class="modal-close" onclick="closeModal('modal-show-form')">✕</button>
        </div>
        <div class="modal-body" id="show-form-body"></div>
      </div>
    </div>
  `;

  window.deleteShow = async (id) => {
    if (!confirm('Delete this show?')) return;
    try { await API.admin.deleteShow(id); showToast('success','Show deleted'); await renderShowsAdmin(el); }
    catch (err) { showToast('error','Failed',err.message); }
  };

  window.openShowForm = (moviesList) => {
    document.getElementById('show-form-body').innerHTML = `
      <div class="form-group">
        <label class="form-label">Movie *</label>
        <select id="sf-movie" class="form-input">
          ${moviesList.map(m=>`<option value="${m.id}">${m.title}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date *</label>
        <input id="sf-date" type="date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Show Time *</label>
        <select id="sf-time" class="form-input">
          ${['10:00','13:30','17:00','20:30','23:00'].map(t=>`<option value="${t}:00">${formatTime(t+':00')}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Hall</label>
        <select id="sf-hall" class="form-input">
          <option>Hall 1</option><option>Hall 2</option><option>IMAX Hall</option><option>4DX Hall</option>
        </select>
      </div>
      <div id="show-form-error" class="form-error hidden"></div>
      <div class="modal-footer" style="margin:0;padding:16px 0 0;">
        <button class="btn btn-secondary" onclick="closeModal('modal-show-form')">Cancel</button>
        <button class="btn btn-primary" onclick="saveShow()">Create Show + Seats</button>
      </div>
    `;
    openModal('modal-show-form');
  };

  window.saveShow = async () => {
    const body = {
      movieId:  parseInt(document.getElementById('sf-movie').value),
      date:     document.getElementById('sf-date').value,
      showTime: document.getElementById('sf-time').value,
      hall:     document.getElementById('sf-hall').value
    };
    const errEl = document.getElementById('show-form-error');
    if (!body.date) { errEl.textContent='Date is required.'; errEl.classList.remove('hidden'); return; }

    try {
      await API.admin.createShow(body);
      closeModal('modal-show-form');
      showToast('success', 'Show created with 60 seats!');
      await renderShowsAdmin(el);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  };
}

// ─── BOOKINGS ADMIN ───────────────────────────────────
async function renderBookingsAdmin(el) {
  const res = await API.admin.getBookings();
  const bookings = res.data;

  el.innerHTML = `
    <h2 class="section-title mb-24">All Bookings</h2>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Booking ID</th><th>User</th><th>Movie</th><th>Seats</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${bookings.map(b => `<tr>
            <td style="font-family:var(--font-mono);font-size:0.78rem;">${b.bookingId}</td>
            <td><div>${b.user?.name||'—'}</div><div style="font-size:0.72rem;color:var(--text-3);">${b.user?.email||''}</div></td>
            <td>${b.show?.movie?.title||'—'}</td>
            <td>${b.numberOfSeats}</td>
            <td style="font-weight:600;">${formatCurrency(b.totalPrice)}</td>
            <td><span class="badge ${b.payment?.status==='success'?'badge-green':b.payment?.status==='refunded'?'badge-blue':'badge-gray'}">${b.payment?.status||'—'}</span></td>
            <td><span class="badge ${b.bookingStatus==='confirmed'?'badge-green':b.bookingStatus==='pending'?'badge-gold':b.bookingStatus==='cancelled'?'badge-blue':'badge-red'}">${b.bookingStatus}</span></td>
            <td style="font-size:0.78rem;color:var(--text-3);">${new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}