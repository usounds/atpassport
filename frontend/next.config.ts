import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "sst",
    "@atcute/client",
    "@atcute/identity",
    "@atcute/identity-resolver",
    "@atcute/identity-resolver-node",
    "@atcute/bluesky",
    "@atcute/crypto",
    "@atcute/multibase"
  ],

  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: process.env.NODE_ENV === "development" ? {
    root: path.join(__dirname, ".."),
  } : undefined,
  experimental: {
    serverActions: {
      allowedOrigins: ['atpassport.net', 'dev.atpassport.net', 'localhost:3001'],
    },
  },
  allowedDevOrigins: ['atpassport.net', 'dev.atpassport.net', 'localhost:3001'],
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.bsky.app; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self' https://embed.bsky.app; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
