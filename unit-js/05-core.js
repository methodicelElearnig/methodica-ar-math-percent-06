'use strict';

/* ============================================================
   unit-js/05-core.js — functions shared, token-for-token identical, by the
   components that use them. Loaded in every component's index.html right
   before script.js. DEFINITION-ONLY: no top-level side effects — every
   function reads its component's state (currentScreen, NAV_FLOW,
   stagedSequences, dndState, …) at CALL time, so script.js may declare
   that state after this file loads.
   ⚠️ No name here may also be declared in a script.js: a function
   declared in both is a silent last-wins override (script.js loads later).
   A component that needs different behaviour gets a differently named
   function, not a same-name copy. Phase 1d, 2026-09-30.
   ============================================================ */

// ============================================================
//  CANVAS SCALING
// ============================================================

function scaleApp() {
  var app = document.getElementById('app');
  var scaleX = window.innerWidth / 1280;
  var scaleY = window.innerHeight / 710;
  var scale = Math.min(scaleX, scaleY);
  app.style.transform = 'scale(' + scale + ')';
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.left = '0px';
  app.style.top = '0px';
}

// ============================================================
//  STAGED REVEAL ENGINE — timings read from motion.css tokens
// ============================================================

function cssMs(varName, fallback) {
  var raw = getComputedStyle(document.documentElement).getPropertyValue(varName);
  var val = parseFloat(raw);
  return isNaN(val) ? fallback : val;
}

function reducedMotionPref() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stageShowEl(el, instant) {
  if (!el) return;
  el.classList.add('is-revealed');
  if (instant) {
    el.style.transition = 'none';
    el.style.animation = 'none';
    el.style.opacity = '1';
    el.style.transform = 'none';
  }
}

function runStagedSequence(key, buildSteps, onComplete) {
  var seq = stagedSequences[key];
  if (!seq) { seq = stagedSequences[key] = { played: false, complete: false, timers: [] }; }

  seq.timers.forEach(clearTimeout);
  seq.timers = [];

  var steps = buildSteps();
  var instant = seq.played || reducedMotionPref();

  if (instant) {
    steps.forEach(function (step) {
      (step.els || []).forEach(function (el) { stageShowEl(el, true); });
      if (step.onShow) step.onShow(true);
    });
    seq.played = true;
    seq.complete = true;
    Motion.unlock(document.getElementById(key));
    if (onComplete) onComplete();
    return;
  }

  seq.played = true;
  var cumulative = 0;
  var settleAt = 0;
  steps.forEach(function (step, i) {
    var isLast = i === steps.length - 1;
    var t = setTimeout(function () {
      (step.els || []).forEach(function (el) { stageShowEl(el, false); });
      if (step.onShow) step.onShow(false);
      if (isLast) {
        seq.complete = true;
        if (onComplete) onComplete();
      }
    }, cumulative);
    seq.timers.push(t);
    var dur = step.dur != null ? step.dur : STAGE_DURATION_DEFAULT;
    var wait = step.wait != null ? step.wait : STAGE_GAP_DEFAULT;
    if (isLast) settleAt = cumulative + dur;
    cumulative += dur + wait;
  });

  // Entrance lock: no answer/Check/Continue until the LAST step has fully
  // settled on screen (Motion.lock/unlock in motion.js).
  var lockEl = document.getElementById(key);
  Motion.lock(lockEl);
  seq.timers.push(setTimeout(function () { Motion.unlock(lockEl); }, settleAt));
}

function cancelStagedSequence(key) {
  var seq = stagedSequences[key];
  if (seq) { seq.timers.forEach(clearTimeout); seq.timers = []; }
  Motion.unlock(document.getElementById(key));
}

// ============================================================
//  NAVIGATION — in-component back, cross-component hop, back-button state
// ============================================================

function goBack() {
  var idx = NAV_FLOW.indexOf(currentScreen);
  if (idx <= 0) {
    // First screen of the component — back leaves to the previous
    // component, in whatever state the learner left it (see goToComponent).
    if (UNIT_PREV_COMPONENT) goToComponent('prev');
    return;
  }
  goTo(NAV_FLOW[idx - 1]);
}

function updateBackButton() {
  document.querySelectorAll('.btn-back').forEach(function (btn) {
    btn.setAttribute('hidden', '');
  });
  if (currentScreen === 0 && !UNIT_PREV_COMPONENT) return;
  var screens = document.querySelectorAll('.screen');
  var backBtn = screens[currentScreen] && screens[currentScreen].querySelector('.btn-back');
  if (backBtn) backBtn.removeAttribute('hidden');
}

/* ⚠️ The platform owns routing (2026-09-16, guide §8.12): a move to another component exists only
   in a local walkthrough — DEV_NAV (10-identity.js: ?dev=1 and no ?registration), which the
   repo-only unit shell turns on for every component it opens. In production this returns at once:
   the first screen's "חזרה" is hidden (hideCrossPartBack) and every last-screen button ends the
   component (xapiEndComponent) and stays where it is. Before a walkthrough hop this component is
   saved synchronously, so the walk resumes it where it stood. */
function goToComponent(dir) {
  if (typeof DEV_NAV === 'undefined' || !DEV_NAV) return;
  try { if (typeof flushResumeSave === 'function') { flushResumeSave(); armLeaving(); } } catch (e) {}
  if (unitShellHosted) {
    window.parent.postMessage({ type: 'UNIT_NAV', dir: dir }, '*');
    return;
  }
  var dest = dir === 'prev' ? UNIT_PREV_COMPONENT : UNIT_NEXT_COMPONENT;
  if (dest) window.location.href = dest + (dir === 'prev' ? '#end' : '');
}

// ============================================================
//  DEV MODE bridge — screen list + state report to the QA host (unit-shell / viewer)
// ============================================================

function devScreenList() {
  var list = [];
  document.querySelectorAll('.screen').forEach(function (el, i) {
    list.push({ index: i, id: el.id || ('s' + i) });
  });
  return list;
}

function notifyDevHost() {
  if (window.parent === window) return;
  window.parent.postMessage({
    type: 'DEV_STATE',
    total: document.querySelectorAll('.screen').length,
    current: currentScreen,
    screens: devScreenList()
  }, '*');
}

// ============================================================
//  RESUME PAINTER — the answered look of a choice question (unit-js/40-resume.js)
// ============================================================

/* Re-applies what a resolved choice question looks like, from state alone — the same classes the
   live check functions leave behind (scqCheck, mcqCheck, q3Check, clsCheck, subCheck in every
   component): every option locked; the learner's pick(s) 'selected' / aria-checked; every correct
   option 'correct'; a picked option that is not correct 'wrong'. Idempotent, and it never resets —
   a painter must not (guide §8.8). opts: the option elements; selected / correct: arrays of data-id. */
function resumePaintChoice(opts, selected, correct) {
  (opts || []).forEach(function (opt) {
    var id = opt.getAttribute('data-id');
    var isSel = selected.indexOf(id) !== -1, isOk = correct.indexOf(id) !== -1;
    opt.disabled = true;
    opt.classList.toggle('selected', isSel);
    opt.setAttribute('aria-checked', isSel ? 'true' : 'false');
    opt.classList.toggle('correct', isOk);
    opt.classList.toggle('wrong', isSel && !isOk);
  });
}

// ============================================================
//  IMAGE ZOOM MODAL
// ============================================================

function openImgZoom(src, alt) {
  var modal = document.getElementById('img-zoom-modal');
  var img = document.getElementById('img-zoom-stage-img');
  if (!modal || !img) return;
  img.src = src;
  img.alt = alt || '';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeImgZoom() {
  var modal = document.getElementById('img-zoom-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

// ============================================================
//  SINGLE-CHOICE QUESTION — shared helpers (check/enter/feedback stay per component)
// ============================================================

function scqOptions(screenId) {
  return Array.prototype.slice.call(document.querySelectorAll('#' + screenId + ' .scq-opt'));
}

function scqAdvance(screenId) {
  var idx = NAV_FLOW.indexOf(currentScreen);
  if (idx >= 0 && idx + 1 < NAV_FLOW.length) goTo(NAV_FLOW[idx + 1]);
}

function scqNextScreen(screenId) {
  var idx = NAV_FLOW.indexOf(currentScreen);
  return idx >= 0 && idx + 1 < NAV_FLOW.length;
}

function scqCloseHint() {
  var overlay = document.getElementById('scq-hint-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.add('hidden');
}

// ============================================================
//  FEEDBACK POSITIONING helpers
// ============================================================

function clampFeedbackPos(x, y, el) {
  var app = document.getElementById('app');
  var w = el.offsetWidth, h = el.offsetHeight;
  var minX = FEEDBACK_DRAG_MARGIN, maxX = app.offsetWidth - w - FEEDBACK_DRAG_MARGIN;
  var minY = 0, maxY = (app.offsetHeight - BOTTOM_BAR_H) - h;
  return {
    x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(y, minY), Math.max(minY, maxY))
  };
}

// .scq-fb's containing block for position:absolute purposes is its parent
// .scq-feedbox region — which itself sits at a per-template offset (e.g.
// left:40/top:100) inside .screen, NOT at (0,0). Every canvas-space
// coordinate computed against #app must therefore be translated into
// "offset from the region's own box" before it's written to style.left/top.
function regionOffset(region) {
  var app = document.getElementById('app');
  var appRect = app.getBoundingClientRect();
  var scale = appRect.width / app.offsetWidth;
  var regionRect = region.getBoundingClientRect();
  return {
    x: (regionRect.left - appRect.left) / scale,
    y: (regionRect.top - appRect.top) / scale
  };
}

// ============================================================
//  PRACTICE PROGRESS NAV
// ============================================================

function syncPracticeProgressNav(sectionEl) {
  var nav = sectionEl && sectionEl.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, practiceProgress);
}

// ============================================================
//  CLICK HINT (animated hand) — 06-01, 06-03
// ============================================================

function makeClickHint(id) {
  var el = document.createElement('div');
  el.className = 'click-hint';
  el.id = id;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="click-hint__ripple1"><img src="../unit-assets/hint/ripple-ring-1.svg" alt=""></div>' +
    '<div class="click-hint__ripple2"><img src="../unit-assets/hint/ripple-ring-2.svg" alt=""></div>' +
    SCROLL_HINT_SPARKS.map(function (d, i) {
      return '<div class="click-hint__spark" style="--dx:' + d[0] + 'px; --dy:' + d[1] + 'px; --d:' + (i * 3) + 'ms"><img src="../unit-assets/hint/spark.svg" alt=""></div>';
    }).join('') +
    '<div class="click-hint__cursor"><img src="../unit-assets/hint/hand.svg" alt=""></div>';
  return el;
}

// ============================================================
//  DRAG-AND-DROP ranking table — shared helpers (check/enter/feedback stay per component; 06-05, 06-06)
// ============================================================

function dndChip(screenId, id) {
  return document.querySelector('#' + screenId + ' .dnd-chip[data-chip="' + id + '"]');
}

function dndSlotEl(screenId, i) {
  return document.getElementById(screenId + '-slot' + i);
}

function dndPoolEl(screenId) {
  return document.getElementById(screenId + '-pool');
}

function dndSnapshot(screenId) {
  return dndState[screenId].slots.join(',');
}

function dndAllFilled(screenId) {
  return dndState[screenId].slots.every(function (v) { return v != null; });
}

function dndRenderSlot(screenId, i) {
  var slot = dndSlotEl(screenId, i);
  if (!slot) return;
  var chipId = dndState[screenId].slots[i];
  var label = slot.querySelector('.dnd-slot-label');
  if (chipId) {
    slot.classList.add('is-filled');
    label.textContent = slot.getAttribute('data-name-' + chipId);
  } else {
    slot.classList.remove('is-filled');
    label.textContent = '';
  }
}

function dndUpdateCheckReady(screenId) {
  var st = dndState[screenId];
  var btn = document.getElementById(screenId + '-check');
  if (!btn || st.done) return;
  var unchanged = st.lastWrongSnapshot !== null && dndSnapshot(screenId) === st.lastWrongSnapshot;
  btn.disabled = !dndAllFilled(screenId) || unchanged;
}

function dndClearSlotMarks(screenId, i) {
  var slot = dndSlotEl(screenId, i);
  if (slot) slot.classList.remove('is-correct', 'is-error');
}

// ---- Native HTML5 drag-and-drop — thin wrapper over the same state ----
function dndDragStart(screenId, id, ev) {
  var st = dndState[screenId];
  if (st.done) return;
  ev.dataTransfer.setData('text/plain', id);
  ev.dataTransfer.effectAllowed = 'move';
}

function dndSlotDragOver(screenId, i, ev) {
  var st = dndState[screenId];
  if (st.done || st.lockedSlots[i]) return;
  ev.preventDefault();
  dndSlotEl(screenId, i).classList.add('is-dragover');
}

function dndSlotDragLeave(screenId, i) {
  var slot = dndSlotEl(screenId, i);
  if (slot) slot.classList.remove('is-dragover');
}

function dndSlotDrop(screenId, i, ev) {
  ev.preventDefault();
  var slot = dndSlotEl(screenId, i);
  if (slot) slot.classList.remove('is-dragover');
  var st = dndState[screenId];
  if (st.done || st.lockedSlots[i]) return;
  var id = ev.dataTransfer.getData('text/plain');
  if (!id) return;
  st.picked = id;
  dndSlotClick(screenId, i);
}

function dndPoolDragOver(ev) { ev.preventDefault(); }

// Final-wrong "התשובה הנכונה" / "התשובה שלי" toggle — same pattern as
// methodica-math-percent-03's S8 pilot (single pill button whose label
// swaps). Only the slot contents, their V/X marks and the button label
// change; the wrong2 feedback text stays as-is.
function dndApplyFinalMarks(screenId) {
  var st = dndState[screenId];
  var cfg = DND_CONFIG[screenId];
  for (var i = 0; i < 3; i++) {
    dndRenderSlot(screenId, i);
    var slot = dndSlotEl(screenId, i);
    slot.classList.remove('is-correct', 'is-error');
    slot.classList.add(st.slots[i] === cfg.correctOrder[i] ? 'is-correct' : 'is-error');
  }
  dndRenderPool(screenId);
}

function dndSyncRevealBtn(screenId) {
  var btn = document.getElementById(screenId + '-reveal-btn');
  if (btn) btn.textContent = dndState[screenId].revealed ? 'إجابتي' : 'الإجابة الصحيحة';
}

function dndToggleReveal(screenId) {
  var st = dndState[screenId];
  if (!st.done || !st.ownSlots) return;
  st.revealed = !st.revealed;
  st.slots = st.revealed ? DND_CONFIG[screenId].correctOrder.slice() : st.ownSlots.slice();
  dndApplyFinalMarks(screenId);
  dndSyncRevealBtn(screenId);
}
