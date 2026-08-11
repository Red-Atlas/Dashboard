/** @type {import('next').NextConfig} */

// Applied to every route. The dashboard is internal-only, so we assert
// "do not index" at the HTTP layer as well as in the page metadata — the
// header is the part crawlers honour even when they never parse the HTML.
const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate",
  },
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  // `eslint` config key was removed in Next 16; linting is a separate
  // `pnpm lint` step now. Type errors are no longer ignored either — the
  // build should fail loudly instead of shipping broken code.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Don't advertise the framework version.
  poweredByHeader: false,

  images: {
    // Optimisation is on (it was disabled before, so the 31 KB logo was
    // shipped raw on every screen). Only local assets are used.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...noIndexHeaders, ...securityHeaders],
      },
      {
        // Metrics endpoints are per-viewer and must never be stored by a
        // shared cache. Each route sets its own s-maxage for the CDN.
        source: "/api/:path*",
        headers: [
          ...noIndexHeaders,
          { key: "Vary", value: "Cookie" },
        ],
      },
      {
        source: "/sounds/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
