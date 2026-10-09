const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { verifyStart } = require('../lib/startToken');

const router = express.Router();
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const GRACE_MS = 30 * 1000; // grace window after a timed quiz's deadline

// Submit a completed attempt. The server always scores against its own answer
// key; the browser never supplies a score. Unanswered questions (including
// everything after a time-up auto-submit) are stored with a NULL selection and
// count as incorrect. Nothing is persisted unless this endpoint runs, so an
// unfinished attempt never exists in the database.
router.post('/quizzes/:quizId/attempts', requireAuth, h(async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { rows: quizRows } = await pool.query(
    "SELECT id, time_limit_minutes FROM quizzes WHERE id = $1 AND publication_state = 'published'",
    [quizId]
  );
  const quiz = quizRows[0];
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  const { rows: questions } = await pool.query(
    'SELECT id, correct_choice FROM questions WHERE quiz_id = $1 ORDER BY ordering, id',
    [quiz.id]
  );
  if (!questions.length) return res.status(400).json({ error: 'This quiz has no questions yet.' });

  // Keep only answers that are real questions of this quiz with a real
  // choice letter; anything else counts as unanswered.
  const body = req.body || {};
  const submitted = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const selected = new Map();
  for (const q of questions) {
    const pick = submitted[String(q.id)];
    if (typeof pick === 'string' && /^[ABCD]$/.test(pick)) selected.set(q.id, pick);
  }

  // Timed mode (Feature 1): recompute elapsed time from the server-stamped,
  // signed start token. A manual submission past deadline + grace is treated
  // exactly like a time-up auto-submit: only the answers received are scored.
  const startMs = verifyStart(body.start_token, quiz.id, req.user.id);
  const startedAt = startMs !== null ? new Date(startMs) : new Date();
  let late = false;
  if (quiz.time_limit_minutes && startMs !== null) {
    const deadline = startMs + quiz.time_limit_minutes * 60 * 1000;
    late = Date.now() > deadline + GRACE_MS;
  }

  let score = 0;
  const answerRows = questions.map((q) => {
    const pick = selected.get(q.id) || null;
    if (pick !== null && pick === q.correct_choice) score += 1;
    return [q.id, pick];
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query(
      'INSERT INTO attempts (user_id, quiz_id, score, question_count, started_at, completed_at) ' +
        'VALUES ($1, $2, $3, $4, $5, now()) RETURNING id, score, question_count, completed_at',
      [req.user.id, quiz.id, score, questions.length, startedAt]
    );
    const attempt = ins.rows[0];
    for (const pair of answerRows) {
      await client.query(
        'INSERT INTO attempt_answers (attempt_id, question_id, selected_choice) VALUES ($1, $2, $3)',
        [attempt.id, pair[0], pair[1]]
      );
    }
    await client.query('COMMIT');
    const percentage = Math.round((attempt.score / attempt.question_count) * 100);
    res.status(201).json({
      attempt: Object.assign({}, attempt, { percentage: percentage, late: late }),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// The logged-in user's completed-attempt history, newest first.
router.get('/me/attempts', requireAuth, h(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT a.id, a.quiz_id, q.title AS quiz_title, a.score, a.question_count, a.completed_at ' +
      'FROM attempts a JOIN quizzes q ON q.id = a.quiz_id ' +
      'WHERE a.user_id = $1 ORDER BY a.completed_at DESC, a.id DESC',
    [req.user.id]
  );
  res.json({ attempts: rows });
}));

// Read-only review of one attempt (Feature 2). Owner-only: another player's
// attempt returns 404 (never 403) so its existence is not leaked. Teachers and
// admins may review any attempt. The review shows each question as it
// currently exists; the recorded score and question count never change.
router.get('/me/attempts/:attemptId/review', requireAuth, h(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT a.id, a.user_id, a.quiz_id, a.score, a.question_count, a.started_at, a.completed_at, ' +
      'q.title AS quiz_title FROM attempts a JOIN quizzes q ON q.id = a.quiz_id WHERE a.id = $1',
    [req.params.attemptId]
  );
  const attempt = rows[0];
  if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
  const isOwner = attempt.user_id === req.user.id;
  const isStaff = req.user.role === 'teacher' || req.user.role === 'admin';
  if (!isOwner && !isStaff) return res.status(404).json({ error: 'Attempt not found.' });

  const { rows: questions } = await pool.query(
    'SELECT x.selected_choice, qs.prompt, qs.choice_a, qs.choice_b, qs.choice_c, qs.choice_d, ' +
      'qs.correct_choice, qs.explanation ' +
      'FROM attempt_answers x JOIN questions qs ON qs.id = x.question_id ' +
      'WHERE x.attempt_id = $1 ORDER BY qs.ordering, qs.id',
    [attempt.id]
  );

  delete attempt.user_id;
  const percentage = Math.round((attempt.score / attempt.question_count) * 100);
  res.json({ attempt: Object.assign({}, attempt, { percentage: percentage }), questions: questions });
}));

module.exports = router;
