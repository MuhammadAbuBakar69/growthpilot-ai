import type { NextConfig } from "next";

/**
 * Static export: the app is a single page that runs entirely in the browser, so the build output is
 * plain files. GitHub Pages serves it with no server, no environment variables and no runtime.
 * BASE_PATH lets it live under /growthpilot-ai on Pages while staying at / locally.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
