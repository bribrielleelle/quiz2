// Server-stamped, HMAC-signed quiz start times (timed mode, Feature 1).
// The server signs the moment a question set is served; the client returns the
// token at submission. Clients can verify but never forge a start time.
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

function signStart(quizId, userId) {
  const ts = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ quizId: Number(quizId), userId: Number(userId), ts: ts })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return { serverStart: new Date(ts).toISOString(), startToken: payload + '.' + sig };
}

// Returns the signed start epoch in ms, or null if the token is invalid,
// tampered with, or belongs to a different quiz or user.
function verifyStart(token, quizId, userId) {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Number(data.quizId) !== Number(quizId)) return null;
    if (Number(data.userId) !== Number(userId)) return null;
    if (typeof data.ts !== 'number') return null;
    return data.ts;
  } catch (err) {
    return null;
  }
}

module.exports = { signStart, verifyStart };
