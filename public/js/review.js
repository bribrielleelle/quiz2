// GHSQUI result + answer review page (Phase 3, Feature 2).
(function () {
  var params = new URLSearchParams(window.location.search);
  var attemptId = params.get('attempt');
  var fresh = params.get('new') === '1';

  function el(id) { return document.getElementById(id); }

  function render(data) {
    var attempt = data.attempt;
    el('result-title').textContent = attempt.quiz_title;
    el('result-score').textContent = attempt.score + ' / ' + attempt.question_count;
    el('result-pct').textContent = attempt.percentage + '% CORRECT';

    var perfect = attempt.score === attempt.question_count;
    if (perfect) {
      el('banner').textContent = '\u2605 NEW HIGH SCORE! \u2605';
      el('banner').hidden = false;
    } else if (fresh) {
      el('banner').textContent = 'QUIZ COMPLETE!';
      el('banner').hidden = false;
    }

    var list = el('review-list');
    list.textContent = '';

    data.questions.forEach(function (q, idx) {
      var card = document.createElement('div');
      card.className = 'card review-q';

      var title = document.createElement('h3');
      title.textContent = 'Q' + (idx + 1) + '. ' + q.prompt;
      card.appendChild(title);

      var answered = q.selected_choice !== null && q.selected_choice !== undefined;
      var right = answered && q.selected_choice === q.correct_choice;
      var verdict = document.createElement('p');
      verdict.className = right ? 'tag-correct' : 'tag-miss';
      verdict.textContent = right
        ? 'CORRECT!'
        : answered
          ? 'MISS'
          : 'NO ANSWER \u2014 COUNTED AS INCORRECT';
      card.appendChild(verdict);

      var choices = document.createElement('div');
      choices.className = 'review-choices';
      ['A', 'B', 'C', 'D'].forEach(function (letter) {
        var row = document.createElement('div');
        row.className = 'review-choice' +
          (letter === q.correct_choice ? ' is-correct' : '') +
          (letter === q.selected_choice ? ' is-selected' : '');
        var mark = document.createElement('span');
        mark.className = 'choice-letter';
        mark.textContent = letter;
        var text = document.createElement('span');
        text.textContent = q['choice_' + letter.toLowerCase()];
        row.appendChild(mark);
        row.appendChild(text);
        if (letter === q.correct_choice) {
          var tag = document.createElement('span');
          tag.className = 'tag-correct';
          tag.textContent = '\u2605 CORRECT ANSWER';
          row.appendChild(tag);
        }
        if (letter === q.selected_choice) {
          var mine = document.createElement('span');
          mine.className = 'tag-yours';
          mine.textContent = '\u2190 YOUR ANSWER';
          row.appendChild(mine);
        }
        choices.appendChild(row);
      });
      card.appendChild(choices);

      if (q.explanation) {
        var exp = document.createElement('p');
        exp.className = 'explanation';
        exp.textContent = q.explanation;
        card.appendChild(exp);
      }
      list.appendChild(card);
    });

    el('btn-retry').href = 'quiz.html?id=' + attempt.quiz_id;
    el('result-card').hidden = false;
    el('review-wrap').hidden = false;
    el('result-actions').hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!attemptId) {
      el('flow-error-text').textContent = 'No attempt selected.';
      el('flow-error').hidden = false;
      return;
    }
    getJSON('/api/me/attempts/' + encodeURIComponent(attemptId) + '/review')
      .then(render)
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
