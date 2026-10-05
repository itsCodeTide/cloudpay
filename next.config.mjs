/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Allow cross-origin requests to backend API in development
  async rewrites() {
    return process.env.NEXT_PUBLIC_API_URL?.includes('localhost')
      ? []  // handled by the frontend directly
      : []
  },
}

export default nextConfig
