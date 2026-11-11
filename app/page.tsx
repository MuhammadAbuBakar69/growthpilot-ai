"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataVault from "@/components/DataVault";
import Details from "@/components/Details";
import Findings from "@/components/Findings";
import Overview from "@/components/Overview";
import Questions from "@/components/Questions";
import Roadmap from "@/components/Roadmap";
import SiteAudit from "@/components/SiteAudit";
import Setup from "@/components/Setup";
import Website from "@/components/Website";
import { scoreProfile, type Profile, type SiteFacts } from "@/lib/engine";
import { deleteProfile, listProfiles, parseSnapshot, saveProfile, toSnapshot } from "@/lib/storage";

type Tab = "overview" | "findings" | "roadmap" | "questions" | "site" | "data";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "findings", label: "Findings" },
  { id: "roadmap", label: "Plan" },
  { id: "questions", label: "Questions" },
  { id: "site", label: "Site audit" },
  { id: "data", label: "Data" },
];

export default function Page() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [note, setNote] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listProfiles();
    setProfiles(list);
    return list;
  }, []);

  useEffect(() => {
    refresh().then((list) => setActiveId((current) => current ?? list[0]?.id ?? null));
  }, [refresh]);

  const active = useMemo(
    () => profiles?.find((p) => p.id === activeId) ?? profiles?.[0] ?? null,
    [profiles, activeId],
  );

  const patch = useCallback(
    (changes: Partial<Profile>) => {
      if (!active) return;
      const next: Profile = { ...active, ...changes, updatedAt: new Date().toISOString() };
      setProfiles((prev) => (prev ?? []).map((p) => (p.id === next.id ? next : p)));
      void saveProfile(next);
    },
    [active],
  );

  const answer = useCallback(
    (questionId: string, points: number) => {
      if (!active) return;
      const answers = { ...active.answers };
      if (points < 0) delete answers[questionId];
      else answers[questionId] = points;
      patch({ answers });
    },
    [active, patch],
  );

  const create = useCallback(
    async (profile: Profile) => {
      await saveProfile(profile);
      await refresh();
      setActiveId(profile.id);
      setTab("questions");
      setNote({ tone: "warn", text: "Answer what you can in Questions. Anything skipped stays missing and is never scored as a zero." });
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = profiles?.find((p) => p.id === id);
      if (!target) return;
      if (typeof window !== "undefined" && !window.confirm(`Delete “${target.name}” from this device?`)) return;
      await deleteProfile(id);
      const list = await refresh();
      setActiveId(list[0]?.id ?? null);
      setNote({ tone: "ok", text: `Deleted ${target.name} from this device.` });
    },
    [profiles, refresh],
  );

  const exportAll = useCallback(() => {
    if (!profiles?.length) return;
    const blob = new Blob([JSON.stringify(toSnapshot(profiles), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `growthpilot-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNote({ tone: "ok", text: "Exported. Keep that file: it is the only copy that survives this browser." });
  }, [profiles]);

  const importFile = useCallback(
    async (file: File) => {
      const parsed = parseSnapshot(await file.text());
      if (!parsed.ok) {
        setNote({ tone: "bad", text: `Could not import: ${parsed.error}` });
        return;
      }
      for (const business of parsed.businesses) await saveProfile(business);
      const list = await refresh();
      setActiveId(parsed.businesses[0]?.id ?? list[0]?.id ?? null);
      setTab("overview");
      setNote({ tone: "ok", text: `Imported ${parsed.businesses.length} ${parsed.businesses.length === 1 ? "business" : "businesses"}.` });
    },
    [refresh],
  );

  const score = active ? scoreProfile(active) : null;

  if (profiles === null) {
    return (
      <div className="wrap main">
        <div className="empty">Opening your workspace…</div>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand">
            <span className="brand-mark">G</span>
            <span>
              GrowthPilot
              <small>growth analysis, on your device</small>
            </span>
          </div>

          {active ? (
            <>
              <nav className="nav" aria-label="Sections">
                {TABS.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="biz-switch">
                {profiles.length > 1 ? (
                  <select
                    aria-label="Switch business"
                    value={active.id}
                    onChange={(e) => setActiveId(e.target.value)}
                    style={{ width: "auto", maxWidth: 200 }}
                  >
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : null}
                <button className="btn btn-sm" onClick={() => setShowNew(true)}>New</button>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <main className="wrap main">
        {showNew || !active ? (
          <Setup
            canCancel={Boolean(active)}
            onCancel={() => setShowNew(false)}
            onCreate={async (p) => { setShowNew(false); await create(p); }}
            onImport={importFile}
          />
        ) : (
          <div className="stack">
            {note ? (
              <div className={`banner ${note.tone === "ok" ? "ok" : note.tone === "bad" ? "bad" : ""}`}>
                <span>{note.text}</span>
                <span className="right" />
                <button className="btn btn-sm btn-ghost" onClick={() => setNote(null)}>Dismiss</button>
              </div>
            ) : null}

            {!active.site ? (
              <div className="banner">
                <span>
                  No page has been read yet, so this analysis is only what you told us. Paste your page source
                  in <b>Site audit</b> to check those answers against the page itself.
                </span>
                <span className="right" />
                <button className="btn btn-sm" onClick={() => setTab("site")}>Open site audit</button>
              </div>
            ) : null}

            {tab === "overview" ? (
              <>
                <div className="cols">
                  <Overview profile={active} onAnswer={() => setTab("questions")} onOpenSite={() => setTab("site")} />
                  <div className="stack">
                    <Findings profile={active} onQuestions={() => setTab("questions")} />
                  </div>
                </div>
                <Details profile={active} onPatch={patch} />
              </>
            ) : null}

            {tab === "findings" ? <Findings profile={active} onQuestions={() => setTab("questions")} /> : null}
            {tab === "roadmap" ? <Roadmap profile={active} onQuestions={() => setTab("questions")} /> : null}
            {tab === "questions" ? <Questions profile={active} onAnswer={answer} /> : null}
            {tab === "site" ? (
              <div className="stack">
                <Website profile={active} onFacts={(facts: SiteFacts | null) => patch({ site: facts })} />
                <SiteAudit profile={active} onFixAnswers={() => setTab("questions")} />
              </div>
            ) : null}
            {tab === "data" ? (
              <DataVault
                profiles={profiles}
                activeId={active.id}
                onSelect={(id) => { setActiveId(id); setTab("overview"); }}
                onDelete={remove}
                onExport={exportAll}
                onImport={importFile}
                onNew={() => setShowNew(true)}
              />
            ) : null}

            <footer className="footer">
              <p>
                Growth score {score?.overall ?? "—"} from {score?.answered ?? 0} of {score?.asked ?? 0} answers.
                Every finding names its evidence: <span className="mono">measured</span> from HTML you supplied,{" "}
                <span className="mono">inferred</span> from your answers.
              </p>
              <p>
                No account, no cookies, no analytics, no uploads. Your business is stored in this browser only;
                export it from Data before clearing site data or switching devices.
              </p>
            </footer>
          </div>
        )}
      </main>
    </>
  );
}
