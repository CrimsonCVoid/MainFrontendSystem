/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Konva's node build imports the native `canvas` package, which is
    // only needed for server-side rendering we don't do (the labeler
    // canvas is loaded via next/dynamic with ssr:false). Externalize so
    // webpack doesn't try to bundle it.
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
};

module.exports = nextConfig;
