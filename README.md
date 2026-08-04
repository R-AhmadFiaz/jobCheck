# JobCheck

AI-powered job-ad scam verification platform. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/AI_RISK_INTELLIGENCE.md](docs/AI_RISK_INTELLIGENCE.md) for background design documentation (predates the Next.js migration below; some details there are historical).

## Structure

A single Next.js 16 full-stack app (App Router) — frontend, API routes, and business logic all live in this one project. There is no separate backend/frontend split anymore; the original Express + React/Vite implementation is preserved on the `main` branch for reference.

- `src/app/` — pages and API route handlers (`src/app/api/v1/**`)
- `src/modules/`, `src/lib/`, `src/shared/`, `src/config/`, `src/db/` — business logic, server utilities, database layer, seed scripts
- `src/features/`, `src/components/`, `src/hooks/`, `src/layouts/` — frontend UI
- `tests/` — test suite (`node:test`, run via `tsx`)
- `docs/` — architecture and design documentation

## Getting started

```
npm install
cp .env.example .env.local   # fill in real values — MongoDB URI, JWT secret, Groq API key, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```
npm run dev          # start the dev server
npm run build         # production build
npm start             # run the production build
npm test              # run the test suite
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run seed:rules            # seed scam-detection rules into MongoDB
npm run seed:knowledge-base   # seed knowledge-base entries into MongoDB
```
