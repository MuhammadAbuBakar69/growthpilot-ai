"use client";

import { useState } from "react";
import { emptyProfile, type Goal, type Profile } from "@/lib/engine";

const GOALS: { id: Goal; label: string }[] = [
  { id: "leads", label: "More enquiries" },
  { id: "sales", label: "More sales" },
  { id: "retention", label: "Repeat business" },
  { id: "awareness", label: "Being known" },
];

const INDUSTRIES = [
  "Retail", "E-commerce", "Services", "Manufacturing", "Food & beverage", "Real estate",
  "Health & wellness", "Education", "Software", "Agency / consulting", "Other",
];

export default function Setup({
  onCreate, onImport, canCancel = false, onCancel,
}: {
  onCreate: (p: Profile) => void;
  onImport: (file: File) => void;
  canCancel?: boolean;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(() => emptyProfile());
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const canStart = form.name.trim().length > 1;

  return (
    <div className="setup">
      <h1>What business are we growing?</h1>
      <p className="lede">
        No account, no sign-in. This runs in your browser and the business stays on this device until you
        export it. Fill in what you know, skip what you do not: skipped questions are reported as missing,
        never counted as a failure.
      </p>

      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (canStart) onCreate(form);
        }}
      >
        <div className="form-grid two">
          <label className="field">
            <span>Business name</span>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Stitch Co" required />
          </label>
          <label className="field">
            <span>Website (optional)</span>
            <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://stitch.co" />
          </label>
          <label className="field">
            <span>Industry</span>
            <select value={form.industry} onChange={(e) => set("industry", e.target.value)}>
              <option value="">Choose one</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Main goal right now</span>
            <select value={form.goal} onChange={(e) => set("goal", e.target.value as Goal)}>
              {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>What do you sell, in one sentence?</span>
          <textarea
            style={{ minHeight: 62, fontFamily: "inherit", fontSize: 14 }}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Small-batch embroidery for hotel and uniform suppliers in Karachi."
          />
        </label>

        <div className="form-grid two">
          <label className="field">
            <span>Who buys it</span>
            <input type="text" value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Procurement managers at hotels" />
          </label>
          <label className="field">
            <span>Price or range you sell at</span>
            <input type="text" value={form.offer} onChange={(e) => set("offer", e.target.value)} placeholder="PKR 25-60 per piece" />
          </label>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={!canStart}>Start analysis</button>
          <span className="hint">You can change every field later.</span>
          <span className="right" />
          {canCancel ? <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button> : null}
          <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
            Import a saved file
            <input
              type="file" accept="application/json" className="sr"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }}
            />
          </label>
        </div>
      </form>
    </div>
  );
}
