# GHSQUI Individual Feature Specs

Operational detail for the two individual features selected for this project. Both are already specified in the quiz app specification and acceptance criteria (14–15); this document defines exactly how each works at implementation level. The nerdy-playful arcade mood of the visual theme is expressed in presentation only — it does not add scope.

## Feature 1 — Timed quiz mode

### Setup
- A teacher sets `time_limit_minutes` on a quiz in the question editor (blank or 0 means untimed). Stored on the `quizzes` table.

### Starting a timed quiz
- Loading a quiz asks the server for the question set; the server stamps a start time and returns it with the questions. No attempt record is created yet — an attempt only exists at submission.
- The client counts down from the server-provided start time (never the browser clock), rendered as a gold pixel-font countdown. Untimed quizzes show no countdown.

### During the quiz
- The player answers normally; a progress bar fills as questions are answered.

### Expiry — auto-submit
- At 0:00 the UI locks the questions, shows a "TIME'S UP!" arcade flash, and auto-submits whatever was answered.
- Unanswered questions are recorded with a NULL selected choice and score as incorrect. This auto-submission is a submission event: the attempt counts as complete and appears in history.

### Server enforcement
- The submission endpoint recomputes elapsed time from the server-stamped start time.
- A manual submission arriving within the deadline plus a 30-second grace window is scored normally; one arriving later is treated exactly like an auto-submit (only answers received are scored).
- The server always scores against its own answer key; it never trusts a browser-supplied score.

### Data
- `quizzes.time_limit_minutes`, `attempts.start_time`, `attempt_answers.selected_choice` (NULL = unanswered).

### Acceptance tests
- A quiz with a 1-minute limit auto-submits on expiry and appears in history with unanswered questions scored as incorrect.
- An untimed quiz shows no countdown and behaves exactly as before.
- A submission after deadline + grace scores only the answers received.
- Attempt records survive a server restart.

## Feature 2 — Post-quiz answer review with explanations

### Authoring
- Teachers can attach an optional explanation to each question, in the editor and via the `explanation` column of the CSV template.

### On submission
- The server saves the attempt, plus one `attempt_answers` row for every question (selected choice, or NULL if unanswered).
- The result page lists each question with: the player's answer (gold "CORRECT!" / red "MISS" styling), the correct answer, and the explanation when one exists.
- A perfect score triggers a gold "NEW HIGH SCORE"-style header on the result page (presentation of the same feature, not new scope).

### From history
- Every row in attempt history links to a read-only review page of that attempt with the same per-question breakdown.
- The review shows question text as it currently exists; if a teacher edits a question later, the recorded score and question count do not change (per spec).

### Access control
- `GET /api/me/attempts/:attemptId/review` is owner-only: the server checks the attempt belongs to the logged-in user (teacher/admin may also view).
- Another player's review returns 404, never 403 with a hint that the attempt exists.

### Data
- `questions.explanation`, `attempt_answers` (both already in the data model proposal).

### Acceptance tests
- After submitting, the player sees per-question right/wrong with explanations.
- The same review is reachable from history after a server restart.
- Another player cannot open someone else's review.
- Attempts with NULL answers show those questions as missed.

## Out of scope

Gamification extras (achievement badges, streaks, XP/leveling) were reviewed but are not part of the two selected features. They may be considered as future additions after the shared requirements and these two features pass QA.
