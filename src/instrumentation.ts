// Runs once when the Node.js server starts. We use it to fire scheduled
// campaigns on a lightweight in-process interval. Fine for a single self-hosted
// instance; for multi-instance you'd move this to an external cron/queue.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { dueCampaigns } = await import("@/lib/campaigns");
  const { runCampaign } = await import("@/lib/web-push");
  const { pollDueFeeds } = await import("@/lib/feeds");

  const tick = async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const due = dueCampaigns(now);
      for (const c of due) {
        try {
          await runCampaign(c.id);
          // eslint-disable-next-line no-console
          console.log(`[scheduler] sent campaign #${c.id}`);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[scheduler] campaign #${c.id} failed:`, err);
        }
      }
    } catch {
      /* keep ticking even if a query fails */
    }
    try {
      await pollDueFeeds();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[scheduler] feed poll failed:", err);
    }
  };

  // Check every 30 seconds.
  setInterval(tick, 30_000);
  // Run once shortly after boot too.
  setTimeout(tick, 5_000);
}
