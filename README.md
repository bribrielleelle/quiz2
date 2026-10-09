# GHSQUI

A quiz web app for high school students: take quizzes, review completed attempts, and compare results on leaderboards. Teachers maintain questions through an editor or validated CSV import. Subject matter is Pusheen trivia; the app's own branding is original.

## Stack

- **Frontend:** plain HTML, CSS, and browser JavaScript (no framework)
- **Server:** Node.js 24 LTS and Express 5, serving static files and JSON APIs from one server
- **Database:** PostgreSQL accessed with `pg` and parameterized SQL
- **AI development environment:** Mistral Code · **Source:** GitHub · **QA:** Replit workspace · **Prod:** Replit Deployment

## Setup

```bash
npm install
cp .env.example .env     # then edit .env with your database URL and a session secret
npm run migrate          # apply schema migrations
npm run seed             # load the five launch quizzes and their 50 questions
npm start                # http://localhost:3000
```

First teacher/admin account per environment: set `ADMIN_BOOTSTRAP_SECRET` in `.env`, register your own account through the app, run `npm run make-admin -- <username>`, then remove the secret again. After the first admin exists, further teacher/admin accounts come from invite codes.

Environment variables (never commit `.env`):

- `DATABASE_URL` — PostgreSQL connection string (Replit dev DB in QA; separate prod DB in production)
- `SESSION_SECRET` — long random string used to sign session cookies and quiz start tokens
- `NODE_ENV` — `production` enables Secure cookies
- `PORT` — defaults to 3000
- `ADMIN_BOOTSTRAP_SECRET` — one-time secret for the first-admin bootstrap; keep it unset at all other times

## Repository layout

```bash
docs/                 specification, phases, theme, feature specs, content plan, app design
db/migrations/        versioned SQL migrations (applied in order, tracked in schema_migrations)
db/migrate.js         repeatable migration runner (npm run migrate)
db/seed.js            launch content: 5 Pusheen quizzes, 50 questions (npm run seed)
lib/                  shared server helpers (signed quiz start tokens)
public/               static frontend (pages, css, js)
routes/               Express routers (auth, quizzes, leaderboards, attempts)
scripts/              one-time operational scripts (first-admin bootstrap)
server.js             Express app entry point
```

## Status

- **Phase 2 — foundation:** done. Express 5 server, schema, auth with roles and hashed passwords, themed pages, leaderboard rules in SQL.
- **Phase 3 — quiz-taking:** done. Full quiz flow (one question per screen, progress bar, optional timed mode with server-stamped start tokens and auto-submit — Feature 1), server-side scoring, attempts and per-question answers saved in one transaction, result page with per-question review and explanations (Feature 2), attempt history with review links, seeded launch content, first-admin bootstrap, login returns you to where you were.
- **Phase 4 — teacher tools (next):** question editor, CSV template + validated add-only import, invite-code generation, publish gating at ten questions.
- **Phase 5:** leaderboard UI polish, QA against all acceptance criteria, production deployment with a separate database.

See `docs/development-phases.md` for the full plan and `docs/app-design.md` for navigation, page designs, and leaderboard rules.
