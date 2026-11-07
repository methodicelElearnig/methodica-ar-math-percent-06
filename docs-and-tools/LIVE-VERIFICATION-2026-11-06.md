# Live verification — `methodica-math-percent-06`, package `2026-11-06` (leave save via `xapi-720-l.js`)

Run 06.11.26 ~12:45 from the Claude desktop browser (Chromium) on the production CDN, after the owner uploaded the
package. Launch links from `Tools/full-kata-link/New-KataLaunchLinks.ps1`, learner `VADIM-LEAVE-1106`, registration
`9012a0f7…` for part 01 (test data; registrations cut to 8 characters, no token in this file). Links CSV:
`Tools/full-kata-link/kata-links-methodica-math-percent-06-leave-20261106.csv`.

## CDN

The nine files of `deployments/2026-11-06/DEPLOY.md` answer with exactly the package byte sizes (`unit-js/10-identity.js`
3,292 B, `40-resume.js` 43,595 B, `50-loader.js` 18,413 B, six `index.html`).

⚠️ The first upload put mass-weight-01's three `unit-js` files into this folder (found by the byte check: 3,662 /
48,649 / 22,346 B; the served `40-resume.js` carried `methodica_science_mass_weight_` keys). Re-uploaded by the owner
within the hour; the check above is of the corrected folder. **Always run the byte check before the live check.**

## Part 01, first launch (empty document)

- `xapiwrapper.min.js` and `xapi-720-l.js` requested at 226 ms from the `<head>` preload; `saveState720OnLeave` present;
  `XAPI_USING_G` true; `UI_CHARACTER_KEY` is this unit's; state read 404 `absent`; 20 requests, no 4xx/5xx.

## Leave scenarios (part 01)

| Scenario | Done | Result |
|---|---|---|
| **nav** — `goTo(1)`, 1.5 s, `goTo(2)`, `location.reload()` in the same tick (the debounced write had not fired) | ✔ | relaunch landed on **screen 2**; Kata's document `v 6`, `component …-01`, `payload.currentScreen 2` — the leave save reached Kata through the keepalive path (on `-k` this landed one screen back) |
| **hidden** — `goTo(3)`, `visibilityState` faked to `hidden`, `visibilitychange` dispatched | ✔ | `stateLastResult720()` = `{op: 'leave', status: 204, ok: true, reason: 'ok'}` — one synchronous PUT, no fetch; the document read back 1.5 s later holds screen 3 |
| **answer** — answer an item and leave at once | not run | the answer commit path (`flushResumeSave`, page alive) is unchanged by this package; percent-03's live run covers it |
| **close** — close the tab | not run | inconclusive by construction (percent-03: a headless tab outlives the debounce) |

Firefox and Safari/iPad: not checked by hand (as for percent-03).
