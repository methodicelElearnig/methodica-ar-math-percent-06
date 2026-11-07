/* ═══════════════════ mutations.js — negative tests for the two suites (guide §10.4) ═══════════════════
   NOT DEPLOYED. An assertion that has never been seen to fail tests nothing: in this family five
   "passed" while testing nothing (an anchor matching the wrong line, an escaping bug that stopped
   the mutation applying at all, …). So each mutation below
     1. is applied to a TEMP COPY of the repo (never to the working tree),
     2. is VERIFIED to have landed (its anchor occurs exactly once; the file changed),
     3. runs the suite it targets against the copy, which must FAIL in the expected group,
     4. is restored, and the restore is BYTE-COMPARED with the original.
   Run: NODE_PATH=<dir>/node_modules node _test/mutations.js   (a few minutes: every run boots jsdom)
*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'percent06-mut-'));
console.log('copying the repo to ' + TMP + ' …');
fs.cpSync(SRC, TMP, { recursive: true, filter: s => !/[\\/]\.git([\\/]|$)/.test(s) });

const MUT = [
  { suite: 'verify-report', group: 'write-guard', file: 'unit-js/40-resume.js',
    from: "try { persistUnitState(_unitState); } catch (e) { console.error('[resume] drain', e); }",
    to:   "try { persistUnitState(captureUnitState()); } catch (e) { console.error('[resume] drain', e); }", what: 'the drain persists a live capture again (the 2026-11-03 bug)' },
  { suite: 'verify-report', group: 'leave', file: 'unit-js/40-resume.js',
    from: "  if (_leavingToNextPart) return;\n  flushResumeSaveLeaving();", to: "  if (_leavingToNextPart) return;\n  flushResumeSave();", what: 'the leave handler goes back to the synchronous save (lost on dismissal, 2026-11-06)' },
  { suite: 'verify-report', group: 'map', file: 'methodica-math-percent-06-02/script.js',
    from: "   3: ['003', 1]    // s30\n", to: '', what: 'drop a SCREEN_TO_SUBCONTENT key' },
  { suite: 'verify-report', group: 'map', file: 'methodica-math-percent-06-03/script.js',
    from: "var XAPI_COMP_SLUG = 'methodica-math-percent-06-03';", to: "var XAPI_COMP_SLUG = 'methodica-math-percent-06-03';\nvar XAPI_ITEM_SLUG = 'methodica-math-percent-06-02';", what: 'a stale XAPI_ITEM_SLUG (the pre-2026-10-20 numbering)' },
  { suite: 'verify-report', group: 'tags', file: 'methodica-math-percent-06-04/index.html',
    from: '../unit-js/20-xapi.js?v=3"', to: '../unit-js/20-xapi.js?v=9"', what: '?v= of a shared file differs in one component' },
  { suite: 'verify-report', group: 'names', file: 'methodica-math-percent-06-05/script.js',
    from: "const PEAK_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳'];", to: "const PEAK_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳'];\nfunction scqOptions(screenId) { return []; }", what: 'a component re-declares a layer function' },
  { suite: 'verify-report', group: 'flush', file: 'methodica-math-percent-06-05/script.js',
    from: "  try { flushResumeSave(); } catch (e) {}   // resume: after the last commitment (guide §8.3)\n}\n\n// Final-wrong", to: "}\n\n// Final-wrong", what: 'cqCheck loses its flush' },
  { suite: 'verify-report', group: 'verdict', file: 'methodica-math-percent-06-02/script.js',
    from: "setUnitResult('percent06_c02_result', result)", to: "setUnitResult('percent06_c03_result', result)", what: "a verdict written under another component's key" },
  { suite: 'verify-report', group: 'routing', file: 'unit-js/05-core.js',
    from: "  if (typeof DEV_NAV === 'undefined' || !DEV_NAV) return;\n  try { if (typeof flushResumeSave", to: "  try { if (typeof flushResumeSave", what: 'goToComponent un-gated' },
  { suite: 'verify-report', group: 'boots', file: 'unit-js/40-resume.js',
    from: "b.hidden = true; b.style.display = 'none';", to: 'b.hidden = true;', what: 'hideCrossPartBack by attribute only' },
  { suite: 'verify-report', group: 'assets', file: 'methodica-math-percent-06-02/index.html',
    from: 'src="assets/videos/character_lifting-opt.mp4"', to: 'src="assets/videos/Character_lifting.mp4"', what: 'an asset referenced in the wrong case' },
  { suite: 'verify-report', group: 'keys', file: 'unit-js/40-resume.js',
    from: ", 'percent06_c06_result'];", to: '];', what: 'RESULT_KEYS misses a component' },
  { suite: 'statement-flow', group: 'seed', file: 'methodica-math-percent-06-02/script.js',
    from: "    if (b && scqNextScreen(id)) b.onclick = function () { scqAdvance(id); };\n  }\n  if (id === 's30'", to: "  }\n  if (id === 's30'", what: 'the restored "שנמשיך?" is not re-wired (dead button after a reload)' },
  { suite: 'statement-flow', group: 'resume 04', file: 'methodica-math-percent-06-04/script.js',
    from: '  resumeAssignMap(scqState, st.scq);\n', to: '', what: 'applyResumeVars skips the SCQ answers' },
  { suite: 'statement-flow', group: 'migrate', file: 'methodica-math-percent-06-02/script.js',
    from: '  resumeAssign(XAPI_Q_RESULTS, migrateQrKeys(st.qr));\n', to: '  resumeAssign(XAPI_Q_RESULTS, st.qr);\n', what: "02's resume drops the 2026-10-20 item-suffix migration" },
  { suite: 'statement-flow', group: 'flow 01', file: 'methodica-math-percent-06-01/script.js',
    from: '  /* xAPI: nothing to report here — item 003, see s15. */\n', to: "  xapiAnswered(xapiItemOf('s23'), 'q5', id === S23_CORRECT_ID, true, '');\n", what: "01 reports 'answered' for item 003, which KATA no longer declares" },
];

/* --only=<text> runs just the mutations whose description contains <text>. */
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
let bad = 0, ran = 0;
for (const m of MUT) {
  if (ONLY && !m.what.includes(ONLY)) continue;
  ran++;
  const f = path.join(TMP, m.file);
  const orig = fs.readFileSync(f);
  const text = orig.toString('utf8');
  const crlf = text.includes('\r\n');
  const from = crlf ? m.from.replace(/\n/g, '\r\n') : m.from, to = crlf ? m.to.replace(/\n/g, '\r\n') : m.to;
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log('✗ ' + m.what + ': anchor found ' + n + 'x — mutation NOT applied'); bad++; continue; }
  fs.writeFileSync(f, text.replace(from, () => to));
  if (fs.readFileSync(f).equals(orig)) { console.log('✗ ' + m.what + ': file unchanged — mutation NOT applied'); bad++; continue; }
  let out = '', code = 0;
  try { out = execFileSync(process.execPath, [path.join(__dirname, m.suite + '.js'), TMP], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  const failures = out.split('\n').filter(l => /^\s+\[/.test(l));
  const hit = failures.filter(l => l.includes('[' + m.group));
  const pass = code !== 0 && hit.length > 0;
  console.log((pass ? '✓ ' : '✗ ') + m.what + '  →  ' + m.suite + ' ' + (pass ? 'fails in [' + m.group + '] (' + hit.length + ')' : 'did NOT fail in [' + m.group + '] (exit ' + code + ', ' + failures.length + ' other failures)'));
  if (pass && hit[0]) console.log('     e.g. ' + hit[0].trim().slice(0, 160));
  if (!pass) bad++;
  fs.writeFileSync(f, orig);
  if (!fs.readFileSync(f).equals(orig)) { console.log('✗ restore of ' + m.file + ' is not byte-identical'); bad++; }
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log('\nmutations: ' + (ran - bad) + ' / ' + ran + ' caught' + (bad ? ' — ' + bad + ' NOT caught' : ''));
process.exitCode = bad ? 1 : 0;
