import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The panel has no public landing page — send everyone to the dashboard, which
// itself requires login (and bounces logged-out visitors to /login).
export default function Home() {
  redirect("/dashboard");
}
