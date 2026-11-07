'use strict';

// Shared functions (20) live in ../unit-js/05-core.js, loaded right before this file:
//   scaleApp, cssMs, stageShowEl, reducedMotionPref, runStagedSequence, cancelStagedSequence,
//   goBack, updateBackButton, goToComponent, syncPracticeProgressNav, scqOptions, scqNextScreen,
//   scqAdvance, clampFeedbackPos, regionOffset, scqCloseHint, openImgZoom, closeImgZoom,
//   devScreenList, notifyDevHost

// ============================================================
//  CONSTANTS & GLOBAL STATE
//  methodica-math-percent-06-04 — Advanced Practice / תרגול מתקדם
//  (pptx slides 42-46): TransitionScreen (s42) + 4×SingleChoiceQuestion
//  (s43/s44/s45/s46). s44 (Q2A) and s45 (Q2B) share ONE item id
//  (methodica-math-percent-06-04-002) and ONE progress-question node
//  ("שאלה 2 מתוך 3") — approved design, see practiceProgress and
//  scqSetProgressState() below. Standalone-SCQ engine ported verbatim from
//  methodica-math-percent-06-02/script.js (the closest structural match —
//  each question is its own screen with one "צדקתי?" button doubling as
//  Continue, not 06-03's later scroll+inline-feedback variant).
// ============================================================
const TOTAL_SCREENS = 5;
let currentScreen = 0;

const NAV_FLOW = [0, 1, 2, 3, 4];

window.lomdaState = {};

// ============================================================
//  SCALING — fit 1280×710 canvas into any viewport (ported verbatim)
// ============================================================

window.addEventListener('resize', scaleApp);
scaleApp();

function getCanvasSize() {
  return { w: 1280, h: 710 };
}

// ============================================================
//  STAGED REVEAL ENGINE — ported verbatim from
//  methodica-math-percent-06-02/script.js (itself ported from 06-01): real
//  elapsed-time sequencing for screens whose entrance needs deliberate
//  settle-then-pause timing between elements. One sequence per screen keyed
//  by a stable string id, buildSteps() called fresh every run so it always
//  targets live DOM, first-visit-only replay guard, prefers-reduced-motion
//  shows everything instantly.
// ============================================================
var stagedSequences = {};

var STAGE_GAP_DEFAULT = cssMs('--m-reveal-stagger', 180);
var STAGE_DURATION_DEFAULT = cssMs('--m-reveal-duration', 600);

// Screen index -> staged-sequence key(s) to cancel when navigating away mid-sequence.
var STAGED_KEYS_BY_SCREEN = {
  0: ['s42'],
  1: ['s43'],
  2: ['s44'],
  3: ['s45'],
  4: ['s46']
};

// ============================================================
//  NAVIGATION — same shape as 06-01/06-02's goTo/resetScreenState ladder
// ============================================================
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  var screens = document.querySelectorAll('.screen');
  Motion.cancel(screens[currentScreen]);
  (STAGED_KEYS_BY_SCREEN[currentScreen] || []).forEach(cancelStagedSequence);
  screens[currentScreen].classList.remove('active');
  currentScreen = n;
  screens[currentScreen].classList.add('active');
  Motion.reveal(screens[currentScreen]); // no-op here — screens carry no top-level [data-reveal] groups, only [data-reveal-on-ready] driven by resetScreenState()'s staged sequences below
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
var UNIT_PREV_COMPONENT = '../methodica-math-percent-06-03/index.html';
var UNIT_NEXT_COMPONENT = '../methodica-math-percent-06-05/index.html';
var unitShellHosted = false;

window.addEventListener('message', function (e) {
  if (e.source === window.parent && e.data && e.data.type === 'UNIT_SHELL') unitShellHosted = true;
});

function resetScreenState(n) {
  if (n === 0) s42Init();
  else if (n === 1) scqEnter('s43');
  else if (n === 2) scqEnter('s44');
  else if (n === 3) scqEnter('s45');
  else if (n === 4) scqEnter('s46');
}

// ---- Screen 0 (s42) — TransitionScreen, pptx slide 42 ----
// Staged entrance, per explicit instruction: purple emphasis line -> smaller
// parenthetical subline -> character_gift image -> Continue enables. Same
// engine/pattern as 06-02's s27StagedSteps(), different element grouping
// (character revealed LAST here, not alongside the first text line, per the
// approved research-note sequencing).
function s42StagedSteps() {
  var emphasis = document.getElementById('s42-emphasis');
  var sub = document.getElementById('s42-sub');
  var char = document.getElementById('s42-character-img');
  return [
    { els: [emphasis], wait: 500 },
    { els: [sub], wait: 500 },
    { els: [char], wait: 400 },
    { els: [], onShow: function () {
        var btn = document.getElementById('s42-continue');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function s42Init() {
  runStagedSequence('s42', s42StagedSteps);
}

// ============================================================
//  PROGRESS QUESTION — shared "שאלה N מתוך 3" nav, per
//  720-templates/_global-components.md § Progress Question. One state
//  object + one generic renderer drive every instance (s43/#s43-progress,
//  s44/#s44-progress, s45/#s45-progress, s46/#s46-progress).
//
//  Approved Q2A/Q2B design: s44 (Q2A) and s45 (Q2B) are two separate
//  NAV_FLOW screens but BOTH represent progress node 2 ("שאלה 2 מתוך 3") —
//  no 4th node is ever created. Node 2's "screen" target (for click-to-
//  navigate) points at s44 (index 2), the start of question 2 — re-entering
//  "question 2" from the nav always starts at its first sub-part. Node 2
//  stays in the "current" state through both s44 and s45; only s45's own
//  resolution (combining both sub-parts' outcomes — see
//  scqSetProgressState()) resolves it to correct/incorrect. Node 3 (Q3)
//  stays "not-answered" (grey) until the learner actually reaches it.
// ============================================================
const practiceProgress = {
  questions: [
    { number: 1, visited: false, state: 'not-answered', screen: 1 }, // Q1 (s43)
    { number: 2, visited: false, state: 'not-answered', screen: 2 }, // Q2A/Q2B (s44/s45) — one shared node
    { number: 3, visited: false, state: 'not-answered', screen: 4 }  // Q3 (s46)
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
//  SingleChoiceQuestion — shared scq- prefixed logic, per
//  720-templates/SingleChoiceQuestion.md + _question-template-defaults.md.
//  One ruleset drives every SCQ screen in this component via SCQ_CONFIG/
//  scqState, keyed by screen id.
// ============================================================
const SCQ_CONFIG = {
  s43: { correctId: 'a', maxAttempts: 2, qNumber: 1 },
  s44: { correctId: 'b', maxAttempts: 2, qNumber: 2 }, // Q2A
  s45: { correctId: 'c', maxAttempts: 2, qNumber: 2 }, // Q2B — same node as s44
  s46: { correctId: 'b', maxAttempts: 2, qNumber: 3 }
};

/* xAPI: the metadata question each SCQ screen answers. Item 002 declares two questions, one per
   sub-part screen (s44 = א, s45 = ב); every other screen answers its item's q1. */
const SCQ_QKEY = { s43: 'q1', s44: 'q1', s45: 'q2', s46: 'q1' };

const scqState = {
  s43: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  s44: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  s45: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  s46: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null }
};

// Hint copy per screen — kept out of the HTML so the shared #scq-hint-overlay
// (one instance, outside all .screen divs) can inject the right body on open.
const SCQ_HINT = {
  s43: '<p>أيّ المعلومتين أسهل في الفهم: 31 من أصل 1,250 أم 2.48%؟</p>' +
       '<p><strong>أيُّ التمثيلات تساعد على فهم مدى كبر المشكلة بشكل أفضل؟</strong></p>',
  s44: '<p>ما النسبة بين الزيادة (100 نقطة) وبين عدد نقاط الحياة الابتدائي (500 نقطة)؟</p>' +
       '<p><strong>ثم حوّلوا الكسر إلى نسب مئوية.</strong></p>',
  s45: '<p>هذه المرة يجب حساب نسبة الانخفاض من عدد نقاط الحياة التي كانت لدى الشخصية بعد الجرعة.</p>' +
       '<p>كم كانت لديها من نقاط الحياة قبل أن تخسر 100 نقطة؟</p>',
  s46: '<p>اكتبوا مبلغ التوفير ككسر من المال الذي كان في المحفظة.</p>' +
       '<p><strong>50 من أصل 200،</strong> ثم حوّلوا الكسر إلى نسبة مئوية.</p>'
};

// Staged entrance shared by every SCQ screen: context sentence(s) -> purple
// question stem -> image -> each answer option, one at a time. Built fresh
// per run (buildSteps contract) so it always targets live DOM/current
// option list. Reuses the ported runStagedSequence() engine.
function scqStagedSteps(screenId) {
  var section = document.getElementById(screenId);
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
    // Resume-state guard — reopen feedback + keep the locked/marked options
    // rather than resetting, per _global-components.md "Reopening feedback
    // on return to a resolved screen."
    scqShowFeedback(screenId, st.lastOutcome, false);
    if (checkBtn) {
      checkBtn.textContent = 'هل نتابع؟';
      checkBtn.disabled = false;
      checkBtn.onclick = scqNextScreen(screenId)
        ? function () { scqAdvance(screenId); }
        : goToComponent05;
    }
    if (hintBtn) hintBtn.disabled = true;
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
  // Advanced practice — hint stays locked until the first submitted attempt
  // (unlocked in scqCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return scqStagedSteps(screenId); });
}

// Dismisses the retry-feedback popup as a side effect of starting a new
// attempt (selecting another option) — per _global-components.md
// "First-attempt retry feedback dismissal."
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
    opt.classList.remove('wrong'); // clears a prior wrong attempt's marks
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  st.selected = id;

  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) {
    // Retry gate: after a non-final wrong attempt, re-selecting the exact
    // same wrong option must keep the check button disabled.
    checkBtn.disabled = !st.selected || (st.selected === st.lastWrong);
  }
}

// Resolves the shared progress node for s44 (Q2A) / s45 (Q2B) per the
// approved design: Q2A resolving on its own never resolves node 2 — it
// stays "current" until Q2B also resolves, at which point node 2 becomes
// correct only if BOTH sub-parts' own outcome was 'correct'. Every other
// screen just sets its own node directly, same as 06-02's original inline
// assignment.
function scqSetProgressState(cfg, screenId, resolvedState) {
  if (screenId === 's44') {
    practiceProgress.questions[cfg.qNumber - 1].state = 'current';
  } else if (screenId === 's45') {
    var q2aCorrect = scqState.s44.lastOutcome === 'correct';
    var q2bCorrect = resolvedState === 'correct';
    practiceProgress.questions[cfg.qNumber - 1].state = (q2aCorrect && q2bCorrect) ? 'correct' : 'incorrect';
  } else {
    practiceProgress.questions[cfg.qNumber - 1].state = resolvedState;
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
    scqSetProgressState(cfg, screenId, 'correct');
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
    scqSetProgressState(cfg, screenId, 'incorrect');
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
  xapiAnswered(xapiItemOf(screenId), SCQ_QKEY[screenId], isCorrect, isCorrect || st.attempts >= cfg.maxAttempts,
    xapiAnswerText(document.querySelector('#' + screenId + ' .scq-opt[data-id="' + st.selected + '"]')));

  syncPracticeProgressNav(document.getElementById(screenId));

  if (st.done) {
    var checkBtn2 = document.getElementById(screenId + '-check');
    var hintBtn = document.getElementById(screenId + '-hint');
    if (checkBtn2) {
      checkBtn2.textContent = 'هل نتابع؟';
      checkBtn2.disabled = false;
      // s46 (last screen in this component's own NAV_FLOW) now hands off to
      // 06-05 via a real page navigation instead of staying disabled — same
      // sibling-folder convention as 06-01's own goToComponent02().
      checkBtn2.onclick = scqNextScreen(screenId)
        ? function () { scqAdvance(screenId); }
        : goToComponent05;
      checkBtn2.classList.add('is-pulsing');
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  /* Resume: the answer is committed — save synchronously, after the LAST commitment (guide §8.3,
     D-13); no return sits between the commitment and here. */
  try { flushResumeSave(); } catch (e) {}
}

/* ── The last click of this component (platform, guide §6.5 / §8.12) ──
   s46's "هل نتابع؟". Reports the component 'completed' and stops — the platform owns routing, so
   the button is disabled and nothing navigates except in a DEV_NAV walkthrough.
   s42 promises no pass mark ("זמן ל - 3 שאלות מתקדמות") and the component is not required;
   scaled = correct / the 4 declared questions (001 q1, 002 q1-q2, 003 q1; unanswered = wrong).
   MOE 2026-10-08: real score, success only ≥60%, no gate, nothing shown (was: always true). */
function goToComponent05() {
  var _ok = false;
  try { _ok = xapiComponentResult(false).score.scaled >= 0.6; } catch (e) { console.error('[xAPI] score', e); }
  try { setUnitResult('percent06_c04_result', _ok ? 'pass' : 'fail'); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(_ok), lastScreenButton()); }
  catch (e) { console.error('[xAPI] end component', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) goToComponent('next');
}

/* Per-part seam (restoreEndedButton, 20-xapi.js): the button whose click ends this component. */
function lastScreenButton() { return document.getElementById('s46-check'); }

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
  positionFeedbackCard(feedbox);
}

function scqToggleFeedbox(screenId) {
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (!feedbox) return;
  feedbox.classList.toggle('collapsed');
  refitFeedbackHeight(feedbox);
}

// ============================================================
//  FEEDBACK POPUP DRAG SUPPORT — global standard (per the 720 feedback-
//  popup spec): every floating feedback panel is draggable, bounded to the
//  canvas, and resets to its default position on every fresh open (never
//  remembers a prior drag). This component's .scq-feedbox has no separate
//  "region + centered card" split like 06-02/06-03/06-05 — it IS the
//  visible surface, sized via inset:0 to exactly cover .scq-img (the
//  content image it overlays). To make it movable it's converted, on
//  every show, from inset:0 into an explicit position:absolute box at the
//  same (0,0) spot with its natural (measured) width/height — visually
//  identical until the learner actually drags it off the image.
// ============================================================
var FEEDBACK_DRAG_MARGIN = 16;
var BOTTOM_BAR_H = 74; // matches .screen::after's fixed height
// Default resting gap above the bottom bar — same value as 06-03.
var FEEDBACK_REST_GAP = 48;

// Called by scqShowFeedback right after unhiding the panel — resets any
// position left over from a previous drag (so the default is never
// remembered), measures the natural inset:0 footprint, then pins that
// exact size/spot with explicit values so the drag handler below can
// move it afterward without it changing size.
function positionFeedbackCard(feedbox) {
  feedbox.style.position = '';
  feedbox.style.left = '';
  feedbox.style.top = '';
  feedbox.style.right = '';
  feedbox.style.bottom = '';
  feedbox.style.width = '';
  feedbox.style.height = '';

  // Width still comes from the natural inset:0 footprint (matches the
  // content image's width) for any feedback state with a body paragraph
  // (correct/wrong2) — those need the full width to wrap their sentence
  // sensibly. A body-less message (e.g. "retry", title-only) instead
  // shrinks to fit its own (already <br>-wrapped) text, capped at that
  // same image width — QA fix: it used to stretch edge-to-edge with the
  // image for every state, leaving a two-line title sitting in a bar far
  // wider than the text needed. Height is then let go to 'auto' with
  // right/bottom pinned to 'auto' (not the class's inset:0) so the box
  // shrinks to fit its actual text instead of stretching to the image's
  // full height — the empty space under a short "יפה מאוד!" message.
  var maxW = feedbox.offsetWidth;
  var activeFb = feedbox.querySelector('.scq-fb.active');
  var hasBody = !!(activeFb && activeFb.querySelector('.scq-fb-body'));
  feedbox.style.position = 'absolute';
  feedbox.style.left = '0px';
  feedbox.style.top = '0px';
  feedbox.style.right = 'auto';
  feedbox.style.bottom = 'auto';
  var w;
  if (hasBody) {
    w = maxW;
    feedbox.style.width = w + 'px';
  } else {
    feedbox.style.width = 'max-content';
    feedbox.style.maxWidth = maxW + 'px';
    // Unscaled fractional width, rounded UP — offsetWidth rounds to nearest
    // and could pin the box a sub-pixel short, re-wrapping the title.
    var appEl = document.getElementById('app');
    var sc = appEl.getBoundingClientRect().width / appEl.offsetWidth || 1;
    w = Math.ceil(feedbox.getBoundingClientRect().width / sc);
    feedbox.style.width = w + 'px';
    feedbox.style.maxWidth = '';
  }
  feedbox.style.height = 'auto';
  // Round UP (offsetHeight rounds to nearest) so a fractional content height
  // never leaves the box 1px short — that sliver engaged overflow-y:auto and
  // showed a scrollbar with nothing to scroll (QA fix).
  // Left at 'auto' (not pinned to a measured px value) — a pinned height
  // could come out a few px short once fonts/balanced wrapping settled,
  // engaging overflow-y:auto: a stray scrollbar that also fought the drag
  // gesture (user feedback: "המשוב לא גריר").
  var h = feedbox.offsetHeight;

  // Default resting spot is bottom-left of the usable canvas (matches the
  // unit-wide feedback-popup default already used in 06-05) — QA fix: the
  // (0,0) pin above left the card hanging from the image's own top-left
  // corner, covering the top of the photo and, when its content ran long,
  // overflowing past the image's bottom edge into .scq-feedbox's own
  // overflow-y:auto (an unwanted internal scrollbar). Anchoring bottom-left
  // instead keeps the card fully clear of the photo and never taller than
  // the canvas itself, so that scrollbar never engages.
  var app = document.getElementById('app');
  var off = regionOffset(feedbox.parentElement);
  // x = the content image's own left edge (off.x), not the canvas edge —
  // the card read as pushed too far into the corner (user feedback).
  var pos = clampFeedbackPos(
    off.x,
    (app.offsetHeight - BOTTOM_BAR_H) - FEEDBACK_REST_GAP - h,
    feedbox
  );
  feedbox.style.left = (pos.x - off.x) + 'px';
  feedbox.style.top = (pos.y - off.y) + 'px';
}

// Re-measures just the height (keeps whatever left/top the user may have
// dragged to) — used after the collapse chevron toggles .scq-fb-body's
// visibility, so the box shrinks/grows along with its visible content.
function refitFeedbackHeight(feedbox) {
  feedbox.style.height = 'auto';
}

(function () {
  var dragEl = null, offX = 0, offY = 0, regionOffX = 0, regionOffY = 0;

  function appScale() {
    var app = document.getElementById('app');
    return app.getBoundingClientRect().width / app.offsetWidth;
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, input, a')) return;
    var box = e.target.closest('.scq-feedbox');
    if (!box || box.hidden) return;
    e.preventDefault(); // no native text selection competing with the drag
    dragEl = box;
    var scale = appScale();
    var rect = box.getBoundingClientRect();
    var off = regionOffset(box.parentElement);
    regionOffX = off.x; regionOffY = off.y;
    offX = (e.clientX - rect.left) / scale;
    offY = (e.clientY - rect.top) / scale;
    box.setPointerCapture(e.pointerId);
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

// ---- Hint modal — one shared overlay for every SCQ screen in this part ----
// Reusable while the screen is unresolved: opening/closing must never
// disable or hide the trigger — only the resolved-state branches retire it.
function scqOpenHint(screenId) {
  var overlay = document.getElementById('scq-hint-overlay');
  var body = document.getElementById('scq-hint-body');
  if (!overlay || !body) return;
  /* xAPI: requested.1 — after the guards, immediately before the hint is shown. Opens only
     (scqCloseHint closes); the hints ledger dedupes a re-open. */
  xapiRequestedHint(xapiItemOf(screenId), SCQ_QKEY[screenId]);
  body.innerHTML = SCQ_HINT[screenId] || '';
  overlay.dataset.screen = screenId;
  overlay.hidden = false;
  overlay.classList.remove('hidden');
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
//  DEV MODE — postMessage bridge for index_dev.html (ported verbatim).
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
   the code that uses it. Ids verified against ../metadata/methodica-math-percent-06-04.json (2026-10-20).

   SCREEN_TO_SUBCONTENT: 0-based screen index (= data-screen = goTo(n)) -> [item suffix, page in
   item]. ⚠️ Exactly TOTAL_SCREENS keys (5), no gaps — a missing key is a screen that silently
   never reports (guide §6.2). Only [0] is read; [1] documents the paging. */
var SCREEN_TO_SUBCONTENT = {
   0: ['001', 1],   // s42
   1: ['001', 2],   // s43
   2: ['002', 1],   // s44
   3: ['002', 2],   // s45
   4: ['003', 1]    // s46
};

var XAPI_COMP_SLUG = 'methodica-math-percent-06-04';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
/* Item ids carry this component's own slug — no XAPI_ITEM_SLUG needed. Until 2026-10-20 they
   carried the script's numbering (methodica-math-percent-06-03-NNN); MOE renumbered them in KATA. */
/* Items that carry a code-graded question — used as a set. */
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-06-04.json';

/* ═══════════════════ Resume (KATA State API) — this component's hooks ═══════════════════
   Read by ../unit-js/40-resume.js at CALL time (guide §8.7). Contract (40-resume.js "Snapshot
   helpers"): only FINISHED questions are saved; an unfinished one starts fresh on return, exactly
   as it already did when the learner navigated away and back. The enter functions
   (resetScreenState) already rebuild a finished screen's feedback / progress / button from these
   variables; restoreScreenUI adds what only the live check leaves in the DOM (the option marks,
   typed values). Every painter paints from state and never resets (guide §8.8).
   applyResumeDom has nothing to do: no answer here lives only in the DOM. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qr: resumeClone(XAPI_Q_RESULTS),
    scq: resumeDoneEntries(scqState),
    prog: resumeProgress(practiceProgress)
  };
}
function applyResumeVars(st) {
  resumeAssign(XAPI_Q_RESULTS, st.qr);
  resumeAssignMap(scqState, st.scq);
  resumeApplyProgress(practiceProgress, st.prog);
}
function applyResumeDom(st) {}
function restoreScreenUI(n) {
  var id = resumeScreenId(n);
  if (SCQ_CONFIG[id] && scqState[id].done) {
    resumePaintChoice(scqOptions(id), [scqState[id].selected], [SCQ_CONFIG[id].correctId]);
  }
}
