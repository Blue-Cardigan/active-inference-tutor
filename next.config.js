/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      turbo: {
        resolveAlias: {
          canvas: './empty.js',
        },
      },
    },
  };
  
module.exports = nextConfig;