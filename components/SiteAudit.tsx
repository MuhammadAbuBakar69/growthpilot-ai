"use client";

import { useMemo } from "react";
import { auditSite, crossCheck, GROUPS, type CrossCheck, type SiteSignal } from "@/lib/audit";
import type { Profile } from "@/lib/engine";
import { Empty, Panel, Tag } from "./ui";

const STATUS_TONE: Record<string, string> = { found: "low", missing: "critical", unclear: "medium" };

function SignalRow({ signal }: { signal: SiteSignal }) {
  return (
    <div className="signal">
      <div className="signal-top">
        <span className={`dot ${signal.status}`} aria-hidden />
        <span className="signal-label">{signal.label}</span>
        <span className="signal-state mono">{signal.status}</span>
      </div>
      <div className="signal-detail">{signal.detail}</div>
      {signal.evidence ? <blockquote className="snippet">{signal.evidence}</blockquote> : null}
      <div className="signal-why">{signal.consequence}</div>
      <div className="signal-fix"><b>Fix</b>{signal.fix}</div>
    </div>
  );
}

export default function SiteAudit({ profile, onFixAnswers }: { profile: Profile; onFixAnswers: () => void }) {
  const signals = useMemo(() => (profile.site ? auditSite(profile.site) : []), [profile.site]);
  const checks = useMemo(() => crossCheck(profile), [profile]);

  if (!profile.site) {
    return (
      <Panel title="Site audit" hint="needs page source">
        <Empty>
          Paste your page source above and this becomes a list of what the page proves and what it only
          claims. Without it, the audit is limited to what you told us.
        </Empty>
      </Panel>
    );
  }

  const missing = signals.filter((s) => s.status === "missing").length;
  const found = signals.filter((s) => s.status === "found").length;

  return (
    <div className="stack">
      {checks && checks.contradictions.length > 0 ? (
        <Panel
          title="Where your answers and your page disagree"
          hint={`${checks.contradictions.length} of ${checks.checked} checked`}
        >
          <p className="lede-sm">
            You told us one thing and the page shows another. Your answer is <em>inferred</em> from what you
            said; the page is <em>measured</em> from the HTML you pasted. This is the contradiction worth
            fixing first, because it means either the work is missing or the page is hiding it.
          </p>
          <div className="findings" style={{ marginTop: 12 }}>
            {checks.contradictions.map((c: CrossCheck) => (
              <article className="finding" key={c.id}>
                <div className="finding-top">
                  <span className="dot critical" aria-hidden />
                  <h3>{c.claim}</h3>
                  <div className="finding-meta"><span>{c.claimed}</span></div>
                </div>
                <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                  <Tag tone="inferred">your answer</Tag>
                  <Tag tone="measured">page: {c.page}</Tag>
                </div>
                <p>{c.note}</p>
                <div className="do"><b>Do this</b>{c.fix}</div>
              </article>
            ))}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-sm" onClick={onFixAnswers}>Correct the answers instead</button>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="What the page proves"
        hint={`${found} found · ${missing} missing · ${signals.length} checks`}
      >
        <p className="lede-sm">
          Read from the HTML you pasted: markup, visible text and link targets. Each check states what was
          found, why it matters commercially, and the smallest change that fixes it.
        </p>
        {GROUPS.map((group) => {
          const items = signals.filter((s) => s.group === group.id);
          if (items.length === 0) return null;
          const groupMissing = items.filter((s) => s.status === "missing").length;
          return (
            <section className="audit-group" key={group.id}>
              <div className="audit-group-head">
                <h3>{group.label}</h3>
                <span className="audit-group-q">{group.question}</span>
                <span className="right" />
                <span className="mono dimtext" style={{ fontSize: 11 }}>
                  {items.length - groupMissing}/{items.length}
                </span>
              </div>
              <div className="signals">
                {items.map((s) => <SignalRow key={s.id} signal={s} />)}
              </div>
            </section>
          );
        })}
        <div className="row" style={{ marginTop: 14 }}>
          <span className="hint">
            Checks are code, not a model: <span className="mono">lib/audit.ts</span>. A page rendered by
            JavaScript will read thinner than it looks in a browser, and that limit is stated rather than
            hidden.
          </span>
        </div>
      </Panel>
    </div>
  );
}
