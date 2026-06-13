import Link from "next/link";
import { notFound } from "next/navigation";
import { getDomain, domainSubscriberCount } from "@/lib/campaigns";
import { CopyBlock } from "@/components/copy-block";

export const dynamic = "force-dynamic";

export default async function DomainDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const domain = getDomain(Number(id));
  if (!domain) notFound();

  const panelBase = (process.env.PANEL_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subs = domainSubscriberCount(domain.id);

  const snippet = `<!-- push-panel notifications -->
<script src="${panelBase}/push-widget.js"
        data-vapid-key="${domain.vapid_public}"
        data-api-base="${panelBase}"
        data-sw-url="/sw.js"
        defer></script>

<!-- a button (or call PushPanel.subscribe() yourself) -->
<button onclick="PushPanel.subscribe()">Enable notifications</button>`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/dashboard/domains" className="text-sm text-indigo-600 hover:underline">
          ← Domains
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{domain.label}</h1>
            <p className="text-sm text-zinc-500 font-mono">{domain.origin}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">{subs}</p>
            <p className="text-xs text-zinc-500">subscribers</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4">
        <h2 className="font-medium">Installation</h2>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
          <p>
            <strong>1.</strong> Copy this snippet just before <code>&lt;/body&gt;</code> on{" "}
            <span className="font-mono">{domain.origin}</span>:
          </p>
        </div>
        <CopyBlock code={snippet} />

        <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 mt-2">
          <p>
            <strong>2.</strong> Save the service worker at the <em>root</em> of that site as{" "}
            <code>/sw.js</code> (service workers can&apos;t load cross-origin). Download it here:
          </p>
        </div>
        <a
          href={`${panelBase}/sw.js`}
          download="sw.js"
          className="self-start h-10 px-4 inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          Download sw.js
        </a>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <h2 className="font-medium mb-2">VAPID public key</h2>
        <p className="text-xs text-zinc-500 mb-3">
          This is safe to expose (it&apos;s already in the snippet). The private key stays on the
          server.
        </p>
        <code className="font-mono text-xs break-all">{domain.vapid_public}</code>
      </section>
    </div>
  );
}
