/**
 * Testes de Integração — API Routes
 * -----------------------------------
 * Combina: autenticação JWT + rate limiting + validação Zod + logging Pino.
 *
 * Estratégia:
 * - Mock de Prisma (db), auth (JWT), rate limiter e logger
 * - Uso de schemas Zod reais (importados de lib/validation)
 * - Chamada direta dos handlers de rota com Request mockado
 * - Verificação de status, body e chamadas de logger/securityLog
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────────

const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
const mockSecurityLog = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
  securityLog: mockSecurityLog,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  })),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: { create: vi.fn() },
    treasuryTransaction: { create: vi.fn() },
    inventoryLog: { create: vi.fn() },
    $transaction: vi.fn((cb: Function) => cb({})),
  },
}));

const mockSignToken = vi.fn().mockResolvedValue("mock-jwt-token");
const mockGetAuthContext = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthContext: mockGetAuthContext,
  signToken: mockSignToken,
  COOKIE_NAME: "auth_token",
}));

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn();
const mockRateLimitResponse = vi.fn();

vi.mock("@/lib/rateLimiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: mockGetClientIp,
  rateLimitResponse: mockRateLimitResponse,
  RATE_LIMITS: {
    LOGIN: { windowMs: 60_000, maxRequests: 5 },
    UPLOAD: { windowMs: 60_000, maxRequests: 10 },
    ORDERS: { windowMs: 60_000, maxRequests: 30 },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function createNextRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers = {}, cookies = {} } = options;

  const req = new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  }) as NextRequest;

  // Mock cookies
  const cookieMap = new Map(Object.entries(cookies));
  (req as any).cookies = {
    get: (name: string) => {
      const val = cookieMap.get(name);
      return val ? { name, value: val } : undefined;
    },
  };

  return req;
}

/**
 * Cria um contexto de auth mockado para testes.
 */
function mockAuthContext(overrides: Partial<import("@/lib/auth").AuthContext> = {}) {
  return {
    userId: "user-123",
    storeId: "store-456",
    role: "OWNER" as const,
    name: "Test Owner",
    ...overrides,
  };
}

// ─── Configuração comum ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Padrão: rate limit permite
  mockCheckRateLimit.mockReturnValue({ allowed: true });
  mockGetClientIp.mockReturnValue("192.168.1.100");
  mockRateLimitResponse.mockReturnValue(
    new Response(
      JSON.stringify({ error: "Muitas requisições. Tente novamente em 60 segundos." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
    ),
  );

  // Padrão: logger mockado
  mockLogger.info.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
  mockSecurityLog.mockClear();
});

afterEach(() => {
  delete process.env.JWT_SECRET;
  delete process.env.POSTGRES_URL;
  delete process.env.DIRECT_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

// ==============================================================================
// 1. Health Check — /api/health
// ==============================================================================
describe("GET /api/health", () => {
  it("should return 200 when all services are healthy", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma.$queryRaw as any).mockResolvedValue([{ "1": 1 }]);

    process.env.JWT_SECRET = "test-secret-for-testing";
    process.env.POSTGRES_URL = "postgresql://localhost";
    process.env.DIRECT_URL = "postgresql://localhost";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const { GET } = await import("../health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.jwt.status).toBe("ok");
    expect(body.checks.env.status).toBe("ok");
  });

  it("should return 503 when database is down", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma.$queryRaw as any).mockRejectedValue(new Error("Connection refused"));

    process.env.JWT_SECRET = "test-secret-for-testing";

    const { GET } = await import("../health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("error");
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

// ==============================================================================
// 2. Autenticação + Rate Limit — POST /api/auth/login
// ==============================================================================
describe("POST /api/auth/login", () => {
  it("should return 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 60 });

    const { POST } = await import("../auth/login/route");
    const req = createNextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: { email: "test@loja.com", password: "123456" },
    });

    const response = await POST(req);

    expect(response.status).toBe(429);
    // Nota: securityLog RATE_LIMIT_EXCEEDED é chamado dentro do checkRateLimit real
    // (testado nos testes unitários de lib/rateLimiter.test.ts)
  });

  it("should return 401 when user not found", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const { POST } = await import("../auth/login/route");
    const req = createNextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: { email: "unknown@loja.com", password: "123456" },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("Credenciais inválidas");

    // Verifica securityLog chamado para login falho
    expect(mockSecurityLog).toHaveBeenCalledWith(
      "LOGIN_FAILED",
      expect.objectContaining({ email: "unknown@loja.com" }),
      "info",
    );
  });

  it("should return 200 with user data on success", async () => {
    const { prisma } = await import("@/lib/db");
    const bcrypt = await import("bcryptjs");

    const hashedPassword = await bcrypt.hash("senha123", 10);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-123",
      name: "Test Owner",
      email: "owner@loja.com",
      password: hashedPassword,
      role: "OWNER",
      storeId: "store-456",
      store: { id: "store-456", name: "Minha Loja", slug: "minha-loja", status: "ACTIVE" },
      maxDiscount: 10,
      permissions: [],
      shouldChangePassword: false,
    });

    mockSignToken.mockResolvedValue("jwt-token-123");

    const { POST } = await import("../auth/login/route");
    const req = createNextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: { email: "owner@loja.com", password: "senha123" },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("owner@loja.com");
    expect(body.user.storeName).toBe("Minha Loja");

    // Verifica securityLog chamado para login bem-sucedido
    expect(mockSecurityLog).toHaveBeenCalledWith(
      "LOGIN_SUCCESS",
      expect.objectContaining({ email: "owner@loja.com", role: "OWNER" }),
      "info",
    );
  });

  it("should return 403 for suspended store", async () => {
    const { prisma } = await import("@/lib/db");
    const bcrypt = await import("bcryptjs");

    const hashedPassword = await bcrypt.hash("senha123", 10);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-123",
      password: hashedPassword,
      role: "OWNER",
      storeId: "store-456",
      store: { status: "SUSPENDED" },
    });

    const { POST } = await import("../auth/login/route");
    const req = createNextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: { email: "owner@loja.com", password: "senha123" },
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });
});

// ==============================================================================
// 3. Auth + Zod + Rate Limit + Logging — POST /api/orders
// ==============================================================================
describe("POST /api/orders (full integration)", () => {
  it("should return 401 without authentication", async () => {
    mockGetAuthContext.mockResolvedValue(null);

    const { POST } = await import("../orders/route");
    const req = createNextRequest("http://localhost/api/orders", {
      method: "POST",
      body: { customerName: "João", total: 100, items: "[]" },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid Zod data", async () => {
    mockGetAuthContext.mockResolvedValue(mockAuthContext());

    const { POST } = await import("../orders/route");
    const req = createNextRequest("http://localhost/api/orders", {
      method: "POST",
      // total is negative — should fail Zod validation
      body: { customerName: "", total: -50, items: "" },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dados inválidos");
    // Deve ter erros por campo
    expect(body.details).toBeDefined();
    expect(Object.keys(body.details).length).toBeGreaterThan(0);
  });

  it("should create order successfully with auth + valid data", async () => {
    mockGetAuthContext.mockResolvedValue(mockAuthContext());

    const { prisma } = await import("@/lib/db");
    const mockOrder = {
      id: "order-789",
      customerName: "Maria",
      total: 150.0,
      status: "PENDING",
      items: JSON.stringify([{ productId: "prod-1", variantId: "var-1", qty: 2, name: "Camiseta" }]),
    };

    (prisma.$transaction as any).mockImplementation(async (cb: Function) => {
      // Mock tx context with Prisma-like functions
      const tx = {
        order: { create: vi.fn().mockResolvedValue(mockOrder) },
        payment: { create: vi.fn() },
        treasuryTransaction: { create: vi.fn() },
        accountReceivable: { create: vi.fn() },
        productVariant: {
          findUnique: vi.fn().mockResolvedValue({ stockQuantity: 10 }),
          update: vi.fn(),
        },
        inventoryLog: { create: vi.fn() },
      };
      return cb(tx);
    });

    const { POST } = await import("../orders/route");
    const req = createNextRequest("http://localhost/api/orders", {
      method: "POST",
      body: {
        customerName: "Maria",
        total: 150.0,
        items: JSON.stringify([{ productId: "prod-1", variantId: "var-1", qty: 2, name: "Camiseta" }]),
      },
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("order-789");
    expect(body.customerName).toBe("Maria");
  });
});

// ==============================================================================
// 4. Fluxo combinado: Rate Limit → Auth → Zod → Logging (via mocks)
// ==============================================================================
describe("Fluxo completo auth + rate limit + zod + logging", () => {
  it("should call rate limit BEFORE auth check and return 401 when unauthenticated", async () => {
    mockGetAuthContext.mockResolvedValue(null);
    mockCheckRateLimit.mockReturnValue({ allowed: true });

    const { POST } = await import("../orders/route");

    const req = createNextRequest("http://localhost/api/orders", {
      method: "POST",
      body: { customerName: "Teste", total: 100, items: "[]" },
    });

    const response = await POST(req);

    // Rate limit foi checado primeiro
    expect(mockCheckRateLimit).toHaveBeenCalled();
    // Auth falhou → 401
    expect(response.status).toBe(401);
  });

  it("should return 429 when rate limit blocks even before auth", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 30 });
    mockGetAuthContext.mockResolvedValue(mockAuthContext()); // Mesmo com auth válida

    const { POST } = await import("../orders/route");

    const req = createNextRequest("http://localhost/api/orders", {
      method: "POST",
      body: { customerName: "Teste", total: 100, items: "[]" },
    });

    const response = await POST(req);

    // Rate limit bloqueou antes de checar auth
    expect(response.status).toBe(429);
    expect(mockGetAuthContext).not.toHaveBeenCalled(); // Auth nunca foi checada!
  });
});
