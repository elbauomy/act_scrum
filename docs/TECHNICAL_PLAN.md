# Solo Scrum — Technical Plan

This is the technical reference for the whole project. The agreed product scope is in
[PRODUCT_PLAN.md](./PRODUCT_PLAN.md). Each phase updates this file when a design decision changes.

## 1. Guiding principles

- **Simple over clever.** One app, one database, one host. No microservices, no queues, no extra paid services.
- **One user (v1).** The Scrum Master is the only login. Squad members are records, not accounts.
- **Free hosting.** Vercel (Hobby) + Neon PostgreSQL (free plan) + GitHub. `netlify.toml` is kept as an alternative.
- **History instead of background jobs.** Every change that affects a report (status, estimate,
  sprint membership, release date) is written to a history table. Reports are calculated from this
  history when you open them, so no daily scheduled job is needed.

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | Server Components for pages, Server Actions for every create/update/delete |
| Styling | Tailwind CSS 4 | Small set of in-house UI components in `src/components/ui` |
| Database | PostgreSQL 16 (Neon in production) | |
| ORM / migrations | Prisma 6 | `prisma/schema.prisma`; migrations in `prisma/migrations` |
| Validation | Zod 4 | Every Server Action validates its input |
| Auth | Single password + signed session cookie (`jose`, HS256) | No user table |
| Charts (phase 6) | Recharts | |
| Excel (phase 6/7) | SheetJS (`xlsx`) | Export now, import in phase 7 |
| PDF export (phase 6) | Print-optimised report pages (browser "Save as PDF") | No server-side PDF engine |
| Tests | Vitest | For the scheduling and metrics logic |

**Next.js configuration choices**

- `cacheComponents` is **off**. Everything is read live from the database on each request
  (`export const dynamic = "force-dynamic"` in the root layout). For one user this is fast enough, and it avoids stale data.
- Route protection runs in `src/proxy.ts` (Next 16's name for middleware). Every Server Action also
  checks the session, because actions can be called directly over HTTP.

## 3. Folder structure

```
prisma/
  schema.prisma          database tables
  migrations/            versioned schema changes
  seed.ts                default settings row
src/
  proxy.ts               redirects to /login when not signed in
  app/
    login/               login page
    (app)/               all signed-in pages, sharing the sidebar layout
      page.tsx           home dashboard
      settings/          working days, hours, holidays, sprint-length defaults
      squads/            squads list + [id] edit page
      lobs/              lines of business
      members/           members, squad hours, leave
  components/ui/         buttons, inputs, tables, cards, form helpers
  lib/
    db.ts                Prisma client singleton
    auth.ts              session sign/verify, requireAuth()
    dates.ts             date-only helpers (UTC, "YYYY-MM-DD")
    capacity.ts          working-day + capacity calculations (pure, unit-tested)
    actions/             Server Actions grouped by area
```

## 4. Data model

Dates without a time (sprint dates, holidays, leave) are stored as PostgreSQL `date` and handled
in code as UTC midnight, so time zones never shift a day.

### Phase 1 (built)

| Table | Key fields | Rules |
|---|---|---|
| `Setting` (one row) | `workingDays` (0=Sun … 6=Sat), `defaultDailyHours`, `defaultSprintLengthDays` | Created by the seed or on first visit |
| `Holiday` | `date` (unique), `name` | Non-working day for everyone |
| `Squad` | `name` (unique), `description`, `sprintLengthDays?` | Delete blocked while it has LOBs or members |
| `LineOfBusiness` | `name` (unique), `description`, `squadId`, `sprintLengthDays?` | Owned by exactly one squad. Sprints and releases belong to it. Delete blocked while it has work (from phase 2). |
| `Member` | `name`, `role`, `active` | Name only, no login |
| `SquadMembership` | `memberId`, `squadId`, `weeklyHours` | A member can be in several squads, with hours per week in each |
| `Leave` | `memberId`, `startDate`, `endDate`, `note` | Full days off, inclusive |

**Effective sprint length** = LOB value → squad value → system default (first one set wins).

### Phase 2 — work items (built)

| Table | Key fields |
|---|---|
| `WorkItem` | `type` (EPIC, FEATURE, STORY, BUG, TASK), `title`, `description`, `lobId`, `parentId`, `status`, `priority` (HIGH/MEDIUM/LOW), `rank` (manual order), `assigneeId?` (tasks), `estimateHours?` (tasks), `blocked`, `blockedReason`, timestamps |
| `WorkItemHistory` | `workItemId`, `field` (status, estimate, sprint, assignee, blocked), `oldValue`, `newValue`, `changedAt` |

Hierarchy rules (`src/lib/work-items.ts`): Epic (top level) → Feature (parent Epic, required) →
Story/Bug (parent Feature, optional) → Task (parent Story or Bug, required). Every item belongs to one
LOB. Children take their LOB from the parent, and an item can only move to a parent in the same LOB.

IDs: each LOB has a short `key` (2–6 letters/digits, e.g. `RB`) and a `nextItemNumber` counter, so
items are numbered `RB-1`, `RB-2`, … for each LOB. Existing LOBs got a key generated from their name
by the phase 2 migration, and it can be edited.

Fields: title, description, acceptance criteria (stories/bugs), priority, rank, status, assignee and
estimate (tasks only), blocked flag + reason, `doneAt` (set on entering DONE). Bugs have no hours of
their own; like stories, their hours come from tasks.

Assignees must be members of the squad that owns the LOB. Deleting a member unassigns their tasks.
Deleting an item is blocked while it has children. Deleting a LOB is blocked while it has items,
and its squad cannot change once it has items.

History rows are written for: created, title, status, priority, assignee, estimate, blocked, parent.
Statuses: Story/Bug = NEW → APPROVED → COMMITTED → DONE; Task = NEW → IN_PROGRESS → DONE.
Story/bug hours = sum of their tasks. Epic/feature progress is calculated from their children.

### Phase 3 — sprints and releases

| Table | Key fields |
|---|---|
| `Sprint` | `lobId`, `name`, `goal`, `startDate`, `endDate`, `state` (PLANNED, ACTIVE, CLOSED), `releaseId?`. Stories/bugs get `sprintId?` and their tasks follow them. |
| `SprintMemberCapacity` | `sprintId`, `memberId`, `hours` (auto-filled, editable) |
| `SprintCommitment` | Snapshot taken at sprint start: `sprintId`, `workItemId`, `estimateHours` |
| `Release` | `lobId`, `name`, `version`, `targetDate`, `deployedDate?`, `state` |
| `ReleaseDateChange` | `releaseId`, `oldDate`, `newDate`, `reason`, `changedAt` |

Sprints of different LOBs may overlap. When a member's squad has overlapping sprints, their
available hours in that period are split evenly between those sprints by default. You can edit the
split, and you get a warning if the total goes over what the member has available.

### Phase 4 — timeline

| Table | Key fields |
|---|---|
| `TaskSchedule` | `taskId`, `plannedStart`, `plannedEnd`, `baselineStart?`, `baselineEnd?` |

### Phase 5 — daily standup

| Table | Key fields |
|---|---|
| `StandupEntry` | `date`, `squadId`, `memberId`, `yesterday`, `today`, `blockers` (unique per date+squad+member) |

## 5. Capacity and scheduling algorithm

**Daily hours of a member in a squad**

```
isWorkingDay(d) = weekday(d) ∈ settings.workingDays AND d ∉ holidays
dailyHours(member, squad, d) =
    0                                                 if !isWorkingDay(d) or member on leave on d
    membership.weeklyHours / count(settings.workingDays)   otherwise
```

**Timeline (phase 4).** For each member, take their open tasks in active and planned sprints, ordered by
sprint start → story rank → task rank. Fill each day's available hours from the earliest allowed
date (today or sprint start, whichever is later). A task's planned end is the day its estimate runs
out. Only availability matters; there are no task dependencies.

- If a task ends after its sprint's end, it is marked **slipped**.
- If the hours a member has in a sprint are more than their sprint capacity, they are marked **overloaded**.
- Nothing moves on its own. You choose: reassign, move to another sprint, re-estimate, or accept the new dates as the baseline.

## 6. Metric definitions (phase 6)

Hours "burn" only when a task becomes **Done**.

| Metric | Formula |
|---|---|
| Capacity | Σ sprint member capacity hours |
| Load | assigned open+done task hours ÷ capacity (per member and per squad) |
| Velocity | Σ estimate of tasks Done inside the sprint; plus average of the last 3 sprints |
| Commitment reliability | Done committed hours ÷ committed hours at sprint start |
| Scope change | (hours added + hours removed after start) ÷ committed hours |
| Carry-over | committed stories/bugs not Done at sprint end ÷ committed stories/bugs |
| Bug ratio | bug task hours ÷ total task hours |
| Cycle time | Story/Bug COMMITTED→DONE days; Task IN_PROGRESS→DONE days (from history) |
| Productivity (member) | Done hours ÷ member capacity in the period |
| Release forecast | remaining release hours ÷ average velocity → number of sprints → forecast date vs. target |
| Burndown | for each day: Σ estimates of sprint tasks not Done at end of that day (rebuilt from history), with an ideal line from committed hours down to 0 |

**Sprint Health Score (0–100)**: 30% burndown on track + 25% commitment reliability so far + 15%
scope stability + 15% load balance + 15% blocked/overdue items. Green ≥ 80, Amber 60–79, Red < 60.

## 7. Security

- `APP_PASSWORD` (the login password) and `SESSION_SECRET` (signs the session cookie) live only in
  Netlify environment variables, never in the code.
- Session cookie: `httpOnly`, `secure`, `sameSite=lax`, lasts 30 days.
- `proxy.ts` sends anyone not signed in to `/login`. Every Server Action calls `requireAuth()`.
- All database access goes through Prisma (no hand-built SQL), and all input is validated with Zod.

## 8. Environments and deployment

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Netlify + local `.env` | Neon **pooled** connection string (used by the app) |
| `DIRECT_URL` | Netlify + local `.env` | Neon **direct** connection string (used for migrations) |
| `APP_PASSWORD` | Netlify + local `.env` | Login password |
| `SESSION_SECRET` | Netlify + local `.env` | Random string of 32+ characters |

**Netlify build** (`netlify.toml`): `prisma migrate deploy` then `next build`. Database changes are
applied automatically on each deploy. Netlify detects Next.js and adds its Next.js runtime itself.
The Prisma engine is built for Netlify's Linux (`rhel-openssl-3.0.x`).

**Branches**: work happens on a feature branch, and `main` is what Netlify publishes. Every pull request
gets a Netlify preview link so you can test before merging.

**Backups**: Neon free has short restore history, so phase 6 adds a "Download full backup" Excel export.

## 9. Local development

```bash
cp .env.example .env      # fill in values
npm install
npx prisma migrate dev    # create tables
npm run dev               # http://localhost:3000
npm test                  # unit tests
```
