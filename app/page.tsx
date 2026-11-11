import Link from "next/link";

const pillars = [
  {
    k: "01",
    t: "Evidence before advice",
    d: "Every finding carries a class: measured, inferred, hypothesis or unavailable. A check that could not run is never reported as zero.",
  },
  {
    k: "02",
    t: "Ten agents, one owner of the answer",
    d: "Specialists work on typed slices of the business profile. A manager agent reconciles conflicts instead of letting ten chatbots disagree in public.",
  },
  {
    k: "03",
    t: "Plans you can actually run",
    d: "Recommendations become tasks with an owner, a deadline and a success metric, on a 30/60/90 cadence.",
  },
];

export default function Landing() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet to-electric" />
          <span className="font-semibold tracking-tight">GrowthPilot AI</span>
          <span className="label rounded-full border hair px-2 py-0.5">alpha</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link href="/login?mode=signup" className="btn-primary text-sm">Create account</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8">
        <p className="label">AI growth strategy · multi-tenant · evidence-classed</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Find out why the business is not growing,
          <span className="bg-gradient-to-r from-violet to-electric bg-clip-text text-transparent"> and what to do on Monday.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          GrowthPilot analyzes a website and a business profile, then produces a prioritized growth
          plan. It is built to be audited: scores store their own methodology, recommendations cite the
          finding they came from, and anything the system could not measure is marked unavailable
          rather than guessed.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/login?mode=signup" className="btn-primary">Start with your business</Link>
          <Link href="/login" className="btn-ghost">I already have an account</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-3">
        {pillars.map((p) => (
          <article key={p.k} className="card p-6">
            <span className="label">{p.k}</span>
            <h2 className="mt-3 text-[17px] font-medium">{p.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.d}</p>
          </article>
        ))}
      </section>

      <footer className="border-t hair">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>GrowthPilot AI — built in public, phases tracked in the README.</span>
          <span className="font-mono">Next.js · TypeScript · Postgres + RLS</span>
        </div>
      </footer>
    </main>
  );
}
