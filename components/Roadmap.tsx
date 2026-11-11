"use client";

import { useMemo } from "react";
import { roadmap, type Profile } from "@/lib/engine";
import { Empty, Panel } from "./ui";

export default function Roadmap({ profile, onQuestions }: { profile: Profile; onQuestions: () => void }) {
  const stages = useMemo(() => roadmap(profile), [profile]);
  const total = stages.reduce((n, s) => n + s.items.length, 0);

  return (
    <Panel title="30 / 60 / 90 plan" hint={total ? `${total} actions, ordered by unlocked score` : "empty"}>
      {total === 0 ? (
        <Empty>
          The plan is built from findings, and findings come from answers.
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-sm btn-primary" onClick={onQuestions}>Answer the questions</button>
          </div>
        </Empty>
      ) : (
        <>
          <div className="roadmap">
            {stages.map((stage) => (
              <div className="stage" key={stage.window}>
                <h3>{stage.window}</h3>
                <div className="focus">{stage.focus}</div>
                {stage.items.length === 0 ? (
                  <div className="hint">Nothing at this effort level.</div>
                ) : (
                  <ol>
                    {stage.items.map((f, i) => (
                      <li key={f.id} data-i={String(i + 1)}>
                        {f.title}
                        <small>{f.effort} effort · +{f.unlocks} score · {f.dimension}</small>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Small effort goes in the first 30 days, medium in 60, large bets in 90. Nothing is scheduled by
            a calendar you did not set; move items between windows if your month is already full.
          </p>
        </>
      )}
    </Panel>
  );
}
