'use strict';
/* ═══════════════════ xAPI (720) — item scope + question ids ═══════════════════
   Shared by all six components of methodica-math-percent-06. Definition-only; 90-boot.js drives
   startup via bootXAPI(). Ported from methodica-math-percent-08 (5fe4b78), itself from
   methodica-math-ratio-01 (35648a6); the video functions from methodica-science-mass-weight-01. Design: Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md
   (§6 reporting, §8.2 the 'completed' ledger).

   Per-part seams read at CALL time (each component's own script.js declares them):
     SCREEN_TO_SUBCONTENT   screen -> [item suffix, page-in-item]; null = no catalog item
     XAPI_COMP_SLUG         e.g. 'methodica-math-percent-06-02'
     XAPI_ITEM_SLUG         optional; the slug the component's ITEM ids carry, when it differs from
                            XAPI_COMP_SLUG (see xapiItemId below). Defaults to XAPI_COMP_SLUG.
     XAPI_COMP_ID           XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/'
     XAPI_EVAL_ITEMS        items that carry a graded question IN CODE
     XAPI_ITEM_RESULT       optional; item suffix -> function returning an explicit result
     XAPI_HUB_SCREENS       optional; screens that are a HUB the learner returns to (see O-1)
   Every read is guarded with typeof, so a component that omits an optional one degrades to the
   neutral value instead of throwing inside a statement path — where the surrounding try/catch
   would swallow it and the statement would vanish silently. */

/* ── Item ids: <component id><item slug>-NNN/ ──
   Since 2026-10-20 every item carries its own component's slug and numbering (06-02 holds
   06-02-001..003, 06-03 holds 06-03-001..004, and so on), as MOE renumbered them in KATA and the
   MOE tester asked for in xAPI. Until then items kept the script's numbering (06-02 held
   06-01-005..007) and each component declared XAPI_ITEM_SLUG. No component declares it now; the
   seam stays for a unit whose item ids differ from the folder. A wrong slug names items that do
   not exist in the catalogue — a completely silent failure (guide §4.1). */
function xapiItemSlug(){
  if (typeof XAPI_ITEM_SLUG !== 'undefined' && XAPI_ITEM_SLUG) return XAPI_ITEM_SLUG;
  return (typeof XAPI_COMP_SLUG !== 'undefined') ? XAPI_COMP_SLUG : '';   // typeof: the report form calls this with reporting off too
}
function xapiItemId(suffix){ return XAPI_COMP_ID + xapiItemSlug() + '-' + suffix + '/'; }
function _xapiTrim(u){ return String(u == null ? '' : u).replace(/\/+$/, ''); }

/* Visible answer text for result.response. Clones first so the live DOM is untouched, and drops
   the nodes textContent would otherwise splice into the middle of a label — in this unit the
   option's radio dot (.scq-radio), image magnifier buttons (.img-zoom-btn) and any nested button.
   Stacked fractions (.gvi-fraction > .num + .den, every fraction in this unit) are read as
   'num/den' — textContent alone would report 3/11 as "311".
   ⚠️ The ONE project-specific function in this file (guide §6.3). */
function xapiAnswerText(el){
  if (!el) return '';
  var c = el.cloneNode(true);
  var drop = c.querySelectorAll('.img-zoom-btn, .scq-radio, button');
  for (var i = 0; i < drop.length; i++) { drop[i].remove(); }
  var brs = c.querySelectorAll('br');                 // a line break separates words — keep a space
  for (var b = 0; b < brs.length; b++) { brs[b].replaceWith(' '); }
  var fr = c.querySelectorAll('.gvi-fraction');
  for (var j = 0; j < fr.length; j++) {
    var num = fr[j].querySelector('.num'), den = fr[j].querySelector('.den');
    if (num && den) fr[j].textContent = ' ' + num.textContent.trim() + '/' + den.textContent.trim() + ' ';
  }
  return c.textContent.replace(/\s+/g, ' ').trim();
}

/* Question context. metadata/<component>.json is the single source of truth for question ids:
   look up subContent[<suffix>].questions[<qKey>] and return that questionId as-is when it is
   already absolute. Item matching is by '-NNN' suffix with trailing slashes normalised away, so
   re-syncing metadata from Kata can change the URL prefix without touching code. */
function xapiQ(suffix, qKey){
  var itemId = xapiItemId(suffix);
  var qid = null;
  try {
    var sc = (window.METADATA && window.METADATA.subContent) || [];
    for (var i = 0; i < sc.length; i++) {
      if (_xapiTrim(sc[i].id).slice(-(suffix.length + 1)) !== '-' + suffix) continue;
      var qs = sc[i].questions || [];
      for (var j = 0; j < qs.length; j++) {            // match the key, bare or in URL form
        var v = _xapiTrim(qs[j].questionId);
        if (v === qKey || v.slice(-(qKey.length + 1)) === '/' + qKey) { qid = qs[j].questionId; break; }
      }
      if (qid == null) {                               // fallback: positional, 'q3' -> index 2
        var n = parseInt(String(qKey).replace(/\D/g, ''), 10);
        if (n >= 1 && n <= qs.length) qid = qs[n - 1].questionId;
      }
      break;
    }
  } catch (e) {}
  if (qid == null) { console.warn('[xAPI] no metadata question', suffix, qKey); qid = qKey; }
  return { questionId: /^https?:\/\//.test(qid) ? qid : itemId + qid, parentId: itemId };
}

/* Per-question outcome, keyed '<item>/<q>'. Written by every answered site (outside its
   try/catch, so a reporting failure cannot corrupt the score) and read when the component
   'completed' is assembled. The library's own aggregate is an all-correct AND, which would
   report success:false for any partial pass, so a component that needs a partial score supplies
   its result explicitly. */
var XAPI_Q_RESULTS = {};
function xapiCorrectCount(){ return Object.keys(XAPI_Q_RESULTS).filter(function(k){ return XAPI_Q_RESULTS[k]; }).length; }

var xapiCurrentItem = null;

/* The item suffix of a screen — by its section id ('s28'), or the current screen when omitted.
   The same SCREEN_TO_SUBCONTENT the item scope uses, so an 'answered' always names the item that
   xapiOnScreen opened. null for an unmapped screen. */
function xapiItemOf(screenId){
  try {
    var el = screenId ? document.getElementById(screenId) : null;
    var n = el ? parseInt(el.getAttribute('data-screen'), 10) : currentScreen;
    var m = (typeof SCREEN_TO_SUBCONTENT !== 'undefined') ? SCREEN_TO_SUBCONTENT[n] : null;
    return m ? m[0] : null;
  } catch (e) { return null; }
}

/* This component's graded questions, from metadata: ['005/q1', '007/q1', …] for every question
   declared under an item in XAPI_EVAL_ITEMS. The score denominator — what the learner was told
   they are tested on is exactly what the catalogue declares (guide §6.4). [] before the metadata
   has loaded (reporting off), which only ever feeds a result nobody sends. */
function xapiGradedKeys(){
  var out = [];
  try {
    var sc = (window.METADATA && window.METADATA.subContent) || [];
    for (var i = 0; i < sc.length; i++) {
      var sfx = _xapiTrim(sc[i].id).slice(-3);
      if (!_xapiIsEval(sfx)) continue;
      var qs = sc[i].questions || [];
      for (var j = 0; j < qs.length; j++) out.push(sfx + '/' + _xapiTrim(qs[j].questionId).split('/').pop());
    }
  } catch (e) {}
  return out;
}

/* An explicit result for an item's 'completed'. The library's own is an all-correct AND over the
   'answered' of THIS page load — it knows nothing about answers restored by a resume. So every
   graded item reports from XAPI_Q_RESULTS over its declared questions (the ratio-01 / percent-08
   pattern): success = all correct, scaled = correct / declared; an unanswered question counts as
   not correct. A component may still override one item through XAPI_ITEM_RESULT (suffix -> fn).
   Ungraded items return null (no result on their 'completed'). */
function xapiItemResult(item){
  var map = (typeof XAPI_ITEM_RESULT !== 'undefined') ? XAPI_ITEM_RESULT : null;
  var f = map && map[item];
  if (f) return f();
  if (!_xapiIsEval(item)) return null;
  var keys = xapiGradedKeys().filter(function(k){ return k.split('/')[0] === item; });
  if (!keys.length) return null;
  var n = keys.filter(function(k){ return !!XAPI_Q_RESULTS[k]; }).length;
  return { success: n === keys.length, score: { scaled: n / keys.length } };
}

/* The component result: scaled = correct graded questions / all graded questions of the component
   (xapiGradedKeys), from the same XAPI_Q_RESULTS the 'answered' statements carried, so the two can
   never disagree. success comes from the caller — the pass mark the SCREEN promised, which is not
   the score (a gate narrower than the denominator gives two learners the same scaled with
   opposite success; guide §6.4). */
function xapiComponentResult(success){
  var keys = xapiGradedKeys();
  var n = keys.filter(function(k){ return !!XAPI_Q_RESULTS[k]; }).length;
  return { success: !!success, score: { scaled: keys.length ? n / keys.length : 0 } };
}

function _xapiIsEval(item){
  return (typeof XAPI_EVAL_ITEMS !== 'undefined') && !!XAPI_EVAL_ITEMS[item];
}

/* ── Re-arm the library's per-page-load 'answered' memory after a restore ──────────────
   xapi-720-k.js gates an item's 'completed' on xapiItemAnswered[itemId], a map it fills ONLY
   from an 'answered' passing through in the SAME page load:

       if (sttmContext?.expectsAnswer && !xapiItemAnswered[_cid]) {
           console.log("[XAPI] item left unanswered — deferring 'completed': " + _cid);
           return;          // "deferring" is a DROP — there is no queue, flush or retry

   That guard is right within a session: it stops a learner who leaves a question backwards
   through goBack() from emitting a resultless 'completed' that would then block the real,
   scored one. But a resume deliberately does NOT re-send the answers it restores, so without
   the seeding below the library treats every previously answered item as unanswered and drops
   its 'completed' — while sendStatementOnce, having called the sender, marks the ledger sent.
   The lomda then never asks again, the library never retries, and the statement is lost for
   good. Verified live against Kata on 07.09.26: the ledger said sent while the library's own
   xapiCompletedObjects was still empty.

   Seeding puts the library back where it would have been had the learner never left. It emits
   nothing itself — it only unblocks the guard, and the 'completed' that follows carries the
   explicit result xapiItemResult() supplies, so nothing rides on the library's own scoring.

   Only items with a RECORDED ANSWER are seeded, so an item the learner never answered is still
   deferred and the goBack protection above is preserved.

   ⚠️ Must run after applyResumeVars (which repopulates XAPI_Q_RESULTS) and before any item
   boundary can be crossed. applyExecutionState calls it as its last act. */
function xapiSeedAnsweredFromResume(){
  if (!window.XAPI_USING_G) return;
  /* A silent no-op here would reintroduce the bug invisibly, so say so: the map is a plain
     global today, and would stop being reachable if the library moved it to const/let. */
  if (!window.xapiItemAnswered) {
    console.warn('[xAPI] xapiItemAnswered unreachable — item "completed" will be dropped after a resume');
    return;
  }
  Object.keys(XAPI_Q_RESULTS).forEach(function(k){
    var item = k.split('/')[0];
    if (item) window.xapiItemAnswered[xapiItemId(item)] = true;
  });
}

/* ── B-1 (live Kata run 2026-09-27, QA/2026-09-27/REPORT.md) ──
   The library DROPS an evaluated item's 'completed' when that item has no 'answered' in this page
   load (the "deferring" return quoted above — no queue, no retry). sendStatementOnce cannot see
   that: it marks the ledger anyway, and the real, scored 'completed' — after the learner comes
   back and answers — is then suppressed forever. Found live on the Arabic sibling
   methodica-ar-math-ratio-01, component 02: a reload onto s17 (item 003) then Back to s16 before
   answering; Kata never received 003's 'completed'. This unit shares that code path unchanged.
   So the close asks the library's own question first and, when the library would drop the
   statement, sends nothing and leaves the ledger untouched. Fallback when the map is unreachable:
   an answer recorded in XAPI_Q_RESULTS (restored by resume, same predicate as the seed above).
   Port of methodica-science-mass-weight-01 5ad764d. */
function _xapiLibWouldDrop(item) {
  if (!_xapiIsEval(item)) return false;
  var m = window.xapiItemAnswered;
  if (m) return !m[xapiItemId(item)];
  return !Object.keys(XAPI_Q_RESULTS).some(function (k) { return k.split('/')[0] === item; });
}
function _xapiCloseItem(item) {
  if (_xapiLibWouldDrop(item)) return;
  try { sendCompletedOnce('doneItems', itemLedgerKey(item), 'question', xapiItemResult(item), { objectId: xapiItemId(item), expectsAnswer: _xapiIsEval(item) }); } catch (e) {}
}

/* ── O-1 (live Kata run 2026-09-27, QA/2026-09-27/REPORT.md) ──
   An item is completed when the learner leaves it FORWARD, into a later item — or at the
   component's end (xapiFinishItems). Going Back into an earlier item re-opens that one
   ('initialized', as v2.4 requires on re-entry) but closes nothing: live, Back from s5 to s4 in
   component 01 reported item 003 completed after one of its seven screens. The item stepped
   back from stays open and closes when the learner passes it forward again; screens are gated in
   order, so every item is passed forward before the component can finish. Items are numbered
   '001', '002', … in screen order, so "earlier" is a numeric comparison.

   ── The hub exception (from percent-08) ──
   A screen that is a HUB the learner returns to (percent-08's map screen) would read as a step
   back into an earlier item and leave the finished item open. Entering a screen listed in the
   part's XAPI_HUB_SCREENS is therefore never backward. No component of percent-06 has a hub; the
   seam is inert here. Item suffixes are compared numerically, which holds in every component of
   this unit (their items are numbered in screen order, e.g. 005-007 in 06-02). */
function _xapiIsBackward(fromItem, toItem, toScreen) {
  if (typeof XAPI_HUB_SCREENS !== 'undefined' && XAPI_HUB_SCREENS && XAPI_HUB_SCREENS[toScreen]) return false;
  return !!(fromItem && toItem && Number(toItem) < Number(fromItem));
}

/* Item-level initialized/completed pairs, driven from goTo(). Paging inside one item emits
   nothing; the item closes when the learner moves forward into a screen of a later item. */
function xapiOnScreen(screen){
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  var map = (typeof SCREEN_TO_SUBCONTENT !== 'undefined') ? SCREEN_TO_SUBCONTENT[screen] : null;
  var item = map ? map[0] : null;
  if (item === xapiCurrentItem) return;
  if (xapiCurrentItem && !_xapiIsBackward(xapiCurrentItem, item, screen)) _xapiCloseItem(xapiCurrentItem);
  xapiCurrentItem = item;
  if (item) {
    try { sendStatement720('initialized', 'question', null, { objectId: xapiItemId(item), isEvaluationItem: _xapiIsEval(item) }); } catch (e) {}
  }
}

/* Close the last open item — called immediately before every component 'completed'. */
function xapiFinishItems(){
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  if (xapiCurrentItem) {
    _xapiCloseItem(xapiCurrentItem);
    /* Cleared whether or not the statement was suppressed: a latch left set would make the next
       xapiOnScreen try to close the same item all over again. */
    xapiCurrentItem = null;
  }
}

/* ═══════════════════ The call-site helpers ═══════════════════
   In this unit each component's own check / hint functions (scqCheck, dndCheck, tqCheck, …, in its
   script.js) call these directly — one line per site (guide §6.3).

   ⚠️ The write to XAPI_Q_RESULTS happens BEFORE the try/catch and outside it, not inside. That is
   an invariant from Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md §2: a reporting failure must not be able to
   corrupt the score. It is now enforced in one place rather than relied on at 25 call sites. */

/* ── Answer-text builders, for question types that are not single choice ──
   result.response should carry what the learner actually answered. For single choice that is
   xapiAnswerText(optEl); drag and field questions need to describe a state rather than one
   element. All three are deliberately generic so they can move between units unchanged. */

/* A drag board: for each zone, the items the learner dropped in it.
   'ton: locomotive | kg: giant turtle | gram: apple, grain of salt'
   ⚠️ Hard-codes '<prefix>-zone-<id>'; the drag tables of 06-05 / 06-06 use slots instead and
   build their answer text inline. Kept so this file stays close to the family copy. */
function xapiZoneAnswer(prefix, zoneIds){
  try {
    return zoneIds.map(function(z){
      var el = document.getElementById(prefix + '-zone-' + z);
      var items = el ? el.querySelectorAll('[class*="drag-item"], [class*="placed-card"]') : [];
      var names = [];
      for (var i = 0; i < items.length; i++) names.push(xapiAnswerText(items[i]));
      return z + ': ' + (names.join(', ') || '—');
    }).join(' | ');
  } catch (e) { return ''; }
}

/* A group of inputs or dropdowns. `values` is optional — without it .value is read from the DOM.
   's18-input-1=1400 | s18-input-2=900' */
function xapiFieldsAnswer(ids, values){
  try {
    return ids.map(function(id){
      var v = values ? values[id] : (document.getElementById(id) || {}).value;
      return id + '=' + (v == null || v === '' ? '—' : v);
    }).join(' | ');
  } catch (e) { return ''; }
}

/* Multiple choice: the labels of the selected options, via the screen's own lookup function. */
function xapiMultiAnswer(ids, optElFn){
  try {
    return (ids || []).map(function(id){
      return xapiAnswerText(optElFn(id)) || String(id);
    }).join(', ');
  } catch (e) { return ''; }
}

/* Report one graded answer.
     item      the item suffix, e.g. '005'
     qKey      the question key, e.g. 'q1'
     correct   whether the answer is correct
     isLast    whether this is the final answer to the question (correct, or attempts exhausted).
               Only 'answered.last' enters the component score denominator.
     answer    the learner's answer text, as they see it */
function xapiAnswered(item, qKey, correct, isLast, answer){
  XAPI_Q_RESULTS[item + '/' + qKey] = !!correct;
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try {
    sendStatement720(isLast ? 'answered.last' : 'answered', 'question',
      { success: !!correct,
        score: { scaled: correct ? 1 : 0 },
        extensions: { student_answer: [answer == null ? '' : String(answer)] } },
      xapiQ(item, qKey));
  } catch (e) { console.error('[xAPI] answered ' + item + '/' + qKey, e); }
}

/* The (item/qKey) pairs already reported with 'requested.1' during THIS page load. Same key
   xapiAnswered uses for XAPI_Q_RESULTS. */
var XAPI_HINTS_SENT = {};

/* A hint request. ⚠️ Place only in the branch where the hint is actually being OPENED. Hints here
   are overlays whose `hidden` is toggled, and calling this on the toggle would report a second
   request on every close.

   ── Dedupe: once per question ──
   Opening alone is not enough. The hint overlay closes with its button and with Escape and both
   can leave the hint button live, so a learner who opened a hint twice would report
   'requested.1' twice.

   ── Scope: the whole unit attempt ──
   XAPI_HINTS_SENT alone is cleared on reload, which used to mean a learner who refreshed and
   reopened the same hint reported 'requested.1' a second time. Every cross-part 'חזרה' is also a
   fresh page load, so this happened in normal use and not only on a manual refresh. The keys now
   live in the state document too, under `hints`, through the same sendStatementOnce the
   'completed' ledger uses — so they survive a reload, a cross-part hop and a tab close.
   XAPI_HINTS_SENT stays in front of it as the in-memory fast path, so a repeat click costs no
   document read.

   Two orderings matter:
   - The memory latch is set only when sendStatementOnce reports the key SETTLED. While a restore
     is in flight it returns false and sends nothing, so latching there would swallow the
     learner's first real hint of the session.
   - Both latches sit after the XAPI_USING_G guard, so neither records a statement that never
     left. */
function xapiRequestedHint(item, qKey){
  var _k = item + '/' + qKey;
  if (XAPI_HINTS_SENT[_k]) return;
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try {
    if (typeof sendStatementOnce === 'function') {
      /* Fails OPEN: with no document alreadySent() is false, so the hint is still reported. */
      if (sendStatementOnce('hints', _k, 'requested.1', 'question', null, xapiQ(item, qKey))) {
        XAPI_HINTS_SENT[_k] = true;
      }
      return;
    }
    sendStatement720('requested.1', 'question', null, xapiQ(item, qKey));
    XAPI_HINTS_SENT[_k] = true;
  } catch (e) { console.error('[xAPI] requested ' + _k, e); }
}

/* The component 'completed'. Closes the open item first, then reports through the ledger.
   ⚠️ Must be called on failure paths too. A component the learner did not pass still has to be
   reported, otherwise their whole attempt goes unrecorded — routing a failing learner is the
   platform's job, via the component's recommendedAfterFail (guide §6.5). */
function xapiCompleteComponent(result){
  try { xapiFinishItems(); } catch (e) {}
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', result || null);
  } catch (e) { console.error('[xAPI] completed component', e); }
}

/* The last screen's button: report the component, then stop. Kata removes the component on
   'completed' (v2.7 p.23) and routes on it; outside Kata the disabled button is the only sign the
   click landed. Each component's last-screen button ends here — the cross-component hop that
   used to follow lives on only under DEV_NAV (10-identity.js). There is no unit-level statement any more
   (the xapiCompleteUnit that stood here until 2026-09-16): v2.5/v2.7 define object as item or
   component only, and the platform derives unit state itself. */
function xapiEndComponent(result, btn){
  xapiCompleteComponent(result);
  if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
}

/* The ended look, re-applied (QA/2026-09-20 D-8). xapiEndComponent disables the button once, at
   the click; a reload, or stepping back and forward onto the last screen, repaints it, and the
   painters relabel it שנמשיך? and ENABLE it. The done ledger already swallowed the duplicate
   'completed' such a click would send, so this was never a data problem, but the screen said the
   work was not recorded. The ledger is the authority here too: disabled only once this
   component's 'completed' is recorded in the state document, never merely because the learner
   is on the last screen. repaintScreen / applyExecutionState (40-resume.js) call it after every
   repaint. Per-part seam: lastScreenButton() returns the button whose click ends the component. */
function restoreEndedButton() {
  if (currentScreen !== TOTAL_SCREENS - 1) return;
  if (!alreadySent('done', currentPartSlug())) return;
  var btn = typeof lastScreenButton === 'function' ? lastScreenButton() : null;
  if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
}


/* ═══════════════════ Video: played / paused ═══════════════════
   objectId is the ITEM (15.09.26, test team): the library builds object.id from
   sttmContext.objectId and ignores questionId for these two verbs, so without it the component id
   was sent (720-common-lib/_test/video-object-id.js). ⚠️ MOE's "דוגמאות XAPI" §6/§7 show a
   component id; written confirmation is still open (Documentation/MOE/NOTE-TO-MOE-played-paused-object-id.md).

   ── HTML5 <video>: opt-in only ──
   Only video[data-xapi-report="NNN"] is wired. Every <video> in this unit today is a decorative
   autoplay/loop/muted character clip (01 s13 and s25, 02 s27, 03 s32 and s36, 04 s42, 05 s48,
   06 s54) and carries no attribute, so none reports. Two rules bind anything ever opted in:
     - never opt in a `loop` video — every iteration would report a 'played';
     - never load() / swap src on a reported video while it plays — the 'pause' that fires is not
       the learner's ('emptied' guards the common ordering).
   State machine from methodica-science-mass-weight-01 (port 1 of the guide, §0 / §6.9.2) instead
   of the pausedOnce latch, which swallowed the first 'played' of every viewing (MOE, 17.09.26). */
function xapiWireVideos() {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  document.querySelectorAll('video[data-xapi-report]').forEach(function (v) {
    if (v.__xapiWired) return; v.__xapiWired = true;
    var item = v.getAttribute('data-xapi-report');
    var ctx  = { objectId: xapiItemId(item) };   // the ITEM this video belongs to
    var playing   = false;  // a 'played' is open, not yet closed by a 'paused'
    var reloading = false;  // a load()/src swap is in flight: its 'pause' is not the learner
    function send(verb) {
      try { sendStatement720(verb, 'question', null, Object.assign({ time: v.currentTime }, ctx)); } catch (e) {}
    }
    v.addEventListener('emptied', function () { reloading = true; });
    v.addEventListener('play', function () {
      reloading = false;
      if (playing) return;                           // already open: nothing started
      playing = true;
      send('played');
    });
    v.addEventListener('pause', function () {
      if (!playing) return;                          // nothing open -> an orphan is impossible
      playing = false;
      if (v.ended) return;                           // end of clip, not a learner pause
      if (reloading || v.readyState === 0) return;   // load()/src swap, not a learner pause
      send('paused');
    });
    v.addEventListener('ended', function () { playing = false; });
  });
}

/* ── YouTube: onStateChange of the IFrame Player API (guide §6.9.2) ──
   One flag per PLAYER instance: __xapiPlaying = "a 'played' is open, not yet closed by 'paused'".
   'played' goes out only while the flag is off, 'paused' only while it is on, so the first
   'played' of every viewing is sent, an orphan 'paused' is impossible, and a seek
   (BUFFERING -> PLAYING while playing) is silent. ENDED re-arms the flag and reports nothing.
   The caller passes the item suffix. ⚠️ No component of percent-06 embeds YouTube today, so
   nothing calls this. Whoever adds one: static iframe markup, YT.Player attached to the finished
   element with no videoId / playerVars, so the API never builds an iframe and never appends
   `forigin` carrying the launch URL (QA D-1, guide §6.9.1). */
function xapiYouTubeState(e, item) {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  if (!item) { console.warn('[xAPI] youtube state with no item suffix -- not reporting'); return; }
  var p = e && e.target;
  if (!p) return;
  var t = (typeof p.getCurrentTime === 'function') ? p.getCurrentTime() : undefined;
  var ctx = { time: t, objectId: xapiItemId(item) };
  if (e.data === YT.PlayerState.PLAYING) {
    if (p.__xapiPlaying) return;          // a seek mid-play — already open
    p.__xapiPlaying = true;
    try { sendStatement720('played', 'question', null, ctx); } catch (_) {}
  } else if (e.data === YT.PlayerState.PAUSED) {
    if (!p.__xapiPlaying) return;         // nothing open — never send an orphan
    p.__xapiPlaying = false;
    try { sendStatement720('paused', 'question', null, ctx); } catch (_) {}
  } else if (e.data === YT.PlayerState.ENDED) {
    p.__xapiPlaying = false;              // re-arm for a replay; ENDED itself is not reported
  }
}
