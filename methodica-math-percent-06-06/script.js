'use strict';

// Shared functions (33) live in ../unit-js/05-core.js, loaded right before this file:
//   scaleApp, cssMs, stageShowEl, reducedMotionPref, runStagedSequence, cancelStagedSequence,
//   goBack, updateBackButton, goToComponent, scqNextScreen, scqAdvance, scqOptions, scqCloseHint,
//   openImgZoom, closeImgZoom, dndChip, dndSlotEl, dndPoolEl, dndSnapshot, dndAllFilled,
//   dndRenderSlot, dndUpdateCheckReady, dndClearSlotMarks, dndDragStart, dndSlotDragOver,
//   dndSlotDragLeave, dndSlotDrop, dndPoolDragOver, dndApplyFinalMarks, dndSyncRevealBtn,
//   dndToggleReveal, devScreenList, notifyDevHost

// ============================================================
//  CONSTANTS & GLOBAL STATE
//  methodica-math-percent-06-06 — שאלת שיא, מועד ב' / Peak Question B
//  (pptx slides 54-59): TransitionScreen (s54) + 5 discrete screens — the
//  opening context (s55) and 4 lettered sections — א' MultipleChoiceQuestion
//  (s56), ב' SingleChoiceQuestion (s57), ג' DragAndDropQuestion (s58), ד'
//  SingleChoiceQuestion (s59). Converted from an original one-long-scroll
//  design to discrete goTo()/goBack()/NAV_FLOW screens (see git history)
//  per explicit instruction to remove inter-section scrolling — no text,
//  asset, question logic, answer, feedback, hint, attempt, or interaction
//  changed, only the navigation mechanism. TOTAL_SCREENS is therefore 6.
//  SCQ/DnD engines ported verbatim from methodica-math-percent-06-05/
//  script.js, including its discrete-screen "check button doubles as
//  Continue" convention (scqAdvance/scqNextScreen). MCQ (select-all)
//  engine is new — no graded multi-select precedent exists elsewhere in
//  this unit — modeled directly on the scq engine (same attempts/
//  feedback/hint shape), only swapping single-select for a toggle-set
//  comparison.
// ============================================================
const TOTAL_SCREENS = 6;
let currentScreen = 0;

const NAV_FLOW = [0, 1, 2, 3, 4, 5];

window.lomdaState = {};

// ============================================================
//  SCALING — fit 1280×710 canvas into any viewport (ported verbatim)
// ============================================================

window.addEventListener('resize', scaleApp);
scaleApp();

// #app is NOT a fixed 1280x710 box at runtime — scaleApp() above sets its
// actual (pre-transform) width/height to window.innerWidth/scale and
// window.innerHeight/scale, which only equals 1280x710 when the viewport's
// own aspect ratio exactly matches 1280:710. Reading #app's own
// offsetWidth/offsetHeight keeps the feedback-popup canvas clamp
// (clampPopupToCanvas below) correct for whatever scaleApp() computed,
// instead of assuming a constant — same fix already applied in
// methodica-math-percent-06-01/script.js.
function getCanvasSize() {
  var app = document.getElementById('app');
  return { w: app.offsetWidth, h: app.offsetHeight };
}

// ============================================================
//  STAGED REVEAL ENGINE — ported verbatim from
//  methodica-math-percent-06-05/script.js.
// ============================================================
var stagedSequences = {};

var STAGE_GAP_DEFAULT = cssMs('--m-reveal-stagger', 180);
var STAGE_DURATION_DEFAULT = cssMs('--m-reveal-duration', 600);

function stagedSequenceComplete(key) {
  return !!(stagedSequences[key] && stagedSequences[key].complete);
}

// Screen index -> staged-sequence key(s) to cancel when navigating away mid-sequence.
var STAGED_KEYS_BY_SCREEN = {
  0: ['s54'],
  1: ['s55'],
  2: ['s56'],
  3: ['s57'],
  4: ['s58'],
  5: ['s59']
};

// ============================================================
//  NAVIGATION — same shape as 06-02/03/04/05's goTo/resetScreenState ladder.
// ============================================================
function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  var screens = document.querySelectorAll('.screen');
  Motion.cancel(screens[currentScreen]);
  (STAGED_KEYS_BY_SCREEN[currentScreen] || []).forEach(cancelStagedSequence);
  screens[currentScreen].classList.remove('active');
  currentScreen = n;
  screens[currentScreen].classList.add('active');
  Motion.reveal(screens[currentScreen]);
  updateBackButton();
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
var UNIT_PREV_COMPONENT = '../methodica-math-percent-06-05/index.html';
var UNIT_NEXT_COMPONENT = null;
var unitShellHosted = false;

window.addEventListener('message', function (e) {
  if (e.source === window.parent && e.data && e.data.type === 'UNIT_SHELL') unitShellHosted = true;
});

function resetScreenState(n) {
  if (n === 0) s54Init();
  else if (n === 1) s55Init();
  else if (n === 2) mcqEnter('s56');
  else if (n === 3) scqEnter('s57');
  else if (n === 4) dndEnter('s58');
  else if (n === 5) scqEnter('s59');
}

// Resolved-state button: "שנמשיך?" advances; on the unit's last screen
// (no next screen) it reads "סיימתי" instead and just retires on click.
function scqSetResolvedButton(btn, screenId) {
  btn.disabled = false;
  btn.classList.add('is-pulsing');
  if (scqNextScreen(screenId)) {
    btn.textContent = 'هل نتابع؟';
    btn.onclick = function () { scqAdvance(screenId); };
  } else {
    btn.textContent = 'انتهيت';
    btn.onclick = function () { btn.classList.remove('is-pulsing'); peakFinish(btn); };
  }
}

/* ── The last click of this component (platform, guide §6.4 / §6.5 / §8.12) ──
   s59's "סיימתי". Reports the component 'completed' and stops: the platform owns routing (this
   is an assessment component; a fail is routed by recommendedAfterFail). xapiEndComponent disables
   the button — what the click already did before reporting existed.
   success = the pass mark s54 PROMISES: "יש בה 4 סעיפים. עליכם להצליח ב - 3 לפחות" — at least 3
   of the 4 sections correct (a section counts when its final outcome is correct); scaled =
   correct / the 4 declared questions. Reached only after all four sections resolved. */
function peakSectionsCorrect() {
  return peakProgress.questions.filter(function (q) { return q.state === 'correct'; }).length;
}
function peakFinish(btn) {
  var passed = peakSectionsCorrect() >= 3;
  try { setUnitResult('percent06_c06_result', passed ? 'pass' : 'fail'); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(passed), btn || lastScreenButton()); }
  catch (e) { console.error('[xAPI] end component', e); if (btn) btn.disabled = true; }
  try { flushResumeSave(); } catch (e) {}
}

/* Per-part seam (restoreEndedButton, 20-xapi.js): the button whose click ends this component. */
function lastScreenButton() { return document.getElementById('s59-check'); }

// ============================================================
//  SCREEN 0 (s54) — Launch, pptx slide 54. Text aligned to approved unit
//  4.2's peak-B launch (same template as 06-05's s48, 4th line emphasized
//  in purple). Staged entrance: 5 lines -> character -> Continue
//  enables + pulses. Same engine/pattern as 06-05's s48StagedSteps().
// ============================================================
function s54StagedSteps() {
  var l1 = document.getElementById('s54-line1');
  var l2 = document.getElementById('s54-line2');
  var l3 = document.getElementById('s54-line3');
  var l4 = document.getElementById('s54-line4');
  var l5 = document.getElementById('s54-line5');
  var char = document.getElementById('s54-character-img');
  return [
    { els: [l1], wait: 400 },
    { els: [l2], wait: 350 },
    { els: [l3], wait: 350 },
    { els: [l4], wait: 350 },
    { els: [l5], wait: 400 },
    { els: [char], wait: 400 },
    { els: [], onShow: function () {
        var btn = document.getElementById('s54-continue');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function s54Init() {
  runStagedSequence('s54', s54StagedSteps);
}

// ============================================================
//  SCREEN 1 (s55) — opening/context, no question. Staged entrance only
//  (paragraph -> image -> data card), then Continue enables + pulses —
//  same "disabled until reveal completes" convention as s54Init().
// ============================================================
function s55StagedSteps() {
  var p1 = document.getElementById('s55-p1');
  var frame = document.querySelector('#s55 .lp-img-frame');
  var dataBlock = document.getElementById('s55-data-block');
  // `dur` matches #s55's scoped --m-reveal-duration override in
  // styles.css — see mcqStagedSteps for why.
  return [
    { els: [p1], dur: 300, wait: 180 },
    { els: [frame], dur: 300, wait: 150 },
    { els: [dataBlock], dur: 300, wait: 0,
      onShow: function () {
        var btn = document.getElementById('s55-continue');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function s55Init() {
  runStagedSequence('s55', s55StagedSteps);
}

// ============================================================
//  PEAK PROGRESS — the visible progress bar was removed per explicit
//  request; this state object is kept only because the section logic
//  below still reads/writes each section's visited/correct/incorrect state.
//  Original note: 4 lettered sections of ONE Peak Question (א'/ב'/ג'/ד'),
//  same "progress-question" markup/state machine as 06-05's peakProgress
//  (updateProgressQuestion() ported verbatim). Nodes map to screens
//  2-5 (s56-s59); s55's opening text has no graded node of its own, but
//  still shows the nav (per the original design, where the nav was
//  visible throughout s55-s59) via its own #s55-progress container.
// ============================================================
const PEAK_LETTERS = ['أ', 'ب', 'ج', 'د'];

/* xAPI: item 001 declares four questions, one per section screen — א' s56 (q1, multi-select),
   ב' s57 (q2), ג' s58 (q3, the drag table), ד' s59 (q4). s55 is the opening, no question. */
const PEAK_QKEY = { s56: 'q1', s57: 'q2', s58: 'q3', s59: 'q4' };

const peakProgress = {
  questions: [
    { number: 1, visited: false, state: 'not-answered', screen: 2 }, // א' (s56)
    { number: 2, visited: false, state: 'not-answered', screen: 3 }, // ב' (s57)
    { number: 3, visited: false, state: 'not-answered', screen: 4 }, // ג' (s58)
    { number: 4, visited: false, state: 'not-answered', screen: 5 }  // ד' (s59)
  ]
};


// ============================================================
//  FEEDBACK POPUP — draggable, canvas-clamped. Ported/generalized from
//  methodica-math-percent-06-01's Learning Phase #lp-popup/#lpv-popup
//  pattern (same "checkpoint" shape, 4 checkpoints here instead of 2) —
//  see the CSS comment on .pk-popup in styles.css for the full rationale.
//  ids end in "-popup" per the project-wide draggable-popup contract; the
//  pointerdown/move/up drag handler below mirrors methodica-math-percent-
//  06-01/script.js's own [id$="-popup"] delegate verbatim. Each popup now
//  lives inside its own screen (see index.html), so goTo()'s own
//  `[id$="-popup"] -> hidden=true` sweep on every screen change already
//  handles show/hide across navigation — no scroll-scoping needed.
// ============================================================
var PK_POPUP_MARGIN = 16; // symmetric gap kept from the canvas edge, same contract as every other draggable popup in this project
var BOTTOM_BAR_H = 74; // matches .screen::after's fixed height

function clampPopupToCanvas(x, y, el) {
  var canvas = getCanvasSize();
  var w = el.offsetWidth, h = el.offsetHeight;
  var minX = PK_POPUP_MARGIN, maxX = Math.max(minX, canvas.w - w - PK_POPUP_MARGIN);
  var minY = 0, maxY = Math.max(minY, (canvas.h - BOTTOM_BAR_H) - h);
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY)
  };
}

// Default resting spot: bottom-left of the visible canvas (Figma popup-
// feedback template, 720 UI Templates node 716-24031) — always resets here
// on every fresh open/reopen, per _global-components.md "resets to default
// position on every open". Popups here are positioned absolute relative to
// their own screen.
function pkPositionPopupDefault(popup) {
  var canvas = getCanvasSize();
  var x = PK_POPUP_MARGIN;
  var y = (canvas.h - BOTTOM_BAR_H) - PK_POPUP_MARGIN - popup.offsetHeight;
  var pos = clampPopupToCanvas(x, y, popup);
  popup.style.left = pos.x + 'px';
  popup.style.top = pos.y + 'px';
}

function pkShowPopup(screenId, outcome) {
  var popup = document.getElementById(screenId + '-popup');
  if (!popup) return;
  popup.classList.remove('is-correct', 'is-wrong');
  popup.classList.add(outcome === 'correct' ? 'is-correct' : 'is-wrong');
  popup.querySelectorAll('.scq-fb').forEach(function (fb) {
    fb.classList.toggle('active', fb.getAttribute('data-fb') === outcome);
  });
  popup.hidden = false; // must be visible before offsetHeight can be measured
  pkPositionPopupDefault(popup);
}

function pkHidePopup(screenId) {
  var popup = document.getElementById(screenId + '-popup');
  if (popup) popup.hidden = true;
}

// Retry affordance (issue #4) shared clear step — called from every
// answer-editing entry point (option select/toggle, slot click/drop) so
// starting a new attempt WITHOUT pressing "נסה שוב" first still relabels
// the button back to "צדקתי?" instead of leaving it mismatched.
function pkClearAwaitingRetry(screenId, st) {
  if (!st.awaitingRetry) return;
  st.awaitingRetry = false;
  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) checkBtn.textContent = 'هل إجابتي صحيحة؟';
}

(function () {
  var dragEl = null, offX = 0, offY = 0;

  function appScale() {
    var app = document.getElementById('app');
    var m = app.style.transform.match(/scale\(([^)]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  document.addEventListener('pointerdown', function (e) {
    var popup = e.target.closest('[id$="-popup"]:not(.no-drag)');
    if (!popup) return;
    // Buttons inside the popup (the reveal toggle) must receive their own
    // click — pointer capture below would otherwise retarget it to the popup.
    if (e.target.closest('button, input, a')) return;
    dragEl = popup;
    var scale = appScale();
    var rect = popup.getBoundingClientRect();
    offX = (e.clientX - rect.left) / scale;
    offY = (e.clientY - rect.top) / scale;
    popup.setPointerCapture(e.pointerId);
  });

  document.addEventListener('pointermove', function (e) {
    if (!dragEl) return;
    var scale = appScale();
    var app = document.getElementById('app');
    var appRect = app.getBoundingClientRect();
    var x = (e.clientX - appRect.left) / scale - offX;
    var y = (e.clientY - appRect.top) / scale - offY;
    var pos = clampPopupToCanvas(x, y, dragEl);
    dragEl.style.left = pos.x + 'px';
    dragEl.style.top = pos.y + 'px';
  });

  document.addEventListener('pointerup', function () { dragEl = null; });
})();

// ============================================================
//  MultipleChoiceQuestion (select-all) — s56 (א'). New engine, no graded
//  multi-select precedent exists elsewhere in this unit (06-01's hook1 is
//  an ungraded reflection variant) — modeled directly on the scq engine
//  (same attempts/feedback/hint shape), swapping single-select for a
//  toggle-set vs. exact-match comparison. Reuses .hook1-checkbox's square
//  indicator verbatim on the standard .scq-opt pill.
// ============================================================
const MCQ_CONFIG = {
  s56: { correctIds: ['b', 'c'], maxAttempts: 2, qNumber: 1 }
};

const mcqState = {
  s56: { selected: [], attempts: 0, done: false, hintUsed: false, awaitingRetry: false }
};

const SCQ_HINT = {
  s56: '<p>لاحظوا الفرق بين النسبة المئوية والكمية.<br>توضح لنا المعطيات الجزء الذي يمثّله الطلاب المشاركون في حركة شبابية من مجموع طلاب الصف،<br>لكنها لا تحدّد دائمًا عدد هؤلاء الطلاب.</p>',
  s57: '<p>احسبوا نسبة الطلاب المشاركين في حركات الشبيبة من كل صف.</p>',
  s58: '<p>للانتقال من النسب المئوية إلى عدد الطلاب،<br>اسألوا أنفسكم: كم يساوي العدد الكلي مقسومًا على 100؟</p>',
  s59: '<p>فكّروا فيما أردنا مقارنته طوال التمرين:<br>مجموعات فيها عدد مختلف من الطلاب.</p>'
};

function mcqOptions(screenId) {
  return Array.prototype.slice.call(document.querySelectorAll('#' + screenId + ' .scq-opt'));
}

function mcqStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  // .pk-section-head never exists in this component's markup (ported from
  // a component that had one) — pushing it unconditionally cost a full
  // dead 300ms(wait)+600ms(assumed dur) step before ANY real content
  // appeared, on every section. Guarded out per the reveal-speed audit.
  var head = section.querySelector('.pk-section-head');
  var instruction = section.querySelector('.pk-instruction');
  var dataCard = document.getElementById(screenId + '-data-card');
  var actions = document.getElementById(screenId + '-actions');
  var steps = [];
  // Plain text/card elements here have NO m-stage-* class of their own, so
  // they fall back to the base --m-reveal-duration (600ms). `dur` below is
  // scoped to match this screen's shortened --m-reveal-duration/--m-stage-*
  // overrides (see styles.css) so the JS stagger clock matches the actual
  // CSS animation length instead of assuming the unscoped 600ms default —
  // that mismatch was leaving a silent ~200ms dead gap after every element
  // had already finished visibly animating in.
  if (head) steps.push({ els: [head], dur: 300, wait: 150 });
  steps.push({ els: [instruction], dur: 300, wait: 180 });
  var opts = mcqOptions(screenId);
  opts.forEach(function (opt, i) {
    steps.push({ els: [opt], dur: 220, wait: 110 });
  });
  if (dataCard) steps.push({ els: [dataCard], dur: 300, wait: 90 });
  // Actions (hint/check) reveal LAST, same as everything else on the page.
  steps.push({ els: [actions], dur: 300, wait: 0 });
  return steps;
}

function mcqEnter(screenId) {
  var st = mcqState[screenId];
  var cfg = MCQ_CONFIG[screenId];

  peakProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) peakProgress.questions[cfg.qNumber - 1].state = 'current';

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (st.done) {
    mcqShowFeedback(screenId, st.lastOutcome);
    if (checkBtn) {
      scqSetResolvedButton(checkBtn, screenId);
    }
    if (hintBtn) hintBtn.disabled = true;
    runStagedSequence(screenId, function () { return mcqStagedSteps(screenId); });
    return;
  }

  st.selected = [];
  st.attempts = 0;
  st.hintUsed = false;
  st.awaitingRetry = false;

  mcqOptions(screenId).forEach(function (opt) {
    opt.disabled = false;
    opt.classList.remove('selected', 'correct', 'wrong');
    opt.setAttribute('aria-checked', 'false');
  });
  pkHidePopup(screenId);
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.classList.remove('is-pulsing'); checkBtn.onclick = function () { mcqCheck(screenId); }; }
  // Peak practice — hint stays locked until the first submitted attempt
  // (unlocked in mcqCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return mcqStagedSteps(screenId); });
}

function mcqToggle(screenId, id) {
  var st = mcqState[screenId];
  if (st.done) return;
  pkHidePopup(screenId);
  pkClearAwaitingRetry(screenId, st);

  var opt = document.querySelector('#' + screenId + ' .scq-opt[data-id="' + id + '"]');
  if (!opt) return;
  var idx = st.selected.indexOf(id);
  var nowSelected;
  if (idx === -1) { st.selected.push(id); nowSelected = true; }
  else { st.selected.splice(idx, 1); nowSelected = false; }
  opt.classList.toggle('selected', nowSelected);
  opt.classList.remove('wrong');
  opt.setAttribute('aria-checked', nowSelected ? 'true' : 'false');

  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) checkBtn.disabled = st.selected.length === 0;
}

// Retry: after a non-final wrong attempt the "צדקתי?" button stays disabled
// until the learner changes the answer (no "נסה שוב" relabel). The reset
// below is legacy (awaitingRetry is no longer set); when invoked, resets the question for the next attempt
// instead of re-grading the unchanged selection — per explicit instruction,
// never a second button.
function mcqResetAttempt(screenId) {
  var st = mcqState[screenId];
  st.selected = [];
  st.awaitingRetry = false;
  mcqOptions(screenId).forEach(function (opt) {
    opt.classList.remove('selected', 'wrong');
    opt.setAttribute('aria-checked', 'false');
  });
  pkHidePopup(screenId);
  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; }
}

function mcqCheck(screenId) {
  var st = mcqState[screenId];
  var cfg = MCQ_CONFIG[screenId];
  if (st.done) return;
  if (st.awaitingRetry) { mcqResetAttempt(screenId); return; }
  if (!st.selected.length) return;

  st.attempts++;
  var correctSet = cfg.correctIds.slice().sort();
  var selectedSet = st.selected.slice().sort();
  var isCorrect = correctSet.length === selectedSet.length && correctSet.every(function (id, i) { return id === selectedSet[i]; });

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (isCorrect) {
    st.done = true;
    st.lastOutcome = 'correct';
    peakProgress.questions[cfg.qNumber - 1].state = 'correct';
    mcqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      if (cfg.correctIds.indexOf(opt.getAttribute('data-id')) !== -1) opt.classList.add('correct');
    });
    mcqShowFeedback(screenId, 'correct');
  } else if (st.attempts < cfg.maxAttempts) {
    mcqOptions(screenId).forEach(function (opt) {
      var id = opt.getAttribute('data-id');
      opt.classList.toggle('wrong', st.selected.indexOf(id) !== -1 && cfg.correctIds.indexOf(id) === -1);
    });
    if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; }
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question.
    if (hintBtn) hintBtn.disabled = false;
    mcqShowFeedback(screenId, 'retry');
  } else {
    st.done = true;
    st.lastOutcome = 'wrong2';
    peakProgress.questions[cfg.qNumber - 1].state = 'incorrect';
    mcqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      var id = opt.getAttribute('data-id');
      if (cfg.correctIds.indexOf(id) !== -1) opt.classList.add('correct');
      else if (st.selected.indexOf(id) !== -1) opt.classList.add('wrong');
    });
    mcqShowFeedback(screenId, 'wrong2');
  }

  /* xAPI: one 'answered' per submission — the whole selected set, all-or-nothing as graded here;
     isLast = correct || attempts exhausted (guide §6.3). */
  xapiAnswered(xapiItemOf(screenId), PEAK_QKEY[screenId], isCorrect, isCorrect || st.attempts >= cfg.maxAttempts,
    xapiMultiAnswer(st.selected, function (id) { return document.querySelector('#' + screenId + ' .scq-opt[data-id="' + id + '"]'); }));

  if (st.done) {
    if (checkBtn) {
      scqSetResolvedButton(checkBtn, screenId);
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

function mcqShowFeedback(screenId, outcome) {
  pkShowPopup(screenId, outcome);
}

// ============================================================
//  SingleChoiceQuestion — shared scq- prefixed logic, ported from
//  06-05/script.js: feedback renders in its own draggable, canvas-clamped
//  #sXX-popup (see the FEEDBACK POPUP section above) instead of 06-05's
//  section-local anchor, and resolving a screen relabels its own check
//  button to "שנמשיך?" (same convention as 06-05). Drives s57 and s59.
// ============================================================
const SCQ_CONFIG = {
  s57: { correctId: 'c', maxAttempts: 2, qNumber: 2 },
  s59: { correctId: 'b', maxAttempts: 2, qNumber: 4 }
};

const scqState = {
  s57: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null, awaitingRetry: false },
  s59: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null, awaitingRetry: false }
};

function scqStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  // .pk-section-head never exists in this component's markup — see
  // mcqStagedSteps for why this is guarded rather than pushed blind.
  var head = section.querySelector('.pk-section-head');
  var context = Array.prototype.slice.call(section.querySelectorAll('.scq-qtext [data-qrole="context"]'));
  var question = section.querySelector('.scq-qtext [data-qrole="question"]');
  var plainQtext = (!context.length && !question) ? section.querySelector('.scq-qtext') : null;
  var img = document.getElementById(screenId + '-img');
  var dataCard = document.getElementById(screenId + '-data-card');
  var actions = document.getElementById(screenId + '-actions');
  var steps = [];
  if (head) steps.push({ els: [head], dur: 300, wait: 150 });
  // `dur` values match this screen's scoped --m-reveal-duration/--m-stage-*
  // overrides in styles.css — see mcqStagedSteps for why this replaces the
  // unscoped 600ms assumption.
  if (plainQtext) steps.push({ els: [plainQtext], dur: 300, wait: 180 });
  else {
    steps.push({ els: context, dur: 300, wait: 180 });
    steps.push({ els: [question], dur: 300, wait: 180 });
  }
  if (img) steps.push({ els: [img], dur: 320, wait: 160 });
  var opts = scqOptions(screenId);
  opts.forEach(function (opt) { steps.push({ els: [opt], dur: 220, wait: 110 }); });
  if (dataCard) steps.push({ els: [dataCard], dur: 300, wait: 90 });
  // Actions reveal LAST — see mcqStagedSteps for why.
  steps.push({ els: [actions], dur: 300, wait: 0 });
  return steps;
}

function scqEnter(screenId) {
  var st = scqState[screenId];
  var cfg = SCQ_CONFIG[screenId];

  peakProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) peakProgress.questions[cfg.qNumber - 1].state = 'current';

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (st.done) {
    scqShowFeedback(screenId, st.lastOutcome);
    if (checkBtn) {
      scqSetResolvedButton(checkBtn, screenId);
    }
    if (hintBtn) hintBtn.disabled = true;
    runStagedSequence(screenId, function () { return scqStagedSteps(screenId); });
    return;
  }

  st.selected = null;
  st.attempts = 0;
  st.hintUsed = false;
  st.lastWrong = null;
  st.awaitingRetry = false;

  scqOptions(screenId).forEach(function (opt) {
    opt.disabled = false;
    opt.classList.remove('selected', 'correct', 'wrong');
    opt.setAttribute('aria-checked', 'false');
  });
  pkHidePopup(screenId);
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.classList.remove('is-pulsing'); checkBtn.onclick = function () { scqCheck(screenId); }; }
  // Peak practice — hint stays locked until the first submitted attempt
  // (unlocked in scqCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return scqStagedSteps(screenId); });
}

function dismissRetryPopup(screenId) {
  var popup = document.getElementById(screenId + '-popup');
  if (popup && popup.querySelector('.scq-fb[data-fb="retry"].active')) popup.hidden = true;
}

function scqSelect(screenId, id) {
  var st = scqState[screenId];
  if (st.done) return;
  dismissRetryPopup(screenId);
  pkClearAwaitingRetry(screenId, st);

  scqOptions(screenId).forEach(function (opt) {
    var isThis = opt.getAttribute('data-id') === id;
    opt.classList.toggle('selected', isThis);
    opt.classList.remove('wrong');
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  st.selected = id;

  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) checkBtn.disabled = !st.selected || (st.selected === st.lastWrong);
}

// Retry affordance (issue #4) — see mcqResetAttempt() for the rationale;
// same "צדקתי?" button relabels/resets, never a second button.
function scqResetAttempt(screenId) {
  var st = scqState[screenId];
  st.selected = null;
  st.lastWrong = null;
  st.awaitingRetry = false;
  scqOptions(screenId).forEach(function (opt) {
    opt.classList.remove('selected', 'wrong');
    opt.setAttribute('aria-checked', 'false');
  });
  pkHidePopup(screenId);
  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; }
}

function scqCheck(screenId) {
  var st = scqState[screenId];
  var cfg = SCQ_CONFIG[screenId];
  if (st.done) return;
  if (st.awaitingRetry) { scqResetAttempt(screenId); return; }
  if (!st.selected) return;

  var isCorrect = st.selected === cfg.correctId;
  st.attempts++;

  var hintBtn = document.getElementById(screenId + '-hint');

  if (isCorrect) {
    st.done = true;
    st.lastOutcome = 'correct';
    peakProgress.questions[cfg.qNumber - 1].state = 'correct';
    scqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      if (opt.getAttribute('data-id') === cfg.correctId) opt.classList.add('correct');
    });
    scqShowFeedback(screenId, 'correct');
  } else if (st.attempts < cfg.maxAttempts) {
    st.lastWrong = st.selected;
    scqOptions(screenId).forEach(function (opt) {
      opt.classList.toggle('wrong', opt.getAttribute('data-id') === st.selected);
    });
    var checkBtn = document.getElementById(screenId + '-check');
    if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; }
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question.
    if (hintBtn) hintBtn.disabled = false;
    scqShowFeedback(screenId, 'retry');
  } else {
    st.done = true;
    st.lastOutcome = 'wrong2';
    peakProgress.questions[cfg.qNumber - 1].state = 'incorrect';
    scqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      var id = opt.getAttribute('data-id');
      if (id === cfg.correctId) opt.classList.add('correct');
      else if (id === st.selected) opt.classList.add('wrong');
    });
    scqShowFeedback(screenId, 'wrong2');
  }

  /* xAPI: one 'answered' per submission; isLast = correct || attempts exhausted (guide §6.3). */
  xapiAnswered(xapiItemOf(screenId), PEAK_QKEY[screenId], isCorrect, isCorrect || st.attempts >= cfg.maxAttempts,
    xapiAnswerText(document.querySelector('#' + screenId + ' .scq-opt[data-id="' + st.selected + '"]')));

  if (st.done) {
    var checkBtn2 = document.getElementById(screenId + '-check');
    if (checkBtn2) {
      scqSetResolvedButton(checkBtn2, screenId);
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

function scqShowFeedback(screenId, outcome) {
  pkShowPopup(screenId, outcome);
}

// ---- Hint modal — one shared overlay for every hint-bearing screen ----
// Reusable while the screen is unresolved: opening/closing must never
// disable or hide the trigger — only the resolved-state branches retire it.
function scqOpenHint(screenId) {
  var overlay = document.getElementById('scq-hint-overlay');
  var body = document.getElementById('scq-hint-body');
  if (!overlay || !body) return;
  /* xAPI: requested.1 — after the guards, immediately before the hint is shown. Opens only
     (scqCloseHint closes); the hints ledger dedupes a re-open. */
  xapiRequestedHint(xapiItemOf(screenId), PEAK_QKEY[screenId]);
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
//  IMAGE ZOOM — one shared modal, per _global-components.md § Image zoom.
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
//  DRAG-AND-DROP (headcount fill-in) — s58 (ג'). Ported verbatim from
//  06-05's s51 engine (drag items/drop zones/hover/occupied/correct/
//  incorrect/retry/attempt-count/feedback) — only the domain changes (3
//  headcount-value chips instead of 3 company names). Answer key (see
//  index.html): ז'→80, ח'→156, ט'→105 — per the 30.09.26 script fix (chip
//  ids name their grade; pool display order is 80/105/156).
// ============================================================
const DND_CONFIG = {
  s58: { correctOrder: ['z', 'h', 't'], maxAttempts: 2, qNumber: 3 }
};

const dndState = {
  s58: { slots: [null, null, null], picked: null, attempts: 0, done: false, lastWrongSnapshot: null, lockedSlots: [false, false, false], hintUsed: false, awaitingRetry: false }
};

function dndRenderPool(screenId) {
  var st = dndState[screenId];
  var remaining = 0;
  ['z', 'h', 't'].forEach(function (id) {
    var chip = dndChip(screenId, id);
    if (!chip) return;
    var placed = st.slots.indexOf(id) !== -1;
    chip.hidden = placed;
    if (!placed) remaining++;
    chip.classList.toggle('is-picked', st.picked === id);
    chip.setAttribute('aria-pressed', st.picked === id ? 'true' : 'false');
  });
  // QA fix: hide the "מחסן:" label + its empty dashed container once every
  // chip has been placed — an empty pool box with no purpose left behind
  // otherwise. Centralized here (not at each call site) so every path that
  // can empty or refill the pool — entry, click/drag placement, drop-back-
  // to-pool, and retry's return-the-wrong-chips reset — stays in sync via
  // this single render.
  var poolWrap = document.getElementById(screenId + '-pool-wrap');
  if (poolWrap) poolWrap.hidden = remaining === 0;
}

function dndDismissFeedback(screenId) {
  var st = dndState[screenId];
  if (st.done) return;
  var popup = document.getElementById(screenId + '-popup');
  if (popup && popup.querySelector('.scq-fb[data-fb="retry"].active')) popup.hidden = true;
}

// ---- Click / keyboard model ----
function dndPickChip(screenId, id) {
  var st = dndState[screenId];
  if (st.done) return;
  var chip = dndChip(screenId, id);
  if (chip && chip.hidden) return; // already placed
  st.picked = (st.picked === id) ? null : id;
  dndRenderPool(screenId);
}

function dndSlotClick(screenId, i) {
  var st = dndState[screenId];
  if (st.done || st.lockedSlots[i]) return;
  dndDismissFeedback(screenId);
  pkClearAwaitingRetry(screenId, st);

  var current = st.slots[i];
  if (st.picked) {
    var prevIdx = st.slots.indexOf(st.picked);
    if (prevIdx !== -1 && !st.lockedSlots[prevIdx]) { st.slots[prevIdx] = null; dndClearSlotMarks(screenId, prevIdx); }
    st.slots[i] = st.picked;
    st.picked = null;
    dndRenderSlot(screenId, prevIdx !== -1 && prevIdx !== i ? prevIdx : i);
  } else if (current) {
    st.slots[i] = null;
  } else {
    return;
  }
  st.lastWrongSnapshot = null;
  dndClearSlotMarks(screenId, i);
  dndRenderSlot(screenId, i);
  dndRenderPool(screenId);
  dndUpdateCheckReady(screenId);
}

function dndPoolDrop(screenId, ev) {
  ev.preventDefault();
  var st = dndState[screenId];
  if (st.done) return;
  var id = ev.dataTransfer.getData('text/plain');
  if (!id) return;
  dndDismissFeedback(screenId);
  pkClearAwaitingRetry(screenId, st);
  var idx = st.slots.indexOf(id);
  if (idx !== -1 && !st.lockedSlots[idx]) {
    st.slots[idx] = null;
    dndClearSlotMarks(screenId, idx);
    dndRenderSlot(screenId, idx);
    st.lastWrongSnapshot = null;
  }
  st.picked = null;
  dndRenderPool(screenId);
  dndUpdateCheckReady(screenId);
}

// Retry affordance (issue #4) — see mcqResetAttempt() for the rationale;
// same "צדקתי?" button relabels/resets, never a second button. Returns only
// the WRONG (unlocked) chips to the pool — already-correct slots stay
// locked/placed, per _global-components.md "Partial-correction flow" (never
// clear correct progress on a retry).
function dndResetAttempt(screenId) {
  var st = dndState[screenId];
  st.picked = null;
  st.lastWrongSnapshot = null;
  st.awaitingRetry = false;
  for (var i = 0; i < 3; i++) {
    if (st.lockedSlots[i]) continue; // correct-so-far — preserve, never clear
    st.slots[i] = null;
    dndClearSlotMarks(screenId, i);
    dndRenderSlot(screenId, i);
  }
  dndRenderPool(screenId);
  pkHidePopup(screenId);
  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; }
}

// ---- Grading ----
function dndCheck(screenId) {
  var st = dndState[screenId];
  var cfg = DND_CONFIG[screenId];
  if (st.done) return;
  if (st.awaitingRetry) { dndResetAttempt(screenId); return; }
  if (!dndAllFilled(screenId)) return;

  st.attempts++;
  var results = st.slots.map(function (chipId, i) { return chipId === cfg.correctOrder[i]; });
  var allCorrect = results.every(Boolean);
  var isFinal = allCorrect || st.attempts >= cfg.maxAttempts;

  results.forEach(function (ok, i) {
    var slot = dndSlotEl(screenId, i);
    slot.classList.remove('is-correct', 'is-error');
    // Final wrong keeps the learner's own placement marked V/X (no
    // auto-overwrite) — the "התשובה הנכונה" toggle in the wrong2 feedback
    // swaps in the answer key on demand (see dndToggleReveal()).
    slot.classList.add(ok ? 'is-correct' : 'is-error');
    if (isFinal || ok) st.lockedSlots[i] = true;
  });
  dndRenderPool(screenId);

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (allCorrect) {
    st.done = true;
    peakProgress.questions[cfg.qNumber - 1].state = 'correct';
    dndShowFeedback(screenId, 'correct');
  } else if (!isFinal) {
    st.lastWrongSnapshot = dndSnapshot(screenId);
    if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; }
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question.
    if (hintBtn) hintBtn.disabled = false;
    dndShowFeedback(screenId, 'retry');
  } else {
    st.done = true;
    peakProgress.questions[cfg.qNumber - 1].state = 'incorrect';
    st.ownSlots = st.slots.slice();
    st.revealed = false;
    dndToggleReveal(screenId); // opens on the answer key; the pill swaps back to the learner's own answer
    dndShowFeedback(screenId, 'wrong2');
  }

  /* xAPI: AFTER the slot loop — allCorrect is final only here (guide §6.3, trap 1). The table is
     graded all-or-nothing as ONE question here (metadata q3); the answer is the learner's value
     per grade row, slot by slot. ownSlots on the final wrong (st.slots may show the key). */
  xapiAnswered(xapiItemOf(screenId), PEAK_QKEY[screenId], allCorrect, isFinal,
    (st.ownSlots || st.slots).map(function (id) {
      var chip = document.querySelector('#' + screenId + ' [data-chip="' + id + '"]');
      return chip ? xapiAnswerText(chip) : String(id);
    }).join(' | '));

  if (st.done) {
    if (checkBtn) {
      scqSetResolvedButton(checkBtn, screenId);
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

function dndShowFeedback(screenId, outcome) {
  pkShowPopup(screenId, outcome);
}

function dndStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  // .pk-section-head never exists in this component's markup — see
  // mcqStagedSteps for why this is guarded rather than pushed blind.
  var head = section.querySelector('.pk-section-head');
  var instruction = document.getElementById(screenId + '-instruction');
  var reference = document.getElementById(screenId + '-reference');
  var table = document.getElementById(screenId + '-table');
  var pool = document.getElementById(screenId + '-pool-wrap');
  var actions = document.getElementById(screenId + '-actions');
  // `dur` values match this screen's scoped --m-reveal-duration override in
  // styles.css — see mcqStagedSteps for why this replaces the unscoped
  // 600ms assumption.
  var steps = [];
  if (head) steps.push({ els: [head], dur: 300, wait: 150 });
  steps.push(
    { els: [instruction], dur: 300, wait: 180 },
    { els: [document.getElementById(screenId + '-question'), reference], dur: 300, wait: 160 },
    { els: [table], dur: 300, wait: 160 },
    { els: [pool], dur: 300, wait: 140 },
    // Actions reveal LAST — see mcqStagedSteps for why.
    { els: [actions], dur: 300, wait: 0 }
  );
  return steps;
}

function dndEnter(screenId) {
  var st = dndState[screenId];
  var cfg = DND_CONFIG[screenId];

  peakProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) peakProgress.questions[cfg.qNumber - 1].state = 'current';

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (st.done) {
    dndApplyFinalMarks(screenId);
    dndSyncRevealBtn(screenId);
    dndShowFeedback(screenId, peakProgress.questions[cfg.qNumber - 1].state === 'correct' ? 'correct' : 'wrong2');
    if (checkBtn) {
      scqSetResolvedButton(checkBtn, screenId);
    }
    if (hintBtn) hintBtn.disabled = true;
    runStagedSequence(screenId, function () { return dndStagedSteps(screenId); });
    return;
  }

  st.slots = [null, null, null];
  st.picked = null;
  st.attempts = 0;
  st.lastWrongSnapshot = null;
  st.lockedSlots = [false, false, false];
  st.awaitingRetry = false;
  st.ownSlots = null;
  st.revealed = false;
  for (var j = 0; j < 3; j++) {
    dndRenderSlot(screenId, j);
    var s = dndSlotEl(screenId, j);
    s.classList.remove('is-correct', 'is-error');
  }
  dndRenderPool(screenId);
  pkHidePopup(screenId);
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.classList.remove('is-pulsing'); checkBtn.onclick = function () { dndCheck(screenId); }; }
  // Peak practice — hint stays locked until the first submitted attempt
  // (unlocked in dndCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return dndStagedSteps(screenId); });
}

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
   the code that uses it. Ids verified against ../metadata/methodica-math-percent-06-06.json (2026-10-20).

   SCREEN_TO_SUBCONTENT: 0-based screen index (= data-screen = goTo(n)) -> [item suffix, page in
   item]. ⚠️ Exactly TOTAL_SCREENS keys (6), no gaps — a missing key is a screen that silently
   never reports (guide §6.2). Only [0] is read; [1] documents the paging. */
var SCREEN_TO_SUBCONTENT = {
   0: ['001', 1],   // s54
   1: ['001', 2],   // s55
   2: ['001', 3],   // s56
   3: ['001', 4],   // s57
   4: ['001', 5],   // s58
   5: ['001', 6]    // s59
};

var XAPI_COMP_SLUG = 'methodica-math-percent-06-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
/* Item ids carry this component's own slug — no XAPI_ITEM_SLUG needed. Until 2026-10-20 they
   carried the script's numbering (methodica-math-percent-06-05-NNN); MOE renumbered them in KATA. */
/* Items that carry a code-graded question — used as a set. */
var XAPI_EVAL_ITEMS = { '001': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-06-06.json';

/* ═══════════════════ Resume (KATA State API) — this component's hooks ═══════════════════
   Read by ../unit-js/40-resume.js at CALL time (guide §8.7). Contract (40-resume.js "Snapshot
   helpers"): only FINISHED questions are saved; an unfinished one starts fresh on return, exactly
   as it already did when the learner navigated away and back. The enter functions
   (resetScreenState) already rebuild a finished screen's feedback / progress / button from these
   variables; restoreScreenUI adds what only the live check leaves in the DOM (the option marks,
   typed values) (the drag table repaints itself: dndEnter -> dndApplyFinalMarks). Every painter paints from state and never resets (guide §8.8).
   applyResumeDom has nothing to do: no answer here lives only in the DOM. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qr: resumeClone(XAPI_Q_RESULTS),
    mcq: resumeDoneEntries(mcqState),
    scq: resumeDoneEntries(scqState),
    dnd: resumeDoneEntries(dndState),
    prog: resumeProgress(peakProgress)
  };
}
function applyResumeVars(st) {
  resumeAssign(XAPI_Q_RESULTS, st.qr);
  resumeAssignMap(mcqState, st.mcq);
  resumeAssignMap(scqState, st.scq);
  resumeAssignMap(dndState, st.dnd);
  resumeApplyProgress(peakProgress, st.prog);
}
function applyResumeDom(st) {}
function restoreScreenUI(n) {
  var id = resumeScreenId(n);
  if (MCQ_CONFIG[id] && mcqState[id].done) {
    resumePaintChoice(mcqOptions(id), mcqState[id].selected, MCQ_CONFIG[id].correctIds);
  }
  if (SCQ_CONFIG[id] && scqState[id].done) {
    resumePaintChoice(scqOptions(id), [scqState[id].selected], [SCQ_CONFIG[id].correctId]);
  }
}
