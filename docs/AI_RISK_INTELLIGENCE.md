# AI Risk Intelligence — Architecture Blueprint

**Status:** Design proposal only. Nothing in this document has been implemented.
**Scope:** Architecture only — no UI, backend, API, database, or scoring changes accompany this document.
**Companion to:** `docs/ARCHITECTURE.md` (the frozen system architecture this document extends, never contradicts).

---

## 0. How this document was produced

Before writing a single recommendation, the current codebase was inspected directly — not recalled from memory, not assumed from `docs/ARCHITECTURE.md`'s aspirational sections. Specifically:

- `backend/src/modules/analysis/engine/{textNormalizer,ruleEngine,scoring}.ts` and `scamRule.model.ts` — the actual rule engine.
- `backend/src/modules/analysis/{analysis.service,analysis.model,analysis.repository,analysis.controller,analysis.routes,analysis.validation}.ts` — the actual analysis pipeline, both flows.
- `backend/src/modules/analysis/engine/ai/gemini.service.ts` — the AI integration exactly as it exists today.
- `backend/src/modules/knowledgeBase/*` (7 files, including `fraudReport.model.ts`, `reportVote.model.ts`, `reporterReputation.model.ts`) and `backend/src/modules/admin/*`.
- `frontend/src/app/router.tsx`, `frontend/src/app/LandingPage.tsx`, `frontend/src/features/analysis/{AnalyzePage,ResultsPage}.tsx`, `frontend/src/hooks/useGoToAnalyzer.ts`, `frontend/src/layouts/{DashboardLayout,PublicHeader}.tsx`, `frontend/src/routes/{ProtectedRoute,AdminRoute}.tsx`.

Section 1 below reports what that inspection actually found, including two discrepancies between the stated project status and the real implementation — reported plainly rather than smoothed over, because a design built on a wrong picture of the current system would be worthless.

---

## 1. Current System — Verified Audit

### 1.1 The Rule Engine (fully deterministic, unchanged by this proposal)

Three pure stages, in `backend/src/modules/analysis/engine/`:

1. **`textNormalizer.ts`** — strips HTML, lowercases for matching (preserving the original for display), and heuristically extracts `companyName`, `jobTitle`, `contactEmail`, `contactPhone`, `salaryRange`, `location` via regex. Has one special case: a bare URL string (nothing else) short-circuits to an empty extraction rather than being treated as prose.
2. **`ruleEngine.ts`** — loads all `ScamRule` documents where `isActive: true`, and for each one runs a matcher (`keyword`, `regex`, `emailDomain`, or `fieldPresence` — a small, closed set of matcher *types*, though the rules' actual keyword lists/patterns are admin-editable data, not code). Every match contributes the rule's `weight` and produces a `redFlag` (or `greenFlag` for positive-signal rules, though none are currently seeded).
3. **`scoring.ts`** — `riskScore = 100 * (1 - e^(-totalWeight / 40))`, clamped 0–100, then banded into `riskLevel` (low/medium/high/critical). This is the *only* place a numeric score is ever produced today.

`ENGINE_VERSION` (`'rule-engine-v1'`) is stamped onto every analysis, specifically so that a later change to weights/rules doesn't retroactively change the meaning of a historical result. **This versioning convention is the single most important existing mechanism this proposal leans on** — see §10.

### 1.2 The current AI integration (exactly as much responsibility as the problem statement describes — verified, not assumed)

`backend/src/modules/analysis/engine/ai/gemini.service.ts` exposes two fail-open functions, orchestrated by `analysis.service.ts::runAnalysisPipeline()`:

```
rawText
  │
  ├─▶ isGeminiConfigured()?  ──no──▶ skip straight to rule engine
  │         │yes
  │         ▼
  │   validateJobPostingContent(rawText)   →  { isJobPosting, confidence, reason, extractedContext? }
  │         │
  │         ▼
  │   shouldRejectAsNonJobContent()  → true?  → throw 400, stop (nothing persisted)
  │                                    → false → continue
  ▼
evaluateJobText(rawText)   ← the ENTIRE rule engine, unchanged, produces riskScore/riskLevel/redFlags
  │
  ▼
isGeminiConfigured()? ──yes──▶ generateExplanation({riskScore, riskLevel, redFlags, rawText})
  │                                   → { explanation, recommendations, observations, confidence }
  │                                   → folded into one string → aiExplanation (existing field)
  │                                   → confidence number       → aiConfidence  (existing field)
  ▼
persisted IJobAnalysis
```

This confirms the problem statement precisely: **Gemini today is a pre-score binary gate (reject/continue) and a post-score text generator. It has zero influence on `riskScore`, `riskLevel`, or which `redFlags` fire.** `evaluateJobText()` is called with the exact same `rawText` regardless of anything Gemini said. This is the gap this document exists to close.

Two properties of the current AI layer are worth preserving as hard constraints, not just implementation details: it is **advisory** (every failure — no key, timeout, quota, malformed JSON — resolves to `null`/skip, never throws into the request) and **additive** (`aiExplanation`/`aiConfidence` were reserved, unused fields on `IJobAnalysis` since Phase 1, populated for the first time only when Gemini actually runs). Both properties are why AI integration so far has been zero-risk. Any future expansion must keep both properties.

### 1.3 Public Analyzer vs. Logged-in Analyzer — how the separation actually works today

This is not a UI convention — it's structural, at three independent layers, and understanding exactly how is the precondition for §13.

| Layer | Guest / Public | Logged-in |
|---|---|---|
| **Backend entry point** | `POST /api/v1/analyze/public` (multipart, no auth middleware, IP rate-limited) → `analysis.controller.ts::analyzePublic` → `analysis.service.ts::createPublicAnalysis()` | `POST /api/v1/analyses` (JSON, `authenticate` middleware) → `analysis.controller.ts::create` → `analysis.service.ts::createAnalysis()` |
| **Shared core** | Both call the **same** `runAnalysisPipeline(rawText)` → same `evaluateJobText()` → same `ScamRule` collection. One rule engine, never duplicated. | (same) |
| **Persistence** | `userId: null`, `isSaved: false` | `userId: <real ObjectId>`, `isSaved: true` |
| **Frontend entry point** | `LandingPage.tsx`'s hero input — calls `createPublicAnalysis()` unconditionally, regardless of login state (a deliberate, recent decision: even a logged-in visitor typing in the homepage box gets the anonymous, unsaved flow) | `AnalyzePage.tsx`, reachable only via `useGoToAnalyzer()` when `user` is truthy |
| **Frontend routing** | `/results/:id` — a **sibling** of the protected route tree in `router.tsx`, wrapped only in `<PublicHeader/>`, no `ProtectedRoute`, no `DashboardLayout` | `/analyze` and `/analyses/:id` — both nested inside `<ProtectedRoute><DashboardLayout>...` |
| **Result view** | `ResultsPage.tsx` — the **same component** as the logged-in view, but it checks `location.pathname.startsWith('/results/')` and if true calls `getPublicReport()` (→ `GET /reports/:id`, no auth, redacted DTO — no `rawJobText`, no contact fields) instead of `getAnalysisById()` | `getAnalysisById()` (→ `GET /analyses/:id`, ownership-checked, full document) |
| **Navigation guard** | `useGoToAnalyzer.ts` — the *only* place in the frontend allowed to `navigate('/analyze', ...)`; every button that offers "go analyze" calls this hook, and for a guest it always resolves to `/` instead. This hook was added specifically because the guest/auth branch used to be copied inline in multiple places and drifted out of sync (one path leaked to `/register`, one to `/analyze` unconditionally). | (same hook, `user`-truthy branch) |

The two flows share exactly one thing on purpose: the rule engine and the `JobAnalysis` collection. Everything else — auth requirement, persistence, routing, component tree, navigation — is independently enforced. This is why §13's answer is largely "this already holds; don't undo it," not a new mechanism to build.

### 1.4 Knowledge Base — what's real vs. what's scaffolded

`KnowledgeBaseEntry` (backend) has a working search/list/get/create/update service (`knowledgeBase.service.ts`) and a real, seeded dataset (`seedKnowledgeBase.ts`), exposed at `GET /knowledge-base`, `GET /knowledge-base/search`, `GET /knowledge-base/:id`, admin-gated `POST`/`PATCH`. Its `communityReports` field is a **denormalized array embedded directly on the entry**, populated once at seed time — it is not connected to `FraudReport`.

**The analysis pipeline does not query the Knowledge Base at all.** No file under `analysis.*` or `engine/*` references `KnowledgeBaseEntry`, `Company`, `Recruiter`, or `Identifier`. The "Knowledge Base Lookup" step that appears in earlier design diagrams for this project was never wired into the live scoring path — it exists as a separate, standalone lookup feature a user can visit deliberately (`/knowledge-base`), not as an automatic step that happens during analysis. This matters directly for §5 and §7 below.

### 1.5 Admin Panel — actual scope

`admin.service.ts` / `admin.routes.ts` implement exactly one thing: CRUD on `ScamRule` (list/create/update/delete, admin-only). There is no user-management, report-moderation, analytics, or audit-log endpoint despite `docs/ARCHITECTURE.md` §2 listing those as intended Admin capabilities — they were never built. `AdminRulesPage.tsx` on the frontend matches this same narrow scope.

### 1.6 Discrepancies discovered (reported as requested, not silently corrected)

1. **"Community Reports" is not a working end-to-end feature today**, despite being listed as stable/working project status. `FraudReport`, `ReportVote`, and `ReporterReputation` are fully-defined Mongoose models with zero service, controller, or route referencing them anywhere (`git grep`-verified). What the Knowledge Base UI shows under "Community Reports" is static seed data embedded on `KnowledgeBaseEntry`, not user-submitted reports. There is currently no way for a real user to submit a report, vote on one, or for an admin to moderate one.
2. **Admin Panel scope is narrower than `docs/ARCHITECTURE.md` §2 describes.** Only scam-rule management exists; user management, report moderation, platform analytics, and audit logs are documented aspirations, not built features.

Neither discrepancy blocks this proposal — the AI architecture below does not depend on Community Reports or the wider Admin surface existing — but both are relevant context for §7 (AI could eventually help exactly these two gaps) and are flagged again in the Recommendations at the end.

---

## 2. Design Principles

These are constraints the rest of this document is written to satisfy, restated from the brief because every section below should be checkable against them:

1. **The Rule Engine stays deterministic.** Same input + same active `ScamRule` set ⇒ same `redFlags`, every time, forever reproducible. AI must never make the rule engine's own output non-reproducible.
2. **AI is an investigator, not an oracle and not a chatbot.** It reasons about evidence, cross-checks, and explains — it does not have a "just tell me the score" mode, and it never holds a live conversation with the user about the posting.
3. **AI is advisory until explicitly promoted.** Every new AI responsibility below ships first in a mode where its output is visible but non-binding, exactly like `aiExplanation` today, before any future decision to let it affect the number.
4. **Every AI call remains fail-open.** No API key, a timeout, a quota error, or a malformed response must always degrade to "proceed as if AI weren't there" — never a blocked analysis, never a 500.
5. **Public and Logged-in stay independent by construction, not by convention.** Any new pipeline stage is added to the one shared function both flows already call — never duplicated per-flow.

---

## 3. Responsibility Split

### 3.1 Stays inside the Rule Engine (unchanged responsibilities)

- Defining and evaluating `ScamRule` matchers (keyword/regex/emailDomain/fieldPresence).
- Computing `totalWeight` from matched rules.
- Converting weight → `riskScore` → `riskLevel` (the score formula itself).
- Structured field extraction (`textNormalizer.ts`) that the matchers depend on.
- Being the thing admins tune via the Admin Panel, without a deploy, via data (`ScamRule` documents) — not code.
- Being reproducible: given the same `ScamRule` set and text, always the same output.

**Why keep all of this deterministic:** it's auditable (a support agent can point at exactly which rule fired and why), it's free and fast (no external API in the critical path unless AI is explicitly added), it's tunable by non-engineers via the Admin Panel, and it's legally/practically defensible — "our system flagged this because of these three specific, inspectable rules" is a very different (and safer) claim than "our AI decided this."

### 3.2 Belongs to AI (new responsibilities, none of which exist today beyond the two already shipped)

| Responsibility | Exists today? | Nature |
|---|---|---|
| Pre-score input validation (is this even a job posting) | ✅ Shipped | Gate |
| Post-score explanation generation | ✅ Shipped | Text |
| Semantic/contextual pattern detection the rule engine structurally cannot express (tone, internal contradiction, narrative plausibility) | ❌ Proposed | Signal generation |
| Cross-referencing extracted entities (company/recruiter/domain) against the Knowledge Base | ❌ Proposed | Verification |
| Challenging a rule match it believes is a false positive, or flagging a likely false negative | ❌ Proposed | Verification |
| Producing an independent risk *opinion* that scoring can compare against the rule engine's verdict | ❌ Proposed | Signal generation |
| Producing a combined confidence estimate (not just its own self-reported number) | ❌ Proposed | Confidence |
| Surfacing draft `ScamRule` candidates for admin review, from patterns it repeatedly sees but no active rule catches | ❌ Proposed | Rule-authoring feedback loop |
| Recommendations / next steps for the job seeker | ✅ Shipped (folded into `aiExplanation` text) | Text |

The dividing line: **the Rule Engine answers "what matched," AI answers "what does this mean, does it hold up, and what else is going on here that isn't expressible as a keyword/regex/field-presence rule."**

---

## 4. How AI Should Improve Scoring — Without Replacing It (multiple approaches; no decision made)

This is deliberately the largest section, per the instruction not to pick an algorithm yet. Four genuinely different architectural shapes, in increasing order of how much influence AI gets over the number:

### Approach A — AI as a bounded, capped "meta-flag"
AI's findings become one more `redFlag`-shaped entry, but with a hard-coded low weight ceiling (e.g. an AI-detected flag can never contribute more than, say, 10–15 points regardless of how confident it is), and it is *tagged* distinctly (`source: 'ai'` vs `source: 'rule'`) so it's always visually and structurally separable from a deterministic match.
- **Pro:** Reuses the existing `redFlags[]` shape almost exactly; minimal new concepts.
- **Con:** Blurs the "what matched" clarity of §3.1 slightly — a `redFlags` array that mixes deterministic and probabilistic entries needs very clear labeling to stay honest.

### Approach B — Dual-track score with a capped adjustment
The rule engine produces `ruleRiskScore` (exactly as today, unchanged, always present). AI independently produces an `aiRiskOpinion` (0–100, its own read of the same text). The *displayed* `riskScore` is `ruleRiskScore`, optionally adjusted by AI within a small capped band (e.g. ±10 points) **only when AI's opinion and confidence both clear a threshold** — otherwise the adjustment is zero and the number is untouched.
- **Pro:** The rule engine's number is always independently knowable and auditable (`ruleRiskScore` is stored regardless); AI can nudge, never dominate.
- **Con:** Two numbers to reason about; needs careful UX so "why did the score move 6 points" is explainable, not mysterious.

### Approach C — AI never touches the score, only the confidence
`riskScore`/`riskLevel` remain 100% rule-engine output, forever, full stop. AI's entire contribution to "improving scoring" is a **separate, parallel `confidenceScore`** (see §9) that tells the user how *sure* the system is about the number it already computed — high confidence when AI corroborates the rule findings, low confidence when AI notices something that contradicts them, without ever changing the number itself.
- **Pro:** Zero risk of the score becoming non-deterministic or hard to explain; cleanly separates "what's the risk" from "how sure are we."
- **Con:** Doesn't help catch a scam that the rule engine fully misses (a genuinely novel pattern with zero matching keywords) — confidence alone can't raise a score that structurally can't be raised.

### Approach D — AI as a rule-candidate generator (indirect scoring improvement)
AI never touches any individual analysis's score at all. Instead, patterns it repeatedly flags across many analyses (that no active `ScamRule` currently catches) get logged as **draft rule candidates** for an admin to review and, if they agree, formally promote into a real, deterministic `ScamRule`. Scoring only ever improves by admins adding better rules — AI just accelerates *finding* what those rules should be.
- **Pro:** The rule engine gets strictly better over time, entirely through the existing, trusted, deterministic mechanism (§3.1); zero new runtime risk.
- **Con:** Slowest to show user-facing value; requires admin engagement to close the loop; doesn't help an individual analysis today, only future ones.

**These are not mutually exclusive.** A realistic target state likely combines C (always) + D (continuously, in the background) + a carefully-gated version of B (only once C and D have proven themselves in production). Approach A is the easiest to build first but the one most likely to need reworking later, because mixing probabilistic and deterministic entries in one array is a modeling compromise, not a clean one. **Recommendation for the eventual decision, not a decision:** start with C, build D in parallel since it has no live-request risk, and treat B as the graduation criterion once there's real data on how often AI's opinion and the rule engine's verdict actually agree.

---

## 5. How AI Can Detect Scam Patterns Rules Structurally Cannot

Rules are keyword/regex/field-presence matches — they are blind to anything that requires *reading*, not *matching*. Concretely, patterns the current `ScamRule` matcher types (§1.1) cannot express:

- **Internal contradiction:** a posting that claims "no experience required" in one sentence and "5+ years senior expertise required" in another. No regex catches a contradiction between two arbitrary sentences.
- **Narrative implausibility:** salary, title, and described responsibilities that don't cohere (a "Senior Software Architect" role described entirely in terms of data-entry tasks) — this requires understanding the *relationship* between extracted fields, not just their presence.
- **Tone/register mismatch:** overly familiar, urgent, or emotionally manipulative phrasing that isn't any single keyword on a list but is recognizable as a pattern (e.g. excessive flattery combined with time pressure, a style rather than a phrase).
- **Paraphrased known scams:** a scammer who has learned to avoid the exact phrase "registration fee" but describes the same mechanism in different words ("a small onboarding contribution is required before we can process your start date").
- **Cross-entity inconsistency (requires the Knowledge Base — see §1.4):** a posting claiming to be from a company whose extracted domain/contact doesn't match anything on file, or matches a domain already flagged elsewhere. The rule engine has no concept of "look this up elsewhere" — it only ever sees the one submitted text.
- **Structural absence, contextually judged:** the existing `MISSING_COMPANY_NAME` rule flags literal absence, but AI can additionally judge *whether the absence itself is suspicious given everything else in the text* (a two-line posting with no company name reads very differently from an otherwise-detailed, professional posting that simply never names the employer).

The common thread: all of these require synthesizing multiple pieces of the text (or an external lookup) into a judgment — exactly what LLMs are suited for and keyword/regex/field-presence rules structurally cannot do, no matter how many rules are added.

---

## 6. How AI Can Verify or Challenge Rule Engine Findings

Today, a `redFlag` firing is final and unexplained beyond its own static description. A verification layer would let AI attach a **second opinion**, never a silent override:

- **Corroboration:** "The rule engine flagged `UPFRONT_PAYMENT_REQUEST` — the surrounding text independently supports this; the phrase appears in a context consistent with an actual fee request, not, e.g., a quoted example of what to avoid." (Increases confidence, doesn't change the flag.)
- **Challenge (possible false positive):** "The rule engine flagged `GENERIC_EMAIL_DOMAIN` because contact is via gmail.com, but the posting text explicitly explains this is a small 3-person startup without a corporate domain yet — this may be a legitimate low-weight signal being over-counted for this specific context." This is surfaced as an **annotation on the flag**, visible to the user and to a future admin review queue — the flag still fired (rule engine stays deterministic, §2.1), but its *interpretation* is now richer.
- **Gap-filling (possible false negative):** "No active rule matched, but the posting requests a bank routing number before any interview has occurred, which is a known scam pattern this rule set doesn't yet encode." This is exactly the §4-Approach-D rule-candidate signal.

The critical design constraint: **verification output is always additive metadata attached to the existing deterministic result, never a mutation of it.** A rule that fired stays fired in the stored record regardless of what AI thinks of it — disagreement is data, not a delete.

---

## 7. How Rule Engine and AI Should Work Together (revised conceptual pipeline)

Building on the *actual* current pipeline documented in §1.2, not a hypothetical one:

```
User Input (guest via /analyze/public, or logged-in via /analyses — same function from here)
        │
        ▼
┌───────────────────────┐
│ 1. Input Validation    │  EXISTS TODAY — Gemini gate (§1.2)
│    (AI, advisory)      │  "Is this even a job posting?"
└───────────┬───────────┘
        │ (passes, or AI unavailable → always passes)
        ▼
┌───────────────────────┐
│ 2. Rule Engine         │  EXISTS TODAY, UNCHANGED — evaluateJobText()
│    (deterministic)     │  → redFlags[], riskScore, riskLevel
└───────────┬───────────┘
        │
        ▼
┌───────────────────────┐
│ 3. AI Verification     │  PROPOSED (§6) — reviews the rule engine's own
│    (AI, advisory)      │  output against the text; annotates, never mutates
└───────────┬───────────┘
        │
        ▼
┌───────────────────────┐
│ 4. AI Pattern Detection│  PROPOSED (§5) — independently scans for signals
│    (AI, advisory)      │  no active rule could express; optional KB cross-check
└───────────┬───────────┘
        │
        ▼
┌───────────────────────┐
│ 5. Score Reconciliation│  PROPOSED (§4) — whichever approach is eventually
│                        │  chosen; produces the confidence estimate (§9) either way
└───────────┬───────────┘
        │
        ▼
┌───────────────────────┐
│ 6. AI Explanation      │  EXISTS TODAY, EXTENDED — now also explains what
│    (AI, advisory)      │  stage 3/4 found, not just the rule flags
└───────────┬───────────┘
        │
        ▼
   Final Report (Results Page — same component, same route, same data shape
   philosophy as today: new fields are additive and optional)
```

Stages 1, 2, and 6 are real, shipped code today. Stages 3, 4, and 5 are the actual proposal. Every AI stage keeps the two properties from §1.2 (advisory, fail-open) — if any of stages 1/3/4/5/6 are unavailable, the pipeline degrades to exactly what exists today (stage 1 skipped, stage 2 runs, stages 3–6 skipped), which is itself already a fully-working, shipped state — there is no version of this pipeline that doesn't degrade to something already in production.

---

## 8. How the Final Score Should Be Produced (approaches only — no decision, as instructed)

This restates and slightly extends §4 specifically as "how is the number produced," since §4 was framed as "how does AI improve scoring" broadly:

1. **Rule-only (today):** `riskScore` = rule engine output, full stop. The baseline every other option is compared against.
2. **Rule-primary, AI-bounded-adjustment (§4-B):** `riskScore` = `ruleRiskScore` ± capped delta, delta = 0 unless AI clears a confidence threshold.
3. **Rule-primary, AI-confidence-only (§4-C):** `riskScore` = `ruleRiskScore` always; AI output feeds `confidenceScore` (§9), never `riskScore`.
4. **Ensemble-with-disagreement-flag:** compute both `ruleRiskScore` and `aiRiskOpinion` independently; display `ruleRiskScore` as the number, but if the two disagree by more than some threshold, surface an explicit "Rule engine and AI disagree on this one — human judgment recommended" banner rather than silently picking one. This is really C plus a UX behavior, not a fifth scoring formula, but it's worth naming because it directly serves §6's "challenge" concept at the whole-analysis level rather than the single-flag level.
5. **Weighted blend (most AI-forward, listed for completeness, not recommended first):** `riskScore = w * ruleRiskScore + (1-w) * aiRiskOpinion`, `w` tunable. This is the option that most risks the "AI now controls the score" outcome the brief explicitly warns against, and would need very strong evidence of AI reliability (built up via options 2–4 running in shadow/advisory mode first) before it would be responsible to ship.

No recommendation is made here beyond the ordering implied by risk: 1 is current, 3 is the safest next step, 2 and 4 are credible medium-term targets pending real data, 5 is explicitly the one to be most cautious about and likely never fully adopt in the "AI is an investigator, not a replacement" spirit of this brief.

---

## 9. How Confidence Should Be Calculated

Confidence needs to answer "how much should a human trust this specific result," which is a different question from the risk score itself. Proposed inputs (combinable, not exclusive):

- **Rule coverage strength:** how many independent rules fired, and their severities — one low-severity flag alone is a weaker basis than four corroborating flags across different categories (payment, urgency, contact-quality). This is derivable from the existing `redFlags[]` today with zero AI involvement, and is a reasonable *first* confidence signal on its own.
- **AI self-reported confidence:** Gemini already returns a `confidence` number for both validation and explanation (§1.2) — this is a direct input, not a new capability, just not yet combined with anything.
- **Rule/AI agreement:** the single strongest signal likely available once §6/§7 stage 3 exists — when the rule engine's flags and AI's independent read of the same text corroborate each other, confidence should be high; when they conflict, confidence should be explicitly *lower*, not averaged away. Disagreement is information, not noise.
- **Input quality/length:** a two-sentence submission gives both the rule engine and AI very little to work with; confidence should reflect that structurally, independent of what either one concludes.
- **Historical corroboration (longer-term, depends on Knowledge Base actually being wired into the pipeline — currently it is not, §1.4):** if the extracted company/domain matches an existing Knowledge Base entry with an established trust score, that's an independent, non-textual corroboration signal.

A reasonable shape (still an approach, not a final formula, in keeping with §4/§8's deferred-decision framing): confidence starts from rule coverage strength alone (available today, zero new dependencies), and is only adjusted — never solely determined — by AI agreement once stage 3 exists. This keeps confidence meaningful and available even before any AI-facing stage ships, and improves incrementally rather than depending on the whole design landing at once.

---

## 10. Backend Evolution Without Breaking Existing APIs

The existing codebase already demonstrates the exact mechanism to keep using, repeatedly, across the Knowledge Base, guest-flow, and Share Report phases: **additive fields on existing schemas, populated by a new optional pipeline stage, with the API response shape only ever growing, never changing meaning.** Concretely:

- `IJobAnalysis` already carries `aiExplanation`/`aiConfidence` as nullable fields that mean "absent until an AI stage populates them." Any new field this proposal eventually needs (`aiRiskOpinion`, `verificationNotes`, a structured `confidenceScore` distinct from `aiConfidence`) follows the identical pattern: nullable, additive, absent = "this AI stage hasn't run," never a breaking change to a field that already means something today.
- `ENGINE_VERSION` (§1.1) already exists specifically so a scoring-relevant change is legible after the fact. If §4/§8 ever changes how `riskScore` is derived, the version string changes too (e.g. `'rule-engine-v1'` → `'rule-engine-v1+ai-adjustment-v1'`), and every existing historical analysis keeps its original stamped version and therefore its original, correctly-attributed meaning — nothing already stored needs to be reinterpreted or migrated.
- Every new AI capability ships behind the same `isGeminiConfigured()`-style gate already established — or, if it needs independent rollout control from the existing validation/explanation stages, its own equally-named boolean (e.g. `isAiVerificationEnabled()`), following the identical pattern. A new capability that isn't enabled yet is architecturally indistinguishable from a capability that doesn't exist yet — which is exactly how `aiExplanation` safely sat unused on the schema from Phase 1 until it was populated for the first time.
- **No existing endpoint's request shape changes, ever, under this proposal.** `POST /analyze/public`, `POST /analyses`, `GET /analyses/:id`, `GET /reports/:id` all keep accepting exactly what they accept today. Response shapes only grow.

### 10.1 Concrete phased *plan* for backend evolution (a phasing pattern, not a numbered project plan — no work is scheduled by writing this section)

1. Add new, currently-unused, nullable fields to `IJobAnalysis` for whichever §4/§9 approach is eventually chosen (mirrors exactly how `aiExplanation`/`aiConfidence` were added in Phase 1, unused, then populated later).
2. Implement each new AI stage (§6 verification, §5 pattern detection) as its own function in `engine/ai/`, called from `runAnalysisPipeline()` — the one shared function both flows already use — behind its own feature gate, defaulting to *off*.
3. Run each new stage in **shadow mode** first: it executes, its output is stored, but nothing about the visible score or flags changes yet — purely to accumulate real data on how often it agrees with the rule engine, before §4/§8's eventual decision is made with evidence instead of guesswork.
4. Only after shadow-mode data exists does a decision get made about promoting any stage from "recorded but non-binding" to "actually affects what the user sees" — and that promotion is itself gated and reversible (turn the flag back off, the system returns to its previous, already-proven-safe behavior).

### 10.2 Rollback story

Because every stage is gated and additive, "something about the new AI stage is wrong in production" is always resolved by flipping one env-style flag back off — never a code revert, never a data migration, never a partial-rollback puzzle. This is the same property that makes `GEMINI_API_KEY` being unset today produce a fully-functional rule-engine-only app right now, not a degraded one.

---

## 11. Frontend Evolution Without Redesigning It Yet

`ResultsPage.tsx` already establishes the exact pattern to keep extending: the "AI Analysis" card added for `aiExplanation` renders **only when the field is present**, and is otherwise simply absent — the page looks identical to its pre-AI self when AI hasn't run. Every future addition follows the same rule:

- A new field like `aiRiskOpinion`, `verificationNotes`, or a structured `confidenceScore` becomes a new, similarly-conditional block in the same Overview tab (or a new tab, if there's enough content to warrant one) — appearing only when the backend actually populated it, exactly like the existing card.
- The **same** `DisplayReport` normalization already in `ResultsPage.tsx` (which maps both the owner's full `JobAnalysis` and the redacted `PublicReport` into one shared shape before rendering) is where new optional fields get added once — both the public and logged-in views pick them up automatically, with zero duplicated rendering logic, because they already share one render path today.
- No new route, no new page, no redesign of the existing score gauge/flags/tabs layout is implied by anything in this document. "Eventually evolve" here means *additive cards inside the page that already exists*, not a new page.

---

## 12. Backward Compatibility Guarantees

Restated as an explicit checklist, since it's asked for directly:

- ✅ No existing request or response field is ever removed or repurposed — only new, nullable fields are added.
- ✅ No existing endpoint path, method, or auth requirement changes.
- ✅ `ENGINE_VERSION` (or an extension of it) is stamped on every analysis whose scoring logic is touched, so historical analyses remain correctly self-describing forever, without migration.
- ✅ Every AI capability defaults to *off* and is independently toggleable; the system with everything off is byte-for-byte the system that exists today.
- ✅ The frontend renders new AI output conditionally; absence of new fields (AI disabled, or not yet shipped) produces the exact page that exists today, not a broken or degraded one.
- ✅ No change is proposed to `ProtectedRoute`, `AdminRoute`, `router.tsx`'s route tree, or any auth middleware.

---

## 13. Guaranteeing Public Analyzer and Logged-in Analyzer Remain Independent

As documented in §1.3, this independence is **already real and multi-layered** — not a property to be newly invented, but one that must not be accidentally eroded while adding AI stages. The concrete rule for every future change:

- **Any new pipeline stage (§5, §6, §7's stages 3–5) is added inside `runAnalysisPipeline()`**, the one function `createAnalysis()` and `createPublicAnalysis()` both already call. It is never added separately to each of those two functions. This is the same discipline that already keeps the rule engine itself singular — new AI stages must inherit it, not bypass it.
- **Persistence, auth, and routing differences between the two flows are never touched by an AI-related change.** Nothing in §3–§9 requires a guest analysis to become ownership-checked, or a logged-in analysis to become anonymous, or either flow's route nesting (public sibling route vs. `ProtectedRoute`-nested) to change.
- **Any new field on `IJobAnalysis` is populated identically regardless of which flow created the record** — there is no proposal anywhere in this document for "guests get less AI" or "logged-in users get more AI" as a technical default (that's a product/business decision, not an architectural one, and orthogonal to this document).
- **The existing `useGoToAnalyzer()` convention (§1.3) is the model to replicate** for any new frontend decision point that needs to branch on auth state — a single, centralized hook or utility, never an inline `user ? a : b` copied into multiple components — because that exact copy-paste pattern is what caused the guest-routing regressions this project already experienced and fixed.

---

## 14. Integrating AI Incrementally Without Risking Regression

A concrete, conservative ordering, each step independently shippable and independently revertible (expanding on §10.1 with the "why this order" reasoning):

1. **Nothing changes yet** — this document. (Current step.)
2. **Confidence from existing data only** (§9's first bullet: rule-coverage-strength). Zero new AI calls, zero new external dependency risk — purely a derived field from `redFlags[]` that already exists. Lowest possible risk, and it's useful even standalone.
3. **AI Verification in shadow mode** (§6, §10.1 step 3) — runs, is stored, is *not* surfaced prominently or allowed to change anything visible yet. Purpose: collect real evidence of how often AI agrees with the rule engine before anything downstream depends on that agreement rate.
4. **AI Pattern Detection in shadow mode** (§5) — same shadow-mode discipline, independently gated from step 3, so the two can be evaluated (and rolled back) separately.
5. **Surface shadow-mode findings in the UI as clearly-labeled, non-binding annotations** (§6's "annotation, not mutation" — e.g. "AI review" sub-section, visually distinct from the deterministic flags) — the first point where a user sees AI's independent judgment, but the number itself still hasn't moved.
6. **Only after 3–5 have run in production long enough to have real agreement/disagreement data**, revisit §4/§8 and make an actual, evidence-based decision about whether/how AI should influence `riskScore` or `confidenceScore` — and even then, ship it gated and reversible, per §10.2.
7. **§4-Approach-D (rule-candidate generation) can run in parallel with all of the above at any time**, since it never touches a live request's response at all — it's a background/batch process feeding the Admin Panel, and is arguably the lowest-risk, highest-long-term-value piece to start on.

The throughline: nothing gets to influence what a user sees or what a score is until it has already been observed, in production, agreeing with the trusted deterministic system often enough to warrant it — and every single step keeps rule-engine-only as an available fallback, forever, by construction rather than by discipline.

---

## Output — as requested

### 1. Summary of the proposed architecture

AI is added as a set of independently-gated, advisory stages *around* the existing, unchanged rule engine — before it (validation, shipped), during/after it (verification and pattern detection, proposed), and after scoring (explanation, shipped; confidence, proposed). Nothing proposed here lets AI compute a risk score on its own, replace a rule match, or become conversational. Every new stage is added to the one shared pipeline function both the Public and Logged-in analyzers already call, so their independence — which is real and already multi-layered today — is preserved by construction. Scoring evolution is deliberately left as several named, un-chosen approaches (§4, §8), ordered by increasing AI influence and decreasing immediate safety, with an explicit recommendation to earn the right to more AI influence with shadow-mode production evidence rather than deciding upfront.

### 2. Potential risks

- **Latency:** each additional AI call (verification, pattern detection) adds real request time on top of the two Gemini calls already in the pipeline. Shadow-mode stages should be evaluated for async/background execution rather than blocking the user-facing response, especially for the rate-limited public endpoint.
- **Cost:** more Gemini calls per analysis = more API cost, compounding with usage growth; needs monitoring before any stage graduates out of shadow mode.
- **Over-trust in AI "verification":** an AI that challenges a rule match risks being read by users as more authoritative than the deterministic flag it's commenting on, if the UI doesn't clearly distinguish "the rule engine found this, deterministically" from "AI thinks this about it, probabilistically." §6/§7's "annotation, never mutation" rule exists specifically to contain this, but the frontend presentation has to honor it visually, not just structurally.
- **Prompt injection:** user-submitted text is embedded directly into every Gemini prompt today (already true for the two shipped stages) — a sufficiently adversarial job posting could attempt to manipulate AI's verdict. Structured-output mode (already used) bounds the blast radius to "wrong classification," not arbitrary behavior, but this risk grows with each new AI stage that reads the same untrusted text.
- **Shadow-mode data quality:** if shadow-mode stages aren't actually reviewed before a promotion decision (§14 step 6), the "evidence-based" promise of this whole plan quietly becomes "we shipped it anyway" — this is a process risk, not a technical one, but worth naming.

### 3. Architectural problems discovered in the current project (not introduced by this proposal, found during the required inspection)

- **Community Reports is not functional end-to-end** despite being listed as stable/working — `FraudReport`/`ReportVote`/`ReporterReputation` models exist with no service/controller/route ever referencing them; the Knowledge Base's visible "Community Reports" are static seed data, not real submissions. See §1.6.
- **Admin Panel is scam-rule-management only** — the wider admin surface `docs/ARCHITECTURE.md` §2 describes (user management, report moderation, analytics, audit logs) doesn't exist yet. See §1.6.
- **The Knowledge Base is not connected to the analysis pipeline at all.** This isn't broken, exactly — it was apparently never wired in — but it means §5's "cross-reference extracted entities against the Knowledge Base" idea depends on a connection that doesn't exist yet and would itself be new work, not a small addition.

### 4. Recommendations before implementation begins

1. Resolve or consciously accept the Community Reports gap before any AI work leans on it — some framings of "AI-detected patterns feeding back into rules" (§4-D) pair naturally with a working moderation queue, which doesn't exist yet.
2. Start with §14 steps 2–4 (confidence from existing data, then shadow-mode verification and pattern detection) — both are genuinely zero-risk to ship and start producing the evidence §4/§8's eventual decision needs.
3. Decide, before writing any AI-verification code, exactly how the frontend will visually distinguish deterministic rule flags from probabilistic AI annotations — this is a design decision worth making deliberately rather than discovering as an afterthought once §14 step 5 arrives.
4. Treat §4/§8's actual scoring-formula decision as something to schedule *after* shadow-mode data exists, not alongside the first implementation — the brief's instruction not to decide it now is the right call, and revisiting it prematurely with no data would waste the entire value of running stages 3–4 in shadow mode first.
5. If the Knowledge Base is ever wired into the live analysis pipeline (for §5's cross-referencing idea), design that connection as its own additive step with its own review — it's a meaningfully different piece of work from the AI stages described here, not a detail inside them.

### 5. Confirmation

**No production code was modified.** Only one file was created: `docs/AI_RISK_INTELLIGENCE.md` (this document). No backend file, frontend file, database model, API route, or configuration file was changed. Every claim above about the current system was verified by reading the actual source files listed in §0 during this session, not assumed from prior context or from `docs/ARCHITECTURE.md`'s descriptions of intended-but-not-yet-built features.
