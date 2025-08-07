/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['stockx-assets.imgix.net', 'images.stockx.com'],
  },
  output: 'export',
  trailingSlash: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? '/stock-arbitrage-monitor' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/stock-arbitrage-monitor' : '',
}

module.exports = nextConfig
