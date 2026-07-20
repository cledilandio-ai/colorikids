import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { handleCorsPreflight, addCorsHeaders } from "@/lib/cors";

const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
  throw new Error(
    "JWT_SECRET environment variable is required. " +
    "Set it in .env.local or Vercel Environment Variables."
  );
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_ENV);

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

  // ── CORS Preflight (OPTIONS) — para TODAS as rotas (incluindo /api/*) ────
  if (request.method === "OPTIONS") {
    return handleCorsPreflight(request);
  }

  // Constrói a resposta e já aplica CORS via helper no final
  let response = NextResponse.next();

  // Deixa rotas públicas passarem
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    const res = NextResponse.next();
    addCorsHeaders(res, request);
    return res;
  }

  const payload = await getTokenPayload(request);
  const role = payload?.role as string | undefined;
  const storeId = payload?.storeId as string | undefined;

  // ── Rotas Super Admin ────────────────────────────────────────────────────────
  if (path.startsWith("/super-admin")) {
    if (role !== "SUPER_ADMIN") {
      response = NextResponse.redirect(new URL("/login", request.url));
    }
    addCorsHeaders(response, request);
    return response;
  }

  // ── Rotas que exigem login (qualquer role com storeId) ────────────────────
  const requiresAuth = ["/admin", "/dashboard", "/orders", "/pos", "/settings", "/products/new", "/financeiro", "/clientes", "/caixas", "/finance"];
  const needsAuth = requiresAuth.some((r) => path.startsWith(r));

  if (needsAuth) {
    if (!payload) {
      response = NextResponse.redirect(new URL("/login", request.url));
      addCorsHeaders(response, request);
      return response;
    }
    if (!storeId) {
      if (role === "SUPER_ADMIN") {
        response = NextResponse.redirect(new URL("/super-admin", request.url));
      } else {
        response = NextResponse.redirect(new URL("/login", request.url));
      }
      addCorsHeaders(response, request);
      return response;
    }
  }

  // ── Rotas restritas ao OWNER ───────────────────────────────────────────────
  const ownerOnly = ["/admin", "/settings", "/financeiro", "/finance"];
  const isOwnerOnly = ownerOnly.some((r) => path.startsWith(r));

  if (isOwnerOnly && role !== "OWNER" && role !== "SUPER_ADMIN") {
    response = NextResponse.redirect(new URL("/pos", request.url));
    addCorsHeaders(response, request);
    return response;
  }

  // ── Rotas edit de produto ──────────────────────────────────────────────────
  const isProductEdit = path.startsWith("/products/") && path.endsWith("/edit");
  if ((path === "/products/new" || isProductEdit) && role !== "OWNER" && role !== "SUPER_ADMIN") {
    response = NextResponse.redirect(new URL("/pos", request.url));
    addCorsHeaders(response, request);
    return response;
  }

  // ── Resposta padrão com CORS ──────────────────────────────────────────────
  addCorsHeaders(response, request);
  return response;
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
    "/api/:path*",
  ],
};
