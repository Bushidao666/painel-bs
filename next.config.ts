import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignora erros de ESLint no build de produção
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de TypeScript no build de produção
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
