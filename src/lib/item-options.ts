import "server-only";
import { db } from "./db";
import { itemKey } from "./work-items";
import type { LobOption, MemberOption, ParentOption } from "@/components/work-items/new-item-form";

/** Options for the "new item" form: LOBs, possible parents, and members per squad. */
export async function loadItemFormOptions(lobIds?: string[]) {
  const [lobs, items, memberships] = await Promise.all([
    db.lineOfBusiness.findMany({ where: lobIds ? { id: { in: lobIds } } : undefined, orderBy: { name: "asc" } }),
    db.workItem.findMany({
      where: { type: { in: ["EPIC", "FEATURE", "STORY", "BUG"] }, ...(lobIds ? { lobId: { in: lobIds } } : {}) },
      orderBy: [{ lobId: "asc" }, { number: "asc" }],
      select: { id: true, number: true, title: true, type: true, lobId: true, lob: { select: { key: true } } },
    }),
    db.squadMembership.findMany({
      where: { member: { active: true } },
      include: { member: { select: { id: true, name: true } } },
      orderBy: { member: { name: "asc" } },
    }),
  ]);
  const lobOptions: LobOption[] = lobs.map((l) => ({ id: l.id, name: l.name, key: l.key, squadId: l.squadId }));
  const parents: ParentOption[] = items.map((i) => ({ id: i.id, key: itemKey(i.lob.key, i.number), title: i.title, type: i.type, lobId: i.lobId }));
  const membersBySquad: Record<string, MemberOption[]> = {};
  for (const m of memberships) (membersBySquad[m.squadId] ??= []).push({ id: m.member.id, name: m.member.name });
  return { lobs: lobOptions, parents, membersBySquad };
}
