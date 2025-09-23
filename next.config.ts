import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removendo allowedDevOrigins para evitar warnings TS
  async headers() {
    return [
      {
        source: "/(.*)", // aplica para todas as rotas
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" }, // qualquer origem
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Access-Control-Allow-Credentials", value: "true" }, // se precisar cookies
        ],
      },
    ];
  },
};

export default nextConfig;
