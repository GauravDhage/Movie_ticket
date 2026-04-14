# 🎬 MovieBook — Movie Ticket Booking System

A full-stack movie ticket booking system with premium cinematic UI, JWT auth, MySQL transactions for race-condition-safe seat booking, and a complete admin panel.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | JWT + bcrypt, signup/login, role-based (user / admin) |
| **Movie Listings** | Poster, rating, duration, genre, language, search & filter |
| **Show Timings** | Multiple shows per movie per day, date selector |
| **Seat Picker** | Visual A1–F10 grid, VIP / Premium / Regular tiers |
| **Race-safe Booking** | `SELECT … FOR UPDATE` row locking inside MySQL transactions |
| **Payment Simulation** | Card / UPI / Net Banking / Wallet, simulate failure mode |
| **Booking History** | Download ticket (print), cancel with refund |
| **Admin Panel** | Dashboard stats, CRUD movies & shows, view all bookings |
| **Dark / Light mode** | Toggle in navbar |
| **Email confirmation** | Optional Nodemailer/Gmail integration |
| **Confetti 🎉** | On successful booking confirmation |

---

## 🗂 Project Structure

```
movie-booking/
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize + MySQL connection
│   ├── controllers/
│   │   ├── authController.js    # Signup, login, profile
│   │   ├── movieController.js   # CRUD + search/filter
│   │   ├── showController.js    # Shows + auto-seat generation
│   │   ├── bookingController.js # Initiate, pay, cancel (transactions)
│   │   └── adminController.js   # Dashboard stats
│   ├── middleware/
│   │   ├── auth.js              # protect / adminOnly / optionalAuth
│   │   └── errorHandler.js      # Global error + 404 handler
│   ├── models/
│   │   ├── index.js             # All associations
│   │   ├── User.js
│   │   ├── Movie.js
│   │   ├── Show.js
│   │   ├── Seat.js
│   │   ├── Booking.js
│   │   ├── BookingSeat.js
│   │   └── Payment.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── movieRoutes.js
│   │   ├── showRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   ├── seeder.js            # Seeds 6 movies + shows + seats
│   │   └── emailService.js      # Nodemailer booking confirmation
│   ├── server.js                # Express entry point
│   ├── package.json
│   └── .env.example             # Copy to .env
│
├── frontend/
│   ├── css/
│   │   └── style.css            # Full design system (CSS variables)
│   ├── js/
│   │   ├── api.js               # API client + toast/modal utils
│   │   ├── app.js               # All page logic (home, movie, booking, payment, profile, confirmation)
│   │   └── admin.js             # Admin dashboard, movie/show CRUD, bookings table
│   ├── index.html               # Home — movie listings + search
│   ├── movie.html               # Movie detail + show selector
│   ├── booking.html             # Seat picker
│   ├── payment.html             # Payment form (4 methods)
│   ├── confirmation.html        # Success / failure screen + confetti
│   ├── profile.html             # My bookings + cancel + download
│   └── admin.html               # Admin panel shell
│
├── schema.sql                   # Raw MySQL DDL (optional)
├── API_DOCS.md                  # Full REST API reference
└── README.md                    # You are here
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **MySQL** 8.0+ ([dev.mysql.com](https://dev.mysql.com/downloads/))
- A terminal / command prompt

---

### Step 1 — Clone / Download the project

```bash
# If using git
git clone <repo-url> movie-booking
cd movie-booking

# Or just unzip the folder you have
```

---

### Step 2 — Create the MySQL database

Open MySQL shell or MySQL Workbench and run:

```sql
CREATE DATABASE moviebook_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

### Step 3 — Configure environment variables

```bash
cd backend
cp .env.example .env
```

Open `.env` in any text editor and fill in:

```env
DB_PASSWORD=your_mysql_root_password
JWT_SECRET=any_long_random_string_here_at_least_32_chars
```

Everything else can stay as-is for local development.

---

### Step 4 — Install backend dependencies

```bash
# Inside the backend/ folder
npm install
```

---

### Step 5 — Seed the database

This creates all tables and inserts 6 sample movies + shows for the next 5 days:

```bash
npm run seed
```

You should see:
```
✅ MySQL Database connected successfully
📦 Syncing database tables...
✅ Tables created
👤 Creating admin user...
✅ Users created
🎬 Creating movies...
✅ 6 movies created
🎭 Creating shows and seats...
✅ 90 shows and 5400 seats created

🚀 Seeding complete!

  Admin Login:  admin@moviebook.com / Admin@123
  User Login:   user@moviebook.com  / User@123
```

> ⚠️ The seeder uses `{ force: true }` which **drops and recreates all tables**. Only run it once, or when you want a fresh start.

---

### Step 6 — Start the backend server

```bash
npm run dev        # development (auto-restarts on changes)
# or
npm start          # production
```

You should see:
```
✅ MySQL Database connected successfully
✅ Database models synced
🚀 MovieBook API running on http://localhost:5000
```

Test it: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Step 7 — Serve the frontend

The frontend is plain HTML/CSS/JS — no build step needed.

**Option A — VS Code Live Server (recommended for development):**
1. Install the "Live Server" extension in VS Code
2. Right-click `frontend/index.html` → "Open with Live Server"
3. It opens at `http://127.0.0.1:5500`

**Option B — Python simple server:**
```bash
cd frontend
python3 -m http.server 3000
# Open http://localhost:3000
```

**Option C — Node http-server:**
```bash
npx http-server frontend -p 3000
# Open http://localhost:3000
```

---

### Step 8 — Open the app

| URL | Page |
|-----|------|
| `http://localhost:3000` | Home — movie listings |
| `http://localhost:3000/admin.html` | Admin panel |

**Login credentials after seeding:**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@moviebook.com | Admin@123 |
| User | user@moviebook.com | User@123 |

---

## 🔐 How Seat Booking Prevents Race Conditions

When two users try to book the same seat simultaneously, this is the flow:

```
User A ──────────────────────────────────────────────────────►
         BEGIN TRANSACTION
         SELECT * FROM seats WHERE id IN (101,102) FOR UPDATE  ← LOCKS rows
         UPDATE seats SET status='reserved'
         INSERT INTO bookings ...
         COMMIT  ─────────────────────────────────────────────►

User B ──►
         BEGIN TRANSACTION
         SELECT * FROM seats WHERE id IN (101,102) FOR UPDATE
         ⏳ BLOCKED — waits for User A's lock to release
                     ◄─────────────────────────────────────────
         Only 0 rows returned with status='available'
         ROLLBACK — "Seats no longer available"  ─────────────►
```

Key lines in `controllers/bookingController.js`:
```js
const seats = await Seat.findAll({
  where: { id: { [Op.in]: seatIds }, status: 'available' },
  lock: transaction.LOCK.UPDATE,   // ← SELECT FOR UPDATE
  transaction
});
if (seats.length !== seatIds.length) {
  await transaction.rollback();
  return res.status(409).json({ message: 'Seats no longer available' });
}
```

---

## 🧪 Testing the Payment Flow

On the payment page there is a **"Simulate payment failure"** checkbox.
- **Unchecked** → payment succeeds, booking confirmed, confetti fires 🎉
- **Checked**   → payment fails, seats released back to available

---

## 📧 Email Confirmation (optional)

1. Enable 2-Step Verification on your Gmail
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a 16-character password for "Mail"
4. Add to `.env`:
   ```
   EMAIL_USER=your@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop
   ```
5. Restart the server — booking confirmation emails will be sent automatically

---

## 🛠 Common Issues

| Problem | Fix |
|---------|-----|
| `ER_ACCESS_DENIED_ERROR` | Wrong DB_PASSWORD in `.env` |
| `ER_BAD_DB_ERROR` | Database doesn't exist — run the `CREATE DATABASE` command |
| `ECONNREFUSED 5000` | Backend not running — `npm run dev` |
| `CORS error` in browser | Make sure `FRONTEND_URL` in `.env` matches your frontend origin |
| Seats not loading | Check browser console — likely the backend isn't running |
| `Cannot find module 'sequelize'` | Run `npm install` inside the `backend/` folder |

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#e63946` (crimson red) |
| Accent | `#f4a843` (amber gold) |
| Background | `#080810` |
| Font display | Playfair Display |
| Font body | DM Sans |
| Font mono | DM Mono |

---

## 📝 License

MIT — free to use, modify, and distribute.