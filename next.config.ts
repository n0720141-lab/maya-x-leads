import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  allowedDevOrigins: [
    "*.pinggy.net",
    "*.pinggy-free.link",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  serverExternalPackages: [
    "playwright",
    "nodemailer",
    "@whiskeysockets/baileys",
    "qrcode",
    "jimp",
    "pino",
    "sharp",
  ],
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;