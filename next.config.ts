import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // A deployment candidate is its own build root; shared uploads attach only after build.
  turbopack: { root: process.cwd() },
  // Explicit preview hosts only; account APIs retain their loopback-only guard.
  allowedDevOrigins: (process.env.TOWN_DEV_ORIGINS || '').split(',').map(v => v.trim()).filter(v => /^[a-zA-Z0-9.-]+$/.test(v)),
};

export default nextConfig;
