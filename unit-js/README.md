# unit-js — methodica-math-percent-06

The shared layer: ONE copy for all six components. Design and rules:
`2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md` (the "guide").

| File | Role |
|---|---|
| `10-identity.js` | ids (`XAPI_ID_PREFIX`, `XAPI_UNIT_ID` = bare slug), `RESUME_ENABLED`, `DEV_NAV` |
| `20-xapi.js` | item scope (`xapiOnScreen`), `xapiAnswered` / `xapiRequestedHint` / `xapiEndComponent`, B-1 guard, O-1, `restoreEndedButton` (D-8), opt-in video + YouTube state machines, `XAPI_ITEM_SLUG` |
| `25-report.js` | "מצאתם בעיה?" dialog → the shared 720 Google Form; identity from `window.METADATA` |
| `40-resume.js` | the per-component state document (v6), ledgers, verdicts, boot cover, saves, `?resetState`, `hideCrossPartBack`, `repaintScreen`, `applyExecutionState` |
| `50-loader.js` | `bootXAPI()`: library (`xapi-720-k.js`; `?xapiLib=` on localhost), metadata, resume phases A/B, component `initialized` |
| `motion.js` | reveal animation engine (Phase 1b) |
| `05-core.js` | functions shared token-for-token by the components (Phase 1d) |
| `90-boot.js` | the ONLY file with top-level side effects; LAST script tag |
| `dev-nav.js` | dev-only per-component navigator (`index_dev.html`), never loaded by a learner page |

Provenance: 10/20/40/50 from methodica-math-percent-08 `5fe4b78` (itself ratio-01 `35648a6`),
25-report from methodica-math-ratio-01 `8f21b4c`, 90-boot after ratio-01's order.

## Load order (every component's `index.html`, identical `?v=`)

`10-identity → 20-xapi → 25-report → 40-resume → 50-loader → motion → 05-core → script.js → 90-boot`

- Every file except `90-boot.js` is definition-only; the shared code reads per-component seams at
  CALL time, so `script.js` may load after it. `script.js` boots its own screens at the end of its
  parse (scaleApp, first `resetScreenState(0)`); `90-boot.js` then wires the report dialog, the
  resume handlers, hides the first screen's cross-component "חזרה" (production only) and calls
  `bootXAPI()`.
- No top-level identifier may exist in two files — the collision is silent and last-wins (§3.3).
- Bump every `?v=` together, in all six `index.html`, in the same commit as any change here (§3.4).

## Per-component seams (each `script.js`)

Reporting: `XAPI_COMP_SLUG`, `XAPI_COMP_ID`, `XAPI_ITEM_SLUG` (the slug the component's ITEM ids
carry — in this unit it differs from the component slug for 02-06), `XAPI_METADATA_FILE`,
`SCREEN_TO_SUBCONTENT`, `XAPI_EVAL_ITEMS`, optional `XAPI_ITEM_RESULT`.
Resume: `capturePartPayload()`, `applyResumeVars(st)`, `applyResumeDom(st)`, `restoreScreenUI(n)`,
`lastScreenButton()`, optional `RESUME_INPUT_IDS` / `RESUME_TEXT_IDS`.
A component without `XAPI_METADATA_FILE` runs with reporting off and says so in the console.

## Routing

The platform owns routing (§8.12). `DEV_NAV` (`?dev=1` and no `?registration`) keeps the
cross-component hops for local walkthroughs; the repo-only unit shell (`../index.html`) opens every
component with `?dev=1`.

## Local testing

`…/<component>/index.html?slxapi=1&registration=TEST-01&xapiLib=../_test/xapi-720-k.js` loads the
local stand-in for the CDN library (localhost only). Console: `__stmts()`, `__state()`,
`__dupes()`, `__reset()`, `__failWrites(bool|status)`; `&resetState` starts a clean document.
