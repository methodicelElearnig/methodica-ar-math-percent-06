# Production Plan — methodica-math-percent-06 (יעד 4.6, אחוזים)

Read `PROJECT_CONTEXT.md` first — it defines the source-of-truth hierarchy
this plan follows. Every screen below is classified by **source**, using
that hierarchy's categories:

- **Figma canonical** — a direct match exists in Figma node `196:3196`
  (`Screen Templates`) that also matches one of `720-templates`' 8 known
  question-template types (SingleChoiceQuestion, MultipleChoiceQuestion,
  DragAndDropQuestion, ValueInputQuestion, DropdownQuestion,
  FlipCardsReveal, MemoryGame, TwoOptionSelection). Build from the
  `720-templates` reference file + the matched Figma component, Math mode.
- **Figma + figma-lomda-builder** — a Figma frame exists under node
  `196:3196` (or a plausible candidate does) but it is **not** one of the
  8 canonical `720-templates` types — e.g. `TableQuestion`,
  `FillInTheBlankTableQuestion`, `StepByStepGuidedSolution`,
  `VideoLearningJourney`, `TextWithCallout`, `FullImageWithTextOverlay`.
  Use `figma-lomda-builder` to translate the actual frame; do not assume
  behavior — read the frame directly.
- **Custom (last resort)** — no Figma frame has been confirmed to exist
  for this interaction at all. Flag explicitly; do not build until a
  designer/Figma check happens.
- **04-03 optional reference** — noted only where a similar interaction
  was already built in `../methodica-math-percent-04-03` and could be a
  useful behavioral comparison. This is never the primary source — see
  `PROJECT_CONTEXT.md` §4 for the rules governing when/how to use it.

Several rows below still say "pending Figma confirmation" — that reflects
the actual state of research done so far (a Figma survey of node
`196:3196` found template *names*, not exact per-instance node IDs for
every frame — `get_metadata` errored on the full library tree). Confirm
the exact frame before building, don't assume the name match is enough.

---

## Screen mapping

Divider slides (2, 31, 40, 46, 52) are assumed non-screens (script
organization markers only) — **unconfirmed**, see `CONTENT_FLAGS.md`.

| Slide(s) | Item ID | Screen type | Source classification |
|---|---|---|---|
| 1 | — | (not a screen — metadata cover) | — |
| 3 | -01-001 | MultipleChoiceQuestion (select-all, "בחרתי" commit step) | **Figma canonical** — `720-templates/MultipleChoiceQuestion.md` + Figma `Screen Templates/MultipleChoiceQuestion` |
| 4 | -01-001 | FlipCardsReveal | **Figma canonical, ⚠ governance flag** — `720-templates/FlipCardsReveal.md` + Figma `content Flip Cards` (lives in flat `components/` root, not the `Screen Templates/` namespace — confirm it's current/approved, not superseded, before use) |
| 5–12 | -01-001/002 | Scrolling narrative w/ locked interactive checkpoints (embedded SCQ @ slide 8, embedded ValueInput @ slide 11) | **Figma + figma-lomda-builder, unconfirmed frame** — no 720-templates match; closest Figma candidates (`VideoLearningJourney`, `FullImageWithTextOverlay`) don't obviously fit the "locked scroll" mechanic — needs an explicit Figma check before building. Slides 6–11 (sections 1–6 of screen 4) built 2026-08-09, ported from `720-templates/ValueInputQuestion.md` (Variant A) for slide 11 rather than a dedicated Figma frame — the frame-confirmation gap above still applies to the narrative/scroll-lock mechanic itself, not to the value-input component styling. Slide 12 (the pop-up percentage reveal, section 7) also built 2026-08-09 — same unconfirmed-frame status as the rest of this row; its two percentage callouts are custom HTML/CSS bubbles (reusing section 1's `.lp-alert` speech-bubble language), not a Figma component match. |
| 13 | -01-003 | Transition/character screen | **Figma + figma-lomda-builder, unconfirmed frame** — not one of the 8 canonical types; identify the actual Figma frame before building. *04-03 optional reference:* `transInit()` pattern (`script.js:3268`) solved a similar "character + message, timed continue" screen — useful for behavior comparison only |
| 14–24 | -01-003 | Worked-example / guided-practice segment — **built in full, 2026-08-10** (narrative, no-feedback SCQ x2, single-submission guided value-input x3, percentage reveals x3, closing summary) | **Figma + figma-lomda-builder, unconfirmed frame** — no Figma frame was ever confirmed for this segment; built from the production script + this project's own `.guided-layout`/`.guided-card`/`.guided-panel` chrome instead (same chrome slide 17's Phase 0B pass established). *04-03 optional reference:* the "Candy" (`s16`–`s29`) guided-practice implementation's two-column card/panel shape informed the layout pattern; its own content (a different worked example, "מציאת השלם") was not reused. A direct Figma comparison for this segment is still outstanding — treat as content/behavior-complete but not Figma-verified. |
| 25, 27, 32, 36, 41, 47, 53 | various | Transition/character screens | Same as slide 13 — **Figma + figma-lomda-builder, unconfirmed frame**; 04-03 `transInit()` optional reference only |
| 26 | -01-004 | Interactive pie-chart value-input (5 fillable %) | **Custom (last resort), unconfirmed** — no Figma frame confirmed; `TableQuestion`/`FillInTheBlankTableQuestion` are tabular, don't visually fit a radial layout — needs explicit Figma/designer check before any code |
| 28, 29 | -01-005/006 | SingleChoiceQuestion (standard, w/ hint) | **Figma canonical** — `720-templates/SingleChoiceQuestion.md` + Figma `Screen Templates/SingleChoiceQuestion` |
| 30 | -01-007 | DragAndDropQuestion (fraction/image matching), ⚠ variant unconfirmed | **Figma canonical, variant TBD** — `720-templates/DragAndDropQuestion.md` + Figma `NumericDragAndDropQuestion` or `ImageDragAndDropQuestion` (confirm which) |
| 33, 37 | -02-001/003 | ValueInputQuestion (fill-in table) | **Figma + figma-lomda-builder** — likely `Screen Templates/TableQuestion` or `FillInTheBlankTableQuestion` (Figma-only, not one of the 8 canonical types). *04-03 optional reference:* the "Battery" `.triple-table`/`.table-input` pattern (`styles.css:3042-3405`) solved a similar fill-in table, for behavior comparison only |
| 35 | -02-002 | MultipleChoiceQuestion **or** DropdownQuestion, ⚠ ambiguous | **Figma canonical, type TBD** — either `Screen Templates/MultipleChoiceQuestion` or `Screen Templates/DropdownQuestion-*`; confirm against the actual Figma frame before building (see `CONTENT_FLAGS.md`) |
| 38, 39 | -02-004 | SingleChoiceQuestion | **Figma canonical** — as slides 28/29 |
| 42, 44, 45 | -03-001/2/3 | SingleChoiceQuestion | **Figma canonical** — as slides 28/29 |
| 43 | -03-002 | SingleChoiceQuestion ⚠ no answer options extracted | **Figma canonical, pending content** — see `CONTENT_FLAGS.md`; may actually be ValueInputQuestion once resolved |
| 48, 51 | -04-001 | SingleChoiceQuestion (capstone א, ד) | **Figma canonical** — as slides 28/29 |
| 49 | -04-001 | ValueInputQuestion (capstone ב), ⚠ Figma note mislabels as SCQ | **Figma canonical** — `720-templates/ValueInputQuestion.md` + Figma `Screen Templates - ValueInputQuestion` (note the `" - "` separator in this component's own Figma name — a naming quirk, not a different template) |
| 50 | -04-001 | DragAndDropQuestion (rank-order, capstone ג), ⚠ ordinal-target support unconfirmed | **Figma canonical, pending verification** — `720-templates/DragAndDropQuestion.md` + Figma `NumericDragAndDropQuestion`; confirm the template's target model actually supports ordinal/rank targets before building |
| 54 | -05-001 | TransitionScreen/Launch (not a question — corrected mapping, built 2026-08-17 as `methodica-math-percent-06-06`'s `s54`; the old "content missing, hard blocker" row was based on a stale "שקף 149" reference that actually belongs to slide 55, see `CONTENT_FLAGS.md` #9 Resolved) | Same as slide 13 — Figma + figma-lomda-builder, unconfirmed frame |
| 55-59 | -05-001 | ONE continuous scroll screen (`s5559`), not 5 separate screens: opening context (55) + MultipleChoiceQuestion select-all (56, floating data) + SingleChoiceQuestion (57) + DragAndDropQuestion numeric fill (58) + SingleChoiceQuestion (59). Built 2026-08-17 as `methodica-math-percent-06-06` | **Figma canonical** per-template (MCQ as slide 3, SCQ as slides 28/29, DnD as `720-templates/DragAndDropQuestion.md`) — the scroll-container shell itself is a custom build (06-01/06-03's `.lp-scroll` pattern), same "Figma + figma-lomda-builder, unconfirmed frame" status as the equivalent scroll-screen rows above |

**Local variants** (same family, not a new template, per
`720-design-guidelines/templates-and-variants.md`):
- Slides 15, 23: SingleChoiceQuestion, no feedback text, correct option
  highlighted only.
- Slide 3: MultipleChoiceQuestion with an explicit "בחרתי" commit step
  before feedback appears — verify against the base
  `MultipleChoiceQuestion.md` spec; document as a small delta if one
  exists.

---

## Interactions needing special adaptation (flag now, decide at the relevant phase)

- **Slide 11** — resolve "אין ניסיונות מענה" with the content author
  before wiring this ValueInputQuestion's attempt-gating logic.
- **Slides 15, 23** — no-feedback SCQ local variant.
- **Slide 50** — verify `DragAndDropQuestion.md`'s target model supports
  ordinal/rank targets before building.
- **Capstone gating** ("≥3 of 4," "≥2 of 3," "≥1 of 2" sub-questions,
  components 4 & 5) — check whether the shared `Progress Question`
  component (`720-templates/_global-components.md`) already covers this
  when that phase is reached. No gating/scoring architecture is designed
  ahead of need.
- **Companion-character system** — no character-selection screen exists
  anywhere in the 58-slide script. Confirmed by exhaustive review, not a
  silent assumption — flag for explicit sign-off since it deviates from
  the typical 720 pattern.

---

## Assets — extract-and-match first

`docs/math-percent-06-script.pptx.pptx`'s own `ppt/media/` folder contains
95 embedded image/svg files. Before flagging anything as "missing," export
that media and match filenames/content against the names below.

**Character transition GIFs (production notes call for animated GIFs):**
`character_one` (finger raise), `character_hot` (flames),
`character_lifting` (weightlifting), `character_computer`,
`character_testb`, `character_gift` (pulling out a gift), `character_3_4`,
and one unnamed "2 fingers" gesture GIF (slide 53).

**Illustrations:** `HOOK_001`; `LearningPhase_001`–`004`; `APP`
(steps-challenge app mockup); 5-segment budget pie graphic (slide 26); 3
differently-cut cake illustrations (slide 30); `Q2, Yoav, Q5, Q6, Q7, Q8,
Q9, Q10, Q12, Q13, "100", "-100"`.

**Already extracted and in place:** the three friends' photos for slide 17
— `assets/img/s17-{dani,gal,alon}.png`, pulled directly from the pptx's own
embedded media (shape names `תמונה 22/27/31` on slide 17), not
placeholders.

---

## Implementation phases — small checkpoints

### Phase 0A — Minimal scaffold (done)
Canvas/nav engine (`scaleApp`, `goTo`/`resetScreenState`) per
`720-templates/_global-components.md` → "Canvas & engine" — this is an
*architecture* spec, not a visual one, so it isn't subject to the
Figma-vs-04-03 distinction; 04-03 happens to implement the same
architecture, which served as a working confirmation, not the source.
`index_dev.html`/`viewer.html` (QA tooling, screen list auto-derived from
the app's own state — see `PROJECT_CONTEXT.md`). `var(--subject-*)` Math
theme tokens per current Foundations (node `618:10116`).

### Phase 0B — One representative screen: slide 17 (done, mid-QA)
Built; see `PROJECT_CONTEXT.md` "Current status" for the honest build
history (leaned on 04-03 more than the current hierarchy prescribes in the
first pass; since corrected for column order and typography against
current `720-design-guidelines` tokens). **Outstanding:** a direct
comparison against the actual Figma canonical frame for this interaction
has not yet been done — do that before considering this screen fully
verified, not just against the design-guidelines token table in isolation.

### Phase 1 — Rest of the worked-example segment (slides 13–16, 18–24)
**Done (2026-08-10 session)**, together with a proper re-implementation
of slide 17 (superseding the earlier deferred prototype) — see
`PROJECT_CONTEXT.md` "Current status" for the full build/QA writeup and
`CONTENT_FLAGS.md` items #18-21 for source inconsistencies found and
preserved-with-flag, not silently corrected. No Figma frame was found or
confirmed for this segment (the "unconfirmed frame" status below was
never resolved) — built from the production script + this project's own
established `.guided-layout`/`.guided-card`/`.guided-panel` chrome
instead, per the decision order's own fallback path once A-D turn up no
match. Slide 21's missing production-notes flag (`CONTENT_FLAGS.md` #1)
remains open (content-author policy confirmation, not a build blocker) —
implemented per the same single-submission pattern as slides 17/19.
TODO still outstanding: replace `character_one.png` (screen 13) with the
producer-requested animated GIF once supplied (`CONTENT_FLAGS.md` #21).

### Phase 2 — Component 1 remainder (slides 3–4, 5–12, 25–30)
Slide 3: Figma canonical MultipleChoiceQuestion. Slide 4: Figma canonical,
pending the FlipCardsReveal governance flag. Slides 5–12 and slide 26:
Figma + figma-lomda-builder, both pending frame confirmation. Slides
28–30: Figma canonical SCQ/DragAndDropQuestion (variant pending).

### Phase 3 — Component 2 (slides 32–39)
Figma + figma-lomda-builder table pattern (33, 37) + Figma canonical SCQ
(38–39) + slide 35's template pending classification.

### Phase 4 — Component 3 (slides 41–45)
Figma canonical SCQ throughout; no enrichment screen (confirmed absent,
slide 40). Slide 43's missing answer-option text flagged.

### Phase 5 — Component 4 / capstone A (slides 47–51)
Figma canonical SCQ + ValueInputQuestion + DragAndDropQuestion
(rank-order, target-model fit pending verification). Capstone gating
logic designed at this phase, checked against `Progress Question` first.

### Phase 6 — Component 5 / capstone B (slides 53–58)
Figma + figma-lomda-builder transition + Figma canonical
MultipleChoiceQuestion/DragAndDropQuestion/SCQ. **Slide 54 is a hard
content blocker** — the rest of this phase's slides don't depend on it.

### Phase 7 — QA pass
`lomda-qa-publish` (asset/unused-file audit), `responsiveness` skill,
accessibility pass, final sweep confirming every item in
`CONTENT_FLAGS.md` was actually resolved (not just built around).
