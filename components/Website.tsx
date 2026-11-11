"use client";

import { useState } from "react";
import { extractSiteFacts, type Profile, type SiteFacts } from "@/lib/engine";
import { Empty, Panel } from "./ui";

const yes = (v: boolean) => (v ? "yes" : "no");

export default function Website({
  profile, onFacts,
}: { profile: Profile; onFacts: (facts: SiteFacts | null) => void }) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const facts = profile.site;

  const analyze = () => {
    const trimmed = html.trim();
    if (trimmed.length < 40) {
      setError("Paste the page source, not just a sentence: on most browsers Ctrl+U opens it.");
      return;
    }
    setError(null);
    onFacts(extractSiteFacts(trimmed, profile.website || null));
  };

  return (
    <div className="stack">
      <Panel title="Website facts" hint={facts ? "measured" : "nothing measured yet"}>
        {!facts ? (
          <>
            <p className="hint" style={{ marginTop: 0 }}>
              Open your homepage, press <span className="mono">Ctrl+U</span> (or Cmd+U), select all, and paste
              it here. Nothing is uploaded: the parsing happens in this tab, which is also why there is no
              crawl. A page built by JavaScript will look thinner than it is, and is labelled accordingly.
            </p>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<html> … paste your page source … </html>"
              spellCheck={false}
            />
            {error ? <div className="banner bad" style={{ marginTop: 10 }}>{error}</div> : null}
            <div className="form-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={analyze} disabled={html.trim().length === 0}>
                Read the page
              </button>
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                or upload the .html file
                <input
                  type="file" accept=".html,text/html" className="sr"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setHtml(text);
                    setError(null);
                    onFacts(extractSiteFacts(text, profile.website || null));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <table className="facts">
              <thead>
                <tr><th>Fact</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Title</td><td>{facts.title ?? <span className="dimtext">none found</span>}</td></tr>
                <tr><td>Title length</td><td className="num">{facts.titleLength}</td></tr>
                <tr><td>Meta description</td><td>{facts.metaDescription ?? <span className="dimtext">none found</span>}</td></tr>
                <tr><td>H1 headlines</td><td className="num">{facts.h1.length}{facts.h1.length > 0 ? ` — ${facts.h1.join(" · ")}` : ""}</td></tr>
                <tr><td>H2 sections</td><td className="num">{facts.h2Count}</td></tr>
                <tr><td>Words in text</td><td className="num">{facts.wordCount}</td></tr>
                <tr><td>Action words</td><td className="num">{facts.ctaMatches}</td></tr>
                <tr><td>Phone</td><td>{yes(facts.hasPhone)}</td></tr>
                <tr><td>Email</td><td>{yes(facts.hasEmail)}</td></tr>
                <tr><td>Form</td><td>{yes(facts.hasForm)}</td></tr>
                <tr><td>Images</td><td className="num">{facts.imageCount}</td></tr>
                <tr><td>Images missing alt</td><td className="num">{facts.imagesMissingAlt}</td></tr>
                <tr><td>Viewport tag</td><td>{yes(facts.viewportMeta)}</td></tr>
                <tr><td>Price mentioned</td><td>{yes(facts.mentionsPrice)}</td></tr>
                <tr><td>Social links</td><td>{facts.socialLinks.length ? facts.socialLinks.join(", ") : <span className="dimtext">none found</span>}</td></tr>
              </tbody>
            </table>
            <div className="form-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => { onFacts(null); setHtml(""); }}>
                Clear and re-read
              </button>
              <span className="hint">Findings marked “measured” come from exactly these values.</span>
            </div>
          </>
        )}
      </Panel>

      {!facts ? <Empty>No page read yet. Findings stay limited to what you answered until one is.</Empty> : null}
    </div>
  );
}
