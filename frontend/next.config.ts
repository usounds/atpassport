import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      allowedOrigins: ['dev.atpassport.net', '192.168.1.120:3001', '127.0.0.1:3001', 'localhost:3001'],
    },
  },
  allowedDevOrigins: ['dev.atpassport.net', '192.168.1.120', '127.0.0.1', 'localhost'],
};

export default withNextIntl(nextConfig);
