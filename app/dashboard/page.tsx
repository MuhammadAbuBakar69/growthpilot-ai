import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type Workspace = {
  org_id: string;
  org_name: string;
  plan: string | null;
  business_name: string | null;
  industry: string | null;
  website_url: string | null;
  description: string | null;
};

/** Placeholder scores are intentionally absent: nothing has been measured yet, so nothing is shown. */
export default async function Dashboard() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("my_workspaces").select("*").limit(1);
  const ws = (data?.[0] ?? null) as Workspace | null;

  if (error) {
    return (
      <div className="card p-6">
        <p className="label">Database</p>
        <p className="mt-2 text-sm text-red-300">{error.message}</p>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="card p-8">
        <p className="label">No workspace yet</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Create your business profile</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          GrowthPilot needs a subject before it can analyze anything. This takes about a minute.
        </p>
        <Link href="/onboarding" className="btn-primary mt-6 inline-block">Start onboarding</Link>
      </div>
    );
  }

  const metrics = [
    { label: "Business health", value: "—", note: "Needs a website audit" },
    { label: "Website health", value: "—", note: "Not measured yet" },
    { label: "Open findings", value: "0", note: "No analysis has run" },
    { label: "Roadmap tasks", value: "0", note: "Nothing planned yet" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="label">Workspace · {ws.plan ?? "free"}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{ws.business_name ?? ws.org_name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {ws.description ?? "Add a description so the strategy agents have something to reason about."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {ws.industry && <span className="rounded-full border hair px-3 py-1 text-muted">{ws.industry}</span>}
          {ws.website_url && <span className="rounded-full border hair px-3 py-1 font-mono text-muted">{ws.website_url}</span>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="card p-5">
            <p className="label">{m.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{m.value}</p>
            <p className="mt-1 text-xs text-muted">{m.note}</p>
          </div>
        ))}
      </section>

      <section id="findings" className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Findings</p>
            <h2 className="mt-2 text-lg font-medium">Nothing analyzed yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              The website audit engine is phase 4 of the build. Rather than showing invented scores,
              this panel stays empty until a real crawl produces real findings — each one classed as
              measured, inferred or hypothesis.
            </p>
          </div>
          <span className="whitespace-nowrap rounded-full border hair px-3 py-1 text-xs text-muted">phase 4</span>
        </div>
      </section>

      <section id="roadmap" className="card p-6">
        <p className="label">Roadmap</p>
        <h2 className="mt-2 text-lg font-medium">30 / 60 / 90 days</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Generated after the first audit. Every task will carry an owner, a deadline and a success
          metric, and nothing is marked complete by the model alone.
        </p>
      </section>
    </div>
  );
}
