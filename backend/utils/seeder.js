// utils/seeder.js
// Seeds the database with sample data for development/testing

require('dotenv').config();
const { sequelize, connectDB } = require('../config/database');
const { User, Movie, Show, Seat } = require('../models');

const sampleMovies = [
  {
    title: "Dune: Part Three",
    description: "The epic conclusion of Paul Atreides' journey as he leads the Fremen to final victory against the Harkonnen and the Emperor, while grappling with his own messianic destiny across the desert world of Arrakis.",
    duration: 166,
    rating: 8.8,
    genre: "Sci-Fi, Adventure, Drama",
    language: "English",
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    releaseDate: "2026-03-15",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
    ticketPrice: 320
  },
  {
    title: "Interstellar: Origins",
    description: "A prequel exploring the early days of the Lazarus missions. Scientists race against time as Earth's atmosphere becomes uninhabitable, risking everything to find humanity a new home among the stars.",
    duration: 149,
    rating: 8.5,
    genre: "Sci-Fi, Thriller",
    language: "English",
    posterUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop",
    releaseDate: "2026-04-01",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Fionn Whitehead"],
    ticketPrice: 280
  },
  {
    title: "Kalki 3.0",
    description: "The divine avatar returns in the final chapter of the epic saga. Ancient prophecy collides with futuristic technology as good and evil clash in a battle that will determine humanity's fate.",
    duration: 185,
    rating: 9.1,
    genre: "Action, Fantasy, Drama",
    language: "Hindi",
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
    releaseDate: "2026-01-12",
    cast: ["Prabhas", "Deepika Padukone", "Amitabh Bachchan", "Kamal Haasan"],
    ticketPrice: 350
  },
  {
    title: "The Dark Knight Legacy",
    description: "Gotham faces its darkest hour as a mysterious villain known only as Phantasm dismantles everything Bruce Wayne built. A new generation must rise to defend the city from shadows within shadows.",
    duration: 158,
    rating: 8.7,
    genre: "Action, Crime, Drama",
    language: "English",
    posterUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop",
    releaseDate: "2026-02-20",
    cast: ["Jensen Ackles", "Cillian Murphy", "Emily Blunt"],
    ticketPrice: 300
  },
  {
    title: "Pushpa: The Reign",
    description: "Pushpa Raj's empire expands across borders but so do his enemies. A ruthless IPS officer with a personal vendetta threatens to burn everything down — and Pushpa must decide what he truly fights for.",
    duration: 192,
    rating: 8.4,
    genre: "Action, Thriller, Drama",
    language: "Telugu",
    posterUrl: "https://images.unsplash.com/photo-1579566346927-c68383817a25?w=400&h=600&fit=crop",
    releaseDate: "2026-03-05",
    cast: ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil"],
    ticketPrice: 260
  },
  {
    title: "Avatar: The Seed Bearer",
    description: "Jake Sully and Neytiri's children are sent on a sacred mission into the deep forests of Pandora to protect an ancient tree holding the memories of all Na'vi ancestors — but the RDA wants it destroyed.",
    duration: 177,
    rating: 8.3,
    genre: "Sci-Fi, Adventure, Fantasy",
    language: "English",
    posterUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop",
    releaseDate: "2026-05-10",
    cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
    ticketPrice: 400
  }
];

const generateShowDates = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const showTimes = ['10:00:00', '13:30:00', '17:00:00', '20:30:00'];
const halls = ['Hall 1', 'Hall 2', 'IMAX Hall'];

const generateSeats = (showId, basePrice) => {
  const seats = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const row of rows) {
    for (let col = 1; col <= 10; col++) {
      let seatType = 'regular', price = basePrice;
      if (row === 'A') { seatType = 'vip'; price = basePrice * 2; }
      else if (row === 'B') { seatType = 'premium'; price = basePrice * 1.5; }
      seats.push({ showId, seatNumber: `${row}${col}`, row, seatType, status: 'available', price });
    }
  }
  return seats;
};

const seed = async () => {
  try {
    await connectDB();

    // Sync all models (create tables)
    console.log('📦 Syncing database tables...');
    await sequelize.sync({ force: true }); // WARNING: drops existing tables!
    console.log('✅ Tables created');

    // Create admin user
    console.log('👤 Creating admin user...');
    await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@moviebook.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin'
    });

    // Create demo user
    await User.create({
      name: 'Demo User',
      email: 'user@moviebook.com',
      password: 'User@123',
      role: 'user'
    });
    console.log('✅ Users created');

    // Create movies
    console.log('🎬 Creating movies...');
    const movies = await Movie.bulkCreate(sampleMovies);
    console.log(`✅ ${movies.length} movies created`);

    // Create shows and seats for each movie
    console.log('🎭 Creating shows and seats...');
    const dates = generateShowDates();
    let showCount = 0, seatCount = 0;

    for (const movie of movies) {
      // Create 2-3 shows per day for each movie
      for (const date of dates.slice(0, 5)) {
        const timesToUse = showTimes.slice(0, 3); // 3 shows per day
        for (let t = 0; t < timesToUse.length; t++) {
          const show = await Show.create({
            movieId: movie.id,
            showTime: timesToUse[t],
            date,
            hall: halls[t % halls.length],
            totalSeats: 60,
            availableSeats: 60
          });
          showCount++;

          const seats = generateSeats(show.id, parseFloat(movie.ticketPrice));
          await Seat.bulkCreate(seats);
          seatCount += seats.length;
        }
      }
    }

    console.log(`✅ ${showCount} shows and ${seatCount} seats created`);
    console.log('\n🚀 Seeding complete! You can now start the server.\n');
    console.log('  Admin Login:  admin@moviebook.com / Admin@123');
    console.log('  User Login:   user@moviebook.com  / User@123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();