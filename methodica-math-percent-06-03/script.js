'use strict';

// Shared functions (17) live in ../unit-js/05-core.js, loaded right before this file:
//   cssMs, stageShowEl, reducedMotionPref, runStagedSequence, cancelStagedSequence, scaleApp,
//   goBack, updateBackButton, goToComponent, clampFeedbackPos, regionOffset, scqCloseHint,
//   makeClickHint, openImgZoom, closeImgZoom, devScreenList, notifyDevHost

// ============================================================
//  CONSTANTS & GLOBAL STATE
//  methodica-math-percent-06-03 — רכיב 2, תרגול בסיסי וסטנדרטי מועד ב'
//  (pptx slides 32-39): TransitionScreen×2 (s32/s36) + Table
//  ValueInputQuestion×2 (s33/s37) + one combined scroll classification
//  question (s3435) + one combined scroll two-part SCQ (s3839).
//  6 navigation screens for 8 logical script screens (33-40) — the two
//  scroll units are each ONE .screen div, per the user's explicit
//  instruction not to present a scroll-continuation question as two
//  separate screens.
// ============================================================
const TOTAL_SCREENS = 6;
let currentScreen = 0;

const NAV_FLOW = [0, 1, 2, 3, 4, 5];

window.lomdaState = {};

// ============================================================
//  STAGED-REVEAL SEQUENCER — ported verbatim from
//  methodica-math-percent-06-01's runStagedSequence()/[data-reveal-on-ready]
//  engine (hook1/s13/Learning Phase). Drives two things in this component:
//  s32/s36's TransitionScreen sequencing (ending in a gated, pulsing
//  Continue) and s3435/s3839's per-scroll-page reveal — kept out of the
//  shared engine's plain [data-reveal]/Motion.reveal() mechanism because
//  that call already fires unconditionally for the WHOLE .screen in goTo()
//  and searches the entire subtree, so a scroll page's content would be
//  swept (and its float-in animation would run to completion) the instant
//  the screen becomes active — long before the learner actually scrolls to
//  it. [data-reveal-on-ready] is a different attribute name, invisible to
//  that sweep, so per-page reveal here is only ever triggered explicitly
//  below (runStagedSequence), never by goTo()'s own Motion.reveal() call.
//
//  Step shape: { els: [Element,...], dur: ms, wait: ms, onShow: fn(instant) }
//    - els: revealed via the is-revealed mechanism (omit/[] for a step that
//      only runs a custom onShow, e.g. enabling a button).
//    - dur: how long THIS step's own entrance animation takes to settle —
//      matches whichever --m-stage-duration-* the revealed element's own
//      m-stage-* class actually uses (see styles.css). Defaults to
//      STAGE_DURATION_DEFAULT for steps that don't specify one.
//    - wait: the storytelling pause AFTER `dur`, before the NEXT step
//      fires — 0 for "immediately once settled", omitted to fall back to
//      STAGE_GAP_DEFAULT.
//    - onShow(instant): optional extra per-step action (enabling a
//      button). `instant` is true on the revisit/reduced-motion fast path.
//
//  Per-session semantics match the base Motion engine: first run plays the
//  real timed sequence; a screen/page already played this session (or
//  prefers-reduced-motion) shows everything at once, no animation, never a
//  replay.
// ============================================================
var stagedSequences = {};

var STAGE_GAP_DEFAULT = cssMs('--m-reveal-stagger', 180);
var STAGE_GAP_FINISH = STAGE_GAP_DEFAULT;
var STAGE_DURATION_DEFAULT = cssMs('--m-reveal-duration', 600);
var STAGE_DURATION_TEXT = cssMs('--m-stage-duration-text', 420);
var STAGE_DURATION_CARD = cssMs('--m-stage-duration-card', 375);
var STAGE_DURATION_POPUP = cssMs('--m-stage-duration-popup', 420);
var STAGE_DURATION_VISUAL = cssMs('--m-stage-duration-visual', 525);

// ============================================================
//  SCALING — fit 1280×710 canvas into any viewport (ported verbatim)
// ============================================================

window.addEventListener('resize', scaleApp);
scaleApp();

// ============================================================
//  NAVIGATION — same shape as 06-01/06-02's goTo/resetScreenState ladder
// ============================================================
// Screen index -> staged-sequence key(s) that must be cancelled when
// navigating away mid-sequence (no orphaned timers left running on a
// screen the learner isn't looking at). Harmless no-op for keys that
// never started or already finished.
const STAGED_KEYS_BY_SCREEN = {
  0: ['s32'],
  1: ['s33'],
  2: ['s3435-page-top', 's3435-page-cls'],
  3: ['s36'],
  4: ['s37'],
  5: ['tqs-page-a', 'tqs-page-b']
};

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
  scrollGestureEnter(screens[currentScreen]);
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
var UNIT_PREV_COMPONENT = '../methodica-math-percent-06-02/index.html';
var UNIT_NEXT_COMPONENT = '../methodica-math-percent-06-04/index.html';
var unitShellHosted = false;

window.addEventListener('message', function (e) {
  if (e.source === window.parent && e.data && e.data.type === 'UNIT_SHELL') unitShellHosted = true;
});

function resetScreenState(n) {
  if (n === 0) s32Init();
  else if (n === 1) tqEnter('s33');
  else if (n === 2) clsEnter();
  else if (n === 3) s36Init();
  else if (n === 4) tqEnter('s37');
  else if (n === 5) subEnter();
}

// ============================================================
//  TRANSITION SCREENS — s32/s36 (pptx slides 32/36). Staged sequence:
//  headline -> subline (s32 only) -> character -> speech bubble (s36 only) -> Continue
//  enabled (pulses automatically via styles.css's :not(:disabled) rule).
//  Same runStagedSequence() shape/tokens as 06-01's s13/hook1 — only the
//  step list differs per screen's own content.
// ============================================================
function s32StagedSteps() {
  var headline = document.getElementById('s32-headline');
  var subline  = document.getElementById('s32-subline');
  var img      = document.getElementById('s32-character-img');
  return [
    { els: [headline], dur: STAGE_DURATION_TEXT, wait: 400 },
    { els: [subline],  dur: STAGE_DURATION_TEXT, wait: 400 },
    { els: [img],      dur: STAGE_DURATION_VISUAL, wait: STAGE_GAP_FINISH },
    { onShow: function () {
        var btn = document.getElementById('s32-continue');
        if (btn) btn.disabled = false;
      } }
  ];
}
function s32Init() { runStagedSequence('s32', s32StagedSteps); }

function s36StagedSteps() {
  var headline = document.getElementById('s36-headline');
  var img      = document.getElementById('s36-character-img');
  var aside    = document.getElementById('s36-aside');
  return [
    { els: [headline], dur: STAGE_DURATION_TEXT, wait: 400 },
    { els: [img],      dur: STAGE_DURATION_VISUAL, wait: 0 },
    { els: [aside],    dur: STAGE_DURATION_POPUP, wait: STAGE_GAP_FINISH },
    { onShow: function () {
        var btn = document.getElementById('s36-continue');
        if (btn) btn.disabled = false;
      } }
  ];
}
function s36Init() { runStagedSequence('s36', s36StagedSteps); }

// ============================================================
//  PROGRESS QUESTION — the unit's real dot-nav component, per
//  720-templates/_global-components.md § Progress Question. Restored
//  here per explicit user direction, replacing the plain "שאלה N מתוך 2"
//  text label this component previously shipped with —
//  buildProgressNav/updateProgressQuestion are the same generic renderer
//  ported verbatim from 06-01/06-02, just parametrized on a `state`
//  object instead of one hardcoded module-level tracker, since this
//  component has TWO independent 2-question practice sections rather
//  than 06-02's single 3-question set: progressA drives s33 (q1) +
//  s3435 (q2); progressB drives s37 (q1) + s3839 (q2). Labels are plain
//  "שאלה N" (no "מתוך 2" suffix) — matches the actual dot+label shapes
//  found on the pptx slides themselves (e.g. slide 33's "קבוצה
//  21/24"/"שאלה 1"/"שאלה 2" ellipse+textbox pairs), not invented.
// ============================================================
const progressA = {
  questions: [
    { number: 1, visited: false, state: 'not-answered', screen: 1 },
    { number: 2, visited: false, state: 'not-answered', screen: 2 }
  ]
};
const progressB = {
  questions: [
    { number: 1, visited: false, state: 'not-answered', screen: 4 },
    { number: 2, visited: false, state: 'not-answered', screen: 5 }
  ]
};

function buildProgressNav(container, state) {
  if (!container || container.childElementCount) return;
  state.questions.forEach(function (q, i) {
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
  buildProgressNav(container, state);
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

// Maps a table screen id to its progress state + question index — shared
// by tqEnter/tqCheck so both stay in sync with one source of truth.
const TQ_PROGRESS = {
  s33: { state: progressA, qIndex: 0 },
  s37: { state: progressB, qIndex: 0 }
};

// ============================================================
//  DIGIT-ONLY SANITIZATION — ported verbatim from 06-01's
//  handleDigitsInput/handleDigitsPaste convention (digitsOnly helper),
//  reused here inline inside tqInput() for every numeric input.
// ============================================================
function digitsOnly(str) { return String(str || '').replace(/[^0-9]/g, ''); }

// ============================================================
//  TABLE ValueInputQuestion — s33/s37. Figma "Screen Templates/
//  FillInTheBlankTableQuestion" (node 1046:26887). One config-driven
//  engine reused for both screens (different row/field shapes), per
//  720-templates/ValueInputQuestion.md + _question-template-defaults.md
//  (hint policy, retry gate, shared correct/final-wrong explanation).
// ============================================================
const TQ_CONFIG = {
  s33: {
    maxAttempts: 2,
    fields: ['cnt', 'exp', 'pct'],
    rows: [
      { cnt: '15', exp: '75', pct: '75' },
      { cnt: '18', exp: '90', pct: '90' },
      { cnt: '20', exp: '100', pct: '100' }
    ]
  },
  s37: {
    maxAttempts: 2,
    fields: ['pct'],
    rows: [
      { pct: '15' },
      { pct: '25' },
      { pct: '50' },
      { pct: '10' }
    ],
    // Overrides this file's default "hint available from the start" policy
    // (see s33) — s37's hint only unlocks after the first wrong attempt,
    // per explicit user feedback.
    hintAfterAttempt: true
  }
};

const tqState = {
  s33: { attempts: 0, done: false, lastWrongSnapshot: null, lastOutcome: null },
  s37: { attempts: 0, done: false, lastWrongSnapshot: null, lastOutcome: null }
};

const SCQ_HINT = {
  // Line breaks + right alignment per explicit user QA (each label runs
  // inline with its text; one blank-line gap between the three groups).
  s33: '<div class="hint-lines">' +
       '<p><strong>تمثيل بالكسر البسيط:</strong> في الاختبار 20 سؤالاً، ولذلك المقام في جميع الكسور هو 20.<br>أدخلوا عدد الإجابات الصحيحة.</p>' +
       '<p><strong>الكسر بعد توسيع المقام إلى 100:</strong> اسألوا أنفسكم: في أيّ عدد<br>يجب ضرب 20 لملء عمود الكسر الموسّع إلى مقام 100؟</p>' +
       '<p><strong>نسبة مئوية:</strong> تذكّروا: الكسر الذي مقامه 100 يمكن قراءته مباشرةً كنسبة مئوية.</p>' +
       '</div>',
  s3435: '<p>انتبهوا:</p>' +
       '<p>مَن لم يصل إلى الهدف بعد، تكون القيمة التي تمثّل إنجازه أقل من الواحد الصحيح.</p>' +
       '<p>من وصل إلى الهدف، قيمته تساوي الواحد الصحيح.</p>' +
       '<p>من تجاوز الهدف، تكون قيمته أكبر من الواحد الصحيح.</p>',
  s37: '<p>لاحظوا أن المقام في جميع الكسور هو 40.</p>' +
       '<p>يصعب الوصول من المقام 40 إلى 100، لذلك يُفضَّل اختزال الكسر أولًا.</p>',
  'tqs-a': '<p>هل يكفي، عند المقارنة بين مجموعات ذات أحجام مختلفة، أن نقارن عدد المشاهدات فقط؟</p>'
};

function tqInputEl(screenId, rowIdx, field) {
  return document.getElementById(screenId + '-r' + (rowIdx + 1) + '-' + field);
}

// The visually-marked element for a field's correct/error state: the
// .gvi-answer-box input itself for a fraction numerator, or the
// .tq-pct-wrap wrapper (so the % suffix tints along with the input) for
// the percent field.
function tqStateEl(screenId, rowIdx, field) {
  var input = tqInputEl(screenId, rowIdx, field);
  if (!input) return null;
  return field === 'pct' ? input.parentElement : input;
}

function tqRows(screenId) { return TQ_CONFIG[screenId].rows; }
function tqFields(screenId) { return TQ_CONFIG[screenId].fields; }

function tqAllFilled(screenId) {
  var filled = true;
  tqRows(screenId).forEach(function (row, i) {
    tqFields(screenId).forEach(function (f) {
      var input = tqInputEl(screenId, i, f);
      if (input && !input.value.trim()) filled = false;
    });
  });
  return filled;
}

function tqSnapshot(screenId) {
  var snap = {};
  tqRows(screenId).forEach(function (row, i) {
    tqFields(screenId).forEach(function (f) {
      var input = tqInputEl(screenId, i, f);
      snap[i + '-' + f] = input ? input.value.trim() : '';
    });
  });
  return JSON.stringify(snap);
}

function tqUpdateCheckReady(screenId) {
  var st = tqState[screenId];
  var btn = document.getElementById(screenId + '-check');
  if (!btn || st.done) return;
  var unchanged = st.lastWrongSnapshot !== null && tqSnapshot(screenId) === st.lastWrongSnapshot;
  btn.disabled = !tqAllFilled(screenId) || unchanged;
}

// Dismisses the retry-feedback popup as a side effect of starting a new
// attempt, per _global-components.md "First-attempt retry feedback
// dismissal." Shared helper for every feedback block in this component
// (table + classification + two-part SCQ all use the same [hidden]
// mechanic on their own feedback element).
function dismissFeedback(elId) {
  var el = document.getElementById(elId);
  if (el) el.hidden = true;
}

function tqInput(screenId, el) {
  el.value = digitsOnly(el.value);
  var st = tqState[screenId];
  if (st.done) return;
  var stateEl = el.classList.contains('tq-pct-input') ? el.parentElement : el;
  stateEl.classList.remove('is-error');
  dismissFeedback(screenId + '-feedback');
  tqUpdateCheckReady(screenId);
}

function tqShowFeedback(screenId, outcome) {
  var fb = document.getElementById(screenId + '-feedback');
  if (!fb) return;
  fb.setAttribute('data-outcome', outcome);
  fb.querySelectorAll('.tq-fb').forEach(function (f) {
    f.classList.toggle('active', f.getAttribute('data-fb') === outcome);
  });
  fb.hidden = false;
  // Only the floating variant (s33/s37) is a movable overlay card — the
  // inline variant (s3435/s3839, .tq-feedback:not(.tq-feedback--floating))
  // renders in normal document flow beside its own question and has no
  // "default position" to reset, so it's left untouched.
  if (fb.classList.contains('tq-feedback--floating')) {
    positionFeedbackCard(fb.querySelector('.tq-fb.active'));
  }
}

// ============================================================
//  FEEDBACK POPUP DRAG SUPPORT — global standard (per the 720 feedback-
//  popup spec): every floating feedback card is draggable, bounded to the
//  canvas, and resets to its default position on every fresh open (never
//  remembers a prior drag). Mirrors the hint-popup drag system's own
//  clamp formula (margin on X only; Y is flush against the top edge / the
//  bottom bar) so both popup families behave identically. Scoped to
//  .tq-fb.active cards inside the floating region — the inline variant
//  (s3435/s3839) never receives position:absolute and is unaffected.
// ============================================================
var FEEDBACK_DRAG_MARGIN = 16;
var BOTTOM_BAR_H = 74; // matches .screen::after's fixed height
// Default resting gap above the bottom bar — larger than the drag margin so
// the card doesn't read as clipped against the bar (user feedback).
var FEEDBACK_REST_GAP = 48;

// Called right after unhiding the floating region, while the active card is
// briefly in normal flow just long enough to measure its natural size —
// then pins it to the global popup-placement rule's default resting spot
// (bottom-left of the usable canvas, above the bottom bar) so the drag
// handler below can move it afterward. Anchoring bottom-left (instead of
// the region's flex-centered position) keeps the card in the same physical
// corner across retry/correct/wrong2 regardless of how tall each outcome's
// content is.
function positionFeedbackCard(card, restX) {
  if (!card) return;
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';

  var app = document.getElementById('app');
  var pos = { x: restX != null ? restX : FEEDBACK_DRAG_MARGIN, y: (app.offsetHeight - BOTTOM_BAR_H) - FEEDBACK_REST_GAP - card.offsetHeight };
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
    if (e.target.closest('button, input, a')) return;
    var card = e.target.closest('.tq-feedback--floating .tq-fb.active');
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

function tqCheck(screenId) {
  var st = tqState[screenId];
  var cfg = TQ_CONFIG[screenId];
  if (st.done || !tqAllFilled(screenId)) return;

  st.attempts++;
  var allCorrect = true;
  var rowResults = [];
  tqRows(screenId).forEach(function (row, i) {
    var fieldOk = {};
    tqFields(screenId).forEach(function (f) {
      var input = tqInputEl(screenId, i, f);
      var ok = input.value.trim() === row[f];
      fieldOk[f] = ok;
      if (!ok) allCorrect = false;
    });
    rowResults.push(fieldOk);
  });

  var isFinal = allCorrect || st.attempts >= cfg.maxAttempts;

  // Field-level correct/error state is shown on every check, not only the
  // final reveal (explicit user feedback — a mid-retry check that only
  // painted the wrong fields red left the correct ones visually identical
  // to "not yet checked," which read as unclear). A field found correct on
  // a non-final attempt also locks immediately here — the established
  // Partial-correction flow (_global-components.md, same precedent as
  // 06-02's s30) — so the learner can't accidentally overwrite an
  // already-right value while fixing the fields still marked wrong. A
  // field still wrong on the truly final attempt gets its value replaced
  // with the correct answer — same established final-wrong reveal as
  // 06-01's warmupSubmit() (`el.value = WARMUP_CORRECT[key]`), so the
  // learner sees the right answer in place, not their own last guess. A
  // field still wrong on a NON-final attempt keeps the learner's own value
  // (explicit user feedback — clearing it hid what they had entered); its
  // red state is dropped as soon as they edit it (tqInput), and the
  // "unchanged" snapshot gate (tqUpdateCheckReady) keeps the check button
  // locked until something actually changes.
  tqRows(screenId).forEach(function (row, i) {
    tqFields(screenId).forEach(function (f) {
      var stateEl = tqStateEl(screenId, i, f);
      var input = tqInputEl(screenId, i, f);
      if (!stateEl) return;
      var fieldOk = rowResults[i][f];
      stateEl.classList.remove('is-correct', 'is-error');
      stateEl.classList.add(fieldOk ? 'is-correct' : 'is-error');
      // Final wrong keeps the learner's own value marked (no auto-
      // overwrite) — the "התשובה הנכונה" toggle in the wrong2 feedback
      // swaps in the answer key on demand (see tqToggleReveal()).
      if (isFinal || fieldOk) {
        // Clears any native text selection (e.g. Windows Chrome auto-
        // selects an input's full text on Tab-focus) before locking —
        // otherwise the browser's own selection highlight can stay
        // visually painted over the correct/error background once
        // disabled, showing as a stray tint hugging just the digits.
        input.setSelectionRange(input.value.length, input.value.length);
        input.disabled = true;
      }
      // Forces a full repaint — not just a layout flush — right after the
      // class change above. Reading offsetHeight alone forces layout but
      // not necessarily a compositor repaint: on the .tq-pct-wrap GPU
      // layer (translateZ(0) in styles.css), Safari can leave the pill's
      // old background color stuck on part of the pill (typically the
      // input side) after this class toggle even though layout already
      // reflects the new class. Toggling display off/on forces the
      // compositor to fully redraw the layer's contents.
      stateEl.style.display = 'none';
      void stateEl.offsetHeight;
      stateEl.style.display = '';
    });
  });

  /* xAPI: the table is ONE declared question (metadata fill-in), graded all-or-nothing, so one
     'answered' with the screen's isFinal. Read BEFORE the outcome chain: a final wrong swaps the
     answer key into the fields (tqToggleReveal), and the learner's own values must be reported. */
  xapiAnswered(xapiItemOf(screenId), 'q1', allCorrect, isFinal,
    tqRows(screenId).map(function (row, i) {
      return tqFields(screenId).map(function (f) { var el = tqInputEl(screenId, i, f); return el ? el.value.trim() : ''; }).join('/');
    }).join(' | '));

  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  if (allCorrect) {
    st.done = true;
    st.lastOutcome = 'correct';
    tqShowFeedback(screenId, 'correct');
  } else if (!isFinal) {
    st.lastWrongSnapshot = tqSnapshot(screenId);
    if (checkBtn) checkBtn.disabled = true;
    // For a hintAfterAttempt screen (s37), the first wrong attempt is what
    // unlocks the hint — a no-op for screens where it was already enabled
    // from the start (e.g. s33).
    if (hintBtn) hintBtn.disabled = false;
    tqShowFeedback(screenId, 'retry');
  } else {
    st.done = true;
    st.lastOutcome = 'wrong2';
    st.ownValues = JSON.parse(tqSnapshot(screenId));
    st.revealed = false;
    tqToggleReveal(screenId); // opens on the answer key; the pill swaps back to the learner's own answer
    tqShowFeedback(screenId, 'wrong2');
  }

  if (st.done) {
    // ValueInputQuestion.md's own completion label — "המשך", distinct
    // from SingleChoiceQuestion's "هل نتابع؟".
    if (checkBtn) { checkBtn.textContent = 'متابعة'; checkBtn.disabled = !tqNextScreen(); checkBtn.onclick = function () { tqAdvance(); }; }
    if (hintBtn) hintBtn.disabled = true;
    var pinfo = TQ_PROGRESS[screenId];
    if (pinfo) {
      pinfo.state.questions[pinfo.qIndex].state = allCorrect ? 'correct' : 'incorrect';
      updateProgressQuestion(document.getElementById(screenId + '-progress'), pinfo.state);
    }
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

// Final-wrong "התשובה הנכונה" / "إجابتي" toggle — same pattern as
// methodica-math-percent-03's S8 pilot (single pill button whose label
// swaps). Only field values, their V/X marks and the label change.
function tqSyncRevealBtn(screenId) {
  var btn = document.getElementById(screenId + '-reveal-btn');
  if (btn) btn.textContent = tqState[screenId].revealed ? 'إجابتي' : 'الإجابة الصحيحة';
}

function tqToggleReveal(screenId) {
  var st = tqState[screenId];
  if (!st.done || !st.ownValues) return;
  st.revealed = !st.revealed;
  tqRows(screenId).forEach(function (row, i) {
    tqFields(screenId).forEach(function (f) {
      var input = tqInputEl(screenId, i, f);
      var stateEl = tqStateEl(screenId, i, f);
      if (!input) return;
      input.value = st.revealed ? row[f] : st.ownValues[i + '-' + f];
      if (!stateEl) return;
      stateEl.classList.remove('is-correct', 'is-error');
      stateEl.classList.add(input.value.trim() === row[f] ? 'is-correct' : 'is-error');
      // Same forced repaint as tqCheck() — see the Safari note there.
      stateEl.style.display = 'none';
      void stateEl.offsetHeight;
      stateEl.style.display = '';
    });
  });
  tqSyncRevealBtn(screenId);
}

function tqNextScreen() {
  var idx = NAV_FLOW.indexOf(currentScreen);
  return idx >= 0 && idx + 1 < NAV_FLOW.length;
}
function tqAdvance() {
  var idx = NAV_FLOW.indexOf(currentScreen);
  if (idx >= 0 && idx + 1 < NAV_FLOW.length) goTo(NAV_FLOW[idx + 1]);
}

// Staged entrance for s33/s37: intro/context text -> (400ms settle pause) ->
// [s37 only] emphasized purple instruction -> (400ms settle pause) -> the
// whole table (+ optional image) revealed together as ONE unit. Same
// runStagedSequence() engine + explicit 400ms waits as the approved
// methodica-math-percent-06-02 pattern (q3StagedSteps) — s33 has no separate
// instruction element (its context paragraph already ends with the
// instruction), s37 does, so this reads however many `-context`/`-qtitle`/
// `-instruction` text elements actually exist for the given screenId.
function tqStagedSteps(screenId) {
  var textEls = [
    document.getElementById(screenId + '-qtitle'),
    document.getElementById(screenId + '-context'),
    document.getElementById(screenId + '-instruction')
  ].filter(Boolean);
  var table = document.getElementById(screenId + '-table');
  var steps = textEls.map(function (el) {
    return { els: [el], dur: STAGE_DURATION_TEXT, wait: 400 };
  });
  steps.push({ els: [table], dur: STAGE_DURATION_CARD, wait: 0 });
  return steps;
}

function tqEnter(screenId) {
  var st = tqState[screenId];
  var cfg = TQ_CONFIG[screenId];
  var checkBtn = document.getElementById(screenId + '-check');
  var hintBtn = document.getElementById(screenId + '-hint');

  var pinfo = TQ_PROGRESS[screenId];
  if (pinfo) {
    pinfo.state.questions[pinfo.qIndex].visited = true;
    if (!st.done) pinfo.state.questions[pinfo.qIndex].state = 'current';
    updateProgressQuestion(document.getElementById(screenId + '-progress'), pinfo.state);
  }

  if (st.done) {
    // Resume-state guard — reopen feedback + keep the locked/marked
    // inputs rather than resetting, per _global-components.md "Reopening
    // feedback on return to a resolved screen." Reads the outcome stored
    // by tqCheck rather than re-deriving it from the current field values
    // — after the "התשובה הנכונה" toggle every value matches the answer
    // key and would otherwise misread as 'correct'.
    tqShowFeedback(screenId, st.lastOutcome || 'correct');
    tqSyncRevealBtn(screenId);
    if (checkBtn) { checkBtn.textContent = 'متابعة'; checkBtn.disabled = !tqNextScreen(); checkBtn.onclick = function () { tqAdvance(); }; }
    if (hintBtn) hintBtn.disabled = true;
    // Re-lock the entrance state instantly — same resume-guard reasoning as
    // scqEnter()'s/q3Enter()'s equivalent call in 06-02.
    runStagedSequence(screenId, function () { return tqStagedSteps(screenId); });
    return;
  }

  st.attempts = 0;
  st.lastWrongSnapshot = null;
  st.ownValues = null;
  st.revealed = false;
  tqRows(screenId).forEach(function (row, i) {
    tqFields(screenId).forEach(function (f) {
      var input = tqInputEl(screenId, i, f);
      var stateEl = tqStateEl(screenId, i, f);
      input.value = '';
      input.disabled = false;
      if (stateEl) stateEl.classList.remove('is-correct', 'is-error');
    });
  });
  dismissFeedback(screenId + '-feedback');
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; checkBtn.onclick = function () { tqCheck(screenId); }; }
  if (hintBtn) hintBtn.disabled = !!cfg.hintAfterAttempt;

  runStagedSequence(screenId, function () { return tqStagedSteps(screenId); });
}

// ---- Hint modal — one shared overlay across every screen in this part ----
// Reusable while the screen is unresolved: opening/closing must never
// disable or hide the trigger — only the resolved-state branches retire it.
/* xAPI: which declared question each hint belongs to — [screen section, qKey]. s3435's one hint
   covers its three rows: reported under q1. 'tqs-a' is s3839's sub-part א (q1). */
const HINT_QUESTION = { s33: ['s33', 'q1'], s3435: ['s3435', 'q1'], s37: ['s37', 'q1'], 'tqs-a': ['s3839', 'q1'] };

function scqOpenHint(screenId) {
  var overlay = document.getElementById('scq-hint-overlay');
  var body = document.getElementById('scq-hint-body');
  if (!overlay || !body) return;
  /* xAPI: requested.1 — after the guards, immediately before the hint is shown. Opens only;
     the hints ledger dedupes a re-open. */
  var hq = HINT_QUESTION[screenId];
  if (hq) xapiRequestedHint(xapiItemOf(hq[0]), hq[1]);
  body.innerHTML = SCQ_HINT[screenId] || '';
  overlay.hidden = false;
  overlay.classList.remove('hidden');
}

// ============================================================
//  CLASSIFICATION QUESTION — s3435 (pptx slides 34-35). 3 independent
//  always-visible 3-pill rows (local variant reusing .scq-opt/.scq-radio
//  verbatim, per explicit decision over a collapsed DropdownQuestion),
//  graded holistically with a 2-attempt retry gate — same shape as
//  06-02's s30 multi-part local SCQ variant, minus the partial-lock
//  (this question's own copy doesn't call for per-row locking).
// ============================================================
const CLS_CORRECT = { 1: 'under', 2: 'over', 3: 'under' };
const CLS_ROWS = [1, 2, 3];

const clsState = {
  selected: { 1: null, 2: null, 3: null },
  attempts: 0,
  done: false,
  lastWrongSnapshot: null
};

function clsOptions(row) {
  return Array.prototype.slice.call(document.querySelectorAll('.cls-row[data-row="' + row + '"] .scq-opt'));
}

function clsSnapshot() { return JSON.stringify(clsState.selected); }

function clsUpdateCheckReady() {
  var btn = document.getElementById('s3435-check');
  if (!btn || clsState.done) return;
  var allSelected = CLS_ROWS.every(function (r) { return clsState.selected[r]; });
  var unchanged = clsState.lastWrongSnapshot !== null && clsSnapshot() === clsState.lastWrongSnapshot;
  btn.disabled = !allSelected || unchanged;
}

function clsSelect(row, id) {
  if (clsState.done) return;
  dismissFeedback('s3435-feedback');
  clsState.selected[row] = id;
  clsOptions(row).forEach(function (opt) {
    var isThis = opt.getAttribute('data-id') === id;
    opt.classList.toggle('selected', isThis);
    opt.classList.remove('wrong');
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  clsUpdateCheckReady();
}

function clsEnter() {
  // Fires the first (top) page's own staged reveal on entry — goTo() itself
  // never dispatches a `scroll` event, so without this the initial page
  // would sit un-revealed until the learner's first scroll tick. Idempotent
  // on every later call (revisit, or re-entering resolved) via
  // runStagedSequence's own played-flag guard.
  lpCheckCurrentPageReveal('s3435-scroll');

  var checkBtn = document.getElementById('s3435-check');
  var hintBtn = document.getElementById('s3435-hint');
  var continueBtn = document.getElementById('s3435-continue');

  progressA.questions[1].visited = true;
  if (!clsState.done) progressA.questions[1].state = 'current';
  updateProgressQuestion(document.getElementById('s3435-progress'), progressA);

  var actions = document.getElementById('s3435-actions');

  if (clsState.done) {
    clsShowFeedback(clsState.lastOutcome);
    if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = true; }
    if (hintBtn) hintBtn.disabled = true;
    if (continueBtn) { continueBtn.disabled = false; continueBtn.hidden = false; }
    /* The gate's ended look after a reload / re-entry (guide §6.4, D-8): disabled only when the gate
       blocks AND this component's 'completed' is in the ledger — never merely because it blocks. */
    if (continueBtn && segmentAGateBlocks() && typeof alreadySent === 'function' && alreadySent('done', currentPartSlug())) {
      continueBtn.disabled = true;
    }
    // Once resolved, the hint/check button row is redundant clutter — the
    // primary bottom "המשך" continue button is already the way forward.
    // Hidden (not just disabled), per explicit user feedback that these
    // buttons shouldn't remain visible once feedback is showing.
    if (actions) actions.hidden = true;
    return;
  }

  if (actions) actions.hidden = false;
  CLS_ROWS.forEach(function (row) {
    clsState.selected[row] = null;
    clsOptions(row).forEach(function (opt) {
      opt.disabled = false;
      opt.classList.remove('selected', 'correct', 'wrong');
      opt.setAttribute('aria-checked', 'false');
    });
  });
  clsState.attempts = 0;
  clsState.lastWrongSnapshot = null;
  dismissFeedback('s3435-feedback');
  if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; }
  if (hintBtn) hintBtn.disabled = false;
  if (continueBtn) { continueBtn.disabled = true; continueBtn.hidden = true; }
}

function clsShowFeedback(outcome) {
  var fb = document.getElementById('s3435-feedback');
  if (!fb) return;
  fb.setAttribute('data-outcome', outcome);
  fb.querySelectorAll('.tq-fb').forEach(function (f) {
    f.classList.toggle('active', f.getAttribute('data-fb') === outcome);
  });
  fb.hidden = false;
}

function clsCheck() {
  if (clsState.done) return;
  var allSelected = CLS_ROWS.every(function (r) { return clsState.selected[r]; });
  if (!allSelected) return;

  clsState.attempts++;
  var allCorrect = true;
  CLS_ROWS.forEach(function (row) {
    if (clsState.selected[row] !== CLS_CORRECT[row]) allCorrect = false;
  });
  var isFinal = allCorrect || clsState.attempts >= 2;

  CLS_ROWS.forEach(function (row) {
    clsOptions(row).forEach(function (opt) {
      var id = opt.getAttribute('data-id');
      var isRowCorrect = clsState.selected[row] === CLS_CORRECT[row];
      if (isFinal) {
        opt.disabled = true;
        opt.classList.toggle('correct', id === CLS_CORRECT[row]);
        opt.classList.toggle('wrong', id === clsState.selected[row] && !isRowCorrect);
      } else if (isRowCorrect) {
        // Partial-correction flow, same precedent as tqCheck's field-level
        // lock: a row correct on a non-final attempt marks green and locks
        // immediately, so the learner can't accidentally overwrite an
        // already-right row while fixing the ones still marked wrong — per
        // explicit user feedback that a correct row stayed visually
        // "selected" (purple) instead of turning green, reading as unclear.
        opt.disabled = true;
        opt.classList.toggle('correct', id === CLS_CORRECT[row]);
      } else {
        opt.classList.toggle('wrong', id === clsState.selected[row] && !isRowCorrect);
      }
    });
  });

  /* xAPI: item 002 declares three questions, one per row, and the code knows each row's
     correctness — reported separately with the screen's SHARED isLast (guide §6.3, D-9). */
  CLS_ROWS.forEach(function (row, i) {
    xapiAnswered(xapiItemOf('s3435'), 'q' + (i + 1), clsState.selected[row] === CLS_CORRECT[row], isFinal,
      xapiAnswerText(document.querySelector('.cls-row[data-row="' + row + '"] .scq-opt[data-id="' + clsState.selected[row] + '"]')));
  });

  var checkBtn = document.getElementById('s3435-check');
  var hintBtn = document.getElementById('s3435-hint');
  var continueBtn = document.getElementById('s3435-continue');

  if (allCorrect) {
    clsState.done = true;
    clsState.lastOutcome = 'correct';
    clsShowFeedback('correct');
  } else if (!isFinal) {
    clsState.lastWrongSnapshot = clsSnapshot();
    if (checkBtn) checkBtn.disabled = true;
    clsShowFeedback('retry');
  } else {
    clsState.done = true;
    clsState.lastOutcome = 'wrong2';
    clsShowFeedback('wrong2');
  }

  if (clsState.done) {
    if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = true; }
    if (hintBtn) hintBtn.disabled = true;
    if (continueBtn) { continueBtn.disabled = false; continueBtn.hidden = false; }
    var actions = document.getElementById('s3435-actions');
    if (actions) actions.hidden = true;
    progressA.questions[1].state = clsState.lastOutcome === 'correct' ? 'correct' : 'incorrect';
    updateProgressQuestion(document.getElementById('s3435-progress'), progressA);
    // No post-feedback scroll hint here — the question is the scroller's
    // last page, so there's nothing below the feedback to scroll to.
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

// ============================================================
//  TWO-PART SCQ — s3839 (pptx slides 38-39), sub-parts א/ב. Each sub-part
//  is its own independent SingleChoiceQuestion (own attempts/hint/
//  feedback), reusing .scq-opt/.scq-radio verbatim. Sub-part ב has no
//  hint (explicit slide note). Feedback renders inline (see styles.css
//  .tq-feedback comment) so both sub-parts can stay visibly resolved at
//  once while the learner scrolls between them.
// ============================================================
const SUB_CONFIG = {
  // s3839 is this component's standard-practice block (after the s36
  // transition) — same hint policy as s37 (hintAfterAttempt), not s33/
  // s3435's basic-block "hint available from the start" default.
  a: { correctId: 'asif', maxAttempts: 2, hasHint: true, hintAfterAttempt: true },
  b: { correctId: 'rate', maxAttempts: 2, hasHint: false }
};

const subState = {
  a: { selected: null, attempts: 0, done: false, lastWrong: null },
  b: { selected: null, attempts: 0, done: false, lastWrong: null }
};

function subOptions(part) {
  return Array.prototype.slice.call(document.querySelectorAll('#tqs-' + part + ' .scq-opt'));
}

function subSelect(part, id) {
  var st = subState[part];
  if (st.done) return;
  dismissFeedback('tqs-' + part + '-feedback');
  subOptions(part).forEach(function (opt) {
    var isThis = opt.getAttribute('data-id') === id;
    opt.classList.toggle('selected', isThis);
    opt.classList.remove('wrong');
    opt.setAttribute('aria-checked', isThis ? 'true' : 'false');
  });
  st.selected = id;
  var checkBtn = document.getElementById('tqs-' + part + '-check');
  if (checkBtn) checkBtn.disabled = !st.selected || (st.selected === st.lastWrong);
}

// s3839 is ONE progress-question entry (question 2 of section B) even
// though it has two independent sub-parts — the dot reflects the combined
// outcome, resolved only once both sub-parts are done.
function subOverallDone() { return subState.a.done && subState.b.done; }
function subOverallCorrect() {
  return subState.a.selected === SUB_CONFIG.a.correctId && subState.b.selected === SUB_CONFIG.b.correctId;
}
function subSyncProgress() {
  progressB.questions[1].visited = true;
  if (!subOverallDone()) progressB.questions[1].state = 'current';
  else progressB.questions[1].state = subOverallCorrect() ? 'correct' : 'incorrect';
  updateProgressQuestion(document.getElementById('s3839-progress'), progressB);
  syncS3839Continue();
}

// s3839 is this component's own last screen — no screen 6 to goTo() within
// this component, so completing it (both sub-parts done) hands off to the
// sibling component folder via a real page navigation, same convention as
// 06-01's own goToComponent02().
/* ── The last click of this component (platform, guide §6.4 / §6.5 / §8.12) ──
   s3839's "המשך". Reports the component 'completed' and stops — the platform owns routing
   (a fail is routed by recommendedAfterFail -> 06-02), so the button is disabled and nothing
   navigates except in a DEV_NAV walkthrough.
   success = the pass mark s32 PROMISES for the basic block: "ענו נכון על שאלה אחת לפחות" — at
   least one of segment A's two questions (s33, s3435) correct; scaled = correct / all 7 declared
   questions (001 q1, 002 q1-q3, 003 q1, 004 q1-q2). The gate is not the score (guide §6.4). */
function segmentACorrect() {
  return progressA.questions.filter(function (q) { return q.state === 'correct'; }).length;
}

/* ── The segment-A gate (decision 2026-09-30; guide §6.4) ──
   s32 promises "ענו נכון על שאלה אחת לפחות כדי להתקדם" and s36 opens "יופי של עבודה!", so the gate
   is enforced here, in the one forward path out of segment A (s3435's "המשך"; the progress dots
   only lead back into segment A). Below the mark — both questions resolved, none correct — the
   component ENDS: the verdict, the component 'completed' with success:false, the button disabled,
   and nowhere to go: Kata routes on recommendedAfterFail (06-02). At or above it, on to s36 as
   before. Fails open: while either question is unresolved (e.g. a cleared document) it never
   blocks. The gate is not the score (scaled still counts every declared question). */
function segmentAGateBlocks() {
  var qs = progressA.questions;
  var resolved = qs.every(function (q) { return q.state === 'correct' || q.state === 'incorrect'; });
  return resolved && segmentACorrect() < 1;
}
function segmentAContinue() {
  if (!segmentAGateBlocks()) { goTo(3); return; }
  var btn = document.getElementById('s3435-continue');
  if (btn) btn.classList.remove('is-pulsing');
  try { setUnitResult('percent06_c03_result', 'fail'); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(false), btn); }
  catch (e) { console.error('[xAPI] end component', e); if (btn) btn.disabled = true; }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) goToComponent('prev');   // walkthrough only: recommendedAfterFail is 06-02
}
function goToComponent04() {
  var passed = segmentACorrect() >= 1;
  try { setUnitResult('percent06_c03_result', passed ? 'pass' : 'fail'); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(passed), lastScreenButton()); }
  catch (e) { console.error('[xAPI] end component', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) goToComponent('next');
}

/* Per-part seam (restoreEndedButton, 20-xapi.js): the button whose click ends this component. */
function lastScreenButton() { return document.getElementById('s3839-continue'); }

function syncS3839Continue() {
  var btn = document.getElementById('s3839-continue');
  if (!btn) return;
  if (subOverallDone()) {
    btn.textContent = 'متابعة';
    btn.disabled = false;
    btn.hidden = false;
    btn.onclick = goToComponent04;
  } else {
    btn.disabled = true;
    btn.hidden = true;
  }
}

// The hint/check rows sit in the bottom bar (outside the scroller), so only
// the row of the sub-part whose page is currently in view is shown — and
// only while that sub-part is still unresolved.
function syncS3839Actions() {
  var scroller = document.getElementById('s3839-scroll');
  var page = scroller && lpCurrentPage(scroller);
  ['a', 'b'].forEach(function (part) {
    var actions = document.getElementById('tqs-' + part + '-actions');
    if (actions) actions.hidden = subState[part].done || !page || page.id !== 'tqs-page-' + part;
  });
  if (scroller) scroller.classList.toggle('lp-scroll--locked', !subState.a.done);
}

function subShowFeedback(part, outcome) {
  var fb = document.getElementById('tqs-' + part + '-feedback');
  if (!fb) return;
  fb.setAttribute('data-outcome', outcome);
  fb.querySelectorAll('.tq-fb').forEach(function (f) {
    f.classList.toggle('active', f.getAttribute('data-fb') === outcome);
  });
  fb.hidden = false;
  // Rests 40px in from the left edge (the page's own side padding) rather
  // than the 16px drag margin — sits clear of the screen edge (QA).
  positionFeedbackCard(fb.querySelector('.tq-fb.active'), 40);
}

function subCheck(part) {
  var st = subState[part];
  var cfg = SUB_CONFIG[part];
  if (st.done || !st.selected) return;

  var isCorrect = st.selected === cfg.correctId;
  st.attempts++;

  if (isCorrect) {
    st.done = true;
    subOptions(part).forEach(function (opt) {
      opt.disabled = true;
      if (opt.getAttribute('data-id') === cfg.correctId) opt.classList.add('correct');
    });
    subShowFeedback(part, 'correct');
  } else if (st.attempts < cfg.maxAttempts) {
    st.lastWrong = st.selected;
    subOptions(part).forEach(function (opt) {
      opt.classList.toggle('wrong', opt.getAttribute('data-id') === st.selected);
    });
    var checkBtn = document.getElementById('tqs-' + part + '-check');
    if (checkBtn) checkBtn.disabled = true;
    // For a hintAfterAttempt sub-part (a), the first wrong attempt is what
    // unlocks the hint — a no-op for a sub-part with no hint at all (b).
    var hintBtnUnlock = document.getElementById('tqs-' + part + '-hint');
    if (hintBtnUnlock) hintBtnUnlock.disabled = false;
    subShowFeedback(part, 'retry');
  } else {
    st.done = true;
    subOptions(part).forEach(function (opt) {
      var id = opt.getAttribute('data-id');
      opt.disabled = true; // final-wrong reveal locks every option, same as the isCorrect branch above
      if (id === cfg.correctId) opt.classList.add('correct');
      else if (id === st.selected) opt.classList.add('wrong');
    });
    subShowFeedback(part, 'wrong2');
  }

  /* xAPI: each sub-part is its own declared question (א = q1, ב = q2); isLast = correct ||
     attempts exhausted (guide §6.3). */
  xapiAnswered(xapiItemOf('s3839'), part === 'a' ? 'q1' : 'q2', isCorrect, isCorrect || st.attempts >= cfg.maxAttempts,
    xapiAnswerText(document.querySelector('#tqs-' + part + ' .scq-opt[data-id="' + st.selected + '"]')));

  if (st.done) {
    var checkBtn2 = document.getElementById('tqs-' + part + '-check');
    var hintBtn = document.getElementById('tqs-' + part + '-hint');
    if (checkBtn2) { checkBtn2.textContent = 'هل نتابع؟'; checkBtn2.disabled = true; }
    if (hintBtn) hintBtn.disabled = true;
    // Same "hide, don't just disable" treatment as s3435-actions —
    // once resolved, this sub-part's own hint/check row is redundant
    // (the screen-level "המשך" continue button is the way forward once
    // BOTH sub-parts are done).
    syncS3839Actions();
    subSyncProgress();
    // Only sub-part א points onward (ב sits below it). ב is the last page —
    // no scroll hint after its feedback, per QA.
    if (part === 'a') scrollHintAfterFeedback('s3839-scroll');
  }
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

function subEnter() {
  // Same reasoning as clsEnter()'s own call: reveal page A on entry since
  // goTo() never fires a `scroll` event itself. Idempotent on later calls.
  lpCheckCurrentPageReveal('s3839-scroll');

  subSyncProgress();
  ['a', 'b'].forEach(function (part) {
    var st = subState[part];
    var checkBtn = document.getElementById('tqs-' + part + '-check');
    var hintBtn = document.getElementById('tqs-' + part + '-hint');

    if (st.done) {
      // done is only ever set true on a correct check or a final-wrong
      // check (see subCheck) — so the resolved outcome is fully
      // determined by whether the learner's locked-in selection matches.
      subShowFeedback(part, st.selected === SUB_CONFIG[part].correctId ? 'correct' : 'wrong2');
      if (checkBtn) { checkBtn.textContent = 'هل نتابع؟'; checkBtn.disabled = true; }
      if (hintBtn) hintBtn.disabled = true;
      return;
    }

    st.selected = null;
    st.attempts = 0;
    st.lastWrong = null;
    subOptions(part).forEach(function (opt) {
      opt.disabled = false;
      opt.classList.remove('selected', 'correct', 'wrong');
      opt.setAttribute('aria-checked', 'false');
    });
    dismissFeedback('tqs-' + part + '-feedback');
    if (checkBtn) { checkBtn.textContent = 'هل إجابتي صحيحة؟'; checkBtn.disabled = true; }
    // hasHint:false parts have no hint button to find; hintAfterAttempt
    // parts start locked (unlocked in subCheck()'s retry branch); any other
    // hint-bearing part defaults to available from the start (basic-block
    // policy, same as s33/s3435).
    if (hintBtn) hintBtn.disabled = !!SUB_CONFIG[part].hintAfterAttempt;
  });
  syncS3839Actions();
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var hintOverlay = document.getElementById('scq-hint-overlay');
  if (hintOverlay && !hintOverlay.hidden) scqCloseHint();
  var zoomModal = document.getElementById('img-zoom-modal');
  if (zoomModal && !zoomModal.classList.contains('hidden')) closeImgZoom();
});

// ============================================================
//  SCROLL SCREENS (s3435/s3839) — .lp-scroll/.lp-scroll-indicator, ported
//  from 06-01's Learning Phase section-aware paging (simplified: no locked
//  checkpoint tiers here — all content is already visible, just
//  scrollable). Each scroller's own direct children are its "pages" (one
//  full-screen composition per page: s3435 = [.tqs-top, .cls-section],
//  s3839 = [#tqs-page-a, #tqs-page-b] — one .tqs-page per pptx slide,
//  each holding its own text-col + media-col per that slide's own
//  composition). Every page is sized to exactly one scroll-viewport tall
//  via CSS (min-height:100% of .lp-scroll's own definite height — not a
//  fixed px guess, since this canvas is fluid-height, see .lp-section's
//  own comment in styles.css), so scrolling from one to the next reads as
//  moving between full-screen compositions, not a continuously-flowing
//  long page. Replaces the previous fixed-400px scrollBy() (which had no
//  concept of discrete sections at all) with the same overlap-based
//  "current section" bookkeeping + scrollIntoView() 06-01's
//  lpCurrentSection()/lpNextSection()/lpScrollToNext() use.
// ============================================================
function lpPages(scroller) {
  return Array.prototype.slice.call(scroller.children);
}

function lpCurrentPage(scroller) {
  var pages = lpPages(scroller);
  if (!pages.length) return null;
  var top = scroller.scrollTop, bottom = top + scroller.clientHeight;
  var best = pages[0], bestOverlap = -1;
  pages.forEach(function (sec) {
    var secTop = sec.offsetTop, secBottom = secTop + sec.offsetHeight;
    var overlap = Math.min(bottom, secBottom) - Math.max(top, secTop);
    if (overlap > bestOverlap) { bestOverlap = overlap; best = sec; }
  });
  return best;
}

function lpNextPage(scroller) {
  var pages = lpPages(scroller);
  var current = lpCurrentPage(scroller);
  var idx = current ? pages.indexOf(current) : -1;
  if (idx === -1 || idx >= pages.length - 1) return null;
  return pages[idx + 1];
}

// Fixed-duration eased scroll, replacing native scrollIntoView({behavior:
// 'smooth'}) — same fix/reasoning as 06-06's own lpAnimateScrollTo.
function lpAnimateScrollTo(scroller, targetTop, duration) {
  var startTop = scroller.scrollTop;
  var delta = targetTop - startTop;
  if (!delta) return;
  var startTime = null;
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function step(now) {
    if (startTime === null) startTime = now;
    var elapsed = now - startTime;
    var t = Math.min(1, elapsed / duration);
    scroller.scrollTop = startTop + delta * easeOutCubic(t);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function lpScrollToNext(scrollId) {
  var el = document.getElementById(scrollId);
  if (!el) return;
  var next = lpNextPage(el);
  if (!next) return;
  if (reducedMotionPref()) { next.scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
  lpAnimateScrollTo(el, next.offsetTop, 320);
}

function updateScrollIndicator(scrollId, indicatorId) {
  var el = document.getElementById(scrollId);
  var indicator = document.getElementById(indicatorId);
  if (!el || !indicator) return;
  indicator.hidden = !lpNextPage(el);
}

// ============================================================
//  PER-PAGE SCROLL REVEAL — each .lp-section/.tqs-page "page" inside
//  s3435-scroll/s3839-scroll gets its own staged reveal (runStagedSequence,
//  same engine as s32/s36's TransitionScreen), fired only once a page
//  actually becomes the "current" page per lpCurrentPage()'s own
//  max-overlap read of scrollTop/clientHeight (immune to scaleApp()'s CSS
//  transform on #app, unlike getBoundingClientRect). This is what makes
//  "current section reveal -> stable -> wait for learner scroll -> next
//  section reveal" real: a page below the fold is simply never looked up
//  as current, so its runStagedSequence() call never fires — no timer, no
//  content change — until the learner's own scroll brings it into view.
//  runStagedSequence's own `stagedSequences[key].played` flag then makes
//  every later scroll tick on the same page a no-op, so scroll jitter can
//  never replay or restart an in-flight sequence.
// ============================================================
// NOTE on the literal 260/220/320ms `dur` values below (replacing the
// STAGE_DURATION_TEXT/CARD/VISUAL globals, which stay 420/375/525 — those
// read var(--m-stage-duration-*) off document.documentElement, i.e. the
// unscoped :root value, so they can't see a descendant-scoped override):
// styles.css scopes --m-stage-duration-text/card/visual down to
// 260/220/320ms specifically inside #s3435/#s3839 (see that file). Using
// the STAGE_DURATION_* globals here would keep telling runStagedSequence
// to wait for a 420/375/525ms animation that, inside this scroll screen,
// actually now finishes in 260/220/320ms — a silent dead gap after each
// element had already finished animating in. These literals keep the JS
// stagger clock in sync with the real (scoped) CSS duration instead.
function s3435TopStagedSteps() {
  var text = document.querySelector('#s3435-page-top .lp-text-col');
  var img  = document.querySelector('#s3435-page-top .lp-img-col');
  return [
    { els: [text], dur: 260, wait: 110 },
    { els: [img],  dur: 320, wait: 600 },
    // The question page below reveals on its own once the intro settles,
    // instead of waiting for the learner's scroll to reach it (explicit
    // user feedback) — so it's already in place when they scroll down.
    { onShow: function () { lpRevealPage(document.getElementById('s3435-page-cls')); } }
  ];
}
function s3435ClsStagedSteps() {
  var qtext = document.querySelector('#s3435-page-cls .cls-qtext');
  var rows = Array.prototype.slice.call(document.querySelectorAll('#s3435-page-cls .cls-row'));
  var actions = document.getElementById('s3435-actions');
  return [
    // Question -> answer rows keeps the same deliberate 400ms settle pause
    // as the approved 06-02 pattern (q3StagedSteps) — the learner needs a
    // visible beat after the question before the answer options appear.
    // Only the base stagger/duration around it was shortened.
    { els: [qtext], dur: 260, wait: 400 },
    { els: rows, dur: 220, wait: 110 },
    { els: [actions], dur: 220 }
  ];
}
function tqsPageAStagedSteps() {
  // s3839-progress is no longer part of this list — it's now a fixed
  // sibling of .lp-scroll (like s3435-progress), revealed immediately by
  // the generic Motion.reveal() sweep via its own data-reveal="1", not by
  // this per-page staged sequence.
  var intro = [document.getElementById('tqs-a-intro')];
  var media = document.getElementById('tqs-page-a-media');
  var qtext = document.getElementById('tqs-a-qtext');
  var answers = document.getElementById('tqs-a-answers');
  var actions = document.getElementById('tqs-a-actions');
  return [
    { els: intro, dur: 260, wait: 110 },
    { els: [media], dur: 320, wait: 110 },
    // Question -> answer options keeps the same deliberate 400ms settle
    // pause as the approved 06-02 pattern (scqStagedSteps/q3StagedSteps).
    { els: [qtext], dur: 260, wait: 400 },
    { els: [answers], dur: 220, wait: 110 },
    { els: [actions], dur: 220 }
  ];
}
function tqsPageBStagedSteps() {
  var qtext = document.getElementById('tqs-b-qtext');
  var media = document.getElementById('tqs-page-b-media');
  var answers = document.getElementById('tqs-b-answers');
  var actions = document.getElementById('tqs-b-actions');
  return [
    { els: [qtext], dur: 260, wait: 110 },
    // Media -> answer options keeps the same deliberate 400ms settle pause
    // as the approved 06-02 pattern — same rule as tqsPageAStagedSteps.
    { els: [media], dur: 320, wait: 400 },
    { els: [answers], dur: 220, wait: 110 },
    { els: [actions], dur: 220 }
  ];
}

const LP_PAGE_STEPS = {
  's3435-page-top': s3435TopStagedSteps,
  's3435-page-cls': s3435ClsStagedSteps,
  'tqs-page-a': tqsPageAStagedSteps,
  'tqs-page-b': tqsPageBStagedSteps
};

function lpRevealPage(pageEl) {
  if (!pageEl) return;
  var builder = LP_PAGE_STEPS[pageEl.id];
  if (!builder) return;
  if (stagedSequences[pageEl.id]) return; // only ever fire the first time
  runStagedSequence(pageEl.id, builder);
}

function lpCheckCurrentPageReveal(scrollId) {
  var el = document.getElementById(scrollId);
  if (!el) return;
  lpRevealPage(lpCurrentPage(el));
}

['s3435-scroll', 's3839-scroll'].forEach(function (scrollId) {
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById(scrollId);
    var indicatorId = scrollId.replace('-scroll', '-scroll-indicator');
    if (!el) return;
    el.addEventListener('scroll', function () {
      updateScrollIndicator(scrollId, indicatorId);
      lpCheckCurrentPageReveal(scrollId);
      if (scrollId === 's3839-scroll') syncS3839Actions();
    });
    updateScrollIndicator(scrollId, indicatorId);
  });
});

// ============================================================
//  SCROLL GESTURE HINT — hand cursor beside the scrollbar, drifting down
//  (Figma "gesture hint" 3287:32535 → Cursor Drag 2808:22566). Ported from
//  methodica-math-percent-04's approved scroll-screen hint (.click-hint /
//  makeClickHint, ids ending -hint-scroll). Decorative only (aria-hidden,
//  pointer-events:none). Shown only after a question's final correct/
//  wrong feedback (never on entry or retry), when content remains below;
//  removed on the next scroll.
// ============================================================
var SCROLL_HINT_SPARKS = [
  [0, -80], [56.57, -56.57], [80, 0], [56.57, 56.57],
  [0, 80], [-56.57, 56.57], [-80, 0], [-56.57, -56.57]
];
var SCROLL_HINT_DELAY = 1200;
var SCROLL_HINT_ENTRY_DELAY = 2000; // lets the entry reveal settle first

// Screen entry only clears any leftover hint — per QA, the hint must NOT
// show on entry (or on a retry); it's triggered by scrollHintAfterFeedback()
// once a question reaches its final correct/wrong feedback.
// Exception: a scroller marked data-hint-on-entry (s3435 — its first page
// is intro text only and the whole question sits below the fold) gets the
// hint on entry too, otherwise nothing tells the learner to scroll down.
function scrollGestureEnter(screenEl) {
  document.querySelectorAll('.click-hint[id$="-hint-scroll"]').forEach(function (h) { h.remove(); });
  var scroller = screenEl && screenEl.querySelector('.lp-scroll[data-hint-on-entry]');
  if (scroller) scrollHintAfterFeedback(scroller.id, SCROLL_HINT_ENTRY_DELAY);
}

// Called from the final (correct / wrong2) feedback branches only. Shows the
// hand hint if there's still content below the current scroll position;
// removed on the next scroll.
function scrollHintAfterFeedback(scrollId, delay) {
  var scroller = document.getElementById(scrollId);
  var screenEl = scroller && scroller.closest('.screen');
  if (!screenEl) return;
  var hintId = scrollId + '-hint-scroll';
  setTimeout(function () {
    if (!screenEl.classList.contains('active') || document.getElementById(hintId)) return;
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8) return;
    screenEl.appendChild(makeClickHint(hintId));
    scroller.addEventListener('scroll', function () {
      var hint = document.getElementById(hintId);
      if (hint) hint.remove();
    }, { once: true, passive: true });
  }, delay || SCROLL_HINT_DELAY);
}

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
   the code that uses it. Ids verified against ../metadata/methodica-math-percent-06-03.json (2026-10-20).

   SCREEN_TO_SUBCONTENT: 0-based screen index (= data-screen = goTo(n)) -> [item suffix, page in
   item]. ⚠️ Exactly TOTAL_SCREENS keys (6), no gaps — a missing key is a screen that silently
   never reports (guide §6.2). Only [0] is read; [1] documents the paging. */
var SCREEN_TO_SUBCONTENT = {
   0: ['001', 1],   // s32
   1: ['001', 2],   // s33
   2: ['002', 1],   // s3435
   3: ['003', 1],   // s36
   4: ['003', 2],   // s37
   5: ['004', 1]    // s3839
};

var XAPI_COMP_SLUG = 'methodica-math-percent-06-03';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
/* Item ids carry this component's own slug — no XAPI_ITEM_SLUG needed. Until 2026-10-20 they
   carried the script's numbering (methodica-math-percent-06-02-NNN); MOE renumbered them in KATA. */
/* Items that carry a code-graded question — used as a set. */
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-06-03.json';

/* ═══════════════════ Resume (KATA State API) — this component's hooks ═══════════════════
   Read by ../unit-js/40-resume.js at CALL time (guide §8.7). Contract (40-resume.js "Snapshot
   helpers"): only FINISHED questions are saved; an unfinished one starts fresh on return, exactly
   as it already did when the learner navigated away and back. The enter functions
   (resetScreenState) already rebuild a finished screen's feedback / progress / button from these
   variables; restoreScreenUI adds what only the live check leaves in the DOM (the option marks,
   typed values) and the table values. Every painter paints from state and never resets (guide §8.8).
   applyResumeDom has nothing to do: no answer here lives only in the DOM. */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qr: resumeClone(XAPI_Q_RESULTS),
    tq: resumeDoneEntries(tqState),
    cls: clsState.done ? resumeClone(clsState) : null,
    sub: resumeDoneEntries(subState),
    progA: resumeProgress(progressA),
    progB: resumeProgress(progressB)
  };
}
function applyResumeVars(st) {
  resumeAssign(XAPI_Q_RESULTS, st.qr);
  resumeAssignMap(tqState, st.tq);
  if (st.cls) resumeAssign(clsState, st.cls);
  resumeAssignMap(subState, st.sub);
  resumeApplyProgress(progressA, st.progA);
  resumeApplyProgress(progressB, st.progB);
}
function applyResumeDom(st) {}
function restoreScreenUI(n) {
  var id = resumeScreenId(n);
  if (TQ_CONFIG[id] && tqState[id].done) {
    /* What tqCheck / tqToggleReveal leave: the learner's own values on a final wrong (unless the
       answer key is toggled in), the key otherwise; each field marked against the key; all locked. */
    var st = tqState[id];
    var own = st.lastOutcome === 'wrong2' && !st.revealed && st.ownValues;
    tqRows(id).forEach(function (row, i) {
      tqFields(id).forEach(function (f) {
        var input = tqInputEl(id, i, f), stateEl = tqStateEl(id, i, f);
        if (!input) return;
        input.value = own ? st.ownValues[i + '-' + f] : row[f];
        input.disabled = true;
        if (stateEl) { stateEl.classList.remove('is-correct', 'is-error'); stateEl.classList.add(input.value.trim() === row[f] ? 'is-correct' : 'is-error'); }
      });
    });
  }
  if (id === 's3435' && clsState.done) {
    CLS_ROWS.forEach(function (row) { resumePaintChoice(clsOptions(row), [clsState.selected[row]], [CLS_CORRECT[row]]); });
  }
  if (id === 's3839') {
    ['a', 'b'].forEach(function (part) {
      if (subState[part].done) resumePaintChoice(subOptions(part), [subState[part].selected], [SUB_CONFIG[part].correctId]);
    });
  }
}
