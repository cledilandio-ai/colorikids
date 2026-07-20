import { describe, it, expect, vi } from "vitest";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "./rateLimiter";

// checkRateLimit é testado via import dinâmico com resetModules (para isolar o Map)

// =============================================================================
// Rate Limiter — Unit Tests
// =============================================================================

describe("checkRateLimit", () => {
  it("should allow first request", async () => {
    vi.resetModules();
    const { checkRateLimit: check } = await import("./rateLimiter");
    const result = await check("test:1", { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
  });

  it("should allow requests within limit", async () => {
    vi.resetModules();
    const { checkRateLimit: check } = await import("./rateLimiter");
    const config = { windowMs: 60_000, maxRequests: 3 };

    expect((await check("test:2", config)).allowed).toBe(true);
    expect((await check("test:2", config)).allowed).toBe(true);
    expect((await check("test:2", config)).allowed).toBe(true);
  });

  it("should block requests exceeding limit", async () => {
    vi.resetModules();
    const { checkRateLimit: check } = await import("./rateLimiter");
    const config = { windowMs: 60_000, maxRequests: 2 };

    expect((await check("test:3", config)).allowed).toBe(true);
    expect((await check("test:3", config)).allowed).toBe(true);

    const blocked = await check("test:3", config);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("should reset after window expires", async () => {
    vi.resetModules();
    const { checkRateLimit: check } = await import("./rateLimiter");
    const config = { windowMs: 50, maxRequests: 1 };

    expect((await check("test:4", config)).allowed).toBe(true);
    expect((await check("test:4", config)).allowed).toBe(false);

    // Espera janela expirar
    await new Promise((r) => setTimeout(r, 60));

    const result = await check("test:4", config);
    expect(result.allowed).toBe(true);
  });

  it("should track different identifiers independently", async () => {
    vi.resetModules();
    const { checkRateLimit: check } = await import("./rateLimiter");
    const config = { windowMs: 60_000, maxRequests: 1 };

    expect((await check("user:A", config)).allowed).toBe(true);
    expect((await check("user:B", config)).allowed).toBe(true);

    expect((await check("user:A", config)).allowed).toBe(false);
    expect((await check("user:B", config)).allowed).toBe(false);
  });
});

// =============================================================================
// getClientIp
// =============================================================================
describe("getClientIp", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("should fall back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("should return 'unknown' if no IP header found", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("should prefer x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "x-real-ip": "10.0.0.1",
      },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });
});

// =============================================================================
// RATE_LIMITS Configs
// =============================================================================
describe("RATE_LIMITS", () => {
  it("LOGIN should allow 5 requests per minute", () => {
    expect(RATE_LIMITS.LOGIN).toEqual({ windowMs: 60_000, maxRequests: 5 });
  });

  it("REGISTER should allow 3 requests per minute", () => {
    expect(RATE_LIMITS.REGISTER).toEqual({ windowMs: 60_000, maxRequests: 3 });
  });

  it("UPLOAD should allow 10 requests per minute", () => {
    expect(RATE_LIMITS.UPLOAD).toEqual({ windowMs: 60_000, maxRequests: 10 });
  });

  it("ORDERS should allow 30 requests per minute", () => {
    expect(RATE_LIMITS.ORDERS).toEqual({ windowMs: 60_000, maxRequests: 30 });
  });
});

// =============================================================================
// rateLimitResponse
// =============================================================================
describe("rateLimitResponse", () => {
  it("should return 429 with correct headers and message", () => {
    const res = rateLimitResponse(30);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("should use singular 'segundo' for retryAfter === 1", () => {
    const res = rateLimitResponse(1);
    expect(res.status).toBe(429);
  });
});
