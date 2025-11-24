import { NextRequest, NextResponse } from "next/server";

function getCookieValue(cookieString: string, name: string): string | null {
    const value = `; ${cookieString}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ["/login", "/"];
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith("/_next/"),
    );

    // API routes are handled separately
    if (pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    // Check if user is authenticated
    const token = getCookieValue(request.cookies.toString(), "auth_token");

    if (!token && !isPublicRoute) {
        // Redirect to login if not authenticated and trying to access protected route
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (token && pathname === "/login") {
        // Redirect authenticated users away from login page
        return NextResponse.redirect(new URL("/", request.url));
    }

    // For protected routes, let the page component handle permission checks
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
