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

## Deploy

**Supabase project ref:** `exqitxkenafhllrgxhoj`

```bash
# Deploy an edge function
npx supabase@2.76.15 functions deploy <function-name> --project-ref exqitxkenafhllrgxhoj

# Push DB migrations  (NOTE: use --linked, NOT --project-ref — db push doesn't support that flag)
npx supabase@2.76.15 db push --linked --yes
```

Edge functions live in `supabase/functions/<name>/index.ts` (Deno runtime).
Migrations live in `supabase/migrations/`. Use timestamp prefix `YYYYMMDDHHMMSS_description.sql`.

## Data format conventions

**Vibe preferences** — stored in `trips.vibe` as a comma-separated key:value string:
```
energy:50,budget:25,skill:75,ski-in-out:false
```
Values are one of [0, 25, 50, 75, 100]. Parsed in edge function with `split(',')` then `split(':')`.

**Airport codes** — stored in `guests.airport_code` as comma-separated IATA codes (1–3):
```
SFO,OAK,SJC
```
DB trigger validates format `^[A-Z]{3,4}(,[A-Z]{3,4}){0,2}$`. Display by splitting on `,` and joining with ` · `.

**AI model:** Gemini 2.5 Flash via `generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }`

**vibeAlignment** — JSON field in AI response, per-dimension preference fit score:
```json
{ "energy": { "score": 85, "label": "string" }, "budget": { ... }, "skill": { ... } }
```
