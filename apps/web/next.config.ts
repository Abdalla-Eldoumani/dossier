import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — the entire site is a folder of HTML/CSS/JS that runs anywhere.
  // No server-side runtime, no opportunity for accidental network calls touching user data.
  output: "export",

  // Trailing slash makes file:// previews work consistently.
  trailingSlash: true,

  // No image optimization at build time — every image must work via static `<img>` since there's no Next image server.
  images: {
    unoptimized: true,
  },

  // Strictest mode.
  reactStrictMode: true,

  // Ship source maps for the production bundle so Lighthouse "valid-source-maps"
  // passes and so anyone debugging the static export gets readable stack traces.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
