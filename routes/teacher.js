// Teacher/admin authoring API (Phase 4). Every route in this router is
// staff-only and the check is enforced server-side by requireRole, so a
// player cannot reach an authoring path even by calling the API directly.
const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { requireRole } = require('../middleware/auth');
const { parseCsv, validateCsvRows, buildTemplate } = require('../lib/csv');

const router = express.Router();
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireRole('teacher', 'admin'));

const MIN_QUESTIONS_TO_PUBLISH = 10;

// ---------- quizzes ----------

// All quizzes (draft + published) with question counts, for the editor view.
router.get('/quizzes', h(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT q.id, q.title, q.description, q.publication_state, q.time_limit_minutes, ' +
      'COALESCE(COUNT(x.id), 0)::int AS question_count ' +
      'FROM quizzes q LEFT JOIN questions x ON x.quiz_id = q.id ' +
      'GROUP BY q.id ORDER BY q.title ASC'
  );
  res.json({ quizzes: rows });
}));

// Quiz settings: description, optional time limit, publish / unpublish.
// Publishing requires the ten-question minimum; unpublishing is always allowed.
router.put('/quizzes/:quizId', h(async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { rows } = await pool.query(
    'SELECT id, title, description, publication_state, time_limit_minutes FROM quizzes WHERE id = $1',
    [quizId]
  );
  const quiz = rows[0];
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  const body = req.body || {};
  const update = {};

  if (typeof body.description === 'string') {
    const d = body.description.trim();
    update.description = d ? d.slice(0, 300) : null;
  }

  if (body.time_limit_minutes !== undefined) {
    const raw = body.time_limit_minutes;
    if (raw === null || raw === '' || Number(raw) === 0) {
      update.time_limit_minutes = null;
    } else {
      const mins = Number(raw);
      if (!Number.isInteger(mins) || mins < 1 || mins > 180)
        return res.status(400).json({ error: 'Time limit must be blank, 0, or 1-180 minutes.' });
      update.time_limit_minutes = mins;
    }
  }

  if (body.publication_state !== undefined) {
    const target = body.publication_state;
    if (target === 'published') {
      const { rows: countRows } = await pool.query(
        'SELECT COUNT(*)::int AS n FROM questions WHERE quiz_id = $1',
        [quizId]
      );
      if (countRows[0].n < MIN_QUESTIONS_TO_PUBLISH)
        return res.status(400).json({
          error: 'A quiz needs at least ' + MIN_QUESTIONS_TO_PUBLISH +
            ' valid questions before it can be published (currently ' + countRows[0].n + ').',
        });
      update.publication_state = 'published';
    } else if (target === 'draft') {
      update.publication_state = 'draft';
    } else {
      return res.status(400).json({ error: 'publication_state must be "published" or "draft".' });
    }
  }

  const keys = Object.keys(update);
  if (!keys.length) return res.json({ quiz });
  const sets = keys.map((k, i) => k + ' = $' + (i + 2)).join(', ');
  const { rows: updated } = await pool.query(
    'UPDATE quizzes SET ' + sets + ', updated_at = now() WHERE id = $1 ' +
      'RETURNING id, title, description, publication_state, time_limit_minutes',
    [quizId, ...keys.map((k) => update[k])]
  );
  res.json({ quiz: updated[0] });
}));

// ---------- questions ----------

// Shared validation for create/update.
function validateQuestionBody(body) {
  const errors = [];
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const choices = ['choice_a', 'choice_b', 'choice_c', 'choice_d'].map(
    (k) => (typeof body[k] === 'string' ? body[k].trim() : '')
  );
  const correct = typeof body.correct_choice === 'string'
    ? body.correct_choice.trim().toUpperCase() : '';
  const explanation = typeof body.explanation === 'string' && body.explanation.trim()
    ? body.explanation.trim().slice(0, 500) : null;

  if (!prompt) errors.push('Prompt is required.');
  else if (prompt.length > 500) errors.push('Prompt is too long (max 500 characters).');
  choices.forEach((c, i) => {
    const letter = 'ABCD'[i];
    if (!c) errors.push('Choice ' + letter + ' is required.');
    else if (c.length > 200) errors.push('Choice ' + letter + ' is too long (max 200 characters).');
  });
  if (!/^[ABCD]$/.test(correct)) errors.push('Correct choice must be A, B, C, or D.');
  return { errors, prompt, choices, correct, explanation };
}

// Full question data (including correct_choice + explanation) for the editor.
router.get('/quizzes/:quizId/questions', h(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, quiz_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, ordering ' +
      'FROM questions WHERE quiz_id = $1 ORDER BY ordering, id',
    [req.params.quizId]
  );
  res.json({ questions: rows });
}));

// Add a question to a quiz.
router.post('/questions', h(async (req, res) => {
  const body = req.body || {};
  const quizId = Number(body.quiz_id);
  const { errors, prompt, choices, correct, explanation } = validateQuestionBody(body);
  if (!Number.isInteger(quizId) || quizId <= 0) errors.push('Choose a quiz.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quiz = await client.query('SELECT id FROM quizzes WHERE id = $1', [quizId]);
    if (!quiz.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    const max = await client.query(
      'SELECT COALESCE(MAX(ordering), 0)::int AS m FROM questions WHERE quiz_id = $1',
      [quizId]
    );
    const ins = await client.query(
      'INSERT INTO questions (quiz_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, ordering) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [quizId, prompt, choices[0], choices[1], choices[2], choices[3], correct, explanation, max.rows[0].m + 1]
    );
    await client.query('COMMIT');
    res.status(201).json({ question: ins.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// Edit a question, including reassigning it to another quiz. Reassigning away
// from a published quiz can drop it below the ten-question minimum, so the
// source quiz is automatically unpublished and a warning is returned.
router.put('/questions/:questionId', h(async (req, res) => {
  const questionId = Number(req.params.questionId);
  const body = req.body || {};
  const quizId = Number(body.quiz_id);
  const { errors, prompt, choices, correct, explanation } = validateQuestionBody(body);
  if (!Number.isInteger(quizId) || quizId <= 0) errors.push('Choose a quiz.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT id, quiz_id FROM questions WHERE id = $1',
      [questionId]
    );
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Question not found.' });
    }
    const target = await client.query('SELECT id FROM quizzes WHERE id = $1', [quizId]);
    if (!target.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    const fromQuizId = current.rows[0].quiz_id;

    await client.query(
      'UPDATE questions SET quiz_id = $1, prompt = $2, choice_a = $3, choice_b = $4, ' +
        'choice_c = $5, choice_d = $6, correct_choice = $7, explanation = $8, updated_at = now() ' +
        'WHERE id = $9',
      [quizId, prompt, choices[0], choices[1], choices[2], choices[3], correct, explanation, questionId]
    );

    let warning = null;
    if (fromQuizId !== quizId) {
      // Put the moved question at the end of its new quiz.
      const max = await client.query(
        'SELECT COALESCE(MAX(ordering), 0)::int AS m FROM questions WHERE quiz_id = $1',
        [quizId]
      );
      await client.query('UPDATE questions SET ordering = $1 WHERE id = $2', [
        max.rows[0].m + 1, questionId,
      ]);
      // The source quiz may now be below the publish minimum.
      const src = await client.query(
        'SELECT title, publication_state FROM quizzes WHERE id = $1',
        [fromQuizId]
      );
      if (src.rows[0] && src.rows[0].publication_state === 'published') {
        const left = await client.query(
          'SELECT COUNT(*)::int AS n FROM questions WHERE quiz_id = $1',
          [fromQuizId]
        );
        if (left.rows[0].n < MIN_QUESTIONS_TO_PUBLISH) {
          await client.query(
            "UPDATE quizzes SET publication_state = 'draft', updated_at = now() WHERE id = $1",
            [fromQuizId]
          );
          warning = "Quiz '" + src.rows[0].title +
            "' now has fewer than ten questions and was automatically unpublished.";
        }
      }
    }
    await client.query('COMMIT');
    const q = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
    res.json({ question: q.rows[0], warning: warning });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// Delete a question. A question that appears in any submitted attempt cannot
// be deleted (the schema keeps history intact); it can be edited instead.
// Deleting from a published quiz that would fall below ten questions
// automatically unpublishes the quiz, per the specification.
router.delete('/questions/:questionId', h(async (req, res) => {
  const questionId = Number(req.params.questionId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT x.id, x.quiz_id, q.title, q.publication_state ' +
        'FROM questions x JOIN quizzes q ON q.id = x.quiz_id WHERE x.id = $1',
      [questionId]
    );
    const question = rows[0];
    if (!question) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Question not found.' });
    }
    const used = await client.query(
      'SELECT 1 FROM attempt_answers WHERE question_id = $1 LIMIT 1',
      [questionId]
    );
    if (used.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This question is part of existing completed attempts and cannot be deleted. ' +
          'Edit it instead, or reassign it to keep history intact.',
      });
    }
    let warning = null;
    if (question.publication_state === 'published') {
      const left = await client.query(
        'SELECT COUNT(*)::int AS n FROM questions WHERE quiz_id = $1',
        [question.quiz_id]
      );
      if (left.rows[0].n - 1 < MIN_QUESTIONS_TO_PUBLISH) {
        await client.query(
          "UPDATE quizzes SET publication_state = 'draft', updated_at = now() WHERE id = $1",
          [question.quiz_id]
        );
        warning = "Quiz '" + question.title +
          "' now has fewer than ten questions and was automatically unpublished. " +
          'Add questions and publish it again when ready.';
      }
    }
    await client.query('DELETE FROM questions WHERE id = $1', [questionId]);
    await client.query('COMMIT');
    res.json({ ok: true, warning: warning });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// ---------- CSV import (add-only) ----------

async function loadQuizTitles() {
  const { rows } = await pool.query('SELECT id, title FROM quizzes ORDER BY title ASC');
  const map = {};
  const titles = [];
  for (const r of rows) {
    const t = r.title.trim();
    map[t] = r.id;
    titles.push(t);
  }
  return { map, titles };
}

// The downloadable template: expected header + the valid quiz titles.
router.get('/csv/template', h(async (req, res) => {
  const { titles } = await loadQuizTitles();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ghsqui-questions-template.csv"');
  res.send(buildTemplate(titles));
}));

// Preview: parse + validate the uploaded text, write nothing to the database.
router.post('/csv/preview', h(async (req, res) => {
  const csv = req.body && req.body.csv;
  if (typeof csv !== 'string' || !csv.trim())
    return res.status(400).json({ error: 'Choose a CSV file to preview.' });
  const { map } = await loadQuizTitles();
  const result = validateCsvRows(parseCsv(csv), map);
  if (result.headerError) return res.status(400).json({ error: result.headerError });
  const validCount = result.rows.filter((r) => r.data).length;
  res.json({ rowCount: result.rows.length, validCount: validCount, rows: result.rows });
}));

// Import: re-validate the uploaded text, then insert every valid row in one
// transaction. A single invalid row rejects the whole file (no partial writes).
router.post('/csv/import', h(async (req, res) => {
  const csv = req.body && req.body.csv;
  if (typeof csv !== 'string' || !csv.trim())
    return res.status(400).json({ error: 'Choose a CSV file to import.' });
  const { map } = await loadQuizTitles();
  const result = validateCsvRows(parseCsv(csv), map);
  if (result.headerError) return res.status(400).json({ error: result.headerError });
  const invalid = result.rows.filter((r) => !r.data);
  if (invalid.length)
    return res.status(400).json({
      error: 'Import rejected: ' + invalid.length + ' invalid row' +
        (invalid.length > 1 ? 's' : '') + '. Nothing was written to the database.',
      rowCount: result.rows.length,
      rows: result.rows,
    });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const nextOrder = {};
    let imported = 0;
    for (const r of result.rows) {
      const d = r.data;
      if (!(d.quizId in nextOrder)) {
        const max = await client.query(
          'SELECT COALESCE(MAX(ordering), 0)::int AS m FROM questions WHERE quiz_id = $1',
          [d.quizId]
        );
        nextOrder[d.quizId] = max.rows[0].m + 1;
      }
      await client.query(
        'INSERT INTO questions (quiz_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, ordering) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [d.quizId, d.prompt, d.choice_a, d.choice_b, d.choice_c, d.choice_d,
          d.correct_choice, d.explanation, nextOrder[d.quizId]++]
      );
      imported++;
    }
    await client.query('COMMIT');
    res.json({ imported: imported });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// ---------- invite codes ----------

// Codes are shown once at creation; only their SHA-256 hash is stored.
function generateCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no easily confused characters
  let code = '';
  for (let group = 0; group < 4; group++) {
    if (group) code += '-';
    for (let i = 0; i < 4; i++) code += alphabet[crypto.randomInt(alphabet.length)];
  }
  return code;
}

// Codes this teacher/admin has created, with use status.
router.get('/invite-codes', h(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT c.id, c.expires_at, c.created_at, c.used_at, u.username AS used_by_username ' +
      'FROM invite_codes c LEFT JOIN users u ON u.id = c.used_by ' +
      'WHERE c.created_by = $1 ORDER BY c.created_at DESC, c.id DESC',
    [req.user.id]
  );
  res.json({ codes: rows });
}));

// Create a single-use invite code with an expiry of 1-90 days.
router.post('/invite-codes', h(async (req, res) => {
  const days = Number((req.body || {}).expiry_days || 7);
  if (!Number.isInteger(days) || days < 1 || days > 90)
    return res.status(400).json({ error: 'Expiry must be 1-90 days.' });
  const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    try {
      const { rows } = await pool.query(
        'INSERT INTO invite_codes (code_hash, created_by, expires_at) ' +
          "VALUES ($1, $2, now() + ($3 || ' days')::interval) RETURNING id, expires_at",
        [sha256(code), req.user.id, String(days)]
      );
      return res.status(201).json({ code: code, expires_at: rows[0].expires_at });
    } catch (err) {
      if (attempt === 2) throw err; // give up after the (unlikely) collision retries
    }
  }
}));

module.exports = router;
