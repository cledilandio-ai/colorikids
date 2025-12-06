import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const product = await prisma.product.findUnique({
            where: { id },
            include: { variants: true },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Error fetching product" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { name, description, basePrice, costPrice, imageUrl, variants, category, gender } = body;

        // Transaction to update product and replace variants
        await prisma.$transaction(async (tx) => {
            // Update product details
            await tx.product.update({
                where: { id },
                data: {
                    name,
                    description,
                    basePrice: parseFloat(basePrice),
                    costPrice: costPrice ? parseFloat(costPrice) : 0,
                    imageUrl,
                    category,
                    gender,
                },
            });

            // Delete existing variants
            await tx.productVariant.deleteMany({
                where: { productId: id },
            });

            // Create new variants
            if (variants && variants.length > 0) {
                await tx.productVariant.createMany({
                    data: variants.map((v: any) => ({
                        productId: id,
                        size: v.size,
                        color: v.color,
                        stockQuantity: parseInt(v.stockQuantity),
                        imageUrl: v.imageUrl,
                        sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${v.color?.substring(0, 3).toUpperCase()}-${v.size}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`, // Auto-generate SKU if missing
                    })),
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json(
            { error: "Error updating product" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // Delete variants first (cascade usually handles this, but explicit is safer if not configured)
        await prisma.productVariant.deleteMany({
            where: { productId: id },
        });

        await prisma.product.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json(
            { error: "Error deleting product" },
            { status: 500 }
        );
    }
}
