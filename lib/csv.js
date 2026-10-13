// Shared CSV parsing + validation for the teacher import (Phase 4).
// Deliberately dependency-free: a small RFC-4180-style parser plus the
// row-level rules from the specification. Both preview and import use the
// exact same code, so the file a teacher previews is the file that imports.

const COLUMNS = [
  'quiz', 'question', 'choice_a', 'choice_b', 'choice_c', 'choice_d',
  'correct_choice', 'explanation',
];

// Parses CSV text into rows of raw strings. Supports quoted fields, doubled
// quotes inside quotes, and CRLF or LF line endings. Comment lines (a single
// field starting with '#') and blank lines are ignored.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text || '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => {
    const isComment = r.length === 1 && r[0].trim().startsWith('#');
    const isBlank = r.every((f) => f.trim() === '');
    return !isComment && !isBlank;
  });
}

// Validates parsed rows against the specification. quizTitles maps a trimmed
// quiz title to its id. Returns { headerError, rows } where each row is
// { row, data, errors }: data is present only when the row is valid.
function validateCsvRows(parsed, quizTitles) {
  if (!parsed.length)
    return { headerError: 'The file is empty (or contains only comments).', rows: [] };

  const header = parsed[0].map((f) => f.trim().toLowerCase());
  if (header.join(',') !== COLUMNS.join(','))
    return { headerError: 'The header row must be exactly: ' + COLUMNS.join(','), rows: [] };

  const rows = [];
  parsed.slice(1).forEach((r, i) => {
    const rowNumber = i + 2; // CSV row number; the header is row 1
    const errors = [];
    const get = (idx) => (r[idx] === undefined ? '' : String(r[idx]).trim());

    const quizTitle = get(0);
    const prompt = get(1);
    const choices = [get(2), get(3), get(4), get(5)];
    const correct = get(6).toUpperCase();
    const explanation = get(7);

    if (!quizTitle) errors.push('quiz is required.');
    else if (!Object.prototype.hasOwnProperty.call(quizTitles, quizTitle))
      errors.push("Quiz '" + quizTitle + "' does not exist. Use an exact title from the template.");

    if (!prompt) errors.push('question is required.');
    else if (prompt.length > 500) errors.push('question is too long (max 500 characters).');

    ['choice_a', 'choice_b', 'choice_c', 'choice_d'].forEach((name, j) => {
      if (!choices[j]) errors.push(name + ' is required.');
      else if (choices[j].length > 200) errors.push(name + ' is too long (max 200 characters).');
    });

    if (!/^[ABCD]$/.test(correct)) errors.push('correct_choice must be A, B, C, or D.');
    if (explanation.length > 500) errors.push('explanation is too long (max 500 characters).');

    const data = errors.length
      ? null
      : {
          quizId: quizTitles[quizTitle],
          quizTitle: quizTitle,
          prompt: prompt,
          choice_a: choices[0],
          choice_b: choices[1],
          choice_c: choices[2],
          choice_d: choices[3],
          correct_choice: correct,
          explanation: explanation || null,
        };
    rows.push({ row: rowNumber, data: data, errors: errors });
  });

  return { headerError: null, rows: rows };
}

// Builds the downloadable template. The comment lines (including the list of
// valid quiz titles) are ignored by the parser, so the file previews clean.
function buildTemplate(quizTitles) {
  const lines = [
    '# GHSQUI question import template - one question per row.',
    '# Lines starting with # are ignored. Import is add-only (new questions only).',
    '# quiz must match an existing quiz title exactly (case-sensitive). Valid titles:',
  ];
  for (const title of quizTitles) lines.push('#   ' + title);
  lines.push('# correct_choice must be A, B, C, or D. explanation is optional.');
  lines.push(COLUMNS.join(','));
  return lines.join('\r\n') + '\r\n';
}

module.exports = { COLUMNS, parseCsv, validateCsvRows, buildTemplate };
