import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "colorikids-saas-secret-change-in-production-32chars"
);

const COOKIE_NAME = "auth_token";

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = ["/login", "/products", "/api/auth/login", "/api/products/public"];

async function getTokenPayload(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Deixa rotas públicas passarem
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const payload = await getTokenPayload(request);
  const role = payload?.role as string | undefined;
  const storeId = payload?.storeId as string | undefined;

  // ── Rotas Super Admin ────────────────────────────────────────────────────────
  if (path.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // ── Rotas que exigem login (qualquer role com storeId) ────────────────────
  const requiresAuth = ["/admin", "/dashboard", "/orders", "/pos", "/settings", "/products/new", "/financeiro", "/clientes", "/caixas", "/finance"];
  const needsAuth = requiresAuth.some((r) => path.startsWith(r));

  if (needsAuth) {
    if (!payload) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!storeId) {
      if (role === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/super-admin", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ── Rotas restritas ao OWNER ───────────────────────────────────────────────
  const ownerOnly = ["/admin", "/settings", "/financeiro", "/finance"];
  const isOwnerOnly = ownerOnly.some((r) => path.startsWith(r));

  if (isOwnerOnly && role !== "OWNER" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  // ── Rotas edit de produto ──────────────────────────────────────────────────
  const isProductEdit = path.startsWith("/products/") && path.endsWith("/edit");
  if ((path === "/products/new" || isProductEdit) && role !== "OWNER" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/pos/:path*",
    "/orders/:path*",
    "/settings/:path*",
    "/financeiro/:path*",
    "/finance/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/clientes/:path*",
    "/caixas/:path*",
  ],
};
