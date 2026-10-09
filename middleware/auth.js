const { pool } = require('../db');

// Attaches the logged-in user (fresh from DB so role changes apply immediately).
async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const { rows } = await pool.query(
        'SELECT id, username, role FROM users WHERE id = $1',
        [req.session.userId]
      );
      if (rows.length) req.user = rows[0];
      else delete req.session.userId; // user deleted; treat as logged out
    } catch (err) {
      return next(err);
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Log in required.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Log in required.' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
