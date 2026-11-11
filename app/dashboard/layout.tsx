import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard#roadmap", label: "Roadmap" },
  { href: "/dashboard#findings", label: "Findings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-screen">
      <header className="border-b hair">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-md bg-gradient-to-br from-violet to-electric" />
            <Link href="/dashboard" className="text-sm font-semibold tracking-tight">GrowthPilot AI</Link>
          </div>
          <nav className="hidden items-center gap-5 text-sm text-muted sm:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:block">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="btn-ghost text-xs" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
