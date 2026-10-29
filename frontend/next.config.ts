import type { NextConfig } from "next";
const config: NextConfig = {
  async rewrites() {
    const backend = process.env.TICKETING_V3_BACKEND_URL ?? "http://127.0.0.1:18080";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};
export default config;
