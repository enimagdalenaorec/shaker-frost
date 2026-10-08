import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // style references for the dish illustration, read from disk by lib/ai/dish-art.ts
  outputFileTracingIncludes: {
    "/api/veganize": ["./public/illustrations/sarma-pot.png", "./public/illustrations/burek.png"],
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
