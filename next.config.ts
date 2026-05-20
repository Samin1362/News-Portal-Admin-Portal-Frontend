import type { NextConfig } from "next";

/**
 * Security headers — applied to every response. The admin portal manages
 * role assignments + content moderation, so we lock it down harder than
 * the public site: DENY framing, no MIME-sniff, strict referrer.
 *
 * Permissions-Policy disables APIs the admin app doesn't use; if a future
 * feature needs camera/mic/geolocation, allowlist it explicitly here.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
