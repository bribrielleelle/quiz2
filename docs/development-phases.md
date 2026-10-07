# Five Development Phases

The phases are ordered. Complete and verify each phase before moving on. This is a delivery plan, not an instruction to build the app now.

## Phase 1 — Product decisions, specification, and design

- Confirm quiz subjects, titles, audience, and initial question sources.
- Choose and document each student's two additional functional features.
- Decide the trusted process for creating teacher/admin accounts.
- Confirm CSV import behavior and whether answer-by-answer review is out of scope.
- Finalize page flows, access rules, schema, API outline, CSV template, and acceptance criteria.
- Create the GitHub repository and agree on review and commit practices.

**Exit criteria:** approved specification; named owners for quiz content and extra features; design for player, teacher, and unauthenticated flows.

## Phase 2 — Project foundation, database, and accounts

- Set up Node.js 24 LTS, npm scripts, committed `package-lock.json`, and Express 5.
- Serve plain HTML, CSS, and JavaScript from the Express app; expose JSON APIs from the same server.
- Configure Replit development PostgreSQL and a separate production PostgreSQL database without committing credentials.
- Add repeatable schema migrations and the initial relational tables and constraints.
- Implement password hashing, registration, login, logout, sessions, and server-side role/ownership checks.
- Add basic form and API error handling.

**Exit criteria:** the app starts in the Replit workspace; schema setup is repeatable; account flows work; player access cannot elevate itself to teacher/admin.

## Phase 3 — Quiz-taking, scoring, and attempt history

- Build the quiz list, quiz-taking flow, submission result, and retry flow.
- Load and validate the five approved quizzes with at least ten questions each.
- Calculate scores on the server and persist each submitted attempt exactly once.
- Add the personal completed-attempt history.
- Verify unsubmitted attempts are not stored as completions and retries create separate records.

**Exit criteria:** a player can complete, score, retry, and review attempts; records survive server restarts.

## Phase 4 — Teacher authoring and CSV import

- Build the teacher-only question editor for create and edit operations.
- Add the downloadable CSV template, upload, preview, row-level validation, and error display.
- Apply valid imports transactionally; reject invalid uploads without partial writes.
- Enforce the minimum-question rule before a quiz can be published.
- Test permissions, invalid data, duplicate submissions, and import rollback behavior.

**Exit criteria:** authorized teachers can maintain questions using the editor or a validated CSV; players cannot reach either authoring path.

## Phase 5 — Leaderboards, individual features, QA, and production

- Build the overall completed-attempt leaderboard and per-quiz best-score leaderboards.
- Add the two approved individual functional features and their acceptance tests.
- Test the full application against the Phase 1 acceptance criteria, including role boundaries and tied leaderboard rankings.
- Perform responsive and accessibility checks on the plain HTML interface.
- Apply schema migrations and load reviewed quiz content into the separate production database.
- Verify the deployed application uses production PostgreSQL and that all required features work there.
- Document setup, environment configuration, database migration, CSV format, and deployment steps in GitHub.

**Exit criteria:** all shared and individual requirements pass QA in the development workspace and are verified in the deployed app.
