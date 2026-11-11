"use client";

import { DIMENSIONS, questionsFor, scoreProfile, type Profile } from "@/lib/engine";
import { Panel } from "./ui";

export default function Questions({
  profile, onAnswer,
}: { profile: Profile; onAnswer: (questionId: string, points: number) => void }) {
  const score = scoreProfile(profile);

  return (
    <Panel title="Questions" hint={`${score.answered} of ${score.asked} answered`}>
      <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
        Answer what you know. Leave a question alone and it stays missing: it will not be counted as a zero,
        and no finding will be built on it.
      </p>
      <div className="qgroups">
        {DIMENSIONS.map((d) => {
          const qs = questionsFor(d.id);
          const answered = qs.filter((q) => typeof profile.answers[q.id] === "number").length;
          const dimScore = score.dimensions.find((x) => x.id === d.id);
          return (
            <details className="qgroup" key={d.id} open={answered < qs.length}>
              <summary>
                <span>{d.label}</span>
                <span className="label" style={{ letterSpacing: 0 }}>{d.weight * 100}% of score</span>
                <span className="spacer" />
                <span className="mono dimtext" style={{ fontSize: 11 }}>
                  {answered}/{qs.length}
                </span>
                <span className="mono" style={{ fontSize: 12.5 }}>
                  {dimScore?.score === null || dimScore === undefined ? "—" : dimScore.score}
                </span>
              </summary>
              <div className="qbody">
                <p className="hint" style={{ margin: 0 }}>{d.why}</p>
                {qs.map((q) => (
                  <div className="q" key={q.id}>
                    <p>{q.text}</p>
                    <div className="opts" role="group" aria-label={q.text}>
                      {q.options.map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          className="opt"
                          aria-pressed={profile.answers[q.id] === o.points}
                          onClick={() => onAnswer(q.id, o.points)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => qs.forEach((q) => onAnswer(q.id, -1))}
                  >
                    Clear these answers
                  </button>
                  <span className="hint">Clearing returns them to missing, not to zero.</span>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </Panel>
  );
}
