const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// OVERALL LEADERBOARD
// Rule: rank players by total completed attempts across all quizzes (desc).
// Include only users with at least one completed attempt.
// Ties: username ascending (deterministic). Usernames only, never emails.
router.get('/leaderboards', requireAuth, h(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.username, COUNT(a.id)::int AS completed_attempts
       FROM users u
       JOIN attempts a ON a.user_id = u.id
      GROUP BY u.id, u.username
     HAVING COUNT(a.id) >= 1
      ORDER BY completed_attempts DESC, u.username ASC
      LIMIT 50`
  );
  res.json({ leaderboard: rows });
}));

// PER-QUIZ LEADERBOARD
// Rule: rank by each player's highest score on that quiz (desc).
// Ties: more completed attempts first, then username ascending.
// Show raw score out of question count (of the best attempt) so scores are interpretable.
router.get('/quizzes/:quizId/leaderboard', requireAuth, h(async (req, res) => {
  const quiz = await pool.query('SELECT id, title FROM quizzes WHERE id = $1', [req.params.quizId]);
  if (!quiz.rows.length) return res.status(404).json({ error: 'Quiz not found.' });

  const { rows } = await pool.query(
    `SELECT u.username,
            best.best_score,
            best.question_count,
            COUNT(a.id)::int AS completed_attempts
       FROM users u
       JOIN attempts a ON a.user_id = u.id AND a.quiz_id = $1
       JOIN LATERAL (
         SELECT a2.score AS best_score, a2.question_count
           FROM attempts a2
          WHERE a2.user_id = u.id AND a2.quiz_id = $1
          ORDER BY a2.score DESC, a2.completed_at ASC
          LIMIT 1
       ) best ON true
      GROUP BY u.id, u.username, best.best_score, best.question_count
      ORDER BY best.best_score DESC, COUNT(a.id) DESC, u.username ASC
      LIMIT 50`,
    [quiz.rows[0].id]
  );
  res.json({ quiz: quiz.rows[0], leaderboard: rows });
}));

module.exports = router;
