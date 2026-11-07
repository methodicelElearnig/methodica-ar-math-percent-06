// ============================================================
//  UNIT SHELL — methodica-math-percent-06 production root
//
//  Learner-facing: loads component 06-01 in a single full-viewport iframe
//  with no chrome. To a learner this is indistinguishable from opening
//  06-01/index.html directly.
//
//  QA-facing: if this shell is itself embedded in a QA tool's iframe, it
//  bridges the SAME DEV_READY/DEV_STATE/DEV_GOTO/DEV_RESET postMessage
//  protocol every component already speaks (see each component's own
//  script.js, "DEV MODE" section) — but in GLOBAL screen numbers (0..43)
//  instead of one component's local numbers (0..17, 0..3, ...). The
//  translation table is unit-manifest.js; this file never hardcodes
//  offsets or the total.
//
//  Cross-component navigation: every visited component keeps its own
//  iframe alive (hidden, not unloaded). A component's goToComponent()
//  asks the shell to move with a UNIT_NAV {dir:'prev'|'next'} message
//  once the shell has announced itself (UNIT_SHELL), so going back shows
//  the previous component exactly as the learner left it. Without the
//  shell, components fall back to plain sibling-folder page loads.
// ============================================================
(function () {
  'use strict';

  var MANIFEST = window.UNIT_MANIFEST;
  var COMPONENTS = MANIFEST.COMPONENTS;
  var TOTAL = MANIFEST.TOTAL_UNIT_SCREENS;

  // One iframe per visited component, created on first visit and kept
  // alive afterwards. `frame` is always the currently visible one.
  var firstFrame = document.getElementById('unit-frame');
  var frames = {};
  var frame = null;

  var currentComponentIndex = 0;   // which COMPONENTS[] entry the iframe currently shows
  var currentLocal = 0;            // that component's own last-reported `current`
  var pendingLocalGoto = null;     // local screen to send once the newly-loaded component's DEV_READY arrives
  var haveSeenReadyFor = -1;       // componentIndex we've received at least one DEV_READY/DEV_STATE for
  var componentScreenCache = {};   // componentIndex -> real {id,index}[] once known, for a richer global screen list

  var embeddedInParent = (window.parent !== window);

  // ---- component (child) -> shell ----------------------------------

  function isFromCurrentFrame(e) {
    return frame.contentWindow && e.source === frame.contentWindow;
  }

  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.type) return;

    if (isFromCurrentFrame(e)) {
      if (e.data.type === 'UNIT_NAV') { handleUnitNav(e.data.dir); return; }
      if (e.data.type === 'DEV_READY') announceShell(e.source);
      handleComponentMessage(e.data);
      return;
    }

    if (embeddedInParent && e.source === window.parent) {
      handleParentMessage(e.data);
    }
  });

  var pathDetectionUnavailableWarned = false;

  // Ground truth for "which component is actually loaded": the iframe's own
  // location.pathname, read at message time (same-origin sibling folders,
  // so this is available — no window.top assumptions, no reliance on a
  // separate 'load' listener whose timing can't be trusted against an
  // inline script.js that fires DEV_READY during parsing, before the
  // iframe's 'load' event). Falls back to fingerprint matching only if the
  // read throws (unexpected origin restriction) or matches no known path.
  function detectComponentFromLocation() {
    var win = frame.contentWindow;
    if (!win) return -1;
    var path;
    try {
      path = win.location.pathname;
    } catch (err) {
      if (!pathDetectionUnavailableWarned) {
        pathDetectionUnavailableWarned = true;
        console.warn('[unit-shell] cannot read iframe location (origin-restricted); ' +
          'falling back to DEV_READY fingerprint matching to detect the active component.', err);
      }
      return -1;
    }
    for (var i = 0; i < COMPONENTS.length; i++) {
      var dir = COMPONENTS[i].path.split('/')[0];
      if (path.indexOf('/' + dir + '/') !== -1 || path.indexOf(dir + '/') === 0) return i;
    }
    return -1;
  }

  function handleComponentMessage(data) {
    if (data.type !== 'DEV_READY' && data.type !== 'DEV_STATE') return;

    // Reconcile which component this actually is. Normally it's whatever
    // the shell itself last set as iframe.src (currentComponentIndex is
    // already correct) — but a component's OWN internal handoff
    // (goToComponent0N() doing window.location.href on its own window)
    // navigates the iframe without the shell calling loadComponent(), so
    // the DEV_READY that follows may belong to a different component than
    // the shell thinks. Resolve this from the iframe's real URL first;
    // only fall back to total+firstScreenId fingerprint matching if the
    // URL can't be read or doesn't match any known component path.
    var detected = detectComponentFromLocation();
    if (detected !== -1) {
      if (detected !== currentComponentIndex && frames[currentComponentIndex] === frame) {
        // The frame navigated itself to another component (standalone
        // fallback fired before UNIT_SHELL arrived) — re-key it.
        delete frames[currentComponentIndex];
        if (frames[detected] && frames[detected] !== frame) frames[detected].remove();
        frames[detected] = frame;
      }
      currentComponentIndex = detected;
    } else if (!componentMatches(currentComponentIndex, data)) {
      var recovered = recoverComponentIndex(data);
      if (recovered !== -1) {
        currentComponentIndex = recovered;
      } else {
        console.warn('[unit-shell] could not identify active component from URL or fingerprint; ' +
          'keeping previous component index (' + currentComponentIndex + ').', data);
      }
    }

    haveSeenReadyFor = currentComponentIndex;
    currentLocal = typeof data.current === 'number' ? data.current : 0;
    lastLocalByComponent[currentComponentIndex] = currentLocal;
    if (Array.isArray(data.screens)) componentScreenCache[currentComponentIndex] = data.screens;

    var globalCurrent = MANIFEST.localToGlobal(currentComponentIndex, currentLocal);
    emitToParent(data.type, globalCurrent);

    if (data.type === 'DEV_READY' && pendingLocalGoto !== null) {
      var n = pendingLocalGoto;
      pendingLocalGoto = null;
      frame.contentWindow.postMessage({ type: 'DEV_GOTO', screen: n }, '*');
    }
  }

  function componentMatches(componentIndex, data) {
    var c = COMPONENTS[componentIndex];
    if (!c) return false;
    if (typeof data.total === 'number' && data.total !== c.screens) return false;
    if (Array.isArray(data.screens) && data.screens[0] && data.screens[0].id !== c.firstScreenId) return false;
    return true;
  }

  function recoverComponentIndex(data) {
    var candidates = COMPONENTS.filter(function (c) { return c.screens === data.total; });
    if (candidates.length === 1) return COMPONENTS.indexOf(candidates[0]);
    if (candidates.length > 1 && Array.isArray(data.screens) && data.screens[0]) {
      var firstId = data.screens[0].id;
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].firstScreenId === firstId) return COMPONENTS.indexOf(candidates[i]);
      }
    }
    return -1; // couldn't disambiguate — keep previous index rather than guess wrong
  }

  // ---- shell -> parent (QA) ------------------------------------------

  function buildGlobalScreenList() {
    var list = [];
    COMPONENTS.forEach(function (c, i) {
      var cached = componentScreenCache[i];
      for (var local = 0; local < c.screens; local++) {
        var id = (cached && cached[local]) ? cached[local].id : (c.id + ':' + local);
        list.push({ index: c.offset + local, id: id });
      }
    });
    return list;
  }

  function emitToParent(type, globalCurrent) {
    if (!embeddedInParent) return;
    window.parent.postMessage({
      type: type,
      total: TOTAL,
      current: globalCurrent,
      screens: buildGlobalScreenList()
    }, '*');
  }

  // ---- parent (QA) -> shell -------------------------------------------

  function handleParentMessage(data) {
    if (data.type === 'DEV_GOTO') {
      var n = parseInt(data.screen, 10);
      if (isNaN(n)) return;
      var target = MANIFEST.globalToLocal(n);
      gotoGlobal(target.componentIndex, target.localScreen);
    } else if (data.type === 'DEV_RESET') {
      // Reset is scoped to "the current screen/component" in the existing
      // protocol (see each component's resetScreenState(currentScreen)) —
      // no global reset concept exists or is asked for, so just forward.
      frame.contentWindow.postMessage({ type: 'DEV_RESET' }, '*');
    }
  }

  function gotoGlobal(componentIndex, localScreen) {
    if (componentIndex === currentComponentIndex && haveSeenReadyFor === currentComponentIndex) {
      frame.contentWindow.postMessage({ type: 'DEV_GOTO', screen: localScreen }, '*');
    } else {
      pendingLocalGoto = localScreen;
      loadComponent(componentIndex);
    }
  }

  // ---- cross-component navigation (component -> shell) ---------------

  function announceShell(win) {
    if (win) win.postMessage({ type: 'UNIT_SHELL' }, '*');
  }

  function handleUnitNav(dir) {
    var target = currentComponentIndex + (dir === 'prev' ? -1 : 1);
    if (target < 0 || target >= COMPONENTS.length) return;
    loadComponent(target);
  }

  // Pauses any playing media in a frame that is being hidden, so a
  // character video/audio doesn't keep playing behind the visible one.
  function pauseMedia(f) {
    try {
      f.contentWindow.document.querySelectorAll('video, audio').forEach(function (m) { m.pause(); });
    } catch (err) { /* cross-origin or not loaded yet — nothing to pause */ }
  }

  function showFrame(f) {
    Object.keys(frames).forEach(function (k) {
      var other = frames[k];
      if (other === f) return;
      if (other.classList.contains('is-active')) pauseMedia(other);
      other.classList.remove('is-active');
      other.setAttribute('aria-hidden', 'true');
      other.tabIndex = -1;
    });
    f.classList.add('is-active');
    f.removeAttribute('aria-hidden');
    f.removeAttribute('tabindex');
    frame = f;
    try { f.contentWindow.focus(); } catch (err) { /* ignore */ }
  }

  function loadComponent(index) {
    currentComponentIndex = index;
    var existing = frames[index];
    if (existing) {
      // Already visited — reveal it as-is (its screen/answers/feedback are
      // untouched) and re-sync the QA parent with its current screen.
      showFrame(existing);
      haveSeenReadyFor = index;
      if (existing.contentWindow) {
        // Resize while hidden may have been missed; let it re-run scaleApp().
        try { existing.contentWindow.dispatchEvent(new Event('resize')); } catch (err) { /* ignore */ }
      }
      if (pendingLocalGoto !== null) {
        var n = pendingLocalGoto;
        pendingLocalGoto = null;
        existing.contentWindow.postMessage({ type: 'DEV_GOTO', screen: n }, '*');
      } else {
        emitToParent('DEV_STATE', MANIFEST.localToGlobal(index, currentLocalFor(index)));
      }
      return;
    }
    var f = (index === 0 && !frames[0] && firstFrame) ? firstFrame : document.createElement('iframe');
    f.className = 'unit-frame';
    f.title = document.title + ' — ' + COMPONENTS[index].id;
    if (!f.parentNode) document.body.appendChild(f);
    frames[index] = f;
    f.addEventListener('load', function () { announceShell(f.contentWindow); });
    haveSeenReadyFor = -1; // wait for a fresh DEV_READY from the newly-loaded document
    showFrame(f);
    // ?dev=1: this shell is a repo-only walkthrough tool (never deployed, 2026-09-28 rule), so its
    // components run with DEV_NAV on (unit-js/10-identity.js) — the cross-component hops and the
    // first screen's "חזרה" that production turns off stay live inside the shell.
    f.src = COMPONENTS[index].path + '?dev=1';
  }

  var lastLocalByComponent = {};
  function currentLocalFor(index) {
    return lastLocalByComponent[index] || 0;
  }

  // ---- initial state ---------------------------------------------------
  // No optimistic DEV_READY here. The manifest's total (44) is known
  // immediately, but the global `screens` list is only trustworthy once
  // 06-01 itself has reported in — before that, its 18-entry segment would
  // be nothing but 'c.id:local' placeholders with no real ids. Every
  // component fires its own DEV_READY unconditionally as soon as it loads
  // inside a frame (see each component's own script.js, "DEV MODE"
  // section) — that arrives at handleComponentMessage() above, which is
  // the FIRST point this shell emits anything to its own parent. That one
  // emission is authoritative: single DEV_READY, total 44, current 0, and
  // a 44-entry screens list with real ids for 06-01's segment (the rest
  // are still stable 'c.id:local' placeholders, resolved to real ids the
  // first time each later component is visited). No timeout — purely
  // event-driven on 06-01's real DEV_READY.
  loadComponent(0);
})();
