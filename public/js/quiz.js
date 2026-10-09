// GHSQUI quiz-taking flow (Phase 3): intro screen, one question per screen,
// progress bar, optional server-anchored countdown, auto-submit on expiry.
(function () {
  var params = new URLSearchParams(window.location.search);
  var quizId = params.get('id');

  function el(id) { return document.getElementById(id); }

  var state = {
    quiz: null,
    questions: [],
    answers: {}, // question id -> 'A' | 'B' | 'C' | 'D'
    current: 0,
    locked: false,
    tick: null,
    deadline: null
  };

  function setError(msg) {
    el('flow-error-text').textContent = msg;
    el('flow-error').hidden = false;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function renderTimer() {
    var box = el('timer');
    var remaining = Math.max(0, state.deadline - Date.now());
    var m = Math.floor(remaining / 60000);
    var s = Math.floor((remaining % 60000) / 1000);
    box.textContent = pad(m) + ':' + pad(s);
    if (remaining <= 30000) box.classList.add('timer-low');
    if (remaining <= 0) timeUp();
  }

  function timeUp() {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.tick);
    el('timeup-flash').hidden = false;
    // Auto-submit whatever was answered; unanswered questions count as
    // incorrect on the server (Feature 1).
    setTimeout(function () { submit(true); }, 1200);
  }

  function progress() {
    var answered = 0;
    state.questions.forEach(function (q) {
      if (state.answers[q.id]) answered += 1;
    });
    el('progress-bar').style.width =
      Math.round((answered / state.questions.length) * 100) + '%';
    el('progress-label').textContent =
      answered + ' / ' + state.questions.length + ' ANSWERED';
  }

  function renderQuestion() {
    var i = state.current;
    var q = state.questions[i];
    el('q-count').textContent = 'QUESTION ' + (i + 1) + ' OF ' + state.questions.length;
    el('prompt').textContent = q.prompt;

    var wrap = el('choices');
    wrap.textContent = '';
    ['A', 'B', 'C', 'D'].forEach(function (letter) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn' + (state.answers[q.id] === letter ? ' selected' : '');
      var mark = document.createElement('span');
      mark.className = 'choice-letter';
      mark.textContent = letter;
      var text = document.createElement('span');
      text.textContent = q['choice_' + letter.toLowerCase()];
      btn.appendChild(mark);
      btn.appendChild(text);
      btn.addEventListener('click', function () {
        if (state.locked) return;
        state.answers[q.id] = letter;
        renderQuestion();
      });
      wrap.appendChild(btn);
    });

    el('btn-prev').disabled = i === 0;
    el('btn-next').textContent =
      i === state.questions.length - 1 ? 'SUBMIT' : 'NEXT';
    progress();
  }

  function submit(auto) {
    if (state.locked && !auto) return;
    state.locked = true;
    clearInterval(state.tick);
    el('btn-prev').disabled = true;
    el('btn-next').disabled = true;

    fetch('/api/quizzes/' + encodeURIComponent(quizId) + '/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: state.answers, start_token: state.quiz.start.startToken })
    })
      .then(function (res) {
        return res.json().then(function (body) { return { ok: res.ok, body: body }; });
      })
      .then(function (r) {
        if (!r.ok) {
          state.locked = false;
          renderQuestion();
          throw new Error(r.body.error || 'Submission failed.');
        }
        window.location.href = 'review.html?attempt=' + r.body.attempt.id + '&new=1';
      })
      .catch(function (err) { setError(err.message); });
  }

  function begin() {
    el('intro-card').hidden = true;
    el('quiz-card').hidden = false;
    if (state.quiz.time_limit_minutes) {
      el('timer').hidden = false;
      // The countdown is anchored to the server-stamped start time, so the
      // browser clock alone cannot extend the deadline (Feature 1).
      state.deadline =
        Date.parse(state.quiz.start.serverStart) + state.quiz.time_limit_minutes * 60000;
      renderTimer();
      state.tick = setInterval(renderTimer, 250);
    }
    state.current = 0;
    renderQuestion();
  }

  document.addEventListener('DOMContentLoaded', function () {
    el('btn-start').addEventListener('click', begin);
    el('btn-prev').addEventListener('click', function () {
      if (state.current > 0) { state.current -= 1; renderQuestion(); }
    });
    el('btn-next').addEventListener('click', function () {
      if (state.current < state.questions.length - 1) {
        state.current += 1;
        renderQuestion();
      } else {
        submit(false);
      }
    });

    if (!quizId) {
      setError('No quiz selected. Pick one from the quiz list.');
      return;
    }
    getJSON('/api/quizzes/' + encodeURIComponent(quizId))
      .then(function (data) {
        state.quiz = data.quiz;
        state.questions = data.questions;
        el('intro-title').textContent = state.quiz.title;
        el('intro-desc').textContent = state.quiz.description || '';
        el('intro-meta').textContent =
          state.questions.length + ' QUESTIONS' +
          (state.quiz.time_limit_minutes
            ? ' · TIMED: ' + state.quiz.time_limit_minutes + ' MIN'
            : ' · UNTIMED');
        el('intro-card').hidden = false;
      })
      .catch(function (err) {
        if (err.message === 'Log in required.') {
          el('login-nudge').hidden = false;
          el('login-nudge-link').href =
            'login.html?next=' +
            encodeURIComponent(window.location.pathname + window.location.search);
        } else {
          setError(err.message);
        }
      });
  });
})();
