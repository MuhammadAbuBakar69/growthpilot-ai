"use client";

import { useRef } from "react";
import { scoreProfile, type Profile } from "@/lib/engine";
import { Empty, Panel, Tag } from "./ui";

export default function DataVault({
  profiles, activeId, onSelect, onDelete, onExport, onImport, onNew,
}: {
  profiles: Profile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNew: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="stack">
      <Panel
        title="Your data"
        hint={`${profiles.length} ${profiles.length === 1 ? "business" : "businesses"} on this device`}
        actions={<button className="btn btn-sm" onClick={onExport}>Export JSON</button>}
      >
        <p className="hint" style={{ marginTop: 0 }}>
          Everything lives in this browser&apos;s IndexedDB. There is no account and no server, so clearing
          site data deletes it, and another device starts empty. The export is complete and re-importable.
        </p>
        {profiles.length === 0 ? (
          <Empty>No businesses saved yet.</Empty>
        ) : (
          <table className="facts">
            <thead>
              <tr><th>Business</th><th>Score</th><th>Updated</th><th /></tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const s = scoreProfile(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => onSelect(p.id)} style={{ padding: 0, border: 0 }}>
                        {p.name}
                      </button>
                      {p.id === activeId ? <Tag>current</Tag> : null}
                      <div className="hint">{p.industry || "no industry"}</div>
                    </td>
                    <td className="num">{s.overall ?? "—"}</td>
                    <td className="dimtext mono" style={{ fontSize: 12 }}>{new Date(p.updatedAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => onDelete(p.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="form-actions">
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input
            ref={fileRef} type="file" accept="application/json" className="sr"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }}
          />
          <button className="btn btn-sm btn-ghost" onClick={onNew}>Add another business</button>
        </div>
      </Panel>
    </div>
  );
}
