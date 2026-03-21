import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "@atcute/client",
    "@atcute/identity",
    "@atcute/identity-resolver",
    "@atcute/identity-resolver-node",
    "@atcute/bluesky"
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ['atpassport.net', 'dev.atpassport.net', 'localhost:3001'],
    },
  },
  allowedDevOrigins: ['atpassport.net', 'dev.atpassport.net', 'localhost:3001'],
};

export default withNextIntl(nextConfig);
