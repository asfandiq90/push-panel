"use client";

import { useState } from "react";

export function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="relative">
      {label && <p className="text-sm text-zinc-500 mb-1">{label}</p>}
      <button
        onClick={copy}
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
        type="button"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 text-zinc-100 p-4 pt-9 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
