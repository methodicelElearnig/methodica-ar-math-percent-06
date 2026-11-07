'use strict';

// Shared functions (35) live in ../unit-js/05-core.js, loaded right before this file:
//   scaleApp, cssMs, stageShowEl, reducedMotionPref, runStagedSequence, cancelStagedSequence,
//   goBack, updateBackButton, goToComponent, scqOptions, scqNextScreen, scqAdvance, scqCloseHint,
//   openImgZoom, closeImgZoom, dndChip, dndSlotEl, dndPoolEl, dndSnapshot, dndAllFilled,
//   dndRenderSlot, dndUpdateCheckReady, dndClearSlotMarks, dndDragStart, dndSlotDragOver,
//   dndSlotDragLeave, dndSlotDrop, dndPoolDragOver, dndApplyFinalMarks, dndSyncRevealBtn,
//   dndToggleReveal, clampFeedbackPos, regionOffset, devScreenList, notifyDevHost

// ============================================================
//  CONSTANTS & GLOBAL STATE
//  methodica-math-percent-06-05 — שאלת שיא, מועד א' / Peak Question A
//  (pptx slides 48-52): TransitionScreen (s48) + ONE Peak Question split
//  into 4 sections — א' SingleChoiceQuestion (s49), ב' Completion/%-input
//  (s50), ג' Drag-and-drop ranking table (s51), ד' SingleChoiceQuestion
//  (s52). All five slides share ONE pptx item id
//  (methodica-math-percent-06-05-001) — per explicit instruction this is
//  ONE Peak Question with four sections (א/ב/ג/ד), not four separate
//  questions, so the progress nav below uses 4 lettered nodes instead of
//  the "שאלה N מתוך 3" pattern established in 06-04.
//  SCQ engine ported verbatim from methodica-math-percent-06-04/script.js.
//  Completion engine adapted from methodica-math-percent-06-03's TQ_CONFIG
//  engine, simplified to a single field (no multi-row table needed here).
//  Drag-and-drop engine (s51) is new — no DnD precedent exists anywhere in
//  06-02/06-03/06-04 (confirmed by explicit code search) — built to match
//  this unit's established visual/state language (retry gate, partial-lock
//  on correct, final-reveal overwrite) rather than a new interaction model.
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
//  methodica-math-percent-06-04/script.js (itself ported from 06-01/06-02):
//  real elapsed-time sequencing for screens whose entrance needs
//  deliberate settle-then-pause timing between elements.
// ============================================================
var stagedSequences = {};

var STAGE_GAP_DEFAULT = cssMs('--m-reveal-stagger', 180);
var STAGE_DURATION_DEFAULT = cssMs('--m-reveal-duration', 600);

// Screen index -> staged-sequence key(s) to cancel when navigating away mid-sequence.
var STAGED_KEYS_BY_SCREEN = {
  0: ['s48'],
  1: ['s49'],
  2: ['s50'],
  3: ['s51'],
  4: ['s52']
};

// ============================================================
//  NAVIGATION — same shape as 06-02/06-03/06-04's goTo/resetScreenState ladder
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
var UNIT_PREV_COMPONENT = '../methodica-math-percent-06-04/index.html';
var UNIT_NEXT_COMPONENT = '../methodica-math-percent-06-06/index.html';
var unitShellHosted = false;

window.addEventListener('message', function (e) {
  if (e.source === window.parent && e.data && e.data.type === 'UNIT_SHELL') unitShellHosted = true;
});

function resetScreenState(n) {
  if (n === 0) s48Init();
  else if (n === 1) scqEnter('s49');
  else if (n === 2) cqEnter('s50');
  else if (n === 3) dndEnter('s51');
  else if (n === 4) scqEnter('s52');
}

// ============================================================
//  PEAK PROGRESS — the visible progress bar was removed per explicit
//  request; this state object is kept only because the section logic
//  below still reads/writes each section's visited/correct/incorrect state.
//  Original note: 4 lettered sections of ONE Peak Question (א'/ב'/ג'/ד'),
//  NOT the "שאלה 1/2/3 מתוך N" pattern used in 06-04 — per explicit
//  instruction this is one item with four parts, so the shared
//  updateProgressQuestion() renderer (ported verbatim from 06-02/03/04) is
//  reused as-is, only the per-node label text changes (letters instead of
//  "שאלה N") and there are 4 nodes instead of 3. No separate "X of 4"
//  scoring meter is shown here — the launch screen's own sentence
//  ("יש בה ארבעה סעיפים... בשלושה לפחות") is the only place that threshold
//  is communicated at this stage; pass/fail gating is out of scope for
//  this component (see script header).
// ============================================================
const PEAK_LETTERS = ['أ', 'ب', 'ج', 'د'];

/* xAPI: item 001 declares four questions, one per section screen — א' s49 (q1), ב' s50 (q2),
   ג' s51 (q3, the ranking), ד' s52 (q4). */
const PEAK_QKEY = { s49: 'q1', s50: 'q2', s51: 'q3', s52: 'q4' };

const peakProgress = {
  questions: [
    { number: 1, visited: false, state: 'not-answered', screen: 1 }, // א' (s49)
    { number: 2, visited: false, state: 'not-answered', screen: 2 }, // ב' (s50)
    { number: 3, visited: false, state: 'not-answered', screen: 3 }, // ג' (s51)
    { number: 4, visited: false, state: 'not-answered', screen: 4 }  // ד' (s52)
  ]
};


// ============================================================
//  SCREEN 0 (s48) — Launch, pptx slide 48
//  Staged entrance, exact order per approved research: 3 plain lines ->
//  purple emphasis line -> section-count line -> character -> Continue
//  enables + pulses. Same engine/pattern as 06-04's s42StagedSteps().
// ============================================================
function s48StagedSteps() {
  var l1 = document.getElementById('s48-line1');
  var l3 = document.getElementById('s48-line3');
  var l4 = document.getElementById('s48-line4');
  var l5 = document.getElementById('s48-line5');
  var l6 = document.getElementById('s48-line6');
  var char = document.getElementById('s48-character-img');
  return [
    { els: [l1], wait: 350 },
    { els: [l3], wait: 350 },
    { els: [l4], wait: 400 },
    { els: [l5], wait: 400 },
    { els: [l6], wait: 400 },
    { els: [char], wait: 400 },
    { els: [], onShow: function () {
        var btn = document.getElementById('s48-continue');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function s48Init() {
  runStagedSequence('s48', s48StagedSteps);
}

// ============================================================
//  SingleChoiceQuestion — shared scq- prefixed logic, ported verbatim from
//  06-04/06-02. Drives s49 (א') and s52 (ד').
// ============================================================
const SCQ_CONFIG = {
  s49: { correctId: 'b', maxAttempts: 2, qNumber: 1 },
  s52: { correctId: 'a', maxAttempts: 2, qNumber: 4 }
};

const scqState = {
  s49: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  s52: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null },
  // s50's own question-answer state lives in cqState (below) — this entry
  // exists only so the shared scqOpenHint()/hint-overlay plumbing (used by
  // every hint-bearing screen, not just SCQ ones) has somewhere to record
  // hintUsed for s50 too.
  s50: { selected: null, attempts: 0, done: false, hintUsed: false, lastWrong: null }
};

const SCQ_HINT = {
  s49: '<p>المقارنة أسهل عندما تُعرض المعلومات بالنسبة المئوية.</p>',
  s50: '<p>رضا 3 عملاء من أصل 4 يعني أن <span class="gvi-fraction q1-inline-fraction"><span class="num">3</span><span class="den">4</span></span> من العملاء راضون.</p>',
  s52: '<p>فكّروا فيما ينقص لمعرفة عدد العملاء الراضين فعلياً في كل شركة.</p>' +
       '<p>هل النسبة المئوية وحدها كافية؟</p>'
};

function scqStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  var context = Array.prototype.slice.call(section.querySelectorAll('.scq-qtext [data-qrole="context"]'));
  var question = section.querySelector('.scq-qtext [data-qrole="question"]');
  var img = document.getElementById(screenId + '-img');
  var steps = [
    { els: context, wait: 400 },
    { els: [question], wait: 400 }
  ];
  if (img) steps.push({ els: [img], wait: 400 });
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

  peakProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) peakProgress.questions[cfg.qNumber - 1].state = 'current';

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (st.done) {
    scqShowFeedback(screenId, st.lastOutcome, false);
    if (checkBtn) {
      checkBtn.textContent = 'هل نتابع؟';
      checkBtn.disabled = false;
      checkBtn.onclick = scqNextScreen(screenId)
        ? function () { scqAdvance(screenId); }
        : goToComponent06;
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
  // Peak practice — hint stays locked until the first submitted attempt
  // (unlocked in scqCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return scqStagedSteps(screenId); });
}

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
    opt.classList.remove('wrong');
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  st.selected = id;

  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) {
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
    peakProgress.questions[cfg.qNumber - 1].state = 'correct';
    scqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      if (opt.getAttribute('data-id') === cfg.correctId) opt.classList.add('correct');
    });
    scqShowFeedback(screenId, 'correct', true);
  } else if (st.attempts < cfg.maxAttempts) {
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
    peakProgress.questions[cfg.qNumber - 1].state = 'incorrect';
    scqOptions(screenId).forEach(function (opt) {
      opt.disabled = true;
      var id = opt.getAttribute('data-id');
      if (id === cfg.correctId) opt.classList.add('correct');
      else if (id === st.selected) opt.classList.add('wrong');
    });
    scqShowFeedback(screenId, 'wrong2', true);
  }

  /* xAPI: one 'answered' per submission; isLast = correct || attempts exhausted (guide §6.3). */
  xapiAnswered(xapiItemOf(screenId), PEAK_QKEY[screenId], isCorrect, isCorrect || st.attempts >= cfg.maxAttempts,
    xapiAnswerText(document.querySelector('#' + screenId + ' .scq-opt[data-id="' + st.selected + '"]')));

  if (st.done) {
    var checkBtn2 = document.getElementById(screenId + '-check');
    var hintBtn = document.getElementById(screenId + '-hint');
    if (checkBtn2) {
      checkBtn2.textContent = 'هل نتابع؟';
      checkBtn2.disabled = false;
      // s52 (last screen in this component's own NAV_FLOW) now hands off
      // to 06-06 via a real page navigation instead of staying disabled —
      // same sibling-folder convention as 06-01's own goToComponent02().
      checkBtn2.onclick = scqNextScreen(screenId)
        ? function () { scqAdvance(screenId); }
        : goToComponent06;
      checkBtn2.classList.add('is-pulsing');
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  /* Resume: the answer is committed — save synchronously, after the LAST commitment (guide §8.3). */
  try { flushResumeSave(); } catch (e) {}
}

/* ── The last click of this component (platform, guide §6.4 / §6.5 / §8.12) ──
   s52's "هل نتابع؟". Reports the component 'completed' and stops: the platform owns routing (this
   is an assessment component; a fail is routed by recommendedAfterFail), so the button is disabled
   and nothing navigates except in a DEV_NAV walkthrough.
   success = the pass mark s48 PROMISES: "יש בה 4 סעיפים. עליכם להצליח ב - 3 לפחות" — at least 3
   of the 4 sections correct (a section counts when its final outcome is correct); scaled =
   correct / the 4 declared questions. Checked last, after every section was answered — the only
   way to reach s52's button. Below the mark the component still ends, with success:false. */
function peakSectionsCorrect() {
  return peakProgress.questions.filter(function (q) { return q.state === 'correct'; }).length;
}
function goToComponent06() {
  var passed = peakSectionsCorrect() >= 3;
  try { setUnitResult('percent06_c05_result', passed ? 'pass' : 'fail'); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(passed), lastScreenButton()); }
  catch (e) { console.error('[xAPI] end component', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) goToComponent('next');
}

/* Per-part seam (restoreEndedButton, 20-xapi.js): the button whose click ends this component. */
function lastScreenButton() { return document.getElementById('s52-check'); }

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

function scqToggleFeedbox(screenId) {
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) feedbox.classList.toggle('collapsed');
}

// ---- Hint modal — one shared overlay for every SCQ screen ----
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
//  COMPLETION (single %-input) — s50 (ב'). Adapted from
//  methodica-math-percent-06-03's TQ_CONFIG engine, simplified to one
//  field (no multi-row table needed — the pptx shows a single blank, not
//  a table). Same digits-only sanitation, retry-gate-by-snapshot, and
//  partial/final-reveal conventions as the ported tq engine.
// ============================================================
function digitsOnly(str) { return String(str || '').replace(/[^0-9]/g, ''); }

const CQ_CONFIG = {
  s50: { correct: '75', maxAttempts: 2, qNumber: 2 }
};

const cqState = {
  s50: { attempts: 0, done: false, lastWrongValue: null, lastOutcome: null }
};

function cqInputEl(screenId) { return document.getElementById(screenId + '-answer'); }

function cqInput(screenId, el) {
  el.value = digitsOnly(el.value).slice(0, 3);
  var st = cqState[screenId];
  if (st.done) return;
  var wrap = el.parentElement;
  if (wrap) wrap.classList.remove('is-correct', 'is-error');
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) { feedbox.hidden = true; feedbox.classList.add('hidden'); }
  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) {
    var val = el.value.trim();
    var unchanged = st.lastWrongValue !== null && val === st.lastWrongValue;
    checkBtn.disabled = !val || unchanged;
  }
}

function cqCheck(screenId) {
  var st = cqState[screenId];
  var cfg = CQ_CONFIG[screenId];
  var input = cqInputEl(screenId);
  if (st.done || !input || !input.value.trim()) return;

  st.attempts++;
  var val = input.value.trim();
  var isCorrect = val === cfg.correct;
  var wrap = input.parentElement;

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (isCorrect) {
    st.done = true;
    st.lastOutcome = 'correct';
    peakProgress.questions[cfg.qNumber - 1].state = 'correct';
    input.disabled = true;
    if (wrap) { wrap.classList.remove('is-error'); wrap.classList.add('is-correct'); }
    scqShowFeedback(screenId, 'correct', true);
  } else if (st.attempts < cfg.maxAttempts) {
    st.lastWrongValue = val;
    if (wrap) { wrap.classList.remove('is-correct'); wrap.classList.add('is-error'); }
    if (checkBtn) checkBtn.disabled = true;
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question.
    if (hintBtn) hintBtn.disabled = false;
    scqShowFeedback(screenId, 'retry', true);
  } else {
    st.done = true;
    st.lastOutcome = 'wrong2';
    peakProgress.questions[cfg.qNumber - 1].state = 'incorrect';
    // Keep the learner's own value marked wrong (no auto-overwrite) — the
    // "התשובה הנכונה" toggle in the wrong2 feedback reveals the key on
    // demand (see cqToggleReveal()).
    st.ownValue = val;
    st.revealed = false;
    input.disabled = true;
    if (wrap) { wrap.classList.remove('is-correct'); wrap.classList.add('is-error'); }
    cqToggleReveal(screenId); // opens on the answer key; the pill swaps back to the learner's own answer
    scqShowFeedback(screenId, 'wrong2', true);
  }

  /* xAPI: the typed value is the answer (the field holds digits only; the unit is %). */
  xapiAnswered(xapiItemOf(screenId), PEAK_QKEY[screenId], isCorrect, isCorrect || st.attempts >= cfg.maxAttempts, val);

  if (st.done) {
    if (checkBtn) {
      checkBtn.textContent = 'هل نتابع؟';
      checkBtn.disabled = !scqNextScreen(screenId);
      checkBtn.onclick = function () { scqAdvance(screenId); };
      if (!checkBtn.disabled) checkBtn.classList.add('is-pulsing');
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

// Final-wrong "התשובה הנכונה" / "إجابتي" toggle — same pattern as
// dndToggleReveal() / methodica-math-percent-03's S8 pilot.
function cqSyncRevealBtn(screenId) {
  var btn = document.getElementById(screenId + '-reveal-btn');
  if (btn) btn.textContent = cqState[screenId].revealed ? 'إجابتي' : 'الإجابة الصحيحة';
}

function cqToggleReveal(screenId) {
  var st = cqState[screenId];
  var input = cqInputEl(screenId);
  if (!st.done || st.ownValue == null || !input) return;
  st.revealed = !st.revealed;
  input.value = st.revealed ? CQ_CONFIG[screenId].correct : st.ownValue;
  var wrap = input.parentElement;
  if (wrap) {
    wrap.classList.remove('is-correct', 'is-error');
    wrap.classList.add(st.revealed ? 'is-correct' : 'is-error');
  }
  cqSyncRevealBtn(screenId);
}

function cqStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  var context = Array.prototype.slice.call(section.querySelectorAll('[data-qrole="context"]'));
  var instruction = section.querySelector('[data-qrole="instruction"]');
  var img = document.getElementById(screenId + '-img');
  var inputRow = document.getElementById(screenId + '-input-row');
  var steps = [
    { els: context, wait: 400 },
    { els: [instruction], wait: 400 }
  ];
  if (img) steps.push({ els: [img], wait: 400 });
  steps.push({ els: [inputRow], wait: 0 });
  return steps;
}

function cqEnter(screenId) {
  var st = cqState[screenId];
  var cfg = CQ_CONFIG[screenId];
  var section = document.getElementById(screenId);
  var input = cqInputEl(screenId);
  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  peakProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) peakProgress.questions[cfg.qNumber - 1].state = 'current';

  if (st.done) {
    scqShowFeedback(screenId, st.lastOutcome, false);
    cqSyncRevealBtn(screenId);
    if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = !scqNextScreen(screenId); }
    if (hintBtn) hintBtn.disabled = true;
    runStagedSequence(screenId, function () { return cqStagedSteps(screenId); });
    return;
  }

  st.attempts = 0;
  st.lastWrongValue = null;
  st.ownValue = null;
  st.revealed = false;
  if (input) {
    input.value = '';
    input.disabled = false;
    var wrap = input.parentElement;
    if (wrap) wrap.classList.remove('is-correct', 'is-error');
  }
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) {
    feedbox.hidden = true;
    feedbox.classList.remove('is-correct', 'is-wrong', 'collapsed');
    feedbox.querySelectorAll('.scq-fb').forEach(function (fb) { fb.classList.remove('active'); });
  }
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; checkBtn.classList.remove('is-pulsing'); checkBtn.onclick = function () { cqCheck(screenId); }; }
  // Peak practice — hint stays locked until the first submitted attempt
  // (unlocked in cqCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return cqStagedSteps(screenId); });
}

// ============================================================
//  DRAG-AND-DROP RANKING TABLE — s51 (ג'). No DnD precedent exists
//  anywhere in 06-02/06-03/06-04 (confirmed by explicit search), so this
//  is new. Kept deliberately minimal: 3 draggable "chips" (company names)
//  in a pool, 3 drop slots (1st/2nd/3rd place). Every action has a
//  click-based equivalent so the whole thing works with a mouse, a
//  keyboard (native <button> Enter/Space), or touch — dragging is a
//  convenience layer on top of the same place()/unplace() state
//  functions, not a second implementation.
// ============================================================
const DND_CONFIG = {
  s51: { correctOrder: ['gamma', 'beta', 'alpha'], maxAttempts: 2, qNumber: 3 }
};

const dndState = {
  s51: { slots: [null, null, null], picked: null, attempts: 0, done: false, lastWrongSnapshot: null, lockedSlots: [false, false, false], awaitingRetry: false }
};

function dndRenderPool(screenId) {
  var st = dndState[screenId];
  var remaining = 0;
  ['alpha', 'beta', 'gamma'].forEach(function (id) {
    var chip = dndChip(screenId, id);
    if (!chip) return;
    var placed = st.slots.indexOf(id) !== -1;
    chip.hidden = placed;
    if (!placed) remaining++;
    chip.classList.toggle('is-picked', st.picked === id);
    chip.setAttribute('aria-pressed', st.picked === id ? 'true' : 'false');
  });
  // Bug fix: hide the "מחסן:" label + its empty dashed container once every
  // chip has been placed — same fix already applied to 06-06's own DnD
  // screen (s58). Centralized here so every path that can empty or refill
  // the pool — entry, click/drag placement, drop-back-to-pool, and retry's
  // return-the-wrong-chips reset — stays in sync via this single render.
  var poolWrap = document.getElementById(screenId + '-pool-wrap');
  if (poolWrap) poolWrap.hidden = remaining === 0;
}

// Retry: after a non-final wrong attempt "צדקתי?" stays disabled until the
// answer changes (no "נסה שוב" relabel; awaitingRetry is no longer set) — legacy note: same fix
// already applied to every other graded screen in this unit (06-06's s58
// among them). Called from every answer-editing entry point (chip pick,
// slot click/drop) so starting a new attempt WITHOUT pressing "נסה שוב"
// first still relabels the button back to "צדקתי?" instead of leaving it
// mismatched.
function dndClearAwaitingRetry(screenId, st) {
  if (!st.awaitingRetry) return;
  st.awaitingRetry = false;
  var checkBtn = document.getElementById(screenId + '-check');
  if (checkBtn) checkBtn.textContent = 'هل إجابتي صحيحة؟';
}

function dndDismissFeedback(screenId) {
  var st = dndState[screenId];
  if (st.done) return;
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) { feedbox.hidden = true; feedbox.classList.add('hidden'); }
}

// ---- Click / keyboard model ----
function dndPickChip(screenId, id) {
  var st = dndState[screenId];
  if (st.done) return;
  var chip = dndChip(screenId, id);
  if (chip && chip.hidden) return; // already placed
  dndClearAwaitingRetry(screenId, st);
  st.picked = (st.picked === id) ? null : id;
  dndRenderPool(screenId);
}

function dndSlotClick(screenId, i) {
  var st = dndState[screenId];
  if (st.done || st.lockedSlots[i]) return;
  dndDismissFeedback(screenId);
  dndClearAwaitingRetry(screenId, st);

  var current = st.slots[i];
  if (st.picked) {
    // Placing a picked chip — if it was already in another slot, clear that one.
    var prevIdx = st.slots.indexOf(st.picked);
    if (prevIdx !== -1 && !st.lockedSlots[prevIdx]) { st.slots[prevIdx] = null; dndClearSlotMarks(screenId, prevIdx); }
    // If this slot already holds a different (unlocked) chip, it returns to the pool.
    st.slots[i] = st.picked;
    st.picked = null;
    dndRenderSlot(screenId, prevIdx !== -1 && prevIdx !== i ? prevIdx : i);
  } else if (current) {
    // Nothing picked, slot occupied — unplace it back to the pool.
    st.slots[i] = null;
  } else {
    return;
  }
  // A real rearrangement just happened — the "unchanged since last wrong
  // attempt" gate (see dndUpdateCheckReady) only exists to block
  // resubmitting the exact same untouched state; once the learner has
  // actually touched the board, that gate must not keep comparing future
  // arrangements against the stale wrong snapshot (a bug: previously this
  // was never cleared, so landing back on a value-equal arrangement after
  // real edits stayed permanently disabled). Clearing it here means only
  // dndAllFilled() gates the button from now until the next wrong check.
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
  dndClearAwaitingRetry(screenId, st);
  var idx = st.slots.indexOf(id);
  if (idx !== -1 && !st.lockedSlots[idx]) {
    st.slots[idx] = null;
    dndClearSlotMarks(screenId, idx);
    dndRenderSlot(screenId, idx);
    st.lastWrongSnapshot = null; // real rearrangement — see dndSlotClick for why this must be cleared
  }
  st.picked = null;
  dndRenderPool(screenId);
  dndUpdateCheckReady(screenId);
}

// Retry affordance — see mcqResetAttempt()-equivalent rationale above
// (dndClearAwaitingRetry); same "צדקתי?" button relabels/resets, never a
// second button. Returns only the WRONG (unlocked) chips to the pool —
// already-correct slots stay locked/placed, per _global-components.md
// "Partial-correction flow" (never clear correct progress on a retry).
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
  dndDismissFeedback(screenId);
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

  /* xAPI: AFTER the slot loop — allCorrect is final only here (guide §6.3, trap 1). The ranking is
     one all-or-nothing question (metadata q3, sequencing); the answer is the learner's order,
     slot by slot. ownSlots on the final wrong (st.slots may already show the key). */
  xapiAnswered(xapiItemOf(screenId), PEAK_QKEY[screenId], allCorrect, isFinal,
    (st.ownSlots || st.slots).map(function (id) {
      var chip = document.querySelector('#' + screenId + ' [data-chip="' + id + '"]');
      return chip ? xapiAnswerText(chip) : String(id);
    }).join(' | '));

  if (st.done) {
    if (checkBtn) {
      checkBtn.textContent = 'هل نتابع؟';
      checkBtn.disabled = !scqNextScreen(screenId);
      checkBtn.onclick = function () { scqAdvance(screenId); };
      if (!checkBtn.disabled) checkBtn.classList.add('is-pulsing');
    }
    if (hintBtn) hintBtn.disabled = true;
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

function dndShowFeedback(screenId, outcome) {
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (!feedbox) return;
  feedbox.classList.remove('is-correct', 'is-wrong', 'collapsed');
  feedbox.classList.add(outcome === 'correct' ? 'is-correct' : 'is-wrong');
  feedbox.querySelectorAll('.scq-fb').forEach(function (fb) {
    fb.classList.toggle('active', fb.getAttribute('data-fb') === outcome);
  });
  feedbox.hidden = false;
  feedbox.classList.remove('hidden');
  positionFeedbackCard(screenId, feedbox.querySelector('.scq-fb.active'));
}

function dndStagedSteps(screenId) {
  var section = document.getElementById(screenId);
  var instruction = document.getElementById(screenId + '-instruction');
  var reference = document.getElementById(screenId + '-reference');
  var table = document.getElementById(screenId + '-table');
  var pool = document.getElementById(screenId + '-pool-wrap');
  return [
    { els: [instruction], wait: 400 },
    { els: [table], wait: 300 },
    { els: [pool], wait: 250 },
    { els: [reference], wait: 0 }
  ];
}

function dndEnter(screenId) {
  var st = dndState[screenId];
  var cfg = DND_CONFIG[screenId];
  var section = document.getElementById(screenId);
  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  peakProgress.questions[cfg.qNumber - 1].visited = true;
  if (!st.done) peakProgress.questions[cfg.qNumber - 1].state = 'current';

  if (st.done) {
    dndApplyFinalMarks(screenId);
    dndSyncRevealBtn(screenId);
    dndShowFeedback(screenId, peakProgress.questions[cfg.qNumber - 1].state === 'correct' ? 'correct' : 'wrong2');
    if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = !scqNextScreen(screenId); }
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
  var feedbox = document.getElementById(screenId + '-feedbox');
  if (feedbox) {
    feedbox.hidden = true;
    feedbox.classList.remove('is-correct', 'is-wrong');
    feedbox.querySelectorAll('.scq-fb').forEach(function (fb) { fb.classList.remove('active'); });
  }
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; checkBtn.classList.remove('is-pulsing'); checkBtn.onclick = function () { dndCheck(screenId); }; }
  // Peak practice — hint stays locked until the first submitted attempt
  // (unlocked in dndCheck()'s retry branch), per the unit-wide hint-
  // availability standard.
  if (hintBtn) hintBtn.disabled = true;

  runStagedSequence(screenId, function () { return dndStagedSteps(screenId); });
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

// Per-screen override for the default (pre-drag) position, keyed by
// screenId. Screens not listed here get the global popup-placement default
// (bottom-left of the usable canvas — see positionFeedbackCard's else
// branch below). s51 used to anchor bottom-RIGHT to stay clear of its
// reference table; QA asked for it back on the left like every other screen.
var FEEDBACK_DEFAULT_POS = {};

// Called by every show-feedback function right after unhiding the region,
// while the active card is briefly in normal flow just long enough to
// measure its natural size — then pins the card either to its FEEDBACK_
// DEFAULT_POS override (s51) or to the global popup-placement rule's
// default resting spot (bottom-left of the usable canvas, above the bottom
// bar), so the drag handler below can move it afterward. Anchoring
// bottom-left (instead of the region's flex-centered position) keeps the
// card in the same physical corner across retry/correct/wrong2 regardless
// of how tall each outcome's content is.
function positionFeedbackCard(screenId, card) {
  if (!card) return;
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';

  var app = document.getElementById('app');
  var custom = FEEDBACK_DEFAULT_POS[screenId];
  var pos; // canvas-space, relative to #app
  if (custom) {
    pos = custom(card);
  } else {
    pos = { x: FEEDBACK_DRAG_MARGIN, y: (app.offsetHeight - BOTTOM_BAR_H) - FEEDBACK_DRAG_MARGIN - card.offsetHeight };
  }
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
   the code that uses it. Ids verified against ../metadata/methodica-math-percent-06-05.json (2026-10-20).

   SCREEN_TO_SUBCONTENT: 0-based screen index (= data-screen = goTo(n)) -> [item suffix, page in
   item]. ⚠️ Exactly TOTAL_SCREENS keys (5), no gaps — a missing key is a screen that silently
   never reports (guide §6.2). Only [0] is read; [1] documents the paging. */
var SCREEN_TO_SUBCONTENT = {
   0: ['001', 1],   // s48
   1: ['001', 2],   // s49
   2: ['001', 3],   // s50
   3: ['001', 4],   // s51
   4: ['001', 5]    // s52
};

var XAPI_COMP_SLUG = 'methodica-math-percent-06-05';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
/* Item ids carry this component's own slug — no XAPI_ITEM_SLUG needed. Until 2026-10-20 they
   carried the script's numbering (methodica-math-percent-06-04-NNN); MOE renumbered them in KATA. */
/* Items that carry a code-graded question — used as a set. */
var XAPI_EVAL_ITEMS = { '001': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-06-05.json';

/* ═══════════════════ Resume (KATA State API) — this component's hooks ═══════════════════
   Read by ../unit-js/40-resume.js at CALL time (guide §8.7). Contract (40-resume.js "Snapshot
   helpers"): only FINISHED questions are saved; an unfinished one starts fresh on return, exactly
   as it already did when the learner navigated away and back. The enter functions
   (resetScreenState) already rebuild a finished screen's feedback / progress / button from these
   variables; restoreScreenUI adds what only the live check leaves in the DOM (the option marks,
   typed values) and re-wires "هل نتابع؟" on s50 / s51 — the markup's cqCheck() / dndCheck() return early
   once done, so after a reload the button would otherwise be dead (guide §8.4a). Every painter paints from state and never resets (guide §8.8).
   applyResumeDom has nothing to do: no answer here lives only in the DOM. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qr: resumeClone(XAPI_Q_RESULTS),
    scq: resumeDoneEntries({ s49: scqState.s49, s52: scqState.s52 }),
    cq: resumeDoneEntries(cqState),
    dnd: resumeDoneEntries(dndState),
    prog: resumeProgress(peakProgress)
  };
}
function applyResumeVars(st) {
  resumeAssign(XAPI_Q_RESULTS, st.qr);
  resumeAssignMap(scqState, st.scq);
  resumeAssignMap(cqState, st.cq);
  resumeAssignMap(dndState, st.dnd);
  resumeApplyProgress(peakProgress, st.prog);
}
function applyResumeDom(st) {}
function restoreScreenUI(n) {
  var id = resumeScreenId(n);
  if (SCQ_CONFIG[id] && scqState[id].done) {
    resumePaintChoice(scqOptions(id), [scqState[id].selected], [SCQ_CONFIG[id].correctId]);
  }
  if (CQ_CONFIG[id] && cqState[id].done) {
    /* What cqCheck / cqToggleReveal leave: the key (correct, or a final wrong with the key toggled
       in) or the learner's own value, framed correct / error, locked. */
    var cs = cqState[id], input = cqInputEl(id);
    if (input) {
      var own = cs.lastOutcome === 'wrong2' && !cs.revealed && cs.ownValue != null;
      input.value = own ? cs.ownValue : CQ_CONFIG[id].correct;
      input.disabled = true;
      var wrap = input.parentElement;
      if (wrap) { wrap.classList.remove('is-correct', 'is-error'); wrap.classList.add(own ? 'is-error' : 'is-correct'); }
    }
  }
  if ((CQ_CONFIG[id] && cqState[id].done) || (DND_CONFIG[id] && dndState[id].done)) {
    var b = document.getElementById(id + '-check');
    if (b && scqNextScreen(id)) b.onclick = function () { scqAdvance(id); };
  }
  /* s51 (drag table): dndEnter's done branch already repaints slots / marks / pool from dndState. */
}
