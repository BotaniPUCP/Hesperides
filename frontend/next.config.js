const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Pins the workspace root explicitly: an unrelated package-lock.json in a
  // parent directory outside this repo would otherwise make Turbopack guess.
  turbopack: {
    root: path.join(__dirname),
  },
  // Sin caché para que un cambio del service worker llegue en la siguiente visita (SPEC-120).
  async headers() {
    return [
      {
        source: '/map/demo/:asset',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
