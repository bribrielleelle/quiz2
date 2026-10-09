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
npm start                # http://localhost:3000
```

Environment variables (never commit `.env`):

- `DATABASE_URL` — PostgreSQL connection string (Replit dev DB in QA; separate prod DB in production)
- `SESSION_SECRET` — long random string used to sign session cookies
- `NODE_ENV` — `production` enables Secure cookies
- `PORT` — defaults to 3000

## Repository layout

```
docs/                 specification, phases, theme, feature specs, content plan, app design
db/migrations/        versioned SQL migrations (applied in order, tracked in schema_migrations)
db/migrate.js         repeatable migration runner (npm run migrate)
public/               static frontend (pages, css, js)
routes/               Express routers (auth, quizzes, leaderboards)
server.js             Express app entry point
```

## Status

- **Phase 2 — foundation:** Express 5 server, initial schema, registration/login/logout/sessions, role checks, themed pages with navigation, leaderboard rules in SQL. Done.
- **Phase 3 — quiz-taking, scoring, attempt history:** in progress (quiz detail API exists; taking flow to be built).
- **Phases 4–5:** teacher authoring, CSV import, leaderboards UI polish, individual features (timed mode, answer review).

See `docs/development-phases.md` for the full plan and `docs/app-design.md` for navigation, page designs, and leaderboard rules.
