"use client";

import { crossCheck } from "@/lib/audit";
import { DIMENSIONS, leverage, scoreProfile, type Profile } from "@/lib/engine";
import { Empty, Meter, Panel, Tag, toneForScore } from "./ui";

export default function Overview({
  profile, onAnswer, onOpenSite,
}: { profile: Profile; onAnswer: () => void; onOpenSite: () => void }) {
  const score = scoreProfile(profile);
  const top = leverage(profile).slice(0, 3);
  const checks = crossCheck(profile);
  const scored = score.dimensions.filter((d) => d.score !== null);

  return (
    <div className="stack">
      <Panel
        title="Growth score"
        hint={score.overall === null ? "no answers yet" : `${score.completeness}% of questions answered`}
      >
        {score.overall === null ? (
          <Empty>
            Nothing scored yet. <button className="btn btn-sm btn-primary" onClick={onAnswer} style={{ marginLeft: 8 }}>Answer the questions</button>
            <div className="hint" style={{ marginTop: 10 }}>
              A score needs answers. An unanswered dimension is shown as missing, not as zero.
            </div>
          </Empty>
        ) : (
          <>
            <div className="score-top">
              <div className="score-big num">
                {score.overall}
                <span>/100</span>
              </div>
              <div className="score-band">
                <div className="band-name">{score.band?.label}</div>
                <div className="band-why">{score.band?.meaning}</div>
              </div>
            </div>
            <Meter value={score.overall} tone={toneForScore(score.overall)} />
            <div className="kv">
              <div><b className="num">{score.answered}</b>answered</div>
              <div><b className="num">{score.asked - score.answered}</b>still missing</div>
              <div><b className="num">{scored.length}/{DIMENSIONS.length}</b>dimensions scored</div>
            </div>
            {score.completeness < 60 ? (
              <div className="banner" style={{ marginTop: 14 }}>
                {score.completeness}% answered. The score is renormalised over what you answered, so it is
                honest but narrow until more is filled in.
              </div>
            ) : null}
          </>
        )}
      </Panel>

      {checks && checks.contradictions.length > 0 ? (
        <Panel
          title="Your page disagrees with your answers"
          hint={`${checks.contradictions.length} of ${checks.checked} claims checked`}
          actions={<button className="btn btn-sm" onClick={onOpenSite}>Open site audit</button>}
        >
          <p className="lede-sm">
            You answered these as true; the page you supplied does not support them. That is either work
            nobody can see, or a claim worth correcting. Both are cheaper to fix than losing the visitor.
          </p>
          <div className="findings" style={{ marginTop: 10 }}>
            {checks.contradictions.map((c) => (
              <div className="finding" key={c.id}>
                <div className="finding-top">
                  <span className="sev-dot" data-sev={c.severity} />
                  <h3 style={{ fontSize: 13.5 }}>{c.claim}</h3>
                  <div className="finding-meta"><span>page: {c.page}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Dimensions" hint="score = earned ÷ possible × 100">
        <div className="dims">
          {score.dimensions.map((d) => (
            <div className="dim" key={d.id} data-na={d.score === null}>
              <div className="dim-top">
                <span className="dim-name">{d.label}</span>
                <span className="dim-formula">
                  {d.score === null ? `${d.asked} questions unanswered` : `${d.earned}/${d.possible} × 100`}
                </span>
              </div>
              <div className={`dim-score num ${d.score === null ? "na" : ""}`}>
                {d.score === null ? "—" : d.score}
              </div>
              <div className="dim-bar">
                <i style={{ width: `${d.score ?? 0}%`, background: d.score === null ? "var(--dim)" : undefined }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Where the next points are cheapest" hint="weight × distance from 100">
        {top.length === 0 ? (
          <Empty>Every answered dimension is already at 100.</Empty>
        ) : (
          <>
            <div className="stack" style={{ gap: 10 }}>
              {top.map((l, i) => (
                <div className="row" key={l.id}>
                  <span className="mono dimtext" style={{ fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13.5 }}>{l.label}</span>
                  <span className="right" />
                  <Tag>{`+${l.gain} potential`}</Tag>
                  <span className="mono dimtext" style={{ fontSize: 11 }}>now {l.score}</span>
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 12 }}>
              This is arithmetic, not a forecast: each line is that dimension&apos;s weight multiplied by how
              far it is from 100. The findings turn the top of this list into concrete work.
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
