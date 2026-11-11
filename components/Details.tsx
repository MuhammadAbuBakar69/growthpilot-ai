"use client";

import type { Goal, Profile } from "@/lib/engine";
import { Panel } from "./ui";

const GOALS: { id: Goal; label: string }[] = [
  { id: "leads", label: "More enquiries" },
  { id: "sales", label: "More sales" },
  { id: "retention", label: "Repeat business" },
  { id: "awareness", label: "Being known" },
];

export default function Details({ profile, onPatch }: { profile: Profile; onPatch: (p: Partial<Profile>) => void }) {
  return (
    <Panel title="Business details" hint="saved as you type">
      <div className="form-grid two">
        <label className="field">
          <span>Name</span>
          <input type="text" value={profile.name} onChange={(e) => onPatch({ name: e.target.value })} />
        </label>
        <label className="field">
          <span>Website</span>
          <input type="url" value={profile.website} onChange={(e) => onPatch({ website: e.target.value })} placeholder="https://" />
        </label>
        <label className="field">
          <span>Industry</span>
          <input type="text" value={profile.industry} onChange={(e) => onPatch({ industry: e.target.value })} placeholder="Retail, services, manufacturing…" />
        </label>
        <label className="field">
          <span>Goal</span>
          <select value={profile.goal} onChange={(e) => onPatch({ goal: e.target.value as Goal })}>
            {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
      </div>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <label className="field">
          <span>What you sell</span>
          <input type="text" value={profile.description} onChange={(e) => onPatch({ description: e.target.value })} />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Who buys it</span>
            <input type="text" value={profile.audience} onChange={(e) => onPatch({ audience: e.target.value })} />
          </label>
          <label className="field">
            <span>Price or range</span>
            <input type="text" value={profile.offer} onChange={(e) => onPatch({ offer: e.target.value })} />
          </label>
        </div>
      </div>
    </Panel>
  );
}
