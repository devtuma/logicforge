import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite build sem banco de dados conectado (modo offline)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
