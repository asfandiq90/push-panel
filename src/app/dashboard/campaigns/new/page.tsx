import { listDomains } from "@/lib/campaigns";
import { listTemplates } from "@/lib/templates";
import { CampaignForm } from "@/components/campaign-form";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  const domains = listDomains().map((d) => ({ id: d.id, label: d.label, origin: d.origin }));
  const templates = listTemplates();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Create Campaign</h1>
      <CampaignForm domains={domains} templates={templates} />
    </div>
  );
}
