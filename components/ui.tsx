import type { ReactNode } from "react";
import type { Evidence, Severity } from "@/lib/engine";

export function Tag({ tone, children, title }: { tone?: string; children: ReactNode; title?: string }) {
  return (
    <span className="tag" data-tone={tone} title={title}>
      {children}
    </span>
  );
}

export function EvidenceTag({ evidence }: { evidence: Evidence }) {
  const title =
    evidence === "measured"
      ? "Parsed directly from HTML you supplied. Reproducible from that input."
      : evidence === "inferred"
        ? "Concluded from the answers you gave. Checkable against them."
        : evidence === "hypothesis"
          ? "A guess that still needs evidence. Never treated as a finding."
          : "No data. Reported as missing rather than assumed.";
  return <Tag tone={evidence} title={title}>{evidence}</Tag>;
}

export function SeverityTag({ severity }: { severity: Severity }) {
  return <Tag tone={severity}>{severity}</Tag>;
}

export function Meter({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "warn" | "bad" }) {
  const cls = tone === "accent" ? "meter" : `meter ${tone}`;
  return (
    <div className={cls} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Panel({
  title, hint, actions, children, id,
}: { title: string; hint?: ReactNode; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="panel" id={id}>
      <div className="panel-head">
        <h2>{title}</h2>
        {hint ? <span className="label" style={{ letterSpacing: 0 }}>{hint}</span> : null}
        {actions ? <div className="spacer">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export const toneForScore = (score: number): "good" | "warn" | "bad" =>
  score >= 75 ? "good" : score >= 45 ? "warn" : "bad";

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
