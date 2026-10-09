-- GHSQUI initial schema (Phase 2)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(30) NOT NULL UNIQUE,
  username_normalized VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  email_normalized VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quizzes (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  publication_state VARCHAR(12) NOT NULL DEFAULT 'draft'
    CHECK (publication_state IN ('draft', 'published')),
  time_limit_minutes INT CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,
  prompt TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_choice CHAR(1) NOT NULL CHECK (correct_choice IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  ordering INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX questions_quiz_idx ON questions (quiz_id, ordering);

-- One completion record per submitted attempt (including retries).
CREATE TABLE attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,
  score INT NOT NULL CHECK (score >= 0),
  question_count INT NOT NULL CHECK (question_count > 0),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (score <= question_count)
);
CREATE INDEX attempts_user_idx ON attempts (user_id, completed_at DESC);
CREATE INDEX attempts_quiz_idx ON attempts (quiz_id);

-- Selected answer for every question on a submitted attempt (NULL = unanswered).
CREATE TABLE attempt_answers (
  attempt_id BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_choice CHAR(1) CHECK (selected_choice IN ('A', 'B', 'C', 'D')),
  PRIMARY KEY (attempt_id, question_id)
);

-- Single-use teacher/admin invite codes (sha256 hex of the code).
CREATE TABLE invite_codes (
  id BIGSERIAL PRIMARY KEY,
  code_hash CHAR(64) NOT NULL UNIQUE,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (used_at IS NULL OR used_by IS NOT NULL)
);
