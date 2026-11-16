import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Проксирование запросов к Laravel API (в dev — http://localhost:8000).
    // Через те же реврайты работают относительные пути картинок из /storage.
    const internal = process.env.API_URL_INTERNAL || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${internal}/api/:path*` },
      { source: "/sanctum/:path*", destination: `${internal}/sanctum/:path*` },
      { source: "/storage/:path*", destination: `${internal}/storage/:path*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
