import { isAuthed } from "@/lib/auth";
import { countAudience, facets } from "@/lib/segment";
import type { SegmentFilters } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns how many subscribers match a set of segment filters, plus the facet
// values available for building dropdowns. Used by the campaign form's live
// audience counter.
export async function GET(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const p = new URL(request.url).searchParams;
  const filters: SegmentFilters = {};
  if (p.get("domainId")) filters.domainId = Number(p.get("domainId"));
  if (p.get("browser")) filters.browser = p.get("browser")!;
  if (p.get("os")) filters.os = p.get("os")!;

  return Response.json({ count: countAudience(filters), facets: facets() });
}
