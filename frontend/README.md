# Twin Agent Platform (Frontend)

Enterprise AI Operating System frontend scaffold.

## Stack
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Radix + TanStack Query +
Zustand + React Hook Form + Zod + React Flow + Apache ECharts.

## Getting Started
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Mock Mode
Set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local` to run entirely against the mock
data layer in `lib/mock/`, with zero backend required. Flip to `false` once the
FastAPI backend at `NEXT_PUBLIC_API_URL` is available — no component changes needed,
because all data access goes through `services/`.

## Structure
See project tree in this README's sibling `ARCHITECTURE.md` (or the folder tree
itself) for the full layout: `app/`, `components/`, `features/`, `hooks/`,
`services/`, `stores/`, `types/`, `lib/`.

## Phases
This scaffold implements Phase 1 (foundation: shell, routing, theming, state,
mock architecture) with stub pages for every route in the spec so the IA is
complete end-to-end. Each stub is intentionally minimal — wire in real
components/queries feature by feature.
