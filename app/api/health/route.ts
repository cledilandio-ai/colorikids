import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Health check do sistema — verifica conectividade de todos os serviços
 * essenciais: banco de dados, JWT signing, Supabase Storage e env vars.
 *
 * Uso: monitoramento externo (UptimeRobot, Better Uptime, etc.)
 * Resposta: 200 se tudo OK, 503 se algum serviço crítico falhar
 */
export async function GET() {
  const checks: Record<string, { status: string; duration: string; error?: string }> = {};
  const start = Date.now();
  let allHealthy = true;

  // ── 1. Variáveis de Ambiente ──────────────────────────────────────────────
  const envChecks = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  const envOk = Object.values(envChecks).every(Boolean);
  const envMissing = Object.entries(envChecks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  checks.env = {
    status: envOk ? "ok" : "degraded",
    duration: "0ms",
    ...(envMissing.length > 0 && { error: `Missing: ${envMissing.join(", ")}` }),
  };
  if (!envOk) allHealthy = false;

  // ── 2. Banco de Dados (Prisma) ──────────────────────────────────────────
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", duration: `${Date.now() - dbStart}ms` };
  } catch (error: any) {
    checks.database = {
      status: "error",
      duration: "0ms",
      error: error.message || "Database connection failed",
    };
    allHealthy = false;
    logger.error({ err: error }, "Health check: database failed");
  }

  // ── 3. JWT Signing ──────────────────────────────────────────────────────
  try {
    const jwtStart = Date.now();
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback");
    await new SignJWT({ test: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1s")
      .sign(secret);
    checks.jwt = { status: "ok", duration: `${Date.now() - jwtStart}ms` };
  } catch (error: any) {
    checks.jwt = {
      status: "error",
      duration: "0ms",
      error: error.message || "JWT signing failed",
    };
    allHealthy = false;
    logger.error({ err: error }, "Health check: JWT failed");
  }

  // ── 4. Supabase Storage ─────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const sbStart = Date.now();
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.storage.listBuckets();
      checks.supabase = {
        status: error ? "degraded" : "ok",
        duration: `${Date.now() - sbStart}ms`,
        ...(error && { error: error.message }),
      };
      if (error) allHealthy = false;
    } catch (error: any) {
      checks.supabase = {
        status: "error",
        duration: "0ms",
        error: error.message || "Supabase connection failed",
      };
      allHealthy = false;
      logger.error({ err: error }, "Health check: Supabase failed");
    }
  } else {
    checks.supabase = {
      status: "skipped",
      duration: "0ms",
      error: "Supabase credentials not configured",
    };
  }

  // ── 5. Redis (Upstash Rate Limiter) ──────────────────────────────────────
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const redisStart = Date.now();
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const pong = await redis.ping();
      checks.redis = {
        status: pong === "PONG" ? "ok" : "degraded",
        duration: `${Date.now() - redisStart}ms`,
        ...(pong !== "PONG" && { error: `Unexpected ping response: ${pong}` }),
      };
      if (pong !== "PONG") allHealthy = false;
    } catch (error: any) {
      checks.redis = {
        status: "error",
        duration: "0ms",
        error: error.message || "Redis ping failed",
      };
      allHealthy = false;
      logger.error({ err: error }, "Health check: Redis failed");
    }
  } else {
    checks.redis = {
      status: "skipped",
      duration: "0ms",
      error: "Redis credentials not configured — rate limiter using in-memory fallback",
    };
  }

  // ── Resposta Final ──────────────────────────────────────────────────────
  const totalDuration = Date.now() - start;

  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "unknown",
      duration: `${totalDuration}ms`,
      checks,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
