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
};

module.exports = nextConfig;
