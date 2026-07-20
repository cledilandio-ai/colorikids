/**
 * CORS Utility
 * -------------
 * Configuração centralizada de CORS para toda a aplicação.
 * Origens permitidas configuráveis via env var CORS_ORIGINS.
 *
 * Uso no middleware.ts:
 *   if (request.method === "OPTIONS") return handleCorsPreflight(request);
 *   addCorsHeaders(response, request);
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "./logger";

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Origens permitidas. Configuradas via env var CORS_ORIGINS (separadas por vírgula).
 * Fallback seguro: apenas o próprio domínio em produção.
 *
 * Exemplo: CORS_ORIGINS=https://meusite.com,https://app.meusite.com
 */
function getAllowedOrigins(): string[] {
  const env = process.env.CORS_ORIGINS;
  if (env) {
    return env.split(",").map((o) => o.trim()).filter(Boolean);
  }

  // Fallback por ambiente
  if (process.env.NODE_ENV === "production") {
    return []; // Em produção, sem CORS aberto — apenas mesma origem
  }

  // Dev: permite localhost e tunnel
  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}

const ALLOWED_ORIGINS = getAllowedOrigins();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica se uma origem está na lista de permitidas.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length === 0) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Retorna o valor do header Access-Control-Allow-Origin para uma request.
 * Se a origem não for permitida, retorna null (origem não será listada).
 */
function getAllowOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (isOriginAllowed(origin)) return origin;
  return null;
}

// ─── CORS Headers ────────────────────────────────────────────────────────────

/**
 * Retorna os headers CORS para uma request específica.
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const allowOrigin = getAllowOrigin(request);
  const headers: Record<string, string> = {};

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With";
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Max-Age"] = "86400"; // 24h cache para preflight
  }

  return headers;
}

// ─── Preflight Handler ───────────────────────────────────────────────────────

/**
 * Handler para requisições OPTIONS (preflight).
 * Retorna 204 No Content com headers CORS adequados.
 * Se a origem não for permitida, retorna 204 sem headers CORS (navegador bloqueia).
 */
export function handleCorsPreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  const headers = getCorsHeaders(request);
  const hasCors = !!headers["Access-Control-Allow-Origin"];

  if (!hasCors && origin) {
    logger.warn(
      { origin, allowedOrigins: ALLOWED_ORIGINS },
      "CORS preflight blocked: origin not allowed",
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...headers,
      "Content-Length": "0",
    },
  });
}

// ─── Apply CORS to Response ─────────────────────────────────────────────────

/**
 * Adiciona headers CORS a uma resposta existente.
 * Deve ser chamado antes de retornar qualquer resposta no middleware.
 */
export function addCorsHeaders(response: NextResponse, request: NextRequest): void {
  const headers = getCorsHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}
