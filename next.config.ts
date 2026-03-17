import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent MIME-type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Force HTTPS for 1 year, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Stop leaking referrer to third-party sites
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Lock down browser features you don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content Security Policy
  // Currently: static/SSG site, no user input, no API routes
  // Tighten further when adding AI-backed features
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs inline scripts for hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Allow inline styles (used by the site's component styling)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs (for any base64 inline images)
      "img-src 'self' data:",
      // No external connections for now
      "connect-src 'self'",
      // Prevent framing from any origin
      "frame-ancestors 'none'",
      // Block all plugins (Flash etc.)
      "object-src 'none'",
      // Only load resources over HTTPS
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
