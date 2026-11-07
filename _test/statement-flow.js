/* ═══════════════════ statement-flow.js — behaviour, statements and resume ═══════════════════
   NOT DEPLOYED. Real boots (harness.js) against the local library stub, per component:
     flow    a scripted play (right / wrong / retried / hinted answers) -> every answered carries a
             questionId + parentId that exist in metadata; every graded item closes WITH a result;
             exactly one component 'completed' with the expected success / scaled; hints once; the
             verdict recorded; the ended button disabled, also after leave / re-enter (D-8); no
             duplicate 'completed'; no errors
     resume  play -> record the in-session revisit look of every screen -> "reload" (a new page
             with the same sessionStorage: the stub keeps the state document there) -> lands on
             the saved screen, sends no answered / completed / requested while restoring, EVERY
             screen identical to its in-session look; the end click reports once; after another
             reload the ended button is disabled (D-8)
     seed    B-1: answer s28 (02), reload onto it, "שנמשיך?" -> item 001 'completed' WITH its
             restored result, in the order component -> item initialized -> item completed
     migrate 02's results saved under the pre-2026-10-20 item suffixes (005..007) still count
             after a reload: the seed play with the document's qr keys rewritten to 005/...
     gate    03's segment-A gate: 0 of 2 -> the component ends there (success:false), stays on
             s3435, disabled after re-entry; 1 of 2 -> on to s36
   Run: NODE_PATH=<dir>/node_modules node _test/statement-flow.js
*/
'use strict';
const H = require('./harness.js');
const R = H.makeReporter('statement-flow');

const C = id => `document.getElementById('${id}').click()`;
const setv = (id, v, fn) => `(function(){var el=document.getElementById('${id}'); el.value='${v}'; ${fn}(el);})()`;
const tq = s => `(function(el){tqInput('${s}',el)})`;

/* Scripted plays — the same ones the browser runs used in Phase 3b / 3c. */
const FLOW = {
  '01': { expect: { success: true, scaled: 2 / 3 }, steps: ['goTo(3)', "lpSelect('a')", 'lpCheck()',
    "document.getElementById('lpv-input-1').value='50'", "document.getElementById('lpv-input-2').value='20'", 'lpvCheck()',
    'goTo(6)', "s15Select('a')", 'goTo(8)',
    "(function(){var b=document.querySelectorAll('#s17-panel-body .gvi-answer-box'); b[0].value='7'; b[1].value='70'; gviInput('s17'); gviSubmit('s17');})()",
    'goTo(10)', "(function(){var b=document.querySelectorAll('#s19-panel-body .gvi-answer-box'); b[0].value='80'; gviInput('s19'); gviSubmit('s19');})()",
    'goTo(12)', "(function(){var b=document.querySelectorAll('#s21-panel-body .gvi-answer-box'); b[0].value='70'; gviInput('s21'); gviSubmit('s21');})()",
    'goTo(14)', "s23Select('gal')", 'goTo(17)',
    "warmupInputs().forEach(function(el){ el.value = el.dataset.key==='garden' ? '20' : WARMUP_CORRECT[el.dataset.key]; })", 'warmupSubmit()',
    'warmupOpenHint()', 'warmupCloseHint()', 'warmupOpenHint()', 'warmupCloseHint()',
    "warmupInputs().forEach(function(el){ if(el.dataset.key==='garden') el.value='25'; })", 'warmupSubmit()', 'warmupSubmit()'],
    hints: 1 },
  '02': { expect: { success: false, scaled: 0.6 }, steps: ['goTo(1)', "scqSelect('s28','a')", C('s28-check'), C('s28-hint'), 'scqCloseHint()', C('s28-hint'), 'scqCloseHint()',
    "scqSelect('s28','b')", C('s28-check'), C('s28-check'), "scqSelect('s29','a')", C('s29-check'), "scqSelect('s29','b')", C('s29-check'), C('s29-check'),
    "(function(){var w=function(p){return [...document.querySelectorAll('#s30 .q3-part[data-part=\"'+p+'\"] .scq-opt')].map(function(o){return o.getAttribute('data-id')}).find(function(v){return v!==Q3_CORRECT[p]})}; q3Select('A',Q3_CORRECT.A); q3Select('B',w('B')); q3Select('C',w('C'));})()",
    C('s30-check'), "q3Select('B',Q3_CORRECT.B)", C('s30-check'), C('s30-check')], hints: 1 },
  '03': { expect: { success: true, scaled: 6 / 7 }, steps: ['goTo(1)',
    ...[['1', '15', '75', '75'], ['2', '18', '90', '90'], ['3', '20', '100', '100']].flatMap(([r, c, e, p]) => [setv('s33-r' + r + '-cnt', c, tq('s33')), setv('s33-r' + r + '-exp', e, tq('s33')), setv('s33-r' + r + '-pct', p, tq('s33'))]),
    C('s33-hint'), 'scqCloseHint()', C('s33-check'), 'goTo(2)',
    "clsSelect(1,'under')", "clsSelect(2,'under')", "clsSelect(3,'under')", C('s3435-check'), "clsSelect(2,'over')", C('s3435-check'), C('s3435-continue'), 'goTo(4)',
    ...[['1', '15'], ['2', '25'], ['3', '50'], ['4', '11']].map(([r, v]) => setv('s37-r' + r + '-pct', v, tq('s37'))), C('s37-check'),
    setv('s37-r4-pct', '10', tq('s37')), C('s37-check'), 'goTo(5)',
    "subSelect('a','asif')", C('tqs-a-check'),
    "(function(){var ids=[...document.querySelectorAll('#tqs-b .scq-opt')].map(function(o){return o.getAttribute('data-id')}).filter(function(i){return i!=='rate'}); subSelect('b',ids[0]); document.getElementById('tqs-b-check').click(); subSelect('b',ids[1]||ids[0]); document.getElementById('tqs-b-check').click();})()",
    C('s3839-continue')], hints: 1 },
  '04': { expect: { success: true, scaled: 0.75 }, steps: ['goTo(1)', "scqSelect('s43','a')", C('s43-check'), C('s43-check'),
    "scqSelect('s44','a')", C('s44-check'), C('s44-hint'), 'scqCloseHint()', "scqSelect('s44','b')", C('s44-check'), C('s44-check'),
    "scqSelect('s45','a')", C('s45-check'), "scqSelect('s45','b')", C('s45-check'), C('s45-check'), "scqSelect('s46','b')", C('s46-check'), C('s46-check')], hints: 1 },
  '05': { expect: { success: true, scaled: 0.75 }, steps: ['goTo(1)', "scqSelect('s49','b')", C('s49-check'), C('s49-check'),
    "(function(){var el=document.getElementById('s50-answer'); el.value='70'; cqInput('s50', el);})()", C('s50-check'), C('s50-hint'), 'scqCloseHint()',
    "(function(){var el=document.getElementById('s50-answer'); el.value='75'; cqInput('s50', el);})()", C('s50-check'), C('s50-check'),
    "dndPickChip('s51','gamma')", "dndSlotClick('s51',0)", "dndPickChip('s51','beta')", "dndSlotClick('s51',1)", "dndPickChip('s51','alpha')", "dndSlotClick('s51',2)", C('s51-check'), C('s51-check'),
    "scqSelect('s52','b')", C('s52-check'), "scqSelect('s52','c')", C('s52-check'), C('s52-check')], hints: 1 },
  '06': { expect: { success: true, scaled: 0.75 }, steps: ['goTo(2)', "mcqToggle('s56','b')", "mcqToggle('s56','c')", C('s56-check'), C('s56-check'),
    "scqSelect('s57','a')", C('s57-check'), C('s57-hint'), 'scqCloseHint()', "scqSelect('s57','b')", C('s57-check'), C('s57-check'),
    "dndPickChip('s58','z')", "dndSlotClick('s58',0)", "dndPickChip('s58','h')", "dndSlotClick('s58',1)", "dndPickChip('s58','t')", "dndSlotClick('s58',2)", C('s58-check'), C('s58-check'),  /* key 80/156/105 (script fix 30.09.26) */
    "scqSelect('s59','b')", C('s59-check'), C('s59-check')], hints: 1 },
};
/* Resume plays: finish most questions, leave the final click undone; land = the screen saved. */
const RESUME = {
  '01': { land: 8, steps: ["hook1Toggle(document.querySelector('#hook1 .hook1-opt').dataset.id)", 'hook1MainAction()',
    'goTo(3)', "lpSelect('a')", 'lpCheck()', "document.getElementById('lpv-input-1').value='50'", "document.getElementById('lpv-input-2').value='20'", 'lpvCheck()',
    'goTo(6)', "s15Select('a')", 'goTo(8)', "(function(){var b=document.querySelectorAll('#s17-panel-body .gvi-answer-box'); b[0].value='7'; b[1].value='71'; gviInput('s17'); gviSubmit('s17');})()",
    'goTo(10)', "(function(){var b=document.querySelectorAll('#s19-panel-body .gvi-answer-box'); b[0].value='80'; gviInput('s19'); gviSubmit('s19'); gviSubmit('s19');})()",
    'goTo(14)', "s23Select('dani')", 'goTo(17)',
    "warmupInputs().forEach(function(el){ el.value = el.dataset.key==='garden' ? '20' : WARMUP_CORRECT[el.dataset.key]; })", 'warmupSubmit()',
    "warmupInputs().forEach(function(el){ if(el.dataset.key==='garden') el.value='21'; })", 'warmupSubmit()'] },
  '02': { land: 2, steps: FLOW['02'].steps.slice(0, -1) },
  '03': { land: 2, steps: FLOW['03'].steps.filter(s => !/s3435-continue|s3839-continue/.test(s)).map(s => s === 'goTo(4)' ? 'goTo(3); goTo(4)' : s) },
  '04': { land: 2, steps: FLOW['04'].steps.slice(0, -1) },
  '05': { land: 2, steps: FLOW['05'].steps.slice(0, -1) },
  '06': { land: 3, steps: FLOW['06'].steps.slice(0, -1) },
};

const short = id => String(id || '').replace(/\/$/, '').split('/').pop();
async function fresh(c, tag) {
  const b = H.boot(c, { search: '?slxapi=1&registration=' + tag + '-' + c + '&xapiLib=../_test/xapi-720-k.js&resetState' });
  await b.ready;
  return b;
}
function play(b, steps, tag) {
  for (const s of steps) { try { b.run(s); } catch (e) { R.ok(tag, 'step runs: ' + s.slice(0, 60), false, e.message); } }
}
/* The look of the active screen: classes / disabled / hidden / values / aria-checked / feedback text. */
const SIG = `(function(){ var sec=document.querySelector('.screen.active'); return [sec].concat([].slice.call(sec.querySelectorAll('*'))).filter(function(e){ return !/^(SCRIPT|STYLE|svg|path)$/i.test(e.tagName); }).map(function(e){
  var cls=[].slice.call(e.classList).filter(function(c){ return !/^(is-pulsing|is-revealed|revealed|m-.*)$/.test(c); }).sort().join('.');
  return (e.id||e.tagName)+'|'+cls+'|'+(e.disabled?'D':'')+(e.hidden?'H':'')+'|'+(e.tagName==='INPUT'?e.value:'')+'|'+(e.getAttribute('aria-checked')||'')+'|'+(/panel-body|popup-title|popup-body/.test(e.id)?e.textContent.replace(/\\s+/g,' ').trim().slice(0,80):''); }); })()`;

(async () => {
  for (const c of H.COMPONENTS) {
    const meta = H.metadata(c);
    const qids = new Set(meta.subContent.flatMap(s => (s.questions || []).map(q => q.questionId)));
    const items = new Set(meta.subContent.map(s => s.id));
    // ── flow ──
    let tag = 'flow ' + c, b = await fresh(c, 'FLOW');
    play(b, FLOW[c].steps, tag);
    await H.sleep(200);
    const n = b.val('TOTAL_SCREENS');
    R.ok(tag, 'ended button disabled after the click', b.val('lastScreenButton().disabled') === true);
    b.run('goTo(' + (n - 2) + '); goTo(' + (n - 1) + ')');
    R.ok(tag, 'ended button disabled after leave / re-enter (D-8)', b.val('lastScreenButton().disabled') === true);
    const log = b.stmts();
    const ans = log.filter(s => /^answered/.test(s.verb));
    R.ok(tag, 'answers were reported', ans.length > 0);
    ans.forEach(s => {
      R.ok(tag, 'answered questionId in metadata: ' + short(s.opts.questionId), qids.has(s.opts.questionId), s.opts.questionId);
      R.ok(tag, 'answered parentId is an item: ' + short(s.opts.parentId), items.has(s.opts.parentId));
    });
    const evals = Object.keys(b.json('XAPI_EVAL_ITEMS'));
    evals.forEach(e => {
      const cl = log.filter(s => s.verb === 'completed' && s.objectType === 'question' && short(s.objectId).endsWith('-' + e));
      R.ok(tag, 'graded item ' + e + ' closed once, with a result', cl.length === 1 && cl[0].result && cl[0].result.score, JSON.stringify(cl.map(x => x.result)));
    });
    const comp = log.filter(s => s.verb === 'completed' && s.objectType === 'onlinelesson');
    R.eq(tag, 'one component completed', comp.length, 1);
    if (comp[0]) {
      R.eq(tag, 'component success', comp[0].result.success, FLOW[c].expect.success);
      R.ok(tag, 'component scaled', Math.abs(comp[0].result.score.scaled - FLOW[c].expect.scaled) < 1e-9, comp[0].result.score.scaled + ' vs ' + FLOW[c].expect.scaled);
    }
    R.eq(tag, 'hints reported once each', log.filter(s => s.verb === 'requested.1').length, FLOW[c].hints);
    R.eq(tag, 'verdict recorded', b.val("getUnitResult('percent06_c" + c + "_result')"), FLOW[c].expect.success ? 'pass' : 'fail');
    R.eq(tag, 'no duplicate completed', b.json('__dupes()'), []);
    R.ok(tag, 'no errors', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
    b.close();

    // ── resume ──
    tag = 'resume ' + c; b = await fresh(c, 'RES');
    play(b, RESUME[c].steps, tag);
    const live = {};
    for (let i = 0; i < n; i++) { b.run('goTo(' + i + ')'); live[i] = b.json(SIG); }
    b.run('goTo(' + RESUME[c].land + ')');
    await H.sleep(1000);                         // the debounced save (800 ms) lands
    let sess = b.session(); b.close();
    b = H.boot(c, { search: '?slxapi=1&registration=RES-' + c + '&xapiLib=../_test/xapi-720-k.js', session: sess });
    await b.ready;
    R.eq(tag, 'lands on the saved screen', b.val('currentScreen'), RESUME[c].land);
    R.eq(tag, 'nothing re-reported while restoring', b.loadStmts().filter(s => /^(answered|completed|requested)/.test(s.verb)).map(s => s.verb), []);
    for (let i = 0; i < n; i++) {
      b.run('goTo(' + i + ')'); const now = b.json(SIG);
      const d = []; for (let k = 0; k < Math.max(live[i].length, now.length); k++) if (live[i][k] !== now[k]) d.push((live[i][k] || '∅') + '  ≠  ' + (now[k] || '∅'));
      R.ok(tag, 'screen ' + i + ' looks as it did in-session', d.length === 0, d.slice(0, 2).join(' || '));
    }
    b.run('goTo(' + (n - 1) + ')');
    R.ok(tag, 'the end button is live before the end', b.val('!lastScreenButton().disabled'));
    const before = b.stmts().filter(s => s.verb === 'completed' && s.objectType === 'onlinelesson').length;
    b.run('lastScreenButton().click()'); await H.sleep(100);
    R.eq(tag, 'the end click reports one component completed', b.stmts().filter(s => s.verb === 'completed' && s.objectType === 'onlinelesson').length - before, 1);
    sess = b.session(); b.close();
    b = H.boot(c, { search: '?slxapi=1&registration=RES-' + c + '&xapiLib=../_test/xapi-720-k.js', session: sess });
    await b.ready; b.run('goTo(' + (n - 1) + ')');
    R.ok(tag, 'after another reload the ended button is disabled (D-8)', b.val('lastScreenButton().disabled') === true);
    R.ok(tag, 'no errors', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
    b.close();
  }

  // ── seed (B-1) ──
  {
    const tag = 'seed';
    let b = await fresh('02', 'SEED');
    b.run("goTo(1); scqSelect('s28','b'); document.getElementById('s28-check').click()");
    await H.sleep(1000);
    const sess = b.session(); b.close();
    b = H.boot('02', { search: '?slxapi=1&registration=SEED-02&xapiLib=../_test/xapi-720-k.js', session: sess });
    await b.ready;
    R.eq(tag, 'lands on s28', b.val('currentScreen'), 1);
    R.ok(tag, 'the restored "שנמשיך?" is live', b.val("!document.getElementById('s28-check').disabled"));
    b.run("document.getElementById('s28-check').click()");
    R.eq(tag, 'it advances', b.val('currentScreen'), 2);
    const seq = b.loadStmts().map(s => s.verb + ':' + (s.objectType === 'onlinelesson' ? 'component' : short(s.objectId).slice(-3)));
    R.eq(tag, 'statement order after the reload', seq, ['initialized:component', 'initialized:001', 'completed:001', 'initialized:002']);
    const done001 = b.loadStmts().find(s => s.verb === 'completed');
    R.ok(tag, 'item 001 completed carries its restored result', done001 && done001.result && done001.result.success === true);
    R.ok(tag, 'item 001 completed names the renumbered item', !!done001 && /\/methodica-math-percent-06-02\/methodica-math-percent-06-02-001\/$/.test(done001.objectId), done001 && done001.objectId);
    b.close();
  }

  // ── migrate (02: a document saved under the old item suffixes) ──
  {
    const tag = 'migrate';
    let b = await fresh('02', 'MIGR');
    b.run("goTo(1); scqSelect('s28','b'); document.getElementById('s28-check').click()");
    await H.sleep(1000);
    const sess = b.session(); b.close();
    /* Rewrite every saved qr key 001/qN -> 005/qN, as a document written before 2026-10-20 has them.
       The key may sit in plain or in string-escaped JSON, so match the bare token. */
    let rewritten = 0;
    Object.keys(sess).forEach(k => {
      if (k === '__test_statements') return;
      sess[k] = sess[k].replace(/001\/q(\d)/g, (m, d) => { rewritten++; return '005/q' + d; });
    });
    R.ok(tag, 'the saved document carried a 001/q1 result to rewrite', rewritten > 0, 'rewritten ' + rewritten);
    b = H.boot('02', { search: '?slxapi=1&registration=MIGR-02&xapiLib=../_test/xapi-720-k.js', session: sess });
    await b.ready;
    R.eq(tag, 'the old 005/q1 result is restored as 001/q1', b.json('XAPI_Q_RESULTS'), { '001/q1': true });
    b.run("document.getElementById('s28-check').click()");
    const done = b.loadStmts().find(s => s.verb === 'completed');
    R.ok(tag, 'item 001 completed carries the migrated result', !!done && !!done.result && done.result.success === true);
    R.ok(tag, 'no errors', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
    b.close();
  }

  // ── gate (03) ──
  {
    const tag = 'gate';
    const playA = (b, s33ok) => {
      const vals = [['1', '15', '75', '75'], ['2', '18', '90', '90'], ['3', '20', '100', '100']];
      const fill = (bump) => vals.forEach(([r, c, e, p]) => [['cnt', c], ['exp', e], ['pct', p]].forEach(([k, v]) =>
        b.run("(function(){var el=document.getElementById('s33-r" + r + '-' + k + "'); if(!el.disabled){ el.value='" + (s33ok ? v : String(+v + bump)) + "'; tqInput('s33',el);} })()")));
      b.run('goTo(1)'); fill(1); b.run(C('s33-check'));
      if (!s33ok) { fill(2); b.run(C('s33-check')); }
      b.run('goTo(2)');
      b.run("clsSelect(1,'over'); clsSelect(2,'under'); clsSelect(3,'over')"); b.run(C('s3435-check'));
      b.run("clsSelect(1,'on'); clsSelect(2,'on'); clsSelect(3,'on')"); b.run(C('s3435-check'));
    };
    let b = await fresh('03', 'GATEF');
    playA(b, false);
    R.eq(tag, 'fail: both segment-A questions incorrect', b.json('progressA.questions.map(function(q){return q.state})'), ['incorrect', 'incorrect']);
    b.run(C('s3435-continue'));
    R.eq(tag, 'fail: stays on s3435', b.val('currentScreen'), 2);
    const comp = b.stmts().filter(s => s.verb === 'completed' && s.objectType === 'onlinelesson');
    R.ok(tag, 'fail: one component completed with success:false', comp.length === 1 && comp[0].result.success === false);
    R.eq(tag, 'fail: verdict', b.val("getUnitResult('percent06_c03_result')"), 'fail');
    b.run('goTo(1); goTo(2)');
    R.ok(tag, 'fail: the gated button stays disabled after re-entry', b.val("document.getElementById('s3435-continue').disabled") === true);
    b.run(C('s3435-continue'));
    R.eq(tag, 'fail: a second click sends nothing', b.stmts().filter(s => s.verb === 'completed' && s.objectType === 'onlinelesson').length, 1);
    b.close();
    b = await fresh('03', 'GATEP');
    playA(b, true);
    b.run(C('s3435-continue'));
    R.eq(tag, 'pass: on to s36', b.val('currentScreen'), 3);
    R.eq(tag, 'pass: no component completed yet', b.stmts().filter(s => s.verb === 'completed' && s.objectType === 'onlinelesson').length, 0);
    b.close();
  }
  R.done();
})();
