# Phase 5 — QA and Deployment Specification

Status: **in progress**. The leaderboard UI (overall + per-quiz) was already live from Phase 3. Phase 5 work completed so far: this test/deployment spec, an accessibility polish pass, and the Quiz 5 fact re-verification (all ten answers confirmed current, October 2026 — see section 5). Remaining: execute the QA checklist below in the Replit workspace, then deploy to production with its own database.

This document is the working checklist for the exit criteria: *all shared and individual requirements pass QA in the development workspace and are verified in the deployed app.*

## 1. Acceptance-criteria test plan (16 criteria)

Run these in the Replit dev workspace against `main`. Each test lists concrete steps and the expected result.

| # | Criterion | Test steps | Expected result |
| --- | --- | --- | --- |
| 1 | Five published quizzes, ≥10 questions, 4 choices each | Open `/` while logged in; check each quiz card's question count; open any quiz and answer through it | Five quizzes listed; every card shows ≥ 10; every question shows exactly four choices |
| 2 | Registration, login, logout; no plaintext passwords | Register a new account, log out, log back in, log out. Then in the DB shell: `SELECT username, password_hash FROM users LIMIT 3;` | All flows work; `password_hash` values are bcrypt hashes (`$2a$…`), never plaintext |
| 3 | Players cannot reach teacher operations, even via API | While logged in as a player: open `/teacher.html` and also call `GET /api/teacher/quizzes` from the shell (`curl -b cookies …`) | Page shows the access message; API returns 403 for every `/api/teacher` route |
| 4 | Complete, score, retry, history | Finish a quiz, read the score/percentage, retry it, open My History | Score + % correct shown; both attempts appear in history as separate rows |
| 5 | No unsubmitted quiz counts as a completion | Start a quiz, answer some questions, close the tab without submitting; check history and leaderboards | Nothing added to history; leaderboard counts unchanged |
| 6 | Overall leaderboard ranks by completed attempts | Have two users complete a different number of quizzes; open the OVERALL board | Ranking follows completed-attempt count, descending; ties are alphabetical by username |
| 7 | Per-quiz board: best score + attempt count, ranked by best score | Retake one quiz several times; open that quiz's board | Each user appears once with their best `score / total` and tries count; ranked by best score, then tries, then username |
| 8 | Leaderboards show usernames, never emails | Inspect both boards as a user whose email is known | Only usernames are rendered anywhere |
| 9 | Teachers create/edit questions and assign quizzes | In the Teacher area: add a question, edit its prompt/choices, reassign it to another quiz | Changes save and appear in the quiz's question list |
| 10 | CSV preview + row-level validation; no partial imports | Download the template; preview a file with one bad row (wrong quiz title, bad correct_choice); then preview a fully valid file and import it | Bad file shows the exact row number + errors and is rejected with nothing written; valid file imports and reports the count |
| 11 | Data survives a restart | Submit an attempt, restart the server (`Ctrl-C`, `npm start`), reload history and leaderboards | All data identical after restart |
| 12 | Dev and prod use separate databases | After deployment, compare the `DATABASE_URL` values in the workspace vs the deployment secrets; confirm dev-only test data is absent in prod | Two different database URLs; prod has only production content |
| 13 | Two individual features demonstrable | Demonstrate Features 1 and 2 to the class/teacher from the deployed app | Both work in production (see section 2) |
| 14 | Timed quiz auto-submits at expiry | Set a 1-minute limit on a quiz, start it, let it expire without finishing | Auto-submit flash appears; attempt recorded in history with unanswered questions scored incorrect; untimed quizzes show no countdown |
| 15 | Review answers after submission and from history; owner/staff only | Submit a quiz → per-question review with explanations; reopen from history; as another player, try to open that review URL | Review visible to owner and staff; another player gets a 404-style "not found" |
| 16 | Only invite code or bootstrap creates staff | Register without a code (player); generate a code, register with it (teacher); try the same code again | No code → player; valid code → teacher; code reuse rejected; registration form has no role field |

## 2. Feature acceptance tests

**Feature 1 — Timed mode.** (a) 1-minute quiz auto-submits on expiry and appears in history with unanswered items scored incorrect. (b) Untimed quiz shows no countdown. (c) Server rejects scores computed beyond the deadline — verify by inspecting that a manual late submission is treated as auto-submit (`late: true` in the API response, only received answers scored).

**Feature 2 — Answer review.** (a) Immediately after submission, the result page lists each question with your answer, the correct answer, and the explanation when present. (b) The same review is reachable from history after a server restart. (c) Another player cannot open someone else's review.

## 3. Security and role-boundary spot checks

- Player session calling `POST /api/teacher/questions` → 403.
- Player A opening player B's review URL → "Attempt not found" (existence not leaked).
- Invite code: single use only, expiry enforced, hash stored (never the code itself).
- Username constraints (`^[A-Za-z0-9_-]{3,30}$`) block HTML/script injection through usernames; the teacher UI additionally escapes all rendered content.
- All SQL is parameterized (spot-check `routes/` and `lib/` — no string concatenation of user values).

## 4. Accessibility and responsive checks

- **Keyboard-only walkthrough:** every page usable with Tab/Enter/Space alone — nav, quiz choices, forms, buttons, selects, theme toggle.
- **Labels:** every input has a visible `<label>` or `aria-label` (leaderboard quiz picker and file upload are aria-labeled; the theme toggle gets its accessible name from `app.js` on every page).
- **Contrast:** verify body text against its background with browser dev tools; target ≥ 4.5:1 in both light (espresso on cream) and dark (cream on espresso) themes.
- **Focus visibility:** confirm the browser's default focus ring is visible on all interactive elements in both themes.
- **Responsive:** view each page at ~360px width — nav wraps, tables scroll or stack sensibly, buttons stay tappable.
- **Forms:** error messages are readable text (`.form-error`), and the leaderboard empty state announces itself (`role="status"`).

## 5. Quiz 5 fact re-verification (completed October 2026)

All ten answers in *Pusheen Merch & Media Mania* were re-checked against current sources. **Every answer is still correct — no content changes needed.**

| Fact in quiz | Verified against |
| --- | --- |
| GUND makes the official plush | gund.com Pusheen collection ("GUND is proud to present Pusheen"); GUND became the plush manufacturer in 2014 |
| Pusheen Box is a mystery subscription box | pusheenbox.com; Amazon "Mystery Subscription Box" listing |
| Cat version is the "Cat Kit" | pusheenbox.com ("Choose the Pusheen Box (for you) or the Cat Kit (for your cat)") |
| 7–10 items per box, $100+ value | Pusheen Box listing: "over $100 worth in value, each box will include 7-10 … exclusive" |
| Box items are exclusive | Same listing: "All items in the box are exclusive to the box" |
| Petco carries Pusheen merch | Retailer lists include Petco |
| Barnes & Noble sells Pusheen merch | Retailer lists; B&N-exclusive Dragonsheen vinyl |
| Vinyl figures in the line | Pusheen × Funko Pop! vinyl figure series |
| Tumblr helped GIFs spread early | Pusheen's comic/GIF presence documented on Tumblr |
| 2017 Park Ridge, IL office | April 2017 Pusheen Corp office acquisition in Park Ridge, a Chicago suburb |

Re-check again only if launch slips by many months — merchandise and platform facts drift fastest in this quiz.

## 6. Deployment runbook (Replit Deployment)

**Pre-deploy checklist**

- [ ] All QA items in sections 1–4 pass in the dev workspace.
- [ ] `package-lock.json` is committed and up to date.
- [ ] Quiz content is final and every published quiz has ≥ 10 questions.

**Steps**

1. Create the production PostgreSQL database (Replit-provisioned, separate from dev).
2. In the **deployment's** secrets, set:
   - `DATABASE_URL` — the production database URL (never the dev one)
   - `SESSION_SECRET` — a long random string (different from dev)
   - `NODE_ENV=production` — enables Secure cookies
   - `ADMIN_BOOTSTRAP_SECRET` — temporarily, for the first admin bootstrap; remove after step 5
3. Deploy from `main` (or auto-deploy from the repo).
4. Run migrations and load content against the production database: `npm run migrate && npm run seed` (the seed is idempotent; alternatively load reviewed content via the teacher CSV import).
5. Bootstrap the first teacher/admin: register your production account through the app, run `npm run make-admin -- <username>`, then **remove `ADMIN_BOOTSTRAP_SECRET`**.
6. Generate further staff accounts through invite codes in the Teacher area.

**Post-deploy smoke test**

- [ ] Registration, login, and logout work on the deployed URL.
- [ ] All five quizzes are playable; a submitted attempt appears in history and on both leaderboards.
- [ ] Timed quiz auto-submits; review page shows explanations.
- [ ] Teacher area reachable for staff, blocked (403) for players.
- [ ] Dev-only test data (users, attempts you created while testing) does **not** appear — proving the production database is separate.
- [ ] Spot-check that the deployed app keeps data after a redeploy (persistence check).

**Rollback:** redeploy the previous commit from the deployment history; the database is untouched by a rollback of app code.
