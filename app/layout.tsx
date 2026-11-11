import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowthPilot AI — evidence-based growth strategy",
  description:
    "Analyze a business and its website, find what is limiting growth, and get a prioritized 30/60/90 plan where every recommendation states its evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
