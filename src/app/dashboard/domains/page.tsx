import Link from "next/link";
import { listDomains, domainSubscriberCount } from "@/lib/campaigns";
import { DomainCreateForm } from "@/components/domain-create-form";

export const dynamic = "force-dynamic";

export default function DomainsPage() {
  const domains = listDomains().map((d) => ({ ...d, subs: domainSubscriberCount(d.id) }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <h2 className="font-medium mb-4">Add a domain</h2>
        <DomainCreateForm />
        <p className="mt-3 text-xs text-zinc-500">
          A unique VAPID keypair is generated automatically for each domain — nothing to paste.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-medium">Your domains</h2>
        </div>
        {domains.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No domains yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {domains.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/domains/${d.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.label}</p>
                    <p className="text-xs text-zinc-500 font-mono truncate">{d.origin}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-semibold tabular-nums">{d.subs}</p>
                    <p className="text-xs text-zinc-500">subscribers</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
