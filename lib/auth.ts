import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = "SUPER_ADMIN" | "OWNER" | "SELLER";

export interface AuthContext {
  userId: string;
  storeId: string | null; // null apenas para SUPER_ADMIN
  role: UserRole;
  name: string;
}

export interface TokenPayload {
  sub: string;       // userId
  storeId: string | null;
  role: UserRole;
  name: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "colorikids-saas-secret-change-in-production-32chars"
);

const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "7d";

// ─── Assinar Token ────────────────────────────────────────────────────────────

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    storeId: payload.storeId,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// ─── Verificar Token ──────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      storeId: (payload.storeId as string) || null,
      role: payload.role as UserRole,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

// ─── Obter contexto de auth a partir do Request (API Routes) ─────────────────

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token =
    request.cookies.get(COOKIE_NAME)?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    storeId: payload.storeId,
    role: payload.role,
    name: payload.name,
  };
}

// ─── Obter contexto de auth a partir de Server Components (next/headers) ─────

export async function getServerAuthContext(): Promise<AuthContext | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    storeId: payload.storeId,
    role: payload.role,
    name: payload.name,
  };
}

// ─── Guards de API Route ──────────────────────────────────────────────────────

/**
 * Garante que o request tem auth válida E pertence a uma loja.
 * Retorna o AuthContext ou lança um Response 401/403.
 */
export async function requireStoreAuth(request: NextRequest): Promise<AuthContext> {
  const ctx = await getAuthContext(request);

  if (!ctx) {
    throw new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ctx.storeId) {
    throw new Response(JSON.stringify({ error: "Contexto de loja inválido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return ctx;
}

/**
 * Garante que o request é de um SUPER_ADMIN.
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthContext> {
  const ctx = await getAuthContext(request);

  if (!ctx || ctx.role !== "SUPER_ADMIN") {
    throw new Response(JSON.stringify({ error: "Acesso restrito ao Super Admin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return ctx;
}

// ─── Nome do cookie (exportado para uso no login/logout) ─────────────────────

export { COOKIE_NAME };
