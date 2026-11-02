# ACT Scrum

A web tool for the ACT Scrum Master to manage squads, lines of business, members, sprints,
releases, the timeline and Scrum reports, following ACT's own process.

- Product scope: [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)
- Technical plan: [docs/TECHNICAL_PLAN.md](docs/TECHNICAL_PLAN.md)

## Status

| Phase | Status |
|---|---|
| 1. Foundation: login, settings, holidays, squads, LOBs, members, squad hours, leave | ✅ Done |
| 2. Work items | Planned |
| 3. Sprints & releases | Planned |
| 4. Timeline | Planned |
| 5. Daily standup | Planned |
| 6. Reports & health dashboard | Planned |
| 7. Excel import | Planned (waiting for sample sheet) |

## Deploying for free (Neon + Render)

The app runs on **Render** (free web service). The database is on **Neon** (free plan).
Netlify was tried first, but `*.netlify.app` sites can't be reached from the owner's internet providers.

### 1. Database on Neon

1. Sign in at <https://console.neon.tech> and open the `act-scrum` project (region: London).
2. Click **Connect**. Neon shows two connection strings:
   - The one whose host contains `-pooler` (Neon may call it `DATABASE_URL_POOLED`). This is our **`DATABASE_URL`**.
   - The one **without** `-pooler` (Neon may call it `DATABASE_URL`). This is our **`DIRECT_URL`**.
3. Remove `&channel_binding=require` from the end of both, so each one ends with `?sslmode=require`.

### 2. Web service on Render

1. Sign in at <https://dashboard.render.com> with GitHub.
2. Click **New → Blueprint**, choose the `act_scrum` repository, and click **Connect**.
   Render reads `render.yaml` and creates a free web service called `act-scrum` in Frankfurt.
3. Render asks for the secret values:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon string **with** `-pooler` |
| `DIRECT_URL` | Neon string **without** `-pooler` |
| `APP_PASSWORD` | The password you will use to sign in |

   `SESSION_SECRET` is generated automatically.

4. Click **Apply**. The first build takes a few minutes. It also creates or updates the database tables.
5. Open the address Render shows (`https://act-scrum-xxxx.onrender.com`) and sign in.

Every push to `main` redeploys automatically. To change the password, edit `APP_PASSWORD` under the
service's **Environment** tab. Render redeploys after you save.

**Free-plan behaviour:** after 15 minutes without visits the service goes to sleep. The next visit
wakes it, which takes up to about a minute. After that it's fast again.

## Running locally (developers)

```bash
cp .env.example .env      # fill in the values
npm install
npx prisma migrate dev    # create / update tables
npm run dev               # http://localhost:3000
npm test                  # unit tests
```
