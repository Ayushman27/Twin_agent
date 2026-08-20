/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  webpack: (config) => {
    config.resolve.modules.push(path.resolve(__dirname, 'node_modules'));
    return config;
  },
};

module.exports = nextConfig;
