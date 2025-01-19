const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const localStrategy = require('passport-local').Strategy;
const passport = require('passport');

function initializePassport(passport) {
  const authenticateUser = async (username, password, done) => {
    // Check if the user exists in the database
    pool.query('SELECT * FROM users WHERE username = $1 ',
      [username],
      async (error, results) => {
        if (error) {
          throw error;
        }
        if (results.rows.length > 0) {
          const user = results.rows[0];
          // Check if the password is correct
          const validPassword = await bcrypt.compare(password, user.password);
          if (validPassword) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Incorrect password' });
          }
        } else {
          return done(null, false, { message: 'Username doesn\'t exist' });
        }
      }
    );
  };

  passport.use(
    new localStrategy(
      {
        usernameField: 'username',
        passwordField: 'password'
      },
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser((id, done) => {
    pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error;
      }
      return done(null, results.rows[0]);
    });
  });
}

initializePassport(passport);

const app = express();
const port = 3000;

// PostgreSQL connection
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

console.log('Database User:', process.env.DB_USER);
console.log('Database Host:', process.env.DB_HOST);
console.log('Database Name:', process.env.DB_NAME);
console.log('Database Password:', process.env.DB_PASSWORD);
console.log('Database Port:', process.env.DB_PORT);
console.log('Secret Key:', process.env.SECRET_KEY);

const genreMapping = [
  'Western',       // Bit 13
  'Mystery',       // Bit 12
  'Thriller',      // Bit 11
  'Sci-Fi',        // Bit 10
  'Romance',       // Bit 9
  'Musical',       // Bit 8
  'Horror',        // Bit 7
  'Historical',    // Bit 6
  'Fantasy',       // Bit 5
  'Drama',         // Bit 4
  'Comedy',        // Bit 3
  'Animation',     // Bit 2
  'Adventure',     // Bit 1
  'Action',        // Bit 0
];

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the uploads/posters directory exists
const uploadsDir = path.join(__dirname, 'uploads/posters');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Directory to save uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const upload = multer({ storage });

// Serve static files from the 'assets' directory
app.use('/assets', express.static('src/assets'));
app.use('/styles', express.static('src/styles'));

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get('/', async (req, res) => {
  try {
    const topN = 5;
    const genreMovies = {};
    const isAuthenticated = req.isAuthenticated();
    const isAdmin = isAuthenticated && req.user.id === 1;

    // Query for top movies by genre
    for (let i = 0; i < genreMapping.length; i++) {
      const genreName = genreMapping[i];
      const genreBit = 1 << i;

      const moviesResult = await pool.query(
        `SELECT * FROM movies
         WHERE (genre_bitmap & $1) > 0
         ORDER BY score DESC
         LIMIT $2`,
        [genreBit, topN]
      );

      genreMovies[genreName] = moviesResult.rows;
    }

    // Query for all stores
    const storesResult = await pool.query('SELECT * FROM stores');
    const stores = storesResult.rows;

    // Generate tabs and movie sections
    let tabs = genreMapping.map((genre, index) => `
      <button class="tab ${index === 0 ? 'active' : ''}" onclick="showTab('${genre}')">${genre}</button>
    `).join('');

    let movieSections = genreMapping.map((genre, index) => {
      const moviesList = genreMovies[genre].map(movie => `
        <li>${movie.title} (Score: ${movie.score})</li>
      `).join('');
      return `
        <div id="${genre}" class="tab-content" style="display: ${index === 0 ? 'block' : 'none'};">
          <h3>${genre}</h3>
          <ul>
            ${moviesList}
          </ul>
        </div>
      `;
    }).join('');

    // Generate HTML for stores
    let storesList = stores.map(store => `
      <li>${store.phone_num} - ${store.city}, ${store.address}</li>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Eight Spots</title>
          <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
          <link rel="stylesheet" type="text/css" href="/styles/style.css">
          <script>
            function showTab(genre) {
              const tabs = document.getElementsByClassName('tab-content');
              const tabButtons = document.getElementsByClassName('tab');

              for (let i = 0; i < tabs.length; i++) {
                tabs[i].style.display = 'none';
                tabButtons[i].classList.remove('active');
              }

              document.getElementById(genre).style.display = 'block';
              const activeTab = Array.from(tabButtons).find(tab => tab.textContent === genre);
              if (activeTab) {
                activeTab.classList.add('active');
              }
            }

            window.onload = function() {
              // Show the first tab by default
              if (document.getElementsByClassName('tab-content').length > 0) {
                showTab('${genreMapping[0]}');
              }
            }
          </script>
        </head>
        <body>
          <nav>
            <ul>
              <li>
                <a href="/">
                  <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
                </a>
              </li>
              <li><a href="/">Home</a></li>
              <li><a href="/movies">Movies</a></li>
              <li><a href="/library">Library</a></li>
              ${isAuthenticated ? 
                '<li><a href="/profile">My Profile</a></li><li><a href="/logout">Logout</a></li>' : 
                '<li><a href="/login">Login</a></li>'
              }
              ${isAdmin ? 
                '<li><a href="/add-movie">Add a movie</a></li><li><a href="/add-store">Add a store</a></li>' : 
                ''
              }
            </ul>
          </nav>
          <h1> Welcome to the Eight Spots</h1>
          <div class="tabs">
            ${tabs}
          </div>
          <div class="tab-contents">
            ${movieSections}
          </div>
          <h2>Our Stores</h2>
          <ul>
            ${storesList}
          </ul>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving top movies and stores');
  }
});

app.get('/add-movie', checkAdmin, async (req, res) => {
  try {
    let genres = genreMapping.map((genre, index) => `
      <input type="checkbox" name="genre" value="${1 << index}"> ${genre}<br>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Add Movie</title>
          <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
          <link rel="stylesheet" type="text/css" href="/styles/style.css">
        </head>
        <body>
          <nav>
            <ul>
              <li>
                <a href="/">
                  <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
                </a>
              </li>
              <li><a href="/">Home</a></li>
              <li><a href="/movies">Movies</a></li>
              <li><a href="/library">Library</a></li>
              <li><a href="/add-movie">Add a movie</a></li><li><a href="/add-store">Add a store</a></li>
            </ul>
          </nav>
          <h1>
            Add a new movie
          </h1>
          <form id="movieForm" action="/add-movie" method="post" enctype="multipart/form-data">
            <label for="title">Title:</label><br>
            <input type="text" id="title" name="title" required><br><br>
            <label for="score">Score:</label><br>
            <input type="number" id="score" name="score" min="0" max="10" step="0.1" required><br><br>
            <label for="price">Price (€):</label><br>
            <input type="number" id="price" name="price" min="0" step="0.01" required><br><br>
            <label for="poster">Poster:</label><br>
            <input type="file" id="poster" name="poster" accept="image/*" required><br><br>
            <label for="genre">Genre:</label><br>
            ${genres}
            <br>
            <input type="submit" value="Add movie">
          </form>
          <script>
            document.getElementById('movieForm').addEventListener('submit', function(event) {
              // Prevent the default form submission
              event.preventDefault();
            
              // Get all checkboxes
              const checkboxes = document.querySelectorAll('input[name="genre"]:checked');
              let bitmap = 0;
            
              // Calculate the bitmap value
              checkboxes.forEach((checkbox) => {
                  bitmap |= parseInt(checkbox.value); // Use bitwise OR to combine values
              });
            
              // Create a new FormData object
              const formData = new FormData(this);
              formData.append('genre_bitmap', bitmap); // Append the calculated bitmap
            
              // Submit the form using fetch or XMLHttpRequest
              fetch('/add-movie', {
                  method: 'POST',
                  body: formData
              })
              .then(response => response.text())
              .then(data => {
                  console.log(data); // Handle the response
                  alert('Movie added successfully!');
              })
              .catch(error => {
                  console.error('Error:', error);
              });
            });
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding movie');
  }
});

// Handle form submission
app.post('/add-movie', checkAdmin, upload.single('poster'), (req, res) => {
  console.log(req.file); // Log the uploaded file information
  const { title, score, price, genre_bitmap } = req.body;
  const posterUrl = req.file.path; // Path to the uploaded poster image

  // Insert the movie data into the database
  pool.query('INSERT INTO movies (id, title, score, price, genre_bitmap, poster_url) VALUES (nextval(\'movies_id_seq\'), $1, $2, $3, $4, $5)',
    [title, score, price, genre_bitmap, posterUrl],
    (error, results) => {
      if (error) {
        console.error('Error inserting movie data:', error);
        return res.status(500).send('Error inserting movie data');
      }
      res.send('Movie added successfully!');
    }
  );
});

app.get('/add-store', checkAdmin, async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Add Store</title>
          <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
          <link rel="stylesheet" type="text/css" href="/styles/style.css">
        </head>
        <body>
          <nav>
            <ul>
              <li>
                <a href="/">
                  <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
                </a>
              </li>
              <li><a href="/">Home</a></li>
              <li><a href="/movies">Movies</a></li>
              <li><a href="/library">Library</a></li>
              <li><a href="/add-movie">Add a movie</a></li>
              <li><a href="/add-store">Add a store</a></li>
            </ul>
          </nav>
          <h1>Add a new store</h1>
          <form id="storeForm" action="/add-store" method="post">
            <label for="phone_num">Phone Number:</label><br>
            <input type="text" id="phone_num" name="phone_num" required><br><br>
            <label for="city">City:</label><br>
            <input type="text" id="city" name="city" required><br><br>
            <label for="address">Address:</label><br>
            <input type="text" id="address" name="address" required><br><br>
            <input type="submit" value="Add Store">
          </form>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding store');
  }
});

app.post('/add-store', checkAdmin, (req, res) => {
  const { phone_num, city, address } = req.body;

  // Insert the store data into the database
  pool.query('INSERT INTO stores (id, phone_num, city, address) VALUES (nextval(\'stores_id_seq\'), $1, $2, $3)',
    [phone_num, city, address],
    (error, results) => {
      if (error) {
        console.error('Error inserting store data:', error);
        return res.status(500).send('Error inserting store data');
      }
      res.send('Store added successfully!');
    }
  );
});

// Route to get all movies
app.get('/library', checkNotAuthenticated, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  const isAdmin = isAuthenticated && req.user.id === 1;

  try {
    const result = await pool.query(`SELECT * FROM user_movie_library WHERE user_id = $1;`, [req.user.id]);
    
    const movies = result.rows;
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Eight Spots</title>
        <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
        <link rel="stylesheet" type="text/css" href="/styles/style.css">
        <style>
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr; /* Two equal columns */
            gap: 20px; /* Space between the columns */
            padding: 20px;
          }
          .grid-item {
            border: 1px solid #ccc;
            border-radius: 1rem;
            padding: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .sub-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr); /* Two equal sub-columns */
            gap: 10px; /* Space between the flip cards */
          }
          .flip-card {
            border: 1px solid #ccc;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          h2 {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <nav>
          <ul>
            <li>
              <a href="/">
                <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
              </a>
            </li>
            <li><a href="/">Home</a></li>
            <li><a href="/movies">Movies</a></li>
            <li><a href="/library">Library</a></li>
            ${isAuthenticated ? 
              '<li><a href="/profile">My Profile</a></li><li><a href="/logout">Logout</a></li>' : 
              '<li><a href="/login">Login</a></li>'
            }
            ${isAdmin ? 
              '<li><a href="/add-movie">Add a movie</a></li><li><a href="/add-store">Add a store</a></li>' : 
              ''
            }
          </ul>
        </nav>
        <h1>
          My Library
        </h1>
        <div class="grid-container">
          <div class="grid-item">
            <h2>Unwatched Movies</h2>
            <div class="sub-grid">`;

    movies.forEach(movie => {
      if (movie.status === false) { // Unwatched
        const posterUrl = `/uploads/posters/${movie.poster_url.split('/').pop()}`;
        html += `
          <div class="flip-card" onclick="window.location.href='/movie/${movie.id}'" style="cursor: pointer;">
            <div class="flip-card-inner">
              <div class="flip-card-front" style="background-image: url('${posterUrl}'); background-size: cover; background-position: center;">
              </div>
              <div class="flip-card-back" style="border-radius: 1rem;">
                <h1>${movie.title}</h1>
                <p>Score: ${movie.score} / 10</p>
                <form action="/toggle-status/${movie.id}" method="POST">
                  <button type="submit">Mark as Watched</button>
                </form>
              </div>
            </div>
          </div>`;
      }
    });

    html += `</div></div>`; // Close unwatched movies section

    html += `<div class="grid-item">
              <h2>Watched Movies</h2>
              <div class="sub-grid">`;

    movies.forEach(movie => {
      if (movie.status === true) { // Watched
        const posterUrl = `/uploads/posters/${movie.poster_url.split('/').pop()}`;
        html += `
          <div class="flip-card" onclick="window.location.href='/movie/${movie.id}'" style="cursor: pointer;">
            <div class="flip-card-inner">
              <div class="flip-card-front" style="background-image: url('${posterUrl}'); background-size: cover; background-position: center;">
              </div>
              <div class="flip-card-back" style="border-radius: 1rem;">
                <h1>${movie.title}</h1>
                <p>Score: ${movie.score} / 10</p>
                <form action="/toggle-status/${movie.id}" method="POST">
                  <button type="submit">Mark as Unwatched</button>
                </form>
              </div>
            </div>
          </div>`;
      }
    });

    html += `</div></div>`; // Close watched movies section

    html += `</div></div>`; // Close grid container
    html += `</body></html>`;
    
    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error ');
  }
});

app.post('/toggle-status/:id', checkNotAuthenticated, async (req, res) => {
  const movieId = req.params.id;
  const userId = req.user.id; // Get the authenticated user's ID

  try {
    // Get the current status of the movie
    const result = await pool.query('SELECT status FROM user_library WHERE user_id = $1 AND movie_id = $2', [userId, movieId]);
    const movie = result.rows[0];

    if (!movie) {
      return res.status(404).send('Movie not found in your library.');
    }

    // Toggle the status
    const newStatus = !movie.status; // If it's true, set to false and vice versa
    await pool.query('UPDATE user_library SET status = $1 WHERE user_id = $2 AND movie_id = $3', [newStatus, userId, movieId]);

    // Redirect back to the library page
    res.redirect('/library');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating movie status');
  }
});

app.get('/movies', async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  const isAdmin = isAuthenticated && req.user.id === 1;

  try {
    const result = await pool.query('SELECT * FROM movies ORDER BY id ASC');
    const movies = result.rows;
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
    <title>Eight Spots</title>
    <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
    <link rel="stylesheet" type="text/css" href="/styles/style.css">
    </head>
    <body>
      <script>
        function searchMovies() {
          const searchInput = document.getElementById('search').value.toLowerCase();
          const movieCards = document.querySelectorAll('.flip-card');
    
          movieCards.forEach(card => {
            const title = card.querySelector('h1').textContent.toLowerCase();
            if (title.includes(searchInput)) {
              card.style.display = 'block'; // Show the card if it matches
            } else {
              card.style.display = 'none'; // Hide the card if it doesn't match
            }
          });
        }
      </script>
        <nav>
          <ul>
            <li>
              <a href="/">
                <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
              </a>
            </li>
            <li><a href="/">Home</a></li>
            <li><a href="/movies">Movies</a></li>
            <li><a href="/library">Library</a></li>
            ${isAuthenticated ? 
              '<li><a href="/profile">My Profile</a></li><li><a href="/logout">Logout</a></li>' : 
              '<li><a href="/login">Login</a></li>'
            }
            ${isAdmin ? 
              '<li><a href="/add-movie">Add a movie</a></li><li><a href="/add-store">Add a store</a></li>' : 
              ''
            }
          </ul>
        </nav>
        <h1>
          <div>
          All movies
          <input type="text" id="search" placeholder="Search for movies..." oninput="searchMovies(this.value)">
          </div>
          </h1>
        <div style="display: flex; flex-wrap: wrap;">
    `;
    movies.forEach(movie => {
      // Determine the genres based on the genre_bitmap
      const genres = [];
      for (let i = 0; i < genreMapping.length; i++) {
        if ((movie.genre_bitmap & (1 << i)) > 0) {
          genres.push(genreMapping[i]);
        }
      }

      // Join the genres into a string
      const genreString = genres.length > 0 ? genres.join(', ') : 'No genres';

      // Set the background image for the card
      const posterUrl = `/uploads/posters/${movie.poster_url.split('/').pop()}`; // Get the filename from the path
      html += `
      <div class="flip-card" onclick="window.location.href='/movie/${movie.id}'" style="cursor: pointer;">
          <div class="flip-card-inner">
        <div class="flip-card-front" style="background-image: url('${posterUrl}'); background-size: cover; background-position: center;">
        </div>
        <div class="flip-card-back" style="border-radius: 10px;">
          <h1>${movie.title}</h1>
          <p>Genre: ${genreString}</p>
          <p>Score: ${movie.score} / 10</p>
          <p>Rating: ${'★'.repeat(Math.round(movie.score / 2))}${'☆'.repeat(5 - Math.round(movie.score / 2))} / 5</p>
          <p>Price: ${movie.price} €</p>          
        </div>
          </div>
      </div>
      `;
    });

    html += `</div>`;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error querying the database');
  }
});

app.get('/movie/:id', async (req, res) => {
  const movieId = req.params.id;
  const isAuthenticated = req.isAuthenticated();
  const isAdmin = isAuthenticated && req.user.id === 1;

  try {
    const result = await pool.query('SELECT * FROM movies WHERE id = $1', [movieId]);
    const movie = result.rows[0];

    // Fetch reviews for the movie

    const reviewsResult = await pool.query(`SELECT * FROM movie_reviews WHERE movie_id = $1 ORDER BY timestamp DESC`, [movieId]);
    const reviews = reviewsResult.rows;

    // Determine the genres based on the genre_bitmap
    const genres = [];
    for (let i = 0; i < genreMapping.length; i++) {
      if ((movie.genre_bitmap & (1 << i)) > 0) {
        genres.push(genreMapping[i]);
      }
    }
    const genreString = genres.length > 0 ? genres.join(', ') : 'No genres';

    // Set the background image for the card
    const posterUrl = `/uploads/posters/${movie.poster_url.split('/').pop()}`; // Get the filename from the path

    let html = `
      <html>
      <head>
        <title>${movie.title}</title>
        <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
        <link rel="stylesheet" type="text/css" href="/styles/style.css">
        <style>
          .movie-card {
            width: 400px; /* Adjust the width as needed */
            border: 1px solid #ccc;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            position: relative;
          }
          .movie-card img {
            width: 100%;
            height: auto;
          }
          .movie-card h1 {
            margin: 0;
            padding: 16px;
            font-size: 24px;
          }
          .movie-card p {
            padding: 0 16px;
          }
          .buy-button {
            display: block;
            margin: 16px auto;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            text-align: center;
          }
          .buy-button:hover {
            background-color: #0056b3;
          }
          .reviews {
            width: 400px; /* Same width as movie card */
            border: 1px solid #ccc;
            border-radius: 10px;
            padding: 16px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          .review {
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .review h3 {
            margin: 0;
            font-size: 18px;
          }
          .review p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const timestamps = document.querySelectorAll('.review-timestamp');
            timestamps.forEach(timestamp => {
              const utcTime = timestamp.getAttribute('data-timestamp');
              const localTime = new Date(utcTime).toLocaleString(undefined, { timeZoneName: 'short' });
              timestamp.textContent = localTime;
            });
          });
        </script>
        <nav>
          <ul>
            <li>
              <a href="/">
                <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
              </a>
            </li>
            <li><a href="/">Home</a></li>
            <li><a href="/movies">Movies</a></li>
            <li><a href="/library">Library</a></li>
            ${isAuthenticated ? 
              '<li><a href="/profile">My Profile</a></li><li><a href="/logout">Logout</a></li>' : 
              '<li><a href="/login">Login</a></li>'
            }
            ${isAdmin ? 
              '<li><a href="/add-movie">Add a movie</a></li><li><a href="/add-store">Add a store</a></li>' : 
              ''
            }
          </ul>
        </nav>
        <div class="movie-card">
          <img src="${posterUrl}" alt="${movie.title}">
          <h1>${movie.title}</h1>
          <p>Genre: ${genreString}</p>
          <p>Score: ${movie.score} / 10</p>
          <p>Rating: ${'★'.repeat(Math.round(movie.score / 2))}${'☆'.repeat(5 - Math.round(movie.score / 2))} / 5</p>
          <p>Price: ${movie.price} €</p>
          <form id="buy-form" action="/movie/${movie.id}/buy" method="POST" style="display: inline;">
            <button type="submit" class="buy-button">BUY</button>
          </form>
        </div>
        <div class="reviews">
          <h2>User Reviews</h2>
          ${reviews.length > 0 ? reviews.map(review => `
            <div class="review">
              <h3>${review.username} - ${'★'.repeat(Math.round(review.rating))}${'☆'.repeat(5 - Math.round(review.rating))} / 5</h3>
              <p>${review.comment}</p>
              <p><small class="review-timestamp" data-timestamp="${review.timestamp}"></small></p>
            </div>
          `).join('') : '<p>No reviews yet.</p>'}
          <form action="/movies/${movieId}/review" method="POST">
            <h3>Leave a Review</h3>
            <label for="rating">Rating (1-5):</label>
            <input type="number" id="rating" name="rating" min="0" max="5" required>
            <label for="comment">Comment:</label>
            <textarea id="comment" name="comment" required></textarea>
            <button type="submit" class="buy-button">Submit Review</button>
          </form>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error querying the database');
  }
});

app.post('/movie/:id/buy', checkNotAuthenticated, async (req, res) => {
  const movieId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if the movie exists
    const movieResult = await pool.query('SELECT * FROM movies WHERE id = $1', [movieId]);
    const movie = movieResult.rows[0];

    if (!movie) {
      return res.status(404).send('Movie not found');
    }

    // Insert the purchase record into the user_library table
    await pool.query(
      'INSERT INTO user_library (user_id, movie_id, status) VALUES ($1, $2, $3)',
      [userId, movieId, false] // Set status to false (unwatched) by default
    );

    res.redirect('/library');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error purchasing the movie');
  }
});

// POST route for submitting a review
app.post('/movies/:id/review', checkNotAuthenticated, async (req, res) => {
  const movieId = req.params.id;
  const userId = req.user.id; // Get the authenticated user's ID
  const { rating, comment } = req.body; // Extract rating and comment from the request body

  try {
    // Insert the review into the database
    await pool.query(
      'INSERT INTO reviews (review_id ,user_id, movie_id, rating, comment) VALUES (nextval(\'reviews_id_seq\') ,$1, $2, $3, $4)',
      [userId, movieId, rating, comment]
    );

    // Redirect or send a success message
    res.status(201).redirect(`/movie/${movieId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting the review');
  }
});

app.get('/logout', (req, res) => {
  req.logout(
    function (err) {
      if (err) {
        return next(err);
      }
      req.flash('success_msg', 'You are logged out');
      res.redirect('/login');
    }
  );
});

app.get('/login', checkAuthenticated, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();

  html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login</title>
        <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
        <link rel="stylesheet" type="text/css" href="/styles/style.css">
      </head>
      <body style="text-align: center;">
        <nav>
          <ul>
            <li>
              <a href="/">
                <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
              </a>
            </li>
            <li><a href="/">Home</a></li>
            <li><a href="/movies">Movies</a></li>
            <li><a href="/library">Library</a></li>
            ${isAuthenticated ? 
              '<li><a href="/profile">My Profile</a></li><li><a href="/logout">Logout</a></li>' : 
              '<li><a href="/login">Login</a></li>'
            }
          </ul>
        </nav>
        <h1>
          Login
        </h1>`
  let msg = req.flash('success_msg');
  if (msg.length > 0) {
    html += `<div class="alert success">${msg}</div>`
  }
  msg = req.flash('error');
  if (msg.length > 0) {
    html += `<div class="alert error">${msg}</div>`
  }
  html += `<form action="/login" method="post">
          <label for="username">Username:</label><br>
          <input type="text" id="username" name="username" required><br><br>
          <label for="password">Password:</label><br>
          <input type="password" id="password" name="password" required><br><br>
          <input type="submit" value="Login"><br><br>
          <a href="/register" style="color: #f0f0f0; text-decoration: none;">Don't have an account? <b>Register here</b></a>
        </form>
      </body>
    </html>
  `
  res.send(html);
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/library',
  failureRedirect: '/login',
  failureFlash: true
}), (req, res) => { });

app.get('/register', checkAuthenticated, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Register</title>
        <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
        <link rel="stylesheet" type="text/css" href="/styles/style.css">
      </head>
      <body style="text-align: center;">
        <nav>
          <ul>
            <li>
              <a href="/">
                <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
              </a>
            </li>
            <li><a href="/">Home</a></li>
            <li><a href="/movies">Movies</a></li>
            <li><a href="/library">Library</a></li>
            ${isAuthenticated ? 
              '<li><a href="/profile">My Profile</a></li><li><a href="/logout">Logout</a></li>' : 
              '<li><a href="/login">Login</a></li>'
            }
          </ul>
        </nav>
        <h1>
          Register
        </h1>
        <form action="/register" method="post">
          <label for="username">Username:</label><br>
          <input type="text" id="username" name="username" required><br><br>
          <label for="password">Password:</label><br>
          <input type="password" id="password" name="password" required><br><br>
          <input type="submit" value="Register"><br><br>
          <a href="/login" style="color: #f0f0f0; text-decoration: none;">Already have an account? <b>Login here</b></a>
        </form>
      </body>
    </html>
  `);
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Check if the user already exists
  const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (userExists.rows.length > 0) {
    return res.status(409).send('User already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  // Insert the user data into the database
  pool.query('INSERT INTO users (id, username, password) VALUES (nextval(\'users_id_seq\'), $1, $2) RETURNING id, password',
    [username, hashedPassword],
    (error, results) => {
      if (error) {
        throw error;
      }
      req.flash('success_msg', 'User registered successfully! Please log in.');
      res.redirect('/login');
      // res.status(201).send('User registered successfully!');
      // res.send('User registered successfully!');
    }
  );
});

app.get('/profile', checkNotAuthenticated, async (req, res) => {
  const username = req.user.username;
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Register</title>
        <link rel="icon" type="image/x-icon" href="/assets/favicon.ico">
        <link rel="stylesheet" type="text/css" href="/styles/style.css">
      </head>
      <body style="text-align: center;">
        <nav>
          <ul>
            <li>
              <a href="/">
                <img src="/assets/logo.png" alt="Logo" style="width: 50px; height: auto; vertical-align: middle;">
              </a>
            </li>
            <li><a href="/">Home</a></li>
            <li><a href="/movies">Movies</a></li>
            <li><a href="/library">Library</a></li>
            <li><a href="/profile">My Profile</a></li>
            <li><a href="/logout">Logout</a></li>
          </ul>
        </nav>
        <h1>Hello, ${username}</h1>
        <form action="/profile/change-username" method="POST">
          <label for="new-username">Change Username:</label>
          <input type="text" id="new-username" name="new-username" required>
          <button type="submit">Change</button>
        </form>  
      </body>
    </html>
  `)
});

app.post('/profile/change-username', checkNotAuthenticated, async (req, res) => {

  const userId = req.user.id; // Get the user ID
  const newUsername = req.body['new-username']; // Get the new username from the form

  // Update the username in the database
  pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error updating username');
    }

    // Optionally, you can update the req.user object if needed
    req.user.username = newUsername;

    // Redirect back to the profile page or send a success message
    res.redirect('/profile');
  });
});

// Middleware functions
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function checkAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.id === 1) {
    return next(); // User is authenticated and is the admin
  }
  // Redirect or send an error if the user is not the admin
  res.status(403).send('Access denied. You do not have permission to access this page.');
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});