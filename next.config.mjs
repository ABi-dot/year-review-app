/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
