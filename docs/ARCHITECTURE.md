# JobCheck — System Architecture

Status: **Design phase — no application code exists yet.** This document is the single source of truth for architecture decisions. Every future implementation phase should conform to it; if a phase requires deviating from this doc, update the doc in the same change.

---

## 1. High-Level Architecture

```
                        ┌────────────────────┐
                        │   Frontend (SPA)   │  React + Vite + Tailwind
                        │  Vercel/Netlify/CDN │  AdSense + Analytics tags live here
                        └──────────┬──────────┘
                                   │ HTTPS (REST, JSON)
                                   ▼
                        ┌────────────────────┐
                        │   Backend API      │  Node + Express + TS
                        │  (containerized,   │  /api/v1, stateless, horizontally scalable
                        │   stateless)        │
                        └───┬─────┬─────┬────┘
                            │     │     │
              ┌─────────────┘     │     └─────────────┐
              ▼                   ▼                    ▼
     ┌────────────────┐  ┌────────────────┐   ┌──────────────────┐
     │ MongoDB Atlas   │  │  AI Provider    │   │  Blockchain      │
     │ (Mongoose)      │  │  (OpenAI/etc.)  │   │  Service (future)│
     │ users, analyses,│  │  behind an      │   │  behind an       │
     │ companies, ...  │  │  IAIProvider    │   │  IVerification   │
     │                 │  │  interface      │   │  Registry iface  │
     └────────────────┘  └────────────────┘   └──────────────────┘
                            ▲
                            │ webhooks (signed, both directions)
                            ▼
                   ┌────────────────────┐
                   │   n8n (automation) │  hosted separately
                   │   scheduled jobs,   │
                   │   notifications     │
                   └────────────────────┘
```

**Design principle behind every arrow above:** the backend never has a hard compile-time dependency on AI, blockchain, or n8n. Each is accessed through a narrow interface (`IAIProvider`, `IVerificationRegistry`, outbound/inbound webhooks) so those integrations can be built, swapped, or delayed without touching core modules. This is the main reason the roadmap (§11) can defer AI/blockchain/automation to later phases without forcing a rewrite later.

- **Frontend**: React SPA, calls the backend over REST/JSON only. Holds no secrets. AdSense/Analytics are client-side concerns — the backend is never involved in serving ads or tracking.
- **Backend**: Express API, feature-based "clean architecture" (routes → controllers → services → repositories → models per module). Owns all business logic, the scam-detection engine, and all secrets (DB creds, AI keys, JWT secrets).
- **Database**: MongoDB Atlas, one cluster/project per environment (dev/staging/prod).
- **AI Engine**: not a separate deployable service in MVP — it's a module inside the backend (`modules/analysis/engine/`) that talks to an external LLM API through a provider interface. Could be split into its own microservice later if load demands it; the interface makes that a non-breaking change.
- **Blockchain Module**: future, for employer/company verification anchoring. Designed as an isolated service behind an interface from day one so its absence in MVP doesn't block company-reputation features (verification status just stays `unverified`/`community_verified` until it exists).
- **n8n**: external automation layer, not part of the core request path. Talks to the backend via signed webhooks in both directions (backend emits events out; n8n calls a small set of secured internal endpoints in). No user-facing feature should ever hard-depend on n8n being up.

---

## 2. Feature Breakdown

### MVP
- Register / login / logout / refresh (JWT)
- Paste a job ad → run scam analysis (rule-based engine only)
- Risk score (0–100) + risk level + red flags + green flags
- Guest access with rate-limited, non-persisted analyses
- Save analysis to history (registered users)
- Basic dashboard: list + view past analyses

### Advanced
- AI-generated natural-language explanation of the verdict
- Company reputation lookup (aggregated from past analyses)
- Community reports (flag a company/job ad, with evidence)
- Public, SEO-friendly company reputation pages (also the natural home for AdSense inventory)
- Search/filter on saved analyses and companies
- Email notifications (report status changes, weekly digest via n8n)
- **Fraud Knowledge Base** — public search across companies, recruiters, emails, domains, and (future) phone numbers, with trust scores and community-sourced verdicts. See §12.

### Premium (monetization)
- No/higher rate limits
- Deeper AI analysis (more detailed reasoning)
- Bulk analysis (multiple job ads at once)
- PDF export of a report
- Personal API key (foundation for the future public API)
- Ad-free experience

### Admin
- User management (view, ban/unban, change role)
- Community report moderation (approve/reject)
- Scam rule management (CRUD on the rule set powering the engine)
- Platform analytics (usage trends, most common red flags, most-reported companies)
- Manual company verification override
- Audit log viewer

---

## 3. User Roles

| Role | Persisted? | Capabilities |
|---|---|---|
| **Guest** | No | Run limited analyses/day (IP-based rate limit), no history, sees ads, cannot report |
| **Registered User** | Yes (`role: 'user'`) | Full analysis history, save/search, community reporting, dashboard; feature entitlements (bulk, exports, API key) gated by a separate `plan: 'free'|'premium'` field — **plan is not a role** |
| **Admin** | Yes (`role: 'admin'`) | Everything a user can do + admin panel routes |

Keeping **role** (authorization/RBAC) and **plan** (billing entitlement) as two independent fields on `User` avoids a combinatorial explosion of roles later (e.g. no `premium_admin`, `premium_user`, `free_user`...). A future `moderator` role slots in without touching the plan logic, and a future paid tier slots in without touching RBAC.

---

## 4. Folder Structure

### Backend (`backend/`)

```
backend/
├── src/
│   ├── config/                  # env loading/validation, constants
│   ├── db/
│   │   └── connection.ts
│   ├── modules/                 # one folder per feature — colocated model/routes/controller/service/repo
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.validation.ts     # Zod schemas
│   │   │   ├── refreshToken.model.ts
│   │   │   └── auth.types.ts
│   │   ├── users/
│   │   │   ├── user.model.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.repository.ts
│   │   │   └── user.validation.ts
│   │   ├── analysis/
│   │   │   ├── analysis.model.ts
│   │   │   ├── analysis.routes.ts
│   │   │   ├── analysis.controller.ts
│   │   │   ├── analysis.service.ts
│   │   │   ├── analysis.repository.ts
│   │   │   ├── analysis.validation.ts
│   │   │   └── engine/                # scam detection engine
│   │   │       ├── textNormalizer.ts
│   │   │       ├── ruleEngine.ts
│   │   │       ├── scoring.ts
│   │   │       ├── scamRule.model.ts
│   │   │       └── ai/
│   │   │           ├── IAIProvider.ts       # interface
│   │   │           ├── stubProvider.ts      # MVP no-op / rule-only
│   │   │           └── openAiProvider.ts    # future
│   │   ├── companies/
│   │   │   ├── company.model.ts
│   │   │   ├── company.routes.ts
│   │   │   ├── company.controller.ts
│   │   │   ├── company.service.ts
│   │   │   └── company.repository.ts
│   │   ├── reports/
│   │   │   ├── report.model.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── report.controller.ts
│   │   │   └── report.service.ts
│   │   ├── admin/
│   │   │   ├── admin.routes.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── admin.service.ts
│   │   ├── automation/               # n8n webhooks in/out
│   │   │   ├── automation.routes.ts
│   │   │   ├── automation.controller.ts
│   │   │   └── automation.service.ts
│   │   ├── knowledgeBase/             # Fraud Knowledge Base — see §12
│   │   │   ├── recruiter.model.ts
│   │   │   ├── identifier.model.ts
│   │   │   ├── fraudReport.model.ts
│   │   │   ├── reportVote.model.ts
│   │   │   ├── reporterReputation.model.ts
│   │   │   ├── knowledgeBaseEntry.model.ts    # denormalized search/read model
│   │   │   ├── knowledgeBase.routes.ts
│   │   │   ├── knowledgeBase.controller.ts
│   │   │   ├── knowledgeBase.service.ts
│   │   │   ├── knowledgeBase.validation.ts
│   │   │   └── recompute/                     # event-driven snapshot recompute
│   │   │       ├── entityResolver.ts          # links JobAnalysis extractedFields → Identifier/Recruiter
│   │   │       └── trustScoreCalculator.ts
│   │   └── blockchain/                # future, interface-first
│   │       ├── IVerificationRegistry.ts
│   │       └── noopVerificationRegistry.ts
│   ├── shared/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── rateLimiter.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   ├── sanitize.middleware.ts
│   │   │   └── errorHandler.middleware.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   ├── apiError.ts
│   │   │   ├── apiResponse.ts
│   │   │   └── logger.ts
│   │   ├── types/
│   │   └── constants/
│   ├── app.ts                       # express app assembly: helmet, cors, routes
│   └── server.ts                    # entrypoint
├── tests/
├── .env.example
├── package.json
└── tsconfig.json
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers/              # QueryClientProvider, AuthProvider, ThemeProvider
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/         # LoginForm, RegisterForm
│   │   │   ├── hooks/              # useLogin, useRegister
│   │   │   ├── api/                # auth.api.ts
│   │   │   └── types/
│   │   ├── analysis/
│   │   │   ├── components/         # JobPasteForm, RiskScoreCard, RedFlagList, GreenFlagList
│   │   │   ├── hooks/               # useAnalyzeJob, useAnalysisHistory
│   │   │   ├── api/
│   │   │   └── types/
│   │   ├── companies/
│   │   ├── reports/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   ├── knowledgeBase/           # Fraud Knowledge Base — search UI, entity detail, report/vote forms
│   │   └── billing/                # future — premium/plan management
│   ├── components/                  # shared, reusable UI (Button, Input, Modal, Table, Badge)
│   ├── layouts/                     # PublicLayout, DashboardLayout, AdminLayout
│   ├── routes/                      # ProtectedRoute, AdminRoute, GuestOnlyRoute
│   ├── lib/                         # api client (axios/fetch wrapper), queryClient config
│   ├── hooks/                       # cross-feature hooks (useAuth, useDebounce)
│   ├── context/                     # AuthContext
│   ├── types/                       # shared TS types
│   ├── utils/
│   ├── styles/
│   ├── config/
│   └── main.tsx
├── index.html
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

Both trees are **feature-first**: everything a feature needs lives together, and only genuinely cross-cutting code (`shared/` on the backend, `components/`, `lib/`, `hooks/` on the frontend) sits outside a feature folder. This is what lets §11's phases be added without reshuffling earlier ones.

---

## 5. Database Design

All collections live in one MongoDB Atlas database per environment. Relationships are implemented as ObjectId references (Mongoose `ref`), not embedding, except where noted — this keeps `JobAnalysis` documents append-only and independently indexable.

### `User`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | |
| `email` | string | unique, indexed |
| `passwordHash` | string | bcrypt |
| `role` | `'user' \| 'admin'` | RBAC — see §3 |
| `plan` | `'free' \| 'premium'` | billing entitlement — see §3 |
| `isVerified` | boolean | email verification, future |
| `isBanned` | boolean | |
| `lastLoginAt` | Date | |
| `createdAt` / `updatedAt` | Date | |

### `RefreshToken`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId → `User` | |
| `tokenHash` | string | hash of the token, never the raw value |
| `userAgent` / `ipAddress` | string | session/device tracking |
| `expiresAt` | Date | |
| `revokedAt` | Date \| null | set on logout or rotation |
| `createdAt` | Date | |

A separate collection (rather than an array on `User`) so multi-device sessions can be listed/revoked individually later, and so rotation/reuse-detection (§7) has a durable audit trail.

### `JobAnalysis`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId → `User` \| null | null for guest runs (guest runs typically aren't persisted at all — see §6) |
| `rawJobText` | string | original pasted text |
| `normalizedText` | string | cleaned text used by the engine |
| `extractedFields` | object | `{ companyName, jobTitle, salaryRange, contactEmail, contactPhone, location }` |
| `companyId` | ObjectId → `Company` \| null | resolved by fuzzy name match |
| `riskScore` | number (0–100) | |
| `riskLevel` | `'low'\|'medium'\|'high'\|'critical'` | derived band |
| `redFlags` | array of `{ ruleId, label, description, weight, severity }` | |
| `greenFlags` | array of `{ label, description }` | |
| `aiExplanation` | string \| null | populated once AI phase ships |
| `aiConfidence` | number \| null | 0–1 |
| `engineVersion` | string | which rule-set/logic version produced this result — keeps old results reproducible/explainable after the engine evolves |
| `isSaved` | boolean | explicit save vs. throwaway run |
| `sourceMetadata` | `{ url, hasDescription, fileName, urlExtractionError } \| null` | **Added** (guest public-analysis phase, §6). Records which of url/description/file contributed to `rawJobText` for a guest submission, and whether fetching the url's page content failed (`urlExtractionError`, see `engine/urlContentExtractor.ts`); `null` for every authenticated-flow analysis. |
| `createdAt` | Date | |

### `Company`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | indexed |
| `normalizedName` | string | for fuzzy dedup/matching |
| `website` | string \| null | |
| `aggregatedRiskScore` | number | rolling average from analyses + reports |
| `totalAnalyses` / `totalReports` | number | |
| `verificationStatus` | `'unverified'\|'community_verified'\|'admin_verified'\|'blockchain_verified'` | |
| `blockchainRecordHash` | string \| null | future |
| `createdAt` / `updatedAt` | Date | |

### `CommunityReport`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `reporterId` | ObjectId → `User` | reports require auth (spam control) |
| `companyId` | ObjectId → `Company` \| null | |
| `jobAnalysisId` | ObjectId → `JobAnalysis` \| null | links report to a specific pasted ad |
| `type` | `'scam'\|'legit'\|'suspicious'` | |
| `description` | string | sanitized before storage |
| `evidenceUrls` | string[] | |
| `status` | `'pending'\|'approved'\|'rejected'` | |
| `moderatedBy` | ObjectId → `User` \| null | |
| `createdAt` / `updatedAt` | Date | |

### `ScamRule`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `key` | string | unique code, e.g. `UPFRONT_PAYMENT` |
| `description` | string | |
| `category` | `'payment'\|'contact'\|'language'\|'salary'\|'urgency'\|...` | |
| `matcher` | object | structured config (keyword list / regex), not free-form code |
| `weight` | number | score contribution |
| `severity` | `'low'\|'medium'\|'high'` | |
| `isActive` | boolean | |
| `createdAt` / `updatedAt` | Date | |

Data-driven so admins can tune detection (§9) without a redeploy.

### `AuditLog`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `actorId` | ObjectId → `User` | |
| `action` | string | e.g. `USER_BANNED`, `RULE_UPDATED` |
| `targetType` / `targetId` | string / ObjectId | |
| `metadata` | object | free-form context |
| `createdAt` | Date | |

**Relationships summary:** `User` 1—N `JobAnalysis`, `User` 1—N `RefreshToken`, `User` 1—N `CommunityReport`; `Company` 1—N `JobAnalysis`, `Company` 1—N `CommunityReport`; `ScamRule` is referenced by id inside `JobAnalysis.redFlags` (soft reference, not a join, since flags must stay a frozen snapshot even if the rule later changes).

---

## 6. API Design

All routes prefixed `/api/v1` from day one — this is what makes a public API (§11 Phase 8) additive instead of a breaking migration.

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### Users
```
GET    /api/v1/users/me
PATCH  /api/v1/users/me
DELETE /api/v1/users/me          # deactivate, not hard delete
```

### Analysis
```
POST   /api/v1/analyses           # run analysis — authenticated only, JSON body (jobText)
POST   /api/v1/analyze/public      # run analysis — guest, multipart (url/description/file), rate-limited
GET    /api/v1/analyses           # list current user's saved analyses (paginated)
GET    /api/v1/analyses/:id        # optional auth — owner/admin, or anyone if the analysis is a guest run (userId: null)
PATCH  /api/v1/analyses/:id       # toggle isSaved, add notes
DELETE /api/v1/analyses/:id
```

**Deviation from the original plan above:** this section originally called for one unified `POST /analyses` serving both guest and authenticated requests. Guest support was instead built as a **separate** `POST /analyze/public` endpoint, because it needed a fundamentally different request format — `multipart/form-data` to carry an optional file upload alongside `url`/`description` — while the authenticated route stays JSON-only and completely unchanged. Both routes funnel into the same `evaluateJobText` step inside `analysis.service.ts` (normalize → rule engine → scoring), so the rule engine, scoring curve, and `JobAnalysis` collection are still shared, not duplicated. Guest runs *are* persisted (`userId: null`, `isSaved: false`) rather than the "typically not persisted" default assumed above, so a guest can revisit their own result at `GET /analyses/:id` immediately after submitting — access to that route is public for exactly those userId-less records, and unchanged (owner/admin only) for every other analysis. Guest submissions additionally combine `url` + `description` + extracted file text into one `rawJobText`, recording which sources contributed in a new additive `sourceMetadata` field on `JobAnalysis` (not present in §5's original field table).

**URL extraction (added after the guest-flow phase):** a submitted `url` is no longer analyzed as a bare string. `analysis.controller.ts::analyzePublic` calls `engine/urlContentExtractor.ts` — a pipeline stage that sits alongside `textNormalizer.ts`/`ruleEngine.ts`/`scoring.ts`, not a second analyzer — which fetches the page (http/https only, SSRF-guarded: literal-IP and resolved-DNS private-range checks, re-validated on every redirect hop, capped response size, request timeout) and parses it with `cheerio` into `{ title, extractedText }`, stripping scripts/styles/nav/header/footer/comments. That extracted text replaces the raw URL as the "url segment" combined into `rawJobText`; `evaluateJobText` (§8) is unchanged and never sees a URL string. If extraction fails for any reason (blocked, timeout, non-HTML, unreachable, private-network target), the analysis still runs on whatever other input was given, and the reason is recorded in `sourceMetadata.urlExtractionError` rather than silently producing a shallow result.

### Companies (public read)
```
GET    /api/v1/companies                 # search/list
GET    /api/v1/companies/:id             # public reputation page
GET    /api/v1/companies/:id/analyses    # aggregated public view
```

### Community Reports
```
POST   /api/v1/reports            # auth required
GET    /api/v1/reports            # own reports for users, all for admins (scoped in service layer)
GET    /api/v1/reports/:id
PATCH  /api/v1/reports/:id        # admin moderation: approve/reject
```

### Admin
```
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id           # ban/unban/change role
GET    /api/v1/admin/rules
POST   /api/v1/admin/rules
PATCH  /api/v1/admin/rules/:id
DELETE /api/v1/admin/rules/:id
GET    /api/v1/admin/analytics/overview
GET    /api/v1/admin/audit-logs
```

### Automation (n8n integration — internal, signed)
```
POST   /api/v1/automation/webhooks/incoming/:source   # n8n → backend, HMAC-signature verified
```
(Outgoing direction — backend → n8n — is just the backend calling n8n's own webhook URLs; no inbound route needed on our side for that.)

### Blockchain (future, stubbed behind the interface)
```
POST   /api/v1/companies/:id/verify-onchain   # admin-triggered
GET    /api/v1/companies/:id/verification-proof
```

---

## 7. Authentication Flow (JWT + Refresh Token)

1. **Login/Register** succeeds → backend issues:
   - **Access token**: short-lived JWT (~15 min), signed, contains `{ userId, role }`. Returned in the JSON response body. The frontend keeps it **in memory only** (not `localStorage`) to minimize XSS exposure.
   - **Refresh token**: long-lived (~7–30 days), random opaque value. Set as an **httpOnly, Secure, SameSite=Strict cookie** (never touched by frontend JS). Its **hash** (not the raw value) is stored in the `RefreshToken` collection alongside device/IP metadata.
2. **Authenticated requests** send `Authorization: Bearer <accessToken>`.
3. **Access token expires** → frontend gets a 401 → calls `POST /auth/refresh` (browser sends the httpOnly cookie automatically) → backend hashes the incoming cookie value, looks it up, checks not expired/not revoked → issues a **new** access token **and rotates the refresh token** (revokes the old DB row, issues + stores a new one). Rotation means a stolen-and-reused old refresh token is detectable (its row is already revoked), which is the standard mitigation for refresh-token theft.
4. **Logout** → revoke the refresh token's DB row + clear the cookie.
5. **Multi-device**: because sessions live in a collection keyed by `userId`, a user can have several valid refresh tokens at once (one per device), and a future "manage sessions" screen can list/revoke them individually.
6. **Guests** never touch this flow — no tokens issued, identified only by IP (+ optional lightweight anonymous cookie for rate-limit bucketing).

---

## 8. Scam Detection Engine

Designed so the **rule engine is the dependency-free MVP core**, and AI is an **enhancement layer added on top later** — the product must work, deterministically and for free, before any LLM API is wired in.

**Stage 1 — Normalization & extraction** (`textNormalizer.ts`)
Strip HTML/markup, produce a lowercase matching copy while preserving the original for display, and heuristically extract structured fields (email, phone, salary figures, urgency phrases like "immediate joining", "limited seats").

**Stage 2 — Rule evaluation** (`ruleEngine.ts`)
Iterate all active `ScamRule` documents; each rule tests the normalized text/extracted fields and, on match, contributes its `weight` to a running total and attaches itself to `redFlags` (or `greenFlags` for positive-signal rules — e.g. verified corporate email domain, detailed responsibilities, market-consistent salary). Rules are **data**, not code, so admins can tune detection from the admin panel (§2) without a deploy.

Representative rule categories: upfront-payment requests, vague job descriptions, urgency/pressure language, unrealistic salary-for-role, requests for sensitive personal info (CNIC/bank details) pre-interview, non-corporate email domain for a claimed corporate role, grammar/spelling anomaly density.

**Stage 3 — Scoring** (`scoring.ts`)
Accumulated weight is normalized into a 0–100 `riskScore` with diminishing returns (so one severe flag doesn't need ten more to hit 100, and the score doesn't runaway-saturate), then banded into `riskLevel` (0–24 low, 25–49 medium, 50–74 high, 75–100 critical). `engineVersion` is stamped onto the result so a later change to weights/rules doesn't retroactively change the meaning of a past analysis.

**Stage 4 — AI validation + explanation** (`engine/ai/gemini.service.ts`) — **implemented**, superseding the "Advanced phase, not MVP" placeholder this section originally described.

Two advisory, fail-open Gemini calls now wrap `evaluateJobText` (in `analysis.service.ts::runAnalysisPipeline`), which is itself completely unchanged:

- **Before scoring — validation.** Classifies whether the submitted text is actually a job posting/offer/recruitment message at all (a scam job posting still counts — this only screens out content unrelated to jobs entirely: chit-chat, technical questions, gibberish). A confident "not a job posting" verdict (`confidence ≥ 0.6`) causes a clean `400` before anything is persisted, matching the existing pattern of rejecting empty/invalid input early. A low-confidence or failed call is ignored and the text proceeds to the rule engine as before.
- **After scoring — explanation.** Given the rule engine's already-computed score/flags, Gemini produces a plain-language explanation, recommendations, and observations, explicitly instructed not to propose a different score. `explanation` + `recommendations` + `observations` are folded into one formatted string and stored in the existing `aiExplanation` field; `confidence` (0–1) is stored in the existing `aiConfidence` field — **no new database fields were added**; both fields were already reserved on `IJobAnalysis` by this section's original plan and were simply unpopulated (`null`) until now.

Gemini is never in a position to set or influence the risk score itself, and is never a hard dependency: `GEMINI_API_KEY` is optional, `isGeminiConfigured()` gates every call, and every failure mode (missing key, timeout, quota, non-2xx, malformed JSON) resolves to `null` rather than throwing — `aiExplanation`/`aiConfidence` simply stay `null` and the rule-only result is returned exactly as before Gemini existed.

---

## 9. Security Architecture

| Concern | Approach |
|---|---|
| **Input validation** | Zod schema per endpoint (body/query/params), enforced in a `validate` middleware before any controller logic runs |
| **Rate limiting** | `express-rate-limit`, tiered: strict on `/auth/*` and guest `/analyses`, relaxed for authenticated users, relaxed further for `plan: 'premium'` |
| **Sanitization** | All free-text user input (job text, report descriptions) is HTML-sanitized server-side before storage/rendering — prevents stored XSS |
| **Authentication** | JWT verification middleware on protected routes |
| **Authorization** | `role` middleware for admin-only routes; ownership checks in the service layer (a user can only read/mutate their own `JobAnalysis`/`CommunityReport` unless `role === 'admin'`) |
| **CORS** | Explicit origin allow-list from env config; `credentials: true` to allow the refresh-token cookie |
| **Helmet** | Secure headers on by default; CSP explicitly extended (not disabled) once AdSense/Analytics script domains are added |
| **Logging** | Structured logger (pino/winston) for request/error logs and security events (failed logins, rate-limit trips), kept separate from the business-level `AuditLog` collection |
| **Error handling** | Centralized error middleware, consistent `ApiError` shape, no stack traces or internals leaked in production responses |
| **Secrets** | Env vars only, `.env` never committed, `.env.example` documents required keys |
| **Passwords** | bcrypt, cost factor ≥ 10 |

---

## 10. Deployment Architecture

- **Frontend**: static Vite build served from a CDN (Vercel/Netlify/S3+CloudFront). AdSense and Analytics scripts are injected here — the backend has no role in ads/tracking.
- **Backend**: containerized (Docker) Node/Express service on Render/Railway/Fly.io/EC2, **stateless** (no in-memory sessions — everything needed to scale horizontally lives in the JWT or MongoDB), sitting behind a load balancer for multi-instance scaling.
- **MongoDB Atlas**: managed, one cluster/project per environment (dev/staging/prod), TLS-only connections, network access restricted by IP allow-list or VPC peering.
- **AI provider**: called server-side only from the `analysis/engine/ai/` provider implementation over HTTPS; API keys never reach the frontend.
- **AdSense/Analytics**: pure client-side integration; no backend involvement.
- **Blockchain module**: an isolated service/worker talking to a chain RPC provider (e.g., Alchemy/Infura on Polygon), invoked by the backend only through `IVerificationRegistry` — if it's slow or down, company verification simply stays pending; nothing else breaks.
- **n8n**: separate hosted instance (n8n Cloud or self-hosted container). Backend → n8n calls use n8n's own webhook URLs (outgoing events like "new high-risk analysis" or "new report"); n8n → backend calls hit the one signed `automation/webhooks/incoming/:source` endpoint (e.g., scheduled re-scoring jobs). All inter-service calls are authenticated with API keys/HMAC signatures, never user JWTs.
- **CI/CD**: GitHub Actions — lint + typecheck + test on every PR; build & deploy on merge, per environment.

---

## 11. Development Roadmap

| Phase | Scope |
|---|---|
| **0 — Foundations** | Repo scaffolding, TS/ESLint/Prettier config, folder structure, env setup, CI skeleton, DB connection |
| **1 — Auth** | `User` model, register/login/refresh/logout, JWT + role middleware, Zod validation, base rate limiting, Helmet/CORS |
| **2 — Analysis MVP** | `JobAnalysis` model, rule engine (seeded `ScamRule` set), `POST /analyses`, score + flags, guest support, minimal frontend paste form + results view |
| **3 — Dashboard & History** | Saved analyses list/detail, pagination/search, basic profile |
| **4 — Company Reputation + Community Reports** | `Company` model, report submission/moderation, public company pages |
| **4B — Fraud Knowledge Base** | `Recruiter`/`Identifier`/`FraudReport`/`KnowledgeBaseEntry` collections, search + entity detail endpoints, entity resolution from `JobAnalysis`, trust score calculator (§12). Depends on Phase 4 (`Company` + `CommunityReport` must exist) |
| **5 — Admin Panel** | User management, rule CRUD (moves rules from seed data to admin-editable), analytics overview, audit logs, **+ Knowledge Base report moderation & duplicate-entity merge tools** |
| **6 — AI Explanation Layer** | `IAIProvider` real implementation, blended confidence, prompt design, timeout/fallback-to-rule-only handling |
| **7 — Monetization** | Plan entitlements, AdSense integration, per-plan usage limits, payment provider integration |
| **8 — Public API** | Per-user API keys, versioned public endpoints, API docs |
| **9 — Automation & Ecosystem** | n8n workflows, browser extension, mobile app groundwork |
| **10 — Blockchain Verification** | `IVerificationRegistry` real implementation, on-chain anchoring, verification badge in UI |

Each phase is independently shippable. Later phases (6, 9, 10 especially) plug into interfaces defined from Phase 0/2 (`IAIProvider`, `IVerificationRegistry`, the automation webhook contract) rather than requiring earlier modules to be reopened — this is the direct payoff of the interface-first seams in §1.

---

## 12. Fraud Knowledge Base

**Constraint driving this whole section:** none of §1–§11 changes. `User`, `Company`, `JobAnalysis`, `ScamRule`, `CommunityReport`, `RefreshToken`, `AuditLog` keep their existing shape and existing behavior exactly as specified above. The Knowledge Base is a new module (`modules/knowledgeBase/`) that **reads** those collections and **adds** new ones — it never gains write access to an existing schema and never requires a migration on one.

### 12.1 Why a new module instead of extending `Company`/`CommunityReport`

The KB needs to search and score five entity kinds (company, recruiter, email, domain, phone), but only one of those (`company`) has an existing collection. Rather than bolting recruiter/email/domain/phone fields onto `Company` (a modification) or teaching `CommunityReport` to target five different reference types (also a modification), the KB introduces its own entity and reporting collections and treats `Company` purely as an upstream data source. Concretely:

- For a `company`-type search result, trust/verification data is **derived by reading `Company.aggregatedRiskScore`, `Company.verificationStatus`, `Company.totalAnalyses`, `Company.totalReports`** (all already in the original schema) plus new aggregation over `CommunityReport` — nothing new is written back onto `Company`.
- `CommunityReport` keeps doing exactly what it already does (reports filed against a company/analysis from the analysis-result flow). It becomes one of two inputs the KB reads when scoring a company; it is not replaced.

### 12.2 New Collections

#### `Recruiter`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | indexed (text) |
| `aliases` | string[] | alternate spellings/names seen across analyses |
| `associatedCompanyIds` | ObjectId[] → `Company` | companies this recruiter has posted for (including disputed/fake claims) |
| `associatedIdentifierIds` | ObjectId[] → `Identifier` | emails/phones seen used by this recruiter |
| `mergedIntoId` | ObjectId → `Recruiter` \| null | set when this record is merged into a canonical duplicate (§12.6) — kept as a redirect stub, never deleted |
| `createdAt` / `updatedAt` | Date | |

#### `Identifier`
Unifies email, domain, and phone — they're structurally identical (a normalized string people search by) and always benefit from the same linkage/scoring logic, so one collection with a type discriminator avoids three near-duplicate models.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `type` | `'email' \| 'domain' \| 'phone'` | `'phone'` reserved for the future search type in the prompt — schema-ready, not required to ship in v1 |
| `value` | string | as first seen (display form) |
| `normalizedValue` | string | lowercased/trimmed (email, domain) or E.164 (phone); unique + indexed per `type` |
| `companyId` | ObjectId → `Company` \| null | set only when a confirmed association exists |
| `recruiterId` | ObjectId → `Recruiter` \| null | ditto |
| `mergedIntoId` | ObjectId → `Identifier` \| null | see §12.6 |
| `createdAt` / `updatedAt` | Date | |

An `Identifier` with both links `null` is expected and valuable — e.g. a scam email seen in one job ad with no confirmed employer behind it yet is still worth surfacing as "seen once, unlinked, no history" the moment a second person searches it.

#### `FraudReport`
The general-purpose reporting mechanism for the Knowledge Base, separate from `CommunityReport` (§12.1). Polymorphic target so one collection covers all five search types.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `reporterId` | ObjectId → `User` | auth required, same spam-control rationale as `CommunityReport` |
| `targetType` | `'company' \| 'recruiter' \| 'identifier'` | (`identifier` covers email/domain/phone) |
| `targetId` | ObjectId | points into `Company`, `Recruiter`, or `Identifier` per `targetType` |
| `verdict` | `'scam' \| 'suspicious' \| 'legit'` | "mark a report as legitimate" (§12.4) is a report with `verdict: 'legit'`, not an edit of someone else's report |
| `description` | string | sanitized before storage, same as `CommunityReport.description` |
| `evidenceUrls` | string[] | future capability, schema-ready now (mirrors `CommunityReport.evidenceUrls`) |
| `status` | `'pending' \| 'approved' \| 'rejected'` | admin-moderated, same lifecycle shape as `CommunityReport.status` |
| `moderatedBy` | ObjectId → `User` \| null | |
| `usefulVotes` / `notUsefulVotes` | number | denormalized counters, updated on vote (source of truth is `ReportVote`) |
| `createdAt` / `updatedAt` | Date | |

#### `ReportVote`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `reportId` | ObjectId → `FraudReport` | |
| `userId` | ObjectId → `User` | |
| `value` | `1 \| -1` | useful / not useful |
| `createdAt` | Date | |

Compound unique index on `(reportId, userId)` — one vote per user per report, enforced at the DB level, not just in application logic.

#### `ReporterReputation`
A new, small, additive collection rather than a field on `User` — keeps `User` untouched per the constraint in §12.1, and keeps a fast-changing, KB-specific number out of the core identity document.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId → `User` | unique |
| `reliabilityScore` | number (0–100) | starts at a neutral default; decreases when this user's reports are rejected, increases when approved |
| `reportsApproved` / `reportsRejected` | number | |
| `updatedAt` | Date | |

#### `KnowledgeBaseEntry` — the search/read model
This is the collection search queries actually hit. It's a **denormalized, cached projection**, not a new source of truth — recomputed asynchronously whenever an upstream fact changes (new linked `JobAnalysis`, a `FraudReport`/`CommunityReport` moderation decision, a merge). Search-at-scale over five heterogeneous entity kinds with live aggregation on every query would not hold up; a materialized view that's recomputed on write and cheap to read on search is the standard fix.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `entityType` | `'company' \| 'recruiter' \| 'identifier'` | |
| `entityRefId` | ObjectId | points to the `Company`/`Recruiter`/`Identifier` document |
| `searchTerms` | string[] | name/aliases/value, text-indexed — this is what `q=` matches against |
| `trustScore` | number (0–100) | see §12.5 |
| `verificationStatus` | string | mirrors `Company.verificationStatus` for company entities; own field for recruiter/identifier |
| `riskLevel` | `'low' \| 'medium' \| 'high' \| 'critical'` | banded from `trustScore`, same bands as `JobAnalysis.riskLevel` for UI consistency |
| `analysesCount` | number | linked `JobAnalysis` documents |
| `reportsCount` / `confirmedScamCount` / `confirmedLegitCount` | number | from approved `FraudReport` + (for companies) approved `CommunityReport` |
| `commonPatterns` | array of `{ ruleKey, ruleCategory, occurrences }` | top `ScamRule` matches across linked analyses (§12.3) |
| `aiSummary` | string \| null | via existing `IAIProvider` (§12.3) |
| `safetyRecommendations` | string[] \| null | via existing `IAIProvider` |
| `lastActivityAt` | Date | most recent linked analysis/report — drives "recent activity" and score decay (§12.5) |
| `recomputedAt` | Date | |
| `name` | string | **Added — Knowledge Base backend phase.** Denormalized display name copied from the linked `Company`/`Recruiter`/`Identifier` at create time, so reads never need a cross-collection lookup. |
| `description` | string | **Added.** Plain admin-authored summary. The real pipeline still writes `aiSummary` once `IAIProvider` exists (§12.3) — this field exists because that phase explicitly excluded AI, and entries need *some* summary text now. |
| `indicators` | string[] | **Added.** Plain admin-authored red-flag list. `commonPatterns` remains the field a real rule-aggregation pipeline populates later; `indicators` is the simpler, directly-authored version used until that pipeline exists. |
| `domain` / `associatedCompany` | string \| null | **Added.** Denormalized display fields (a company's site / a recruiter's claimed employer) — same rationale as `name`. |
| `communityReports` | array of `{ category, description, reportedAt }` | **Added, explicitly a placeholder.** Illustrative report content authored directly on the entry. This is *not* the real Community Reports system — `FraudReport`/`ReportVote`/`ReporterReputation` are untouched and still the intended real path; once that's built, this field is what gets replaced by a real aggregation over `FraudReport`. |
| `createdAt` / `updatedAt` | Date | **Added** (`timestamps: true`). The original design treated this collection as a pure recompute cache with no need for these; this phase adds direct admin-authored CRUD (`POST`/`PATCH /knowledge-base`), which is a genuinely different write pattern where standard timestamps are the right fit — same rationale `ScamRule`/`Company` already use. |

The API-facing shape (`GET /knowledge-base/*`) translates two of the fields above at the boundary rather than storing a second taxonomy: `riskLevel` (`low/medium/high/critical`, kept `JobAnalysis`-consistent for whenever the real recompute pipeline lands) maps to the frontend's `safe/suspicious/high_risk/confirmed_scam`, and `entityType: 'identifier'` maps to the frontend's `type: 'domain'` (the only `Identifier.type` this phase creates). Both mappings live in `knowledgeBase.service.ts`; nothing stored on disk uses the frontend's vocabulary.

### 12.3 Data Relationships

- **`Company`**: read-only input. A `KnowledgeBaseEntry` of type `company` has `entityRefId → Company._id`. Its `trustScore`/`verificationStatus` derive from `Company`'s existing aggregate fields plus KB-only report data; `Company` is never written to by this module.
- **`Recruiter`**: new, owned by this module. Links out to `Company` (`associatedCompanyIds`) and `Identifier` (`associatedIdentifierIds`) to capture "this person claims to recruit for X, using email Y."
- **`Identifier`**: new, owned by this module. Optionally links to `Company`/`Recruiter` when an association is confirmed; stands alone otherwise (see §12.2).
- **`JobAnalysis`**: read-only input, and the primary automatic feed. A background **entity resolver** (`recompute/entityResolver.ts`) watches for newly created analyses, reads the existing `extractedFields` (`companyName`, `contactEmail`, `contactPhone` — already part of the original `JobAnalysis` schema, §5) and:
  1. Normalizes each value.
  2. Matches against existing `Company`/`Identifier`/`Recruiter` records (exact match on normalized email/domain/phone; fuzzy match on company/recruiter name).
  3. Creates a new `Identifier`/`Recruiter` record if no match exists, or links to the existing one.
  4. Queues a `KnowledgeBaseEntry` recompute for every entity touched.

  `JobAnalysis` itself is never modified — the resolver only reads it and writes to the new collections.
- **`User`**: read-only input for `reporterId`/`userId`/`moderatedBy` references and role checks; `ReporterReputation` is a separate collection precisely so this stays true.
- **`ScamRule`**: read-only input. `commonPatterns` on a `KnowledgeBaseEntry` is computed by aggregating the `redFlags[].ruleId` (and their category, via `ScamRule.category`) across every `JobAnalysis` linked to that entity — i.e., "what does the rule engine keep flagging on ads tied to this company/recruiter/email."

### 12.4 Community Contributions

- **Report a suspicious company/recruiter/identifier**: `POST /knowledge-base/reports` with `targetType`, `targetId` (or a raw `value`+`type` for identifiers not yet in the KB, which the service resolves/creates before attaching the report), `verdict: 'scam'|'suspicious'`, `description`.
- **Mark as legitimate**: the same endpoint with `verdict: 'legit'` — a positive report is structurally identical to a negative one, just counted separately in `confirmedLegitCount`. There's no separate "endorse" mechanism to keep the moderation and scoring pipeline single-path.
- **Supporting evidence (future)**: `evidenceUrls: string[]` already exists on `FraudReport` (§12.2) — the field ships now even though the upload UI doesn't, so this is additive later, not a schema change.
- **Vote on report usefulness**: `POST /knowledge-base/reports/:id/votes { value: 1 | -1 }`, one per user per report, feeds report ranking on the entity detail page (most-useful reports surface first) — voting does **not** affect `trustScore` directly, only report display order, so it can't be gamed into moving the score.
- **Spam/abuse prevention**:
  - Auth required for both reports and votes (no anonymous submissions), same rule already established for `CommunityReport`.
  - Tiered rate limiting on `POST /reports` and `POST /votes` via the existing `rateLimiter.middleware.ts` (no new middleware needed).
  - DB-level unique index prevents duplicate votes.
  - `ReporterReputation.reliabilityScore` creates escalating friction rather than a hard gate: low-reliability users' reports are always queued for moderation (never auto-visible) and are rate-limited harder; outright bans remain an explicit admin action on the existing `User.isBanned`, untouched.
  - Near-duplicate reports on the same entity within a short window are surfaced to moderators as a cluster ("14 similar reports in 2 hours") rather than 14 separate queue items — makes brigading visible instead of just noisy.
- **Admin moderation**: same shape as the existing `CommunityReport` moderation flow (§2/§9) — `status: pending → approved/rejected`, `moderatedBy` recorded. Approving/rejecting a `FraudReport` triggers a `KnowledgeBaseEntry` recompute and a `ReporterReputation` update for that reporter.

### 12.5 Trust Score Model

`trustScore` (0–100, higher = more trustworthy) is recomputed asynchronously, never inline with a search request. Inputs:

1. **Analysis signal** — recency-weighted average of `riskScore` (inverted) across every `JobAnalysis` linked to the entity.
2. **Report signal** — ratio of `confirmedScamCount` to (`confirmedScamCount` + `confirmedLegitCount`), counting only `approved` reports from both `FraudReport` and, for companies, `CommunityReport`.
3. **Verification bonus** — a floor/bonus when `verificationStatus` is `admin_verified` or `blockchain_verified` (read from `Company`, once §1's blockchain module exists).
4. **Bayesian shrinkage toward neutral (50)** based on sample size (`analysesCount + reportsCount`): a brand-new entity with one bad report moves noticeably but not to 0; a high-volume entity is much harder to swing with a single report. This is what keeps a two-line rule-engine result from carrying disproportionate weight in the very common "one job ad, no history yet" case.
5. **Time decay** — entities with no `lastActivityAt` update in a configurable window drift back toward neutral on a scheduled recompute (a natural fit for the existing n8n automation seam, §1/§10), so an old, one-time incident doesn't permanently cap a company's score.

Recompute is triggered by: new linked `JobAnalysis`, a `FraudReport`/`CommunityReport` moderation decision, an entity merge, or the periodic decay job — never by a read.

### 12.6 Duplicate Merging

Fuzzy-match candidates (similar `normalizedName` for companies/recruiters, or an `Identifier` that gets newly linked to two different `Recruiter`s) are surfaced to admins rather than auto-merged — false merges are worse than a slower cleanup queue. On confirmed merge (`POST /admin/knowledge-base/entities/merge`):

- The absorbed entity's aliases, linked identifiers/recruiters/companies, and all `FraudReport`/vote references are re-pointed to the canonical entity.
- The absorbed record is **kept, not deleted**, with `mergedIntoId` set — so any existing link (a public company page URL, a browser-extension cache, a public-API response already handed out) resolves to a redirect rather than a 404.
- Both entities' `KnowledgeBaseEntry` rows are recomputed; the absorbed one's entry is marked merged/hidden from search.

### 12.7 Scalability & Accuracy Growth

- **Trust scores evolve** per §12.5 — event-driven recompute plus scheduled decay, never a live query-time calculation.
- **Duplicates are merged** per §12.6 — admin-confirmed, redirect-preserving, never a silent delete.
- **False reports** are handled via moderation (§12.4) feeding `ReporterReputation`, which self-adjusts future friction per reporter without requiring a ban for every bad report.
- **Accuracy compounds with usage**: every new `JobAnalysis` feeds the entity resolver (§12.3) automatically — no user has to "know about" the KB for it to grow. As `analysesCount`/`reportsCount` rise per entity, Bayesian shrinkage (§12.5) matters less, `commonPatterns` becomes specific rather than noisy, and — critically — the *second* person who encounters a given scam recruiter/email/domain sees a fully-formed history before they've pasted anything, even though the *first* person's analysis was the only thing that created the record.

### 12.8 Future Enhancements — why they're additive, not architectural changes

| Enhancement | Why no backend redesign is needed |
|---|---|
| Browser extension lookups | Becomes a new client of `GET /knowledge-base/search` and `GET /knowledge-base/entities/:type/:id` — already public, already versioned under `/api/v1` |
| Mobile app lookups | Same two endpoints; no mobile-specific backend surface required |
| Public API | Slots into the API-key auth middleware already planned for original roadmap Phase 8 — KB routes gain the key check like any other route |
| Blockchain-based employer verification | Already surfaced today via `Company.verificationStatus`/`blockchainRecordHash` (original schema, §5) and the `IVerificationRegistry` seam (§1) — the KB only ever displays what `Company` reports, so this "just works" once §1's blockchain module ships |
| AI-generated scam trend reports | A scheduled job (n8n-triggered, per the existing automation seam) calls the same `IAIProvider` used for `aiSummary` with a trend-summary prompt over recently-recomputed `KnowledgeBaseEntry` rows, publishing to a small new `TrendReport` collection — additive, doesn't touch any entity schema |

### 12.9 API Design

All under the existing `/api/v1` prefix (§6).

```
GET    /api/v1/knowledge-base/search
        ?q=&type=company|recruiter|email|domain|phone&page=&limit=

GET    /api/v1/knowledge-base/entities/:entityType/:id
        # trustScore, verificationStatus, riskLevel, analysesCount, reportsCount,
        # confirmedScamCount, confirmedLegitCount, commonPatterns, lastActivityAt,
        # aiSummary, safetyRecommendations

GET    /api/v1/knowledge-base/entities/:entityType/:id/reports
        # paginated, sorted by usefulVotes desc by default

POST   /api/v1/knowledge-base/reports              # auth required
        # { targetType, targetId | (value + type for a not-yet-known identifier),
        #   verdict: 'scam'|'suspicious'|'legit', description, evidenceUrls? }

POST   /api/v1/knowledge-base/reports/:id/votes    # auth required — { value: 1 | -1 }

# Admin moderation
GET    /api/v1/admin/knowledge-base/reports?status=pending
PATCH  /api/v1/admin/knowledge-base/reports/:id     # { status: 'approved'|'rejected', moderationNote }
GET    /api/v1/admin/knowledge-base/merge-candidates
POST   /api/v1/admin/knowledge-base/entities/merge  # { entityType, sourceId, targetId }
PATCH  /api/v1/admin/knowledge-base/entities/:entityType/:id  # manual verificationStatus override
```
