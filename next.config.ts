import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
  /** @type {import('next').NextConfig} */
  reactStrictMode: true,
  experimental: {
}
};

export default nextConfig;
