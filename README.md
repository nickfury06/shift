# Shift

Le compagnon quotidien des bars et restaurants : communication équipe, réservations, tâches par service, stocks, debriefs de fin de shift.

Built on Next.js (App Router), Supabase (Postgres + Auth + Realtime), and a monochromatic terracotta design system.

## Quick start

```bash
npm install
npm run dev           # http://localhost:3000
```

Requires a `.env.local` with Supabase credentials (see `.env.example` if present).

## Stack

- **Next.js 16** (App Router, Turbopack). Note: breaking changes vs training data — check `node_modules/next/dist/docs/` before relying on old APIs.
- **Supabase** Postgres with Row Level Security on every table. Auth, realtime subscriptions, and PostgREST.
- **TypeScript** end-to-end.
- **Tailwind + shadcn tokens** for the design system, with CSS variables for theming (light/dark).
- **PWA**: installable via `manifest.json`, offline app-shell via `public/sw.js`, haptics via Vibration API.

## Project layout

```
src/
├── app/
│   ├── (app)/            # Authenticated routes, bottom nav, role-gated
│   ├── (auth)/           # /login, /change-password
│   ├── (onboarding)/     # /onboarding for new non-patron hires
│   ├── error.tsx         # Global error boundary
│   ├── not-found.tsx     # 404
│   ├── layout.tsx        # Root layout, metadata, SW registration
│   └── page.tsx          # Auth gate → /login or /accueil
├── components/
│   ├── AuthProvider      # Supabase auth + profile context
│   ├── OnboardingGuard   # Blocks (app) routes until docs signed (non-patron)
│   ├── Nav               # Role-based bottom nav + "More" menu
│   ├── Toast             # useToast() — success/error/warning/info
│   ├── Confirm           # useConfirm() — replaces browser confirm()
│   ├── FloorPlan         # Interactive marker-based floor plan
│   ├── EmptyState        # Shared empty-state primitive
│   └── ServiceWorkerRegister
├── lib/
│   ├── supabase/         # Server + client Supabase clients
│   ├── types.ts          # Shared DB types
│   ├── shift-utils.ts    # Shift-day math (service runs past midnight)
│   ├── constants.ts      # Role labels, zone labels, moment order
│   ├── haptics.ts        # haptic(kind) — vibration wrapper
│   └── utils.ts          # cn() et al.
└── app/globals.css       # Design tokens (terracotta scale, shadows, animations)
```

## Roles & permissions

- **Patron** — full access. Admin hub (absence approvals, team message composer, debriefs, quick links).
- **Responsable** — shift manager. Full Stocks (signal + inventaire + commande) with France Boissons deadline auto-routing. Can approve F&F.
- **Staff (permanent)** — Accueil, Planning, Résas, Debrief. Stocks read-only in More menu.
- **Staff (extra)** — simplified nav: Accueil, Résas, Debrief. OnboardingGuard funnels to `/onboarding` until docs are signed.

All four share: Messages équipe (two-way), Guide du lieu (venue info, WiFi, floor plan), Profile.

Guards are layered: `AuthProvider` provides session, `OnboardingGuard` blocks `(app)` for non-patron users whose `profile.onboarding_completed === false`, individual pages that are patron/responsable-only render an "Accès réservé" card.

## Design system

All tokens live in `src/app/globals.css`:

- Terracotta color scale (`--terra-lightest` → `--terra-darkest`) + light/dark `--bg`, `--text-*`, `--card-bg`, `--secondary-bg`.
- Three card depths: `.card-light` / `.card-medium` / `.card-heavy` (shadow tokens vary light/dark).
- Utility classes: `.section-label` (11px uppercase), `.pill` / `.pill-count`, `.zone-badge`, `.text-gradient`.
- Animations: `fadeIn`, `fadeInUp`, `scaleIn`, `pulse`, staggered `.stagger > *` (respects `prefers-reduced-motion`).

Haptics are wired on every critical action (task toggle, resa arrival, stock signal, F&F decision, absence decision, publish message, destructive confirms). Patterns in `src/lib/haptics.ts`.

## Supabase

- **Migrations** live in `supabase/migrations/`. `supabase/schema.sql` is the consolidated source-of-truth (RLS enabled on all 20 tables, 60+ policies).
- **Realtime** is wired on: reservations, availability_requests, stock_alerts/products/orders, debriefs, messages.
- **Settings table** is a generic key/value store — used for F&F rules, shift hours, and patron-editable venue info (wifi, storage map, emergency contacts).

## Service worker

`public/sw.js` pre-caches the app shell (`/` + `/accueil`), uses network-first for pages/assets, skips Supabase API calls entirely (always network). Registered in production only via `components/ServiceWorkerRegister.tsx`.

Push notifications are wired in the SW but require a VAPID key + `push_subscriptions` insert from the client; see `migrations/010_push_subscriptions.sql`.

## Scripts

```bash
npm run dev       # Next dev with Turbopack
npm run build     # Production build (checks types + lint)
npm run start     # Serve production build
npx tsc --noEmit  # Type-check without emitting
```

## Known rough edges

- **Analytics page** is patron-only but low-signal — could be a card on `/admin` instead.
- **Events page** vs rituals on Accueil — some redundancy worth consolidating.
- **Lint**: a few pre-existing `react-hooks/refs` and `set-state-in-effect` warnings throughout follow codebase conventions; safe to ignore until a targeted pass.

## Deployment

Vercel is recommended. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in env. Push `shift-v2` (or main) and the build is static — no server runtime required beyond Supabase.
