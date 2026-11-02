# Solo Scrum — Product Plan (agreed scope)

A web tool for the ACT Scrum Master to manage squads, lines of business, work items, sprints,
releases, the timeline and reports, following ACT's own process rather than standard Scrum.

## Decisions

| Topic | Decision |
|---|---|
| Users (v1) | Only the Scrum Master logs in. Members are names only. |
| Structure | Squad → Line of Business (LOB) → Epic → Feature → User Story / Bug → Task. A LOB is the "project" and belongs to one squad. Squads and LOBs can be added, edited and deleted at any time. |
| Statuses | Story/Bug: New → Approved → Committed → Done. Task: New → In Progress → Done. Plus a separate Blocked flag with a reason. |
| Estimation | Hours only, on tasks |
| Burndown | A task's hours burn when it is marked Done |
| Sprints | Belong to a LOB. Length can differ per squad and per LOB. Sprints may overlap. |
| Releases | Belong to a LOB, contain several sprints, have a deployment date that can change, and every date change is logged |
| Members | Can be in several squads, with hours per week in each. Leave reduces capacity. |
| Working calendar | Working days, hours per day and holidays are all set in Settings |
| Timeline | Built automatically from assignee availability only (no dependencies). Slips are shown, and nothing changes until the Scrum Master acts. |
| Priority | High / Medium / Low + drag-to-rank |
| Item IDs | Per-LOB code + number, e.g. RB-12 |
| Look | Orange theme; show/hide password on login |
| Daily standup | Yesterday / Today / Blockers per member, filterable by squad, date and member |
| Filters | On home dashboard, backlog, sprint board, timeline, reports and standup |
| Export | Excel + PDF for every report, Excel for lists, full backup |
| Language | English only |
| Hosting | 100% free: Vercel (Hobby) + Neon + GitHub. `*.netlify.app` is blocked on the owner's networks. |
| Import | Excel import postponed until a sample sheet is shared |

## Phases (all built)

1. **Foundation**: login, settings, holidays, squads, LOBs, members (squad hours, leave)
2. **Work items**: hierarchy, statuses, estimates, assignment, priority/rank, blocked, history, backlog + filters
3. **Sprints & releases**: per-LOB sprints, shared capacity for overlapping sprints, planning, board, commitment snapshot, carry-over, release date log and forecast
4. **Timeline**: automatic scheduling from availability, slip and overload warnings, Scrum Master actions (reassign, re-estimate, next sprint, accept baseline)
5. **Daily standup** with suggestions, history and filters
6. **Reports & dashboard**: sprint health, velocity, burndown, capacity/load, productivity, commitment/scope/carry-over/bugs, cycle time, release forecast; filters; Excel + PDF export; full backup
7. **Excel import** of work items using the app's template (change the template once real sheets are shared)

Metric formulas are in [TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md#6-metric-definitions).
