// ============================================================
//  UNIT MANIFEST — methodica-math-percent-06
//  Single source of truth for "how many components, how many screens
//  each, in what order" — read by the production root shell (index.html +
//  unit-shell.js) to compute global<->local screen offsets WITHOUT ever
//  needing to load all 6 component iframes simultaneously just to sum
//  their live DEV_READY totals.
//
//  `screens` here must match each component's own TOTAL_SCREENS (see that
//  component's script.js) — this is metadata ABOUT the components, not a
//  second copy of their content. If a component's screen count changes,
//  update the single number here.
//
//  `firstScreenId` is the id of that component's own screen 0 (from its
//  index.html) — used only as a fallback fingerprint if the shell ever
//  needs to re-detect which component is currently loaded (e.g. after an
//  internal sibling-folder navigation like goToComponent02() that the
//  shell didn't itself initiate). Not a duplicate of component content,
//  just one identifying string per component.
// ============================================================
(function (global) {
  'use strict';

  var COMPONENTS = [
    { id: '06-01', path: 'methodica-math-percent-06-01/index.html', screens: 18, firstScreenId: 'hook1' },
    { id: '06-02', path: 'methodica-math-percent-06-02/index.html', screens: 4,  firstScreenId: 's27' },
    { id: '06-03', path: 'methodica-math-percent-06-03/index.html', screens: 6,  firstScreenId: 's32' },
    { id: '06-04', path: 'methodica-math-percent-06-04/index.html', screens: 5,  firstScreenId: 's42' },
    { id: '06-05', path: 'methodica-math-percent-06-05/index.html', screens: 5,  firstScreenId: 's48' },
    { id: '06-06', path: 'methodica-math-percent-06-06/index.html', screens: 6,  firstScreenId: 's54' }
  ];

  // Offsets computed from the array above — never hardcoded.
  var offset = 0;
  COMPONENTS.forEach(function (c) {
    c.offset = offset;
    offset += c.screens;
  });
  var TOTAL_UNIT_SCREENS = offset;

  function globalToLocal(globalScreen) {
    for (var i = 0; i < COMPONENTS.length; i++) {
      var c = COMPONENTS[i];
      if (globalScreen >= c.offset && globalScreen < c.offset + c.screens) {
        return { componentIndex: i, localScreen: globalScreen - c.offset };
      }
    }
    // Out-of-range — clamp to the nearest valid edge rather than silently
    // returning undefined (a QA tool probing boundaries should land
    // somewhere sane, not break the bridge).
    if (globalScreen < 0) return { componentIndex: 0, localScreen: 0 };
    var last = COMPONENTS[COMPONENTS.length - 1];
    return { componentIndex: COMPONENTS.length - 1, localScreen: last.screens - 1 };
  }

  function localToGlobal(componentIndex, localScreen) {
    return COMPONENTS[componentIndex].offset + localScreen;
  }

  global.UNIT_MANIFEST = {
    COMPONENTS: COMPONENTS,
    TOTAL_UNIT_SCREENS: TOTAL_UNIT_SCREENS,
    globalToLocal: globalToLocal,
    localToGlobal: localToGlobal
  };
})(window);
