import { isAuthed } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthed()) redirect("/admin");

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Admin login</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter the password from your <code>.env.local</code> (<code>ADMIN_PASSWORD</code>).
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
