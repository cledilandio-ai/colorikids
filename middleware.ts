import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const role = request.cookies.get("user_role")?.value;
    const path = request.nextUrl.pathname;

    // Protect Admin Routes (Products, Dashboard, Orders, Settings, Finance)
    const isProtectedProductRoute =
        path === "/products" ||
        path === "/products/new" ||
        (path.startsWith("/products/") && path.endsWith("/edit"));

    if (path.startsWith("/settings") || path.startsWith("/financeiro") || path.startsWith("/admin") || isProtectedProductRoute) {
        if (role !== "OWNER") {
            // If seller tries to access restricted admin routes, redirect to POS
            if (role === "SELLER") {
                return NextResponse.redirect(new URL("/pos", request.url));
            }
            // If not logged in, redirect to login
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // Protect Dashboard and Orders (Accessible by OWNER and SELLER)
    if (path.startsWith("/dashboard") || path.startsWith("/orders")) {
        if (role !== "OWNER" && role !== "SELLER") {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // Protect POS Route
    if (path.startsWith("/pos")) {
        if (!role) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/products/:path*", "/pos/:path*", "/orders/:path*", "/settings/:path*", "/financeiro/:path*", "/admin/:path*"],
};
