# Pass marks — methodica-math-percent-06

What each component's `completed` reports as `success`, where the number comes from, and what the
code does with it. Guide: `2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md` §6.4
("state the threshold as X out of N of the set the learner **was told** they are tested on").

`scaled` is always the same, independent of the pass mark: **correct graded questions / all
declared questions** of the component's graded items (`XAPI_EVAL_ITEMS`, questions from
`metadata/`), from the same `XAPI_Q_RESULTS` the `answered` statements carried
(`xapiComponentResult`, `unit-js/20-xapi.js`). The gate is not the score: two learners can share
`scaled` with opposite `success`.

| Component | Promised on screen | `success` when | Enforced? | Declared questions (denominator) |
|---|---|---|---|---|
| 06-01 (instruction) | — none | always `true` | — | 002 q1–q2, 004 q1 = 3 |
| 06-02 | s27 "צריך לענות נכון על 2 שאלות לפחות" | ≥ 2 of the 3 questions correct (s30 counts once, holistically) | report-only — both outcomes end the component; Kata routes | 005 q1, 006 q1, 007 q1–q3 = 5 |
| 06-03 | s32 "ענו נכון על שאלה אחת לפחות כדי להתקדם" | ≥ 1 of segment A's 2 (s33, s3435) | **yes — a gate** (decision 2026-09-30): 0 of 2 ends the component at s3435 with `success:false`; Kata routes to `recommendedAfterFail` (06-02) | 001 q1, 002 q1–q3, 003 q1, 004 q1–q2 = 7 |
| 06-04 (challenge) | — none ("זמן ל-3 שאלות מתקדמות") | `scaled` ≥ 0.6, i.e. ≥ 3 of 4. **Changed 2026-10-08 (MOE, with Maya):** the challenge ("בואו נאתגר") reports its real score, success only at ≥60%. Was always `true` | report-only. There is no gate and nothing is shown; the learner always continues | 001 q1, 002 q1–q2, 003 q1 = 4 |
| 06-05 (assessment) | s48 "יש בה 4 סעיפים. עליכם להצליח ב-3 לפחות" | ≥ 3 of the 4 sections correct | report-only — reached only after all four are resolved | 001 q1–q4 = 4 |
| 06-06 (assessment) | s54 same | ≥ 3 of the 4 sections correct | report-only, as 05 | 001 q1–q4 = 4 |

A question counts as correct when its FINAL outcome is correct (a second-attempt correct counts;
only `answered.last` enters the denominator). 01's solved exercise (item 003, s13–s24) reports every
guided answer with its real correctness but is not graded, so it is outside the score (decision
2026-09-30).

Every verdict is written through `setUnitResult('percent06_cNN_result', 'pass'|'fail')` into the
state document (QA D-12), so it survives a reload and a second device.

## Decided

- `metadata/`: 06-05 and 06-06 both carry `order: 5` — **intended** (unit owner, 30.09.26): they are
  two alternative climax components (שאלת שיא א' / ב'), not a sequence. Kept as is for the catalogue.
