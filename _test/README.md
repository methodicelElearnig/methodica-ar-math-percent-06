# _test — methodica-math-percent-06

Headless checks for the reporting / issue-report / resume layer. **Never deployed** (the packaging
allowlist excludes `_test/`). Design and rules: `2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md` §10.

| File | What it checks |
|---|---|
| `harness.js` | Shared jsdom harness. Runs the **real** boot: every script tag served from disk, the CDN library replaced by `xapi-720-k.js`, metadata fetched from disk, reduced motion so staged reveals are instant. |
| `verify-report.js` | Structural + boot assertions (~1,000): screen map ↔ markup ↔ metadata, ids, script order and `?v=` parity, no duplicate top-level names, flush contract, verdict keys, routing gates, resume hooks, asset contract (exact case), storage keys; regression gate (no `?slxapi`), production vs `?dev=1` routing. |
| `statement-flow.js` | Behaviour (~260): a scripted play per component (statements, ids, scores, hints, verdicts, D-8), resume per component (reload → same screen, nothing re-sent, every screen identical to its in-session look, D-8), the B-1 seed, 03's segment-A gate. |
| `mutations.js` | Negative tests: 12 deliberate breaks on a temp copy of the repo, each of which must make its target check group fail (guide §10.4). |
| `xapi-720-k.js` | Local stand-in for the CDN library (from methodica-math-ratio-01). Loaded only via `?xapiLib=../_test/xapi-720-k.js`, which `50-loader.js` honours on localhost only. |

## Running

`jsdom` must **not** be installed inside the unit folder — the tree is OneDrive-synced (guide §10.1).
Install once, outside, in one `npm install`:

```
mkdir C:\lomda-test && cd C:\lomda-test && npm install jsdom acorn acorn-walk
```

Then, from the unit root:

```
set NODE_PATH=C:\lomda-test\node_modules
node _test/verify-report.js
node _test/statement-flow.js
node _test/mutations.js
```

Each suite prints `N passed, M failed` and exits non-zero on any failure. A package built from a
commit where all three pass has every guard of this suite behind it.

## In the browser

Serve the repo root over http (e.g. `python -m http.server`) and open a component with the stub:

```
…/methodica-math-percent-06-02/index.html?slxapi=1&registration=TEST-02&xapiLib=../_test/xapi-720-k.js
```

Console: `__stmts()` (statement log), `__state()` (the state document), `__dupes()` (duplicate
`completed`), `__reset()`, `__failWrites(true|413|…)`. Add `&resetState` for a clean document.
A reload with the same URL resumes. `?dev=1` (without `registration`) turns on cross-component
navigation (`DEV_NAV`); the repo-only unit shell (`../index.html`) opens every component that way.
