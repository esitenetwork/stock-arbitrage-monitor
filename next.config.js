/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    domains: ['stockx-assets.imgix.net', 'images.stockx.com'],
  },
  trailingSlash: true,
  assetPrefix: process.env.NODE_ENV === 'production' ? '/stock-arbitrage-monitor' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/stock-arbitrage-monitor' : '',
}

module.exports = nextConfig
