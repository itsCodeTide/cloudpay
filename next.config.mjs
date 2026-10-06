/** @type {import('next').NextConfig} */
const nextConfig = {
  // Render's Docker image runs the standalone server, while Vercel provides
  // its own Next.js runtime and must use the standard output structure.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
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
