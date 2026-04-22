/** @type {import('next').NextConfig} */

// Lê o IP público gerado pelo setup-env.mjs para liberar o hot-reload no mobile
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const publicHostname = apiUrl ? new URL(apiUrl).hostname : null;

const nextConfig = {
  transpilePackages: ['@regcheck/ui', '@regcheck/shared', '@regcheck/validators', '@regcheck/editor-engine'],
  ...(publicHostname && publicHostname !== 'localhost'
    ? { allowedDevOrigins: [publicHostname] }
    : {}),
  // Otimizações de performance
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['@regcheck/ui', '@regcheck/shared'],
  },
  webpack: (config, { dev }) => {
    // Required for pdfjs-dist
    config.resolve.alias.canvas = false;
    
    // Otimizações para dev
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
