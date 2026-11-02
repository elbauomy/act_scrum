"use client";

import { acceptBaseline, resetBaseline } from "@/lib/actions/sprints";
import { ActionForm, SubmitButton } from "@/components/ui/forms";

/** Accept the new planned dates for one or more tasks as their baseline. */
export function AcceptBaselineForm({ taskIds, label }: { taskIds: string[]; label: string }) {
  return (
    <ActionForm action={acceptBaseline} className="inline" resetOnSuccess={false}>
      {taskIds.map((id) => <input key={id} type="hidden" name="taskId" value={id} />)}
      <SubmitButton variant="secondary" className="px-2 py-1 text-xs">{label}</SubmitButton>
    </ActionForm>
  );
}

export function ResetBaselineForm({ id }: { id: string }) {
  return (
    <ActionForm action={resetBaseline} className="inline" resetOnSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" className="px-2 py-1 text-xs">Reset baseline</SubmitButton>
    </ActionForm>
  );
}
