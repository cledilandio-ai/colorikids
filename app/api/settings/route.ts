import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

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
        console.error("Error fetching settings:", error);
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
        const { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls, pixKey, pixKeyType } = body;

        const featuredImageUrlsString = JSON.stringify(featuredImageUrls || []);

        await prisma.storeConfig.upsert({
            where: { storeId },
            update: { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls: featuredImageUrlsString, pixKey, pixKeyType },
            create: { storeId, whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls: featuredImageUrlsString, pixKey, pixKeyType },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
