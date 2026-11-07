'use strict';

// Shared functions (20) live in ../unit-js/05-core.js, loaded right before this file:
//   scaleApp, cssMs, stageShowEl, reducedMotionPref, runStagedSequence, cancelStagedSequence,
//   goBack, updateBackButton, goToComponent, syncPracticeProgressNav, scqOptions, scqNextScreen,
//   scqAdvance, clampFeedbackPos, regionOffset, scqCloseHint, openImgZoom, closeImgZoom,
//   devScreenList, notifyDevHost

// ============================================================
//  CONSTANTS & GLOBAL STATE
//  methodica-math-percent-06-02 — רכיב 1, תרגול סטנדרטי (pptx slides 27-29):
//  TransitionScreen (s27) + 2×SingleChoiceQuestion (s28/s29). A 3rd question
//  (pptx slide 30) belongs to this same practice set ("נענה על 3 שאלות") but
//  is NOT built yet — see references/CONTENT_FLAGS.md #28 for why (its own
//  slide has no production-notes block, and its content reads as a 3-target
//  matching/DragAndDrop exercise rather than a 4th textual SingleChoice
//  question — flagged for producer confirmation rather than guessed).
//  practiceProgress below already models it as screen:null, per
//  720-templates/_global-components.md § Progress Question.
// ============================================================
const TOTAL_SCREENS = 4;
let currentScreen = 0;

const NAV_FLOW = [0, 1, 2, 3];

window.lomdaState = {};

// ============================================================
//  SCALING — fit 1280×710 canvas into any viewport (ported verbatim from
//  methodica-math-percent-06-01/script.js)
// ============================================================

window.addEventListener('resize', scaleApp);
scaleApp();

function getCanvasSize() {
  return { w: 1280, h: 710 };
}

// ============================================================
//  STAGED REVEAL ENGINE — ported verbatim from
//  methodica-math-percent-06-01/script.js (real elapsed-time sequencing
//  for screens whose entrance needs deliberate settle-then-pause timing
//  between elements — the shared Motion engine's fixed 180ms stagger reads
//  as too mechanical for these). Same API/behavior contract as 06-01: one
//  sequence per screen keyed by a stable string id, buildSteps() called
//  fresh every run so it always targets live DOM, first-visit-only replay
//  guard, prefers-reduced-motion shows everything instantly. See 06-01's
//  own header comment on runStagedSequence() for the full step-shape docs.
// ============================================================
var stagedSequences = {};

var STAGE_GAP_DEFAULT = cssMs('--m-reveal-stagger', 180);
var STAGE_DURATION_DEFAULT = cssMs('--m-reveal-duration', 600);

// Screen index -> staged-sequence key(s) to cancel when navigating away
// mid-sequence — same role as 06-01's STAGED_KEYS_BY_SCREEN.
var STAGED_KEYS_BY_SCREEN = {
  0: ['s27'],
  1: ['s28'],
  2: ['s29'],
  3: ['s30']
};

// ============================================================
//  NAVIGATION — same shape as 06-01's goTo/resetScreenState ladder
// ============================================================
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  var screens = document.querySelectorAll('.screen');
  Motion.cancel(screens[currentScreen]);
  (STAGED_KEYS_BY_SCREEN[currentScreen] || []).forEach(cancelStagedSequence);
  screens[currentScreen].classList.remove('active');
  currentScreen = n;
  screens[currentScreen].classList.add('active');
  Motion.reveal(screens[currentScreen]); // no-op for s27/s28/s29/s30 — they carry no top-level [data-reveal] groups, only [data-reveal-on-ready] driven by resetScreenState()'s staged sequences below
  updateBackButton();
  // Popups/hint overlays close on every navigation, per
  // 720-templates/_global-components.md § Feedback popup system.
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"], [id$="-zoom-modal"]').forEach(function (el) {
    el.hidden = true;
    el.classList.add('hidden');
  });
    /* A hidden clip carries data-src instead of src, so the page does not download it at load;
       it becomes a real src when its screen opens - BEFORE resetScreenState(n), whose enter hook
       may call play() (2026-11-04, the mass-weight-01 pattern). */
    document.querySelectorAll('.screen.active [data-src]').forEach(function (el) {
      el.setAttribute('src', el.getAttribute('data-src'));
      el.removeAttribute('data-src');
    });
  resetScreenState(n);
  /* Platform (../unit-js/): repaint the answered look from state, open/close the catalogue item,
     arm the debounced resume save — in this order, after resetScreenState (guide §8.4a).
     Never an empty catch: these live in the shared layer, the call lives here. */
  try { repaintScreen(n); } catch (e) { console.error('[resume] repaint', e); }
  try { xapiOnScreen(n); } catch (e) { console.error('[xAPI] onScreen', e); }
  try { scheduleResumeSave(); } catch (e) { console.error('[resume] schedule', e); }
  notifyDevHost();
}

// ============================================================
//  CROSS-COMPONENT NAVIGATION — shared by every 06-0N component.
//  Inside the production unit shell (root index.html + unit-shell.js) each
//  visited component stays alive in its own iframe, so moving to the
//  previous/next component is a UNIT_NAV request to the shell: going back
//  shows the previous component exactly as the learner left it (screen,
//  answers, feedback). The shell announces itself with UNIT_SHELL.
//  Opened standalone (no shell), it falls back to a sibling-folder page
//  load; '#end' makes the previous component open on its last screen.
// ============================================================
var UNIT_PREV_COMPONENT = '../methodica-math-percent-06-01/index.html';
var UNIT_NEXT_COMPONENT = '../methodica-math-percent-06-03/index.html';
var unitShellHosted = false;

window.addEventListener('message', function (e) {
  if (e.source === window.parent && e.data && e.data.type === 'UNIT_SHELL') unitShellHosted = true;
});

function resetScreenState(n) {
  if (n === 0) s27Init();
  else if (n === 1) scqEnter('s28');
  else if (n === 2) scqEnter('s29');
  else if (n === 3) q3Enter();
}

// ---- Screen 0 (s27) — TransitionScreen, pptx slide 27 ----
// Staged entrance (lead line -> "3 שאלות" emphasis -> requirement subline),
// Continue gated until the sequence finishes, then pulses — same pattern
// as 06-01's s13StagedSteps(). The character image settles alongside the
// lead line (establishes the scene before the text builds further).
function s27StagedSteps() {
  var lead = document.getElementById('s27-lead');
  var emphasis = document.getElementById('s27-emphasis');
  var sub = document.getElementById('s27-sub');
  var char = document.getElementById('s27-character-img');
  return [
    { els: [lead, char], wait: 500 },
    { els: [emphasis], wait: 500 },
    { els: [sub], wait: 400 }, // Continue only enables after this pause, once the subline has fully settled
    { els: [], onShow: function () {
        var btn = document.getElementById('s27-continue');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function s27Init() {
  runStagedSequence('s27', s27StagedSteps);
}

// ============================================================
//  PROGRESS QUESTION — shared "שאלה N מתוך 3" nav, per
//  720-templates/_global-components.md § Progress Question. One state
//  object + one generic renderer drive every instance (s28/#s28-progress,
//  s29/#s29-progress); question 3 has screen:null (not built yet).
// ============================================================
const practiceProgress = {
  questions: [
    { number: 1, visited: false, state: 'not-answered', screen: 1 },
    { number: 2, visited: false, state: 'not-answered', screen: 2 },
    { number: 3, visited: false, state: 'not-answered', screen: 3 }
  ]
};

function buildProgressNav(container) {
  if (!container || container.childElementCount) return;
  practiceProgress.questions.forEach(function (q, i) {
    if (i > 0) {
      var conn = document.createElement('div');
      conn.className = 'progress-question__connector';
      conn.setAttribute('data-connector', String(i));
      container.appendChild(conn);
    }
    var item = document.createElement('div');
    item.className = 'progress-question__item';
    item.setAttribute('data-question', String(q.number));
    var icon = document.createElement('div');
    icon.className = 'progress-question__icon';
    var label = document.createElement('span');
    label.className = 'progress-question__label';
    label.textContent = 'سؤال ' + q.number;
    item.appendChild(icon);
    item.appendChild(label);
    container.appendChild(item);
  });
}

function updateProgressQuestion(container, state) {
  if (!container) return;
  buildProgressNav(container);
  state.questions.forEach(function (q, i) {
    var n = i + 1;
    var item = container.querySelector('[data-question="' + n + '"]');
    if (!item) return;
    var icon = item.querySelector('.progress-question__icon');
    var label = item.querySelector('.progress-question__label');
    icon.classList.remove(
      'progress-question__icon--current',
      'progress-question__icon--correct',
      'progress-question__icon--incorrect'
    );
    if (q.state !== 'not-answered') icon.classList.add('progress-question__icon--' + q.state);
    label.classList.toggle('progress-question__label--visited', q.visited);
    var navigable = q.visited && q.screen != null && q.screen !== currentScreen;
    item.style.cursor = navigable ? 'pointer' : '';
    item.onclick = navigable ? (function () { goTo(q.screen); }) : null;
  });
  for (var n = 1; n < state.questions.length; n++) {
    var conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    var qState = state.questions[n - 1].state;
    conn.classList.toggle('progress-question__connector--visited', qState === 'correct' || qState === 'incorrect');
  }
}

// ============================================================
//  PRACTICE RESULT + ROUTING — reusable pass/fail branch for the handoff
//  after the 3-question practice block, per s27's own "צריך לענות נכון על
//  2 לפחות" (need at least 2 of 3 correct):
//    score 2/3 or 3/3 -> PASS
//    score 0/3 or 1/3 -> FAIL
//  Score is derived from practiceProgress (one 'correct'/'incorrect' signal
//  per question — s30's is already holistic across its 3 sub-parts, see
//  q3Check()), so this stays correct with no separate scoring state to keep
//  in sync.
//
//  Unit-flow session (2026-08-18): the unit's required navigation is
//  strictly linear (01→02→03→04→05→06, no adaptive branching), same
//  sibling-folder handoff convention as 06-01's own goToComponent02() —
//  so both outcomes route to the same next component, 06-03. Scoring/
//  attempts/feedback above are untouched; only the routing destination
//  was filled in.
// ============================================================
const PRACTICE_ROUTING = {
  pass: '../methodica-math-percent-06-03/index.html',
  fail: '../methodica-math-percent-06-03/index.html'
};

function getPracticeScore() {
  return practiceProgress.questions.filter(function (q) { return q.state === 'correct'; }).length;
}

function getPracticeResult() {
  return getPracticeScore() >= 2 ? 'pass' : 'fail';
}

// Q3's Continue ("هل نتابع؟") calls this instead of scqAdvance('s30') — s30 is
// the last screen in THIS component's own NAV_FLOW, but the practice block
// as a whole always has a valid way forward, it just isn't wired to a real
// destination yet (see PRACTICE_ROUTING above). Recorded on window.lomdaState
// so a future next-component/DEV harness can read it.
/* ── The last click of this component (platform, guide §6.4 / §6.5 / §8.12) ──
   Reports the component 'completed' and stops: the platform owns routing (recommendedAfterFail),
   so the button is disabled and nothing navigates — except in a DEV_NAV walkthrough.
   success = the pass mark s27 PROMISES ("צריך לענות נכון על 2 שאלות לפחות" — 2 of the 3 questions,
   s30 counting as one, holistic); scaled = correct graded questions / all 5 declared (005 q1,
   006 q1, 007 q1-q3). The gate is not the score (guide §6.4). Below the mark the component still
   ends, with success:false. The verdict goes through setUnitResult (D-12), then the flush. */
function practiceAdvance() {
  var result = getPracticeResult();
  window.lomdaState.practiceResult = result;
  window.lomdaState.practiceScore = getPracticeScore();
  try { setUnitResult('percent06_c02_result', result); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(result === 'pass'), lastScreenButton()); }
  catch (e) { console.error('[xAPI] end component', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV && PRACTICE_ROUTING[result]) goToComponent('next'); // walkthrough only — both outcomes lead to 06-03
}

/* Per-part seam (restoreEndedButton, 20-xapi.js): the button whose click ends this component. */
function lastScreenButton() { return document.getElementById('s30-check'); }

// ============================================================
//  SingleChoiceQuestion — shared scq- prefixed logic, per
//  720-templates/SingleChoiceQuestion.md + _question-template-defaults.md.
//  One ruleset drives every SCQ screen in this part via SCQ_CONFIG/
//  scqState, keyed by screen id — not duplicated per screen.
// ============================================================
const SCQ_CONFIG = {
  s28: { correctId: 'b', maxAttempts: 2, qNumber: 1 },
  s29: { correctId: 'c', maxAttempts: 2, qNumber: 2 }
};

const scqState = {
  s28: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  s29: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  s30: { hintUsed: false } // selection/attempts state for s30 lives in q3State below (multi-part)
};

// Hint copy per screen — kept out of the HTML so the shared #scq-hint-overlay
// (one instance, outside all .screen divs) can inject the right body on open.
const SCQ_HINT = {
  s28: '<p>4% تعني 4 من أصل 100. إذا اختزلنا الكسر بقسمة البسط والمقام على 4، نحصل على:</p>' +
       '<div class="gvi-feedback-eq">' +
         '<div class="gvi-fraction"><span class="num">4</span><span class="den">100</span></div>' +
         '<span class="gvi-eq-sign">=</span>' +
         '<div class="gvi-fraction"><span class="num">1</span><span class="den">25</span></div>' +
       '</div>' +
       '<p>ماذا يعني هذا؟</p>',
  s29: '<p class="hint-one-line">احسبوا كم بالمئة يمثل 30GB من 10GB</p>',
  s30: '<p>تحقّقوا مما إذا كان بالإمكان توسيع الكسر أو تبسيطه.</p>' +
       '<p>تذكروا: للحصول على كسر متكافئ يجب تنفيذ العملية نفسها على البسط والمقام معًا.</p>'
};

// Staged entrance shared by every SCQ screen (s28/s29): context sentence ->
// purple question stem -> image -> each answer option, one at a time. Built
// fresh per run (buildSteps contract) so it always targets live DOM/current
// option list. Reuses the ported runStagedSequence() engine — see its own
// header comment near scaleApp() above.
function scqStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  // context: usually one sentence (s28), sometimes two (s29's longer
  // literacy-style setup) — both reveal together as ONE step either way.
  var context = Array.prototype.slice.call(section.querySelectorAll('.scq-qtext [data-qrole="context"]'));
  var question = section.querySelector('.scq-qtext [data-qrole="question"]');
  var img = document.getElementById(screenId + '-img');
  var steps = [
    { els: context, wait: 400 },
    { els: [question], wait: 400 },
    { els: [img], wait: 400 }
  ];
  var opts = scqOptions(screenId);
  opts.forEach(function (opt, i) {
    steps.push({ els: [opt], wait: i === opts.length - 1 ? 0 : 250 });
  });
  return steps;
}

function scqEnter(screenId) {
  var st = scqState[screenId];
  var cfg = SCQ_CONFIG[screenId];
  var section = document.getElementById(screenId);

  // Progress nav: mark this question visited/current on every entry — even
  // on resume — per _global-components.md "re-sync the nav on every entry."
  practiceProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) practiceProgress.questions[cfg.qNumber - 1].state = 'current';
  syncPracticeProgressNav(section);

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (st.done) {
    // Resume-state guard — reopen feedback + keep the locked/marked
    // options rather than resetting, per _global-components.md "Reopening
        // feedback on return to a resolved screen."
    scqShowFeedback(screenId, st.lastOutcome, false);
    if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = !scqNextScreen(screenId); }
    if (hintBtn) hintBtn.disabled = true;
    // Re-lock the entrance state instantly (seq.played already true, so this
    // takes runStagedSequence's "instant" branch) — without this, returning
    // to an already-answered question would briefly blank it, same reasoning
    // as 06-01's hook1Init() resume branch.
    runStagedSequence(screenId, function () { return scqStagedSteps(screenId); });
    return;
  }

  st.selected = null;
  st.attempts = 0;
  st.hintUsed = false;
  st.lastWrong = null;

  scqOptions(screenId).forEach(function (opt) {
    opt.disabled = false;
    opt.classList.remove('selected', 'correct', 'wrong');
    opt.setAttribute('aria-checked', 'false');
  });
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) {
    feedbox.hidden = true;
    feedbox.classList.remove('is-correct', 'is-wrong', 'collapsed');
    feedbox.querySelectorAll('.scq-fb').forEach(function (fb) { fb.classList.remove('active'); });
  }
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; checkBtn.classList.remove('is-pulsing'); }
  // Standard practice — hint stays locked until the first submitted attempt
  // (unlocked in scqCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return scqStagedSteps(screenId); });
}

// Dismisses the retry-feedback popup as a side effect of starting a new
// attempt (selecting another option) — per _global-components.md
// "First-attempt retry feedback dismissal." Guarded by the caller's own
// `done` check, so correct/final feedback (which stays open until
// navigation) is never affected.
function dismissRetryPopup(screenId) {
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) { feedbox.hidden = true; feedbox.classList.add('hidden'); }
}

function scqSelect(screenId, id) {
  var st = scqState[screenId];
  if (st.done) return;
  dismissRetryPopup(screenId);

  scqOptions(screenId).forEach(function (opt) {
    var isThis = opt.getAttribute('data-id') === id;
    opt.classList.toggle('selected', isThis);
    opt.classList.remove('wrong'); // clears a prior wrong attempt's marks (_question-template-defaults.md § Retry gate)
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  st.selected = id;

  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) {
    // Retry gate (_question-template-defaults.md § Retry gate): after a
    // non-final wrong attempt, re-selecting the exact same wrong option
    // must keep the check button disabled.
    checkBtn.disabled = !st.selected || (st.selected === st.lastWrong);
  }
}

function scqCheck(screenId) {
  var st = scqState[screenId];
  var cfg = SCQ_CONFIG[screenId];
  if (st.done || !st.selected) return;

  var isCorrect = st.selected === cfg.correctId;
  st.attempts++;

  if (isCorrect) {
    st.done = true;
    st.lastOutcome = 'correct';
    practiceProgress.questions[cfg.qNumber - 1].state = 'correct';
    scqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      if (opt.getAttribute('data-id') === cfg.correctId) opt.classList.add('correct');
    });
    scqShowFeedback(screenId, 'correct', true);
  } else if (st.attempts < cfg.maxAttempts) {
    // Non-final wrong attempt — mark chosen option wrong, show the generic
    // retry prompt, then re-lock the check button until the selection
    // genuinely changes (Retry gate).
    st.lastWrong = st.selected;
    scqOptions(screenId).forEach(function (opt) {
      opt.classList.toggle('wrong', opt.getAttribute('data-id') === st.selected);
    });
    var checkBtn = document.getElementById(screenId + '-check');
    if (checkBtn) checkBtn.disabled = true;
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question.
    var hintBtnUnlock = document.getElementById(screenId + '-hint');
    if (hintBtnUnlock) hintBtnUnlock.disabled = false;
    scqShowFeedback(screenId, 'retry', true);
  } else {
    st.done = true;
    st.lastOutcome = 'wrong2';
    practiceProgress.questions[cfg.qNumber - 1].state = 'incorrect';
    scqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      var id = opt.getAttribute('data-id');
      if (id === cfg.correctId) opt.classList.add('correct');
      else if (id === st.selected) opt.classList.add('wrong');
    });
    scqShowFeedback(screenId, 'wrong2', true);
  }

  /* xAPI: one 'answered' per submission, after the grading chain (the verdict is final here).
     isLast = correct || attempts exhausted — only answered.last enters the score (guide §6.3). */
  xapiAnswered(xapiItemOf(screenId), 'q1', isCorrect, isCorrect || st.attempts >= cfg.maxAttempts,
    xapiAnswerText(document.querySelector('#' + screenId + ' .scq-opt[data-id="' + st.selected + '"]')));

  syncPracticeProgressNav(document.getElementById(screenId));

  if (st.done) {
    var checkBtn2 = document.getElementById(screenId + '-check');
    var hintBtn = document.getElementById(screenId + '-hint');
    if (checkBtn2) {
      checkBtn2.textContent = 'هل نتابع؟';
      checkBtn2.disabled = !scqNextScreen(screenId);
      checkBtn2.onclick = function () { scqAdvance(screenId); };
      // Pulse starts the moment feedback appears — not at first selection,
      // which is when this button first became clickable as "צדקתי?". See
      // #s28-check.is-pulsing etc. in styles.css. Only when there's actually
      // a next screen to advance to — a permanently-disabled dead-end
      // Continue (last screen in this component) never pulses, same as
      // 06-01's own #s26-continue:not(:disabled) precedent.
      if (!checkBtn2.disabled) checkBtn2.classList.add('is-pulsing');
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  /* Resume: the answer is committed — save synchronously, after the LAST commitment (guide §8.3,
     D-13); no return sits between the commitment and here. */
  try { flushResumeSave(); } catch (e) {}
}

function scqShowFeedback(screenId, outcome, animate) {
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (!feedbox) return;
  feedbox.classList.remove('is-correct', 'is-wrong', 'collapsed');
  feedbox.classList.add(outcome === 'correct' ? 'is-correct' : 'is-wrong');
  feedbox.querySelectorAll('.scq-fb').forEach(function (fb) {
    fb.classList.toggle('active', fb.getAttribute('data-fb') === outcome);
  });
  feedbox.hidden = false;
  feedbox.classList.remove('hidden');
  feedbox.classList.add('m-popup');
  positionFeedbackCard(screenId, feedbox.querySelector('.scq-fb.active'));
}

// ============================================================
//  FEEDBACK POPUP DRAG SUPPORT — global standard (per the 720 feedback-
//  popup spec): every floating feedback card is draggable, bounded to the
//  canvas, and resets to its default position on every fresh open (never
//  remembers a prior drag). Mirrors the hint-popup drag system's own
//  clamp formula (margin on X only; Y is flush against the top edge / the
//  bottom bar) so both popup families behave identically.
// ============================================================
var FEEDBACK_DRAG_MARGIN = 16;
var BOTTOM_BAR_H = 74; // matches .screen::after's fixed height

// Called by every show-feedback function right after unhiding the region,
// while the active card is briefly in normal (flex-centered) flow just long
// enough to measure its natural size — then pins it to the global
// popup-placement rule's default resting spot (bottom-left of the usable
// canvas, above the bottom bar) so the drag handler below can move it
// afterward. Anchoring bottom-left (instead of the region's flex-centered
// position) keeps the card in the same physical corner across retry/
// correct/wrong2 regardless of how tall each outcome's content is — the
// previous center-measured approach let a short retry card and a much
// taller correct/wrong2 card land at visibly different spots (the Q1/Q2
// "jump" this fixes).
function positionFeedbackCard(screenId, card) {
  if (!card) return;
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';

  var app = document.getElementById('app');
  var pos = { x: FEEDBACK_DRAG_MARGIN, y: (app.offsetHeight - BOTTOM_BAR_H) - FEEDBACK_DRAG_MARGIN - card.offsetHeight };
  pos = clampFeedbackPos(pos.x, pos.y, card);
  var off = regionOffset(card.parentElement);
  card.style.position = 'absolute';
  card.style.left = (pos.x - off.x) + 'px';
  card.style.top = (pos.y - off.y) + 'px';
}

(function () {
  var dragEl = null, offX = 0, offY = 0, regionOffX = 0, regionOffY = 0;

  function appScale() {
    var app = document.getElementById('app');
    return app.getBoundingClientRect().width / app.offsetWidth;
  }

  document.addEventListener('pointerdown', function (e) {
    // Buttons/inputs inside the card (e.g. the collapse chevron) keep their
    // own click behavior — only the card's plain surface starts a drag.
    if (e.target.closest('button, input, a')) return;
    var card = e.target.closest('.scq-fb.active');
    if (!card) return;
    dragEl = card;
    var scale = appScale();
    var rect = card.getBoundingClientRect();
    var off = regionOffset(card.parentElement);
    regionOffX = off.x; regionOffY = off.y;
    offX = (e.clientX - rect.left) / scale;
    offY = (e.clientY - rect.top) / scale;
    card.setPointerCapture(e.pointerId);
  });

  document.addEventListener('pointermove', function (e) {
    if (!dragEl) return;
    var scale = appScale();
    var app = document.getElementById('app');
    var appRect = app.getBoundingClientRect();
    var x = (e.clientX - appRect.left) / scale - offX; // canvas-space, app-relative
    var y = (e.clientY - appRect.top) / scale - offY;
    var pos = clampFeedbackPos(x, y, dragEl);
    dragEl.style.left = (pos.x - regionOffX) + 'px';
    dragEl.style.top = (pos.y - regionOffY) + 'px';
  });

  document.addEventListener('pointerup', function () { dragEl = null; });
})();

function scqToggleFeedbox(screenId) {
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) feedbox.classList.toggle('collapsed');
}

// ---- Hint modal — one shared overlay for every SCQ screen in this part ----
// Reusable while the screen is unresolved: opening/closing must never
// disable or hide the trigger — only scqEnter's `st.done` branch and
// scqCheck's final-outcome branch retire it for good.
function scqOpenHint(screenId) {
  var overlay = document.getElementById('scq-hint-overlay');
  var body = document.getElementById('scq-hint-body');
  if (!overlay || !body) return;
  /* xAPI: requested.1 — after the guards, immediately before the hint is actually shown. This
     function only OPENS (scqCloseHint closes), so there is no double report; the hints ledger
     dedupes a re-open. s30's one hint covers its three sub-questions: reported under q1. */
  xapiRequestedHint(xapiItemOf(screenId), 'q1');
  body.innerHTML = SCQ_HINT[screenId] || '';
  overlay.hidden = false;
  overlay.classList.remove('hidden');
}

// ============================================================
//  s30 — pptx slide 30, שאלה 3 מתוך 3. Local SingleChoiceQuestion variant:
//  THREE independent single-choice sub-parts (A/B/C, one per pie diagram)
//  sharing one question, one hint, one feedback popup, and one holistic
//  2-attempt grading pass — see index.html's own header comment on #s30
//  and CONTENT_FLAGS.md #28/#30 for the content/asset derivation this is
//  built from. Reuses .scq-opt/.scq-radio pill states verbatim (compact
//  wrapped layout, .q3-pills) — no new visual states needed.
// ============================================================
const Q3_CORRECT = { A: 'v311', B: 'v1034', C: 'v40' };
const Q3_PARTS = ['A', 'B', 'C'];

const q3State = {
  selected: { A: null, B: null, C: null },
  lockedCorrect: { A: false, B: false, C: false },
  attempts: 0,
  done: false,
  lastOutcome: null,
  lastWrongSnapshot: null
};

function q3PartEl(part) {
  return document.querySelector('#s30 .q3-part[data-part="' + part + '"]');
}

function q3Options(part) {
  var el = q3PartEl(part);
  return el ? Array.prototype.slice.call(el.querySelectorAll('.scq-opt')) : [];
}

// Snapshot of the still-editable (not locked-correct) sub-parts' current
// selections — the Retry gate comparison shape for this multi-value screen,
// per _question-template-defaults.md § Retry gate ("a normalized per-slot
// state object").
function q3Snapshot() {
  var snap = {};
  Q3_PARTS.forEach(function (part) {
    if (!q3State.lockedCorrect[part]) snap[part] = q3State.selected[part];
  });
  return JSON.stringify(snap);
}

function q3UpdateCheckReady() {
  var btn = document.getElementById('s30-check');
  if (!btn || q3State.done) return;
  var allSelected = Q3_PARTS.every(function (part) {
    return q3State.lockedCorrect[part] || q3State.selected[part];
  });
  var unchanged = q3State.lastWrongSnapshot !== null && q3Snapshot() === q3State.lastWrongSnapshot;
  btn.disabled = !allSelected || unchanged;
}

function q3Select(part, value) {
  if (q3State.done || q3State.lockedCorrect[part]) return;
  dismissRetryPopup('s30');

  q3State.selected[part] = value;
  q3Options(part).forEach(function (opt) {
    var isThis = opt.getAttribute('data-id') === value;
    opt.classList.toggle('selected', isThis);
    opt.classList.remove('wrong');
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  q3UpdateCheckReady();
}

// Staged entrance for s30: shared context -> shared purple instruction ->
// all three parts' graph+card together (ONE step, as a single unit) — all
// three sub-parts reveal and become interactive at once (session correction:
// replaces an earlier progressive-disclosure design where B/C only appeared
// once the part before them was answered). Reuses the same
// runStagedSequence() engine as scqStagedSteps()/s27StagedSteps().
function q3StagedSteps() {
  var context = document.getElementById('s30-context');
  var instruction = document.getElementById('s30-instruction');
  var partEls = [];
  Q3_PARTS.forEach(function (part) {
    var el = q3PartEl(part);
    if (!el) return;
    var graph = el.querySelector('.q3-img');
    var card = el.querySelector('.q3-answer-card');
    if (graph) partEls.push(graph);
    if (card) partEls.push(card);
  });
  return [
    { els: [context], wait: 400 },
    { els: [instruction], wait: 400 },
    { els: partEls, wait: 0 }
  ];
}

function q3Enter() {
  var section = document.getElementById('s30');
  practiceProgress.questions[2].visited = true;
  if (!q3State.done) practiceProgress.questions[2].state = 'current';
  syncPracticeProgressNav(section);

  var checkBtn = document.getElementById('s30-check');
  var hintBtn = document.getElementById('s30-hint');

  if (q3State.done) {
    scqShowFeedback('s30', q3State.lastOutcome, false);
    // s30 is the last screen in THIS component's NAV_FLOW, but the practice
    // block itself always has a valid way forward via practiceAdvance() —
    // never a disabled dead end just because scqNextScreen('s30') is false.
    if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = false; checkBtn.onclick = practiceAdvance; checkBtn.classList.add('is-pulsing'); }
    if (hintBtn) hintBtn.disabled = true;
    // Re-lock the entrance state instantly — same resume-guard reasoning as
    // scqEnter()'s equivalent call.
    runStagedSequence('s30', q3StagedSteps);
    return;
  }

  Q3_PARTS.forEach(function (part) {
    q3State.selected[part] = null;
    q3State.lockedCorrect[part] = false;
    q3Options(part).forEach(function (opt) {
      opt.classList.remove('selected', 'correct', 'wrong');
      opt.setAttribute('aria-checked', 'false');
    });
  });
  q3State.attempts = 0;
  q3State.lastWrongSnapshot = null;

  // All 3 parts are interactive from the start (session correction: replaces
  // an earlier progressive-disclosure design, see q3StagedSteps()).
  Q3_PARTS.forEach(function (part) {
    q3Options(part).forEach(function (opt) { opt.disabled = false; });
  });

  var feedbox = document.getElementById('s30-feedbox');
  if (feedbox) {
    feedbox.hidden = true;
    feedbox.classList.remove('is-correct', 'is-wrong', 'collapsed');
    feedbox.querySelectorAll('.scq-fb').forEach(function (fb) { fb.classList.remove('active'); });
  }
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; checkBtn.classList.remove('is-pulsing'); }
  // Standard practice — hint stays locked until the first submitted attempt
  // (unlocked in q3Check()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence('s30', q3StagedSteps);
}

function q3Check() {
  if (q3State.done) return;
  var allSelected = Q3_PARTS.every(function (part) {
    return q3State.lockedCorrect[part] || q3State.selected[part];
  });
  if (!allSelected) return;

  q3State.attempts++;
  var allCorrect = true;

  Q3_PARTS.forEach(function (part) {
    if (q3State.lockedCorrect[part]) return; // Partial-correction flow: already-correct sub-parts stay locked, never re-graded
    var isPartCorrect = q3State.selected[part] === Q3_CORRECT[part];
    if (isPartCorrect) q3State.lockedCorrect[part] = true;
    else allCorrect = false;
  });

  var isFinal = allCorrect || q3State.attempts >= 2;

  Q3_PARTS.forEach(function (part) {
    q3Options(part).forEach(function (opt) {
      var id = opt.getAttribute('data-id');
      if (q3State.lockedCorrect[part]) {
        opt.disabled = true;
        opt.classList.toggle('correct', id === Q3_CORRECT[part]);
        opt.classList.toggle('wrong', false);
      } else if (isFinal) {
        // Final wrong attempt: reveal the correct value + mark the chosen wrong one, per SingleChoiceQuestion.md "Incorrect 2nd attempt".
        opt.disabled = true;
        opt.classList.toggle('correct', id === Q3_CORRECT[part]);
        opt.classList.toggle('wrong', id === q3State.selected[part] && id !== Q3_CORRECT[part]);
      } else {
        opt.classList.toggle('wrong', id === q3State.selected[part] && id !== Q3_CORRECT[part]);
      }
    });
  });

  /* xAPI: item 007 declares three questions (עוגה א/ב/ג) and the code knows each part's
     correctness, so each is reported on its own (guide §6.3, D-9) with the screen's SHARED isLast.
     A part locked correct on attempt 1 is reported again on attempt 2 — only .last is scored. */
  Q3_PARTS.forEach(function (part, i) {
    xapiAnswered(xapiItemOf('s30'), 'q' + (i + 1), q3State.lockedCorrect[part], isFinal,
      xapiAnswerText(document.querySelector('#s30 .q3-part[data-part="' + part + '"] .scq-opt[data-id="' + q3State.selected[part] + '"]')));
  });

  var checkBtn = document.getElementById('s30-check');
  var hintBtn = document.getElementById('s30-hint');

  if (allCorrect) {
    q3State.done = true;
    q3State.lastOutcome = 'correct';
    practiceProgress.questions[2].state = 'correct';
    scqShowFeedback('s30', 'correct', true);
  } else if (!isFinal) {
    // Non-final wrong attempt — generic retry prompt; re-lock the check
    // button until the still-wrong sub-parts' selections genuinely change.
    q3State.lastWrongSnapshot = q3Snapshot();
    if (checkBtn) checkBtn.disabled = true;
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question.
    if (hintBtn) hintBtn.disabled = false;
    scqShowFeedback('s30', 'retry', true);
  } else {
    q3State.done = true;
    q3State.lastOutcome = 'wrong2';
    practiceProgress.questions[2].state = 'incorrect';
    scqShowFeedback('s30', 'wrong2', true);
  }

  syncPracticeProgressNav(document.getElementById('s30'));

  if (q3State.done) {
    if (checkBtn) {
      checkBtn.textContent = 'هل نتابع؟';
      // s30 is the last screen in THIS component's NAV_FLOW (scqNextScreen
      // would say false), but the practice block itself always has a valid
      // way forward via practiceAdvance() — see its own header comment for
      // why the actual destination is a deliberate placeholder for now.
      checkBtn.disabled = false;
      checkBtn.onclick = practiceAdvance;
      // Pulse starts with feedback, not at first selection — see styles.css.
      checkBtn.classList.add('is-pulsing');
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var hintOverlay = document.getElementById('scq-hint-overlay');
  if (hintOverlay && !hintOverlay.hidden) scqCloseHint();
  var zoomModal = document.getElementById('img-zoom-modal');
  if (zoomModal && !zoomModal.classList.contains('hidden')) closeImgZoom();
});

// ============================================================
//  IMAGE ZOOM — one shared modal per part, per _global-components.md
//  § Image zoom. Delegated click handler: any [data-zoom-src] opens, any
//  [data-zoom-close="true"] closes.
// ============================================================

document.addEventListener('click', function (e) {
  var zoomBtn = e.target.closest('[data-zoom-src]');
  if (zoomBtn) {
    openImgZoom(zoomBtn.getAttribute('data-zoom-src'), zoomBtn.getAttribute('data-zoom-alt'));
    return;
  }
  if (e.target.closest('[data-zoom-close="true"]')) closeImgZoom();
});

// ============================================================
//  DEV MODE — postMessage bridge for index_dev.html (ported verbatim from
//  06-01's convention).
// ============================================================

window.addEventListener('message', function (e) {
  if (!e.data) return;
  if (e.data.type === 'DEV_GOTO') {
    var n = parseInt(e.data.screen, 10);
    if (!isNaN(n)) goTo(n);
  } else if (e.data.type === 'DEV_RESET') {
    resetScreenState(currentScreen);
  }
});

if (window.parent !== window) {
  window.parent.postMessage({
    type: 'DEV_READY',
    total: document.querySelectorAll('.screen').length,
    current: currentScreen,
    screens: devScreenList()
  }, '*');
}

// Initial render
updateBackButton(); // screen 0 back -> previous component
resetScreenState(0);
if (location.hash === '#end') goTo(NAV_FLOW[NAV_FLOW.length - 1]); // standalone back-navigation from the next component, see goToComponent()

/* ═══════════════════ xAPI (720) — this component's configuration ═══════════════════
   Data only (var). The shared layer in ../unit-js/ reads it at CALL time, so it may sit after all
   the code that uses it. Ids verified against ../metadata/methodica-math-percent-06-02.json (2026-10-20).

   SCREEN_TO_SUBCONTENT: 0-based screen index (= data-screen = goTo(n)) -> [item suffix, page in
   item]. ⚠️ Exactly TOTAL_SCREENS keys (4), no gaps — a missing key is a screen that silently
   never reports (guide §6.2). Only [0] is read; [1] documents the paging. */
var SCREEN_TO_SUBCONTENT = {
   0: ['001', 1],   // s27
   1: ['001', 2],   // s28
   2: ['002', 1],   // s29
   3: ['003', 1]    // s30
};

var XAPI_COMP_SLUG = 'methodica-math-percent-06-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
/* Item ids carry this component's own slug — no XAPI_ITEM_SLUG needed. Until 2026-10-20 they
   carried the script's numbering (methodica-math-percent-06-01-005..007); MOE renumbered them in
   KATA to 06-02-001..003 and the tester asked for the same in xAPI. */
/* Items that carry a code-graded question — used as a set. */
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-06-02.json';

/* ═══════════════════ Resume (KATA State API) — this component's hooks ═══════════════════
   Read by ../unit-js/40-resume.js at CALL time (guide §8.7). Contract (40-resume.js "Snapshot
   helpers"): only FINISHED questions are saved; an unfinished one starts fresh on return, exactly
   as it already did when the learner navigated away and back. The enter functions
   (resetScreenState) already rebuild a finished screen's feedback / progress / button from these
   variables; restoreScreenUI adds what only the live check leaves in the DOM (the option marks,
   typed values) and re-wires the SCQ "هل نتابع؟" — the markup's scqCheck() returns early once done, so
   after a reload the button would otherwise be dead (guide §8.4a). Every painter paints from state and never resets (guide §8.8).
   applyResumeDom has nothing to do: no answer here lives only in the DOM. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qr: resumeClone(XAPI_Q_RESULTS),
    scq: resumeDoneEntries({ s28: scqState.s28, s29: scqState.s29 }),
    q3: q3State.done ? resumeClone(q3State) : null,
    prog: resumeProgress(practiceProgress)
  };
}
/* A document saved before 2026-10-20 keys XAPI_Q_RESULTS by the old item suffixes (005..007).
   Map them onto the new ones, or a resumed learner's earlier answers would drop out of the
   component score. Keys already in the new form pass through unchanged. */
var RESUME_OLD_ITEM_SUFFIX = { '005': '001', '006': '002', '007': '003' };
function migrateQrKeys(qr) {
  if (!qr) return qr;
  var out = {};
  Object.keys(qr).forEach(function (k) {
    var p = k.split('/');
    if (RESUME_OLD_ITEM_SUFFIX[p[0]]) p[0] = RESUME_OLD_ITEM_SUFFIX[p[0]];
    out[p.join('/')] = qr[k];
  });
  return out;
}
function applyResumeVars(st) {
  resumeAssign(XAPI_Q_RESULTS, migrateQrKeys(st.qr));
  resumeAssignMap(scqState, st.scq);
  if (st.q3) resumeAssign(q3State, st.q3);
  resumeApplyProgress(practiceProgress, st.prog);
}
function applyResumeDom(st) {}
function restoreScreenUI(n) {
  var id = resumeScreenId(n);
  if (SCQ_CONFIG[id] && scqState[id].done) {
    resumePaintChoice(scqOptions(id), [scqState[id].selected], [SCQ_CONFIG[id].correctId]);
    var b = document.getElementById(id + '-check');
    if (b && scqNextScreen(id)) b.onclick = function () { scqAdvance(id); };
  }
  if (id === 's30' && q3State.done) {
    Q3_PARTS.forEach(function (part) { resumePaintChoice(q3Options(part), [q3State.selected[part]], [Q3_CORRECT[part]]); });
  }
}
