# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server
bun build        # Production build
bun lint         # ESLint
bun test         # Run tests once (vitest)
bun test:watch   # Run tests in watch mode
```

## Architecture

**PowderPlan** is a ski trip planning app. Users create a trip, invite guests (who fill in their own preferences via a share link), and receive AI-generated resort recommendations.

### Routing (`src/App.tsx`)
| Route | Page | Purpose |
|---|---|---|
| `/` | `Index` | Multi-step trip planning wizard |
| `/auth` | `Auth` | Supabase auth (sign in / sign up) |
| `/invite/:tripId` | `GuestInvite` | Invited guests enter their preferences |
| `/results/:tripId` | `Results` | View AI-generated resort recommendations |
| `/share/:tripId` | `ShareResults` | Public shareable results view |

### Step wizard (`src/components/steps/`)
The main flow on `/` walks through: **Basics → Budget → Invites → Skills → Review**, then calls the AI to generate recommendations.

### Backend (Supabase)
All data lives in Supabase. Key tables:
- `trips` — trip metadata (dates, group size, vibe, pass types, geography, skill range)
- `guests` — per-guest preferences (airport, budget, skill level)
- `recommendations` — AI results stored as JSON blob (`results` column)
- `flight_cache` — cached flight price lookups

Three public Postgres functions bypass RLS for the share/invite flows: `get_public_trip`, `get_public_guests`, `get_public_recommendations`.

The typed Supabase client is at `src/integrations/supabase/client.ts`. The full DB type is in `src/integrations/supabase/types.ts` (auto-generated — don't edit manually).

### Auth (`src/hooks/useAuth.tsx`)
`AuthProvider` wraps the app and exposes `useAuth()` which returns `{ user, session, loading, signOut }`.

### UI
- Components from **shadcn/ui** live in `src/components/ui/` (generated — prefer editing sparingly)
- Path alias `@/` maps to `src/`
- Tailwind CSS with custom `glass` / `glass-strong` utility classes and `gradient-text`
- **framer-motion** for animations, **lucide-react** for icons

### Environment variables
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```
