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
      <body>{children}</body>
    </html>
  );
}
