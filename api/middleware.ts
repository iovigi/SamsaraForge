import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const origin = request.headers.get("origin");
    console.log("Middleware called for path:", request.nextUrl.pathname);
    console.log("Request origin:", origin);

    // Define allowed origins
    // In production, you might want to restrict this to specific domains
    // For now, we'll allow all origins but specifically mirror the request origin
    // to support Access-Control-Allow-Credentials: true

    const response = NextResponse.next();

    // Handling CORS
    if (origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
        "Access-Control-Allow-Methods",
        "GET,DELETE,PATCH,POST,PUT,OPTIONS"
    );
    response.headers.set(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );

    // Handle preflight requests
    if (request.method === "OPTIONS") {
        return new NextResponse(null, {
            status: 200,
            headers: response.headers,
        });
    }

    return response;
}

export const config = {
    matcher: "/api/:path*",
};
