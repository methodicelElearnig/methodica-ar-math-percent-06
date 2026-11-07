'use strict';

/* ============================================================
   unit-js/dev-nav.js — the per-component dev navigator (sidebar screen
   list + bottom bar, Ctrl+←/→), shared by every <component>/index_dev.html.
   Dev-only: never loaded by a learner page, never shipped.

   The page supplies, before loading this file:
     window.DEV_NAV_CONFIG = {
       label:       'DEV — 06-02',          // bottom-bar tag
       screenNames: { s27: 'Transition' },  // sidebar names by screen id
       excluded:    [],                     // screen ids hidden from the list
       note:        ''                      // optional sidebar note (HTML text)
     };
   It talks to the component in #lomdah-frame over the DEV_READY / DEV_STATE /
   DEV_GOTO / DEV_RESET postMessage protocol (see notifyDevHost() in
   05-core.js). Phase 1e, 2026-09-30.
   ============================================================ */

var DEV_CFG = window.DEV_NAV_CONFIG || {};

document.body.insertAdjacentHTML('afterbegin',
  '<div id="dev-layout">' +
    '<aside id="dev-sidebar">' +
      '<div id="dev-sidebar-header">שקפים</div>' +
      '<ul id="dev-sidebar-list"></ul>' +
      (DEV_CFG.note ? '<div id="dev-note"></div>' : '') +
    '</aside>' +
    '<iframe id="lomdah-frame" src="index.html"></iframe>' +
  '</div>' +
  '<div id="dev-bar">' +
    '<span id="dev-hint">Ctrl+← / Ctrl+→</span>' +
    '<button id="btn-next" onclick="devNext()" title="מסך הבא (Ctrl+←)">◀</button>' +
    '<div id="dev-datalist-wrap">' +
      '<input id="dev-screen-input" type="number" min="0" max="0" value="0" list="dev-screen-options"' +
      ' title="הקלד מספר מסך לקפיצה ישירה" onchange="devJump(this.value)">' +
      '<datalist id="dev-screen-options"></datalist>' +
    '</div>' +
    '<span id="dev-total">/ 0</span>' +
    '<span id="dev-screen-name">–</span>' +
    '<button id="btn-prev" onclick="devPrev()" title="מסך קודם (Ctrl+→)">▶</button>' +
    '<button id="btn-reset" onclick="devReset()" title="אפס את מצב המסך הנוכחי">↺ Reset</button>' +
    '<span id="dev-label"></span>' +
  '</div>');
document.getElementById('dev-label').textContent = DEV_CFG.label || 'DEV';
if (DEV_CFG.note) document.getElementById('dev-note').textContent = DEV_CFG.note;

var screens = [];
var frame      = document.getElementById('lomdah-frame');
var inputEl    = document.getElementById('dev-screen-input');
var totalLabel = document.getElementById('dev-total');
var nameLabel  = document.getElementById('dev-screen-name');
var btnPrev    = document.getElementById('btn-prev');
var btnNext    = document.getElementById('btn-next');
var optionsEl  = document.getElementById('dev-screen-options');
var sidebarListEl = document.getElementById('dev-sidebar-list');
var devCurrent = 0;
var maxRealIndex = 0;

var DEV_EXCLUDED_SCREEN_IDS = DEV_CFG.excluded || [];

var SCREEN_NAMES = DEV_CFG.screenNames || {};

window.addEventListener('message', function (e) {
  if (!e.data) return;
  if (e.data.type === 'DEV_READY' || e.data.type === 'DEV_STATE') {
    screens = (e.data.screens || []).filter(function (s) {
      return DEV_EXCLUDED_SCREEN_IDS.indexOf(s.id) === -1;
    });
    devCurrent = typeof e.data.current === 'number' ? e.data.current : devCurrent;
    maxRealIndex = screens.length ? Math.max.apply(null, screens.map(function (s) { return s.index; })) : 0;
    totalLabel.textContent = '/ ' + maxRealIndex;
    inputEl.max = maxRealIndex;
    inputEl.value = devCurrent;
    rebuildOptions();
    rebuildSidebar();
    updateNameLabel();
    updateButtons();
  }
});

function rebuildOptions() {
  optionsEl.innerHTML = '';
  screens.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s.index;
    opt.label = s.id;
    optionsEl.appendChild(opt);
  });
}

function rebuildSidebar() {
  sidebarListEl.innerHTML = '';
  screens.forEach(function (s) {
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (s.index === devCurrent) ? 'active' : '';
    btn.onclick = function () { devGoTo(s.index); };

    var name = document.createElement('span');
    name.textContent = SCREEN_NAMES[s.id] || s.id;
    var idx = document.createElement('span');
    idx.className = 'dev-sidebar-idx';
    idx.textContent = s.index;

    btn.appendChild(name);
    btn.appendChild(idx);
    li.appendChild(btn);
    sidebarListEl.appendChild(li);
  });
}

function updateNameLabel() {
  var match = screens.find(function (s) { return s.index === devCurrent; });
  nameLabel.textContent = match ? match.id : ('s' + devCurrent);
}

function devGoTo(n) {
  n = Math.max(0, Math.min(maxRealIndex, n));
  frame.contentWindow.postMessage({ type: 'DEV_GOTO', screen: n }, '*');
  devCurrent = n;
  inputEl.value = n;
  updateNameLabel();
  updateButtons();
  rebuildSidebar();
}

function devCurrentPos() {
  for (var i = 0; i < screens.length; i++) {
    if (screens[i].index === devCurrent) return i;
  }
  return -1;
}

function devNext() {
  var pos = devCurrentPos();
  if (pos === -1 || pos >= screens.length - 1) return;
  devGoTo(screens[pos + 1].index);
}
function devPrev() {
  var pos = devCurrentPos();
  if (pos <= 0) return;
  devGoTo(screens[pos - 1].index);
}
function devReset() { frame.contentWindow.postMessage({ type: 'DEV_RESET' }, '*'); }

function devJump(val) {
  var n = parseInt(val, 10);
  if (isNaN(n)) return;
  var known = screens.some(function (s) { return s.index === n; });
  if (!known) return;
  devGoTo(n);
}

function updateButtons() {
  var pos = devCurrentPos();
  btnPrev.disabled = (pos <= 0);
  btnNext.disabled = (pos === -1) || (pos >= screens.length - 1);
}

window.addEventListener('keydown', function (e) {
  if (!e.ctrlKey) return;
  if (e.key === 'ArrowLeft')  { e.preventDefault(); devNext(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); devPrev(); }
});

inputEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') devJump(inputEl.value);
});

updateButtons();
