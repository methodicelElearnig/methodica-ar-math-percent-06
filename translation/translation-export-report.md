# Translation Refresh — 2026-09-27

**Export type:** refresh of the 2026-08-31 export, run against commit `8241c30` (main).
**Why:** the source changed a lot after the first export (QA/copy fixes across 06-01…06-06, and component 06 split into separate screens). Before this refresh, 125 of 941 units no longer matched the source text, and most `source-location` line numbers were out of date.
**Targets:** still all empty (952/952). No translator work existed yet, so part 06 could be renumbered safely (see below).

## Summary

| | Count |
|---|---|
| Units before → after | 941 → **952** |
| Source text updated (same ID kept) | 120 |
| New units | 30 |
| Removed units (text no longer in the build) | 19 |
| Part 06 units renumbered only (text unchanged) | 94 |
| `source-location` line numbers | all recomputed |

Every change, addition, removal and renumbering is listed row by row in **`translation-refresh-changes.csv`** (status, unit id, previous id, previous source, current source).

| Part | Units |
|---|---|
| 01 | 307 |
| 02 | 97 |
| 03 | 175 |
| 04 | 103 |
| 05 | 137 |
| 06 | 133 |

## Structural change — component 06 screens

Component 06 used to be two screens: `s54` plus the four merged sub-parts in `s5559`. It now has **six** separate screens (`data-screen` 0–5), which matches `unit-manifest.js` (`screens: 6`). The manifest now has these rows in place of the old single `06-06-01` row:

| Screen id | DOM | Content |
|---|---|---|
| 06-06-01 | `#s55` | Opening: parents' WhatsApp debate plus the published grade data |
| 06-06-02 | `#s56` | Section A: MultipleChoiceQuestion |
| 06-06-03 | `#s57` | Section B: SingleChoiceQuestion |
| 06-06-04 | `#s58` | Section C: DragAndDropQuestion |
| 06-06-05 | `#s59` | Section D: SingleChoiceQuestion |

All part 06 units (HTML and the `SCQ_HINT.s56–s59` JS units) were moved to their real screen and renumbered `06-06-0N-001…`. The data block ("הנתונים שהתפרסמו" plus the three grade lines) now appears on s55, s56 and s57 separately, so it has its own units on each screen.

## Main kinds of source change

- Retry titles now wrap their second line in `<span class="fb-regular">…</span>` (e.g. `זה לא מדויק,<br><span class="fb-regular">שננסה שוב?</span>`). This is in every part.
- Guided-practice stats in 06-01 now bold the fraction (`קלע <strong>21 מתוך 30</strong> מהזריקות`), and the goal line bolds its clause.
- New manual line breaks (`<br>`) in many feedback paragraphs across 03, 05 and 06.
- Copy edits, for example 06-02 s29 (Yoav's data package), 06-03 s3435 ("מהשלם" typo fixed, "ל-1" hyphenation), 06-05 s49/s52, and the 06-03 s33 hint.
- The old 06-03 unit that ended at "…ערך השבר." now includes its second sentence, "לאחר מכן נקרא את המונה לאחוז.", because the two sentences were merged into one paragraph.

## New units (30)

- `התשובה הנכונה` toggle buttons (static HTML): 06-03 s33 and s37, 06-05 s50 and s51, 06-06 s58.
- `התשובה שלי`: the JS-only relabel of that toggle. One consolidated chrome unit per part (`06-03-99-006`, `06-05-99-009`, `06-06-99-008`), following the same approach as `שנמשיך?`.
- 06-01 s03: new `role="math"` aria-label "2 חלקי 10 שווה 20 חלקי 100 שווה 20%".
- 06-02 s28: new equation label "ובצמצום הם" (×2, correct and incorrect feedback).
- 06-03 s3839: the speaker names אסיף / מיכאל on the comic bubbles are now separate elements, so each has its own unit (previously they were inside the quote units).
- 06-05 s51: the drag chips' visible labels אלפא / בטא / גמא. They must be translated **identically** to the `data-name-*` units on the same screen (see §9 of the original report).
- Part 06: nav aria-labels, back/continue buttons, image-zoom buttons and so on for the newly separate screens, plus `צדקתי?` on s58, which replaces the old `בדקתי`.

## Removed units (19)

- Scroll-hint labels ("גלילה לחלק הבא", "גלילה להמשך", "גלול למטה להמשך"). The scroll hint is now a hand-gesture graphic with no text.
- Image-zoom buttons and their `data-zoom-alt` removed from 06-02 s28/s29, 06-03 s37 and 06-04 s44/s45. The `<img alt>` units for those images stay.
- `שכבת ח׳: נתון - 78%` (×2) is now `שכבת ח׳: נתון` plus a separate `78%` span, so the old unit became a new unit with the shorter text.
- Old 06-03 s33 fragments "לאחר מכן נקרא את המונה לאחוז." were merged into the preceding unit (see above).

## Verification

| Check | Result |
|---|---|
| XML well-formed | ✅ |
| Duplicate ids | ✅ 0 (952 unique) |
| id shape `^06-\d\d-\d\d-\d\d\d$` and matches its `screen-id` note | ✅ |
| Every screen in the manifest has units, and every unit's screen is in the manifest | ✅ (only `06-00-99`, the module root, has no units, as intended) |
| Every unit's source found at its recorded `source-location` | ✅ 952/952. The one known exception is `06-01-17-019`, a JS string built from three concatenated physical lines (see original report §10) |
| Reverse coverage sweep (every Hebrew text node, attribute and JS string literal in parts 01–06 is covered) | ✅ 0 uncovered |
| All `<target>` empty | ✅ |
| Module-root `index.html`, `unit-shell.js`, `unit-manifest.js` | no Hebrew. Still 0 units |

No production file was modified by this refresh.

---

*The original 2026-08-31 export report follows unchanged, for reference. Its unit counts and part 06 screen structure describe the earlier build.*

---

# Translation Export Report — methodica-math-percent-06 (Target 4.6, Mathematics – Percent)

**Export type:** fresh export (no prior translation export found in this repository).
**Date:** 2026-08-31.
**Source language:** he (RTL). **Target:** empty (`<target>` populated by translator later).

---

## 1. Scope verification — actual parts vs. expected

Expected part list (given as a starting hypothesis): `01, 02, 03, 04, 05, 06`.

**Actual parts found on disk:** `01, 02, 03, 04, 05, 06` — **exact match, no discrepancy.** All six part folders (`methodica-math-percent-06-01` … `-06`) exist, each with `index.html`, `script.js`, `styles.css`, `motion.css`, `motion.js`, and (parts 02–06) `index_dev.html`.

**Structural discrepancies vs. the generic 720 template assumptions** (reported explicitly, not silently absorbed):

1. **Each part's JS file is `script.js` at the part root**, not `js/main.js` as the generic prompt assumes. There is no `js/` subdirectory anywhere in this project.
2. **The module root is not a plain LMS-redirect stub.** `index.html` at the repo root is a "production unit shell" (per its own header comment): a full-viewport `<iframe>` that loads component 01 and bridges a unit-wide `DEV_READY`/`DEV_STATE` postMessage protocol via `unit-manifest.js` + `unit-shell.js`. It carries **zero Hebrew learner-visible strings** — its `<title>` and the iframe's `title` attribute are both the non-translatable module identifier `"methodica-math-percent-06"`, not prose. This differs from the template's assumption of a redirect page with "מעבירים אותך ללומדה…" fallback text.
3. **Root-level `script.js`, `styles.css`, `motion.js`, `motion.css` are orphaned/dead files** — confirmed by direct grep that no HTML file (`index.html`, `index_dev.html`, or `viewer.html`) at the repo root references them. They are excluded from this export as non-rendered content, and flagged here as a repo-hygiene finding (possible cleanup candidates) rather than a translation issue.
4. **`viewer.html` and `index_dev.html` at the repo root** are dev-only QA tools (a device-preview harness and a Storyline-style dev sidebar respectively), analogous to the per-part `index_dev.html` files the base template already excludes by convention. Excluded here for the same reason.
5. **No report-a-problem / flag button, no confirm-close modal, and no resume/context popup exist anywhere in this module** (confirmed by grep across all 6 parts + root, not assumed). The template's chrome checklist item for these is therefore **not applicable** to this module.
6. **Part 01 has no `progress-question` nav and no image-zoom modal** — both features exist in parts 02–06 but not in part 01 (confirmed by grep: `progress-question` count = 0, `img-zoom` count = 0 in part 01). This is a real per-part chrome difference, not an extraction gap. Part 01 does have its own hint-popup overlay (`#warmup-hint-overlay`), used only by its final screen (s26).
7. **`metadata/*.json` does not exist anywhere in this repository** — the generic template's standard exclusion item for that path is moot here; nothing to confirm.

---

## 2. Screen manifest summary

**Total screens:** 40 numbered screens across the 6 parts, plus 6 part-level chrome pseudo-rows (`screen 99`, one per part) and 1 module-root chrome pseudo-row (`06-00-99`) — **47 manifest rows total.**

| Part | Numbered screens (`data-screen` values) | Count |
|---|---|---|
| 01 | 0–17 | 18 |
| 02 | 0–3 | 4 |
| 03 | 0–5 | 6 |
| 04 | 0–4 | 5 |
| 05 | 0–4 | 5 |
| 06 | 0–1 (screen 1 = `s5559`, four lettered sub-parts merged into one scrollable DOM section) | 2 |
| **Total** | | **40** |

This matches the project's own commit history ("Add unified 40-screen unit shell").

Screen numbering was **reused exactly** from each file's own `data-screen`/`id` attributes — no renumbering. Two screens are themselves composites of multiple original pptx slides merged into one DOM section, per the file's own authoring comments: `s3435` (part 03, screen 2) and `s3839` (part 03, screen 5) each merge two slides; `s5559` (part 06, screen 1) merges **four** lettered sub-parts (s56/s57/s58/s59 → MultipleChoiceQuestion, SingleChoiceQuestion, DragAndDropQuestion, SingleChoiceQuestion). These are documented in the manifest's `screen_title`/`screen_type` columns, not silently flattened.

Full screen-by-screen detail (title, template type, source file, container selector, unit count) is in **`translation-screen-manifest.csv`**.

---

## 3. Total translation units

**944 trans-units** across 7 `<file>` blocks in the XLIFF (module root + 6 parts).

### By part

| Part | Units |
|---|---|
| 01 | 307 |
| 02 | 99 |
| 03 | 175 |
| 04 | 107 |
| 05 | 132 |
| 06 | 124 |
| **Total** | **944** |

### By source file

| File | Units |
|---|---|
| `methodica-math-percent-06-01/index.html` | 281 |
| `methodica-math-percent-06-01/script.js` | 26 |
| `methodica-math-percent-06-02/index.html` | 92 |
| `methodica-math-percent-06-02/script.js` | 7 |
| `methodica-math-percent-06-03/index.html` | 160 |
| `methodica-math-percent-06-03/script.js` | 15 |
| `methodica-math-percent-06-04/index.html` | 97 |
| `methodica-math-percent-06-04/script.js` | 10 |
| `methodica-math-percent-06-05/index.html` | 123 |
| `methodica-math-percent-06-05/script.js` | 9 |
| `methodica-math-percent-06-06/index.html` | 114 |
| `methodica-math-percent-06-06/script.js` | 10 |
| module root (`index.html`) | **0** (see §1, point 2) |

Per-screen unit counts are in `translation-screen-manifest.csv`.

---

## 4. JS-string tracing (§ "trace JS strings before deciding")

Every Hebrew-bearing line across all 6 `script.js` files (182 lines total) was read in full context and classified:

- **Comments** (production notes quoting pptx/Hebrew text) — excluded, per spec, including Hebrew ones.
- **DOM-mirror button relabels** — JS lines that `.textContent =` a value that is **also** the button's own static HTML text elsewhere in the same part (confirmed by grep for each value, not assumed). These do **not** get their own trans-unit — no new content — but are logged so a translator/reviewer knows the JS must stay synchronized if the HTML original changes. ~20 such lines across parts 01–05 (`המשך`, `בחרתי`, `צדקתי?`, `חזרה`, `חזרה?`).
- **`'שנמשיך?'` (advance-to-next-question relabel)** — confirmed **never** present in any part's static HTML (grep across all 6 parts returned zero hits). Genuinely new, JS-only content, reused across multiple screens within parts 02–05. **Consolidated** into one trans-unit per part (4 units total: `06-02-99-005`, `06-03-99-005`, `06-04-99-002`, `06-05-99-002`), each listing every source line it recurs on, per spec §6's consolidation guidance (same part, genuinely interchangeable, same literal button state).
- **Genuine new JS-sourced content** (hint-popup bodies via `SCQ_HINT`/`WARMUP_HINT_HTML`, worked-solution feedback via `GVI.feedbackHTML`/`WARMUP_SOLUTIONS`/`LPV_FEEDBACK_BODY`, and the `PEAK_LETTERS`/progress-label chrome strings) — all traced to their actual DOM injection point (`innerHTML =`) and added as their own trans-units, tagged to the correct screen, with inline `<strong>`/`<br>`/`<span>` preserved literally.
- **Part 01's architecture differs from parts 02–06**: it does not use the `data-fb="correct"/"retry"` static-HTML feedback pattern the other parts use; instead it sets feedback titles/bodies dynamically via `title.textContent =` / `body.innerHTML =`. This means several strings that are static HTML in parts 02–06 (e.g. `יפה מאוד!`) are genuinely JS-only, new content in part 01 — confirmed individually against part 01's own HTML (no static occurrence found) before including them.
- **No xAPI/analytics-only Hebrew strings were found** in any part (grep for xapi/analytics/track call sites with Hebrew arguments returned zero hits) — nothing was excluded under that category because nothing qualified.
- **No `console.log/warn/error` calls contain Hebrew** in any part.

---

## 5. Consolidated duplicates

| Consolidated text | Part(s) | Occurrences merged | Reason |
|---|---|---|---|
| `שנמשיך?` | 02 | 4 (script.js lines 403, 526, 805, 926) | same literal JS-only button relabel, same part |
| `שנמשיך?` | 03 | 4 (lines 846, 938, 1074, 1103) | same |
| `שנמשיך?` | 04 | 2 (lines 362, 501) | same |
| `שנמשיך?` | 05 | 6 (lines 355, 468, 645, 683, 940, 996) | same |

No other consolidation was performed. Heavy verbatim repetition elsewhere (e.g. `חזרה`, `המשך`, `צדקתי?`, the entire report-modal-equivalent chrome, the "בואו נפתור יחד תרגיל ראשון" / "התבוננו בתרגיל הבא…" boilerplate repeated across 10 guided-practice screens in part 01) was **deliberately kept as separate units per screen**, per spec §6's default preference, since each occurrence has its own DOM location and screen context.

---

## 6. Excluded strings (with reasons)

**13 HTML fragments discarded** — in every case the extractor's regex matched a wrapper element (a `<div>` around a numeric input cell, or a `<div>` around a content `<img>`) whose only Hebrew content lives in a **nested element's attribute**, already captured separately as its own `attr`-kind trans-unit. Confirmed by reading each raw line directly; discarding avoids a spurious duplicate unit with no independent translatable content of its own.

| Part | Line | What it wrapped |
|---|---|---|
| 03 | 101, 104, 107, 114, 117, 120, 127, 130, 133 | `s33` score-table numeric-input cells (aria-label on the nested `<input>` already captured) |
| 03 | 358, 363, 368, 373 | `s37` color-table percent-input cells (same pattern) |
| 06 | 103 | content-image wrapper `<div>` (alt text on the nested `<img>` already captured) |

**Source-code comments** — excluded throughout, including Hebrew ones (this codebase's comments extensively quote pptx production notes in Hebrew, per the base template's expected pattern).

**`console.log/warn/error` diagnostics** — none found containing Hebrew (nothing to exclude).

**Decorative/`aria-hidden` elements** — one instance found and corrected rather than excluded outright: in part 01's guided-practice screens (`s16`), three `<span class="stat">` elements each contain a trailing empty `<span class="guided-highlight" aria-hidden="true"></span>` (a JS-driven highlight-animation hook, no text of its own). The extractor's same-line regex initially mismatched the nested-span boundary; corrected against the raw source to the real, complete text (see §9).

**`index_dev.html` (all parts + root), `viewer.html` (root), root-level orphaned `script.js`/`styles.css`/`motion.css`/`motion.js`** — excluded as dev-only tooling / non-rendered files (see §1).

**`css/*.css`** (all parts' `styles.css`, `motion.css`) — confirmed to contain no Hebrew content strings (checked, not assumed).

---

## 7. Out-of-scope items (still need translating, but not by this export)

**None found.** This module has no embedded YouTube videos (confirmed by grep — no `youtube` reference anywhere) and no other externally-hosted caption tracks. Part 01 does use one local video asset (`assets/videos/character_lifting.mp4`, a decorative looping animation with no captions/audio track), which is out of scope for a different reason: it carries no text at all.

---

## 8. Manual-review items (9 units)

| Unit ID | Text | Reason |
|---|---|---|
| `06-01-08-019` | `צדקתי` | Static button label on GVI (ValueInputQuestion) screen s17 uses `צדקתי` **without** a question mark — every other check-answer button in the module uses `צדקתי?`. Consistent across all 3 GVI screens (s17/s19/s21), suggesting an intentional per-template style, but not confirmed against an explicit producer note the way most other stylistic choices in this codebase are. Flagged for confirmation, not silently assumed. |
| `06-01-10-019` | `צדקתי` | Same pattern, screen s19. |
| `06-01-12-019` | `צדקתי` | Same pattern, screen s21. |
| `06-01-17-013`…`017` | `הגינה הקהילתית`, `מתקני מחזור הבקבוקים`, `קומפוסטר בית ספרי`, `מערכת איסוף מי גשמים`, `הסברה ופוסטרים` | JS-sourced worked-solution labels (screen s26) use the definite article ("the community garden") while the pie chart's own 5 aria-labels in the HTML (lines 1195–1199) use the same nouns **without** the definite article ("community garden"). A genuine wording inconsistency between two places describing the same 5 categories — flagged, not corrected. |
| `06-06-01-050` | `נניח שבשכבות השונות יש מספר שונה של תלמידים:<br>בשכבת ז' – 100 תלמידים. בשכבת ח' – 200 תלמידים. בשכבת ט' – 150 תלמידים.<br>כמה תלמידים בפועל נמצאים בתנועות נוער? גררו את הנתון למקום המתאים:` | The source file's **own** authoring comment, directly above this paragraph (index.html lines 306–315), already flags that the pptx's own answer-key chip placement (80→ז', 112→ח', 156→ט') contradicts simple percent×population arithmetic (200×78%=156, not 112; 150×70%=105, not 156). The original developer deliberately preserved the source's explicit values rather than guess which side is wrong, and flagged it for producer confirmation. Carried forward here since this exact paragraph is the one stating the 100/200/150 headcounts a translator will be working with. |

---

## 9. Logic-coupled / DOM-mirrored strings

- **The 5 `WARMUP_SOLUTIONS[].name` values** (unit IDs `06-01-17-013`…`017`) — order and meaning must stay aligned with the pie chart's own 5 image-zoom aria-labels in the HTML (screen s26). See §8.
- **The company names `אלפא`/`בטא`/`גמא`** on part 05's screen s51 (DragAndDropQuestion) — each name recurs **~7 times** on this one screen: the 3 `data-name-alpha/beta/gamma` attributes on the drag-slot buttons (one set per slot × 3 slots), the pool-chip button labels, the reference table, and both comparison-table feedback variants. All must be translated **identically** everywhere or the drag-and-drop matching and the reference/comparison tables will visually disagree post-translation. Flagged on the first occurrence of each (unit IDs `06-05-03-005`/`006`/`007`, the `data-name-*` attributes) and on the instruction paragraph that names them (`06-05-03-002`), per spec's default of not duplicating the same note ~20 times; **kept as separate trans-units** (not consolidated), per spec §6's stated preference for keeping same-part occurrences separate even when interchangeable.
- **`GVI` button-state pair (`צדקתי` → `המשך`)** on part 01's three ValueInputQuestion screens (s17/s19/s21) — both values already exist as static HTML elsewhere in the same part; the JS only re-asserts them on reset/submit (see §4, DOM-mirror log). Not new content, but logically coupled: if either static string is retranslated, `script.js` lines 401/455/785/821/1030 etc. must be checked for consistency, since they hard-code the Hebrew literal rather than reading it from the DOM.
- **720 templates key off `data-id`/element IDs, not displayed text**, for all standard SingleChoiceQuestion/MultipleChoiceQuestion answer options in this module — confirmed by reading `scqSelect()`/`mcqToggle()`-equivalent handlers in every part's `script.js`; answer-option text can be translated freely **except** for the DnD company-name and pie-chart-name cases documented above, where the text itself (not just a `data-id`) is what the matching/consistency depends on.

---

## 10. Normalized (non-byte-matching) strings — 15 total, all documented

| Count | Category |
|---|---|
| 4 | Multi-line HTML paragraph **split** around an embedded interactive `%`-input control (part 01, screen 3 — the two battery fill-in-the-blank sentences). Per spec §5, no placeholder convention is defined for an inline form control, so each was split into its natural leading/trailing text halves rather than inventing an undocumented placeholder; cross-referenced via developer-notes to the input's own aria-label unit. |
| 1 | Multi-line **JS string concatenation** join (`WARMUP_HINT_HTML`, part 01, 3 physical lines joined with no separator). |
| 4 | Multi-line **HTML `<p>` recovered by sweep 2** (see §12) — genuine paragraphs spanning multiple physical lines via `<br>`, joined per spec §5's "drop the newline-plus-indentation, preserve `<br>`" rule. |
| 4 | **Consolidated `שנמשיך?`** JS-only chrome units (see §5) — `source-location` lists multiple lines by design, so no single line is expected to match. |
| 2 | **JS single-quote escaping** — part 06's `s58` hint string is itself JS-single-quoted, so each geresh/apostrophe after ז/ח/ט is written as an escaped `\'` in the raw file (JS syntax, not learner-visible content); the stored unit uses the plain rendered `'` character. |

---

## 11. Malformed or ambiguous screen structures

None found that required inventing a numbering scheme — `data-screen` was discoverable and used as-is throughout. The only structural ambiguity worth flagging is the **two/four-way merged screens** (`s3435`, `s3839`, `s5559`), documented in §2 and in the manifest rather than split into invented sub-screen IDs (since the DOM itself uses one `data-screen` value for each).

---

## 12. Verification (§10 of the export spec) — mandatory, both sweeps run

### Sweep 1 — byte-for-byte source match

**929 / 929 checked units match their recorded source line literally (100%).** 944 total units minus 15 documented, individually-reasoned exceptions (listed in §10 above) = 929 checked. Every one of those 929 passed. Zero unexplained transcription errors remain.

### Sweep 2 — independent reverse coverage sweep

An **independent, tag-blind** re-extraction (not reusing the tag-aware extraction regex — a fresh script that strips comments, strips *all* tags with a generic pattern, and separately re-scans every attribute on every tag, plus every JS string literal outside comments/`console.*`) found **981 Hebrew-bearing fragments** across all 6 parts. After building this XLIFF, **0 fragments remain uncovered.**

This sweep is what caught a real, structural gap in the first extraction pass and is the reason the unit count is 944 rather than the ~938 the first pass alone would have produced:

**6 genuine misses recovered**, all sharing one root cause — a `<p ...>` opening tag with nothing after it on the same physical line (all its text starts on the next line), which the original extractor's multiline-candidate detector never flagged because it only checked for trailing text on the *same* line as the opening tag:

| Unit ID | Screen | Text (truncated) |
|---|---|---|
| `06-01-08-014` | s17 | "כדי להשוות בקלות, נרצה להפוך את כל השברים לאחוזים.\<br\>אחוז פירושו…" |
| `06-02-03-002` | s30 | "במסיבת יום הולדת הוגשו שלוש עוגות זהות…" |
| `06-03-01-002` | s33 | "במבחן במתמטיקה היו 20 שאלות…" |
| `06-03-04-002` | s37 | "בסקר שנערך לבחירת צבע לעיצוב חדש של נעלי ספורט…" |
| `06-05-03-002` | s51 | "סדרו את שלוש החברות (\"אלפא\", \"בטא\", \"גמא\")…" |
| `06-06-01-050` | s5559 (sub-part ג) | "נניח שבשכבות השונות יש מספר שונה של תלמידים…" (see §8 for its manual-review flag) |

The sweep also caught (and led to fixing) **two extraction bugs found during construction, before the sweeps were finalized**:
- A same-tag-nesting truncation bug (non-greedy regex stopping at the wrong nested closing tag) affecting 3 lines in part 01 and 6 lines in part 05 — corrected against raw source (documented in `manual_data.py` as `FIX_HTML`).
- A duplicate-content bug where the fix above was initially applied by line number only, clobbering a second, unrelated, already-correct fragment sharing the same line (part 05, "3 מתוך 4") — caught by a full re-scan for duplicate content and corrected before this report was written.

### Post-sweep structural validation

| Check | Result |
|---|---|
| XML well-formed | ✅ pass |
| No duplicate `trans-unit` ids | ✅ pass (944 unique ids for 944 units) |
| Every unit has a `screen-id` note | ✅ pass |
| Every screen id referenced by a unit exists in the manifest, and vice versa | ✅ pass (the only manifest row with 0 units is `06-00-99`, the module root — confirmed intentional, see §1) |
| Every `<target>` empty | ✅ pass (944/944) |
| Every `source-location` points at a real file and an in-range line | ✅ pass (0 out-of-range) |
| IDs match the `{target}-{part}-{screen}-{string}` shape | ✅ pass (0 malformed, regex `^06-\d\d-\d\d-\d\d\d$`) |
| Placeholders intact | N/A — this module contains no `{tooltip:WORD}`-style trigger words and no runtime-interpolated `{value}`-style content (confirmed by grep for both patterns across all parts); the placeholder-preservation rule simply doesn't apply here. |

---

## 13. Refresh workflow

**Not applicable.** No prior translation export exists anywhere in this repository (confirmed: no `translation/` directory, no `.xlf`/`.xliff` file, prior to this session). This is a fresh export; §7 of the export spec (refresh procedure) was not invoked.

---

## 14. Production-file integrity

**No production file was modified.** Every script used for extraction, verification, and generation ran from a session scratchpad directory outside the repository; the only writes made *inside* the repository were the three new files under `translation/` (this report, the XLIFF, and the manifest CSV) — a brand-new, previously-nonexistent directory.

**⚠️ The `translation/` directory is currently untracked in git.** Nothing here is committed. If this machine is lost, reset, or the working tree is cleaned before a commit, everything in this folder — including any translator's returned work, once populated — could be lost without trace. **Recommend committing `translation/` (or at minimum this export) before handing it to a translator.**
