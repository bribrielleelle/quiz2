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

## Quiz behavior

- The app contains five working quizzes at launch.
- Each published quiz has at least ten questions.
- Each question has a prompt, exactly four answer choices, and exactly one correct answer.
- A player selects a quiz, answers its questions, and submits it.
- On submission, show the raw score, question count, and percentage correct.
- Offer a retry that starts a new attempt.
- A submission is the completion event. Do not count a quiz that has not been submitted.
- Avoid creating a completed-attempt record before submission. Incomplete work is not a leaderboard entry or completion.

The five quiz subjects and question content remain to be chosen. Quiz content must be reviewed before launch so every published quiz meets the ten-question minimum.

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
- Suggested columns: `quiz`, `question`, `choice_a`, `choice_b`, `choice_c`, `choice_d`, `correct_choice`.
- `correct_choice` must be one of `A`, `B`, `C`, or `D`.
- Require a teacher/admin role for upload and import.
- Parse the file and show a preview before writing anything to the database.
- Validate required fields, correct-choice values, quiz assignment, and the four-choice structure.
- Identify invalid rows by CSV row number and explain each error.
- Do not import until validation succeeds; import the accepted file in a database transaction so it cannot be partially applied.
- Confirm after import how many questions were added or updated.

The CSV update rule (always add new questions versus match and update existing questions) must be decided before implementation. The safest initial scope is add-only import, with edits handled in the question editor.

## Additional individual features

Each student must design and implement two functional features beyond this shared specification. Those features must be documented individually before implementation and must not be counted as cosmetic changes or as any requirement above.

Reserve implementation and testing time in the schedule for these features. The two choices are intentionally open until the student selects them.

## Data model proposal

Use relational tables with foreign keys and database constraints. A starting model:

- **users:** id, username, normalized username, email, normalized email, password hash, role, created time.
- **quizzes:** id, title, description, publication state, created/updated times.
- **questions:** id, quiz id, prompt, choice A, choice B, choice C, choice D, correct choice, ordering, created/updated times.
- **attempts:** id, user id, quiz id, score, question count, completion time.

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
13. Each student has two separately specified, functional additions and can demonstrate them in the deployed app.

## Decisions still needed

- The subject and title of each of the five quizzes.
- The two additional features for the individual student project.
- Who provisions teacher/admin accounts and how the first teacher is created.
- Whether CSV imports remain add-only or can update existing questions.
- Whether attempts should also save selected answers for later review (not required by the current brief).
