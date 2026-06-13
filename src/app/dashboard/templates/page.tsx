import Link from "next/link";
import { listTemplates } from "@/lib/templates";
import { TemplateList } from "@/components/template-list";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  const templates = listTemplates().map((t) => ({ id: t.id, name: t.name, title: t.title }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <Link
          href="/dashboard/campaigns/new"
          className="h-10 px-4 inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          Create one in the builder →
        </Link>
      </div>
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <TemplateList initial={templates} />
      </section>
    </div>
  );
}
