# Quiz App Specification

## Purpose

Build a web app for students to take quizzes, review their completed-attempt history, and compare results on leaderboards. Teachers can maintain quiz questions through an editor or validated CSV import.

This is a planning document only. No application code is being built yet.

## Agreed technology and environments

- **Frontend:** plain HTML, CSS, and browser JavaScript.
- **Server:** Node.js 24 LTS and Express 5. One Express server serves both static frontend files and JSON API routes.
- **Package management:** npm. Commit `package.json` and `package-lock.json`.
- **Database:** Replit PostgreSQL, accessed with `pg` and parameterized SQL.
- **Persistence:** all durable app data lives in PostgreSQL and remains available after server restarts.
- **Development and QA:** Replit development workspace and its development database.
- **Production:** Replit Deployment with a separate production database. Apply schema changes to each environment deliberately; do not point production at the development database.
- **Source and records:** GitHub stores source code, documentation, and development history.
- **AI development environment:** Mistral Code.

Keep the same application stack in development and production. Store database connection details in environment secrets, never in source control. Use versioned SQL migrations or an equivalent repeatable schema process.

## Users and permissions

### Player

- Register, log in, and log out.
- Browse published quizzes and take them.
- Submit a completed quiz and see the score and percentage correct.
- Retry a quiz; each submitted retry is a separate completed attempt.
- View their own completed-attempt history.
- View the overall and per-quiz leaderboards.

### Teacher/admin

- Use all quiz-taking capabilities available to a player.
- Add and edit questions, their four choices, the correct choice, and quiz assignment.
- Preview and validate a CSV upload before importing questions.
- See row-specific validation errors before import.

Role checks must be enforced by the server on every protected API route, not only by hiding frontend controls. Public registration must never allow a registrant to select the teacher/admin role. A trusted provisioning process assigns elevated roles.

### Teacher/admin provisioning

Teacher/admin accounts are created through single-use invite codes:

- Any existing teacher/admin can generate a single-use invite code with an expiry date.
- A registrant who supplies a valid, unused, unexpired code receives the teacher/admin role; ordinary registrants always become players.
- Applying a code marks it used and records who used it; codes cannot be reused.
- The very first teacher/admin in each environment is created by a one-time bootstrap script that reads a secret from environment variables and runs once per database. After bootstrap, all further elevated accounts come from invite codes.
- Invite-code creation and use are logged with the acting user.

## Quiz behavior

- The app contains five working quizzes at launch.
- Each published quiz has at least ten questions.
- Each question has a prompt, exactly four answer choices, and exactly one correct answer.
- A player selects a quiz, answers its questions, and submits it.
- On submission, show the raw score, question count, and percentage correct.
- Offer a retry that starts a new attempt.
- A submission is the completion event. Do not count a quiz that has not been submitted.
- Avoid creating a completed-attempt record before submission. Incomplete work is not a leaderboard entry or completion.

The five launch quizzes are the Pusheen trivia sets: Meet Pusheen, Pusheen's Family Tree, Pusheen's Pals, The Story of Pusheen, and Pusheen Merch & Media Mania. Quiz content must be reviewed before launch so every published quiz meets the ten-question minimum.

The quizzes use facts about the Pusheen brand as subject matter. Draft questions live in `docs/quiz-content-plan.md`. The app's own branding and artwork remain original: Pusheen's imagery is copyrighted and trademarked and must not appear in the app's UI or logo.

## Accounts and security

- Store a password hash only; never store or log a plaintext password.
- Use a password-hashing algorithm designed for passwords, with per-password salts and an appropriate work factor.
- Use server-managed sessions with an `HttpOnly` cookie, appropriate `SameSite` settings, and `Secure` enabled in production.
- Validate and normalize registration, login, quiz submission, and teacher input on the server.
- Use parameterized SQL for all values supplied to queries.
- Return only public usernames on leaderboards; do not expose email addresses.
- Apply authorization checks to teacher routes and ownership checks to personal history.

## Attempt history and persistence

Every submitted attempt, including a retry, is stored with:

- user
- quiz
- score
- question count
- completion date and time

Each attempt is an immutable completion record. A user can read only their own history. Unsubmitted quizzes do not appear in history and do not contribute to counts or scores.

Each submitted attempt also stores the selected answer for every question (a separate attempt_answers record per question). These records make Feature 2 review possible without changing what counts as a completion.

## Leaderboards

### Overall

- Rank users by their total number of completed quiz attempts across all quizzes.
- Include users with at least one completed attempt.
- Display usernames, never email addresses.
- Use a deterministic secondary sort (username ascending) so tied totals appear consistently.

### Per quiz

- Include users with at least one completed attempt for that quiz.
- Show each user's highest score and number of completed attempts for that quiz.
- Rank primarily by highest score, as required.
- For ties, sort by completed-attempt count descending and then username ascending.
- Display raw score and question count (and optionally percentage) so the score is interpretable.

## Teacher question editor

- Restrict editor and save routes to teacher/admin users.
- Allow a teacher to choose a quiz and add or edit a question's prompt, four choices, correct choice, and quiz assignment.
- Validate that the question has all required values and one correct choice.
- Prevent publishing a quiz with fewer than ten valid questions.
- Ask for confirmation before removing a question or changing a quiz assignment if existing attempts may be affected.

Completed attempts retain their recorded score, question count, and completion time if quiz content is later edited. Showing historical answer-by-answer detail is not required by the current brief.

## CSV import

- Provide a downloadable standard CSV template.
- Suggested columns: `quiz`, `question`, `choice_a`, `choice_b`, `choice_c`, `choice_d`, `correct_choice`, `explanation` (optional).
- `correct_choice` must be one of `A`, `B`, `C`, or `D`.
- Require a teacher/admin role for upload and import.
- Parse the file and show a preview before writing anything to the database.
- Validate required fields, correct-choice values, quiz assignment, and the four-choice structure.
- Identify invalid rows by CSV row number and explain each error.
- Do not import until validation succeeds; import the accepted file in a database transaction so it cannot be partially applied.
- Confirm after import how many questions were added or updated.

Decided: CSV import is add-only. Every valid row creates a new question; existing questions are changed only through the question editor. This keeps the import path simple and avoids accidental bulk overwrites.

## Additional individual features

Each student must design and implement two functional features beyond this shared specification. The two selected for this project are documented below. They are functional, individually testable, and beyond every shared requirement above.

### Feature 1 — Timed quiz mode

- Teachers set an optional per-quiz time limit in minutes (blank or zero means untimed).
- A timed quiz shows the player a countdown.
- When the timer expires, the attempt is submitted automatically with whatever the player has answered; unanswered questions are scored as incorrect. This auto-submission is a submission event, so the attempt is recorded as complete.
- The server records the attempt start time and enforces the deadline: a manual submission arriving after the deadline plus a short grace window (30 seconds) is scored only for the answers received, exactly like an auto-submit.
- The time limit is editable in the teacher question editor and stored on the quiz.

**Acceptance tests:** a quiz with a 1-minute limit auto-submits on expiry and appears in history with unanswered questions scored as incorrect; an untimed quiz shows no countdown; the server rejects scores computed beyond the deadline.

### Feature 2 — Post-quiz answer review with explanations

- Teachers can attach an optional explanation to each question, in the editor and in the CSV template.
- Immediately after submission, the result page lists every question with the player's chosen answer, the correct answer, and the explanation when present.
- Every submitted attempt stores the selected answer for each question, so the same read-only review can be reopened from the player's attempt history.
- Reviews are visible only to the attempt's owner and to teacher/admin users.

**Acceptance tests:** after submitting, the player sees per-question right/wrong with explanations; the same review is reachable from history after a server restart; another player cannot open someone else's review.

Reserve implementation and testing time in the schedule for these features.

## Data model proposal

Use relational tables with foreign keys and database constraints. A starting model:

- **users:** id, username, normalized username, email, normalized email, password hash, role, created time.
- **quizzes:** id, title, description, publication state, time limit in minutes (nullable), created/updated times.
- **questions:** id, quiz id, prompt, choice A, choice B, choice C, choice D, correct choice, optional explanation, ordering, created/updated times.
- **attempts:** id, user id, quiz id, score, question count, start time, completion time.
- **attempt_answers:** attempt id, question id, selected choice; one row per question on a submitted attempt, used for review.
- **invite_codes:** id, code hash, created by user id, expiry, used by user id, used time.

Add uniqueness, not-null, range, and foreign-key constraints where applicable. Store timestamps consistently (UTC in the database; localize for display). Define delete behavior so deleting users, quizzes, or questions cannot silently erase historical attempts.

## API outline

The following is an initial interface proposal; exact route names can be finalized during implementation:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/quizzes`
- `GET /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/attempts`
- `GET /api/me/attempts`
- `GET /api/leaderboards`
- `GET /api/quizzes/:quizId/leaderboard`
- Teacher-only question create/update and CSV preview/import routes under `/api/teacher/...`
- `GET /api/me/attempts/:attemptId/review` (owner-only answer review of a submitted attempt)
- Teacher/admin invite-code routes under `/api/teacher/invite-codes` (create and list)

The attempt submission endpoint must calculate the score using server-side quiz data. Do not trust a score or correct-answer key supplied by the browser.

## Acceptance criteria

1. Five published quizzes are available, each with at least ten questions and exactly four choices per question.
2. Registration, login, and logout work; plaintext passwords are never persisted.
3. Players cannot access teacher operations, including by directly calling an API route.
4. A player can complete a quiz, see score and percentage, retry, and see every submitted attempt in their own history.
5. No unsubmitted quiz is counted as a completion.
6. The overall leaderboard ranks by completed-attempt count.
7. Each quiz leaderboard shows each user's best score and completed-attempt count and ranks primarily by best score.
8. Leaderboards show usernames, not email addresses.
9. Teachers can create and edit questions and assign them to quizzes.
10. CSV upload has a preview and row-level validation; invalid files are not partially imported.
11. Data survives an app restart.
12. Development and production use separate PostgreSQL databases.
13. Each student has two separately specified, functional additions and can demonstrate them in the deployed app. The two selected additions are: (a) timed quiz mode with server-enforced expiry and auto-submit, and (b) post-quiz answer review with teacher-written explanations.
14. A timed quiz auto-submits at expiry and the expired attempt is recorded and scored with unanswered questions as incorrect; untimed quizzes behave as before.
15. A player can review their submitted answers, correct answers, and explanations immediately after submission and later from attempt history; only the attempt owner and teacher/admin can view a review.
16. Only a valid, unused, unexpired invite code or the one-time bootstrap can create a teacher/admin account; ordinary registration always yields a player.

## Decisions made

- The five launch quizzes are the Pusheen trivia sets: Meet Pusheen, Pusheen's Family Tree, Pusheen's Pals, The Story of Pusheen, and Pusheen Merch & Media Mania. This replaced the earlier academic-subject plan. Quiz content about Pusheen is subject matter only; the app's own artwork stays original because Pusheen's imagery is copyrighted and trademarked.
- The two individual features are timed quiz mode and post-quiz answer review with explanations.
- Teacher/admin accounts are provisioned through single-use admin invite codes; the first teacher/admin in each environment comes from a one-time bootstrap script using an environment secret.
- CSV import is add-only; edits to existing questions happen in the question editor.
- Attempts store the selected answer for each question, enabling Feature 2 review. Answer-by-answer review of past attempts is in scope through Feature 2.
