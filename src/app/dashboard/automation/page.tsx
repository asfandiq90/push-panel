import { listFeeds } from "@/lib/feeds";
import { listDomains } from "@/lib/campaigns";
import { AutomationManager } from "@/components/automation-manager";

export const dynamic = "force-dynamic";

export default function AutomationPage() {
  const feeds = listFeeds();
  const domains = listDomains().map((d) => ({ id: d.id, label: d.label }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
      <AutomationManager initial={feeds} domains={domains} />
    </div>
  );
}
