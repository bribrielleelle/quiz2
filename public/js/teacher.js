// Teacher area logic (Phase 4): question editor, quiz settings, CSV import,
// and invite codes. The page is gated here client-side for UX, but the real
// protection is the server-side role check on every /api/teacher route.
let quizzes = [];
let questions = [];
let selectedQuizId = null;
let csvText = null;

const MIN_QUESTIONS = 10;
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function api(url, options) {
  const res = await fetch(url, options);
  let body = null;
  try { body = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok) throw new Error((body && body.error) || 'Request failed');
  return body;
}

async function apiJson(url, method, payload) {
  return api(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

// ---------- quizzes ----------

async function loadQuizzes() {
  const data = await api('/api/teacher/quizzes');
  quizzes = data.quizzes;
  const options = quizzes
    .map((q) => '<option value="' + q.id + '">' + esc(q.title) + '</option>')
    .join('');
  $('quiz-select').innerHTML = options;
  $('qf-quiz').innerHTML = options;
  $('quiz-settings').style.display = quizzes.length ? '' : 'none';
  if (!quizzes.length) {
    document.querySelector('#questions-table tbody').innerHTML =
      '<tr><td colspan="4" class="quiz-meta">No quizzes exist yet — run the seed script or add content via CSV.</td></tr>';
    return;
  }
  if (!quizzes.some((q) => q.id === selectedQuizId)) selectedQuizId = quizzes[0].id;
  $('quiz-select').value = String(selectedQuizId);
  selectQuiz(selectedQuizId);
}

function selectQuiz(id) {
  selectedQuizId = id;
  const q = quizzes.find((x) => x.id === id);
  if (!q) return;
  const state = q.publication_state === 'published'
    ? '<span class="badge badge-gold">PUBLISHED</span>'
    : '<span class="badge">DRAFT</span>';
  $('quiz-meta').innerHTML = state + ' ' + q.question_count + ' question' +
    (q.question_count === 1 ? '' : 's') +
    (q.time_limit_minutes ? ' · ' + q.time_limit_minutes + ' min limit' : ' · untimed');
  $('time-limit').value = q.time_limit_minutes || '';
  $('quiz-description').value = q.description || '';
  $('publish-btn').textContent = q.publication_state === 'published' ? 'UNPUBLISH' : 'PUBLISH';
  $('settings-error').textContent = '';
  loadQuestions();
}

async function saveSettings(ev) {
  ev.preventDefault();
  const raw = $('time-limit').value;
  try {
    await apiJson('/api/teacher/quizzes/' + selectedQuizId, 'PUT', {
      time_limit_minutes: raw === '' ? null : Number(raw),
      description: $('quiz-description').value,
    });
    $('settings-error').textContent = '';
    await loadQuizzes();
  } catch (e) {
    $('settings-error').textContent = e.message;
  }
}

async function togglePublish() {
  const quiz = quizzes.find((x) => x.id === selectedQuizId);
  if (!quiz) return;
  const target = quiz.publication_state === 'published' ? 'draft' : 'published';
  if (target === 'published') {
    if (!confirm('Publish "' + quiz.title + '"? Players will see it immediately.')) return;
  } else {
    if (!confirm('Unpublish "' + quiz.title + '"? Players will no longer see it. Existing attempts are kept.')) return;
  }
  try {
    await apiJson('/api/teacher/quizzes/' + quiz.id, 'PUT', { publication_state: target });
    await loadQuizzes();
  } catch (e) {
    $('settings-error').textContent = e.message;
  }
}

// ---------- questions ----------

async function loadQuestions() {
  if (!selectedQuizId) return;
  const data = await api('/api/teacher/quizzes/' + selectedQuizId + '/questions');
  questions = data.questions;
  const tb = document.querySelector('#questions-table tbody');
  if (!questions.length) {
    tb.innerHTML = '<tr><td colspan="4" class="quiz-meta">No questions yet — add one or import a CSV.</td></tr>';
  } else {
    tb.innerHTML = questions
      .map((q, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + esc(q.prompt) + '</td><td>' + q.correct_choice + '</td>' +
        '<td class="actions-cell"><button class="btn btn-secondary" data-edit="' + q.id + '">EDIT</button>' +
        '<button class="btn btn-danger" data-del="' + q.id + '">DELETE</button></td></tr>')
      .join('');
  }
  const quiz = quizzes.find((x) => x.id === selectedQuizId);
  $('question-count-note').textContent =
    questions.length + ' question' + (questions.length === 1 ? '' : 's') +
    (quiz && quiz.publication_state === 'published'
      ? ' · at least ' + MIN_QUESTIONS + ' are needed to keep this quiz published'
      : ' · at least ' + MIN_QUESTIONS + ' are needed to publish');
  tb.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => startEdit(Number(b.dataset.edit))));
  tb.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', () => deleteQuestion(Number(b.dataset.del))));
}

function openQuestionForm(title) {
  $('question-form').style.display = '';
  $('question-form-title').textContent = title;
  $('question-error').textContent = '';
  $('question-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideQuestionForm() {
  $('question-form').style.display = 'none';
}

function startNew() {
  $('question-id').value = '';
  ['qf-prompt', 'qf-a', 'qf-b', 'qf-c', 'qf-d', 'qf-explanation'].forEach((id) => ($(id).value = ''));
  $('qf-quiz').value = String(selectedQuizId);
  $('qf-correct').value = 'A';
  openQuestionForm('NEW QUESTION');
}

function startEdit(id) {
  const q = questions.find((x) => x.id === id);
  if (!q) return;
  $('question-id').value = q.id;
  $('qf-quiz').value = String(q.quiz_id);
  $('qf-prompt').value = q.prompt;
  $('qf-a').value = q.choice_a;
  $('qf-b').value = q.choice_b;
  $('qf-c').value = q.choice_c;
  $('qf-d').value = q.choice_d;
  $('qf-correct').value = q.correct_choice;
  $('qf-explanation').value = q.explanation || '';
  openQuestionForm('EDIT QUESTION');
}

async function saveQuestion(ev) {
  ev.preventDefault();
  const id = $('question-id').value;
  const payload = {
    quiz_id: Number($('qf-quiz').value),
    prompt: $('qf-prompt').value,
    choice_a: $('qf-a').value,
    choice_b: $('qf-b').value,
    choice_c: $('qf-c').value,
    choice_d: $('qf-d').value,
    correct_choice: $('qf-correct').value,
    explanation: $('qf-explanation').value,
  };
  try {
    const data = id
      ? await apiJson('/api/teacher/questions/' + id, 'PUT', payload)
      : await apiJson('/api/teacher/questions', 'POST', payload);
    if (data.warning) alert(data.warning);
    hideQuestionForm();
    await loadQuizzes();
    await loadQuestions();
  } catch (e) {
    $('question-error').textContent = e.message;
  }
}

async function deleteQuestion(id) {
  const q = questions.find((x) => x.id === id);
  const quiz = quizzes.find((x) => x.id === selectedQuizId);
  if (!q || !quiz) return;
  let msg;
  if (quiz.publication_state === 'published' && quiz.question_count <= MIN_QUESTIONS) {
    msg = 'Delete this question? This quiz is published with only ' + quiz.question_count +
      ' questions, so the quiz will be automatically unpublished.';
  } else if (quiz.publication_state === 'published') {
    msg = 'Delete this question from this published quiz?';
  } else {
    msg = 'Delete this question?';
  }
  if (!confirm(msg)) return;
  try {
    const data = await api('/api/teacher/questions/' + id, { method: 'DELETE' });
    if (data.warning) alert(data.warning);
    await loadQuizzes();
    await loadQuestions();
  } catch (e) {
    alert(e.message);
  }
}

// ---------- CSV import ----------

function readCsvFile() {
  return new Promise((resolve, reject) => {
    const f = $('csv-file').files[0];
    if (!f) return reject(new Error('Choose a CSV file first.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(f);
  });
}

async function previewCsv() {
  $('csv-error').textContent = '';
  $('csv-preview').innerHTML = '';
  $('csv-import-btn').disabled = true;
  let text;
  try {
    text = await readCsvFile();
  } catch (e) {
    $('csv-error').textContent = e.message;
    return;
  }
  try {
    const data = await apiJson('/api/teacher/csv/preview', 'POST', { csv: text });
    csvText = text;
    renderCsvPreview(data);
  } catch (e) {
    csvText = null;
    $('csv-error').textContent = e.message;
  }
}

function renderCsvPreview(data) {
  const allValid = data.validCount === data.rowCount;
  let html = '<p class="csv-preview-note">' + data.validCount + ' of ' + data.rowCount +
    ' rows valid' +
    (allValid
      ? ' — ready to import.'
      : ' — fix the errors below; nothing is imported until every row is valid.') +
    '</p>';
  html += '<table><thead><tr><th>Row</th><th>Quiz</th><th>Question</th><th>Answer</th><th>Result</th></tr></thead><tbody>';
  for (const r of data.rows) {
    const quiz = r.data ? r.data.quizTitle : '';
    const question = r.data ? r.data.prompt : '(invalid row)';
    const answer = r.data ? r.data.correct_choice : '';
    html += '<tr class="' + (r.data ? 'row-valid' : 'row-invalid') + '">' +
      '<td>' + r.row + '</td><td>' + esc(quiz) + '</td><td>' + esc(question) + '</td><td>' + esc(answer) + '</td>';
    html += '<td>' + (r.data
      ? 'OK'
      : '<ul class="error-list">' + r.errors.map((e2) => '<li>' + esc(e2) + '</li>').join('') + '</ul>') +
      '</td></tr>';
  }
  html += '</tbody></table>';
  $('csv-preview').innerHTML = html;
  $('csv-import-btn').disabled = !allValid;
}

async function importCsv() {
  if (!csvText) return;
  if (!confirm('Import these questions into the database? The import cannot be undone.')) return;
  try {
    const data = await apiJson('/api/teacher/csv/import', 'POST', { csv: csvText });
    alert('Imported ' + data.imported + ' question' + (data.imported === 1 ? '' : 's') + '.');
    csvText = null;
    $('csv-preview').innerHTML = '';
    $('csv-import-btn').disabled = true;
    $('csv-file').value = '';
    await loadQuizzes();
    await loadQuestions();
  } catch (e) {
    $('csv-error').textContent = e.message;
  }
}

// ---------- invite codes ----------

async function loadCodes() {
  const data = await api('/api/teacher/invite-codes');
  const tb = document.querySelector('#codes-table tbody');
  if (!data.codes.length) {
    tb.innerHTML = '<tr><td colspan="4" class="quiz-meta">No codes created yet.</td></tr>';
    return;
  }
  tb.innerHTML = data.codes.map((c) => {
    let status;
    if (c.used_at) status = 'Used ' + new Date(c.used_at).toLocaleDateString();
    else if (new Date(c.expires_at) < new Date()) status = 'Expired (unused)';
    else status = 'Valid until ' + new Date(c.expires_at).toLocaleDateString();
    return '<tr><td>' + new Date(c.created_at).toLocaleDateString() + '</td>' +
      '<td>' + new Date(c.expires_at).toLocaleDateString() + '</td>' +
      '<td>' + status + '</td><td>' + esc(c.used_by_username || '—') + '</td></tr>';
  }).join('');
}

async function createCode(ev) {
  ev.preventDefault();
  $('invite-error').textContent = '';
  $('code-display').innerHTML = '';
  try {
    const data = await apiJson('/api/teacher/invite-codes', 'POST', {
      expiry_days: Number($('invite-days').value) || 7,
    });
    $('code-display').innerHTML =
      '<div class="code-box">' + esc(data.code) + '</div>' +
      '<p class="inline-note">Share this code with the new teacher — it is shown only once and works for a single registration.</p>';
    await loadCodes();
  } catch (e) {
    $('invite-error').textContent = e.message;
  }
}

// ---------- page guard + wiring ----------

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await api('/api/auth/me');
    if (user.role !== 'teacher' && user.role !== 'admin') {
      $('gate').style.display = '';
      $('gate-msg').textContent = 'You need a teacher or admin account to use this page.';
      return;
    }
  } catch (e) {
    $('gate').style.display = '';
    $('gate-msg').innerHTML =
      'Log in with a teacher/admin account to use this page. <a href="/login.html">Log in</a>';
    return;
  }

  $('teacher-app').style.display = '';
  $('quiz-select').addEventListener('change', (e) => selectQuiz(Number(e.target.value)));
  $('settings-form').addEventListener('submit', saveSettings);
  $('publish-btn').addEventListener('click', togglePublish);
  $('new-question-btn').addEventListener('click', startNew);
  $('question-form').addEventListener('submit', saveQuestion);
  $('cancel-question-btn').addEventListener('click', hideQuestionForm);
  $('csv-preview-btn').addEventListener('click', previewCsv);
  $('csv-import-btn').addEventListener('click', importCsv);
  $('invite-form').addEventListener('submit', createCode);

  try {
    await loadQuizzes();
  } catch (e) {
    $('gate').style.display = '';
    $('gate-msg').textContent = e.message;
  }
  try {
    await loadCodes();
  } catch (e) { /* codes are non-critical for the page */ }
});
