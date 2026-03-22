/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@regcheck/ui', '@regcheck/shared', '@regcheck/validators', '@regcheck/editor-engine'],
  webpack: (config) => {
    // Required for pdfjs-dist
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
