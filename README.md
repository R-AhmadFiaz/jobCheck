# JobCheck

AI-powered job-ad scam verification platform. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design — that document is the source of truth for all architecture decisions.

## Structure

- `frontend/` — React + Vite + TypeScript + Tailwind SPA
- `backend/` — Node + Express + TypeScript API
- `docs/` — architecture and design documentation

Each app is independently installed and run.

## Backend

```
cd backend
npm install
npm run dev
```

Copy `backend/.env.example` to `backend/.env` and fill in real values before running.

## Frontend

```
cd frontend
npm install
npm run dev
```
