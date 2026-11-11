"use client";

import { useActionState } from "react";
import { createWorkspace, type OnboardingState } from "./actions";

const initial: OnboardingState = {};
const industries = [
  "SaaS / software", "E-commerce", "Agency / services", "Local business",
  "Professional services", "Manufacturing / industrial", "Education", "Creator / personal brand",
];

export default function Onboarding() {
  const [state, action, pending] = useActionState(createWorkspace, initial);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="label">Step 1 of 3 · Business profile</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Tell GrowthPilot about the business</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        These answers become the persistent context every agent reads. The more precise they are, the
        less generic the strategy. You can edit everything later.
      </p>

      <form action={action} className="card mt-8 space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Business name *</span>
            <input name="business_name" required className="mt-2" placeholder="ThreadMind AI" />
          </label>
          <label className="block">
            <span className="label">Website</span>
            <input name="website_url" className="mt-2" placeholder="https://example.com" inputMode="url" />
          </label>
        </div>

        <label className="block">
          <span className="label">Industry</span>
          <select name="industry" className="mt-2" defaultValue="">
            <option value="">Select an industry</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="label">What the business does</span>
          <textarea name="description" rows={3} className="mt-2" placeholder="Autonomous intelligence for textile factories: defect vision, predictive maintenance, root-cause analysis." />
        </label>

        <label className="block">
          <span className="label">Who buys it</span>
          <input name="target_audience" className="mt-2" placeholder="Plant managers at mid-size textile factories in Pakistan" />
        </label>

        <label className="block">
          <span className="label">Current marketing challenges (comma separated)</span>
          <input name="challenges" className="mt-2" placeholder="low inbound leads, no content, weak SEO" />
        </label>

        {state.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted">Stored under your workspace only. Row-level security enforces it.</span>
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
            {pending ? "Creating workspace…" : "Create workspace"}
          </button>
        </div>
      </form>
    </main>
  );
}
