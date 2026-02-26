import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Proxy API requests to Python backend
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/:path*`,
            },
        ]
    },

    // Enable React strict mode
    reactStrictMode: true,

    // Optimize images
    images: {
        unoptimized: true,
    },
}

export default nextConfig
