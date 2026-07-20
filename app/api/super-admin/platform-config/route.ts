import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/platform-config
 * Lê as configurações (mesmo que a rota pública, mas autenticado para o Super Admin usar no painel).
 */
export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin(request);
    } catch (res) {
        return res as Response;
    }

    try {
        let config = await prisma.platformConfig.findUnique({ where: { id: 1 } });
        if (!config) {
            config = await prisma.platformConfig.create({ data: { id: 1 } });
        }
        return NextResponse.json(config);
    } catch (error) {
        logger.error({ err: error, route: "super-admin/platform-config/GET" }, "Error fetching platform config");
        return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 });
    }
}

/**
 * POST /api/super-admin/platform-config
 * Atualiza as configurações da plataforma — restrito ao SUPER_ADMIN.
 */
export async function POST(request: NextRequest) {
    try {
        await requireSuperAdmin(request);
    } catch (res) {
        return res as Response;
    }

    try {
        const body = await request.json();
        const {
            heroTitle,
            heroSubtitle,
            ctaText,
            ctaLink,
            logoUrl,
            backgroundImageUrl,
            primaryColor,
            accentColor,
            platformName,
            contactEmail,
            socialLinks,
            footerText,
            showActiveStores,
            platformInstagram,
            platformWhatsapp,
            platformPixKey,
            platformPixName,
            platformPixCity,
            platformPlanValue,
        } = body;

        const config = await prisma.platformConfig.upsert({
            where: { id: 1 },
            update: {
                ...(heroTitle !== undefined && { heroTitle }),
                ...(heroSubtitle !== undefined && { heroSubtitle }),
                ...(ctaText !== undefined && { ctaText }),
                ...(ctaLink !== undefined && { ctaLink }),
                ...(logoUrl !== undefined && { logoUrl }),
                ...(backgroundImageUrl !== undefined && { backgroundImageUrl }),
                ...(primaryColor !== undefined && { primaryColor }),
                ...(accentColor !== undefined && { accentColor }),
                ...(platformName !== undefined && { platformName }),
                ...(contactEmail !== undefined && { contactEmail }),
                ...(socialLinks !== undefined && { socialLinks: JSON.stringify(socialLinks) }),
                ...(footerText !== undefined && { footerText }),
                ...(showActiveStores !== undefined && { showActiveStores }),
                ...(platformInstagram !== undefined && { platformInstagram }),
                ...(platformWhatsapp !== undefined && { platformWhatsapp }),
                ...(platformPixKey !== undefined && { platformPixKey }),
                ...(platformPixName !== undefined && { platformPixName }),
                ...(platformPixCity !== undefined && { platformPixCity }),
                ...(platformPlanValue !== undefined && { platformPlanValue }),
            },
            create: {
                id: 1,
                heroTitle: heroTitle ?? "Bem-vindo à nossa plataforma",
                heroSubtitle: heroSubtitle ?? "Gerencie sua loja com facilidade.",
                ctaText: ctaText ?? "Acessar meu Painel",
                ctaLink: ctaLink ?? "/login",
                logoUrl,
                backgroundImageUrl,
                primaryColor: primaryColor ?? "#e91e8c",
                accentColor: accentColor ?? "#9c27b0",
                platformName: platformName ?? "Vast Cosmos",
                contactEmail,
                socialLinks: JSON.stringify(socialLinks ?? {}),
                footerText,
                showActiveStores: showActiveStores ?? true,
                platformInstagram: platformInstagram ?? null,
                platformWhatsapp: platformWhatsapp ?? null,
                platformPixKey: platformPixKey ?? null,
                platformPixName: platformPixName ?? null,
                platformPixCity: platformPixCity ?? null,
                platformPlanValue: platformPlanValue ?? 49.90,
            },
        });

        return NextResponse.json({ success: true, config });
    } catch (error) {
        logger.error({ err: error, route: "super-admin/platform-config/POST" }, "Error saving platform config");
        return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
    }
}
