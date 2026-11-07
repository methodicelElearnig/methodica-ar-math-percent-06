# Live verification — `methodica-math-percent-06`, package `2026-11-04`

Run 05.11.26 ~00:20 from the Claude desktop browser (Chromium) on the production CDN, after the owner uploaded
the package. Launch links from `Tools/full-kata-link/New-KataLaunchLinks.ps1`, learner `VADIM-FIX-1104`,
registrations `af18a4a6…` (part 01) and `dfdb07d2…` (part 02) — test data; registrations cut to 8 characters,
no token in this file. Links CSV: `Tools/full-kata-link/kata-links-methodica-math-percent-06-fixcheck-20261104-225542.csv`.

## CDN

All 87 paths of `deployments/2026-11-04/DEPLOY.md` checked by HEAD: the 16 overwritten and 33 added files answer
200 with exactly the byte size in the tables; the 38 deleted files answer with an empty body (this CDN's "not
there"). Nothing of the old media is left.

## Part 01, first launch (empty document)

- State read: 404 `absent` → fresh attempt, cover dropped in stage A, `_resumeReadFailed false`.
- The two library scripts were requested at 507 ms, from the `<head>` preload, in the same instant as the only eager
  image (`HOOK_001.png`, 72 KB). Bytes at load: 449 KB in 20 requests. Lazy images fetched at boot: 0; the two
  `data-src` clips (s4, s16) untouched.
- `goTo(1)`, `goTo(2)`: the document on Kata read back as `v 6`, `component …-01`, `payload.currentScreen 2`.

## Part 01, relaunch (same registration)

- Landed on screen 2, cover gone, `_resumeReady true`, `_resumeReadFailed false`, document still screen 2.
- **The drain scenario replayed on the live page against the real Kata document** (writes closed with
  `_resumeReady = false`, `goTo(1)` during the window, then stage B exactly as the loader runs it —
  `_resumeReady = true; drainPendingUnitState(); applyExecutionState(_unitState.payload)`): the document read back
  from Kata said screen 2 before, during the window, after the drain and 2.5 s after the restore (the debounced
  write). Restored screen: 2.

## Part 02, first launch (empty document) and relaunch

- Library at 317 ms (preload), then the landing clip `character_lifting-opt.mp4` at 704 ms, 344 KB, playing
  (1200×676 drawn at 600×338). Bytes at load: 441 KB in 21 requests. The five `loading="lazy"` images: none fetched
  at boot; `Q2-opt.png` (379 KB) came with screen 1, `Yoav-opt.png` (219 KB) with screen 2, both complete and sharp.
- Document after `goTo(2)`: `v 6`, screen 2. Relaunch: screen 2 restored, 350 KB transferred (clip from cache),
  no 4xx/5xx, nothing from the old file names.

## Slow 4G, cache disabled (owner's Chrome, part 01 relaunch, 05.11.26)

DevTools Network, throttling "Slow 4G" (1.6 Mbps / 560 ms RTT): `xapiwrapper.min.js` and `xapi-720-k.js` are the
first requests after the document (the preload), finished at 2.6 / 2.9 s, before any stylesheet or image; the only
eager image `HOOK_001.png` at 3.2 s; the metadata JSON at ~6.4 s, the state read (preflight + XHR) at ~7 s, the two
statements at ~8 s; the restored screen's clip `character_one-opt.mp4` (141 kB, 206) fetched after the restore. The
cover held until the restore; the landing screen was not shown. Largest first-load items are now the two AdobeClean
`.otf` fonts (250 + 254 kB) and `styles.css` (101 kB) — not part of this change.
