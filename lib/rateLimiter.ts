/**
 * Rate Limiter — Upstash Redis + Fallback in-memory
 * --------------------------------------------------
 * Produção: Redis via @upstash/ratelimit (sliding window, HTTP-based, serverless-friendly).
 * Desenvolvimento: fallback in-memory (Map) quando Redis não está configurado.
 *
 * Configuração:
 *   UPSTASH_REDIS_REST_URL  → URL do Redis REST API (ex: https://us1-xxxx.upstash.io)
 *   UPSTASH_REDIS_REST_TOKEN → Token de autenticação do Redis
 *
 * Sem essas env vars, o rate limiter opera em modo in-memory (dev local).
 */

import { NextResponse } from "next/server";
import { securityLog, logger } from "./logger";

export interface RateLimitConfig {
  windowMs: number;    // Janela de tempo em ms
  maxRequests: number; // Requests máximos na janela
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number };

// ─── Config Redis ──────────────────────────────────────────────────────────────

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const hasRedis = !!(UPSTASH_URL && UPSTASH_TOKEN);

// Módulo Upstash — lazy initialization na primeira chamada do checkRateLimit
let redisClient: import("@upstash/redis").Redis | null = null;
let upstashRatelimit: typeof import("@upstash/ratelimit") | null = null;
let initPromise: Promise<void> | null = null;

async function ensureRedis(): Promise<void> {
  if (initPromise) return initPromise;
  if (!hasRedis) return;

  initPromise = (async () => {
    try {
      const { Redis } = await import("@upstash/redis");
      const ratelimitModule = await import("@upstash/ratelimit");
      redisClient = new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! });
      upstashRatelimit = ratelimitModule;
      logger.info({ url: UPSTASH_URL!.split(".upstash.io")[0] + "...upstash.io" }, "Redis rate limiter initialized");
    } catch (error) {
      logger.error({ err: error }, "Failed to initialize Redis rate limiter — falling back to in-memory");
    }
  })();

  return initPromise;
}

// ─── Fallback in-memory ────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

function checkInMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  if (entry && entry.resetAt <= now) {
    memoryStore.delete(identifier);
  }

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    if (entry.count === config.maxRequests) {
      securityLog("RATE_LIMIT_EXCEEDED", { identifier, limit: config.maxRequests, windowMs: config.windowMs, mode: "memory" }, "warn");
    }
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Cache de RateLimiters Upstash por configuração
const ratelimitInstances = new Map<string, ReturnType<typeof createUpstashLimiter>>();

function createUpstashLimiter(config: RateLimitConfig) {
  if (!redisClient || !upstashRatelimit) return null;

  const windowSec = `${config.windowMs / 1000} s` as const;
  return new upstashRatelimit.Ratelimit({
    redis: redisClient,
    limiter: upstashRatelimit.Ratelimit.slidingWindow(config.maxRequests, windowSec),
    analytics: true,
    prefix: "freebuff",
  });
}

function getUpstashLimiter(config: RateLimitConfig) {
  const key = `${config.maxRequests}:${config.windowMs}`;
  if (!ratelimitInstances.has(key)) {
    ratelimitInstances.set(key, createUpstashLimiter(config));
  }
  return ratelimitInstances.get(key) ?? null;
}

// ─── checkRateLimit (ponto de entrada principal) ───────────────────────────────

/**
 * Verifica se uma requisição está dentro do limite de taxa.
 *
 * Usa Redis via Upstash quando configurado; fallback in-memory caso contrário.
 *
 * @param identifier  Identificador único (ex: `auth:login:ip-192.168.1.1`)
 * @param config      Configuração da janela
 * @returns           `{ allowed: true }` ou `{ allowed: false, retryAfter: segundos }`
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  // Garante que Redis foi inicializado (lazy init)
  await ensureRedis();

  // Tenta Redis primeiro
  if (redisClient && upstashRatelimit) {
    try {
      const limiter = getUpstashLimiter(config);
      if (limiter) {
        const { success, reset } = await limiter.limit(identifier);
        if (!success) {
          securityLog("RATE_LIMIT_EXCEEDED", { identifier, limit: config.maxRequests, windowMs: config.windowMs, mode: "redis" }, "warn");
          const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
          return { allowed: false, retryAfter };
        }
        return { allowed: true };
      }
    } catch (error) {
      logger.error({ err: error, identifier }, "Redis rate limiter failed — falling back to in-memory");
      redisClient = null; // Desabilita Redis até próximo reload
    }
  }

  // Fallback in-memory
  return checkInMemory(identifier, config);
}

/**
 * Extrai o IP do cliente a partir dos headers da requisição.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Helpers de configuração por domínio
 */
export const RATE_LIMITS = {
  LOGIN: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,
  REGISTER: { windowMs: 60_000, maxRequests: 3 } as RateLimitConfig,
  CHANGE_PASSWORD: { windowMs: 60_000, maxRequests: 3 } as RateLimitConfig,
  VERIFY_OWNER: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,
  UPLOAD: { windowMs: 60_000, maxRequests: 10 } as RateLimitConfig,
  ORDERS: { windowMs: 60_000, maxRequests: 30 } as RateLimitConfig,
} as const;

/**
 * Helper para criar mensagem de erro 429 padronizada.
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: `Muitas requisições. Tente novamente em ${retryAfter} segundo${retryAfter === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
