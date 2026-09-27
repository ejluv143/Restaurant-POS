import type { NextConfig } from "next";

// GITHUB_PAGES=1 builds a static export for GitHub Pages (see .github/workflows/pages.yml).
// Pages can't run the room-order API, so that build ships without in-room QR ordering.
const pages = process.env.GITHUB_PAGES === "1";

// Server build only (static hosting can't send headers): block framing of the sign-in and POS
// screens (clickjacking), MIME sniffing, and leaking full URLs (which carry table QR tokens) to other sites.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = pages
  ? { output: "export", basePath: "/Restaurant-POS", trailingSlash: true, images: { unoptimized: true } }
  : {
      poweredByHeader: false,
      headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
    };

export default nextConfig;
