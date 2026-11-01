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

## Deploying for free (Neon + Netlify)

### 1. Create the database on Neon

1. Sign in at <https://console.neon.tech> and click **New project**.
2. Name it `act-scrum`, pick a region, and click **Create**.
3. On the project dashboard, click **Connect**. You need two connection strings:
   - With **Connection pooling ON**, copy the string. This is your `DATABASE_URL`.
   - With **Connection pooling OFF**, copy the string. This is your `DIRECT_URL`.

### 2. Create the site on Netlify

1. Sign in at <https://app.netlify.com> → **Add new project** → **Import an existing project** → **GitHub**.
2. Choose the `act_scrum` repository and the branch to publish (normally `main`).
3. Before deploying, open **Environment variables** and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `APP_PASSWORD` | The password you will use to sign in |
| `SESSION_SECRET` | Any random text of at least 32 characters |

4. Click **Deploy**. The build creates the database tables automatically.
5. Open the site address Netlify gives you and sign in with your `APP_PASSWORD`.

To change the password later, edit `APP_PASSWORD` in Netlify and redeploy.

## Running locally (developers)

```bash
cp .env.example .env      # fill in the values
npm install
npx prisma migrate dev    # create / update tables
npm run dev               # http://localhost:3000
npm test                  # unit tests
```
