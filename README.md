# Deligo Admin Portal

Operations console for Deligo News — user + role management, article oversight, comment moderation, analytics, and platform settings. Built with Next.js 16 (App Router, Turbopack), React 19, TailwindCSS v4, TanStack Query, Firebase Auth, and Cloudinary unsigned uploads.

Roles allowed in: **admin** only. Editors, journalists, and readers hit `/access-denied`.

## Local development

```bash
nvm use            # picks up .nvmrc (Node 20)
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev        # http://localhost:3000
```

Required environment variables — see `.env.local.example` for the full template:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL (e.g. `http://localhost:5001` locally, the Render URL in prod) |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Firebase Web SDK config — same project as `frontend/` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for browser uploads |
| `NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET` | Cloudinary unsigned upload preset (must allow browser uploads) |
| `NEXT_PUBLIC_JOURNALIST_GUIDELINES_URL` | URL the approve-role modal links to in the email body |

All are `NEXT_PUBLIC_` because the admin SPA runs in the browser and needs them at runtime.

Seed an admin user once via the backend's `scripts/seed-admin.ts`:
```
admin.test@deligo.dev / AdminTest!2026
```

## Production checks

```bash
npx tsc --noEmit   # type check
npm run lint       # ESLint (React 19 lint rules applied)
npm run build      # full production build
```

All three must pass before deploying.

---

## Deploying to Vercel from GitHub

This project lives in a monorepo (`admin_frontend/` is one of several Next.js apps). Vercel needs to know to build from this subdirectory.

### 1. Push the monorepo to GitHub

The whole `News-Portal-Project` repo can ship to one GitHub remote; you'll create separate Vercel projects for each app (admin, public site, editor portal, …) and point each at its subdirectory.

```bash
# from repo root
git push origin master   # or your default branch
```

`.gitignore` already ignores `.env.local`, `.next/`, `.vercel/`, and `node_modules/` — no secrets leak.

### 2. Create the Vercel project

In the [Vercel dashboard](https://vercel.com/new):

1. **Import** your GitHub repo.
2. **Root Directory** → click "Edit" and set to `admin_frontend`. **Critical** — without this Vercel tries to build the monorepo root.
3. **Framework Preset** → Next.js (auto-detected).
4. **Build Command** → `npm run build` (default).
5. **Output Directory** → `.next` (default).
6. **Install Command** → `npm install` (default).
7. **Node.js Version** → 20.x (picks up `engines.node` + `.nvmrc`).

### 3. Add environment variables

Project Settings → **Environment Variables**. Copy every var from `.env.local.example` and set its value for **Production**, **Preview**, and (optionally) **Development**:

```
NEXT_PUBLIC_API_BASE_URL             https://news-portal-backend-kxsj.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY         <from Firebase console>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN     news-portal-firebase-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID      news-portal-firebase-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET  news-portal-firebase-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  85289317344
NEXT_PUBLIC_FIREBASE_APP_ID          1:85289317344:web:d9c8ded103af2eca3e7185
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    dwlrij3xo
NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET  news-portal-deligo
NEXT_PUBLIC_JOURNALIST_GUIDELINES_URL   https://<your-public-site>/journalist-guidelines
```

### 4. Add the Vercel domain to backend CORS

The backend rejects cross-origin requests from unknown domains. On Render → backend service → Environment, append your Vercel deployment URLs to `CORS_ORIGINS`:

```
CORS_ORIGINS=https://deligo.news,https://<your-admin-app>.vercel.app
```

Include both:
- The production domain (`<your-admin-app>.vercel.app` or your custom domain)
- Optionally the auto-generated preview URLs (use a wildcard if your CORS middleware supports it, otherwise add specific preview hostnames as needed)

Redeploy the backend so the new origins take effect.

### 5. Add the Vercel domain to Firebase Auth

Firebase Console → Authentication → Settings → **Authorized domains** → add:

```
<your-admin-app>.vercel.app
```

Otherwise sign-in will fail with `auth/unauthorized-domain`.

### 6. Deploy

Click **Deploy**. Vercel will run `npm install` + `npm run build`, then ship. Subsequent pushes to your default branch auto-deploy; PR branches get preview URLs.

### 7. Post-deploy smoke check

1. Visit `https://<your-admin-app>.vercel.app/login`.
2. Sign in with the seeded admin user.
3. Verify `/` (Overview), `/people/users`, `/people/role-requests`, `/content/articles`, `/content/articles/queue` all load.
4. Click into `/content/articles/[id]/edit` and confirm Cloudinary images render (proves `NEXT_PUBLIC_CLOUDINARY_*` + `images.remotePatterns` are wired).
5. Try a role-request approve — confirms backend reachability + email send.

---

## Architecture notes

- **Auth flow**: `AdminAuthProvider` → Firebase ID token → backend `/auth/sync` → role check via `useRequireAdmin`. Non-admin users hit `/access-denied`.
- **State**: TanStack Query 5 for server state; React state for UI. Most mutations use `setQueryData` for optimistic updates + `invalidateQueries` on settle.
- **Article editing**: copies the journalist TipTap `<ArticleForm>` shape but stripped to edit-only (no Submit-for-review). Autosaves to `localStorage` keyed `admin-article-draft:${id}`.
- **Media**: browser-side unsigned upload to Cloudinary, then `POST /api/v1/media` to register with the backend's media library. Admin role can register media (`requireRole('journalist','editor','admin')`).
- **Security headers**: applied in `next.config.ts` — `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` opt-out of camera/mic/geo/FLoC.

See `admin_portal_plan.md` at the repo root for the full phase-by-phase plan and current status of each surface.
