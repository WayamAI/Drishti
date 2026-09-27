# Drishti — by Wayam AI

A healthcare PHI governance console: where patient data lives, how it moves
between systems, who can reach it, which vendors touch it, what is being
detected against it, and what has to be fixed first — in one place.

This is the frontend. Every screen reads the Drishti backend API over HTTP;
nothing is driven by fixture data. See [Data sources](#data-sources).

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) on the Chronos design tokens (see [Design system](#design-system))
- [React Router](https://reactrouter.com/) for routing and route protection
- [TanStack Query](https://tanstack.com/query) for all backend reads, behind the shared `useApiQuery` hook
- [Sonner](https://sonner.emilkowal.ski/) for toasts, [Lucide](https://lucide.dev/) for interface icons
- [Vitest](https://vitest.dev/) + Testing Library for tests

## Running locally

```bash
npm install
cp .env.example .env.local   # then point VITE_API_BASE_URL at the backend
npm run dev
```

`VITE_API_BASE_URL` **is required**. There is no mock fallback on the
API-backed pages: with it unset, `getApiBaseUrl()` in
`src/lib/apiClient.ts` throws and those pages render their error state.
The backend listens on **port 4000**, which is what `.env.example` ships.

The dev server is pinned to port 8080 in `vite.config.ts`, and Vite falls
back to the next free port if 8080 is already taken — check the URL it
prints.

> **Note:** use `npm`. The repo carries only `package-lock.json`; bun is not
> supported (it also fails on checkout paths containing a space).

Other scripts: `npm run build`, `npm run lint`, `npm run test`, `npm run preview`.

## Deploying

Hosted on **Vercel** (static build) against the API on **Render** and Postgres
on **Supabase** — all three on free tiers. `vercel.json` holds the whole
frontend side of that; the backend's `DEPLOYMENT.md` holds the rest.

`VITE_API_BASE_URL` is a **build-time** variable. Vite inlines
`import.meta.env` into the bundle, so it must be set as a Vercel *project
environment variable* (Production and Preview both) and a change to it needs a
redeploy — setting it at runtime does nothing. This is a property of Vite, not
a choice made here.

```bash
vercel link
vercel env add VITE_API_BASE_URL production   # https://<service>.onrender.com
vercel env add VITE_API_BASE_URL preview
vercel --prod
```

Three things `vercel.json` is doing that are easy to undo by accident:

- **`installCommand` is pinned to `npm ci`**, so the install always uses
  `package-lock.json` exactly.
- **The catch-all rewrite to `/index.html`** is the SPA fallback, replacing
  what `nginx.conf` does in the Docker image. It is safe for assets because
  Vercel matches the filesystem *before* applying rewrites.
- **The cache header targets `/static/`, not `/assets/`.** `vite.config.ts`
  sets `assetsDir: "static"` deliberately, because the app has a route at
  `/assets` that Vite's default output directory would shadow. Don't "fix"
  either one.

The security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`) are
ported from `nginx.conf` so the Vercel deploy and the container image behave
the same way.

**CORS:** the API allowlists exact origins from `FRONTEND_ORIGIN` and never a
wildcard, so the Render service needs the Vercel production origin set on it
(scheme + host, no trailing slash) before login will work. Preview deployments
get a hashed hostname and will *not* match unless listed by hand.

**First load may be slow.** The Render free tier suspends the API after ~15
minutes of no traffic, and the next request waits 30-60s for it to wake.

## Data sources

Every screen is backed by a live endpoint, read through `useApiQuery`
(`src/hooks/useApiQuery.ts`), which adds polling, a tighter retry cadence while
the backend is down, and an `isReconnecting` state so a view keeps its last
good data behind a notice instead of blanking out.

| Screen | Source |
| --- | --- |
| Dashboard | `/api/assets`, `/api/risks`, `/api/dataflows`, `/api/vendors`, `/api/access/summary`, `/api/threats/summary` |
| Threats | `/api/threats` (+ `/summary`, `/:id/status`) |
| Access & Identity | `/api/access` (+ `/summary`, `/:id/revoke`, `/:id/review`) |
| PHI Flow | `/api/dataflows` |
| Assets | `/api/assets` (+ `/:id` detail graph) |
| Vendors | `/api/vendors` |
| Risk Register | `/api/risks` (+ `/:assetId/recompute`) |
| Remediation | `/api/remediations` (+ `/summary`, `/:id/status`, `/:id/assign`) |
| Controls, Policies | `/api/controls`, `/api/policies` |
| Audit Trail (admin) | `/api/audit` |
| Data Import (admin) | `/api/import` (contract, template, validate, commit) |
| Identities & Members, Settings | `/api/identities`, `/api/organization` |
| Global search (⌘K / Ctrl K) | `/api/search` |

### Deep links

List pages seed their search and filters from the URL
(`src/hooks/useListControls.ts`), so any view can be linked to directly —
`/threats?severity=CRITICAL`, `/access?flaggedOnly=true`,
`/assets?search=Billing`, `/risks?open=102`. The dashboard's Action Centre,
the risk matrix and global search all use this, so a finding always lands on
the records behind it rather than on an unfiltered list.

## Signing in

`src/hooks/use-auth.tsx` authenticates against `POST /api/auth/login`.
Credentials are real — the backend decides who gets in.

The access token (JWT, 1 hour) is held **in memory only** and never written
to `localStorage` or `sessionStorage`. The refresh token lives in the httpOnly
`drishti_refresh` cookie, which script cannot read; on load the app calls
`POST /api/auth/refresh` and the browser presents the cookie, so a reload
keeps you signed in without any credential being reachable from JavaScript.
A refresh that fails for a transient reason (rate limit, network) is retried
with backoff rather than ending the session — only an answer from the server
ends it.

Logging out clears the token first and then calls `/api/auth/logout`, so the
session ends locally even if the API is unreachable.

## Design system

Drishti shares the **Chronos** design system with its sibling Wayam AI
console, so the two read as one product family.

- **Tokens** — `src/styles/tokens.css`. Two tiers: a reference palette
  (`--ref-*`, identical to Chronos) and semantic tokens (`--sem-*`) that
  components consume through Tailwind utilities in `tailwind.config.ts`.
  Components never reference a raw palette value.
- **Surfaces** — a light grey page, white containers, translucent hairline
  strokes, no shadows on panels. Dark mode is a toggle, not the default.
- **Type** — Michroma for display and figures, Geist for everything else.
- **Controls** — pills: buttons, inputs, selects and filter chips are
  `rounded-full`. The primary action is black in light mode and white in dark;
  Wayam orange is identity only (logo and the domain marks), never a control.
- **Status** — solid pill badges for the one status a row is about; soft
  tinted tags for attributes and multi-tag cells.
- **Risk bands** — five bands, five fills (`--sem-band-*`), the same colour in
  every badge, matrix chip and distribution bar.
- **Domain marks** — the twelve Drishti icons in
  `src/components/DomainIcon.tsx`, traced from `design/icons-source/`. They
  appear in the sidebar, on every KPI tile and in page headers.
- **Formatting** — numbers and dates always format in `en-US`
  (`src/lib/format.ts`), so a figure reads the same for every viewer.

## Project structure

```
src/
  pages/         One file per route
  components/    Layout (sidebar, top bar, command palette), DataTable,
                 PhiSankey, RiskMatrix, DomainIcon, ui-bits (atoms: Card,
                 Btn, Badge, Input, Modal, SlideOver), ui-patterns (page
                 header, KPI tile, filters, risk vocabulary), components/ui/*
                 (shadcn primitives)
  hooks/         use-auth (session), useApiQuery (shared query behaviour),
                 useListControls (paging, search, URL-seeded filters) and the
                 per-endpoint hooks built on them
  lib/           apiClient, apiTypes (wire shapes), mappers, tone, format,
                 icons, dates
  styles/        tokens.css — the design tokens
  test/          Vitest suites; live-backend.test.tsx needs a running API
```

## Testing

```bash
npx vitest run --exclude "**/live-backend.test.tsx"   # what CI runs
npx vitest run src/test/live-backend.test.tsx          # needs a live backend
```

`live-backend.test.tsx` **skips itself when the API is unreachable** rather
than failing, so it reports green on a frontend-only machine without having
asserted anything. Check its output for `[skip]` lines before treating it
as coverage. CI excludes it outright.

## Known limitations

- **Notifications have no backend.** The bell opens a panel that says so
  rather than showing an invented feed; the event-stream contract is in
  `FRONTEND_API_CONTRACT.md`.
- **Demo accounts are named by the backend seed.** The sign-in addresses in
  `USER_WORKFLOW.md` are whatever the backend seeds; rename them there.
- **Lint carries ~15 warnings**, all `react-refresh/only-export-components`
  in files that export constants beside components. No errors.
