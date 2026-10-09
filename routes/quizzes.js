const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Published quizzes with question counts (public browsing).
router.get('/quizzes', h(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT q.id, q.title, q.description, q.time_limit_minutes,
            COALESCE(COUNT(x.id), 0)::int AS question_count
       FROM quizzes q
       LEFT JOIN questions x ON x.quiz_id = q.id
      WHERE q.publication_state = 'published'
      GROUP BY q.id
      ORDER BY q.title ASC`
  );
  res.json({ quizzes: rows });
}));

// Quiz detail with questions. Never includes correct_choice or explanations.
router.get('/quizzes/:quizId', requireAuth, h(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, description, time_limit_minutes, publication_state
       FROM quizzes WHERE id = $1`,
    [req.params.quizId]
  );
  const quiz = rows[0];
  if (!quiz || quiz.publication_state !== 'published')
    return res.status(404).json({ error: 'Quiz not found.' });

  const { rows: questions } = await pool.query(
    `SELECT id, prompt, choice_a, choice_b, choice_c, choice_d
       FROM questions WHERE quiz_id = $1 ORDER BY ordering, id`,
    [quiz.id]
  );
  delete quiz.publication_state;
  res.json({ quiz, questions });
}));

module.exports = router;
