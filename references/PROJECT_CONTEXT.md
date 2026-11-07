# Project Context — methodica-math-percent-06 (יעד 4.6, אחוזים)

Read this file first, in every new session, before touching code or making
implementation decisions.

## Source-of-truth hierarchy (authoritative order)

### 1. Design source of truth — Figma

File: **`720 - UI Templates`** (`eSbp4bKHgBky0rakDb8l9N`)

- **Foundations** — [node `618:10116`](https://www.figma.com/design/eSbp4bKHgBky0rakDb8l9N/720---UI-Templates?node-id=618-10116)
  — colors, subject theming, typography, icons, base tokens. This is a
  **Math unit** → always use **Math mode** (purple values). Never Science
  mode / blue values. Every subject-colored UI element in this unit must
  derive from the current Math Foundations tokens (`Subject/100`–`900`,
  `Subject/Gradient/Math`, `Subject/Alpha/100-200`) — never a hard-coded
  hex value copied from an old project.

  **Verified Math Mode token values** (read directly from Figma node
  `618:10116`, "Colors" frame → "SUBJECT / MATH MODE — PURPLE VALUES" row,
  cross-checked against `720-design-guidelines/colors-and-gradients.md` —
  exact match; verification date 2026-08-05, color-system-validation
  session). Future sessions can read this table directly instead of
  re-deriving it from Figma:

  | Token | Hex |
  |---|---|
  | Subject/100 | `#EAD9FF` |
  | Subject/200 | `#CEC7FF` |
  | Subject/300 | `#E1D9FF` |
  | Subject/350 | `#B3B0FF` |
  | Subject/400 | `#BDB3FC` |
  | Subject/500 | `#3B2FC2` (Figma's own printed label is blank for this one swatch only — every other swatch shows its hex; value confirmed by direct pixel-sampling of the rendered swatch, not guessed) |
  | Subject/600 | `#383896` |
  | Subject/700 | `#5656CC` |
  | Subject/800 | `#4B35A5` |
  | Subject/900 | `#2F2478` |
  | Subject/Alpha/100 | `#A51CFF` @ 0% opacity |
  | Subject/Alpha/200 | `#A51CFF` @ 30% opacity |
  | Subject/Gradient/Math | `linear-gradient(to bottom, #6F6AD5 8.654%, #4B35A5 38.462%, #270075 100%)` |

  This project's `styles.css` `:root` `--subject-*` custom properties
  (100–900, alpha-100/200, gradient) were checked hex-for-hex against this
  table and match exactly — no correction was needed. No Science/blue
  subject tokens are used anywhere in the learner-facing UI. Future screens
  must consume `var(--subject-*)` for any subject-role color — never
  introduce a new hard-coded purple hex, per
  `figma-lomda-builder/subject-theming.md`.
- **Screen Templates** — [node `196:3196`](https://www.figma.com/design/eSbp4bKHgBky0rakDb8l9N/720---UI-Templates?node-id=196-3196)
  (canvas name: "Screen Templates", frame `1284:23638`) — the official 720
  screen templates and components. When building a screen, **identify the
  matching template here first.** Most required interactions already exist
  in this library and need Math-theming/content adaptation, not a redesign.

Figma wins on any conflict with anything else listed below, including this
file's own memory of prior sessions.

### 2. Implementation/architecture source of truth — current 720 skills

Primarily:
- `720-templates` — canonical template behavior/architecture (the 8 known
  question-template types, global components: canvas engine, feedback
  popup, nav chrome, hint policy, etc.)
- `720-design-guidelines` — visual rules: colors/gradients, typography,
  naming, RTL visual rules, component reuse
- `figma-lomda-builder` — translates an actual Figma frame into working
  HTML/CSS/JS (RTL mechanics, subject-theming implementation)
- `lomda-qa-publish` — pre-publish QA/cleanup
- any other currently-installed 720-family skill relevant to the task

**Figma defines how a component should look. The 720 skills define how it
should be implemented and behave.** Use both together. Do not hand-roll a
component when a canonical 720 template already covers it, and do not
reach for old project code when the current 720-templates architecture
already specifies the correct implementation.

### 3. Content source of truth — production script

`docs/math-percent-06-script.pptx.pptx` — defines content, wording, screen
sequence, questions, answers, feedback, hints, attempts, production notes,
and required media. **Never silently modify or "correct" script content.**
Any ambiguity gets flagged (see `CONTENT_FLAGS.md`) — it does not get
resolved by guessing.

### 4. `../methodica-math-percent-04-03` — secondary reference only

This is **not** the design source of truth and **not** the implementation
baseline for 4.6. It is a same-subject-family project that solved some
similar interactions before (notably a worked-example/"guided practice"
style segment). Use it only:
- selectively, when it helps understand how a similar Math/Percent
  interaction was previously solved;
- when the user explicitly asks to compare against it;
- as a behavioral sanity-check (an interaction flow that's already been
  built and tested once).

**Never:**
- copy its styling as a default;
- copy its hard-coded purple hex values (it has no CSS variables at all —
  this project uses `var(--subject-*)` bound to current Math Foundations
  tokens instead);
- assume its typography/spacing is current (it predates the approved
  typography token table this project follows);
- assume its component implementation is newer/more authoritative than the
  current `720-templates` skill;
- use it to override Figma or the current 720 skills.

If 04-03 conflicts with current Figma or current 720 skills, **Figma/current
skills win**, always.

**Guardrail:** do not let this project gradually become a visual copy of
04-03. The finished unit must look like the *current* 720 Math design
system in Figma — 04-03 is historical/reference context, nothing more.

## Required decision order — for every new screen

A. Read the relevant screen/content from the production script
   (`docs/math-percent-06-script.pptx.pptx`).
B. Identify the matching canonical screen/template in Figma node
   `196:3196`.
C. Read the corresponding current `720-templates` / `720-design-guidelines`
   documentation for that template.
D. Use `figma-lomda-builder` where needed to translate the actual Figma
   design accurately (RTL mechanics, subject-theming implementation).
E. Apply Math mode from Foundations node `618:10116`.
F. **Only then**, optionally consult 04-03 — only if a previous
   implementation example would genuinely help (e.g. you explicitly want
   to compare an interaction flow).
G. Custom implementation is the **last resort** — only when no suitable
   current Figma/720 template exists after checking A–D. Even then, check
   `PRODUCTION_PLAN.md`'s "Figma-only, needs figma-lomda-builder" list
   first; a screen landing there already means this was checked once.

## Session-start workflow (do this before proposing any plan)

1. Read this file (`references/PROJECT_CONTEXT.md`).
2. Read the relevant section of `references/PRODUCTION_PLAN.md`.
3. Read `references/CONTENT_FLAGS.md`.
4. Read the relevant production-script slide(s).
5. Inspect the relevant Figma template (node `196:3196` for screens,
   `618:10116` for Foundations/tokens).
6. Read the applicable current 720 skill/template documentation.
7. Only then propose the session's plan.

Do not make implementation changes until the session's scope is
understood from the above. For any substantial change, use Plan Mode
first — don't start editing files during scoping.

## Current status (keep this section accurate — update every session)

- **2026-08-17 session (follow-up) — methodica-math-percent-06-06 built in
  full (שאלת שיא, מועד ב' / Peak Question B, pptx slides 54-59, item id
  methodica-math-percent-06-05-001):** New, self-contained component
  folder. `TOTAL_SCREENS = 2`, `NAV_FLOW = [0,1]` — **not** 6 screens: per
  explicit instruction, slides 55-59 are ONE long continuous scroll screen
  (`s5559`) reached by scrolling, not five discrete screens swapped by
  Continue clicks (unlike this component's sibling, `06-05`, whose
  parallel Peak Question A used 4 discrete `goTo()`-navigated screens).
  - **s54** — TransitionScreen/Launch, reusing `.s13-content`/
    `.s13-text-group` verbatim (06-01/02/04/05). 5 staged lines, the FIRST
    ("משימת שיא 2") emphasized in this unit's purple per explicit
    instruction (the pptx's own text order puts it first, unlike 06-05's
    `s48` where the emphasized line sits mid-sequence). Asset
    `character_3_4.png` — the exact same pptx media (`image70.png`) 06-05's
    own `s48` already uses; this slide's rels point at the identical file
    (both Peak-Question launch screens reuse the same mascot artwork).
    Resolves `CONTENT_FLAGS.md` flag #9 (see its new Resolved entry) — the
    old "hard content blocker" flag was based on a stale slide-149
    reference that actually belongs to slide 55, not 54; slide 54 itself
    was never missing content.
  - **s5559** — one `.lp-scroll` container (ported/generalized from
    06-03's `s3435`/`s3839` generalization of 06-01's Learning Phase),
    with the `progress-question` nav FIXED outside the scroller (06-03's
    own correction over 06-01's original inline placement) so it stays
    visible regardless of scroll position; the "current" ring highlight
    tracks scroll position live (`pkSyncCurrentRing()` in `script.js`),
    not just screen-entry, since — unlike every discrete-screen component
    before it — more than one section's interactive state is initialized
    up front here. Direct children ("pages"): `s55` (opening narrative,
    plain `.lp-section` two-column shell) → `s56` (MultipleChoiceQuestion,
    א') → `s57` (SingleChoiceQuestion, ב') → `s58` (DragAndDropQuestion,
    ג') → `s59` (SingleChoiceQuestion, ד'). Feedback on every section
    renders INLINE in normal flow (`.scq-feedbox--inline`, 06-03's
    documented local variant) rather than 06-05's floating `.scq-feedbox`
    popup, since more than one section can be simultaneously resolved
    while scrolling and each must stay visibly in view. Resolving a
    section hides its own hint+check action row entirely
    (`pkHideActions()`) instead of relabeling/pulsing a "שנמשיך?" button
    toward a next screen — there is no discrete next screen inside one
    continuous scroll flow; only `s54-continue` (the launch screen) pulses
    in this component.
  - **s56 (א', MCQ select-all)** — new engine, no graded multi-select
    precedent existed anywhere in this unit before now (06-01's `hook1` is
    an ungraded reflection variant) — modeled directly on the scq engine
    (same 2-attempt/feedback/hint shape), reusing 06-01's
    `.hook1-checkbox` square-indicator verbatim on the standard `.scq-opt`
    pill rather than inventing new checkbox styling. Correct: ב + ג (7 of
    10 / 70%, the two restatements of ט''s true participation rate; א and
    ד conflate percent with headcount). This slide's floating "published
    data" (ז'=4/5=80%, ח'=78%, ט'=7/10=70%) — hidden inside an
    `mc:AlternateContent`/`mc:Fallback` pair in the pptx's own XML,
    invisible to a plain shape-text read, same recurring hidden-content
    class this project has hit before (OMML/native-tables/grouped
    shapes) — is rebuilt as a live sticky `.pk-data-card` (no
    `position:sticky` precedent existed anywhere in this project before
    now; modeled on `.dnd-reference`'s established floating-card visual
    language) instead of the flat bordered PNG the pptx supplies, per its
    own production note ("...צריכים לצוף... במקום התמונה").
  - **s57 (ב', SCQ)** — "which grade has the lowest participation %?",
    correct = ט' (70%, the lowest of 80/78/70). Same sticky data card.
    Asset `Q10.png` (`image79.png`). Feedback equations reconstructed from
    this slide's own hidden AlternateContent correct/wrong2 content
    (rendered there as PNGs, `image91.png`/`image92.png` — real authored
    text, not invented).
  - **s58 (ג', DnD)** — headcount fill-in (ז'=100→?, ח'=200→?, ט'=150→?
    students actually in youth movements), reusing 06-05's `s51` DnD
    engine verbatim (only the domain changes — 3 headcount chips instead
    of 3 company names). Floating "תזכורת:" reference table
    (שכבה/ייצוג/אחוז), reusing `.dnd-reference`/`.dnd-ref-table` verbatim,
    made sticky. **Content flag** (`CONTENT_FLAGS.md` #34): the pptx's own
    chip-position answer key (ז'=80, ח'=112, ט'=156) doesn't reconcile
    with simple percent×population arithmetic (which would give ח'=156,
    ט'=105) — shipped the pptx's own explicit positions as-is rather than
    guessing which side is the real error, per this project's established
    "preserve source's own explicit values" precedent.
  - **s59 (ד', SCQ)** — last section, no further screen exists (last slide
    in the 59-slide deck) — the whole component's own `s5559-continue`
    stays a disabled dead end after resolving, same precedent as every
    prior component's chain-end (06-05's own `s52`, 06-04's `s46`, etc.).
    Asset `Q11.png` (`image87.png`). Correct: option ב (percent-based
    comparison is fair across differently-sized grades).
  - **Content flag** (`CONTENT_FLAGS.md` #35): slides 56/57 have no
    "אפשר רמז?" hint-trigger shape in their own XML (unlike 58/59, which
    both have one) even though both have full hint content already
    authored off-canvas — added the standard hint button to expose that
    content (not a content invention, just an added trigger for content
    that already existed), flagged rather than silently added.
  - `motion.css`/`motion.js` copied verbatim from 06-05 (unmodified).
  - QA'd in-browser (own temporary static server on a free port, since
    another session's server already held this project's usual port
    8745): full launch→scroll flow, all 4 sections' correct/retry/
    final-wrong paths (including the MCQ's wrong-then-final-wrong reveal
    and the DnD's full drag+click-to-place flow), hint modal (including
    the two added-trigger screens), image zoom, sticky data card/table
    scoping (confirmed each stops floating once its own section scrolls
    out, never bleeds into the next), progress-nav ring tracking scroll
    position live, back-nav resume-state (scroll position + all 4
    resolved answers preserved across `s54`→`s5559`→`s54`→`s5559`), no
    console errors, no horizontal overflow (`app.scrollWidth === 1280`),
    scroll indicator correctly hidden at the very bottom of the scroll.
  - **Not done / deferred, per explicit scope instruction:** wiring
    06-05's own dead-end (`s52`) forward into this component, or changing
    any behavior in `06-01`–`06-05` — none of those files were touched.

- **2026-08-17 session — methodica-math-percent-06-04 built in full (Advanced
  Practice / תרגול מתקדם, pptx slides 42-46, item ids
  methodica-math-percent-06-03-001/002/003):** New, self-contained component
  folder (own `index.html`/`styles.css`/`script.js`/`motion.css`/`motion.js`/
  `index_dev.html`/`assets/images/`), per the unit's component-per-folder
  convention. `TOTAL_SCREENS = 5`, `NAV_FLOW = [0..4]`: `s42` (TransitionScreen,
  `character_gift`) → `s43` (Q1) → `s44` (Q2A) → `s45` (Q2B) → `s46` (Q3), all
  4 questions Figma-canonical SingleChoiceQuestion, 2-attempt retry gate, hint
  enabled throughout — engine/markup ported verbatim from `06-02` (the closest
  structural match: standalone SCQ screens, one "צדקתי?" button doubling as
  Continue), not `06-03`'s later scroll+inline-feedback variant.
  - **Mapping correction:** `PRODUCTION_PLAN.md`'s existing row for this range
    ("slides 41-45... 43 pending content") was stale — verified directly
    against the pptx's own item-id tag shapes/production notes/OMML math
    instead of trusting it. Actual boundary: slide 41 is the `06-04` divider
    slide (non-screen), 42-46 are this component's 5 screens, 47 is the
    `06-05` divider. `PRODUCTION_PLAN.md` itself not yet corrected — flagging
    here so a future session updates that table too.
  - **s42** — same `.s13-content`/`.s13-text-group` TransitionScreen shell as
    `06-01`/`06-02`. Source text is 2 runs (48pt bold / 28pt plain), one fewer
    than `06-02`'s `s27` (3 runs) — new local variant
    `.s42-emphasis`/`.s42-sub` rather than reusing `s27`'s 3-part classes.
    Character revealed LAST (after both text lines), per explicit approved
    sequencing — a different `runStagedSequence()` step grouping than `s27`'s
    (which reveals the character alongside its first text line), same engine.
  - **s43 (Q1)** — the pptx's own question stem is a flattened image (source-
    file quirk) containing a stacked 31/1,250 fraction mid-sentence. Rebuilt
    as real HTML text with a new `.q1-inline-fraction` modifier (reuses
    `.gvi-fraction`'s num/den tokens verbatim, just `display:inline-flex` so
    it flows mid-sentence — no prior in-project precedent for an inline,
    not-a-standalone-equation-row fraction). Image `Q12.png` exported fresh
    from pptx media (`image57.png`) — not previously in the project.
  - **s44/s45 (Q2A/Q2B)** — same item id (`-03-002`); a resolved pptx
    producer comment confirms this is deliberately one question split into
    two full-content sub-part slides, not two separate questions. Per
    approved design: two separate `NAV_FLOW` screens, but both map to the
    SAME `practiceProgress` node (`"שאלה 2"`) — no 4th node created. Node 2
    stays `current` through `s44`'s own resolution; only `s45`'s resolution
    resolves it (`correct` only if BOTH sub-parts' own outcome was
    `correct`) — new `scqSetProgressState()` helper, the one real logic
    delta from `06-02`'s original inline state-assignment. Node 2's
    click-to-navigate target is `s44` (re-entering "question 2" always
    starts at its first sub-part). Images `100.png`/`-100.png` are pixel-
    identical to the pre-existing root `assets/images/` copies (just
    re-exported at higher source resolution) — copied into this component's
    own `assets/`, not re-derived.
  - **s45 content fix (per explicit instruction):** the pptx's own hidden
    feedback math literally reads "≈0.167≈1.67%" — a dropped-digit source
    typo (0.167 = 16.7%, not 1.67%; same failure class as the already-
    documented `CONTENT_FLAGS.md` #29). Corrected to "≈16.7%" in the shipped
    feedback copy rather than reproducing the typo — the intended answer is
    unambiguous and matches the pptx's own "כ-17%" option.
  - **s46 (Q3)** — image `Q13.png` exported fresh from pptx media
    (`image67.png`) — not previously in the project. Last screen in this
    component: `#s46-check`'s dead-end Continue is deliberately left
    disabled (`scqNextScreen('s46')` naturally returns false, no extra code)
    — per explicit instruction, `06-03`→`06-04` and `06-04`→`06-05` wiring
    are both deferred to a later session, not invented here.
  - `motion.css`/`motion.js` copied verbatim (confirmed byte-identical across
    `06-02`/`06-03` already — genuinely the canonical unmodified engine).
  - QA'd in-browser (`index_dev.html` + the plain `index.html` directly,
    both DEV-bridge clicks and real pointer clicks): full launch→Q1→Q2A→
    Q2B→Q3 flow, staged entrance order on every screen, inline fraction
    rendering, every SCQ state (selected/retry/correct/final-wrong/hint/
    zoom) on all 4 questions, the Q2A/Q2B shared-progress-node behavior
    (node 2 stays current after Q2A, resolves only after Q2B, click-nav
    jumps to `s44`), back-nav resume-state on all 4 questions (locked
    answers + reopened feedback, no re-animation replay), Q3's final-wrong
    dead-end Continue, no console errors, no failed asset requests (checked
    via network log), no horizontal overflow (`app.scrollWidth === 1280`),
    `dir="rtl"`/`lang="he"` confirmed on the root element.
  - **Not yet done:** wiring `06-03`'s own dead-end Continue into this
    component's `s42`, and this component's own `s46` dead-end into
    `06-05` — both explicitly deferred by the user to a later session, not
    an oversight. `PRODUCTION_PLAN.md`'s slide 41-45 table row still needs
    a follow-up correction to match the verified mapping above.

- **2026-08-15 session — methodica-math-percent-06-03 QA-annotation fix
  pass (screens 33/34-35/37/38-39, no new screens):** Fixed 14 issues the
  user flagged via the new viewer.html hotspot-annotation tool (see that
  tool's own session for how annotations were captured/exported).
  - **s33 hint** — reformatted into label-then-body pairs (`<p><strong>
    label:</strong></p><p>body</p>` instead of one inline "label: body"
    paragraph per concept), per explicit request to expand its structure.
  - **s3435** — `#s3435-progress` moved out of `.cls-section`/`.lp-scroll`
    into a fixed overlay at the top of the whole `#s3435` screen (same
    `.progress-question` base class s33/s37 use, no longer
    `--inline`) — previously it only appeared once scrolled to the 2nd
    page. `.cls-section` switched from `justify-content:center` to
    `flex-start` (padding-top 28→90px) so the heading/rows no longer
    re-center (visibly "jump") when feedback height changes below them.
    `.scq-left-actions`/`.cls-actions` (hint+"?צדקתי" row) now hidden
    entirely (`element.hidden`) once the question resolves, not just
    disabled — the primary "המשך" continue button is already the way
    forward. `.lp-scroll` given a custom darker `--subject-500` scrollbar
    (both browser engines) — the default was too thin/light to notice.
  - **s37** — `.tq-table--with-img` (s37 only) columns narrowed
    214/160→190/130px and data-cell text bumped 20→24px (Body/B-3, matching
    the question stem's own size per `720-design-guidelines/typography.md`
    — the header row's 18px labels were left as-is, a different semantic
    role). Q5.png slot enlarged 380×253→456×304 (same 3:2), scoped to
    `#s37` only. Title's 2nd sentence had "והמשתתפים." wrapping alone onto
    its own line — joined to the previous word with `&nbsp;` so it lands
    on the same line instead of orphaned. `#s37 .tq-qtitle` given
    `margin-top:16px` for more clearance under the progress dots.
  - **s3839** — found and fixed a real bug, not just cosmetic: `.scq-img`'s
    base `flex: 0 0 380px` sets flex-basis on the flex container's main
    axis — width in s37's row-flex `.tq-wrap` (harmless there) but HEIGHT
    in s3839's column-flex `.tqs-media-col`, silently overriding
    `.scq-img--landscape`'s own `height:253px` back to a 380px square
    regardless of the landscape class. That's what was showing as a gray
    letterboxed background behind Q6.png. Fixed with `flex: 0 0 auto` on
    `.scq-img--landscape`; also stripped the card background/border for
    `.tqs-media-col .scq-img` (matches `.tq-img`'s existing precedent).
    `.cbub`/`.cbub-name` font-size bumped 15/14→18/16px. `#tqs-page-a
    .tqs-subpart` given `margin-top:16px` for more breathing room before
    "א. מי צודק?". Sub-parts א/ב's own hint+check row
    (`#tqs-a-actions`/`#tqs-b-actions`, new ids) hidden on resolve, same
    fix/reasoning as s3435's `.cls-actions`.
  - **Cross-cutting fix**: `.scq-left-actions[hidden] { display: none; }`
    added — without it, `.scq-left-actions{display:flex}`'s equal-
    specificity tie with the UA `[hidden]` default let author styles win,
    so `element.hidden = true` silently had no visual effect (same
    precedent already handled for `.btn-back[hidden]`, just not extended
    to this class before now). Found while verifying the hide-on-resolve
    fixes above — would have silently no-op'd without this.
  - Cache-busted `styles.css?v=9→10`, `script.js?v=4→5` after hitting the
    same stale-cache issue this project has hit before on unversioned
    same-URL edits mid-session.
  - QA'd in-browser: s33's hint content/formatting + full check flow
    (unaffected screens, regression check only); s3435's fixed progress
    nav across both scroll pages, top-anchored layout on both the
    initial wrong-answer/retry state (buttons stay visible, no jump) and
    the resolved state (buttons hidden, no jump), darker scrollbar; s37's
    narrowed table/enlarged image/fixed title wrap; s3839's corrected
    image slot (confirmed 380×253 via computed style, transparent
    background), bigger bubble text, both sub-parts' resolved-state
    button hiding.
  - **Not attempted, flagged rather than guessed:** the user's note
    about the comic bubbles sitting "above the characters' heads" — the
    bubbles are already above the shared photo as a block, but precisely
    aligning each bubble over its own character would require knowing
    which name (אסיף/מיכאל) maps to which face in Q6.png, which isn't
    determinable from the image or script text alone.

- **2026-08-13 session — methodica-math-percent-06-03 visual-fidelity
  correction pass (screens 33-40, no new screens, 06-04 not started):**
  Fixed 6 confirmed visual bugs left from the 2026-08-12 build, per the
  Figma → skill/template → PPT script → existing-implementation source
  order:
  - **s33/s37 (table cells):** the fraction block (numerator input + bar +
    denominator) was measured (via `getBoundingClientRect`) at ~106px
    design-space tall inside an 82px cell, overflowing 11px above/9px
    below the cell's own borders. Fixed by tightening `.tq-cell`'s
    internal proportions (input 76×50→68×30, cell padding 10px→6px,
    denominator `line-height` 1.3→1) so the whole block (now ~66-68px)
    sits fully inside the cell, centered by the cell's own flex
    `align-items/justify-content:center` — never positioned relative to
    the row edge. `.tq-pct-wrap` scaled down to match (118×54→104×44).
  - **s33/s37 (vertical composition):** `.tq-qtitle` and `.tq-table`/
    `.tq-wrap` were two independently absolute-positioned blocks at fixed
    px offsets (`top:64`/`top:152`) with no real relationship to each
    other's actual height — on s37 this read as content crammed under
    the progress nav. Replaced with one `.tq-body` flex column (new
    wrapper div in both screens' markup) spanning progress→bottom-bar,
    vertically centering title→content-row as normal-flow children.
    `.tq-img` (s37's Q5.png slot) restored from a shrunk 300×300 override
    back to the template's own 380×380 (`.scq-img` default) now that its
    card background/border removal already fixed the letterboxing
    complaint on its own — no need to also shrink the frame.
  - **s3435 (screens 35-36) / s3839 (screens 39-40) — full-screen scroll
    paging:** `.cls-section` overrode the shared `.lp-section` 560px
    min-height down to `auto`, collapsing it to content height (~339px
    against a 636px scroll viewport) instead of reading as one
    full-canvas "page." `.tqs-comic-wrap`/`.tqs-subpart` (s3839, never
    used `.lp-section` at all) got the same 560px treatment. `script.js`'s
    `lpScrollToNext()` was a blind fixed-400px `scrollBy` with no concept
    of discrete sections; replaced with 06-01's own overlap-based
    `lpCurrentPage()`/`lpNextPage()` + `scrollIntoView({block:'start'})`
    pattern (generalized to each scroller's direct children as its
    "pages," since 06-03 has two independent scroll screens vs. 06-01's
    one). Verified via instant-scroll (`behavior:'auto'`) that each page
    now gets its own full-viewport composition; `behavior:'smooth'`
    itself did not animate in this session's browser-automation
    environment even on a bare test div, confirmed as a tooling artifact
    (not a code defect) before shipping the pattern unchanged from 06-01.
  - **s3839 (screens 39-40) — reversed two-column layout:** `.tqs-comic-wrap`
    sits inside `.lp-scroll`, which sets `direction:ltr` for the
    scrollbar-flip trick — every sibling section re-declares
    `direction:rtl` for itself, but this one never did, so its 1st DOM
    child (`.scq-question-col`, the text) rendered physically LEFT and its
    2nd child (`.scq-img-group`, the comic) rendered physically RIGHT —
    backwards from the required right-text/left-image RTL composition.
    Fixed with one `direction:rtl` on `.tqs-comic-wrap`.
  - Cache-busting bumped (`styles.css?v=3→7`, `script.js?v=3→4`) after
    hitting real browser caching on the unversioned same-URL edits mid-session.
  - **Not changed / re-verified as already correct:** s32/s36 TransitionScreen
    character-right/bubble-left composition (2026-08-12 fix, untouched);
    field-level correct/incorrect states; Math purple theme; the real
    Progress Question component; answer keys, attempt logic, hint content,
    feedback text, scoring, and scroll-embedded-inline-feedback convention
    (all untouched, only markup/CSS/scroll-JS changed). s3435's
    classification pill-row composition (`.cls-row`/`.cls-pills`) was
    **not** rebuilt this session — `search_design_system` found no
    dedicated Figma frame for a 3-option classification row (confirms
    `PRODUCTION_PLAN.md`'s existing "ambiguous/TBD" flag for slide 35);
    the current local variant was already adjusted once against the
    pptx's own resolved shape transforms in the 2026-08-12 session and
    reads cleanly now that it fills a full scroll page — flagged as still
    not Figma-verified, not rebuilt blind.
  - QA'd in-browser: all table/cell fixes, both full-screen scroll
    sequences (s3435 2 pages, s3839 3 pages), the s3839 RTL column swap,
    hint modal, image zoom (380×380, no letterboxing card), resume-state
    (locked correct-state fields + reopened feedback on back-nav,
    re-tested specifically because `.tq-body` changed s33/s37's markup),
    sub-part check/correct flow, no console errors, no horizontal overflow
    (`app.scrollWidth === 1280` throughout).

- **2026-08-12 session — methodica-math-percent-06-03 started and built in
  full (רכיב 2, תרגול בסיסי וסטנדרטי מועד ב', pptx slides 32-39, screens
  33-40):** New, self-contained component folder (own `index.html`/
  `styles.css`/`script.js`/`motion.css`/`motion.js`/`index_dev.html`/
  `assets/images/`), per the unit's component-per-folder convention.
  `TOTAL_SCREENS = 6`, `NAV_FLOW = [0..5]` — 6 navigation screens for 8
  logical script screens; the two "question continues by scrolling" pairs
  (35-36 and 39-40) are each ONE `.screen` div, per the user's explicit
  instruction not to present a scroll-continuation as two disconnected
  screens.
  - `s32`/`s36` — TransitionScreen, reusing 06-01/06-02's `.s13-content`
    shell verbatim (`character_computer.png`/`character_testb.png`, both
    extracted fresh from the pptx's own embedded media this session). New
    `.s13-aside`/`.s13-character-wrap` composition (a secondary speech
    bubble beside the character) — neither prior TransitionScreen needed
    one; built from the existing `.hook1-bubble` tail-bubble CSS technique,
    not a new visual language.
  - `s33`/`s37` — Table ValueInputQuestion, the **first use of this
    template in the project** — confirmed against a real Figma frame
    (`Screen Templates/FillInTheBlankTableQuestion`, node `1046:26887`,
    file `eSbp4bKHgBky0rakDb8l9N`; resolved via live Figma-web layer search
    after `get_metadata`/`get_design_context` both hit the same "library
    too large" limitation `PRODUCTION_PLAN.md` already flagged). New
    `.tq-*` CSS (table/cell/header per the Figma node's own measurements),
    reusing `.gvi-fraction`/`.gvi-answer-box`/`.num.is-input` verbatim for
    the numerator-over-fixed-denominator inputs (already used 3× in
    06-01's `s17`/`s19`/`s21`). New `.tq-pct-wrap`/`.tq-pct-input` for the
    percent column — the `%` sign lives **inside** the input's own
    bordered box (explicit production note), not a sibling span like
    06-01's `.lpv-blank`/`.lpv-pct`. `s33`: all 3 numeric cells per row are
    inputs (per the user's explicit decision — see `CONTENT_FLAGS.md` #31
    for the row 1-2 numeric inconsistency preserved as-is). `s37`: the
    fraction column is given/read-only (real OMML-derived per-row values,
    internally consistent), only the percent column is input — an
    intentionally different structure from `s33`, reusing the same `.tq-*`
    component per the user's instruction.
  - `s3435` (slides 34-35) — one scrolling screen: intro + `APP.png` (top,
    reusing `.lp-text-col`/`.lp-img-col` verbatim) → 3-row classification
    question ("לא הגיע ליעד / הגיע ליעד / עבר את היעד"), local pill-row
    variant reusing `.scq-opt`/`.scq-radio` verbatim (per the user's
    explicit choice over a collapsed DropdownQuestion — resolves
    `CONTENT_FLAGS.md` #5). Row 3's value is an OMML math fraction
    (`8,999/10,000`, Unicode math digits — invisible to a plain-text
    read; see `CONTENT_FLAGS.md`) rendered as a live `.gvi-fraction`, not
    converted to a percent. Holistic 2-attempt retry gate, no partial-lock
    (this question's own copy doesn't call for it, unlike 06-02's `s30`).
  - `s3839` (slides 38-39) — one scrolling screen: shared context + new
    `.cbub-*` two-bubble comic composition (מיכאל/אסיף, built from the
    `.hook1-bubble` technique doubled — confirmed via the Explore agent
    that no two-bubble comic component existed before) above `Q6.png`,
    then two independent SingleChoiceQuestion sub-parts (א/ב), each with
    its own attempts/hint/feedback. Both sub-parts' 4-option answer sets
    were found by drilling into PPTX **group** shapes a flat shape read
    missed entirely (see `CONTENT_FLAGS.md`) — not invented. Sub-part ב
    has no hint (explicit slide note). Feedback for every question in this
    component that's embedded in a scroll flow (`s3435`, `s3839`) renders
    **inline** (in normal document flow, right under that question's own
    pills) rather than as the standard floating `.scq-feedbox` popup — a
    documented local variant (`styles.css` comment) because more than one
    embedded question on the same scroll screen can be simultaneously
    resolved and each must stay visibly in view, which one floating popup
    slot can't satisfy. Standalone screens (`s33`/`s37`) keep the standard
    floating popup positioning. Last screen in the component — `s3839`'s
    fixed Continue is a disabled dead end (no 06-04 built yet), same
    precedent as 06-01's `s24`/`s26` and 06-02's `s30`.
  - Each question screen shows a plain "שאלה 1/2 מתוך 2" text label
    (`.tq-progress`) reflecting the script's own 2-question section
    structure, not the internal HTML screen count — not the full dot-nav
    Progress Question component (not needed here: no click-to-navigate
    between sibling questions within a section).
  - **Bug found and fixed during this session, in this same file:** the
    file's own header comment originally described several class families
    shorthand-style (e.g. `.scq-*/.gvi-*`), and the literal `*/` inside
    that text prematurely closed the CSS comment — silently dropping most
    of the stylesheet (174 rules → 0 parsed) exactly like the `*/`-in-comment
    bug this project hit once before (see this file's 2026-08-11 entry).
    Fixed by rewording to avoid any bare asterisk-then-slash sequence in
    comment text. Worth remembering (again): never write `word*/word`
    inside a CSS comment, even when shorthand-listing dash-prefixed class
    families.
  - QA'd in-browser: all 8 logical screens, table retry-gate + final-wrong
    reveal (`s33`), scroll continuity + holistic retry (`s3435`), image
    zoom (`s37`), both SCQ sub-parts + inline feedback (`s3839`), back-nav
    resume-state (locked answers + reopened feedback, `s33`), hint modal
    content per screen, no console errors, no 404s, no horizontal overflow
    at the 1280×710 canvas.
  - **Not yet done:** producer confirmation of `CONTENT_FLAGS.md` #31 (the
    `s33` table's row 1-2 numeric inconsistency).

- **2026-08-12 session (follow-up) — 06-02 SingleChoiceQuestion visual-consistency fix:**
  User reported 06-02's question screens (s28/s29/s30) didn't visually read as
  a continuation of 06-01 — question text rendered as one flat bold-blue-looking
  heading, and option pills showed a very light `--subject-200` border on a
  12px-radius rounded rect instead of the pill shape used everywhere in 06-01.
  Root cause: 06-02's own `.scq-qtext`/`.scq-opt`/`.scq-radio` rules
  (`styles.css`) were authored as a fresh local guess instead of reusing
  06-01's already-established, Figma-verified option-pill language
  (`.hook1-opt`/`.guided-opt`/`.lp-q-opt` — all: `border-radius:1000px`,
  `border:2px solid var(--subject-500)`, white fill, `var(--subject-100)` on
  select, text in `var(--text-body)`) — no shared stylesheet exists between
  component folders (each has its own self-contained `styles.css` per the
  project's component-per-folder convention), so nothing enforced the reuse
  automatically. Also, `.scq-qtext`/`.q3-shared-qtext` applied one flat
  `font-weight:700; color:var(--subject-500)` rule to the whole question
  block, collapsing the source's own multi-sentence structure (context
  sentence, plain vs. the actual question stem, bold) that the markup already
  preserved correctly as separate `<p>` tags — violating
  `_question-template-defaults.md`'s "preserve per-run emphasis" rule.
  **Fixed** (`methodica-math-percent-06-02/styles.css` + `index.html`, no
  content/logic/nav changes):
  - `.scq-opt`: border `var(--subject-200)`→`var(--subject-500)`,
    `border-radius:12px`→`1000px` (pill), `height`→`min-height:46px` (allows
    2-line option text to grow without breaking the pill shape), text color
    hardcoded `#222222`→`var(--text-body)`, hover `var(--subject-500)`→
    `var(--subject-700)` — all now match `.lp-q-opt`/`.guided-opt`/
    `.hook1-opt` exactly. `.q3-pills .scq-opt` (s30's compact 3-part variant)
    gets `min-height:0` to keep its own smaller compact height, since it
    already inherits the corrected border/radius/color from the base rule.
  - `.scq-radio` idle border: hardcoded gray `#AEAEAE`→`var(--subject-500)`
    (01's radios are never gray-bordered; only correct/incorrect override the
    idle purple). Selected/correct/wrong radio states were already
    Figma-verified (`196:6229`/`196:6232`) and were **not** touched.
  - `.scq-qtext`/`.q3-shared-qtext`: base rule is now
    `font-weight:400; color:var(--text-body)` (plain black, matching 01's own
    body-text convention) instead of the flat bold-purple block; added
    `.scq-qtext strong` / `.q3-shared-qtext strong` = `font-weight:700;
    color:var(--subject-800)` (01's own existing bold-emphasis token — see
    `.s24-bubble strong`/`.guided-bubble-pct` — not `--subject-500`, which in
    Math mode is a blue-leaning purple and is reserved for
    pill/stroke/accent roles, not text emphasis). `index.html`: wrapped the
    actual question-stem sentence in `<strong>` on s28, s29, and s30's
    `.q3-shared-qtext` (previously relied on `:last-child`/`<br>` position
    alone with no explicit emphasis markup) — the two context sentences on
    s28/s29 and the scenario sentence on s30 stay plain `<p>`/text.
  Verified in-browser (all 3 screens: s28 first-attempt-correct, s28
  wrong-attempt + hint modal + image zoom, s29, s30's 3-sub-part partial-lock
  retry flow) — no console errors, no 404s (the pill/radio/text fixes are
  pure CSS + a `<strong>` wrap, no new asset/DOM-structure requirements).
  Did not touch: `.q3-shared-qtext` font-size (22px vs `.scq-qtext`'s 24px —
  pre-existing, documented as an intentional compact-layout local variant,
  not part of the reported bug), any content/answers/attempt-logic/
  feedback-logic/navigation/progress code, or Component 01 itself.

- **2026-08-12 session — methodica-math-percent-06-02 started (רכיב 1,
  תרגול סטנדרטי, pptx slides 27-29):** New, separate component folder —
  own self-contained `index.html`/`styles.css`/`script.js`/`motion.css`/
  `motion.js`/`index_dev.html`/`assets/images/`, per the unit's
  component-per-folder convention; 06-01 was not touched. Built:
  - Screen `s27` (pptx slide 27, item -01-005) — TransitionScreen, reusing
    06-01's `.s13-content`/`.s13-text-group` composition verbatim. Source
    text has an explicit 20pt/44pt-bold/20pt three-run structure (not
    06-01's plain 2-line headline+subline), so it gets its own
    `.s27-lead`/`.s27-emphasis`/`.s27-sub` variant. Asset
    `character_lifting.png` — real pptx media (`ppt/media/image26.png`),
    static PNG shipped as an explicit temporary fallback for the
    producer-requested weightlifting GIF, same precedent as
    `character_one.png`/`character_hot.png`. See `CONTENT_FLAGS.md` #27
    for the GIF TODO.
  - Screen `s28` (pptx slide 28, item -01-005) — **first SingleChoiceQuestion
    built in this project** (no prior SCQ precedent existed in 06-01 to
    port from) — built directly from `720-templates/SingleChoiceQuestion.md`
    + `_question-template-defaults.md` (2-attempt retry gate, hint policy
    "visible from start" since no presenter-note override exists, shared
    explanation feedback body, `.scq-radio` Type-2 22px correct/incorrect
    badge as a CSS `background-image` data-URI built from the exact Figma
    vectors at node `196:6229`/`196:6232`, file `eSbp4bKHgBky0rakDb8l9N`).
    Question image `Q2.png` — pixel-hash-confirmed identical to the root
    project's pre-existing `assets/images/Q2.png` (not re-exported/
    duplicated). Correct answer: "נורה אחת מכל 25 - פגומה" (4% = 4/100 =
    1/25). Continue/back buttons reuse this project's own
    `.btn-continue`/`.btn-back` chrome (not the template doc's own
    `.scq-bar`) to match the established unit-wide button language; a new
    `.btn-hint` pill (same visual family as `.btn-back`) was added,
    wrapped with `.btn-continue` in `.scq-left-actions` so the 16px gap
    between them is a flex gap, not a hand-measured offset.
  - Screen `s29` (pptx slide 29, item -01-006) — same SCQ build, שאלה
    אוריינית (longer question body) — `.scq-question-col` scrolls
    internally per the template doc's own layout note, rather than
    compressing text to fit. Asset `Yoav.png` — real pptx media
    (`ppt/media/image31.png`), newly exported this session (not present
    anywhere in the project before now). Correct answer: "300%" (30GB /
    10GB = 300/100 = 300%). Dropped one stray leading "4" digit from the
    final-incorrect-feedback copy as a paste artifact — see
    `CONTENT_FLAGS.md` #29.
  - Shared "שאלה N מתוך 3" progress nav (`_global-components.md` §
    Progress Question) — one generic renderer drives both screens;
    question 3 is modeled with `screen: null` since it is **not built**
    this session — see `CONTENT_FLAGS.md` #28: pptx slide 30 (this
    practice set's 3rd question) has no production-notes block at all,
    and its own content (3 pie/circle diagrams + 5 percent/decimal value
    labels for what reads as 3 targets) is inconsistent with the task
    brief's description of it as a 4th textual SingleChoiceQuestion with
    assets `Q3`/`Q3A`/`Q3b`/`Q3c` — flagged for producer confirmation of
    the actual interaction mechanic (matching/DragAndDrop vs. visual
    single-choice) rather than guessed.
  - Shared `.img-zoom-btn`/`#img-zoom-modal` (per `_global-components.md`
    § Image zoom) and `#scq-hint-overlay` (one shared hint modal outside
    all `.screen` divs, per `SingleChoiceQuestion.md`) — both required by
    every question screen with a content image/hint in this template.
  - Screen `s30` (pptx slide 30, item -01-007) — שאלה 3 מתוך 3, built
    **after** an explicit mid-session direction from the user (this
    screen was initially left unbuilt/flagged — see `CONTENT_FLAGS.md`
    #30's history — until the user clarified "שאלה 3 היא שאלת בחירה כמו
    3 סעיפים" and supplied the missing `Q3A.png`/`Q3B.png`/`Q3C.png`
    assets mid-session). Built as a **local SingleChoiceQuestion variant**:
    one shared question + THREE independent single-choice sub-parts
    (A/B/C, one per circle-diagram image), all three sharing the same
    5-value option pool the slide itself shows (22%, 0.34, 50%, 20%, 40%
    — 2 of the 5 are shared decoys). Reuses `.scq-opt`/`.scq-radio` pill
    markup verbatim in a compact/wrapped layout (`.q3-pills`) — no new
    visual states. Grading is holistic across all 3 sub-parts (2-attempt
    retry gate on "at least one wrong," per the slide's own copy), with
    a Partial-correction flow: a sub-part already marked correct on
    attempt 1 stays locked through attempt 2 (`_global-components.md` §
    Partial-correction flow). Hint and shared correct/incorrect
    explanation body are the slide's own real copy (found off-canvas on
    the slide, same pattern as s28/s29), including 3 verbatim fraction
    equivalence chains (`6/22=3/11`, `5/17=10/34`, `2/5=40/100=40%`)
    confirmed via the pptx's own OMML math objects. **Q3C's correct
    answer (40%) is solid** (matches the image's 2-of-5-shaded content
    and the explanation text exactly). **Q3A→22%/Q3B→0.34 are the
    best-supported reading, not an explicit producer statement** — see
    `CONTENT_FLAGS.md` #30 for the full derivation (spatial value/image
    pairing + this session's own shaded-area pixel measurement) and the
    numeric inconsistency preserved rather than silently corrected.
  - `TOTAL_SCREENS = 4`, `NAV_FLOW = [0,1,2,3]`. `practiceProgress`
    question 3's `screen` is now `3` (was `null`). `s30`'s post-answer
    "שנמשיך?" continue button is a disabled dead end (no screen 4 built
    yet), same precedent as 06-01's `s24`/`s26`.
  - QA'd in-browser this session: all 4 screens, both SCQ retry paths
    (1st-attempt-correct and retry-then-correct) on s28, both outcomes
    (correct and final-incorrect) on s29 and s30, hint modal open/close,
    image zoom open/close, back/forward resume-state (locked answers +
    reopened feedback), and the Progress Question nav's click-to-navigate
    (only for visited+resolved+built questions). No console errors, no
    404s, no broken asset paths.
  - **Not yet done:** producer confirmation of the Q3A/Q3B answer values
    flagged in `CONTENT_FLAGS.md` #30.

- **2026-08-11 session (follow-up) — Warm-up final feedback content:**
  Replaced the Warm-up question's (`s26`) placeholder feedback (flag #24,
  now Resolved in `CONTENT_FLAGS.md`) with the producer-supplied final
  copy: two outcome titles ("יפה מאוד!" correct / "כמעט.. בואו נראה את
  דרך הפתרון" incorrect, two-line) plus the same 5-category worked-solution
  body shown for both outcomes (`script.js` `WARMUP_SOLUTIONS` +
  `warmupSolutionsHTML()`). Fractions reuse the existing `.gvi-fraction`/
  `.gvi-equation--final` stacked-fraction markup verbatim, per explicit
  instruction not to render plain slash strings. The popup became a
  fixed-header/scroll-gated variant (`.warmup-popup-body`, `overflow-y:
  auto`, RTL scrollbar-flip trick) — same contract as `.lpv-popup-body` —
  since the full 5-solution body no longer fits without scrolling; only
  that half of `_global-components.md`'s scroll-gated-popup pattern
  applies (no scroll-completion gate — this screen's Continue is already
  a disabled dead end regardless, no Component 02 built yet). Nothing
  else on this screen (inputs, grading, chart, navigation) or any other
  screen was touched. **Bug found and fixed during this pass:** the new
  `.warmup-popup` CSS comment originally read `--correct-*/--incorrect-*`
  — the `*/` inside that literal text prematurely closed the CSS comment,
  silently dropping every rule after it (including `.warmup-popup` itself)
  from the parsed stylesheet; fixed by spacing it to `--correct-* /
  --incorrect-*`. Worth remembering for future sessions: never write a
  bare `*/` sequence inside a CSS comment's own text, even when
  describing two dash-prefixed tokens shorthand-style.

- **2026-08-11 session — component-based restructuring + Warm-up:**
  Converted the project into the component-based folder structure the
  unit's production script requires: `methodica-math-percent-06-01`
  through `-06`, each with its own `assets/` subfolder. All work built so
  far (Hook, Learning Phase, guided practice, now Warm-up) belongs to
  Component 01 and was migrated there — copied, not moved; the original
  root `index.html`/`styles.css`/`script.js`/`motion.*`/`assets/` are left
  in place, untouched, pending an explicit cleanup pass (see this
  session's report for the exact duplicate-file list). Only the assets
  Component 01 actually references were copied into
  `methodica-math-percent-06-01/assets/` — the root `assets/` folder has
  several unused legacy images (e.g. `APP.png`, `Q2/Q5/Q6.png`, `-100.png`/
  `100.png`, the Hebrew-named "תרגול מונחה" images) not carried over, since
  they aren't referenced by any built screen. `index_dev.html` and
  `viewer.html` stay at the project root (shared dev tooling, not
  per-component) and now point their iframe at
  `methodica-math-percent-06-01/index.html`. Migration was QA'd in-browser
  (all 16 pre-existing screens, asset loads, console/network, digit-only
  sanitization) before anything new was added — verified visually and
  behaviorally identical to the pre-migration version.

  After migration QA passed, added the Warm-up (pptx slides 25-26, item
  `-01-004`) inside Component 01: screen 16 (`s25`, TransitionScreen,
  "ועכשיו, תרגיל לחימום!") and screen 17 (`s26`, the circular-budget
  pie-chart question — 5 fillable percentages, single submission, no
  retry). `TOTAL_SCREENS` is now 18; `NAV_FLOW` is `[0..17]`. `s24`'s
  continue button (previously a disabled dead end) now goes to `s25`;
  `s26` is the new dead end (disabled `המשך`, no Component 02 built yet).
  See `PRODUCTION_PLAN.md`'s own row for slide 26 — this session
  re-confirmed via `search_design_system` that no Figma/720-templates
  frame matches a radial fill-in-the-chart layout, so this is a Custom
  build (ValueInputQuestion-family conventions: digit-only inputs reusing
  the existing `handleDigitsInput`/`handleDigitsPaste` sanitizer,
  `.btn-continue`/`.btn-back` chrome, theme's global
  `--correct-*`/`--incorrect-*` feedback tokens). The chart image
  (`assets/images/warmup_budget_chart.png`) and transition character
  (`assets/images/character_hot.png`) are the pptx's own embedded media,
  exported verbatim — not fabricated. **Flagged, not invented** (see
  `CONTENT_FLAGS.md` #22-26): the hint button shown on slide 26 has no
  hint copy anywhere in the script (omitted, not implemented dead);
  the feedback-popup body text is a minimal mechanical placeholder (no
  explanation copy exists in the script for this question, same gap
  pattern as `LPV_FEEDBACK`); the feedback popup itself is fixed-position/
  non-draggable (a scoped simplification of the full canonical draggable
  popup system, not a full engine port); the 5 answer-box positions were
  measured empirically from the chart image's own pixel content (the
  pptx shapes' own coordinates didn't reliably match the flattened image);
  a small generic decorative icon on the slide (pptx `image1.png`) wasn't
  reproduced (no identifiable content); the stray off-canvas leaked
  sentence already flagged as `CONTENT_FLAGS.md` #3 was excluded (it sits
  at negative slide coordinates, never actually visible).

- **2026-08-10 session — Phase 1 complete:** built the full guided-practice
  worked-example segment, pptx slides 13-24, as screens 4-15 (ids
  `s13`-`s24`). `TOTAL_SCREENS` is now 16; `NAV_FLOW` is fully contiguous
  (`[0..15]`). The earlier deferred slide-17 prototype (formerly screen 3,
  excluded from `NAV_FLOW`) has been **replaced** — same id (`s17`), now
  properly wired into the flow with corrected behavior (see below), not a
  second parallel implementation. `hook2`'s continue now goes to
  `learningphase` (index 3, shifted down one from the old s17's removal);
  `learningphase`'s continue now goes to `s13` (index 4).
  - **Corrected from the deferred prototype:** slide 17's own production
    note ("הטקסט בבועית הסגולה יתחלף לא כחלונית נוספת" — the purple-bubble
    text is replaced, not a separate window) was not honored by the
    original prototype, which used a floating `.s17-popup` feedback card.
    Screens 17/19/21 now swap `.guided-panel`'s own instructional text in
    place instead (`gviSubmit()` in script.js) — no popup. Also switched
    from the standard 2-attempt ValueInputQuestion retry model to a
    single-submission model (no retry/attempts language exists anywhere in
    slides 17/19/21's production notes; matches this project's own lpv —
    Learning Phase section 6 — precedent).
  - Persistent chrome across screens 5-8/10/12/14 (slides 14-23): the
    three-friend context card (`.guided-card`/`.guided-friend-row`,
    generalized from the old `.s17-friend-row`) + goal statement stay
    visible; the active friend is emphasized via `.is-focus` (other cards
    dim to 0.6 opacity). Running percentage badges (`.guided-pct-badge`)
    accumulate on each friend's own mini-card as their result resolves.
  - Two bugs found and fixed during QA: `.gvi-equation` used
    `flex-direction: row-reverse`, which combined with `direction: ltr`
    rendered every gvi equation backwards (e.g. "70% = ?/100 = 7/10"
    instead of "7/10 = ?/100 = 70%") — changed to plain `row`. Screen 16's
    `.guided-highlight` underline was positioned against the card's fixed
    bottom edge (`bottom: 34px`), which only lined up under the stat text
    by coincidence of assumed height — now anchored to `.stat`'s own box
    (`position: relative` on `.stat`, `bottom: -6px` on the highlight).
  - `index_dev.html`'s `DEV_EXCLUDED_SCREEN_IDS` still hardcoded `['s17']`
    from the deferred era — cleared, and `SCREEN_NAMES` extended with all
    12 new screen ids, so the DEV sidebar/Next/Previous reach every screen.
  - **Known source inconsistencies found and preserved-with-flag** (not
    silently corrected) — see `CONTENT_FLAGS.md` items #18-21.
  - Files changed: `index.html`, `script.js` (`?v=17`), `styles.css`
    (`?v=31`), `index_dev.html`.
- **2026-08-09 session:** added section 6 (slide 11) to the Learning Phase
  scroll screen (screen 4) — an inline ValueInputQuestion checkpoint, two
  percentage fill-in-the-blank inputs sharing one submission, no retry. See
  `script.js` "SECTION 6" comment block, `index.html` `#lp-sec-6`, and
  `styles.css` "SECTION 6" block. Resolves `CONTENT_FLAGS.md` item #2 (see
  its new "Resolved" section). **Outstanding before publish:** the Type-1
  correct/incorrect icon glyph (checkmark/X SVG) specified generically by
  `720-design-guidelines/components-icons-states.md` was not inserted inside
  the input boxes — only the border/background color-coding was implemented
  (matching this project's own `.s17-answer-box`/`.lp-q-opt` precedent) —
  because no existing markup precedent for embedding that icon inside an
  `<input>` element was found in this project; flagged rather than invented.
- **2026-08-09 session (same day, follow-up):** replaced the section 6
  placeholder feedback with real correct/incorrect copy supplied directly by
  the user (resolves `CONTENT_FLAGS.md` #17); added `.lpv-eq`/`.lpv-fraction`
  (reuses `.s17-fraction`'s stacked num/den treatment, scaled to the popup's
  own type size) to render "2/4 = 50%" / "2/10 = 20%" in the feedback body;
  added `.lpv-para-gap` for the blank-PPTX-paragraph break per
  `_question-template-defaults.md`. Fixed two real bugs found while wiring
  this up, both scoped to section 6 only: (1) `lpvSectionInView()` used
  `lpCurrentSection()`'s max-overlap heuristic, which picks the taller
  lp-sec-5 over the shorter, fully-visible lp-sec-6 once scrolled to the
  scroll-max clamp — the feedback popup was hiding itself immediately after
  being shown; fixed by OR-ing in an "at document bottom" check (exact for
  the last section, unlike section 3's rejected raw-overlap approach — see
  code comment). (2) `lpvPositionPopup()`'s computed default position had no
  canvas-bounds clamp, so the popup's real content height (~330px) pushed it
  past the canvas's bottom edge, clipped by `#learningphase`'s
  `overflow:hidden`; fixed by hoisting the drag system's `clampPopupToCanvas`
  out of its IIFE and reusing it for the computed position too (same "Drag
  bounds" contract, `_global-components.md`), rather than a second formula.
  **Explicitly NOT done, flagged instead of invented:** the task also asked
  to "restore" a purple outer container around the whole question — no such
  container exists in this project's own history for this screen (section 6
  was built fresh with the same borderless `.lp-q-panel` shell as section 3,
  nothing was ever removed) and the generic Figma ValueInputQuestion template
  (node `1045:13096`, file `eSbp4bKHgBky0rakDb8l9N`) has no such container
  either — its "default" state screenshot is a plain white background with
  no border/frame around the question. Did not invent dimensions/border/
  radius/color per the session's own explicit instruction; needs the user to
  either point at the actual source (a different Figma node, or an external
  storyboard) or confirm this should be skipped.
  `script.js?v=9` / `styles.css?v=20` — cache-busting query bumped since both
  files changed across this session.
- **2026-08-09 session (same day, follow-up 2):** added section 7 (slide 12,
  the pop-up percentage reveal) — resolves the "Slide 12 ... not yet built"
  gap noted in `PRODUCTION_PLAN.md`. Second scroll-gate tier, `#lp-locked-2`,
  unlocked by `lpvCheck()` (section 6's own submit handler) alongside the
  continue button — same hidden-attribute mechanic `#lp-locked` already uses
  for checkpoint 1, independent second instance. Plain narrative section
  (`#lp-sec-7`, same `.lp-section`/`.lp-text-col`/`.lp-img-col` shell as
  sections 1/2/4/5) — reuses `assets/images/LearningPhase_004.png`, the same
  asset section 5 already displays (confirmed against the pptx: slide 12
  revisits that same photo, it is not a different/new image). Copy verified
  verbatim against slide 12's own text runs (shape "תיבת טקסט 4"); per that
  source, "50%" is written inline for Yonatan's line but Alon's line ends
  "כלומר:." with no inline "20%" — that value is conveyed only by the
  floating callout, per the slide's own production note ("פופ אפ עם מספרי
  האחוזים, קופץ על המסך בהנפשה כדי שיבלוט"). Preserved as-is rather than
  inventing the missing inline number — flagged in the session report as a
  visual quirk worth a producer confirmation, not silently "corrected."
  The two percentage callouts (`.lp-callout`) are real HTML/CSS bubbles (not
  baked into the image, not present in the project as a pre-existing
  component) — built by reusing `.lp-alert`'s (section 1) exact speech-
  bubble language (white fill, 2px Subject/500 border, drop shadow, downward
  tail) and its exact fade+float entrance values (320ms ease-out, translateY
  14px→0, same `lpAlertIn` keyframes), staggered ~150ms between the two.
  Unlike `.lp-alert` (replays every real screen entry — a notification-style
  element), the callouts pop in **once per session**, JS-triggered
  (`lpMaybeRevealCallouts()`/`lp7InView()`) when the learner actually scrolls
  this section into view — matching the system-animation skill's "reveal
  group plays once" convention, without pulling its motion.js/motion.css
  engine into this project (same "no engine for one scoped case" precedent
  `.lp-alert` already set). Positions are a visual approximation of the
  pptx's own callout geometry (that source crops the same photo differently
  than this project's 444px column), not a pixel-exact port.
  Fixed a latent bug this section's addition exposed: `lpvSectionInView()`
  had an "OR at document bottom" fallback written for when lp-sec-6 was
  still the LAST section (scroll-max-clamp edge case, see its own code
  comment) — now that lp-sec-7 sits below it, that fallback would have kept
  section 6's feedback popup shown while the learner was actually looking at
  section 7. Removed for lp-sec-6; the same fallback shape moved to the new
  `lp7InView()` instead, scoped to whichever section is genuinely last.
  **Global scrollbar fix (explicit user request, applies to the whole
  Learning Phase scroll sequence, not just section 7):** `.lp-scroll` was
  previously hiding the native scrollbar entirely (`scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }`), relying solely on
  `.lp-scroll-indicator` (the chevron) as the only progression affordance —
  a deliberate prior-session choice, now explicitly overridden. Fixed by
  removing those rules and adding `direction: ltr` (the same scrollbar-only
  RTL flip already used by `.lpv-popup-body`/the scroll-gated-popup
  contract) so the native scrollbar renders on the physical right edge; no
  custom `::-webkit-scrollbar` theming was introduced (matches this
  project's own existing precedent for this exact pattern). The chevron
  indicator is unchanged and still works. `script.js?v=13` / `styles.css?v=23`.
- **Files in place:** `index.html`, `script.js`, `styles.css`,
  `index_dev.html`, `viewer.html` (QA/dev tooling — never loaded by the
  real learner experience in `index.html`), `.claude/launch.json` (local
  static server config, port 8080).
- **What's built:** `TOTAL_SCREENS = 4`:
  - Screen 0 (`id="hook1"`, pptx slide 3, item `-01-001`) — MultipleChoiceQuestion
    local variant (multi-select reflection, no grading/attempts/hint):
    "בחרתי" → neutral message-type feedback popup → relabels to "המשך".
    Figma: Screen Templates Library → Question Templates → MultipleChoiceQuestion
    (text-pill variant). Asset: `assets/img/HOOK_001.png` (real pptx media).
  - Screen 1 (`id="whypercent"`, pptx slide 4, item `-01-001`) — "למה דווקא
    אחוזים?". Production note explicitly reads `FlipcardsRevael – State 01
    – Before interation`; confirmed via Figma node `405:8027` (file
    `eSbp4bKHgBky0rakDb8l9N`, exact same "Before interation" wording) —
    this is the canonical FlipCardsReveal "before interaction" screen.
    Only its text-layout portion (Heading/H-5 40px Bold + 28px body,
    810px column, centered) is implemented — the script supplies no card
    images/video for this step, so the card row + watch-video/flip-cards
    toggle are intentionally omitted (not fabricated). Plain content-screen
    nav (Continue always enabled).
  - Screen 2 (`id="hook2"`, pptx slide 5, item `-01-001`) — HOOK_002.
    Production note says `שם התמונה: HOOK_001`, but the slide's actual
    embedded picture (`ppt/media/image3.png`) is pixel-confirmed to be the
    phone/battery character, matching `assets/img/HOOK_002.png` — user
    explicitly confirmed this is an outdated label in the note; HOOK_002 is
    used, not HOOK_001. Figma: Content Templates → character + speech-bubble
    variant. Plain content-screen nav.
  - Screen 3 (`id="s17"`, pptx slide 17, item `-01-003`) — unchanged
    ValueInputQuestion worked-example screen, renumbered from `data-screen="0"`
    to `"3"` (content/logic untouched).
- **Architecture generalizations made to support screen 0 (`hook1`) and
  multi-screen back nav** (previously hardcoded for exactly one screen):
  `updateBackButton()` now queries the active screen's own `.btn-back`
  (each screen has a uniquely-id'd back button) instead of a single
  `#global-back-btn`; the feedback-popup drag handler now matches any
  `[id$="-popup"]` instead of only `.s17-popup`.
- **Build history / honesty note (slide 17):** the first two build passes
  leaned on `04-03`'s existing "Candy"/"Battery" guided-practice code as
  the starting pattern (per the source hierarchy now documented here, that
  should have been secondary, not primary). A subsequent pass corrected
  the right/left column order (characters/context → right, question/
  interaction → left) and replaced ad hoc font sizes with the approved
  `720-design-guidelines` typography token table, and re-themed all
  subject colors to `var(--subject-*)` bound to current Math Foundations
  values (no hard-coded 04-03 hex survives). **Not yet done:** a direct,
  explicit comparison of this screen against the actual Figma canonical
  template for this interaction (likely `Screen Templates/
  StepByStepGuidedSolution` — not yet confirmed node-by-node; see
  `PRODUCTION_PLAN.md`). Treat the screen as **mid visual/design QA**, not
  as Figma-verified, until that comparison happens.
- **QA/dev tooling:** `viewer.html` (3 device presets, 1920×1080 Desktop
  default) and `index_dev.html` both derive their screen list live from
  the app's own `postMessage` state (no hardcoded screen arrays to
  maintain) and include Prev/Next/Reset controls that work regardless of
  a screen's completion/lock state. Verified working across all 4 screens
  after the hook1/whypercent/hook2 build.
- **Do not, in the next session, without being asked:** build additional
  screens (e.g. slide 6 / `-01-002` onward), continue Phase 1, or redesign
  the current screens further — confirm scope with the user first.
