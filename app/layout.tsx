import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowthPilot — where this business grows next",
  description:
    "A local-first growth analysis for a real business: a scored diagnosis, findings that state their evidence, and a 30/60/90 plan. No account, no server.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <noscript>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #1e222b", color: "#e9ecf2", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
            GrowthPilot runs entirely in your browser, so it needs JavaScript. Nothing is uploaded either
            way: there is no server to send it to.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
