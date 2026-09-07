import { h, clear, autosize, titleCase } from '../dom.js';
import { icon } from '../icons.js';
import { prose } from '../markdown.js';
import { api } from '../api.js';
import { toast } from '../ui.js';

const ERROR_LABELS = {
  conceptual: 'Conceptual gap',
  prerequisite_gap: 'Prerequisite missing',
  procedure: 'Procedure slip',
  reasoning: 'Reasoning error',
  transfer: 'Transfer failure',
  vocabulary: 'Vocabulary gap',
  memory: 'Memory lapse',
  misread: 'Misread the question',
  calculation: 'Calculation slip',
  careless: 'Careless slip',
  incomplete: 'Incomplete',
  none: '',
};

const VERDICT_ICON = { correct: 'checkCircle', partial: 'alert', incorrect: 'xCircle', unscorable: 'info' };

const OPEN_TYPES = new Set(['free_response', 'essay', 'proof', 'coding', 'scenario', 'short_answer']);

/**
 * One interactive question.
 *
 * `mode: 'immediate'` grades the answer on its own (practice sets, lesson checks).
 * `mode: 'deferred'` collects the answer for a whole-paper submission.
 * `mode: 'callback'` hands the answer to the caller — used inside a tutoring
 *   session, where the answer must go back through the teaching loop so the
 *   tutor can respond to what it revealed.
 */
export function questionCard(question, options = {}) {
  const {
    index = null,
    mode = 'immediate',
    sessionId = null,
    resourceId = null,
    subject = 'General',
    onGraded = null,
    onStuck = null,
    onHarder = null,
    showConcept = true,
  } = options;

  let answer = '';
  let attemptNumber = 1;
  let hintsShown = 0;
  let result = null;
  let busy = false;
  const startedAt = Date.now();

  const root = h('article.question', { dataset: { qid: question.id } });
  const hintHost = h('div.stack');
  const feedbackHost = h('div');

  /* ------------------------------------------------------------- answer UI */

  const answerHost = h('div');
  const choiceButtons = new Map();

  function buildAnswerUI() {
    clear(answerHost);
    choiceButtons.clear();

    if ((question.choices || []).length) {
      const list = h('div.choices');
      for (const choice of question.choices) {
        const button = h(
          'button.choice',
          {
            type: 'button',
            onClick: () => {
              if (result && mode === 'immediate') return;
              answer = choice.key;
              for (const [key, node] of choiceButtons) node.classList.toggle('selected', key === choice.key);
              options.onChange?.(question.id, answer);
              refreshActions();
            },
          },
          h('span.choice-key', {}, choice.key),
          h('span.choice-text', {}, choice.text),
        );
        choiceButtons.set(choice.key, button);
        list.appendChild(button);
      }
      answerHost.appendChild(list);
      return;
    }

    const isLong = OPEN_TYPES.has(question.type) || question.type === 'coding';
    const field = isLong
      ? h('textarea.textarea', {
          rows: question.type === 'coding' ? 8 : 4,
          placeholder:
            question.type === 'coding'
              ? 'Write your code…'
              : 'Show your reasoning, not just the answer…',
          style: question.type === 'coding' ? { fontFamily: 'var(--mono)', fontSize: '13px' } : {},
        })
      : h('input.input', {
          type: 'text',
          placeholder: question.units ? `Your answer (${question.units})` : 'Your answer…',
          autocomplete: 'off',
        });

    field.addEventListener('input', () => {
      answer = field.value;
      options.onChange?.(question.id, answer);
      refreshActions();
    });
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !isLong) {
        event.preventDefault();
        submit();
      }
    });
    if (isLong) autosize(field, 340);
    answerHost.appendChild(field);
  }

  /* ----------------------------------------------------------------- hints */

  function showHint() {
    const hints = question.hints || [];
    if (hintsShown >= hints.length) {
      if (onStuck) onStuck(question, hintsShown);
      else toast('No more hints — try writing down what you do know.', 'info');
      return;
    }
    const text = hints[hintsShown];
    hintsShown++;
    hintHost.appendChild(
      h('div.hint-box.fade-up', {}, h('b', {}, `Hint ${hintsShown}`), prose(text)),
    );
    refreshActions();
  }

  /* ---------------------------------------------------------------- submit */

  async function submit() {
    if (busy) return;
    if (!String(answer).trim()) {
      toast('Put something down first — a wrong attempt is worth more than a blank.', 'info');
      return;
    }
    if (mode === 'deferred') {
      options.onChange?.(question.id, answer);
      return;
    }
    if (mode === 'callback') {
      busy = true;
      refreshActions();
      try {
        await options.onSubmit?.(answer, controls);
      } finally {
        busy = false;
        refreshActions();
      }
      return;
    }

    busy = true;
    refreshActions();
    try {
      const outcome = await api.gradeAnswer({
        question,
        answer,
        sessionId,
        resourceId,
        attemptNumber,
        elapsedMs: Date.now() - startedAt,
        subject,
      });
      applyResult(outcome);
      onGraded?.(outcome, question);
    } catch (err) {
      toast(err.message || 'Could not grade that answer.', 'error');
    } finally {
      busy = false;
      refreshActions();
    }
  }

  function applyResult(outcome) {
    result = outcome;
    const grade = outcome.grade;
    root.classList.add('answered', grade.verdict);
    if (question.choices?.length) {
      for (const [key, node] of choiceButtons) {
        node.disabled = true;
        const isKeyed = key === String(question.answer).trim().toUpperCase();
        if (isKeyed && (grade.verdict !== 'incorrect' || grade.reveal_solution)) node.classList.add('is-correct');
        if (key === answer && grade.verdict === 'incorrect') node.classList.add('is-wrong');
      }
    }
    renderFeedback(outcome);
    refreshActions();
  }

  function renderFeedback(outcome) {
    const grade = outcome.grade;
    const errorLabel = ERROR_LABELS[grade.error_type] || '';
    const mastery = outcome.concept;

    clear(feedbackHost).appendChild(
      h(
        'div.feedback.fade-up',
        {},
        h(
          'div.feedback-head',
          {},
          h(
            'span',
            { class: `verdict ${grade.verdict}` },
            icon(VERDICT_ICON[grade.verdict] || 'info', { size: 15 }),
            grade.verdict === 'correct' ? 'Correct' : grade.verdict === 'partial' ? 'Partly right' : grade.verdict === 'unscorable' ? 'Not scored' : 'Not right yet',
          ),
          h('span.tiny.dim', {}, `${grade.score}/${grade.max_score}`),
          h(
            'div.feedback-tags',
            {},
            errorLabel ? h('span.chip.amber', {}, errorLabel) : null,
            mastery ? h('span.chip', {}, `${mastery.name}: ${mastery.mastery_label}`) : null,
          ),
        ),
        grade.what_went_right ? prose(`**What worked.** ${grade.what_went_right}`) : null,
        grade.misconception ? h('p.tiny', { style: { color: 'var(--amber)' } }, `You are ${grade.misconception}.`) : null,
        prose(grade.feedback),
        grade.rubric_scores?.length
          ? h(
              'div.stack',
              { style: { gap: '4px' } },
              ...grade.rubric_scores.map((r) =>
                h(
                  'div.spread.tiny',
                  {},
                  h('span', {}, r.criterion),
                  h('span.dim', {}, `${r.earned} — ${r.note}`),
                ),
              ),
            )
          : null,
        grade.reveal_solution || grade.verdict === 'correct'
          ? h(
              'details.solution',
              {},
              h('summary', {}, 'Full solution'),
              prose(question.solution),
            )
          : null,
      ),
    );
  }

  /* --------------------------------------------------------------- actions */

  const actionHost = h('div.q-actions');

  function refreshActions() {
    clear(actionHost);
    const hintsLeft = (question.hints || []).length - hintsShown;
    const answered = Boolean(result);
    const wrong = answered && result.grade.verdict !== 'correct';

    if (!answered && mode !== 'deferred') {
      if (hintsLeft > 0 || onStuck) {
        actionHost.appendChild(
          h('button.btn.sm', { type: 'button', onClick: showHint }, icon('help', { size: 13 }), hintsShown ? 'Bigger hint' : "I'm stuck"),
        );
      }
      actionHost.appendChild(
        h(
          'button.btn.primary.sm',
          { type: 'button', disabled: busy || !String(answer).trim(), onClick: submit },
          busy ? h('span.spinner') : icon('check', { size: 13 }),
          busy ? 'Checking…' : options.submitLabel || 'Check my answer',
        ),
      );
      return;
    }

    if (wrong && attemptNumber < 3) {
      actionHost.appendChild(
        h(
          'button.btn.sm',
          {
            type: 'button',
            onClick: () => {
              attemptNumber++;
              result = null;
              answer = '';
              root.classList.remove('answered', 'correct', 'incorrect', 'partial');
              clear(feedbackHost);
              buildAnswerUI();
              refreshActions();
            },
          },
          icon('refresh', { size: 13 }),
          'Try again',
        ),
      );
    }
    if (answered && onHarder) {
      actionHost.appendChild(
        h('button.btn.sm', { type: 'button', onClick: () => onHarder(question, result) }, icon('flame', { size: 13 }), 'Make it harder'),
      );
    }
    if (answered && !result.grade.reveal_solution && result.grade.verdict !== 'correct') {
      actionHost.appendChild(
        h(
          'button.btn.sm.ghost',
          {
            type: 'button',
            onClick: (event) => {
              event.currentTarget.remove();
              feedbackHost.querySelector('.feedback')?.appendChild(
                h('details.solution', { open: true }, h('summary', {}, 'Full solution'), prose(question.solution)),
              );
            },
          },
          icon('eye', { size: 13 }),
          'Show the solution',
        ),
      );
    }
  }

  /* ------------------------------------------------------------------ shell */

  root.appendChild(
    h(
      'header.q-head',
      {},
      index != null ? h('span.q-index', {}, String(index).padStart(2, '0')) : null,
      showConcept && question.concept ? h('span.tiny.muted', {}, question.concept) : null,
      h(
        'div.q-meta',
        {},
        h('span.chip', {}, titleCase(question.type)),
        h('span.chip', { title: 'Difficulty' }, `D${Number(question.difficulty || 3).toFixed(1).replace(/\.0$/, '')}`),
        question.points > 1 ? h('span.chip', {}, `${question.points} pts`) : null,
      ),
    ),
  );

  const body = h('div.q-body');
  if (question.context?.trim()) body.appendChild(h('div.q-context', {}, prose(question.context)));
  body.appendChild(prose(question.prompt));
  body.appendChild(answerHost);
  body.appendChild(hintHost);
  body.appendChild(actionHost);
  root.appendChild(body);
  root.appendChild(feedbackHost);

  buildAnswerUI();
  refreshActions();

  const controls = {
    el: root,
    question,
    getAnswer: () => answer,
    setAnswer: (value) => {
      answer = value;
    },
    elapsed: () => Date.now() - startedAt,
    isAnswered: () => Boolean(result) || Boolean(String(answer).trim()),
    showResult(grade, concept) {
      applyResult({ grade, concept });
    },
    lock() {
      for (const node of choiceButtons.values()) node.disabled = true;
      answerHost.querySelectorAll('input,textarea').forEach((node) => {
        node.disabled = true;
      });
      clear(actionHost);
    },
  };

  return controls;
}
