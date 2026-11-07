'use strict';

// Shared functions (12) live in ../unit-js/05-core.js, loaded right before this file:
//   scaleApp, cssMs, stageShowEl, reducedMotionPref, runStagedSequence, cancelStagedSequence,
//   goBack, updateBackButton, goToComponent, makeClickHint, devScreenList, notifyDevHost

// ============================================================
//  CONSTANTS & GLOBAL STATE
//  Opening HOOK sequence (screens 0-2) + Learning Phase scroll sequence,
//  pptx slides 6-12 (screen 3) + guided-practice worked-example segment,
//  pptx slides 13-24 (screens 4-15). Grows as later phases add screens —
//  per the plan, NOT scaffolded to 58 up front.
// ============================================================
const TOTAL_SCREENS = 18;
let currentScreen = 0;

// Learner-facing flow order — fully contiguous now that the deferred
// slide-17 prototype (formerly screen 3, excluded from this array) has
// been superseded by its proper re-implementation inside the guided-
// practice segment (screens 4-15). Screens 16-17 (s25/s26) add the
// Warm-up transition + circular-budget-diagram question, item -01-004.
const NAV_FLOW = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

window.lomdaState = {};

// ============================================================
//  SCALING — fit 1280×710 canvas into any viewport
//  Ported verbatim from methodica-math-percent-04-03 script.js:384-400
//  (RESPONSIVE-GUIDELINES.md R1/R2 — canvas scales, layout does not).
// ============================================================

window.addEventListener('resize', scaleApp);
scaleApp();

// ============================================================
//  QA-ONLY — testing navigation strip. NOT part of the delivered unit;
//  lets a reviewer jump directly to any screen while testing locally.
//  Only renders when the URL has ?qa=1 (never on in normal use) and lives
//  entirely outside #app so it's unaffected by the canvas scale. Remove
//  this whole block before final delivery/publish.
// ============================================================
(function initQaNavBar() {
  if (!/(?:^|[?&])qa=1(?:&|$)/.test(location.search)) return;
  var bar = document.createElement('div');
  bar.id = 'qa-nav-bar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
    'display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#000;' +
    'font:12px monospace;direction:ltr;';
  document.querySelectorAll('.screen').forEach(function (screen, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = i + ':' + screen.id;
    b.style.cssText = 'background:#333;color:#0f0;border:1px solid #0f0;' +
      'border-radius:3px;padding:2px 6px;cursor:pointer;';
    b.addEventListener('click', function () { goTo(i); });
    bar.appendChild(b);
  });
  document.body.appendChild(bar);
})();

// ============================================================
//  ENTRY REVEAL — shared helper for deferred Check/action buttons
//  ([data-reveal-on-ready] in index.html + styles.css). These buttons are
//  excluded from the normal screen/section [data-reveal] entrance groups by
//  approved motion-plan rule ("Check/Submit button... appears only after a
//  valid selection") — this just adds the CSS trigger class; the actual
//  readiness check stays wherever it already lived (hook1Toggle/lpSelect/
//  lpvUpdateCheckBtn), never duplicated here. One-way latch: callers never
//  remove the class themselves once added; only each screen/section's own
//  reset path (hook1Init/lpInit/lpvResetInitial) does, on a genuine restart.
// ============================================================
function revealOnReady(el) {
  if (el) el.classList.add('is-revealed');
}

// ============================================================
//  STAGED REVEAL ENGINE — real elapsed-time sequencing for screens/sections
//  whose entrance needs deliberate multi-second pauses between elements
//  (title -> wait 1s -> instruction -> wait 2s -> each option 1s apart...),
//  which the shared Motion engine's fixed --m-reveal-stagger (180ms) can't
//  express. Reuses the SAME [data-reveal-on-ready]/.is-revealed CSS
//  primitive as the deferred Check/Continue buttons above (identical
//  m-float-in animation, identical reduced-motion override) — this only
//  supplies sequencing/timing on top, not a new animation.
//
//  One sequence per screen/section, keyed by a stable string id (a screen's
//  own id, or a Learning Phase section's id). `buildSteps()` is called
//  fresh on every run so it always targets live DOM elements — never
//  cached across calls.
//
//  THE RULE (2026-08-15 rewrite): every step is
//    1. reveal the element(s);
//    2. wait for THIS step's own entrance animation to fully settle (`dur`);
//    3. wait the requested storytelling pause (`wait`), counted from AFTER
//       step 2, never from the reveal's start;
//    4. proceed to the next step.
//  Previously `wait` was measured from the current step's own START, so a
//  step's animation duration ate directly into the next step's pause (e.g.
//  a 1000ms `wait` with a 480ms entrance left only ~520ms of actual
//  storytelling pause after the element visually settled) — that's what
//  made every screen feel compressed regardless of how slow any single
//  animation was. `dur` now makes each step's own settle time explicit so
//  the pause is measured from the right moment.
//
//  2026-08-16 pass: every literal `wait` value below halved (1000→500,
//  2000→1000, 500→250) alongside the --m-stage-duration-* tokens in
//  styles.css (also halved) — the previous set played back roughly 2x
//  slower than intended once watched end-to-end. Same architecture, same
//  proportions between steps, just half the wall-clock time.
//
//  Step shape: { els: [Element,...], dur: ms, wait: ms, onShow: fn(instant) }
//    - els: revealed via the standard is-revealed mechanism (omit/[] for a
//      step that only runs a custom onShow, e.g. enabling a button, or a
//      pure trailing-wait placeholder before the sequence "completes").
//    - dur: how long THIS step's own entrance animation takes to settle —
//      match whatever --m-stage-duration-* (or the base --m-reveal-duration)
//      the revealed element's own CSS class actually uses, so this never
//      drifts from the real animation. Defaults to STAGE_DURATION_DEFAULT
//      (the base engine's --m-reveal-duration) for steps that don't specify
//      one, e.g. plain [data-reveal-on-ready] elements with no m-stage-*
//      class.
//    - wait: the storytelling pause AFTER `dur`, before the NEXT step
//      fires — 0 for "immediately once settled" (e.g. character -> bubble),
//      omitted to fall back to STAGE_GAP_DEFAULT, or a literal ms value
//      straight from the spec (1000/2000/...).
//    - onShow(instant): optional extra per-step action (enabling a
//      button, triggering an element with its own distinct animation like
//      .lp-alert). `instant` is true on the revisit/reduced-motion fast
//      path, so a custom callback can skip its own animation too.
//
//  Per-session semantics match the standard Motion engine contract: first
//  run plays the real timed sequence; a screen/section already played this
//  session (or prefers-reduced-motion) shows everything at once, with no
//  animation — never a replay. `played` is marked immediately when a run
//  starts (matching Motion.reveal()'s own seen-set timing), so navigating
//  away mid-sequence and back never replays it either.
// ============================================================
var stagedSequences = {};

var STAGE_GAP_DEFAULT = cssMs('--m-reveal-stagger', 180); // fallback storytelling pause when a step states none
// Short pause used where a step is only waiting for its OWN just-revealed
// element to finish settling before a dependent follow-up appears (e.g. lp
// section 1's battery alert, which should pop in right as the image finishes
// entering, not after a full storytelling pause) — same short-gap role as
// STAGE_GAP_DEFAULT, named separately so that intent reads at the call site.
var STAGE_GAP_FINISH = STAGE_GAP_DEFAULT;
var STAGE_DURATION_DEFAULT = cssMs('--m-reveal-duration', 600); // fallback own-entrance duration when a step states none
// Per-role own-entrance durations — mirror the --m-stage-duration-* tokens
// in styles.css (the Component-01 staged-reveal motion variant) exactly, so
// a step's `dur` always matches the REAL animation duration of whichever
// m-stage-* class the revealed element carries in index.html.
var STAGE_DURATION_TEXT = cssMs('--m-stage-duration-text', 850); // headings/body paragraphs
var STAGE_DURATION_CARD = cssMs('--m-stage-duration-card', 750); // answer options
var STAGE_DURATION_POPUP = cssMs('--m-stage-duration-popup', 820); // speech bubbles
var STAGE_DURATION_VISUAL = cssMs('--m-stage-duration-visual', 1000); // characters/illustrations

function stagedSequenceComplete(key) {
  // A section with no custom builder at all (e.g. lp-sec-6, still the plain
  // Motion-engine reveal) is never gated. A section WITH a builder
  // (LP_CUSTOM_SECTION_STEPS) that simply hasn't started yet must NOT count
  // as "complete" — checking only `stagedSequences[key]` existence used to
  // return true here too (no entry yet = falsy `seq`), which briefly showed
  // the scroll arrow/pulse for the split second between a section becoming
  // current and its own runStagedSequence() call actually registering an
  // entry. Gate on membership in LP_CUSTOM_SECTION_STEPS instead, defined
  // further down (safe: this is only ever called after the whole script has
  // executed once, never during its own top-to-bottom parse).
  if (typeof LP_CUSTOM_SECTION_STEPS !== 'undefined' && !LP_CUSTOM_SECTION_STEPS[key]) return true;
  var seq = stagedSequences[key];
  return !!(seq && seq.complete);
}

// ============================================================
//  NAVIGATION — same shape as 04-03's goTo/resetScreenState ladder
// ============================================================
// Screen index -> staged-sequence key(s) that must be cancelled when
// navigating away mid-sequence (no duplicate/orphaned timers left running
// on a screen the learner isn't looking at). Harmless no-op for keys that
// never started or already finished (cancelStagedSequence just clears an
// empty timer list).
var STAGED_KEYS_BY_SCREEN = {
  0: ['hook1'],
  1: ['whypercent'],
  2: ['hook2'],
  3: ['lp-sec-1', 'lp-sec-2', 'lp-sec-3', 'lp-sec-4', 'lp-sec-5', 'lp-sec-7'],
  4: ['s13']
};

function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  var screens = document.querySelectorAll('.screen');
  Motion.cancel(screens[currentScreen]); // safety: clears any mid-flight reveal timer before this screen hides
  (STAGED_KEYS_BY_SCREEN[currentScreen] || []).forEach(cancelStagedSequence);
  screens[currentScreen].classList.remove('active');
  currentScreen = n;
  screens[currentScreen].classList.add('active');
  Motion.reveal(screens[currentScreen]); // stages this screen's [data-reveal] groups, if any — no-op on screens without any, or already seen (hook1/whypercent/hook2/s13 now use runStagedSequence() instead, called from resetScreenState() below)
  updateBackButton();
  // Popups/hint overlays are closed on every navigation — per
  // _global-components.md Feedback popup system. The `hidden` attribute is
  // what actually controls visibility (see the `[id$="-popup"][hidden]`
  // rules in styles.css); classList.add('hidden') alone matched no CSS rule
  // and was a no-op — set both so a popup never survives a screen change.
  document.querySelectorAll('[id$="-popup"], [id$="-hint-overlay"]').forEach(function (el) {
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
var UNIT_PREV_COMPONENT = null;
var UNIT_NEXT_COMPONENT = '../methodica-math-percent-06-02/index.html';
var unitShellHosted = false;

window.addEventListener('message', function (e) {
  if (e.source === window.parent && e.data && e.data.type === 'UNIT_SHELL') unitShellHosted = true;
});

function resetScreenState(n) {
  if (n === 0) hook1Init();
  else if (n === 1) whypercentInit();
  else if (n === 2) hook2Init();
  else if (n === 3) lpInit();
  else if (n === 4) s13Init();
  else if (n === 6) s15Init();
  else if (n === 8) s17Init();
  else if (n === 10) s19Init();
  else if (n === 12) s21Init();
  else if (n === 14) s23Init();
  else if (n === 17) warmupInit();
}

// ============================================================
//  SCREEN 0 — pptx slide 3 (item -01-001), opening HOOK sequence
//  Local variant of MultipleChoiceQuestion (720-templates/
//  MultipleChoiceQuestion.md): multi-select reflection question, no
//  grading/attempts/hint/reveal — the script defines no correct answer.
//  "בחרתי" gates on selected.size >= 1, reveals a neutral message-type
//  feedback popup, then relabels to "המשך".
// ============================================================
var hook1Selected = new Set();
var hook1Done = false;

// Staged entrance: title (1s) -> instruction (2s) -> each option 1s apart ->
// character -> bubble (once the character finishes entering). Built fresh
// per run so it always reads the live DOM (buildSteps() contract).
function hook1StagedSteps() {
  var title = document.getElementById('hook1-title');
  var instruction = document.getElementById('hook1-instruction');
  var optA = document.getElementById('hook1-opt-a');
  var optB = document.getElementById('hook1-opt-b');
  var optC = document.getElementById('hook1-opt-c');
  var optD = document.getElementById('hook1-opt-d');
  var char = document.getElementById('hook1-char-img');
  var bubble = document.getElementById('hook1-bubble');
  return [
    { els: [title], dur: STAGE_DURATION_TEXT, wait: 500 },
    { els: [instruction], dur: STAGE_DURATION_TEXT, wait: 1000 },
    { els: [optA], dur: STAGE_DURATION_CARD, wait: 500 },
    { els: [optB], dur: STAGE_DURATION_CARD, wait: 500 },
    { els: [optC], dur: STAGE_DURATION_CARD, wait: 500 },
    { els: [optD], dur: STAGE_DURATION_CARD, wait: 0 }, // character starts right after all four answers have fully settled
    { els: [char], dur: STAGE_DURATION_VISUAL, wait: 0 }, // bubble starts right after the character has fully settled
    { els: [bubble], dur: STAGE_DURATION_POPUP }
  ];
}

function hook1Init() {
  // Resume-state guard: a resolved screen reopens its feedback and keeps
  // the locked selection, rather than resetting — per _global-components.md
  // "Reopening feedback on return to a resolved screen." goTo() already hid
  // the popup as part of its own cleanup, so it must be explicitly re-shown
  // here. No position to reset — the panel lays out in-flow under the
  // character, it isn't the draggable absolutely-positioned popup pattern.
  if (hook1Done) {
    var existingPopup = document.getElementById('hook1-popup');
    if (existingPopup) {
      existingPopup.hidden = false;
      existingPopup.classList.remove('hidden');
    }
    // Re-lock the entrance state instantly (seq.played is already true, so
    // this takes runStagedSequence's "instant" branch — same stageShowEl(el,
    // true) hard-lock every other revisit path relies on). Without this, a
    // screen the learner already finished still gets its CSS animations
    // reset to their hidden from-state by the browser whenever the .screen's
    // display flips none→block on nav-away/nav-back (the same display-
    // toggle mechanism this project's popups deliberately use to REPLAY —
    // here it's an unwanted side effect), so returning to a completed hook1
    // briefly (visibly) blanks everything before it re-plays the whole
    // reveal — not the instant "already seen" state every other screen gets.
    runStagedSequence('hook1', hook1StagedSteps);
    return;
  }

  hook1Selected = new Set();
  hook1Done = false;

  document.querySelectorAll('#hook1 .hook1-opt').forEach(function (btn) {
    btn.disabled = false;
    btn.setAttribute('aria-checked', 'false');
    btn.classList.remove('is-selected');
  });

  var popup = document.getElementById('hook1-popup');
  if (popup) {
    popup.hidden = true;
    popup.classList.add('hidden');
  }

  var btn = document.getElementById('hook1-action-btn');
  if (btn) {
    btn.textContent = 'اخترتُ';
    btn.disabled = true;
    btn.classList.remove('is-revealed'); // re-hide on a genuine restart — matches the disabled reset above
    btn.classList.remove('is-pulsing'); // pulse only starts once feedback appears — see hook1MainAction()
  }

  runStagedSequence('hook1', hook1StagedSteps);
}

function hook1Toggle(id) {
  if (hook1Done) return;
  var opt = document.querySelector('#hook1 .hook1-opt[data-id="' + id + '"]');
  if (!opt) return;

  if (hook1Selected.has(id)) {
    hook1Selected.delete(id);
    opt.setAttribute('aria-checked', 'false');
    opt.classList.remove('is-selected');
  } else {
    hook1Selected.add(id);
    opt.setAttribute('aria-checked', 'true');
    opt.classList.add('is-selected');
  }

  var actionBtn = document.getElementById('hook1-action-btn');
  if (actionBtn) {
    actionBtn.disabled = hook1Selected.size === 0;
    // Deferred reveal — button is excluded from the screen's entrance
    // sequence; it appears the first time a selection exists (approved
    // motion-plan rule), reusing this same readiness check.
    if (hook1Selected.size > 0) revealOnReady(actionBtn);
  }
}

function hook1MainAction() {
  var btn = document.getElementById('hook1-action-btn');
  if (!btn) return;

  if (hook1Done) {
    goTo(1);
    return;
  }

  hook1Done = true;
  document.querySelectorAll('#hook1 .hook1-opt').forEach(function (b) {
    b.disabled = true;
  });

  var popup = document.getElementById('hook1-popup');
  if (popup) {
    popup.hidden = false;
    popup.classList.remove('hidden');
  }

  btn.textContent = 'متابعة';
  // Pulse starts the moment the feedback appears (not merely once the
  // button became clickable, which happens earlier at first selection) —
  // see .hook1-action-btn.is-pulsing in styles.css.
  btn.classList.add('is-pulsing');
  // Drop the lingering mouse-click focus ring (.btn-continue:focus-visible)
  // now that the click has been handled — keyboard users still get the
  // ring back the moment they Tab to the button again.
  btn.blur();
}

// ============================================================
//  SCREEN 1 — pptx slide 4, "למה דווקא אחוזים?"
//  FlipCardsReveal "Before interaction" text layout (Figma node 405:8027)
//  — card row/video toggle intentionally omitted, script supplies no
//  content for them. Staged entrance (title -> body1 -> body2 -> body3 ->
//  body4), Continue gated until the sequence finishes, then pulses — see
//  #whypercent-continue-btn:not(:disabled) in styles.css.
// ============================================================
function whypercentStagedSteps() {
  var title = document.getElementById('whypercent-title');
  var body1 = document.getElementById('whypercent-body-1');
  var body2 = document.getElementById('whypercent-body-2');
  var body3 = document.getElementById('whypercent-body-3');
  var body4 = document.getElementById('whypercent-body-4');
  return [
    { els: [title], dur: STAGE_DURATION_TEXT, wait: 500 },
    { els: [body1], dur: STAGE_DURATION_TEXT, wait: 1000 },
    { els: [body2], dur: STAGE_DURATION_TEXT, wait: 500 },
    { els: [body3], dur: STAGE_DURATION_TEXT, wait: 1000 },
    { els: [body4], dur: STAGE_DURATION_TEXT, wait: 1000 }, // Continue only enables after this pause, once body4 has fully settled
    { els: [], onShow: function () {
        var btn = document.getElementById('whypercent-continue-btn');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function whypercentInit() {
  runStagedSequence('whypercent', whypercentStagedSteps);
}

// ============================================================
//  SCREEN 2 — pptx slide 5, HOOK_002
//  Content Templates → character + speech-bubble variant. Staged entrance
//  (text -> character -> bubble once the character finishes entering),
//  Continue gated until the bubble appears, then pulses.
// ============================================================
function hook2StagedSteps() {
  var text = document.getElementById('hook2-text');
  var char = document.getElementById('hook2-character');
  var bubble = document.getElementById('hook2-bubble');
  return [
    { els: [text], dur: STAGE_DURATION_TEXT, wait: 1000 },
    { els: [char], dur: STAGE_DURATION_VISUAL, wait: 0 }, // bubble starts right after the character has fully settled
    { els: [bubble], dur: STAGE_DURATION_POPUP, wait: 0 }, // Continue enables right after the bubble has fully settled
    { els: [], onShow: function () {
        var btn = document.getElementById('hook2-continue-btn');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function hook2Init() {
  runStagedSequence('hook2', hook2StagedSteps);
}

// ============================================================
//  GUIDED-PRACTICE SEGMENT — pptx slides 13-24, screens 4-15.
//  One worked example (three friends' free-throw comparison) solved
//  step by step. Persistent chrome — the three-friend context card
//  (.guided-card, reused verbatim across screens 5-8/10/12/14) and the
//  goal statement — stays visually present across the segment; the
//  friend whose calculation is currently active is emphasized via
//  .is-focus. Chrome ported from 04-03's guided-layout/.guided-card/
//  .guided-panel family, retextured to current Math tokens (this
//  project's own established precedent, first built for the earlier
//  deferred slide-17 prototype and now properly wired into the flow).
// ============================================================

// ---- Screen 4 (s13) — TransitionScreen, pptx slide 13 ----
// Staged entrance (headline (1s) -> subline (1s) -> character), Continue
// gated until the character appears, then pulses. This is the last screen
// this session's motion/QA pass touches — screens 5+ (guided practice) are
// untouched.
function s13StagedSteps() {
  var headline = document.getElementById('s13-headline');
  var subline = document.getElementById('s13-subline');
  var char = document.getElementById('s13-character-img');
  return [
    { els: [headline], wait: 500 },
    { els: [subline], wait: 500 },
    { els: [char], onShow: function () {
        if (char && char.play) char.play().catch(function () {}); // autoplay can be blocked while hidden pre-reveal
        var btn = document.getElementById('s13-continue');
        if (btn) btn.disabled = false; // pulse follows automatically via :not(:disabled)
      } }
  ];
}

function s13Init() {
  runStagedSequence('s13', s13StagedSteps);
}

// ---- Screen 5 (s14) — introduce the problem, pptx slide 14 ----
// No other JS state — content-only screen, normal nav. Its Continue button
// is wired to the morph transition below instead of a plain goTo(6).

// ---- Screen 5→6 (s14→s15) morph transition ----
// s14's solo three-friend card visually shrinks and shifts right into its
// s15 slot while the question panel reveals beside it, instead of the two
// screens hard-cutting into each other. s14 and s15 are separate .screen
// sections (each carries its own full copy of the card markup, the
// standard 720 per-screen shape) — this doesn't merge them into one
// screen, it FLIPs the transform on entry: capture the card's on-screen
// rect on s14, swap screens as normal, then animate the NEW card FROM that
// captured rect back to its natural layout. Only one copy of the card is
// ever visible at a time (goTo() hides s14 in the same synchronous tick
// the pre-transformed s15 card is set up), so the learner perceives one
// object moving, never a duplicate/jump.
function s14ToS15Morph() {
  var srcCard = document.querySelector('#s14 .guided-card');
  var firstRect = srcCard ? srcCard.getBoundingClientRect() : null;

  goTo(6);
  if (!firstRect || reducedMotionPref()) return; // instant — no morph, no panel fade

  var dstCard = document.querySelector('#s15 .guided-card');
  var panel = document.querySelector('#s15 .guided-panel');
  if (!dstCard) return;

  // #app itself carries scaleApp()'s own `transform: scale(...)` — every
  // pixel value below is applied to an element INSIDE #app, so a raw
  // viewport-pixel value would be re-scaled a second time by that same
  // ancestor transform. Divide every screen-space measurement by the live
  // scale factor so the element lands exactly on the captured rect.
  var appScale = new DOMMatrix(getComputedStyle(document.getElementById('app')).transform).a || 1;
  var firstWidthLocal = firstRect.width / appScale;

  // 2026-08-16 rewrite — width-preserving FLIP, not a transform scale.
  // .guided-card's own visible content (the 150px-fixed friend photos/cards,
  // centered via justify-content) is a SHORTER, fixed-pixel block than
  // either the 720px (s14, solo) or 560px (s15, paired) card width — the
  // width difference between the two screens is pure side-padding/
  // whitespace, not a real resize of any photo or line of text. A transform
  // `scale(sx, sy)` FLIP (the previous implementation) scales that whole
  // subtree non-uniformly (sx≈0.78, sy=1, since the two screens' card
  // HEIGHT is identical and only width differs) — visibly squashing the
  // photos horizontally for the animation's whole duration, which is
  // exactly the "stretch" this rewrite removes. Fix: temporarily force the
  // card to its OLD width (a real, un-scaled `width` value) right after the
  // screen swap, measure ITS natural position at that width, then animate
  // BOTH `width` (old → natural new) and `transform: translate()` (pure
  // translation, no scale at all — content is never distorted) together.
  // The fixed-size content simply re-centers as the box narrows, precisely
  // matching what the final layout actually looks like — no fake resize.
  dstCard.style.transition = 'none';
  dstCard.style.width = firstWidthLocal + 'px';
  void dstCard.offsetHeight; // commit the temporary width before measuring
  var tempRect = dstCard.getBoundingClientRect();

  var dx = ((firstRect.left + firstRect.width / 2) - (tempRect.left + tempRect.width / 2)) / appScale;
  var dy = ((firstRect.top + firstRect.height / 2) - (tempRect.top + tempRect.height / 2)) / appScale;
  dstCard.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';

  // Question panel — genuinely new content on s15, no s14 equivalent to FLIP
  // from — gets its own gentle reveal instead: starts hidden, then floats in
  // slightly after the card starts settling (per the approved "may overlap
  // slightly if it feels natural" motion note), same float-in shape/easing
  // as the rest of the project's staged reveals.
  if (panel) {
    panel.style.transition = 'none';
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(16px)';
  }

  void dstCard.offsetHeight; // force reflow so the browser commits the FLIP start state before animating
  requestAnimationFrame(function () {
    dstCard.style.transition = 'width 620ms cubic-bezier(0.4,0,0.2,1), transform 620ms cubic-bezier(0.4,0,0.2,1)';
    dstCard.style.width = ''; // back to its natural CSS width (560px) — animates alongside the translate
    dstCard.style.transform = 'none';
    if (panel) {
      panel.style.transition = 'opacity 500ms cubic-bezier(0.4,0,0.2,1) 180ms, transform 500ms cubic-bezier(0.4,0,0.2,1) 180ms';
      panel.style.opacity = '1';
      panel.style.transform = 'none';
    }
  });

  setTimeout(function () {
    dstCard.style.transition = '';
    dstCard.style.transform = '';
    dstCard.style.width = '';
    if (panel) { panel.style.transition = ''; panel.style.opacity = ''; panel.style.transform = ''; }
  }, 700);
}

// ---- Screen 6 (s15) — "מה כדאי לעשות" local SCQ variant ----
// Per the production note ("אין משוב לשאלה, רק התשובה הנכונה מסומנת" —
// no feedback for the question, only the correct answer is marked):
// selecting ANY option immediately reveals/marks the correct one (never
// marks a wrong pick red), shows no feedback panel/popup, then enables
// Continue. Distinct from the graded SingleChoiceQuestion template and
// from section 3's lp-checkpoint (which does mark a wrong pick red and
// shows a message popup) — this is a simpler, no-feedback local variant.
var S15_CORRECT_ID = 'a'; // "להפוך את כל הנתונים לאחוזים"
var s15Done = false;
var s15Choice = null;   // the learner's pick — kept for the resume painter

/* A finished pick stays finished on return (Phase 3c): it is a reported answer (item 003 q1), and
   re-opening it would let the learner answer — and report — it again. The answered look is
   repainted by restoreScreenUI (resume hooks, end of file) on every navigation. */
function s15Init() {
  if (s15Done) return;
  document.querySelectorAll('#s15 .guided-opt').forEach(function (btn) {
    btn.disabled = false;
    btn.setAttribute('aria-checked', 'false');
    btn.classList.remove('is-selected', 'is-correct');
  });
  var cont = document.getElementById('s15-continue');
  if (cont) { cont.disabled = true; cont.classList.remove('is-revealed'); }
}

function s15Select(id) {
  if (s15Done) return;
  s15Done = true;
  s15Choice = id;
  document.querySelectorAll('#s15 .guided-opt').forEach(function (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-checked', btn.dataset.id === id ? 'true' : 'false');
    btn.classList.toggle('is-selected', btn.dataset.id === id);
    if (btn.dataset.id === S15_CORRECT_ID) btn.classList.add('is-correct');
  });
  var cont = document.getElementById('s15-continue');
  if (cont) { cont.disabled = false; revealOnReady(cont); }
  /* xAPI: nothing to report here. Item 003 ("נפתור יחד") is UNGRADED in the catalogue — MOE
     removed its questions in KATA (found 2026-10-20), so it sends no 'answered'; the item still
     opens and closes on its screens (SCREEN_TO_SUBCONTENT). Same as methodica-math-percent-01's
     guided practice (8661fe2). */
  try { flushResumeSave(); } catch (e) {}
}

// ---- Screen 7 (s16) — explain why + animated data emphasis ----
// No JS state — the highlight boxes over each friend's fraction data
// reveal via the standard data-reveal staged-entrance system (Motion.
// reveal(), wired through goTo()), same as every other first-visit
// screen reveal; no bespoke JS needed.

// ---- Screens 8/10/12 (s17/s19/s21) — guided value-input steps ----
// Shared "gvi" (guided value input) helper family — SINGLE-SUBMISSION,
// no retry/attempts. Per slide 17/19's own production notes, the flow is
// literally "type a value → press צדקתי → feedback appears once → button
// becomes המשך" — no attempt-count or retry language anywhere, unlike the
// standard 2-attempt ValueInputQuestion template. Matches this project's
// own established no-retry checkpoint precedent (lpv — Learning Phase
// section 6, "אין ניסיונות מענה").
//
// CRITICAL, per slide 17's production note: feedback replaces the
// question INSIDE the existing purple panel, in place —
// "הטקסט בבועית הסגולה יתחלף לא כחלונית נוספת" (the text in the purple
// bubble will be replaced, not as an additional window). A full state
// replacement: the whole #<prefix>-panel-body (instruction + equation, see
// gviSubmit()) is swapped for the worked-solution feedback, so nothing of
// the old question is left visible alongside it. Deliberately NOT the
// shared feedback-popup system (_global-components.md) — these three
// screens' own production notes explicitly rule out a modal/popup.
var GVI = {
  s17: {
    feedbackHTML:
      '<p class="gvi-feedback-title">سنعمل في خطوتين:</p>' +
      '<div class="gvi-feedback-row">' +
        '<span class="gvi-feedback-label">نختزل الكسر</span>' +
        '<div class="gvi-fraction"><span class="num">21</span><span class="den">30</span></div>' +
        '<span class="gvi-feedback-label">بالقسمة على 3، فنحصل على</span>' +
        '<div class="gvi-fraction"><span class="num">7</span><span class="den">10</span></div>' +
      '</div>' +
      '<div class="gvi-feedback-row">' +
        '<span class="gvi-feedback-label">نوسّع بمقدار 10 للوصول إلى المقام 100:</span>' +
        '<div class="gvi-feedback-eq">' +
          '<div class="gvi-fraction"><span class="num">7</span><span class="den">10</span></div>' +
          '<span class="gvi-eq-sign">=</span>' +
          '<div class="gvi-fraction"><span class="num">70</span><span class="den">100</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="gvi-equation gvi-equation--final">' +
        '<div class="gvi-fraction"><span class="num">7</span><span class="den">10</span></div>' +
        '<span class="gvi-eq-sign">=</span>' +
        '<div class="gvi-fraction"><span class="num">70</span><span class="den">100</span></div>' +
        '<span class="gvi-eq-sign">=</span>' +
        '<span class="gvi-percent">70%</span>' +
      '</div>',
    correct: ['7', '70'],
    nextScreen: 9
  },
  s19: {
    feedbackHTML:
      '<p class="gvi-feedback-label gvi-feedback-label--lg">ضربنا المقام في 10،<br>لذلك سيُضرب البسط في 10 أيضاً.</p>' +
      '<div class="gvi-equation gvi-equation--final">' +
        '<div class="gvi-fraction"><span class="num">8</span><span class="den">10</span></div>' +
        '<span class="gvi-eq-sign">=</span>' +
        '<div class="gvi-fraction"><span class="num">80</span><span class="den">100</span></div>' +
        '<span class="gvi-eq-sign">=</span>' +
        '<span class="gvi-percent">80%</span>' +
      '</div>',
    correct: ['80'],
    nextScreen: 11
  },
  s21: {
    feedbackHTML:
      '<p class="gvi-feedback-label gvi-feedback-label--lg">وسّعنا المقام بالعدد 25،<br>لذلك يجب أيضاً أن يُضرب البسط في 25.</p>' +
      '<div class="gvi-equation gvi-equation--final">' +
        '<div class="gvi-fraction"><span class="num">3</span><span class="den">4</span></div>' +
        '<span class="gvi-eq-sign">=</span>' +
        '<div class="gvi-fraction"><span class="num">75</span><span class="den">100</span></div>' +
        '<span class="gvi-eq-sign">=</span>' +
        '<span class="gvi-percent">75%</span>' +
      '</div>',
    correct: ['75'],
    nextScreen: 13
  }
};

// Per-screen step: 0 = answering, 1 = the learner's own value(s) kept in the
// boxes and marked green (correct) or red (wrong) — no correct value is
// filled in here, since step 2's worked solution already shows it —
// 2 = worked-solution explanation shown. Continue advances one step.
var gviStep = { s17: 0, s19: 0, s21: 0 };
/* The learner's submitted value(s) per screen — kept for the resume painter. */
var GVI_ANSWERS = { s17: null, s19: null, s21: null };

/* A submitted guided answer (step >= 1) stays submitted on return (Phase 3c): it is a one-time
   answer (item 003, unreported since 2026-10-20). restoreScreenUI repaints it — the learner's
   values marked, or the worked solution once step 2 was reached. */
function gviInit(prefix) {
  if (gviStep[prefix] >= 1) return;
  gviStep[prefix] = 0;

  // Restore the panel's original question markup (instruction + equation)
  // on a genuine restart — dataset.original is captured lazily (first
  // submit), so a screen never yet submitted has nothing to restore (its
  // live HTML is already correct).
  var body = document.getElementById(prefix + '-panel-body');
  if (body && body.dataset.original) body.innerHTML = body.dataset.original;

  // Screens vary in how many blanks they have (s17 has two — 7/10's and
  // /100's numerators — while s19/s21 have one), so reset every
  // .gvi-answer-box found rather than a single fixed id.
  var inputs = body ? body.querySelectorAll('.gvi-answer-box') : [];
  Array.prototype.forEach.call(inputs, function (input) {
    input.value = '';
    input.disabled = false;
    input.classList.remove('is-correct', 'is-wrong');
  });

  var btn = document.getElementById(prefix + '-action-btn');
  if (btn) { btn.textContent = 'أجبتُ بشكل صحيح'; btn.disabled = true; }
}

function gviInput(prefix) {
  if (gviStep[prefix] !== 0) return;
  var body = document.getElementById(prefix + '-panel-body');
  var btn = document.getElementById(prefix + '-action-btn');
  if (!body || !btn) return;
  var inputs = body.querySelectorAll('.gvi-answer-box');
  btn.disabled = !Array.prototype.every.call(inputs, function (input) {
    return input.value.trim() !== '';
  });
}

function gviSubmit(prefix) {
  var btn = document.getElementById(prefix + '-action-btn');
  if (!btn) return;
  var cfg = GVI[prefix];
  var body = document.getElementById(prefix + '-panel-body');

  if (gviStep[prefix] === 2) {
    goTo(cfg.nextScreen);
    return;
  }

  if (gviStep[prefix] === 0) {
    // Step 1: lock the boxes and mark each of the learner's own values
    // green (correct) or red (wrong) — the value itself is left as typed.
    gviStep[prefix] = 1;
    if (body && !body.dataset.original) body.dataset.original = body.innerHTML;
    var inputs = body ? body.querySelectorAll('.gvi-answer-box') : [];
    var gviAllOk = true, gviValues = [];
    Array.prototype.forEach.call(inputs, function (input, i) {
      var ok = input.value.trim() === cfg.correct[i];
      if (!ok) gviAllOk = false;
      gviValues.push(input.value.trim());
      input.disabled = true;
      input.classList.add(ok ? 'is-correct' : 'is-wrong');
    });
    btn.textContent = 'متابعة';
    btn.disabled = false;
    /* xAPI: nothing to report here — s17 / s19 / s21 belong to item 003, ungraded in the
       catalogue since MOE removed its questions in KATA (see s15). */
    GVI_ANSWERS[prefix] = gviValues.slice();
    try { flushResumeSave(); } catch (e) {}   // before the return — guide §8.3
    return;
  }

  // Step 2: full state replacement per production note — the entire
  // question area disappears, replaced in place by the worked-solution
  // feedback — never a popup, never left partially visible alongside it.
  gviStep[prefix] = 2;
  if (body) body.innerHTML = cfg.feedbackHTML;
}

function s17Init() { gviInit('s17'); }
function s19Init() { gviInit('s19'); }
function s21Init() { gviInit('s21'); }

// ---- Screens 9/11/13 (s18/s20/s22) — percentage reveal screens ----
// No JS state — the newly-revealed percentage badge animates in via the
// standard data-reveal staged-entrance system, same as every other
// first-visit screen reveal.

// ---- Screen 14 (s23) — final comparison, local SCQ variant ----
// Same no-feedback behavior as screen 6 (s15) — see its own comment above.
var S23_CORRECT_ID = 'gal';
var s23Done = false;
var s23Choice = null;   // the learner's pick — kept for the resume painter

/* Same as s15Init: a finished pick stays finished on return (Phase 3c). */
function s23Init() {
  if (s23Done) return;
  document.querySelectorAll('#s23 .guided-opt').forEach(function (btn) {
    btn.disabled = false;
    btn.setAttribute('aria-checked', 'false');
    btn.classList.remove('is-selected', 'is-correct');
  });
  var cont = document.getElementById('s23-continue');
  if (cont) { cont.disabled = true; cont.classList.remove('is-revealed'); }
}

function s23Select(id) {
  if (s23Done) return;
  s23Done = true;
  s23Choice = id;
  document.querySelectorAll('#s23 .guided-opt').forEach(function (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-checked', btn.dataset.id === id ? 'true' : 'false');
    btn.classList.toggle('is-selected', btn.dataset.id === id);
    if (btn.dataset.id === S23_CORRECT_ID) btn.classList.add('is-correct');
  });
  var cont = document.getElementById('s23-continue');
  if (cont) { cont.disabled = false; revealOnReady(cont); }
  /* xAPI: nothing to report here — item 003, see s15. */
  try { flushResumeSave(); } catch (e) {}
}

// ---- Screen 15 (s24) — guided-practice summary, pptx slide 24 ----
// No JS state — content-only screen, closes the segment. Continue now
// goes to 16 (s25, Warm-up transition) — no longer a dead end.

// ---- Screen 16 (s25) — Warm-up TransitionScreen, pptx slide 25 ----
// No JS state — content-only screen, normal nav (goTo(17)).

// ============================================================
//  SCREEN 17 (s26) — Warm-up question, pptx slide 26. Circular-budget
//  diagram, 5 fillable percentages, genuinely graded (the script gives 5
//  real correct values — "התשובות הנכונות מסומנות בשקף בשחור").
//
//  Session correction: rebuilt from single-submission/no-hint to the
//  unit's standard maxAttempts:2 + hint-enabled contract
//  (_question-template-defaults.md), per direct producer review — see
//  index.html's own header comment on #s26 for the full rationale. Retry
//  policy (producer's explicit choice): only cells still wrong after
//  attempt 1 reopen for attempt 2 — already-correct cells stay locked.
//  The final wrong attempt keeps the learner's own typed value visible
//  (marked error, locked) instead of overwriting it with the correct
//  value, so no View My Answer Toggle is needed — the worked-solution
//  popup body (shown on every outcome) already states every category's
//  correct answer.
// ============================================================
var WARMUP_CORRECT = {
  bottles: '40',  // מתקני מיחזור בקבוקים — 2/5
  garden:  '25',  // גינה קהילתית — 1/4
  rain:    '20',  // מערכת איסוף מי גשמים — 1/5
  compost: '10',  // קומפוסטר בית-ספרי — 1/10
  posters: '5'    // הסברה ופוסטרים — 1/20
};

// Worked-solution content — final copy supplied by the producer (feedback
// reference), shown identically on both the correct and incorrect outcome
// (only the popup's own title/color differs by outcome, per that
// reference). Order matches the reference exactly, not the chart's own
// clockwise layout order — not re-sorted. Fractions reuse the existing
// .gvi-fraction/.gvi-equation--final stacked-fraction markup verbatim
// (same component the s17/s19/s21 guided-practice feedback already uses),
// per the explicit instruction to reuse it rather than render "num/den".
var WARMUP_SOLUTIONS = [
  { name: 'الحديقة المجتمعية',         num: 1, den: 4,  pct: 25 },
  { name: 'مرافق إعادة تدوير الزجاجات',   num: 2, den: 5,  pct: 40 },
  { name: 'حاوية التسميد المدرسية',      num: 1, den: 10, pct: 10 },
  { name: 'نظام جمع مياه الأمطار',   num: 1, den: 5,  pct: 20 },
  { name: 'التوعية والملصقات',         num: 1, den: 20, pct: 5 }
];

function warmupFractionHTML(num, den) {
  return '<div class="gvi-fraction"><span class="num">' + num + '</span><span class="den">' + den + '</span></div>';
}

function warmupSolutionsHTML() {
  return WARMUP_SOLUTIONS.map(function (s) {
    return (
      '<div class="warmup-solution">' +
        '<div class="warmup-solution-heading">' +
          '<span class="warmup-solution-name">' + s.name + ':</span>' +
          warmupFractionHTML(s.num, s.den) +
        '</div>' +
        '<div class="warmup-solution-conversion">' +
          '<span class="warmup-solution-label">نَنتقل إلى النسب المئوية:</span>' +
          '<div class="gvi-feedback-eq">' +
            warmupFractionHTML(s.num, s.den) +
            '<span class="gvi-eq-sign">=</span>' +
            warmupFractionHTML(s.pct, 100) +
            '<span class="gvi-eq-sign">=</span>' +
            '<span class="gvi-percent">' + s.pct + '%</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

var WARMUP_MAX_ATTEMPTS = 2;
var warmupAttempts = 0;
var warmupDone = false;
// Snapshot ({key: submittedValue}) of only the still-open (wrong) cells
// from the immediately-preceding non-final attempt — the retry-gate
// comparison base (_question-template-defaults.md "Retry gate"). null
// before the first attempt.
var warmupLastWrong = null;

// Hint copy supplied directly by the producer in-session (previously
// CONTENT_FLAGS.md #23 — omitted for lack of hint text). Bold spans match
// the producer's own asterisk-marked emphasis.
var WARMUP_HINT_HTML =
  '<p>لتحويل كسر إلى نسبة مئوية، فكّروا في <strong>العدد الذي يمثّله من أصل 100</strong>. ' +
  'يمكن توسيع الكسر إلى كسر مكافئ مقامه 100.<br>' +
  '<strong>البسط الناتج يمثّل النسبة المئوية.</strong></p>';

function warmupInputs() {
  return Array.prototype.slice.call(document.querySelectorAll('#s26 .warmup-input'));
}

// Only the cells still open for input — all 5 on a fresh attempt, or just
// the ones marked wrong on the previous (non-final) attempt.
function warmupOpenInputs() {
  return warmupInputs().filter(function (el) { return !el.disabled; });
}

function warmupOpenSnapshot() {
  var snap = {};
  warmupOpenInputs().forEach(function (el) { snap[el.dataset.key] = el.value; });
  return JSON.stringify(snap);
}

// Sets #warmup-popup's default open position as plain pixel left/top —
// same contract as clampPopupToCanvas()/the drag handler use, so the
// popup's rendered box and the drag math always agree on what "left"
// means (never left:50%+transform:translateX(-50%), which would fight the
// shared drag handler — see clampPopupToCanvas()).
//
// Global popup-placement rule: every question-feedback popup opens
// bottom-left of its usable content area (same physical corner regardless
// of outcome, so retry/correct/wrong2 never jump to a different spot — only
// the card's own height, and therefore its top edge, changes with content).
// Anchored to .warmup-layout's own box (top:96/right:80/left:24/bottom:100
// in styles.css — the region the text/chart columns occupy) rather than the
// raw canvas edge, matching this screen's split-layout content area; still
// clamped through the shared canvas-bounds helper so it can't bleed
// off-canvas or under the bottom bar.
function warmupPositionPopup() {
  var popup = document.getElementById('warmup-popup');
  if (!popup) return;
  var canvas = getCanvasSize();
  var x = 24;
  var y = (canvas.h - 100) - popup.offsetHeight;
  var pos = clampPopupToCanvas(x, y, popup);
  popup.style.left = pos.x + 'px';
  popup.style.top = pos.y + 'px';
}

function warmupOpenPopup() {
  var popup = document.getElementById('warmup-popup');
  var body = document.getElementById('warmup-popup-body');
  if (!popup) return;
  popup.hidden = false; // must un-hide before measuring width/height — see warmupPositionPopup()
  popup.classList.remove('hidden');
  if (body) body.scrollTop = 0; // reset scroll on every open, including a reopen
  warmupPositionPopup();
  warmupScrollHint();
}

// Scroll gesture hint on the long worked-solution body — same hand hint as
// the scroll screens (scrollGestureEnter / makeClickHint), the way
// methodica-math-percent-04's popupScrollHint puts it on an overflowing
// feedback panel. Lives inside the popup (not the scrolling body, which
// would clip it) so it follows the popup when dragged; the scroll listener
// is attached only after the delay, so the scrollTop reset above can't
// dismiss it before it's seen.
function warmupScrollHint() {
  var popup = document.getElementById('warmup-popup');
  var body = document.getElementById('warmup-popup-body');
  var old = document.getElementById('warmup-popup-hint-scroll');
  if (old) old.remove();
  if (!popup || !body) return;
  setTimeout(function () {
    if (popup.hidden || document.getElementById('warmup-popup-hint-scroll')) return;
    if (body.scrollHeight <= body.clientHeight + 8) return;
    var hint = makeClickHint('warmup-popup-hint-scroll');
    hint.classList.add('click-hint--in-popup');
    hint.style.top = (body.offsetTop + 24 - 150) + 'px'; // click point 24px below the body's top
    popup.appendChild(hint);
    body.addEventListener('scroll', function () { hint.remove(); }, { once: true, passive: true });
  }, 400);
}

function warmupInit() {
  var popup = document.getElementById('warmup-popup');
  var btn = document.getElementById('s26-continue');
  var hintBtn = document.getElementById('s26-hint');

  if (warmupDone) {
    // Resume-state guard — reopen feedback + keep the locked/marked
    // inputs rather than resetting, per _global-components.md "Reopening
    // feedback on return to a resolved screen".
    warmupOpenPopup();
    if (hintBtn) hintBtn.disabled = true;
    return;
  }

  warmupAttempts = 0;
  warmupLastWrong = null;
  warmupInputs().forEach(function (el) {
    el.value = '';
    el.disabled = false;
    el.classList.remove('is-correct', 'is-error');
  });
  if (popup) { popup.hidden = true; popup.classList.add('hidden'); }
  if (btn) { btn.textContent = 'هل إجابتي صحيحة؟'; btn.disabled = true; }
  // Warm-up is not basic practice — hint stays locked until the first
  // submitted attempt (unlocked in warmupSubmit()'s retry branch), per
  // the unit-wide hint-availability standard.
  if (hintBtn) hintBtn.disabled = true;
}

// Bound to every .warmup-input's 'input' event: re-evaluates the check
// button AND dismisses a still-open retry popup as a side effect of the
// learner starting to correct their answer — per _global-components.md
// "First-attempt retry feedback dismissal." Guarded by warmupDone so
// correct/final feedback (which stays open until navigation) is unaffected.
function warmupOnInput() {
  if (!warmupDone) {
    var popup = document.getElementById('warmup-popup');
    if (popup && !popup.hidden) { popup.hidden = true; popup.classList.add('hidden'); }
  }
  warmupCheckReady();
}

function warmupCheckReady() {
  var btn = document.getElementById('s26-continue');
  if (!btn || warmupDone) return;
  var open = warmupOpenInputs();
  var allFilled = open.every(function (el) { return el.value.length > 0; });
  // Retry gate (_question-template-defaults.md): after a non-final wrong
  // attempt, stays disabled until the open cells' values genuinely differ
  // from what was just marked wrong — re-submitting the identical set must
  // not re-enable the button.
  var changed = warmupLastWrong === null || warmupOpenSnapshot() !== warmupLastWrong;
  btn.disabled = !allFilled || !changed;
}

// Component 01's own last screen — no screen 18 to goTo() within this
// component, so completing the unit hands off to the sibling component
// folder via a real page navigation (same relative-sibling-folder
// convention viewer.html's PARTS array already uses for this pair).
/* ── The last click of this component (platform, guide §6.5 / §8.12) ──
   s26's "המשך" once the warm-up is resolved (warmupSubmit routes the click here). Reports the
   component 'completed' and stops — the platform owns routing, so the button is disabled and
   nothing navigates except in a DEV_NAV walkthrough. This is the instruction component: no pass
   mark is promised, so success is true; scaled = correct / the declared questions of its graded
   items (002 q1-q2, 004 q1). */
function goToComponent02() {
  try { setUnitResult('percent06_c01_result', 'pass'); } catch (e) { console.error('[resume] result', e); }
  try { xapiEndComponent(xapiComponentResult(true), lastScreenButton()); }
  catch (e) { console.error('[xAPI] end component', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) goToComponent('next');
}

/* Per-part seam (restoreEndedButton, 20-xapi.js): the button whose click ends this component. */
function lastScreenButton() { return document.getElementById('s26-continue'); }

function warmupShowFeedback(outcome) {
  var popup = document.getElementById('warmup-popup');
  var title = document.getElementById('warmup-popup-title');
  var body = document.getElementById('warmup-popup-body');
  if (!popup || !title || !body) return;
  popup.classList.toggle('feedback-error', outcome !== 'correct');
  popup.classList.toggle('is-retry', outcome === 'retry');
  if (outcome === 'correct') {
    title.textContent = 'أحسنت!';
    body.innerHTML = warmupSolutionsHTML();
  } else if (outcome === 'retry') {
    // Short retry nudge, no worked-solution body — reuses the project's
    // own existing multi-part retry title (methodica-math-percent-06-02's
    // s30, "טעיתם לפחות בתשובה אחת") verbatim, since this screen is the
    // same "several independent answers graded together" shape.
    title.innerHTML = 'أخطأتم في إجابة واحدة على الأقل،<br><span class="fb-regular">هل نحاول مرة أخرى؟</span>';
    body.innerHTML = '';
  } else {
    // Final wrong (2nd attempt) — same two-line title + full worked
    // solution as the original single-attempt build's incorrect outcome.
    title.innerHTML = 'كِدتم تصلون إلى الإجابة الصحيحة...<br>لنرَ طريقة الحل';
    body.innerHTML = warmupSolutionsHTML();
  }
  warmupOpenPopup();
}

function warmupSubmit() {
  if (warmupDone) { goToComponent02(); return; } // already graded — button now advances to Component 02

  warmupAttempts++;
  var isFinalAttempt = warmupAttempts >= WARMUP_MAX_ATTEMPTS;
  var open = warmupOpenInputs();
  var allCorrect = true;
  var wrongSnapshot = {};

  open.forEach(function (el) {
    var key = el.dataset.key;
    var isCorrect = el.value === WARMUP_CORRECT[key];
    if (isCorrect) {
      el.classList.remove('is-error');
      el.classList.add('is-correct');
      el.disabled = true;
    } else {
      allCorrect = false;
      wrongSnapshot[key] = el.value;
      el.classList.add('is-error');
      // Final attempt: lock but keep the learner's own typed value visible
      // (no destructive overwrite) — the worked-solution popup body states
      // the correct value for every category regardless.
      if (isFinalAttempt) el.disabled = true;
    }
  });

  var btn = document.getElementById('s26-continue');
  var hintBtn = document.getElementById('s26-hint');

  /* xAPI: the diagram is ONE declared question (five values, graded together): one 'answered'
     per submission, isLast = correct || attempts exhausted (guide §6.3). The answer lists every
     category's value, locked-correct ones included. */
  xapiAnswered(xapiItemOf('s26'), 'q1', allCorrect, allCorrect || isFinalAttempt,
    warmupInputs().map(function (el) { return el.dataset.key + '=' + (el.value || '—'); }).join(' | '));

  if (allCorrect) {
    warmupDone = true;
    warmupShowFeedback('correct');
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
    if (hintBtn) hintBtn.disabled = true;
    try { flushResumeSave(); } catch (e) {}   // before the return — guide §8.3
    return;
  }

  if (!isFinalAttempt) {
    warmupLastWrong = JSON.stringify(wrongSnapshot);
    warmupShowFeedback('retry');
    if (btn) btn.disabled = true; // retry gate — re-enabled by warmupCheckReady() once the wrong cells change
    // First submitted attempt unlocks the hint (non-basic practice) — stays
    // enabled/reusable for the rest of the question, only re-locked once
    // the question fully resolves (see the allCorrect/final-wrong branches).
    if (hintBtn) hintBtn.disabled = false;
    try { flushResumeSave(); } catch (e) {}   // before the return — guide §8.3
    return;
  }

  // Final wrong — reaching this solution state IS the unit's completion,
  // Component 02 now exists, so unlock rather than dead-end (see
  // goToComponent02()).
  warmupDone = true;
  warmupShowFeedback('wrong2');
  if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
  if (hintBtn) hintBtn.disabled = true;
  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)
}

// ---- Hint modal — single-use overlay for this screen's own question ----
function warmupOpenHint() {
  var overlay = document.getElementById('warmup-hint-overlay');
  var body = document.getElementById('warmup-hint-body');
  if (!overlay || !body) return;
  /* xAPI: requested.1 — after the guards, immediately before the hint is shown (opens only). */
  xapiRequestedHint(xapiItemOf('s26'), 'q1');
  body.innerHTML = WARMUP_HINT_HTML;
  overlay.hidden = false;
  overlay.classList.remove('hidden');
}

function warmupCloseHint() {
  var overlay = document.getElementById('warmup-hint-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.add('hidden');
}

// ============================================================
//  SCREEN 4 — Learning Phase scroll sequence (pptx slides 6-11, item
//  -01-002). One scrolling screen; internal progression via #lp-scroll,
//  not per-section navigation. Section 3 (slide 8) is a local
//  SingleChoiceQuestion variant: single submission, no retry — pressing
//  "צדקתי?" locks the board, reveals correct+chosen together, shows one
//  shared explanation, then unlocks sections 4-6 (#lp-locked) by removing
//  their `hidden` attribute — no forced scroll, the learner continues from
//  wherever they are. Per approved plan correction #1: no 2-attempt logic.
//  Section 6 (slide 11) is a second, independent checkpoint — see its own
//  header comment further down.
// ============================================================
var LP_CORRECT_ID = 'd'; // "אי אפשר לדעת"
var lpSelected = null;
var lpDone = false;

// ============================================================
//  LEARNING PHASE — per-section staged-reveal step builders. Each mirrors
//  the approved motion plan's explicit wait times for that section. Built
//  fresh on every call (buildSteps() contract) and dispatched from
//  lpSectionObserver further down — the IntersectionObserver fires
//  runStagedSequence(sectionId, builder) the moment that section scrolls
//  into view, same trigger point the generic Motion.reveal(section) call
//  used before. Section 6 (the value-input checkpoint) is NOT listed here —
//  its own reveal/logic is untouched, still driven by the generic
//  Motion.reveal() group system.
// ============================================================
function lpSec1StagedSteps() {
  var title = document.getElementById('lp1-title');
  var body1 = document.getElementById('lp1-body-1');
  var body2 = document.getElementById('lp1-body-2');
  var img = document.getElementById('lp1-img');
  var alert = document.getElementById('lp-alert');
  return [
    // Whole screen rises together as a single beat — staggering only
    // happens screen-to-screen (as the learner scrolls), never within one.
    { els: [title, body1, body2, img],
      onShow: function (instant) {
        if (!alert) return;
        alert.classList.add('is-revealed');
        if (instant) { alert.style.animation = 'none'; alert.style.opacity = '1'; alert.style.transform = 'none'; }
      } }
  ];
}

function lpSec2StagedSteps() {
  var p1 = document.getElementById('lp2-p1');
  var p2 = document.getElementById('lp2-p2');
  var p3 = document.getElementById('lp2-p3');
  var p4 = document.getElementById('lp2-p4');
  var img = document.getElementById('lp2-img');
  return [
    // Whole screen rises together as a single beat — staggering only
    // happens screen-to-screen (as the learner scrolls), never within one.
    { els: [p1, p2, p3, p4, img] }
  ];
}

// Section 3 — this is the one narrative section that's actually an SCQ
// answer-card question (like 06-06's s59/03's tqs pages), so it's in scope
// for the reveal-speed audit the same way those are; sections 1/2/4/5/7 are
// a narrative whose whole screen now rises as a single beat (see their own
// builders) and were left with their own explicit per-option pacing here,
// since a checkpoint's answer options are a different reveal shape than a
// narrative paragraph screen. `dur:300` matches #lp-sec-3's own scoped --m-reveal-duration
// override in styles.css (kept off the rest of #learningphase, which keeps
// the approved 600ms) — see 06-06's mcqStagedSteps for why `dur` needs to
// be passed explicitly rather than left to the (unscoped) global default.
function lpSec3StagedSteps() {
  var q = document.getElementById('lp3-q');
  var optA = document.getElementById('lp3-opt-a');
  var optB = document.getElementById('lp3-opt-b');
  var optC = document.getElementById('lp3-opt-c');
  var optD = document.getElementById('lp3-opt-d');
  return [
    { els: [q], dur: 300, wait: 220 },
    { els: [optA], dur: 300, wait: 130 },
    { els: [optB], dur: 300, wait: 130 },
    { els: [optC], dur: 300, wait: 130 },
    { els: [optD], dur: 300 }
  ];
}

function lpSec4StagedSteps() {
  var p1 = document.getElementById('lp4-p1');
  var p2 = document.getElementById('lp4-p2');
  var p3 = document.getElementById('lp4-p3');
  var p4 = document.getElementById('lp4-p4');
  var img = document.getElementById('lp4-img');
  return [
    // Whole screen rises together as a single beat — staggering only
    // happens screen-to-screen (as the learner scrolls), never within one.
    { els: [p1, p2, p3, p4, img] }
  ];
}

function lpSec5StagedSteps() {
  var p1 = document.getElementById('lp5-p1');
  var p2 = document.getElementById('lp5-p2');
  var p3 = document.getElementById('lp5-p3');
  var img = document.getElementById('lp5-img');
  return [
    // Whole screen rises together as a single beat — staggering only
    // happens screen-to-screen (as the learner scrolls), never within one.
    { els: [p1, p2, p3, img] }
  ];
}

// Section 7 — the closing explanation + the two-stage percentage popup
// reveal (image first, then +0.5s the second callout). Supersedes the old
// scroll-position-triggered lpMaybeRevealCallouts()/lp7InView() mechanism
// (removed) — the callouts are now part of this one deterministic sequence.
function lpSec7StagedSteps() {
  var p1 = document.getElementById('lp7-p1');
  var p2 = document.getElementById('lp7-p2');
  var p3 = document.getElementById('lp7-p3');
  var p4 = document.getElementById('lp7-p4');
  var p5 = document.getElementById('lp7-p5');
  var p6 = document.getElementById('lp7-p6');
  var p7 = document.getElementById('lp7-p7');
  var img = document.getElementById('lp7-img');
  var callout50 = document.getElementById('lp-callout-50');
  var callout20 = document.getElementById('lp-callout-20');
  function showCallout(el, instant) {
    if (!el) return;
    el.classList.add('is-shown');
    if (instant) { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; }
  }
  return [
    // Whole screen rises together as a single beat — staggering only
    // happens screen-to-screen (as the learner scrolls), never within one.
    { els: [p1, p2, p3, p4, p5, p6, p7, img],
      onShow: function (instant) {
        showCallout(callout50, instant);
        showCallout(callout20, instant);
      } }
  ];
}

function lpInit() {
  var scroller = document.getElementById('lp-scroll');
  if (scroller) scroller.scrollTop = 0; // every entry starts at the top, like every other screen's default view
  updateLpScrollIndicator();
  syncLpPopupToScroll();
  syncLpvPopupToScroll();
  // Explicitly reveal whatever is now the current section (section 1, right
  // after the scrollTop reset above) — the 'scroll' listener that normally
  // drives this (see ENTRY REVEAL further down) only fires on an actual
  // scroll event, which a fresh entry into this screen never generates on
  // its own.
  lpCheckCurrentSectionReveal();

  // Resume-state guard, checkpoint 1 (section 3) — independent of checkpoint
  // 2 (section 6) below, each gated on its own Done flag. If lpDone, this
  // branch is skipped entirely: keep the locked board and the already-
  // unlocked sections, don't reset selection/lock state. The feedback popup
  // is deliberately NOT force-shown here: its visibility is owned by
  // syncLpPopupToScroll() above ("Feedback popup scroll-scoping" further
  // down), which reopens it only once the checkpoint section is actually
  // scrolled into view. Re-entering always resets scroll to the top (above),
  // so a resolved question's feedback no longer bleeds onto section 1 until
  // the learner scrolls back down to it.
  if (!lpDone) {
    lpSelected = null;

    document.querySelectorAll('#lp-sec-3 .lp-q-opt').forEach(function (btn) {
      btn.disabled = false;
      btn.setAttribute('aria-checked', 'false');
      btn.classList.remove('is-selected', 'is-correct', 'is-wrong');
    });

    var check = document.getElementById('lp-check-btn');
    if (check) { check.disabled = true; check.classList.remove('is-revealed'); }

    var popup = document.getElementById('lp-popup');
    if (popup) {
      popup.hidden = true;
      popup.classList.add('hidden');
    }

    var locked = document.getElementById('lp-locked');
    if (locked) locked.hidden = true;
  }

  // Resume-state guard, checkpoint 2 (section 6) — same shape, own flag.
  if (!lpvDone) {
    lpvResetInitial();
  }
}

function lpSelect(id) {
  if (lpDone) return;

  document.querySelectorAll('#lp-sec-3 .lp-q-opt').forEach(function (btn) {
    var isThis = btn.dataset.id === id;
    btn.setAttribute('aria-checked', isThis ? 'true' : 'false');
    btn.classList.toggle('is-selected', isThis);
  });

  lpSelected = id;
  var check = document.getElementById('lp-check-btn');
  if (check) { check.disabled = false; revealOnReady(check); }
}

function lpCheck() {
  if (lpDone || !lpSelected) return;
  lpDone = true;

  document.querySelectorAll('#lp-sec-3 .lp-q-opt').forEach(function (btn) {
    btn.disabled = true;
    btn.classList.remove('is-selected');
    if (btn.dataset.id === LP_CORRECT_ID) btn.classList.add('is-correct');
    else if (btn.dataset.id === lpSelected) btn.classList.add('is-wrong');
  });

  // Single-submission checkpoint — once answered, the check button has no
  // further purpose (no retry, no relabel to a continue action), so it's
  // removed from view entirely rather than left disabled/grayed-out.
  var check = document.getElementById('lp-check-btn');
  if (check) check.hidden = true;

  lpShowPopup();
  syncLpPopupToScroll(); // the learner is looking at the checkpoint right now, so this keeps it shown

  // Unlock — no auto-scroll (approved plan correction #4): the learner
  // continues scrolling from their current position once they choose to.
  var locked = document.getElementById('lp-locked');
  if (locked) locked.hidden = false;
  updateLpScrollIndicator(); // unlocking just grew scrollHeight — re-check
  // Defensive reveal — the section-activation IntersectionObserver (see
  // lpSectionObserver further down) is already watching every .lp-section,
  // including the ones just unhidden, and normally reactively recomputes
  // once `hidden` is removed. This is a backstop for the edge case where a
  // section is unlocked while already sitting in (or overlapping) the
  // viewport — some browsers don't reliably re-fire an intersection
  // observer purely off a display:none->block change with no accompanying
  // scroll, so this covers it explicitly rather than leaving it to chance.
  lpDefensiveReveal(document.getElementById('lp-sec-4'));
  lpDefensiveReveal(document.getElementById('lp-sec-5'));
  /* xAPI: item 002 q1 — single submission (no retry), so answered.last. */
  xapiAnswered(xapiItemOf('learningphase'), 'q1', lpSelected === LP_CORRECT_ID, true,
    xapiAnswerText(document.querySelector('#lp-sec-3 .lp-q-opt[data-id="' + lpSelected + '"]')));
  try { flushResumeSave(); } catch (e) {}
}

// Explicitly runs a section's staged reveal right now if it's already
// scrolled into (or overlapping) the viewport — a backstop for
// IntersectionObserver edge cases (see callers). Safe to call even if the
// observer also fires separately: runStagedSequence()'s own `played` flag
// makes a second call for the same key a no-op.
function lpDefensiveReveal(sectionEl) {
  if (!sectionEl) return;
  var scroller = document.getElementById('lp-scroll');
  if (!scroller) return;
  var top = scroller.scrollTop, bottom = top + scroller.clientHeight;
  var secTop = sectionEl.offsetTop, secBottom = secTop + sectionEl.offsetHeight;
  if (secBottom > top && secTop < bottom) lpRevealSection(sectionEl);
}

// ============================================================
//  SCROLL AFFORDANCE — replaces the native scrollbar on #lp-scroll (see
//  styles.css .lp-scroll for the hidden-native-scrollbar rules) with a
//  purple chevron that both hints at and jumps to the next section (manual
//  scrolling keeps working independently — this is an additional way to
//  advance, not a replacement). Reusable across every .lp-section: one
//  indicator + these three helpers cover the whole scroll sequence rather
//  than a per-section copy. Re-checked after every scroll and after
//  unlocking sections 4-5 grows the scroll height.
// ============================================================
function lpVisibleSections() {
  // Excludes sections still inside #lp-locked[hidden] — same DOM, just not
  // yet revealed, so they don't count as "next" until the checkpoint unlocks them.
  return Array.prototype.filter.call(
    document.querySelectorAll('#lp-scroll .lp-section'),
    function (el) { return !el.closest('[hidden]'); }
  );
}

// The section the learner is currently looking at — whichever visible
// section has the most overlap with the viewport, using scrollTop/offsetTop
// (not getBoundingClientRect) so it's unaffected by #app's scaleApp()
// transform. Deliberately NOT "the last section whose top has been
// scrolled to": that approach broke exactly at the scroll-max clamp (when
// total section height isn't an exact multiple of the viewport height, the
// last section's offsetTop can sit just beyond the highest scrollTop the
// browser will ever allow) AND, worse, changed its answer the instant
// unlocking sections 4-5 grew scrollHeight — even though scrollTop hadn't
// moved and the learner was still looking at the same section. Max-overlap
// only compares each section's own fixed offsetTop/height against the
// viewport, so it never depends on how much content exists further below.
function lpCurrentSection() {
  var scroller = document.getElementById('lp-scroll');
  var sections = lpVisibleSections();
  if (!scroller || !sections.length) return null;
  var top = scroller.scrollTop, bottom = top + scroller.clientHeight;
  var best = sections[0], bestOverlap = -1;
  sections.forEach(function (sec) {
    var secTop = sec.offsetTop, secBottom = secTop + sec.offsetHeight;
    var overlap = Math.min(bottom, secBottom) - Math.max(top, secTop);
    if (overlap > bestOverlap) { bestOverlap = overlap; best = sec; }
  });
  return best;
}

function lpNextSection() {
  var sections = lpVisibleSections();
  var current = lpCurrentSection();
  var idx = current ? sections.indexOf(current) : -1;
  if (idx === -1 || idx >= sections.length - 1) return null;
  return sections[idx + 1];
}

// ============================================================
//  SCROLL GESTURE HINT — hand cursor beside the scrollbar, drifting down
//  (Figma "gesture hint" 3287:32535 → Cursor Drag 2808:22566). Ported from
//  methodica-math-percent-04's approved scroll-screen hint (.click-hint /
//  makeClickHint, ids ending -hint-scroll). Decorative only (aria-hidden,
//  pointer-events:none). Shown after the learner has stayed on a section
//  for a few seconds without scrolling (see lpMaybeShowSectionHint below);
//  removed on every scroll.
// ============================================================
var SCROLL_HINT_SPARKS = [
  [0, -80], [56.57, -56.57], [80, 0], [56.57, 56.57],
  [0, 80], [-56.57, 56.57], [-80, 0], [-56.57, -56.57]
];

// Idle-based: whenever the learner has stayed put for LP_HINT_IDLE ms
// (no scrolling) on a section whose own staged reveal has finished and
// there is still a visible section below it, the hand hint appears. Any
// scroll removes it and restarts the idle countdown, so it comes back on
// every section (and again on the same section) after each pause.
// Replaces the old purple "next section" chevron (removed per QA).
var LP_HINT_IDLE = 2500;
var lpHintTimer = null;

function lpRemoveScrollHint(scroller) {
  clearTimeout(lpHintTimer);
  var hint = document.getElementById(scroller.id + '-hint-scroll');
  if (hint) hint.remove();
}

function lpShowSectionHint() {
  var scroller = document.getElementById('lp-scroll');
  var screenEl = scroller && scroller.closest('.screen');
  if (!screenEl || !screenEl.classList.contains('active')) return;
  var hintId = scroller.id + '-hint-scroll';
  if (document.getElementById(hintId)) return;
  var current = lpCurrentSection();
  if (!current || !lpNextSection() || !stagedSequenceComplete(current.id)) return;
  if (scroller.scrollHeight <= scroller.clientHeight + 8) return;
  var hint = makeClickHint(hintId);
  // Put the hand on the scrollbar thumb wherever it currently sits (the
  // hint's click point is 150px into its 300px frame), keeping its 90px
  // downward drift inside the track.
  var track = scroller.clientHeight;
  var thumbH = track * track / scroller.scrollHeight;
  var thumbMid = scroller.scrollTop / scroller.scrollHeight * track + thumbH / 2;
  var top = Math.min(thumbMid - 150, track - 150 - 90 - 20);
  hint.style.top = Math.max(60, scroller.offsetTop + top) + 'px';
  screenEl.appendChild(hint);
}

// (Re)starts the idle countdown — called on screen entry, after every
// scroll, and whenever a section's reveal finishes or a checkpoint unlocks.
function lpMaybeShowSectionHint() {
  var scroller = document.getElementById('lp-scroll');
  if (!scroller || document.getElementById(scroller.id + '-hint-scroll')) return;
  clearTimeout(lpHintTimer);
  lpHintTimer = setTimeout(lpShowSectionHint, LP_HINT_IDLE);
}

function scrollGestureEnter(screenEl) {
  var scroller = screenEl && screenEl.querySelector('.lp-scroll');
  if (!scroller) return;
  lpRemoveScrollHint(scroller);
  if (!scroller.dataset.hintWired) {
    scroller.dataset.hintWired = '1';
    scroller.addEventListener('scroll', function () {
      lpRemoveScrollHint(scroller);
      lpMaybeShowSectionHint();
    }, { passive: true });
  }
  lpMaybeShowSectionHint();
}

// Kept under its old name — every caller (lpInit, the two checkpoint
// unlocks, each section's staged-sequence completion) is exactly a moment
// the per-section gesture hint needs re-checking.
function updateLpScrollIndicator() {
  lpMaybeShowSectionHint();
}

// Shared feedback-popup vertical centering — one rule for every checkpoint's
// feedback in this scroll screen (section 3's #lp-popup and section 6's
// #lpv-popup), per 720-templates/_global-components.md "Feedback popup
// system": "Position... should use shared defaults... Do not create a new
// popup system per question type." Centers the popup in the leftover space
// between the question's own content (contentEl — the answers list for
// section 3, the purple .lpv-frame for section 6) and the section's own
// bottom padding edge, never closer than GAP to either side, then reuses
// the existing canvas-bounds clamp (clampPopupToCanvas, in the drag IIFE
// below) so it can never bleed into the next section or off-canvas — same
// "never leaves the canvas" contract as dragging. Horizontally centers
// under the 280-1000 question column (x=640), same as before. Must run
// AFTER the popup's content is set and it's no longer hidden, so
// offsetWidth/offsetHeight reflect the real rendered size. offsetTop/
// offsetHeight (not getBoundingClientRect) because they're in the same
// local unscaled units as popup.style.top/left, unaffected by #app's
// scaleApp() transform; scroller.scrollTop converts them to the current
// visible position, since the popup is positioned absolute relative to the
// whole screen while the content underneath scrolls.
function lpCenterFeedbackPopup(popup, contentEl, sectionEl, scroller, anchor) {
  var GAP = 16;
  var scrollTop = scroller.scrollTop;
  var contentBottom = (contentEl.offsetTop + contentEl.offsetHeight) - scrollTop;
  var sectionStyle = getComputedStyle(sectionEl);
  var sectionPaddingBottom = parseFloat(sectionStyle.paddingBottom) || 0;
  var sectionContentBottom = (sectionEl.offsetTop + sectionEl.offsetHeight - sectionPaddingBottom) - scrollTop;
  var pos;
  if (anchor === 'bottom-left') {
    // Figma popup-feedback template (720 UI Templates, node 716-24031):
    // graded (correct/incorrect) feedback anchors bottom-left of its own
    // section's content box instead of centering under the answers — same
    // clamp/drag contract as the centered variant below, just a different
    // default resting spot. Kept as an opt-in `anchor` mode on the SAME
    // shared function (not a second popup system) per this file's own
    // "one rule for every checkpoint's feedback" contract — section 3's
    // neutral (non-graded, always-identical) message keeps the original
    // centered default, since it isn't a correct/incorrect state popup.
    var sectionPaddingLeft = parseFloat(sectionStyle.paddingLeft) || 0;
    var left = sectionEl.offsetLeft + sectionPaddingLeft;
    var top = Math.max(sectionContentBottom - popup.offsetHeight, contentBottom + GAP);
    pos = clampPopupToCanvas(left, top, popup);
  } else {
    var available = sectionContentBottom - contentBottom;
    var topGap = Math.max((available - popup.offsetHeight) / 2, GAP);
    var panelCenter = 280 + 720 / 2; // center of the 280-1000 question column = 640, same as the canvas center
    pos = clampPopupToCanvas(panelCenter - popup.offsetWidth / 2, contentBottom + topGap, popup);
  }
  popup.style.top = pos.y + 'px';
  popup.style.left = pos.x + 'px';
}

function lpPositionPopupBelowAnswers() {
  var popup = document.getElementById('lp-popup');
  var scroller = document.getElementById('lp-scroll');
  var answers = document.querySelector('#lp-sec-3 .lp-q-answers');
  var section = document.getElementById('lp-sec-3');
  if (!popup || !scroller || !answers || !section) return;
  // Global popup-placement rule (see lpCenterFeedbackPopup's 'bottom-left'
  // branch): every question-feedback popup opens bottom-left of its usable
  // content area, same as #lpv-popup below — this was the one holdout still
  // using the centered default before that rule was normalized project-wide.
  lpCenterFeedbackPopup(popup, answers, section, scroller, 'bottom-left');
}

function lpShowPopup() {
  var popup = document.getElementById('lp-popup');
  var title = document.getElementById('lp-popup-title');
  var body = document.getElementById('lp-popup-body');
  if (!popup || !title || !body) return;

  // Not a graded right/wrong reveal — "אי אפשר לדעת" is the point being made
  // regardless of which pill the learner picked (that distinction still
  // shows on the pills themselves via .is-correct/.is-wrong). So this is one
  // neutral message popup: same body always, no outcome title, styled with
  // the subject-toned "message" palette (see .lp-popup in styles.css) —
  // not the correct/incorrect feedback colors.
  var SHARED_BODY =
    '<p><strong>لا يمكن معرفة ذلك.</strong></p>' +
    '<p>المعطى "شريطان" وحده لا يكفي.</p>' +
    // Deliberate line break right after the comma, per explicit request —
    // not left to wrap incidentally by element width.
    '<p>لمعرفة مقدار شحن البطارية المتبقي،<br>علينا معرفة العدد الكلي للأشرطة التي تبقّى منها الشريطان.</p>' +
    '<p><strong>لنكتشف ماذا حدث...</strong></p>';

  popup.className = 'lp-popup';
  popup.hidden = false; // must be visible/rendered before content-based width can be measured
  title.textContent = '';
  body.innerHTML = SHARED_BODY;
  lpPositionPopupBelowAnswers(); // measures the now-rendered content, so must run last
}

// ============================================================
//  FEEDBACK POPUP SCROLL-SCOPING — learningphase is ONE scrolling screen
//  with several internal sections (see SCREEN 4 header above), but
//  #lp-popup is positioned absolute relative to the whole screen, not to
//  #lp-scroll's content — so without this, once shown it stays pinned in
//  place regardless of scroll position and visually bleeds onto section 1
//  ("למה אנחנו צריכים אחוזים?") when the learner scrolls back up. Scope its
//  visibility to whether lp-sec-3 (the section that owns it) is actually
//  the section currently in view; this never touches lpDone/lpSelected/lock
//  state, only the popup's own hidden attribute — same DOM element, same
//  open feedback, just shown/hidden in step with its own section per
//  _global-components.md "Feedback popups are contextual to the current
//  screen only." Reuses lpCurrentSection() (SCROLL AFFORDANCE above) rather
//  than a standalone rect-overlap check — sections are 560px tall in a
//  636px viewport, so a raw "any pixel overlap" test stayed true even one
//  full section away (e.g. scrolling back to section 2 still left a sliver
//  of section 3 technically overlapping), which is exactly why the popup
//  wasn't disappearing on section-to-section navigation as expected.
// ============================================================
function lpCheckpointInView() {
  return lpCurrentSection() === document.getElementById('lp-sec-3');
}

function syncLpPopupToScroll() {
  var popup = document.getElementById('lp-popup');
  if (!popup) return;
  if (lpCheckpointInView()) {
    if (lpDone) {
      popup.hidden = false; // must un-hide before measuring width — see lpPositionPopupBelowAnswers()
      popup.classList.remove('hidden');
      lpPositionPopupBelowAnswers(); // same positioning as lpShowPopup() — reset on every reveal
    }
  } else {
    popup.hidden = true;
    popup.classList.add('hidden');
  }
}

(function () {
  var scroller = document.getElementById('lp-scroll');
  if (scroller) scroller.addEventListener('scroll', syncLpPopupToScroll);
})();

// ============================================================
//  SECTION 6 — slide 11, embedded ValueInputQuestion checkpoint (item
//  -01-002). Local variant of 720-templates/ValueInputQuestion.md Variant A:
//  two inline percentage inputs sharing ONE submission, no retry — per the
//  script's own production note ("אין ניסיונות מענה"), resolving
//  CONTENT_FLAGS.md item #2 as "no retry attempts allowed" (not
//  "unlimited"). Pressing "צדקתי?" locks both inputs, marks each
//  correct/wrong independently, shows one feedback popup (correct only if
//  BOTH values are right), then unlocks the screen's own "המשך" continue
//  button — regardless of outcome, since there is no second attempt.
// ============================================================
var LPV = { correct1: 50, correct2: 20 };
var lpvDone = false;

function lpvResetInitial() {
  lpvDone = false;

  ['lpv-input-1', 'lpv-input-2'].forEach(function (id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.value = '';
    input.disabled = false;
    input.classList.remove('is-correct', 'is-wrong');
  });

  var check = document.getElementById('lpv-check-btn');
  if (check) { check.disabled = true; check.hidden = false; check.classList.remove('is-revealed'); }

  var popup = document.getElementById('lpv-popup');
  if (popup) { popup.hidden = true; popup.classList.add('hidden'); }

  // Only this checkpoint's own completion gates the continue button — the
  // screen has nothing else left to answer once section 6 is reached.
  var continueBtn = document.getElementById('learningphase-continue-btn');
  if (continueBtn) continueBtn.disabled = true;

  // Second scroll-gate tier (section 7, slide 12) — re-lock on the same
  // resume-state guard as everything else above: only while this checkpoint
  // itself hasn't been done yet (this function only runs from lpInit() when
  // !lpvDone). An already-completed checkpoint keeps section 7 unlocked on
  // re-entry, same as #lp-locked's own behavior for checkpoint 1.
  var locked2 = document.getElementById('lp-locked-2');
  if (locked2) locked2.hidden = true;
}

function lpvUpdateCheckBtn() {
  if (lpvDone) return;
  var v1 = document.getElementById('lpv-input-1').value.trim();
  var v2 = document.getElementById('lpv-input-2').value.trim();
  var check = document.getElementById('lpv-check-btn');
  if (!check) return;
  var ready = v1 !== '' && v2 !== '';
  check.disabled = !ready;
  // Deferred reveal — excluded from the section's entrance sequence; per
  // approved motion-plan rule, appears only once BOTH inputs are filled
  // (this readiness check, unchanged — no new validation logic for it).
  if (ready) revealOnReady(check);
}

// Feedback copy resolved 2026-08-09 (CONTENT_FLAGS.md #17) — supplied
// directly by the user in-session. Per _question-template-defaults.md
// "Feedback: shared explanation," correct and incorrect share one
// explanation body and differ only in title.
//
// Layout reworked 2026-08-09: Yonatan/Alon moved from two stacked paragraph
// pairs into a side-by-side .lpv-compare row (RTL: Yonatan right, Alon left)
// so the full body fits within .lpv-popup-body's existing max-height without
// the internal scrollbar the taller stacked version needed.
var LPV_FEEDBACK_BODY =
  '<div class="lpv-compare">' +
    '<div class="lpv-compare-col">' +
      '<p>لدى خالد:</p>' +
      '<p class="lpv-eq"><span class="lpv-fraction"><span class="lpv-fraction-num">2</span><span class="lpv-fraction-den">4</span></span><span>= 50%</span></p>' +
    '</div>' +
    '<div class="lpv-compare-col">' +
      '<p>عند سامر:</p>' +
      '<p class="lpv-eq"><span class="lpv-fraction"><span class="lpv-fraction-num">2</span><span class="lpv-fraction-den">10</span></span><span>= 20%</span></p>' +
    '</div>' +
  '</div>' +
  '<p class="lpv-para-gap">أصبح من السهل الآن أن نرى أنه رغم تبقّي شريطين لدى كلٍّ منهما،</p>' +
  '<p>تبقّى لدى خالد نصف شحن البطارية (50%)، بينما تبقّى لدى سامر 20% فقط.</p>';

var LPV_FEEDBACK = {
  correct: { title: 'صحيح تماماً', body: LPV_FEEDBACK_BODY },
  incorrect: { title: 'كِدتم تصلون إلى الإجابة الصحيحة... لنوضّح:', body: LPV_FEEDBACK_BODY }
};

function lpvShowPopup(isCorrect) {
  var popup = document.getElementById('lpv-popup');
  var title = document.getElementById('lpv-popup-title');
  var body = document.getElementById('lpv-popup-body');
  if (!popup || !title || !body) return;
  var cfg = isCorrect ? LPV_FEEDBACK.correct : LPV_FEEDBACK.incorrect;
  popup.className = 'lpv-popup ' + (isCorrect ? 'feedback-success' : 'feedback-error');
  popup.style.top = '40px';
  popup.style.left = '40px';
  title.textContent = cfg.title;
  body.innerHTML = cfg.body;
  body.scrollTop = 0; // reset-on-open, per the scroll-gated popup contract below
  popup.hidden = false; // must be visible before content-based width can be measured
  lpvPositionPopup();
}

function lpvCheck() {
  if (lpvDone) return;
  var input1 = document.getElementById('lpv-input-1');
  var input2 = document.getElementById('lpv-input-2');
  if (!input1.value.trim() || !input2.value.trim()) return;
  lpvDone = true;

  var correct1 = Number(input1.value) === LPV.correct1;
  var correct2 = Number(input2.value) === LPV.correct2;

  input1.disabled = true;
  input2.disabled = true;
  input1.classList.add(correct1 ? 'is-correct' : 'is-wrong');
  input2.classList.add(correct2 ? 'is-correct' : 'is-wrong');

  // Single-submission checkpoint — same as lp-check-btn (section 3): once
  // answered, the button has no further purpose, so it's removed from view
  // rather than left disabled.
  var check = document.getElementById('lpv-check-btn');
  if (check) check.hidden = true;

  lpvShowPopup(correct1 && correct2);
  syncLpvPopupToScroll(); // the learner is looking at this section right now, so this keeps it shown

  // No retry — unlock the screen's own continue action regardless of the
  // outcome (production note: "אין ניסיונות מענה").
  var continueBtn = document.getElementById('learningphase-continue-btn');
  if (continueBtn) continueBtn.disabled = false;

  // Unlock section 7 (slide 12) — same "hidden attribute removed on
  // completion, no forced auto-scroll" mechanic #lp-locked uses for
  // checkpoint 1, regardless of correct/incorrect outcome (same no-retry
  // rule as the continue button above). Growing #lp-scroll's scrollHeight
  // like this means the chevron indicator needs re-checking, same as
  // lpCheck() already does for its own unlock.
  var locked2 = document.getElementById('lp-locked-2');
  if (locked2) locked2.hidden = false;
  updateLpScrollIndicator();
  // Defensive reveal — same backstop as lpCheck() above, for the same edge
  // case (a section unlocked while already overlapping the viewport).
  lpDefensiveReveal(document.getElementById('lp-sec-7'));
  /* xAPI: item 002 q2 — both batteries in one submission, correct only if both are (as the
     feedback grades it); single submission, so answered.last. */
  xapiAnswered(xapiItemOf('learningphase'), 'q2', correct1 && correct2, true,
    input1.value.trim() + '% | ' + input2.value.trim() + '%');   // יונתן | אלון
  try { flushResumeSave(); } catch (e) {}
}

// Positions #lpv-popup using the same lpCenterFeedbackPopup() rule section
// 3's #lp-popup uses above — centers it in the leftover space below the
// purple .lpv-frame (not the inner .lpv-panel, so the popup clears the
// frame's own border/padding rather than overlapping it) and above the
// section's own bottom padding edge, clamped to the canvas.
function lpvPositionPopup() {
  var popup = document.getElementById('lpv-popup');
  var scroller = document.getElementById('lp-scroll');
  var frame = document.querySelector('#lp-sec-6 .lpv-frame') || document.querySelector('#lp-sec-6 .lpv-panel');
  var section = document.getElementById('lp-sec-6');
  if (!popup || !scroller || !frame || !section) return;
  lpCenterFeedbackPopup(popup, frame, section, scroller, 'bottom-left');
}

// Feedback popup scroll-scoping for section 6 — same rationale/mechanism as
// lpCheckpointInView()/syncLpPopupToScroll() above (section 3), scoped to
// this section instead: #lpv-popup is positioned absolute relative to the
// whole screen, not to #lp-scroll's content, so its visibility must be tied
// to whether lp-sec-6 is actually visible.
//
// Bug found while wiring up this section's real feedback copy (predates
// section 7): lp-sec-6 used to be both the LAST section and shorter than the
// viewport, so once scrolled to the very bottom, lpCurrentSection()'s
// max-overlap heuristic still picked the taller lp-sec-5 above it (more
// overlapping pixels) even though lp-sec-6 was the one fully in view — the
// popup was silently hiding itself right after being shown. Section 3's
// raw-overlap approach was deliberately rejected for a different failure
// mode (a sliver of the next/prev section staying "in view" while scrolling
// past it, per lpCheckpointInView()'s own comment).
//
// Now that section 7 (slide 12) exists below it, lp-sec-6 is no longer the
// last section — there is always room to scroll past it, so the scroll-max
// clamp edge case above no longer applies here, and the old "OR at document
// bottom" fallback is now actively WRONG: it would keep this popup shown
// while the learner is actually looking at section 7 at the new bottom of
// the page. Dropped in favor of the plain max-overlap check. (Section 7 has
// no popup of its own needing an equivalent fallback — its only content is
// the staged paragraph/callout reveal below, triggered once via
// IntersectionObserver like every other section, not by ongoing scroll
// position.)
function lpvSectionInView() {
  return lpCurrentSection() === document.getElementById('lp-sec-6');
}

function syncLpvPopupToScroll() {
  var popup = document.getElementById('lpv-popup');
  if (!popup) return;
  if (lpvSectionInView()) {
    if (lpvDone) {
      popup.hidden = false; // must un-hide before measuring width — see lpvPositionPopup()
      popup.classList.remove('hidden');
      lpvPositionPopup();
    }
  } else {
    popup.hidden = true;
    popup.classList.add('hidden');
  }
}

(function () {
  var scroller = document.getElementById('lp-scroll');
  if (scroller) scroller.addEventListener('scroll', syncLpvPopupToScroll);
})();

// ============================================================
//  ENTRY REVEAL — staged first-visit content reveal per Learning Phase
//  section. Sections 1, 2, 3, 4, 5, 7 use the custom runStagedSequence()
//  engine (script.js top of file) with each section's own explicit wait
//  times, per the approved motion plan — see the lpSecNStagedSteps()
//  builders above. Section 6 (the value-input checkpoint) is untouched:
//  still the generic system-animation Motion engine (motion.css/motion.js)
//  group system, since no specific retiming was requested for it.
//
//  Activation (2026-08-16 rewrite) is driven by "which section is the
//  learner's CURRENT reading area" — reusing lpCurrentSection()'s own
//  max-overlap heuristic (SCROLL AFFORDANCE above), the same definition
//  already used for the scroll indicator and popup-scoping — never a
//  low-threshold IntersectionObserver watching every section
//  independently. That earlier approach (threshold 0.2, one observer
//  entry per section) let a LATER section start its own staged reveal the
//  moment its top edge crept 20% into the viewport, even while the
//  learner was still mid-read on the section above it — two sections
//  could be "intersecting" (and therefore revealing) at once, and a small
//  incidental scroll (not a deliberate "move to the next section" gesture)
//  was enough to trigger it. Max-overlap only ever names ONE current
//  section, and flipping to a new one requires scrolling past the
//  midpoint between two sections — a deliberate, substantial scroll (or
//  the arrow's scrollIntoView landing the next section at the top) —
//  never a 5-10% edge peek. Sections still inside #lp-locked/
//  #lp-locked-2[hidden] have zero size and never become "current" until
//  lpCheck()/lpvCheck() unhide them and re-run this check directly (see
//  lpDefensiveReveal() above, called right after each unlock).
//  runStagedSequence()'s own `played` flag and Motion.reveal()'s seen-set
//  make repeat firings (e.g. re-entering screen 4, or scrollTop resetting
//  to 0) safe no-ops, so this can run on every scroll tick with no need to
//  track "already revealed" separately.
//  Section 7's percentage callouts used to have their own preserved,
//  scroll-position-triggered pop-in (lpMaybeRevealCallouts()/lp7InView(),
//  removed) — they're now part of lp-sec-7's own staged sequence instead,
//  triggered the same way as every other section.
// ============================================================
var LP_CUSTOM_SECTION_STEPS = {
  'lp-sec-1': lpSec1StagedSteps,
  'lp-sec-2': lpSec2StagedSteps,
  'lp-sec-3': lpSec3StagedSteps,
  'lp-sec-4': lpSec4StagedSteps,
  'lp-sec-5': lpSec5StagedSteps,
  'lp-sec-7': lpSec7StagedSteps
};

function lpRevealSection(sectionEl) {
  if (!sectionEl) return;
  var builder = LP_CUSTOM_SECTION_STEPS[sectionEl.id];
  if (builder) {
    // GUARD (2026-08-16 fix): lpCheckCurrentSectionReveal() calls this on
    // EVERY 'scroll' event while a section remains current — including tiny
    // incidental scroll wiggles from a learner just reading in place, not
    // moving to a new section. runStagedSequence() itself only offers a
    // "played" flag meant for a genuine REVISIT (show everything instantly,
    // no replay) — calling it a second time while the FIRST call's own
    // staged sequence is still mid-flight hits that exact same "already
    // played" branch, which clears the in-progress timers and force-shows
    // every remaining element at once. That's what made a whole section
    // "pop in as one block" instead of staging, and made an image already
    // mid-fade-in visually snap/flash to its end state. Only ever call
    // runStagedSequence() the FIRST time a section becomes current; every
    // later call while it's already started (mid-sequence or long since
    // complete) is a no-op here — the sequence's own timers finish on their
    // own, untouched.
    if (stagedSequences[sectionEl.id]) return;
    runStagedSequence(sectionEl.id, builder, updateLpScrollIndicator);
  } else if (typeof Motion !== 'undefined') {
    Motion.reveal(sectionEl); // section 6 only — untouched generic engine; Motion.reveal() already guards repeat calls via its own seen-set
  }
}

// Reveals whichever section is the learner's current reading area right
// now — safe to call on every scroll tick (no-op for a section already
// revealed/played) and directly on init/unlock (see lpInit(),
// lpDefensiveReveal()).
function lpCheckCurrentSectionReveal() {
  lpRevealSection(lpCurrentSection());
}

(function () {
  var scroller = document.getElementById('lp-scroll');
  if (!scroller) return;
  scroller.addEventListener('scroll', lpCheckCurrentSectionReveal);
})();

// ============================================================
//  DRAGGABLE FEEDBACK POPUP — pointer events only (R3), no close button.
//  Bounded to the canvas, never over the 74px bottom bar.
//  Pattern per _global-components.md "Drag bounds".
// ============================================================
var BOTTOM_BAR_H = 74;

// Small symmetric gap kept on both sides so a dragged popup never touches
// the canvas edge exactly — same margin left and right, per the "drag
// bounds" contract.
var POPUP_DRAG_MARGIN = 16;

// #app is NOT a fixed 1280×710 box at runtime — scaleApp() (top of this
// file) sets its actual (pre-transform) width/height to
// window.innerWidth/scale and window.innerHeight/scale, which only equals
// 1280×710 when the viewport's own aspect ratio exactly matches 1280:710.
// A hardcoded 710 clamp bound was silently wrong (too short) on every other
// aspect ratio — found while wiring section 6's popup-position clamp below,
// where the taller-than-710 real canvas made the popup clamp far higher
// than the actual available space. Reading #app's own offsetWidth/
// offsetHeight keeps this correct for whatever scaleApp() computed, instead
// of assuming a constant.
function getCanvasSize() {
  var app = document.getElementById('app');
  return { w: app.offsetWidth, h: app.offsetHeight };
}

// Shared by the drag handler below and by any popup's own computed default/
// resync position (e.g. lpvPositionPopup()) — one source of truth for the
// "never leaves the canvas, never covers the bottom bar" bound instead of a
// second formula living only inside the drag closure.
function clampPopupToCanvas(x, y, el) {
  var canvas = getCanvasSize();
  var w = el.offsetWidth, h = el.offsetHeight;
  var minX = POPUP_DRAG_MARGIN, maxX = canvas.w - w - POPUP_DRAG_MARGIN;
  var minY = 0, maxY = (canvas.h - BOTTOM_BAR_H) - h;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY)
  };
}

(function () {
  var dragEl = null, offX = 0, offY = 0;

  function appScale() {
    var app = document.getElementById('app');
    var m = app.style.transform.match(/scale\(([^)]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  document.addEventListener('pointerdown', function (e) {
    // .no-drag opts a feedback panel out of this shared drag system — a
    // documented local exception for panels laid out in normal flow as a
    // fixed compositional slot (e.g. #hook1-popup) rather than the movable,
    // absolutely-positioned overlay card this handler otherwise assumes.
    var popup = e.target.closest('[id$="-popup"]:not(.no-drag)');
    if (!popup) return;
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
//  DEV MODE — postMessage bridge for index_dev.html / viewer.html
//  (established 04-03 convention). NOT loaded/used by the real learner
//  experience — index.html only ever runs this file directly, never
//  imports index_dev.html/viewer.html.
//
//  Contract (message-based, not direct cross-frame property access, so it
//  works the same whether served over file:// or http://):
//  - Child → parent, on load and after every goTo(): DEV_READY / DEV_STATE
//    carrying {total, current, screens:[{index, id}]} — the screens list is
//    read directly from the DOM here, so index_dev.html/viewer.html never
//    need updating by hand as later phases add screens.
//  - Parent → child: DEV_GOTO {screen:n} jumps unconditionally (goTo() has
//    no completion/attempt gating, so this is never blocked by learner
//    progression logic). DEV_RESET re-runs resetScreenState() on the
//    CURRENT screen only, without navigating away.
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

// ============================================================
//  GLOBAL — numeric-only value-entry inputs
//  Every numeric-entry field in this unit expects a positive integer
//  (a fraction numerator or a percentage value) — no decimals, no sign —
//  so only digits 0-9 are allowed. Typed non-digit keystrokes are stripped
//  on 'input'; paste is intercepted separately (mixed clipboard text like
//  "abc70xyz" would otherwise slip through, and doing it via 'input' alone
//  risks maxlength truncating away digits that followed a stray letter).
// ============================================================
function digitsOnly(str) { return str.replace(/[^0-9]/g, ''); }

function handleDigitsInput(e) {
  var el = e.target;
  var sanitized = digitsOnly(el.value);
  if (sanitized !== el.value) {
    el.value = sanitized;
    // Re-fire so the field's own oninput (button-enable checks etc.) reads
    // the corrected value instead of the stray-character one it just saw.
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function handleDigitsPaste(e) {
  var el = e.target;
  e.preventDefault();
  var clipboard = (e.clipboardData || window.clipboardData).getData('text');
  var pasted = digitsOnly(clipboard);
  var start = el.selectionStart == null ? el.value.length : el.selectionStart;
  var end = el.selectionEnd == null ? el.value.length : el.selectionEnd;
  var next = el.value.slice(0, start) + pasted + el.value.slice(end);
  if (el.maxLength > 0) next = next.slice(0, el.maxLength);
  el.value = next;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

document.querySelectorAll('.gvi-answer-box, .lpv-input, .warmup-input').forEach(function (el) {
  el.addEventListener('input', handleDigitsInput);
  el.addEventListener('paste', handleDigitsPaste);
});

document.querySelectorAll('.warmup-input').forEach(function (el) {
  el.addEventListener('input', warmupOnInput);
});

// Initial render
resetScreenState(0);
Motion.reveal(document.querySelector('.screen.active')); // one extra call for the first screen, per the engine's own wiring contract (not covered by goTo(), since screen 0 starts active in raw HTML)
if (location.hash === '#end') goTo(NAV_FLOW[NAV_FLOW.length - 1]); // standalone back-navigation from 06-02, see goToComponent()

/* ═══════════════════ xAPI (720) — this component's configuration ═══════════════════
   Data only (var). The shared layer in ../unit-js/ reads it at CALL time, so it may sit after all
   the code that uses it. Ids verified against ../metadata/methodica-math-percent-06-01.json (2026-09-30).

   SCREEN_TO_SUBCONTENT: 0-based screen index (= data-screen = goTo(n)) -> [item suffix, page in
   item]. ⚠️ Exactly TOTAL_SCREENS keys (18), no gaps — a missing key is a screen that silently
   never reports (guide §6.2). Only [0] is read; [1] documents the paging.
   Item 001 (hook1 / whypercent / hook2) is motivational: no questions in metadata, so it only
   opens and closes. Item 003 (s13-s24) is the solved exercise ("נפתור יחד") — not code-graded, so it
   is not in XAPI_EVAL_ITEMS. Since 2026-10-20 it declares no questions (MOE removed them in KATA),
   so its guided answers send no 'answered' either: it only opens and closes. */
var SCREEN_TO_SUBCONTENT = {
   0: ['001', 1],   // hook1
   1: ['001', 2],   // whypercent
   2: ['001', 3],   // hook2
   3: ['002', 1],   // learningphase
   4: ['003', 1],   // s13
   5: ['003', 2],   // s14
   6: ['003', 3],   // s15
   7: ['003', 4],   // s16
   8: ['003', 5],   // s17
   9: ['003', 6],   // s18
  10: ['003', 7],   // s19
  11: ['003', 8],   // s20
  12: ['003', 9],   // s21
  13: ['003', 10],   // s22
  14: ['003', 11],   // s23
  15: ['003', 12],   // s24
  16: ['004', 1],   // s25
  17: ['004', 2]    // s26
};

var XAPI_COMP_SLUG = 'methodica-math-percent-06-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
/* Item ids carry this component's own slug — no XAPI_ITEM_SLUG needed. */
/* Items that carry a code-graded question — used as a set. */
var XAPI_EVAL_ITEMS = { '002': 1, '004': 1 };
var XAPI_METADATA_FILE = '../metadata/methodica-math-percent-06-01.json';

/* ═══════════════════ Resume (KATA State API) — this component's hooks ═══════════════════
   Read by ../unit-js/40-resume.js at CALL time (guide §8.7). Contract (40-resume.js "Snapshot
   helpers"): only FINISHED questions are saved; an unfinished one starts fresh on return, as it
   already did in-session. The init functions keep a finished screen finished (hook1Init, lpInit,
   warmupInit had guards; s15 / s23 / gvi got theirs in Phase 3c); restoreScreenUI repaints what only
   the live check left in the DOM — marks, typed values, the unlocked sections, the feedback text —
   from state, never resetting (guide §8.8). Values typed into inputs are read from the DOM at
   capture time, the only place they live. applyResumeDom has nothing left to do. */
function capturePartPayload() {
  var inVal = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
  var warm = null;
  if (warmupDone) { warm = {}; warmupInputs().forEach(function (el) { warm[el.dataset.key] = el.value; }); }
  var gvi = {};
  Object.keys(gviStep).forEach(function (k) { if (gviStep[k] >= 1) gvi[k] = { step: gviStep[k], values: GVI_ANSWERS[k] }; });
  return {
    currentScreen: currentScreen,
    qr: resumeClone(XAPI_Q_RESULTS),
    hook1: hook1Done ? Array.from(hook1Selected) : null,
    lp: lpDone ? lpSelected : null,
    lpv: lpvDone ? [inVal('lpv-input-1'), inVal('lpv-input-2')] : null,
    s15: s15Done ? s15Choice : null,
    s23: s23Done ? s23Choice : null,
    gvi: gvi,
    warmup: warm
  };
}
function applyResumeVars(st) {
  resumeAssign(XAPI_Q_RESULTS, st.qr);
  if (st.hook1) { hook1Done = true; hook1Selected = new Set(st.hook1); }
  if (st.lp != null) { lpDone = true; lpSelected = st.lp; }
  if (st.lpv) { lpvDone = true; RESUME_LPV = st.lpv.slice(); }
  if (st.s15 != null) { s15Done = true; s15Choice = st.s15; }
  if (st.s23 != null) { s23Done = true; s23Choice = st.s23; }
  Object.keys(st.gvi || {}).forEach(function (k) { gviStep[k] = st.gvi[k].step; GVI_ANSWERS[k] = st.gvi[k].values; });
  if (st.warmup) { warmupDone = true; RESUME_WARMUP = resumeClone(st.warmup); }
}
function applyResumeDom(st) {}
/* Restored typed values, for the painters (live values sit in the inputs themselves). */
var RESUME_LPV = null, RESUME_WARMUP = null;

function restoreScreenUI(n) {
  var id = resumeScreenId(n);
  if (id === 'hook1' && hook1Done) {
    document.querySelectorAll('#hook1 .hook1-opt').forEach(function (b) {
      var sel = hook1Selected.has(b.dataset.id);
      b.disabled = true; b.classList.toggle('is-selected', sel); b.setAttribute('aria-checked', sel ? 'true' : 'false');
    });
    var hb = document.getElementById('hook1-action-btn');
    if (hb) { hb.textContent = 'متابعة'; hb.disabled = false; revealOnReady(hb); hb.classList.add('is-pulsing'); }
  }
  if (id === 'learningphase') {
    if (lpDone) {
      document.querySelectorAll('#lp-sec-3 .lp-q-opt').forEach(function (b) {
        b.disabled = true; b.classList.remove('is-selected');
        b.setAttribute('aria-checked', b.dataset.id === lpSelected ? 'true' : 'false');
        b.classList.toggle('is-correct', b.dataset.id === LP_CORRECT_ID);
        b.classList.toggle('is-wrong', b.dataset.id === lpSelected && b.dataset.id !== LP_CORRECT_ID);
      });
      var lc = document.getElementById('lp-check-btn'); if (lc) { lc.disabled = false; lc.hidden = true; }   // as lpSelect + lpCheck leave it
      var l1 = document.getElementById('lp-locked'); if (l1) l1.hidden = false;
      lpShowPopup(); syncLpPopupToScroll();       // content from state; the scroll sync owns visibility
    }
    if (lpvDone) {
      var i1 = document.getElementById('lpv-input-1'), i2 = document.getElementById('lpv-input-2');
      if (RESUME_LPV && i1 && i2 && !i1.value && !i2.value) { i1.value = RESUME_LPV[0]; i2.value = RESUME_LPV[1]; }
      var c1 = i1 && Number(i1.value) === LPV.correct1, c2 = i2 && Number(i2.value) === LPV.correct2;
      [[i1, c1], [i2, c2]].forEach(function (p) {
        if (!p[0]) return;
        p[0].disabled = true; p[0].classList.remove('is-correct', 'is-wrong'); p[0].classList.add(p[1] ? 'is-correct' : 'is-wrong');
      });
      var vc = document.getElementById('lpv-check-btn'); if (vc) vc.hidden = true;
      var cont = document.getElementById('learningphase-continue-btn'); if (cont) cont.disabled = false;
      var l2 = document.getElementById('lp-locked-2'); if (l2) l2.hidden = false;
      lpvShowPopup(!!(c1 && c2)); syncLpvPopupToScroll();
    }
    if (lpDone || lpvDone) updateLpScrollIndicator();
  }
  if ((id === 's15' && s15Done) || (id === 's23' && s23Done)) {
    var choice = id === 's15' ? s15Choice : s23Choice, right = id === 's15' ? S15_CORRECT_ID : S23_CORRECT_ID;
    document.querySelectorAll('#' + id + ' .guided-opt').forEach(function (b) {
      b.disabled = true; b.setAttribute('aria-checked', b.dataset.id === choice ? 'true' : 'false');
      b.classList.toggle('is-selected', b.dataset.id === choice);
      b.classList.toggle('is-correct', b.dataset.id === right);
    });
    var gc = document.getElementById(id + '-continue'); if (gc) { gc.disabled = false; revealOnReady(gc); }
  }
  if (GVI[id] && gviStep[id] >= 1) {
    var body = document.getElementById(id + '-panel-body'), btn = document.getElementById(id + '-action-btn');
    if (body && gviStep[id] === 2) {
      if (!body.dataset.original) body.dataset.original = body.innerHTML;
      if (body.innerHTML !== GVI[id].feedbackHTML) body.innerHTML = GVI[id].feedbackHTML;
    } else if (body) {
      var vals = GVI_ANSWERS[id] || [];
      Array.prototype.forEach.call(body.querySelectorAll('.gvi-answer-box'), function (input, i) {
        if (vals[i] != null) input.value = vals[i];
        input.disabled = true; input.classList.remove('is-correct', 'is-wrong');
        input.classList.add(input.value.trim() === GVI[id].correct[i] ? 'is-correct' : 'is-wrong');
      });
    }
    if (btn) { btn.textContent = 'متابعة'; btn.disabled = false; }
  }
  if (id === 's26' && warmupDone) {
    var allRight = true;
    warmupInputs().forEach(function (el) {
      var k = el.dataset.key;
      if (RESUME_WARMUP && RESUME_WARMUP[k] != null && !el.value) el.value = RESUME_WARMUP[k];
      var right2 = el.value === WARMUP_CORRECT[k];
      if (!right2) allRight = false;
      el.disabled = true; el.classList.remove('is-correct', 'is-error'); el.classList.add(right2 ? 'is-correct' : 'is-error');
    });
    warmupShowFeedback(allRight ? 'correct' : 'wrong2');
    var wb = document.getElementById('s26-continue'); if (wb) { wb.textContent = 'متابعة'; wb.disabled = false; }
    var wh = document.getElementById('s26-hint'); if (wh) wh.disabled = true;
  }
}
