const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const USERNAME_RE = /^[A-Za-z0-9_-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Current logged-in user (used by the nav bar and page guards).
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in.' });
  res.json({ user: req.user });
});

router.post('/register', h(async (req, res) => {
  const { username, email, password, invite_code } = req.body || {};
  if (!USERNAME_RE.test(username || ''))
    return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, _ or -.' });
  if (!EMAIL_RE.test(email || ''))
    return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const client = await pool.connect();
  let inviteId = null;
  try {
    await client.query('BEGIN');

    // Public registration never lets a registrant choose the role.
    // Only a valid, unused, unexpired invite code grants teacher/admin.
    let role = 'player';
    if (typeof invite_code === 'string' && invite_code.trim()) {
      const code = await client.query(
        'SELECT id FROM invite_codes ' +
          'WHERE code_hash = $1 AND used_by IS NULL AND expires_at > now() FOR UPDATE',
        [sha256(invite_code.trim())]
      );
      if (!code.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invite code is invalid, used, or expired.' });
      }
      role = 'teacher';
      inviteId = code.rows[0].id;
    }

    const dup = await client.query(
      'SELECT 1 FROM users WHERE username_normalized = $1 OR email_normalized = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );
    if (dup.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'That username or email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const ins = await client.query(
      'INSERT INTO users (username, username_normalized, email, email_normalized, password_hash, role) ' +
        'VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role',
      [username, username.toLowerCase(), email, email.toLowerCase(), passwordHash, role]
    );
    const user = ins.rows[0];

    if (inviteId)
      await client.query('UPDATE invite_codes SET used_by = $1, used_at = now() WHERE id = $2', [
        user.id, inviteId,
      ]);

    await client.query('COMMIT');
    req.session.userId = user.id;
    res.status(201).json({ user });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

router.post('/login', h(async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password)
    return res.status(400).json({ error: 'Enter your username/email and password.' });

  const { rows } = await pool.query(
    'SELECT id, username, role, password_hash FROM users WHERE username_normalized = $1 OR email_normalized = $1',
    [String(identifier).toLowerCase()]
  );
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Incorrect username/email or password.' });

  req.session.userId = user.id;
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
