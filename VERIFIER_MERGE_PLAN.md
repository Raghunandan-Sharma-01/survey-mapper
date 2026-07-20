# Survey Scanner + Verifier — Architecture & Improvement Plan

**Chosen architecture: split by tool.** The web app and the automation stay as separate projects (no app-code merge). Only the logic parser + type contract are shared. The **scanner** stays local so Web Author credentials never leave your machine; the **verifier** is built so it can later be hosted behind a shareable link (it needs no privileged auth). Data flows between the three via one JSON contract, not shared runtime.

---

## 1. Why this shape (and not a monorepo or two credentialed servers)

Three forces decide it:

1. **Environments differ.** The web app is a browser SPA (static, gh-pages). The scanner and verifier are Node + Playwright — they can't run in a browser or on Pages.
2. **Auth splits the tools.** The **verifier** drives a *live survey link* that needs no privileged credentials → safe to host and share. The **scanner** scrapes the *Web Author source of truth* using your *Microsoft SSO session* → must stay local (a shared server holding live corporate sessions is a security/compliance problem and a 2FA-on-server headache).
3. **Only a little code is genuinely shared.** The logic parser (`parseTextToLogicNode`), `types/logic.ts`, and the `ConvertedQuestion` contract are used by all three. That — and only that — justifies a shared dependency. The rest has no reason to be merged.

Net: keep three projects, share one small package, connect them with a JSON file.

---

## 2. The three projects

```
survey-mapper/            (REPO 1 — web app, gh-pages, static)
  src/ ...                  existing SPA, largely untouched
  + import spec + export spec   (docx OR scanned JSON in; survey_spec.json out)
  depends on → survey-logic-core

survey-logic-core/        (REPO 2 — shared, published as a package)
  src/
    types/logic.ts          ConvertedQuestion, LogicNode, QuestionLogic, ...
    logicParser.ts          parseTextToLogicNode  (+ new numeric-range evaluator)
    logicHelpers.ts         isShowToAll, isMaskingLogic, readableCondition, ...
  no React, no Playwright, no Node-only APIs — pure TS

my-playwright-project/    (REPO 3 — automation, local Node CLI)
  src/
    auth/session.ts         login-or-reuse; save/inject storageState (auth.json)  ← scanner only
    scanner/                LOCAL ONLY (uses auth)
      run_scanner.ts
      extractor.ts
      toConvertedQuestion.ts    adapter → canonical ConvertedQuestion
    verifier/               HOSTABLE-READY (no auth, no filesystem creds)
      run_verifier.ts
      spec/loadSpec.ts
      engine/{pageClassifier,pathPlanner,dvResolver}.ts
      actions/interact.ts
      checks/{textMatch,stubOrder,dvCheck}.ts
      manual/takeover.ts
      report/report.ts
    server/                 (existing Express) — thin wrapper, local for now
  auth.json                 gitignored, LOCAL ONLY, never published
  depends on → survey-logic-core
```

**Hard rule protecting each side:**
- `survey-mapper` and `my-playwright-project` both depend on `survey-logic-core`, never on each other.
- `verifier/` never imports from `auth/` or `scanner/`. This keeps the verifier credential-free so it can be lifted into a hosted service later untouched.

### Sharing `survey-logic-core` without a monorepo

The clean, low-drift way to share code across separate repos is a published package. Recommended: a small **private package on GitHub Packages** (`@yourorg/survey-logic-core`), versioned with semver; the web app and automation each `npm install` it. Pin versions so the verifier and the map can never silently disagree on logic parsing.

If you'd rather avoid a registry for now: keep the core in one repo and consume it via a **git dependency** pinned to a commit (`"survey-logic-core": "github:org/survey-logic-core#<sha>"`). Copy-paste is the last resort — it *will* drift, and drift here means the verifier disagrees with the map, which is exactly the bug this tool exists to catch.

---

## 3. Data contract: one JSON, three producers/consumers

Everything speaks `ConvertedQuestion[]` → cleaned into `processedQuestions`:

```
        docx upload (mammoth, in web app) ─┐
                                            ├─→ ConvertedQuestion[] → cleanAndMergeQuestions → survey_spec.json
        scanner (Playwright, local) ───────┘
                                                          │
                        ┌─────────────────────────────────┼───────────────────────────┐
                        ▼                                                               ▼
             web app: render logic map                                     verifier: run + check live survey
```

- **Scanner output = web export output.** Both emit the same `survey_spec.json`, so the verifier is source-agnostic, and a scanned survey can be dropped into the web app to visualize.
- **Empty-doc fallback:** when the exported doc is mostly empty though the source is full, scan the source of truth instead — identical downstream.
- Structural markers (`type: "Structural Marker"`, e.g. `Loop Start - Challenges`) are not questions; they mark loop/subsection ranges and are skipped for matching.

---

## 4. Logic-aware path engine (verifier core, chosen strategy)

Punch answers so downstream branches actually appear, then confirm the live survey matches the spec.

1. **Spec index** from `loadSpec`: `id → question`, loop/subsection ranges from markers, DV/derived tagging.
2. **Running answer store** `{ S8: ["1","3"], S4: ["1"], ... }` updated as we punch.
3. Before punching a question, consult *downstream* `showLogic` (via shared `parseTextToLogicNode`) to choose answers that keep coverage alive — e.g. punch S8 = 1,2,3 to reach the AI/XR/Sim branches, never the exclusive code 4 ("Not aware", which terminates). Respect `isExclusive`, `isAnchor`, "choose at most 3" caps, and terminate logic.
4. Per live page: classify → match to spec (id first, fuzzy text fallback) → run checks → punch per plan → next.

Modes via flag: `--mode logic` (default, coverage-driven) and `--mode smoke` (first valid option each page).

---

## 5. Feature designs

### 5a. Per-page checks
- **Text match** — live `.mrQuestionText` vs spec `text`, normalized; bracketed pipes like `[Insert response from Q11_...]` treated as wildcards (upgrade of `assertTextMatch` to return pass/fail + diff).
- **Stub presence & order** — live options vs spec `options[].text`; randomize/alphabetize/default detection (`verifyStubOrder`); masking-aware ("Only show row stubs selected at S8" ⇒ live set equals the S8 selection).
- **Validations** — numeric min/max probed out-of-bounds to confirm the error fires, then a valid value.
- **Termination** — if a punched stub carries terminate logic, optionally assert the survey terminates.

### 5b. DV (derived variable) handling — merged-for-testing screens
DVs (`DV_Gender`, `DV_AgeRange`, `DV_GenderAge`, `DV_Aware`, `DV_US_Education_Net`, ...) are hidden/autocoded, and in test builds are often surfaced and several merged onto one screen.
1. **Detect** DVs: `id`/`name` starts with `DV_`, or options carry `"Autocode if ..."` and there's no user-facing show. Never punched as normal input.
2. **`dvResolver`** computes each DV's expected value from the answer store by evaluating option autocode text: selection autocodes via the shared parser; numeric ranges (`between 25 and 33` on S3) via a small range evaluator added to the core; composed DVs (`code [1] at DV_Gender AND code [2] at DV_AgeRange`) resolved in dependency order.
3. **`dvCheck`** reads each displayed/selected DV on the (possibly multi-DV) screen and compares to expectation.
4. **Spec-consistency lint** flags authoring bugs even before touching the live survey — e.g. your sample's `DV_GenderAge` option 8 references `S4` where every sibling references `DV_Gender`.

### 5c. Manual takeover for special exercises
When a page matches no known question pattern (drag-drop, card-sort, heatmap, custom interactive):
- `pageClassifier` returns `SPECIAL`; the verifier logs a banner, marks the row `MANUAL`, and **pauses with the browser open** — no spinning in the loop, no auto-close.
- Resume via CLI keypress (or a small floating control); a hotkey lets the tester force takeover on any page. After resume it re-classifies and continues. Manual pages are recorded as handled, not failures.

### 5d. Scanner (local, source-of-truth fallback)
- Port `run_scanner.js`/`extractor.js`; write `toConvertedQuestion.ts` mapping scraped panels to canonical `ConvertedQuestion` (`title→name`, `questionText→text`, `showLogic[]/terminationLogic[]`→`.text`, `stubName`→`options[].{id,text}` with `isExclusive`/`isAnchor` inferred).
- Feed through the same `cleanAndMergeQuestions()` the docx path uses.
- CLI: `npm run scan -- --url <webAuthorLink> --out survey_spec.json`.

### 5e. Auth / session (scanner only, self-healing)
- `session.ts` reuses `auth.json`; detects a `login.microsoftonline.com` redirect / missing sidebar as expiry; on expiry opens a visible browser for one manual login, then re-saves `storageState`.
- Day-to-day runs need no login. **The verifier never imports this** — keeping it credential-free and hostable.

### 5f. Robustness upgrades
- Replace the fixed 50-iteration loop with an explicit end/terminate detector + safety cap.
- Prefer `domcontentloaded` + element waits over `networkidle`.
- Every check returns `{status, expected, actual, message}` (no bare `console.log`), feeding the report.

---

## 6. Report output
`report/` writes `out/<timestamp>/`:
- `report.json` — per-question rows (`id, name, matched, textCheck, stubCheck, validationCheck, dvCheck, terminationCheck, status, screenshot`) + run summary (pass/fail/warn/manual, path taken, answers punched).
- `report.html` — red/amber/green table with expected-vs-actual diffs and screenshots (captured on every failure).

---

## 7. Hosting the verifier later (designed-for, not built-now)
Because the verifier has no auth and no local-file dependency beyond the spec, it can become a service without rework:
- Frontend can stay on gh-pages; it calls a **separate backend you own** (the existing Express server, deployed to a VM/container — not Pages) exposing `POST /verify { spec, liveUrl }`.
- The backend runs Playwright, streams progress (the server already uses SSE), returns the report.
- The scanner is deliberately **excluded** from this — its credentials stay on the tester's machine.
gh-pages can never run Playwright itself; "share a link" means hosting this backend.

---

## 8. Implementation phases
1. **Extract `survey-logic-core`** — move `types/logic.ts`, `logicParser.ts`, `logicHelpers.ts` into the shared package; publish (GitHub Packages) or wire as a pinned git dep; re-point survey-mapper imports at it. Confirm gh-pages build unaffected.
2. **Auth/session module** (scanner) — reuse/expiry/re-login; `auth.json` gitignored.
3. **Scanner** — port + `toConvertedQuestion.ts` adapter + `cleanAndMergeQuestions()`; `npm run scan` → `survey_spec.json`.
4. **Web import/export spec** — export `processedQuestions` as JSON; accept a scanned JSON as a map input.
5. **Spec loader** — id index, marker ranges, DV tagging.
6. **Page classifier** — `NORMAL_QUESTION | DV_SCREEN | SPECIAL | TERMINATE | END`.
7. **Checks** — typed `textMatch`/`stubOrder`/validation returning result objects; piped-text wildcards; masking-aware stubs.
8. **Path planner** — logic-aware selection + numeric-range evaluator; respect exclusive/anchor/cap/terminate.
9. **DV resolver + check** — dependency-ordered autocode; merged-screen reading; spec-consistency lint.
10. **Manual takeover** — pause/resume + hotkey; never auto-close on `SPECIAL`.
11. **Report** — JSON + HTML + screenshots.
12. **Verify** — browser-free unit run of resolver/planner against the sample JSON (confirm DV autocodes + branch coverage, flag the `DV_GenderAge` opt-8 bug), then a live smoke run.

---

## 9. Open questions
- **Live selectors / platform** — current code targets mSurvey/Decipher classes (`.mrQuestionText`, `input.mrNext`, `select.mrDropdown`, `.mrSingleText`). Confirm the test-build platform; a couple of sample pages (normal + DV screen + special exercise) would let me lock selectors.
- **DV render in test builds** — pre-selected radios, read-only text, or editable? Decides whether `dvCheck` asserts a selection or reads a value.
- **Shared-core distribution** — GitHub Packages vs pinned git dep — your call on registry overhead.
