import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
    try {
        let config = await prisma.storeConfig.findFirst();

        if (!config) {
            config = await prisma.storeConfig.create({
                data: {
                    whatsapp: "5511999999999",
                    companyName: "Colorikids",
                },
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls, pixKey, pixKeyType } = body;

        const config = await prisma.storeConfig.findFirst();

        const featuredImageUrlsString = JSON.stringify(featuredImageUrls || []);

        if (config) {
            await prisma.storeConfig.update({
                where: { id: config.id },
                data: { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls: featuredImageUrlsString, pixKey, pixKeyType },
            });
        } else {
            await prisma.storeConfig.create({
                data: { whatsapp, whatsappMessage, companyName, cnpj, instagram, featuredImageUrls: featuredImageUrlsString, pixKey, pixKeyType },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
