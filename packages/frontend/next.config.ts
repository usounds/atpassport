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
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.bsky.app https://static.cloudflareinsights.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' blob: data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https: https://cloudflareinsights.com",
          "frame-src 'self' https://embed.bsky.app",
          ...(isProduction ? ["upgrade-insecure-requests"] : []),
        ].join("; "),
      },
    ];

    if (isProduction) {
      commonHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    if (!isProduction) {
      commonHeaders.push({
        key: "X-Robots-Tag",
        value: "noindex, nofollow",
      });
    }

    const noCacheHeaders = [
      {
        key: "Cache-Control",
        value: "private, no-store, max-age=0, must-revalidate",
      },
      {
        key: "Pragma",
        value: "no-cache",
      },
      {
        key: "Vary",
        value: "Cookie",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: commonHeaders,
      },
      {
        source: "/:path*",
        headers: noCacheHeaders,
      },
    ];
  },

  webpack(config, { isServer }) {
    if (process.env.E2E_COVERAGE === "true" && !isServer) {
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        include: [
          path.join(__dirname, "src", "app"),
          path.join(__dirname, "src", "components"),
          path.join(__dirname, "src", "providers"),
        ],
        exclude: [
          /\.test\.[jt]sx?$/,
          /__tests__/,
          /\/test\//,
          /\/proxy\.ts$/,
          /\/developers\/verify\/DeveloperPortal\.tsx$/,
          /\/developers\/verify\/DomainList\.tsx$/,
          /\/developers\/verify\/VerifyDomainStepper\.tsx$/,
          /\/example\/ExampleAppClient\.tsx$/,
          /\/AuthAccountItem\.tsx$/,
          /\/AuthAccountList\.tsx$/,
          /\/AssociationListClient\.tsx$/,
          /\/BlueskyEmbedManager\.tsx$/,
          /\/CustomBadge\.tsx$/,
          /\/Header\.tsx$/,
          /\/RegisterForm\.tsx$/,
          /\/ShareModal\.tsx$/,
          /\.d\.ts$/,
        ],
        use: {
          loader: "babel-loader",
          options: {
            babelrc: false,
            configFile: false,
            presets: ["next/babel"],
            plugins: [
              [
                "istanbul",
                {
                  cwd: __dirname,
                  extension: [".ts", ".tsx"],
                  exclude: [
                    "src/**/*.test.*",
                    "src/**/__tests__/**",
                    "src/test/**",
                    "src/proxy.ts",
                    "src/**/*.d.ts",
                  ],
                },
              ],
            ],
            cacheDirectory: true,
          },
        },
      });
    }

    return config;
  },
};

export default withNextIntl(nextConfig);
