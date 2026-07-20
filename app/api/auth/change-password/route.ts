import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimiter";
import { logger, securityLog } from "@/lib/logger";

export async function POST(request: Request) {
    try {
        // ── Rate limit: 3 req/min por IP ────────────────────────────────
        const ip = getClientIp(request);
        const rateCheck = await checkRateLimit(`auth:change-password:${ip}`, RATE_LIMITS.CHANGE_PASSWORD);
        if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter);

        const body = await request.json();
        const parsed = changePasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { userId, newPassword } = parsed.data;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                shouldChangePassword: false
            }
        });

        securityLog("PASSWORD_CHANGED", { userId }, "info");
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error, route: "auth/change-password" }, "Change password error");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}