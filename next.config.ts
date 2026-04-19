import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    resolveAlias: {
      html2canvas: "html2canvas-pro",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      html2canvas: "html2canvas-pro",
    };

    return config;
  },
};

export default nextConfig;
