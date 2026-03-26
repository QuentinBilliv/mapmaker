/** @type {import('next').NextConfig} */

const sharedCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://raw.githubusercontent.com https://*.tile.opentopomap.org https://*.convex.cloud",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://www.geoboundaries.org https://raw.githubusercontent.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://*.tile.opentopomap.org https://demotiles.maplibre.org https://nominatim.openstreetmap.org",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [...sharedCsp, "frame-ancestors *"].join("; "),
          },
          ...securityHeaders,
        ],
      },
      {
        source: "/((?!embed/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [...sharedCsp, "frame-ancestors 'none'"].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
