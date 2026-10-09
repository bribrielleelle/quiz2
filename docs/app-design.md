# GHSQUI App Design

How the app is structured for players and teachers: navigation, page designs, and leaderboard rules. Implementation status: the Phase 2 foundation and leaderboard SQL exist in code; quiz-taking and teacher pages arrive in Phases 3–4 as designed here.

## Navigation map

```
GHSQUI badge (top-left, links home)   Quizzes · Leaderboards · My History   [user] LOG IN/OUT ◐
- / (Quiz list)           all visitors; taking a quiz requires login
- /quiz.html?id=X (Take) players only (redirects to login when signed out)
- result + review flow    players only (reached after submission / from history)
- /history.html           players only (own attempts only)
- /leaderboards.html     signed-in players (overall + per-quiz)
- /login.html /register.html  unauthenticated
- /teacher.html           teacher/admin only (nav link visible only to them)
```

Global nav rules: the theme toggle (◐) works everywhere; signed-out visitors see LOG IN; signed-in users see their username and LOG OUT. Teacher-only links render only for teacher/admin roles — but every protected API route re-checks the role server-side.

## Page design details

All pages share the GHSQUI visual theme (see docs/visual-theme.md): navy header with gold underline, Poppins headings, Inter body, pixel-corner cards and PRESS-START buttons, light default with a dark mode toggle.

### Quiz list (/)
Hero: pixel badge + tagline "GHSQUI: high school quiz universe". Below, one pixel-corner card per published quiz: title, description, question count, a gold TIMED badge with the limit when set, and a PRESS START button linking to /quiz.html?id=X. States: loading skeleton; empty state "No quizzes yet — check back soon!"; when signed out, PLAY redirects to login.

### Login / Register
Single-column pixel card forms. Register: username, email, password (min 8), optional hidden-capacity invite code field labeled "Teacher invite code (optional)". Inline field errors under the form; success redirects to /. Login accepts username or email.

### Take quiz (/quiz.html) — Phase 3
Question counter ("3 / 10") and gold pixel countdown when timed. One question per screen, four chunky choice buttons (A–D), instant select styling, NEXT/PREV. If timed and the clock hits zero: lock + "TIME'S UP!" flash + auto-submit.

### Result — Phase 3
Big pixel score readout: "SCORE 8/10 · 80%". Perfect score gets the gold "NEW HIGH SCORE" header. RETRY (PRESS START) button and REVIEW ANSWERS button (Feature 2), plus BACK TO QUIZZES.

### Review — Phase 3
Read-only list: each question with your choice (gold CORRECT! / red MISS), the correct answer, and the teacher explanation when present. Reachable from the result page and from every history row.

### My history (/history.html) — Phase 3
Table of own completed attempts: quiz, score (x/y), percentage, completion time (localized), REVIEW link per row. Empty state: "Finish a quiz to start your history!"

### Leaderboards (/leaderboards.html)
Two tabs: OVERALL and PER QUIZ (quiz selector). Gold rank-1 row. Rankings and tie-breaks are defined below.

### Teacher area (/teacher.html) — Phase 4
Tabs: QUESTION EDITOR · CSV IMPORT · INVITE CODES (admin). Editor: quiz picker, question list, edit form (prompt, four choices, correct choice, explanation), quiz settings (title, description, time limit, publish toggle blocked below 10 questions, with confirmation dialogs on removals). CSV: download template, upload, preview table with row-level errors, IMPORT button disabled until validation passes, confirmation of rows added. Invites: generate code with expiry; list of codes with used/expired state.

## Leaderboard rules

- **Overall:** rank users by total completed attempts across all quizzes (descending). Include only users with at least one completed attempt. Ties sort by username ascending. Display: rank, username, attempt count.
- **Per quiz:** rank by each user's highest score on that quiz (descending). Ties: more completed attempts first, then username ascending. Display: rank, username, best score out of the question count (of the best attempt) with percentage, attempt count.
- Only usernames are ever displayed — never emails.
- Only submitted attempts count. Unsubmitted work never appears in history, counts, or leaderboards.
- Both leaderboards are implemented in routes/leaderboards.js with ORDER BY clauses that make the tie-breaks deterministic.

## Responsive and accessibility notes

- Single-column layout below 600px; nav wraps.
- Forms use labels and inline errors; buttons are real elements with focus states.
- Color is never the only signal: correct/incorrect marks also use text (CORRECT!/MISS).
- Countdown shows numbers, not just a shrinking bar.
