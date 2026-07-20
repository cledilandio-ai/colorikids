import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimiter";
import { logger, securityLog } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    // ── Rate limit: 5 req/min por IP ────────────────────────────────────
    const ip = getClientIp(request);
    const rateCheck = await checkRateLimit(`auth:login:${ip}`, RATE_LIMITS.LOGIN);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter);

    const { email, password } = await request.json();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Busca o usuário com a loja associada
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { store: { select: { id: true, name: true, slug: true, status: true } } },
    });

    if (!user) {
      securityLog("LOGIN_FAILED", { email: normalizedEmail, ip, reason: "user_not_found" }, "info");
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 401 });
    }

    // 2. Valida senha
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      securityLog("LOGIN_FAILED", { email: normalizedEmail, ip, reason: "wrong_password" }, "info");
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 401 });
    }

    // 3. Verifica status da loja (exceto SUPER_ADMIN que não tem loja)
    if (user.role !== "SUPER_ADMIN" && user.store?.status === "SUSPENDED") {
      return NextResponse.json(
        { success: false, error: "Loja suspensa. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    // 4. Gera JWT com storeId embutido
    const token = await signToken({
      sub: user.id,
      storeId: user.storeId ?? null,
      role: user.role as "SUPER_ADMIN" | "OWNER" | "SELLER",
      name: user.name,
    });

    // 5. Monta response com cookie seguro
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        storeName: user.store?.name ?? null,
        storeSlug: user.store?.slug ?? null,
        maxDiscount: user.maxDiscount,
        permissions: user.permissions,
        shouldChangePassword: user.shouldChangePassword,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    // 6. Remove cookies legados do sistema antigo
    response.cookies.delete("user_role");

    securityLog("LOGIN_SUCCESS", { email: normalizedEmail, ip, role: user.role, storeId: user.storeId }, "info");
    return response;

    } catch (error) {
    logger.error({ err: error, route: "auth/login" }, "Login error");
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}