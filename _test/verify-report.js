/* ═══════════════════ verify-report.js — structural + boot assertions ═══════════════════
   NOT DEPLOYED. The guide's §10.2 list, for methodica-math-percent-06:
     map      SCREEN_TO_SUBCONTENT has exactly TOTAL_SCREENS keys, read from the SOURCE TEXT (guide
              §6.2 trap 4), = the markup's screens, and = metadata's items in both directions
     ids      component id / item slug / metadata file agree with metadata/; graded items declare
              questions; every xapiAnswered qKey exists in metadata
     tags     script order in every index.html; ?v= on every code reference; one ?v= per shared file
     names    no top-level identifier declared in two files (guide §3.3); no capitalised slug
     library  the loader's library letter and the stub's filename are inside the gate regex
     flush    every answering function flushes after its LAST commitment, and no return sits
              between a commitment and a flush (guide §8.3, D-13)
     verdict  every pass/fail goes through setUnitResult with this component's own key (D-12)
     routing  goToComponent / goBackToPreviousPart are DEV_NAV-gated; DEV_NAV's two conditions
     hooks    the four resume hooks + lastScreenButton in every component
     assets   every referenced file exists with EXACT case; no re-grown copies of hoisted files
     keys     per-unit storage keys; RESULT_KEYS = the stub's __reset list
     boots    regression gate (no ?slxapi: nothing sent, every screen walks); production vs
              ?dev=1 routing; the loader's id check is silent
   Run: NODE_PATH=<dir>/node_modules node _test/verify-report.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./harness.js');
const { JSDOM } = require('jsdom');
const acorn = (() => { try { return require('acorn'); } catch (e) { return require(require.resolve('acorn', { paths: [require.resolve('jsdom')] })); } })();
const walk = (() => { try { return require('acorn-walk'); } catch (e) { return null; } })();

const R = H.makeReporter('verify-report');
const B = H.BASE;
const read = p => H.readText(path.join(B, p));
const partFile = (c, f) => H.PART_DIR(c) + '/' + f;
const LAYER = ['10-identity', '20-xapi', '25-report', '40-resume', '50-loader', 'motion', '05-core', '90-boot'];
const ORDER = ['../unit-js/10-identity.js', '../unit-js/20-xapi.js', '../unit-js/25-report.js', '../unit-js/40-resume.js',
               '../unit-js/50-loader.js', '../unit-js/motion.js', '../unit-js/05-core.js', 'script.js', '../unit-js/90-boot.js'];

/* comment-stripped source (keeps offsets: comments become spaces) */
function stripComments(src) {
  const out = src.split('');
  acorn.parse(src, { ecmaVersion: 'latest', onComment: (block, text, s, e) => { for (let i = s; i < e; i++) if (out[i] !== '\n') out[i] = ' '; } });
  return out.join('');
}
function topNames(src) {
  const a = acorn.parse(src, { ecmaVersion: 'latest' }); const s = new Map();
  a.body.forEach(st => {
    if (st.type === 'FunctionDeclaration') s.set(st.id.name, 'function');
    if (st.type === 'VariableDeclaration') st.declarations.forEach(d => d.id.name && s.set(d.id.name, st.kind));
  });
  return s;
}
/* exact-case existence (fs.existsSync is case-insensitive on Windows; the CDN is not — §15.3) */
function resolveExact(rel) {
  const segs = path.normalize(rel).split(path.sep).filter(Boolean);
  let cur = B;
  for (const s of segs) {
    if (s === '..') { cur = path.dirname(cur); continue; }
    if (s === '.') continue;
    let names; try { names = fs.readdirSync(cur); } catch (e) { return false; }
    if (!names.includes(s)) return false;
    cur = path.join(cur, s);
  }
  return true;
}

/* ───────────────────────── static ───────────────────────── */
const layerSrc = Object.fromEntries(LAYER.map(f => [f, read('unit-js/' + f + '.js')]));
const loader = layerSrc['50-loader'];
const lib = (loader.match(/RESUME_ENABLED \? '(xapi-720-[a-z])\.js'/) || [])[1];
const shared = {};    // shared file -> Set of ?v= values seen
const allNames = new Map();
Object.entries(layerSrc).forEach(([f, s]) => topNames(s).forEach((k, n) => {
  if (allNames.has(n)) R.ok('names', 'layer name "' + n + '" declared once', false, allNames.get(n) + ' and ' + f);
  allNames.set(n, 'unit-js/' + f + '.js');
}));

for (const c of H.COMPONENTS) {
  const tag = '06-' + c;
  const src = read(partFile(c, 'script.js'));
  const html = read(partFile(c, 'index.html'));
  const meta = H.metadata(c);
  const slug = H.PART_DIR(c);

  // ── map ──
  const total = +(src.match(/const TOTAL_SCREENS = (\d+);/) || [])[1];
  const block = (src.match(/var SCREEN_TO_SUBCONTENT = \{\n([\s\S]*?)\n\};/) || [])[1] || '';
  const keys = [...block.matchAll(/^\s*(\d+):\s*\['(\d{3})',\s*\d+\]/gm)].map(m => [+m[1], m[2]]);
  R.ok('map', tag + ' map block found with ' + total + ' keys', total > 0 && keys.length === total, 'keys ' + keys.length + ', TOTAL_SCREENS ' + total);
  R.ok('map', tag + ' keys are exactly 0..' + (total - 1), keys.every(([n], i) => n === i));
  const screens = [...html.matchAll(/<section[^>]*class="screen[^"]*"[^>]*data-screen="(\d+)"/g)].map(m => +m[1]);
  R.eq('map', tag + ' markup screens = 0..TOTAL_SCREENS-1', screens, [...Array(total).keys()]);
  const itemSlug = (src.match(/var XAPI_ITEM_SLUG = '([^']+)';/) || [])[1] || slug;
  const compId = 'https://lomdot.education.gov.il/metodica/720active/math/percent/06/' + slug + '/';
  const mapItems = [...new Set(keys.map(k => compId + itemSlug + '-' + k[1] + '/'))].sort();
  const metaItems = meta.subContent.map(s => s.id).sort();
  R.eq('map', tag + ' map items = metadata items (both directions)', mapItems, metaItems);

  // ── ids ──
  R.eq('ids', tag + ' XAPI_COMP_SLUG = folder', (src.match(/var XAPI_COMP_SLUG = '([^']+)';/) || [])[1], slug);
  R.ok('ids', tag + " XAPI_COMP_ID = XAPI_ID_PREFIX + slug + '/'", /var XAPI_COMP_ID\s*=\s*XAPI_ID_PREFIX \+ XAPI_COMP_SLUG \+ '\/';/.test(src));
  R.eq('ids', tag + ' metadata id = component IRI', meta.id, compId);
  R.eq('ids', tag + ' XAPI_METADATA_FILE', (src.match(/var XAPI_METADATA_FILE = '([^']+)';/) || [])[1], '../metadata/' + slug + '.json');
  const evalItems = [...((src.match(/var XAPI_EVAL_ITEMS = \{([^}]*)\}/) || [])[1] || '').matchAll(/'(\d{3})'/g)].map(m => m[1]);
  evalItems.forEach(e => {
    const sc = meta.subContent.find(s => s.id === compId + itemSlug + '-' + e + '/');
    R.ok('ids', tag + ' graded item ' + e + ' exists and declares questions', sc && (sc.questions || []).length > 0);
  });
  // every literal qKey used by xapiAnswered / xapiRequestedHint exists under SOME item of this component
  const declared = new Set(meta.subContent.flatMap(s => (s.questions || []).map(q => q.questionId.split('/').pop())));
  const qkeys = new Set([...src.matchAll(/'(q\d)'/g)].map(m => m[1]));
  qkeys.forEach(q => R.ok('ids', tag + ' qKey ' + q + ' is declared in metadata', declared.has(q)));

  // ── tags ──
  const srcs = [...html.matchAll(/<script src="([^"?]+)(\?v=\d+)?"><\/script>/g)].map(m => [m[1], m[2]]);
  R.eq('tags', tag + ' script order', srcs.map(s => s[0]), ORDER);
  const refs = [...html.matchAll(/<(?:script src|link rel="stylesheet" href)="([^"]+)"/g)].map(m => m[1]);
  refs.forEach(r => R.ok('tags', tag + ' ?v= on ' + r.split('?')[0], /\?v=\d+$/.test(r)));
  refs.filter(r => r.startsWith('../')).forEach(r => { const [f, v] = r.split('?'); (shared[f] = shared[f] || new Set()).add(v); });

  // ── names ──
  topNames(src).forEach((k, n) => R.ok('names', tag + ' "' + n + '" not also declared in the layer', !allNames.has(n), allNames.get(n)));
  R.ok('names', tag + ' no capitalised unit slug', !/Methodica-Math|METHODICA-MATH|Methodica_math/.test(src + html));

  // ── flush contract (comment-stripped, factory closures included) ──
  const code = stripComments(src);
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  ast.body.filter(s => s.type === 'FunctionDeclaration').forEach(fn => {
    let body = code.slice(fn.body.start, fn.body.end);
    if (!/xapiAnswered\(/.test(body)) return;
    if (walk) {   // blank nested function bodies that do not themselves report
      const nested = []; walk.full(fn.body, n => { if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') nested.push(n.body); });
      nested.sort((a, b) => b.start - a.start).forEach(b => { const s = b.start - fn.body.start, e = b.end - fn.body.start; if (s > 0 && !/xapiAnswered\(/.test(body.slice(s, e))) body = body.slice(0, s) + ' '.repeat(e - s) + body.slice(e); });
    }
    const commits = [...body.matchAll(/xapiAnswered\(|[dD]one = true|setUnitResult\(|gviStep\[prefix\] = 1/g)].map(m => m.index);
    const flushes = [...body.matchAll(/flushResumeSave\(\)/g)].map(m => m.index);
    const last = Math.max(...commits), first = Math.min(...commits);
    R.ok('flush', tag + ' ' + fn.id.name + ' flushes after its last commitment', flushes.some(i => i > last));
    [...body.matchAll(/\breturn\b/g)].filter(m => m.index > first).forEach(m => {
      const before = Math.max(...commits.filter(i => i < m.index));
      R.ok('flush', tag + ' ' + fn.id.name + ' no return between a commitment and a flush', flushes.some(i => i > before && i < m.index));
    });
  });

  // ── verdict ──
  R.ok('verdict', tag + ' no raw localStorage verdict', !/localStorage\.setItem\([^)]*(pass|fail)/.test(code));
  const vkeys = [...code.matchAll(/setUnitResult\('([^']+)'/g)].map(m => m[1]);
  R.ok('verdict', tag + ' writes its verdict', vkeys.length > 0);
  vkeys.forEach(k => R.eq('verdict', tag + ' verdict key is its own', k, 'percent06_c' + c + '_result'));

  // ── routing ──
  R.ok('routing', tag + ' no direct location navigation in script.js', !/location\.(href\s*=|replace\(|assign\()/.test(code));
  R.ok('routing', tag + ' never calls xapiCompleteUnit', !/xapiCompleteUnit\(/.test(code));

  // ── hooks ──
  ['capturePartPayload', 'applyResumeVars', 'applyResumeDom', 'restoreScreenUI', 'lastScreenButton'].forEach(h =>
    R.ok('hooks', tag + ' defines ' + h, new RegExp('function ' + h + '\\(').test(code)));

  // ── assets: every local src/href in the page and every url() in its stylesheet resolve, exact case ──
  const pageRefs = [...html.matchAll(/(?:src|href|data-zoom-src|data-src)="([^"#]+)"/g)].map(m => m[1].split('?')[0])
    .filter(u => !/^(https?:|data:|mailto:|javascript:)/.test(u) && u !== 'index.html');
  pageRefs.forEach(u => R.ok('assets', tag + ' resolves ' + u, resolveExact(path.join(H.PART_DIR(c), u))));
  const css = read(partFile(c, 'styles.css'));
  [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]).filter(u => !/^(data:|https?:|#)/.test(u))
    .forEach(u => R.ok('assets', tag + ' styles.css url() resolves ' + u, resolveExact(path.join(H.PART_DIR(c), u))));
  const jsAssets = [...code.matchAll(/['"]((?:\.\.\/unit-assets|assets)\/[^'"]+\.(?:png|jpe?g|svg|mp4|gif|webp))['"]/g)].map(m => m[1]);
  jsAssets.forEach(u => R.ok('assets', tag + ' script.js asset resolves ' + u, resolveExact(path.join(H.PART_DIR(c), u))));
  ['motion.js', 'motion.css', 'assets/images/hint'].forEach(f => R.ok('assets', tag + ' no re-grown copy of ' + f, !fs.existsSync(path.join(B, H.PART_DIR(c), f))));

  // ── boot window (2026-11-03, BOOT-AND-RESUME-HARDENING-2026-11-03.md §2.3 / §2.6 m-p) ──
  {
    const dom0 = new JSDOM(html);                                   // no scripts: structure only
    const d0 = dom0.window.document;
    const nets = [...d0.querySelectorAll('script:not([src])')].map(t => t.textContent || '').filter(t => t.includes('boot-cover'));
    R.ok('boot-window', tag + ' exactly one inline boot-cover net', nets.length === 1, String(nets.length));
    const net = nets[0] || '';
    R.ok('boot-window', tag + ' the net raises __resumeInFlight itself on registration=', /registration=/.test(net) && /__resumeInFlight = true/.test(net));
    R.ok('boot-window', tag + ' the net keeps __resumeInFlight, 800 and the 11000 ceiling', net.includes('__resumeInFlight') && /800/.test(net) && /11000/.test(net));
    /* behavioural: inline scripts only (no external resources in this JSDOM), with and without a registration */
    const inlineOnly = (search) => new JSDOM(html, { url: 'http://localhost:8766/' + slug + '/index.html' + search, runScripts: 'dangerously' });
    const withReg = inlineOnly('?slxapi=1&registration=abc'), noReg = inlineOnly('');
    R.ok('boot-window', tag + ' inline scripts alone raise __resumeInFlight on a Kata launch', withReg.window.__resumeInFlight === true);
    R.ok('boot-window', tag + ' inline scripts leave __resumeInFlight unset without a registration', noReg.window.__resumeInFlight !== true);
    withReg.window.close(); noReg.window.close();
    const pre = [...d0.querySelectorAll('head link[rel="preload"][as="script"]')];
    const hrefs = pre.map(l => l.getAttribute('href'));
    const CDN720 = 'https://lomdot.education.gov.il/metodica/720active/common/';
    R.ok('boot-window', tag + ' head preloads xapiwrapper.min.js and the resume library', hrefs.length === 2 && hrefs[0] === CDN720 + 'xapiwrapper.min.js' && /^https:\/\/.+\/xapi-720-[a-z]\.js$/.test(hrefs[1] || ''), JSON.stringify(hrefs));
    R.ok('boot-window', tag + ' preload links carry no crossorigin and no ?v=', pre.every(l => !l.hasAttribute('crossorigin')) && hrefs.every(h => !/\?/.test(h)));
    R.ok('boot-window', tag + ' the preloaded library letter is the one 50-loader.js loads', !!lib && hrefs[1] === CDN720 + lib + '.js', 'loader=' + lib + ' preload=' + hrefs[1]);
    R.ok('boot-window', tag + ' head preconnects to Kata', !!d0.querySelector('head link[rel="preconnect"][href="https://kata.cet.ac.il"]'));
    const landing = d0.querySelector('section.screen.active');
    const assetImgs = [...d0.querySelectorAll('img')].filter(i => (i.getAttribute('src') || '').startsWith('assets/'));
    const off = assetImgs.filter(i => !(landing && landing.contains(i))), on = assetImgs.filter(i => landing && landing.contains(i));
    R.ok('boot-window', tag + ' every assets/ image outside the landing screen is loading="lazy"', off.every(i => i.getAttribute('loading') === 'lazy'), off.filter(i => i.getAttribute('loading') !== 'lazy').map(i => i.getAttribute('src')).join());
    R.ok('boot-window', tag + ' no landing-screen image is lazy', on.every(i => i.getAttribute('loading') !== 'lazy'));
    const hiddenSrc = [...d0.querySelectorAll('video[autoplay][src]')].filter(v => !(landing && landing.contains(v)));
    R.ok('boot-window', tag + ' no hidden autoplay video carries an inline src (data-src instead)', hiddenSrc.length === 0, hiddenSrc.map(v => v.getAttribute('src')).join());
    R.ok('boot-window', tag + ' goTo swaps data-src -> src before resetScreenState(n)', /\.screen\.active \[data-src\][\s\S]{0,400}resetScreenState\(n\)/.test(code));
    dom0.window.close();
  }
}
// one ?v= per shared file across all parts
Object.entries(shared).forEach(([f, vs]) => R.ok('tags', 'one ?v= for ' + f + ' across the six components', vs.size === 1, [...vs].join(' vs ')));
// unit-css url()s resolve relative to unit-css/
fs.readdirSync(path.join(B, 'unit-css')).filter(f => f.endsWith('.css')).forEach(f => {
  [...read('unit-css/' + f).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(m => m[1]).filter(u => !/^(data:|https?:|#)/.test(u))
    .forEach(u => R.ok('assets', 'unit-css/' + f + ' url() resolves ' + u, resolveExact(path.join('unit-css', u))));
});

// ── library / routing / keys in the layer ──
const gate = (loader.match(/XAPI_USING_G = \/xapi-720-\[([a-z]+)\]/) || [])[1] || '';
R.ok('library', 'the loaded library letter is inside the gate regex', lib && gate.includes(lib.slice(-1)), lib + ' vs [' + gate + ']');
R.ok('library', 'both stubs exist (-l for the leave save, -k for the fallback) and carry gate letters',
  fs.existsSync(path.join(B, '_test', 'xapi-720-k.js')) && fs.existsSync(path.join(B, '_test', 'xapi-720-l.js')) && gate.includes('k') && gate.includes('l'));
R.ok('library', 'resume loads xapi-720-l.js (the leave save, 2026-11-06)', lib === 'xapi-720-l', String(lib));
const core = stripComments(layerSrc['05-core']);
R.ok('routing', 'goToComponent returns unless DEV_NAV', /function goToComponent\(dir\) \{\s*if \(typeof DEV_NAV === 'undefined' \|\| !DEV_NAV\) return;/.test(core));
const resume = stripComments(layerSrc['40-resume']);
R.ok('routing', 'goBackToPreviousPart returns unless DEV_NAV', /function goBackToPreviousPart\([^)]*\) \{\s*if \(!DEV_NAV\) return;/.test(resume));
R.ok('routing', 'hideCrossPartBack sets hidden AND display:none', /b\.hidden = true; b\.style\.display = 'none';/.test(resume));
const ident = layerSrc['10-identity'];
R.ok('routing', "DEV_NAV = ?dev=1 AND no ?registration", /_devQ\.get\('dev'\) === '1' && !_devQ\.has\('registration'\)/.test(ident));
R.ok('keys', 'XAPI_UNIT_ID = the unit metadata id', ident.includes("window.XAPI_UNIT_ID = '" + H.unitMetadata().id + "'"));
R.ok('keys', 'UI_CHARACTER_KEY is namespaced to this unit', resume.includes("var UI_CHARACTER_KEY = 'methodica_math_percent_06_selectedCharacter'"));
R.ok('keys', 'NAV_EDGE_KEY carries the unit slug', resume.includes("var NAV_EDGE_KEY = 'lomda_nav_edges::methodica-math-percent-06'"));
const rk = [...((resume.match(/var RESULT_KEYS\s*=\s*\[([^\]]*)\]/) || [])[1] || '').matchAll(/'([^']+)'/g)].map(m => m[1]);
R.eq('keys', 'RESULT_KEYS = one per component', rk, H.COMPONENTS.map(c => 'percent06_c' + c + '_result'));
const stub = H.readText(path.join(B, '_test', 'xapi-720-k.js'));
R.ok('keys', "the stub's __reset clears exactly RESULT_KEYS", rk.every(k => stub.includes("'" + k + "'")) && !/ratio01_|percent08_/.test(stub));

// ── write guards (2026-11-03, hardening doc §2.6 k-l): the drain, markSent and the failed read ──
R.ok('write-guard', '40-resume.js: drainPendingUnitState persists the document as read, never a capture',
  (() => { const m = /function drainPendingUnitState\(\)\s*\{[\s\S]*?\n\}/.exec(resume); return !!m && !/captureUnitState\(/.test(m[0]) && /persistUnitState\(_unitState\)/.test(m[0]); })());
R.ok('write-guard', '40-resume.js: markSent does not persist before _resumeReady',
  (() => { const m = /function markSent\(ledger, key\)\s*\{[\s\S]*?\n\}/.exec(resume); return !!m && /if \(!_resumeReady\) return;[\s\S]*persistUnitState\(captureUnitState\(\)\)/.test(m[0]); })());
R.ok('write-guard', '40-resume.js: persistUnitState refuses to write after a failed read',
  /function persistUnitState\(doc\)\s*\{[\s\S]{0,200}if \(_resumeReadFailed\)[\s\S]{0,120}return false;/.test(resume));
R.ok('write-guard', '40-resume.js: the direct library saves bail after a failed read too',
  /function scheduleResumeSave\(\) \{\s*if \(!RESUME_ENABLED \|\| !_resumeReady \|\| _restoring \|\| _resumeReadFailed\) return;/.test(resume) &&
  /function flushResumeSave\(\) \{\s*if \(!RESUME_ENABLED \|\| !_resumeReady \|\| _restoring \|\| _resumeReadFailed\) return;/.test(resume));

// ── leave save (2026-11-06, xapi-720-l.js; percent-03 8b63a4f): the leave handler must go through saveState720OnLeave ──
R.ok('leave', '40-resume.js: flushResumeSaveOnLeave goes through flushResumeSaveLeaving',
  /function flushResumeSaveOnLeave\(\) \{\s*if \(_leavingToNextPart\) return;\s*flushResumeSaveLeaving\(\);/.test(resume));
R.ok('leave', '40-resume.js: flushResumeSaveLeaving has the write guards and typeof-guards saveState720OnLeave',
  /function flushResumeSaveLeaving\(\) \{\s*if \(!RESUME_ENABLED \|\| !_resumeReady \|\| _restoring \|\| _resumeReadFailed\) return;\s*var save = \(typeof window\.saveState720OnLeave === 'function'\) \? window\.saveState720OnLeave : window\.saveState720;/.test(resume));
const loaderCode = stripComments(loader);
R.ok('write-guard', '50-loader.js: stage A keeps the cover on a failed read', /if \(!_payload && !_resumeReadFailed\) dropBootCover\(\);/.test(loaderCode));
R.ok('write-guard', '50-loader.js: stage B retries a failed read once and keeps the writes closed otherwise',
  /if \(_resumeReadFailed\) \{\s*_saved = readUnitState\(\);/.test(loaderCode) && /_resumeReady = !_resumeReadFailed;/.test(loaderCode) && /if \(!_resumeReadFailed\) \{\s*_resumeReady = true;/.test(loaderCode));
R.ok('write-guard', '50-loader.js: a screen reached during the boot window is saved once stage B is done',
  /if \(!_resumed && currentScreen !== 0\) \{ try \{ scheduleResumeSave\(\); \}/.test(loaderCode));

/* ───────────────────────── boots ───────────────────────── */
(async () => {
  for (const c of H.COMPONENTS) {
    const tag = '06-' + c;
    // regression gate: no ?slxapi, no ?xapiLib — the page must behave as before instrumentation
    let b = H.boot(c, { search: '' });
    await H.sleep(1500);
    /* The real library, with no valid ?slxapi, turns every send into a no-op (XAPI_DISABLED). The
       stand-in records what reached it: the gate is that the page still works and the layer never
       bypasses the library (no fetch to an LRS). */
    R.ok('boots', tag + ' no ?slxapi: the library reports itself disabled', b.val('window.XAPI_DISABLED') === true);
    R.ok('boots', tag + ' no ?slxapi: nothing but the metadata is fetched', b.json('window.__fetches.map(function(f){return f.url})').every(u => /metadata\//.test(u)));
    const n = b.val('TOTAL_SCREENS');
    for (let i = 0; i < n; i++) { try { b.run('goTo(' + i + ')'); } catch (e) { R.ok('boots', tag + ' goTo(' + i + ') without reporting', false, e.message); } }
    R.ok('boots', tag + ' no ?slxapi: every screen walks without an error', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
    R.ok('boots', tag + ' no ?slxapi: boot cover dropped', !b.w.document.getElementById('boot-cover'));
    b.close();
    // production launch: DEV_NAV off, first-screen "חזרה" hidden (attribute AND display), no hop
    b = H.boot(c, { search: '?slxapi=1&registration=PROD-' + c + '&xapiLib=../_test/xapi-720-k.js&resetState' });
    await b.ready;
    R.eq('boots', tag + ' production: DEV_NAV false', b.val('DEV_NAV'), false);
    /* 02-06: the cross-component "חזרה" — hidden by attribute AND display:none (hideCrossPartBack).
       01 has no previous component: updateBackButton keeps its first-screen back hidden by attribute. */
    const back = b.val("(function(){ var s=document.querySelector('.screen[data-screen=\"0\"] .btn-back'); if (!s) return 'none'; if (s.hidden && s.style.display === 'none') return 'hidden+display'; return s.hidden ? 'hidden' : 'visible'; })()");
    R.eq('boots', tag + ' production: first-screen back', back, c === '01' ? 'hidden' : 'hidden+display');
    const href = b.w.location.href; b.run("goToComponent('next'); goToComponent('prev')");
    R.eq('boots', tag + ' production: goToComponent moves nothing', b.w.location.href, href);
    R.ok('boots', tag + ' the loader id check is silent', !b.errors.some(e => /ID MISMATCH/.test(e)), b.errors.find(e => /ID MISMATCH/.test(e)));
    R.ok('boots', tag + ' production boot: no errors', b.errors.length === 0, b.errors.slice(0, 2).join(' | '));
    if (c === '04') {
      /* MOE 2026-10-08: the challenge reports its real score; success only at >= 60% of its 4
         declared questions (unanswered = wrong); the stored verdict follows success. */
      const thr = b.json('(function(){ var orig = xapiEndComponent, out = [];' +
        ' xapiEndComponent = function (r) { out.push(r.success + ":" + r.score.scaled + ":" + getUnitResult("percent06_c04_result")); };' +
        ' [0, 2, 3, 4].forEach(function (n) { Object.keys(XAPI_Q_RESULTS).forEach(function (k) { delete XAPI_Q_RESULTS[k]; });' +
        '   ["001/q1", "002/q1", "002/q2", "003/q1"].slice(0, n).forEach(function (k) { XAPI_Q_RESULTS[k] = true; }); goToComponent05(); });' +
        ' xapiEndComponent = orig; return out; })()');
      R.eq('boots', tag + ' challenge: success only at >= 60%, real score, verdict follows (0/4, 2/4 fail; 3/4, 4/4 pass)',
        JSON.stringify(thr), JSON.stringify(['false:0:fail', 'false:0.5:fail', 'true:0.75:pass', 'true:1:pass']));
    }
    b.close();
    // ?dev=1 (walkthrough) and ?dev=1&registration (still production)
    b = H.boot(c, { search: '?dev=1' }); await H.sleep(800);
    R.eq('boots', tag + ' ?dev=1: DEV_NAV true', b.val('DEV_NAV'), true);
    if (c !== '01') R.eq('boots', tag + ' ?dev=1: first-screen back not hidden', b.val("document.querySelector('.screen[data-screen=\"0\"] .btn-back').style.display"), '');
    b.close();
    b = H.boot(c, { search: '?dev=1&registration=X' }); await H.sleep(500);
    R.eq('boots', tag + ' ?dev=1&registration: DEV_NAV false', b.val('DEV_NAV'), false);
    b.close();
  }

  // ── write guards, behavioural (2026-11-03, hardening doc §2.6 a-j) — on part 01, with the saved document at screen 2 ──
  /* Kata's reproduction: saved currentScreen 2; a choice made while the restore was still loading; the
     stage-B drain used to persist a live capture (screen 0/1) over the saved payload. The first check below
     fails on the pre-fix tree. The state store is replaced by a local map so the document can be seeded
     and read back; the debounced stub keeps the document by reference, as the real library does. */
  {
    const tag = '06-01';
    const slug = H.PART_DIR('01');
    const SEED = () => ({ v: 6, component: slug, payload: { currentScreen: 2 }, done: {}, doneItems: {}, hints: {}, picks: {},
                          ui: { character: 'character-1' }, results: {} });
    const wg = (name) => {
      const b = H.boot('01', { search: '?slxapi=1&registration=' + name + '&xapiLib=../_test/xapi-720-k.js' });
      const store = {}; const id = () => b.val('RESUME_STATE_ID');
      const install = () => {
        b.w.loadState720 = function (sid) { return store[sid] ? JSON.parse(store[sid]) : null; };
        b.w.saveState720 = function (sid, doc) { store[sid] = JSON.stringify(doc); return true; };
        b.w.saveState720Debounced = function (sid, doc) { b.w.__debouncedDoc = doc; store[sid] = JSON.stringify(doc); return true; };
      };
      return { b, store, id, install, seed: () => { store[id()] = JSON.stringify(SEED()); },
               stored: () => (store[id()] ? JSON.parse(store[id()]) : null),
               close: () => setTimeout(b.close, 0) };   /* after the MutationObserver microtasks of a goTo */
    };
    let g = wg('WG1'); await g.b.ready;
    g.install(); g.seed();
    g.b.run('_resumeReady = false; _pendingProfile = null; _pendingResults = null; readUnitState(); setUnitCharacter("character-2"); goTo(1)');
    R.ok('write-guard', tag + ' a pick + navigation before stage B writes nothing', g.stored().payload.currentScreen === 2 && g.b.val('_pendingProfile && _pendingProfile.character') === 'character-2', JSON.stringify(g.stored()));
    g.b.run('_resumeReady = true; drainPendingUnitState()');
    R.ok('write-guard', tag + ' the drain persists the document AS READ: saved payload intact, character updated', g.stored().payload.currentScreen === 2 && g.stored().ui.character === 'character-2' && g.stored().component === slug, JSON.stringify(g.stored()));
    g.b.run('applyExecutionState(_unitState.payload)');
    R.ok('write-guard', tag + ' the restore lands on the saved screen after the drain', g.b.val('currentScreen') === 2, 'currentScreen=' + g.b.val('currentScreen'));
    R.ok('write-guard', tag + ' the debounced document (held by reference) still carries the saved payload after the restore', !!(g.b.w.__debouncedDoc && g.b.w.__debouncedDoc.payload && g.b.w.__debouncedDoc.payload.currentScreen === 2));
    g.close();

    g = wg('WG2'); await g.b.ready; g.install(); g.seed();
    g.b.run('_resumeReady = false; readUnitState(); goTo(1); markSent("doneItems", "x")');
    R.ok('write-guard', tag + ' markSent before stage B marks in memory but writes nothing', g.stored().payload.currentScreen === 2 && g.b.val('_unitState.doneItems.x') === true, JSON.stringify(g.stored()));
    g.b.run('_resumeReady = true; flushResumeSave()');
    R.ok('write-guard', tag + ' the key marked in memory rides the next save', g.stored().doneItems.x === true, JSON.stringify(g.stored()));
    g.close();

    g = wg('WG3'); await g.b.ready; g.install(); g.seed();
    const realLoad = g.b.w.loadState720;
    g.b.w.loadState720 = function () { return null; };
    g.b.w.stateLastResult720 = function () { return { op: 'load', status: 500, ok: false, reason: 'rejected' }; };
    g.b.run('_resumeReady = false; readUnitState()');
    R.ok('write-guard', tag + ' a read that fails (not a 404) is flagged, not taken as a fresh document', g.b.val('_resumeReadFailed') === true && g.b.val('_unitState.payload') === null);
    g.b.run('_resumeReady = true; window.__p = persistUnitState(_unitState); flushResumeSave(); markSent("done", "y"); goTo(1); scheduleResumeSave(); flushResumeSaveOnLeave()');
    R.ok('write-guard', tag + ' after a failed read every write (leave save included) is refused and the stored document is untouched', g.b.w.__p === false && g.stored().payload.currentScreen === 2 && g.stored().done.y === undefined, JSON.stringify(g.stored()));
    g.b.w.loadState720 = realLoad;
    g.b.w.stateLastResult720 = function () { return { op: 'load', status: 200, ok: true, reason: 'ok' }; };
    g.b.run('readUnitState()');
    R.ok('write-guard', tag + ' a read that succeeds afterwards clears the flag and brings the payload back', g.b.val('_resumeReadFailed') === false && g.b.val('_unitState.payload.currentScreen') === 2);
    g.b.w.loadState720 = function () { return null; };
    g.b.w.stateLastResult720 = function () { return { op: 'load', status: 404, ok: true, reason: 'absent' }; };
    g.b.run('readUnitState()');
    R.ok('write-guard', tag + ' a 404 ("nothing saved yet") is NOT a failed read', g.b.val('_resumeReadFailed') === false && g.b.val('_unitState.payload') === null);
    g.close();
  }

  // ── leave save, behavioural (2026-11-06): pagehide goes through saveState720OnLeave on -l; on -k (no such function) it falls back ──
  for (const [stubLib, hasLeave] of [['xapi-720-l.js', true], ['xapi-720-k.js', false]]) {
    const b = H.boot('01', { search: '?slxapi=1&registration=leave-' + stubLib.slice(9, 10) + '-' + Math.random().toString(36).slice(2) + '&xapiLib=../_test/' + stubLib });
    await b.ready;
    const up = await H.waitFor(() => b.val('_resumeReady') === true, 8000).then(() => true, () => false);
    b.run('goTo(2)');
    b.w.dispatchEvent(new b.w.Event('pagehide'));
    const leaves = typeof b.w.__leaveWrites === 'function' ? b.w.__leaveWrites() : null;
    const doc = b.state();
    R.ok('leave', '06-01 on ' + stubLib + ': ' + (hasLeave ? 'pagehide saves through saveState720OnLeave, current screen' : 'pagehide falls back to saveState720, current screen'),
      up && (hasLeave ? !!leaves && leaves.length >= 1 && leaves[leaves.length - 1].cs === 2 && leaves[leaves.length - 1].ok === true : leaves === null)
         && !!doc && !!doc.payload && doc.payload.currentScreen === 2,
      JSON.stringify({ up, leaves, cs: doc && doc.payload && doc.payload.currentScreen }));
    const uncaught = b.errors.filter(e => /^uncaught/.test(e));
    R.ok('leave', '06-01 on ' + stubLib + ': no uncaught error', uncaught.length === 0, uncaught.slice(0, 2).join(' | '));
    setTimeout(b.close, 0);
  }
  R.done();
})();
