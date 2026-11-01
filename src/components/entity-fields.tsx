import { Field, Input, Select, Textarea } from "@/components/ui";

export function SquadFields({
  defaultSprint,
  values,
}: {
  defaultSprint: number;
  values?: { name: string; description: string; sprintLengthDays: number | null };
}) {
  return (
    <>
      <Field label="Name">
        <Input name="name" required maxLength={100} defaultValue={values?.name} />
      </Field>
      <Field label="Description">
        <Textarea name="description" maxLength={1000} defaultValue={values?.description} />
      </Field>
      <Field label="Sprint length (days)" hint={`Leave empty to use the system default (${defaultSprint} days).`}>
        <Input type="number" name="sprintLengthDays" min="1" max="365" defaultValue={values?.sprintLengthDays ?? ""} />
      </Field>
    </>
  );
}

export function LobFields({
  squads,
  values,
}: {
  squads: { id: string; name: string; sprintLengthDays: number | null }[];
  values?: { name: string; description: string; squadId: string; sprintLengthDays: number | null };
}) {
  return (
    <>
      <Field label="Name">
        <Input name="name" required maxLength={100} defaultValue={values?.name} />
      </Field>
      <Field label="Owning squad">
        <Select name="squadId" required defaultValue={values?.squadId ?? ""}>
          <option value="" disabled>
            Choose a squad…
          </option>
          {squads.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <Textarea name="description" maxLength={1000} defaultValue={values?.description} />
      </Field>
      <Field label="Sprint length (days)" hint="Leave empty to use the squad's length (or the system default).">
        <Input type="number" name="sprintLengthDays" min="1" max="365" defaultValue={values?.sprintLengthDays ?? ""} />
      </Field>
    </>
  );
}
