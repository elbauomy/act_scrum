import { db } from "@/lib/db";
import { ImportForm } from "@/components/import-form";
import { Card, DownloadLink, PageHeader } from "@/components/ui";

export default async function DataPage() {
  const [items, sprints, standups] = await Promise.all([db.workItem.count(), db.sprint.count(), db.standupEntry.count()]);
  return (
    <>
      <PageHeader title="Import & Backup" description="Keep a copy of your data in Excel, and bring work items in from a spreadsheet." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Full backup">
          <p className="mb-3 text-sm text-slate-600">
            Downloads one Excel file with every table: squads, lines of business, members, work items and their history, sprints, releases, standups and settings.
            Currently {items} work item(s), {sprints} sprint(s) and {standups} standup note(s).
          </p>
          <DownloadLink href="/api/export/backup">Download full backup (Excel)</DownloadLink>
          <p className="mt-3 text-xs text-slate-500">The free database plan keeps only a short restore history, so download a backup now and then, for example at the end of each sprint.</p>
        </Card>

        <Card title="Import work items from Excel">
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Download the template and fill one row per item (epics, features, stories, bugs, tasks).</li>
            <li>Upload it and click <strong>Check file</strong>. Every problem is listed with its row number.</li>
            <li>When the file is valid, click <strong>Import</strong>. Nothing is imported if any row has a problem.</li>
          </ol>
          <DownloadLink href="/api/export/template" className="mb-4">Download the template</DownloadLink>
          <ImportForm />
          <p className="mt-3 text-xs text-slate-500">Lines of business, squads and members must already exist. Imported items are added to the backlog; existing items are never changed.</p>
        </Card>
      </div>
    </>
  );
}
