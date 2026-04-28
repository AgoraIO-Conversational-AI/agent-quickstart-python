import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Proxy API requests to Python backend
    if (pathname.startsWith('/api/')) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const backendPath = pathname.replace('/api', '')
        const backendUrl = new URL(backendPath, apiUrl)

        // Copy search params
        request.nextUrl.searchParams.forEach((value, key) => {
            backendUrl.searchParams.set(key, value)
        })

        return NextResponse.rewrite(backendUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
