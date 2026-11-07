/* ═══════════════════ shared jsdom harness for methodica-math-percent-06 ═══════════════════
   NOT DEPLOYED. Dev tooling only. Used by verify-report.js, statement-flow.js and mutations.js.
   Ported from methodica-math-percent-08 _test/harness.js (5fe4b78).

   Runs the REAL boot: a jsdom interceptor serves every script tag from disk in document order,
   bootXAPI()'s two CDN loads are answered with an empty wrapper and the _test/xapi-720-k.js stub
   (exactly what ?xapiLib= does on localhost), the metadata is fetched from disk, and the loader's
   own poll → phase B → 'initialized' runs — so the boot cover, the statement ORDER on a resume and
   the restore itself are under test, not a replay of them.

   The page runs with prefers-reduced-motion (window.matchMedia below), which makes every staged
   reveal instant — the engine's own reduced-motion path — so interactions never race an entrance.

   Run from the unit root (jsdom installed OUTSIDE the OneDrive tree — _test/README.md):
     NODE_PATH=<dir>/node_modules node _test/<suite>.js
*/
'use strict';

const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const BASE = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..');
const UNIT = 'methodica-math-percent-06';
const COMPONENTS = ['01', '02', '03', '04', '05', '06'];
const PART_DIR = c => UNIT + '-' + c;
const ORIGIN = 'http://localhost:8766';

function readText(p) { return fs.readFileSync(p, 'utf8').replace(/^﻿/, ''); }

/* url path → file on disk, or null. */
function diskPath(u) {
  const url = new URL(u);
  if (url.origin !== ORIGIN) return null;
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(BASE, p);
  return fs.existsSync(f) ? f : null;
}

/* Every subresource is answered here; nothing ever reaches the network. */
function diskInterceptor(opts, requested) {
  const js = (body) => new Response(body, { headers: { 'Content-Type': 'application/javascript' } });
  return jsdom.requestInterceptor((request, ctx) => {
    const u = request.url;
    requested.push(u);
    const tag = ctx && ctx.element ? ctx.element.localName : '';
    if (tag === 'iframe' || tag === 'frame') return new Response('<!DOCTYPE html><html><body></body></html>', { headers: { 'Content-Type': 'text/html' } });
    if (/xapiwrapper\.min\.js$/.test(u)) return js('/* wrapper stub */');
    if (/\/common\/xapi-720-[a-z]\.js$/.test(u)) {
      /* The real CDN library is never fetched: the suites load the stub through ?xapiLib=. A boot
         WITHOUT ?xapiLib (the regression gate) gets a stand-in for what the real library does with
         no valid ?slxapi: it loads the metadata, sets XAPI_DISABLED, and every send is a no-op —
         recorded in __cdnSends so the gate can prove nothing would have left the page. */
      return js('window.__cdnLibFetched = ' + JSON.stringify(u) + '; window.__cdnSends = [];' +
        'window.getXAPIParameters = function (f) { window.XAPI_DISABLED = true;' +
        '  fetch(f).then(function (r) { return r.json(); }).then(function (j) { window.METADATA = j; window.jsXAPI_MetadataReady = true; }); };' +
        'window.sendStatement720 = function () { window.__cdnSends.push([].slice.call(arguments, 0, 2)); };' +
        'window.loadState720 = function () { return null; }; window.saveState720 = function () { return false; };' +
        'window.saveState720Debounced = function () {}; window.xapiItemAnswered = {};' +
        'window.ADL = { XAPIWrapper: { changeConfig: function () {} } };');
    }
    const f = diskPath(u);
    if (!f) return new Response('', { status: 404 });
    const type = /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : /\.html$/.test(f) ? 'text/html' : 'application/octet-stream';
    return new Response(fs.readFileSync(f), { headers: { 'Content-Type': type } });
  });
}

/* Boot one component. opts:
     search    query string (default: a platform-like launch with the stub library)
     session   a sessionStorage snapshot to carry over (a "reload": the stub keeps its state
               document and statement log in sessionStorage)
     local     a localStorage snapshot to carry over
     html      replacement index.html text (mutations)
     beforeParse(w)  extra window setup
   Returns helpers; `ready` resolves once the loader has sent THIS load's component 'initialized'
   (or after `timeout` ms). */
function boot(c, opts) {
  opts = opts || {};
  const dir = PART_DIR(c);
  const search = opts.search != null ? opts.search
    : '?slxapi=1&registration=REG-' + c + '&xapiLib=../_test/xapi-720-k.js';
  const url = ORIGIN + '/' + dir + '/index.html' + search;
  const errors = [], warns = [], logs = [];
  const loader = { requested: [] };
  const dom = new JSDOM(opts.html || readText(path.join(BASE, dir, 'index.html')), {
    url,
    runScripts: 'dangerously',
    resources: { interceptors: [diskInterceptor(opts, loader.requested)] },
    pretendToBeVisual: true,
    beforeParse(w) {
      const fmt = a => a.map(x => (x && x.stack) ? x.stack : (typeof x === 'object' ? safeJSON(x) : String(x))).join(' ');
      w.console.error = (...a) => errors.push(fmt(a));
      w.console.warn = (...a) => warns.push(fmt(a));
      w.console.log = (...a) => logs.push(fmt(a));
      w.console.info = w.console.debug = () => {};
      w.addEventListener('error', e => errors.push('uncaught: ' + (e.error && e.error.stack || e.message)));
      w.HTMLMediaElement.prototype.load = function () {};
      w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      w.HTMLMediaElement.prototype.pause = function () {};
      w.scrollTo = () => {};
      w.Element.prototype.scrollTo = function () {};
      w.Element.prototype.scrollIntoView = function () {};
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.IntersectionObserver = function () { return { observe() {}, unobserve() {}, disconnect() {}, takeRecords() { return []; } }; };
      w.ResizeObserver = function () { return { observe() {}, unobserve() {}, disconnect() {} }; };
      w.__fetches = [];
      w.fetch = (u, init) => {
        w.__fetches.push({ url: String(u), init: init || null });
        let target;
        try { target = new URL(String(u), w.location.href).href; } catch (e) { target = String(u); }
        const f = diskPath(target);
        if (!f) return Promise.resolve({ ok: /docs\.google\.com/.test(target), status: 0, json: () => Promise.resolve({}) });
        const body = readText(f);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(body)), text: () => Promise.resolve(body) });
      };
      if (opts.session) Object.keys(opts.session).forEach(k => w.sessionStorage.setItem(k, opts.session[k]));
      if (opts.local) Object.keys(opts.local).forEach(k => w.localStorage.setItem(k, opts.local[k]));
      if (opts.beforeParse) opts.beforeParse(w);
    },
  });
  const w = dom.window;
  const exec = (code) => {
    const s = w.document.createElement('script');
    s.textContent = code;
    w.document.head.appendChild(s);
    s.remove();
  };
  const val = (expr) => {
    exec('window.__v = (function(){ try { return (' + expr + '); } catch (e) { return "__throw:" + e.message; } })();');
    return w.__v;
  };
  const json = (expr) => { const v = val('JSON.stringify(' + expr + ')'); try { return JSON.parse(v); } catch (e) { return v; } };
  const run = (code) => { const r = val('(function(){ ' + code + '; return "ok"; })()'); if (r !== 'ok') throw new Error(code.slice(0, 80) + ' -> ' + r); };
  const stmts = () => json('window.__stmts ? window.__stmts() : []') || [];
  const state = () => json('window.__state ? window.__state() : null');
  const session = () => { const o = {}; for (let i = 0; i < w.sessionStorage.length; i++) { const k = w.sessionStorage.key(i); o[k] = w.sessionStorage.getItem(k); } return o; };
  const local = () => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
  const countInits = (raw) => {
    try { return (JSON.parse(raw || '[]') || []).filter(s => s.verb === 'initialized' && s.objectType === 'onlinelesson').length; }
    catch (e) { return 0; }
  };
  const initsBefore = countInits(opts.session && opts.session.__test_statements);
  const ready = waitFor(() => countInits(w.sessionStorage.getItem('__test_statements')) > initsBefore,
    opts.timeout || 8000).then(() => sleep(60));
  const logStart = (() => { try { return (JSON.parse((opts.session && opts.session.__test_statements) || '[]') || []).length; } catch (e) { return 0; } })();
  /* The statements of THIS load only (a reload carries the previous log along). */
  const loadStmts = () => stmts().slice(logStart);
  return { dom, w, exec, val, json, run, stmts, loadStmts, state, session, local, errors, warns, logs, ready, loader,
           close: () => { try { w.close(); } catch (e) {} } };
}

function safeJSON(x) { try { return JSON.stringify(x); } catch (e) { return String(x); } }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function waitFor(pred, timeout) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    (function tick() {
      let v = false; try { v = pred(); } catch (e) {}
      if (v || Date.now() - t0 > timeout) return resolve(!!v);
      setTimeout(tick, 25);
    })();
  });
}

/* Result bookkeeping shared by the suites. */
function makeReporter(name) {
  const failures = [];
  let passes = 0;
  const ok = (tag, what, cond, detail) => {
    if (cond) { passes++; return true; }
    failures.push('[' + tag + '] ' + what + (detail ? '  —  ' + detail : ''));
    return false;
  };
  const eq = (tag, what, actual, expected) => {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    return ok(tag, what, a === e, 'got ' + a + ', expected ' + e);
  };
  const done = () => {
    console.log('\n' + name + ': ' + passes + ' passed, ' + failures.length + ' failed');
    if (failures.length) { console.log('\nFAILURES:'); failures.forEach(f => console.log('  ' + f)); }
    process.exitCode = failures.length ? 1 : 0;
    return failures.length;
  };
  return { ok, eq, done, failures, get passes() { return passes; } };
}

function metadata(c) { return JSON.parse(readText(path.join(BASE, 'metadata', PART_DIR(c) + '.json'))); }
function unitMetadata() { return JSON.parse(readText(path.join(BASE, 'metadata', UNIT + '_unit.json'))); }

module.exports = { BASE, UNIT, COMPONENTS, PART_DIR, ORIGIN, boot, sleep, waitFor, makeReporter, metadata, unitMetadata, readText };
