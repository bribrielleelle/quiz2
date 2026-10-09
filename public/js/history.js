// GHSQUI attempt history (Phase 3): every completed attempt, newest first,
// with a read-only REVIEW link per row (Feature 2).
(function () {
  function el(id) { return document.getElementById(id); }

  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  document.addEventListener('DOMContentLoaded', function () {
    getJSON('/api/me/attempts')
      .then(function (data) {
        if (!data.attempts.length) {
          el('empty').hidden = false;
          return;
        }
        var tbody = el('tbody');
        data.attempts.forEach(function (a) {
          var tr = document.createElement('tr');

          var tdDate = document.createElement('td');
          tdDate.textContent = fmtDate(a.completed_at);

          var tdQuiz = document.createElement('td');
          tdQuiz.textContent = a.quiz_title;

          var tdScore = document.createElement('td');
          tdScore.textContent = a.score + ' / ' + a.question_count;

          var tdPct = document.createElement('td');
          tdPct.textContent = Math.round((a.score / a.question_count) * 100) + '%';

          var tdReview = document.createElement('td');
          var link = document.createElement('a');
          link.href = 'review.html?attempt=' + a.id;
          link.textContent = 'REVIEW \u2192';
          tdReview.appendChild(link);

          [tdDate, tdQuiz, tdScore, tdPct, tdReview].forEach(function (td) {
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        el('history-wrap').hidden = false;
      })
      .catch(function (err) {
        if (err.message === 'Log in required.' || err.message === 'Not logged in.') {
          el('login-nudge').hidden = false;
          el('login-nudge-link').href =
            'login.html?next=' +
            encodeURIComponent(window.location.pathname + window.location.search);
        } else {
          el('flow-error-text').textContent = err.message;
          el('flow-error').hidden = false;
        }
      });
  });
})();
