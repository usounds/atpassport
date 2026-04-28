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

  transpilePackages: ["@atpassport/client"],

  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['dev.atpassport.net', 'localhost:3001'],
    },
  },
  allowedDevOrigins: ['dev.atpassport.net', 'localhost:3001'],

  async headers() {
    const isProduction = process.env.NEXT_PUBLIC_URL === 'https://atpassport.net';
    const commonHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
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
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.bsky.app https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' https: https://cloudflareinsights.com; frame-src 'self' https://embed.bsky.app; upgrade-insecure-requests;",
      },
    ];

    if (!isProduction) {
      commonHeaders.push({
        key: "X-Robots-Tag",
        value: "noindex, nofollow",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: commonHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
