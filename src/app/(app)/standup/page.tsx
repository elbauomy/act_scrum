import Link from "next/link";
import { db } from "@/lib/db";
import { getWorkCalendar } from "@/lib/settings";
import { isWorkingDay } from "@/lib/capacity";
import { addDays, formatDate, todayUTC, toISODate, WEEKDAYS } from "@/lib/dates";
import { applyCls, dateParam, selectCls, toQuery } from "@/lib/filters";
import { saveStandup } from "@/lib/actions/standup";
import { itemKey } from "@/lib/work-items";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Card, Empty, Field, PageHeader, Table, Td, Textarea, Th } from "@/components/ui";

type Q = { squad?: string; date?: string; member?: string; from?: string; to?: string; hsquad?: string; hmember?: string };

export default async function StandupPage({ searchParams }: PageProps<"/standup">) {
  const f = (await searchParams) as Q;
  const [squads, cal] = await Promise.all([db.squad.findMany({ orderBy: { name: "asc" } }), getWorkCalendar()]);
  const squadId = f.squad || squads[0]?.id || "";
  const squad = squads.find((s) => s.id === squadId);
  const date = dateParam(f.date) ?? todayUTC();

  // Previous working day (suggestions look at what was finished since then).
  let prev = addDays(date, -1);
  for (let i = 0; i < 14 && !isWorkingDay(prev, cal); i++) prev = addDays(prev, -1);

  const memberships = squad
    ? await db.squadMembership.findMany({
        where: { squadId, member: { active: true }, ...(f.member ? { memberId: f.member } : {}) },
        include: { member: true },
        orderBy: { member: { name: "asc" } },
      })
    : [];
  const memberIds = memberships.map((m) => m.memberId);
  const [entries, tasks] = await Promise.all([
    db.standupEntry.findMany({ where: { date, squadId, memberId: { in: memberIds } } }),
    db.workItem.findMany({
      where: {
        type: "TASK",
        assigneeId: { in: memberIds },
        lob: { squadId },
        OR: [{ status: "DONE", doneAt: { gte: prev, lt: date } }, { status: "IN_PROGRESS" }, { blocked: true, status: { not: "DONE" } }],
      },
      include: { lob: { select: { key: true } } },
      orderBy: [{ rank: "asc" }, { number: "asc" }],
    }),
  ]);
  const entryOf = new Map(entries.map((e) => [e.memberId, e]));
  const line = (t: (typeof tasks)[number]) => `${itemKey(t.lob.key, t.number)} ${t.title}${t.estimateHours != null ? ` (${t.estimateHours}h)` : ""}`;

  // History
  const hFrom = dateParam(f.from) ?? addDays(todayUTC(), -13);
  const hTo = dateParam(f.to) ?? (date.getTime() > todayUTC().getTime() ? date : todayUTC());
  const history = await db.standupEntry.findMany({
    where: { date: { gte: hFrom, lte: hTo }, ...(f.hsquad ? { squadId: f.hsquad } : {}), ...(f.hmember ? { memberId: f.hmember } : {}) },
    include: { squad: { select: { name: true } }, member: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { squad: { name: "asc" } }, { member: { name: "asc" } }],
    take: 500,
  });
  const allMembers = await db.member.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const exportQuery = toQuery({ squad: f.hsquad, member: f.hmember, from: toISODate(hFrom), to: toISODate(hTo) });

  return (
    <>
      <PageHeader title="Daily Standup" description="Yesterday, today and blockers for each member. Suggestions come from task activity, and your notes are kept as history." />

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-2">
          <select name="squad" defaultValue={squadId} className={selectCls} aria-label="Squad">
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" name="date" defaultValue={toISODate(date)} className={selectCls} aria-label="Date" />
          <select name="member" defaultValue={f.member ?? ""} className={selectCls} aria-label="Member">
            <option value="">All members</option>
            {allMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className={applyCls}>Show</button>
          <Link href={`/standup${toQuery({ squad: squadId })}`} className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-800">Today</Link>
          <span className="ml-2 text-sm text-slate-500">{WEEKDAYS[date.getUTCDay()]}, {formatDate(date)}{!isWorkingDay(date, cal) && " (not a working day)"}</span>
        </form>
      </Card>

      {!squad ? (
        <Card><Empty>Create a squad and add members first.</Empty></Card>
      ) : memberships.length === 0 ? (
        <Card><Empty>No active members in {squad.name}{f.member ? " match this member filter" : ""}.</Empty></Card>
      ) : (
        <div className="space-y-4">
          {memberships.map(({ member }) => {
            const e = entryOf.get(member.id);
            const mine = tasks.filter((t) => t.assigneeId === member.id);
            const doneYesterday = mine.filter((t) => t.status === "DONE").map(line).join("\n");
            const inProgress = mine.filter((t) => t.status === "IN_PROGRESS").map(line).join("\n");
            const blocked = mine.filter((t) => t.blocked).map((t) => `${line(t)}${t.blockedReason ? ` — ${t.blockedReason}` : ""}`).join("\n");
            return (
              <Card key={member.id} title={member.name} actions={<span className="text-xs text-slate-500">{e ? `Saved ${e.updatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : "Not saved yet · suggestions pre-filled"}</span>}>
                <ActionForm action={saveStandup} className="grid gap-3 md:grid-cols-3" successMessage="Saved." resetOnSuccess={false}>
                  <input type="hidden" name="date" value={toISODate(date)} />
                  <input type="hidden" name="squadId" value={squadId} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <Field label={`Yesterday (${formatDate(prev)})`}>
                    <Textarea name="yesterday" rows={4} maxLength={4000} defaultValue={e ? e.yesterday : doneYesterday} />
                  </Field>
                  <Field label="Today">
                    <Textarea name="today" rows={4} maxLength={4000} defaultValue={e ? e.today : inProgress} />
                  </Field>
                  <Field label="Blockers">
                    <Textarea name="blockers" rows={4} maxLength={4000} defaultValue={e ? e.blockers : blocked} />
                  </Field>
                  <div className="md:col-span-3"><SubmitButton>Save</SubmitButton></div>
                </ActionForm>
              </Card>
            );
          })}
        </div>
      )}

      <Card
        title={`Standup history (${history.length})`}
        className="mt-6"
        actions={<a href={`/api/export/standup${exportQuery}`} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Export Excel</a>}
      >
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="squad" value={squadId} />
          <input type="hidden" name="date" value={toISODate(date)} />
          <select name="hsquad" defaultValue={f.hsquad ?? ""} className={selectCls} aria-label="History squad">
            <option value="">All squads</option>
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="hmember" defaultValue={f.hmember ?? ""} className={selectCls} aria-label="History member">
            <option value="">All members</option>
            {allMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" name="from" defaultValue={toISODate(hFrom)} className={selectCls} aria-label="History from" /> –
          <input type="date" name="to" defaultValue={toISODate(hTo)} className={selectCls} aria-label="History to" />
          <button className={applyCls}>Filter history</button>
        </form>
        {history.length === 0 ? (
          <Empty>No saved standups in this range.</Empty>
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Squad</Th><Th>Member</Th><Th>Yesterday</Th><Th>Today</Th><Th>Blockers</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h) => (
                <tr key={h.id} className="align-top">
                  <Td className="whitespace-nowrap"><Link className="hover:underline" href={`/standup${toQuery({ squad: h.squadId, date: toISODate(h.date) })}`}>{formatDate(h.date)}</Link></Td>
                  <Td>{h.squad.name}</Td>
                  <Td>{h.member.name}</Td>
                  <Td className="whitespace-pre-wrap text-xs">{h.yesterday || "—"}</Td>
                  <Td className="whitespace-pre-wrap text-xs">{h.today || "—"}</Td>
                  <Td className={`whitespace-pre-wrap text-xs ${h.blockers ? "text-red-700" : ""}`}>{h.blockers || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
