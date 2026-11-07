---
description: Apply the QA-review-mode hook to a Metodika applet template so reviewers can navigate freely without teaching-flow reverts
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash]
---

# Apply the QA-review-mode hook

You are inside a **Metodika applet template** repository. The QA tool sets
`window.__qaReviewMode = true` in every reviewable iframe. Your job is to
add the `if (window.__qaReviewMode) return true;` (or `|| window.__qaReviewMode`)
guards inside this template's teaching-flow validator so reviewers can
walk any screen in any order without the applet snapping back to the last
unlocked page.

Full contract: `docs/QA-REVIEW-MODE-HOOK.md` in the QA-tool repo
(https://github.com/shahaftz/Metodika-QA-Tool/blob/main/docs/QA-REVIEW-MODE-HOOK.md).

## Do the work in this order

### 1. Confirm we're in the right kind of repo

Look for the signals of a Metodika applet template — any of:
- One or more `data-screen="..."` attributes in HTML files.
- A JS function named `show`, `showScreen`, `goTo`, `goToScreen`, `gotoScreen`, or `navigateTo`.
- Existing references to teaching flow / progress: `unlocked`, `completed`, `canAdvance`, `progress`, `lastCompleted`, etc.

If **none** of those appear, stop and ask the user which template they meant
— don't guess. If HTML/JS is bundled/minified (e.g. `dist/` only, no
sources), stop and ask where the source lives.

### 2. Locate every enforcement site

Search the whole repo (JS + inline `<script>` in HTML) for teaching-flow
enforcement. Cast a wide net; there is usually more than one site:

- The nav functions themselves (`show`, `showScreen`, `goTo`, …) — any
  early-return that reroutes to a "last unlocked" screen.
- Button handlers on "next" / "→" that check completion before advancing.
- Explicit predicates: `canAdvance`, `canGoTo`, `mayShow`, `isUnlocked`,
  `hasCompleted`, `passed(screen)`, etc.
- Any timer / MutationObserver that "corrects" the current screen when it
  detects the student is on a not-yet-unlocked page.

For each hit, note the file, line, and what the guarding condition looks
like. Report the full list to the user before editing anything. If you find
zero enforcement sites, the template already lets you navigate freely — say
so and stop.

### 3. Propose the edits

For each site, the pattern is one of:

**Early-return the validator:**
```js
function canAdvanceTo(id) {
  if (window.__qaReviewMode) return true;
  // ... existing checks ...
}
```

**OR-guard a condition:**
```js
if (!hasUnlocked(id) && !window.__qaReviewMode) {
  id = lastUnlockedId();
}
```

**Handler guard:**
```js
nextBtn.addEventListener('click', () => {
  if (!currentScreenComplete() && !window.__qaReviewMode) return;
  show(nextId());
});
```

Keep changes minimal — DO NOT refactor surrounding code, rename variables,
or "clean up" the validator. One `__qaReviewMode` check per enforcement
site, nothing more. Preserve the original code style (var/let/const,
tabs/spaces, semicolons — match what's already there).

Show the user the proposed diff for every file. Wait for approval before
applying (this is a template that other reviewers depend on — no silent
edits).

### 4. Apply, verify, hand back

After approval:

1. Apply the edits.
2. Run whatever the repo's lint / typecheck / test command is (check
   `package.json` scripts). If nothing exists, skip.
3. Report:
   - Files touched (with line numbers).
   - How to verify: open the applet inside the QA tool, click any page in
     the tree, confirm the tree marker moves to that page.
   - Note that the reviewer can now walk freely; the student-facing flow
     is unchanged because the guard is inert when `window.__qaReviewMode`
     is unset.

### 5. Don't do these

- Don't change the applet's behavior for students. The whole point is
  `window.__qaReviewMode` is `undefined` outside the QA iframe.
- Don't add a "review mode" UI banner. The QA tool has its own chrome.
- Don't wrap the entire validator in a big if-block that changes control
  flow — just early-return / OR-guard at each site.
- Don't touch build / bundler config. If the source is TypeScript or a
  framework, edit the source; the build step picks it up as usual.
- Don't commit or push. Report the diff and hand back — the user commits.
