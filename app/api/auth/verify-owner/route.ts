import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyOwnerSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimiter";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
    try {
        // ── Rate limit: 5 req/min por IP ────────────────────────────────
        const ip = getClientIp(request);
        const rateCheck = await checkRateLimit(`auth:verify-owner:${ip}`, RATE_LIMITS.VERIFY_OWNER);
        if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter);

        const body = await request.json();
        const parsed = verifyOwnerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { password } = parsed.data;

        // Find ANY user with role OWNER
        const owners = await prisma.user.findMany({
            where: { role: "OWNER" }
        });

        if (owners.length === 0) {
            return NextResponse.json({ error: "Nenhum proprietário encontrado no sistema." }, { status: 404 });
        }

        // Check password against all owners (usually just one, but supports multiple)
        let isValid = false;
        let ownerMaxDiscount = 0;

        for (const owner of owners) {
            const match = await bcrypt.compare(password, owner.password);
            if (match) {
                isValid = true;
                ownerMaxDiscount = owner.maxDiscount;
                break;
            }
        }

        if (isValid) {
            return NextResponse.json({ success: true, maxDiscount: ownerMaxDiscount });
        } else {
            return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
        }

    } catch (error) {
        logger.error({ err: error, route: "auth/verify-owner" }, "Error verifying owner password");
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
