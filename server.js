require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
require('./db'); // initializes pg pool from DATABASE_URL

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: 'ghsqui.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// One Express server serves both the static frontend and the JSON API.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/quizzes'));
app.use('/api', require('./routes/leaderboards'));

// API 404 and error handling
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('GHSQUI listening on http://localhost:' + PORT));
