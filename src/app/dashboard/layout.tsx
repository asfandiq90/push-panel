import { isAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashSidebar } from "@/components/dash-sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthed())) redirect("/login");

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <DashSidebar />
      <div className="flex-1 min-w-0">
        <main className="max-w-5xl mx-auto px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
