import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateSettingsSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        let config = await prisma.storeConfig.findUnique({ 
            where: { storeId },
            include: { store: { select: { slug: true } } }
        });

        if (!config) {
            // Cria configuração padrão para esta loja se não existir
            config = await prisma.storeConfig.create({
                data: {
                    storeId,
                    whatsapp: "5511999999999",
                    companyName: "Minha Loja",
                },
                include: { store: { select: { slug: true } } }
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        logger.error({ err: error, route: "settings/GET", storeId }, "Error fetching settings");
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const body = await request.json();
        const parsed = updateSettingsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls, pixKey, pixKeyType } = parsed.data;
        const featuredImageUrlsString = featuredImageUrls ? JSON.stringify(featuredImageUrls) : "[]";

        await prisma.storeConfig.upsert({
            where: { storeId },
            update: { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls: featuredImageUrlsString, pixKey, pixKeyType },
            create: { storeId, whatsapp: whatsapp || "5511999999999", whatsappMessage, companyName: companyName || "Minha Loja", cnpj, instagram, featuredImageUrls: featuredImageUrlsString, pixKey, pixKeyType },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error, route: "settings/POST", storeId }, "Error updating settings");
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
