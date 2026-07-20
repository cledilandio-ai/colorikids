import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Rota pública — sem autenticação.
 * Retorna as configurações visíveis de uma loja pelo slug (nome da empresa, WhatsApp, etc.)
 * para ser usada na vitrine pública /c/[slug]
 */
export async function GET(
    _request: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const store = await prisma.store.findUnique({
            where: { slug: params.slug },
            include: { storeConfig: true },
        });

        if (!store || store.status !== "ACTIVE") {
            return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
        }

        const cfg = store.storeConfig;

        return NextResponse.json({
            companyName: cfg?.companyName ?? store.name,
            whatsapp: cfg?.whatsapp ?? "",
            whatsappMessage: cfg?.whatsappMessage ?? `Olá! Vim pelo site de ${store.name}.`,
            instagram: cfg?.instagram ?? "",
            featuredImageUrls: cfg?.featuredImageUrls ?? "[]",
            pixKey: cfg?.pixKey ?? "",
            pixKeyType: cfg?.pixKeyType ?? "CPF",
            cnpj: cfg?.cnpj ?? "",
            slug: store.slug,
        });
    } catch (error) {
        logger.error({ err: error, route: "storefront/[slug]/settings", slug: params.slug }, "Error fetching storefront settings");
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
