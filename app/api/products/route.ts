import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: { active: true },
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
        const { name, description, basePrice, costPrice, imageUrl, variants, category, gender, supplier } = body;

        const product = await prisma.$transaction(async (tx) => {
            // 1. Create Product
            const newProduct = await tx.product.create({
                data: {
                    name,
                    description,
                    basePrice: parseFloat(basePrice),
                    costPrice: costPrice ? parseFloat(costPrice) : 0,
                    imageUrl: variants[0]?.imageUrl || null,
                    category,
                    gender,
                    supplier,
                    variants: {
                        create: variants.map((v: any, index: number) => ({
                            size: v.size,
                            color: v.color,
                            stockQuantity: parseInt(v.stockQuantity),
                            minStock: parseInt(v.minStock) || 1,
                            lastRestockAt: parseInt(v.stockQuantity) > 0 ? new Date() : null,
                            imageUrl: v.imageUrl,
                            sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${v.color?.substring(0, 3).toUpperCase()}-${v.size}-${Date.now().toString().slice(-4)}-${index}`,
                        })),
                    },
                },
                include: { variants: true } // Include to get created variants
            });

            // 2. Calculate Initial Stock Cost
            const costPerUnit = parseFloat(costPrice) || 0;
            const totalInitialStock = variants.reduce((acc: number, v: any) => acc + parseInt(v.stockQuantity), 0);
            const totalInitialCost = totalInitialStock * costPerUnit;

            // 3. Register Financial Transaction if there is cost
            if (totalInitialCost > 0) {
                await tx.treasuryTransaction.create({
                    data: {
                        description: `Estoque Inicial - ${name}`,
                        amount: totalInitialCost,
                        type: "OUT",
                        category: "COMPRA_PRODUTO",
                        date: new Date(),
                    }
                });
            }

            return newProduct;
        });

        // Revalidate cache to show new product immediately
        revalidatePath("/products");
        revalidatePath("/"); // Home page usually lists products

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json(
            { error: "Error creating product" },
            { status: 500 }
        );
    }
}
