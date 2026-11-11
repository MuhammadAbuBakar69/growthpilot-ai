"use client";

import { useMemo, useState } from "react";
import { findings, type Finding, type Profile } from "@/lib/engine";
import { Empty, EvidenceTag, Panel, SeverityTag } from "./ui";

const SEVERITIES = ["all", "critical", "high", "medium", "low"] as const;
type Filter = (typeof SEVERITIES)[number];

export default function Findings({ profile, onQuestions }: { profile: Profile; onQuestions: () => void }) {
  const all = useMemo(() => findings(profile), [profile]);
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? all : all.filter((f) => f.severity === filter);
  const counts = (s: Filter) => (s === "all" ? all.length : all.filter((f) => f.severity === s).length);

  return (
    <Panel
      title="Findings"
      hint={`${all.length} from your answers`}
      actions={
        <div className="row" style={{ gap: 4 }}>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              className="btn btn-sm btn-ghost"
              aria-pressed={filter === s}
              style={filter === s ? { borderColor: "var(--accent)", color: "#fff", background: "var(--accent-soft)" } : undefined}
              onClick={() => setFilter(s)}
            >
              {s} <span className="dimtext num">{counts(s)}</span>
            </button>
          ))}
        </div>
      }
    >
      {all.length === 0 ? (
        <Empty>
          Nothing to report yet. Findings are generated from your answers.
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-sm btn-primary" onClick={onQuestions}>Answer the questions</button>
          </div>
        </Empty>
      ) : shown.length === 0 ? (
        <Empty>No {filter} findings. Good.</Empty>
      ) : (
        <div className="findings">
          {shown.map((f: Finding) => (
            <article className="finding" key={f.id}>
              <div className="finding-top">
                <span className="sev-dot" data-sev={f.severity} />
                <h3>{f.title}</h3>
                <div className="finding-meta">
                  <span>{f.effort} effort</span>
                  <span>+{f.unlocks}</span>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <SeverityTag severity={f.severity} />
                <EvidenceTag evidence={f.evidence} />
                <span className="label" style={{ letterSpacing: 0 }}>{f.dimension}</span>
              </div>
              <p>{f.why}</p>
              <div className="do"><b>Do this</b>{f.action}</div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
