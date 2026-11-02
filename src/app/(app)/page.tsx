import Link from "next/link";
import { db } from "@/lib/db";
import { getWorkCalendar } from "@/lib/settings";
import { capacityBetween } from "@/lib/capacity";
import { addDays, formatDate, startOfWeek, todayUTC } from "@/lib/dates";
import { Card, Empty, PageHeader, Select, Stat, Table, Td, Th } from "@/components/ui";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { squad: squadFilter } = (await searchParams) as { squad?: string };
  const [squads, cal, memberCount, lobCount] = await Promise.all([
    db.squad.findMany({
      orderBy: { name: "asc" },
      include: {
        lobs: { select: { id: true } },
        memberships: { include: { member: { include: { leaves: true } } } },
      },
    }),
    getWorkCalendar(),
    db.member.count({ where: { active: true } }),
    db.lineOfBusiness.count(),
  ]);

  // "This week" runs Sunday to Saturday so it covers any working-day setup.
  const weekStart = startOfWeek(todayUTC(), 0);
  const weekEnd = addDays(weekStart, 6);
  const shown = squadFilter ? squads.filter((s) => s.id === squadFilter) : squads;

  const rows = shown.map((s) => {
    const active = s.memberships.filter((m) => m.member.active);
    const capacity = active.reduce(
      (sum, m) => sum + capacityBetween(weekStart, weekEnd, m.weeklyHours, cal, m.member.leaves),
      0,
    );
    const nominal = active.reduce((sum, m) => sum + m.weeklyHours, 0);
    const onLeave = active.filter((m) =>
      m.member.leaves.some((l) => l.startDate <= weekEnd && l.endDate >= weekStart),
    ).length;
    return { squad: s, members: active.length, lobs: s.lobs.length, capacity, nominal, onLeave };
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`This week: ${formatDate(weekStart)} – ${formatDate(weekEnd)}`}
        actions={
          <form className="flex items-center gap-2">
            <Select name="squad" defaultValue={squadFilter ?? ""} className="w-48">
              <option value="">All squads</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">Filter</button>
          </form>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Squads" value={squads.length} />
        <Stat label="Lines of Business" value={lobCount} />
        <Stat label="Active members" value={memberCount} />
        <Stat
          label="Capacity this week"
          value={`${rows.reduce((s, r) => s + r.capacity, 0).toFixed(1)} h`}
          hint={squadFilter ? "Selected squad" : "All squads, after holidays and leave"}
        />
      </div>

      <Card title="Squad capacity this week">
        {rows.length === 0 ? (
          <Empty>
            No squads yet. <Link className="text-orange-600 underline" href="/squads">Create your first squad</Link>.
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Squad</Th>
                <Th>LOBs</Th>
                <Th>Members</Th>
                <Th>On leave</Th>
                <Th>Weekly hours</Th>
                <Th>Available this week</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.squad.id}>
                  <Td>
                    <Link className="font-medium text-orange-700 hover:underline" href={`/squads/${r.squad.id}`}>
                      {r.squad.name}
                    </Link>
                  </Td>
                  <Td>{r.lobs}</Td>
                  <Td>{r.members}</Td>
                  <Td>{r.onLeave}</Td>
                  <Td>{r.nominal.toFixed(1)} h</Td>
                  <Td className="font-medium">{r.capacity.toFixed(1)} h</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <p className="mt-6 text-sm text-slate-500">
        Sprint health, burndown and velocity will appear here once sprints are added in later phases.
      </p>
    </>
  );
}
