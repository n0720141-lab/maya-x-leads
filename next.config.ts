import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  serverExternalPackages: [
    "playwright",
    "nodemailer",
    "@whiskeysockets/baileys",
    "qrcode",
    "jimp",
    "pino",
    "sharp",
  ],
  // Ensure these packages are NOT bundled but treated as external
  experimental: {
    // List packages that should remain as node_modules in standalone output
    optimizePackageImports: [],
  },
};

export default nextConfig;