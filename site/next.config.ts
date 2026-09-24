import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les bindings natifs de libsql ne doivent pas être bundlés par Turbopack.
  serverExternalPackages: ["@libsql/client", "libsql"],
  reactStrictMode: true,
};

export default nextConfig;
