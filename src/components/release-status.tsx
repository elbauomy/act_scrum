import type { ReleaseView } from "@/lib/analytics";
import { Badge } from "@/components/ui";

export function ReleaseStatus({ release: r, today }: { release: ReleaseView; today: Date }) {
  if (r.deployedDate) {
    const late = r.deployedDate > r.targetDate;
    return <Badge tone={late ? "amber" : "green"}>{late ? "Deployed late" : "Deployed"}</Badge>;
  }
  if (r.targetDate < today) return <Badge tone="red">Overdue</Badge>;
  if (r.forecastDelayDays != null && r.forecastDelayDays > 0) return <Badge tone="red">{r.forecastDelayDays}d late</Badge>;
  if (r.forecast == null && r.remainingHours > 0) return <Badge>No forecast</Badge>;
  return <Badge tone="green">On track</Badge>;
}
