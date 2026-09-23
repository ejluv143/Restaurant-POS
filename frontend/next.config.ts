import type { NextConfig } from "next";

// GITHUB_PAGES=1 builds a static export for GitHub Pages (see .github/workflows/pages.yml).
// Pages can't run the room-order API, so that build ships without in-room QR ordering.
const pages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = pages
  ? { output: "export", basePath: "/Restaurant-POS", trailingSlash: true, images: { unoptimized: true } }
  : {};

export default nextConfig;
