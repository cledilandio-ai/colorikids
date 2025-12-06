import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
            include: { variants: true },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { error: "Error fetching products" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, basePrice, costPrice, imageUrl, variants, category, gender } = body;

        const product = await prisma.product.create({
            data: {
                name,
                description,
                basePrice: parseFloat(basePrice),
                costPrice: costPrice ? parseFloat(costPrice) : 0,
                imageUrl: variants[0]?.imageUrl || null, // Use first variant image as main image
                category,
                gender,
                variants: {
                    create: variants.map((v: any, index: number) => ({
                        size: v.size,
                        color: v.color,
                        stockQuantity: parseInt(v.stockQuantity),
                        imageUrl: v.imageUrl,
                        sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${v.color?.substring(0, 3).toUpperCase()}-${v.size}-${Date.now().toString().slice(-4)}-${index}`, // Added index to ensure uniqueness
                    })),
                },
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json(
            { error: "Error creating product" },
            { status: 500 }
        );
    }
}
