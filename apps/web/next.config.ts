import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@campustable/auth",
    "@campustable/db",
    "@campustable/email",
    "@campustable/storage",
    "@campustable/analytics",
    "@campustable/observability",
    "@campustable/shared",
    "@campustable/config",
    "@campustable/ui",
  ],
};

export default nextConfig;
