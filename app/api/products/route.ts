import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createProductSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        const where: any = { active: true, storeId };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { variants: true },
        });
        return NextResponse.json(products);
    } catch (error) {
        logger.error({ err: error, route: "products/GET" }, "Error fetching products");
        return NextResponse.json({ error: "Error fetching products" }, { status: 500 });
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
        const parsed = createProductSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { name, description, basePrice, costPrice, imageUrl, variants, category, gender, supplier } = parsed.data;

        const product = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name,
                    description,
                    basePrice,
                    costPrice: costPrice || 0,
                    imageUrl: variants[0]?.imageUrl || null,
                    category,
                    gender,
                    supplier,
                    storeId,
                    variants: {
                        create: variants.map((v, index) => ({
                            size: v.size,
                            color: v.color || "",
                            stockQuantity: v.stockQuantity,
                            minStock: v.minStock || 1,
                            lastRestockAt: v.stockQuantity > 0 ? new Date() : null,
                            imageUrl: v.imageUrl,
                            sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${(v.color || "VAR").substring(0, 3).toUpperCase()}-${v.size}-${Date.now().toString().slice(-4)}-${index}`,
                        })),
                    },
                },
                include: { variants: true }
            });

            const costPerUnit = costPrice || 0;
            const totalInitialStock = variants.reduce((acc: number, v) => acc + v.stockQuantity, 0);
            const totalInitialCost = totalInitialStock * costPerUnit;

            if (totalInitialCost > 0) {
                await tx.treasuryTransaction.create({
                    data: {
                        description: `Estoque Inicial - ${name}`,
                        amount: totalInitialCost,
                        type: "OUT",
                        category: "COMPRA_PRODUTO",
                        date: new Date(),
                        storeId,
                    }
                });
            }

            return newProduct;
        });

        revalidatePath("/products");
        revalidatePath("/");

        return NextResponse.json(product);
    } catch (error) {
        logger.error({ err: error, route: "products/POST", storeId }, "Error creating product");
        return NextResponse.json({ error: "Error creating product" }, { status: 500 });
    }
}
