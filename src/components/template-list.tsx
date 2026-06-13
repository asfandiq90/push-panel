"use client";

import { useState } from "react";

type T = { id: number; name: string; title: string | null };

export function TemplateList({ initial }: { initial: T[] }) {
  const [items, setItems] = useState(initial);

  async function remove(id: number) {
    if (!window.confirm("Delete this template?")) return;
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  if (items.length === 0) {
    return <p className="px-6 py-8 text-sm text-zinc-500">No templates yet. Save one from the campaign builder.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {items.map((t) => (
        <li key={t.id} className="flex items-center justify-between px-6 py-4">
          <div className="min-w-0">
            <p className="font-medium truncate">{t.name}</p>
            <p className="text-xs text-zinc-500 truncate">{t.title ?? "(no title)"}</p>
          </div>
          <button
            onClick={() => remove(t.id)}
            className="text-sm text-red-600 hover:underline shrink-0 ml-4"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
