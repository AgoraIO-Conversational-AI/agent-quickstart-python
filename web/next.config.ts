import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
    // Enable React strict mode
    reactStrictMode: true,
    turbopack: {
        root: path.resolve(__dirname, '..'),
    },

    // Optimize images
    images: {
        unoptimized: true,
    },
}

export default nextConfig
