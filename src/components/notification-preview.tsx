"use client";

export function NotificationPreview({
  title,
  body,
  icon,
  image,
  source,
  action1,
  action2,
}: {
  title: string;
  body: string;
  icon: string;
  image: string;
  source: string;
  action1?: string;
  action2?: string;
}) {
  return (
    <div className="w-[340px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <div className="h-4 w-4 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="truncate">{source || "yoursite.com"}</span>
          <span>· now</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 break-words">
              {title || "[ Title here ]"}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 break-words line-clamp-3">
              {body || "[ Message here ]"}
            </p>
          </div>
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt=""
              className="h-10 w-10 rounded object-cover shrink-0"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          ) : (
            <div className="h-10 w-10 rounded bg-zinc-200 dark:bg-zinc-700 shrink-0" />
          )}
        </div>
      </div>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="w-full max-h-40 object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
      {(action1 || action2) && (
        <div className="flex border-t border-zinc-100 dark:border-zinc-700">
          {action1 && (
            <span className="flex-1 text-center text-sm py-2 text-indigo-600 dark:text-indigo-400 border-r border-zinc-100 dark:border-zinc-700">
              {action1}
            </span>
          )}
          {action2 && (
            <span className="flex-1 text-center text-sm py-2 text-indigo-600 dark:text-indigo-400">
              {action2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
