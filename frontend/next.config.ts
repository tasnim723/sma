import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    // Ensure modules resolve from the frontend directory
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      "node_modules",
    ];

    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        jspdf: false,
        fflate: false,
      };
    }
    return config;
  },
};

export default nextConfig;
