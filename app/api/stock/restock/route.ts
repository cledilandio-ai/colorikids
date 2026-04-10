import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const body = await request.json();
        const { variantId, quantity, unitCost, productId, size, color, imageUrl, minStock } = body;

        if (!quantity || unitCost === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const qty = parseInt(quantity);
        const cost = parseFloat(unitCost);

        await prisma.$transaction(async (tx) => {
            let targetVariantId = variantId;
            let product;
            let variant;

            if (variantId === "NEW") {
                if (!productId || !size) throw new Error("Product ID and Size are required for new variant");

                variant = await tx.productVariant.create({
                    data: {
                        productId,
                        size,
                        color: color || null,
                        imageUrl: imageUrl || null,
                        stockQuantity: 0,
                        minStock: parseInt(minStock) || 1,
                        lastRestockAt: new Date(),
                        sku: `${size}-${color || 'STD'}-${Date.now().toString().slice(-4)}`
                    },
                    include: { product: true }
                });
                targetVariantId = variant.id;
                product = variant.product;
            } else {
                variant = await tx.productVariant.findUnique({
                    where: { id: variantId },
                    include: { product: true },
                });
                if (!variant) throw new Error("Variant not found");
                product = variant.product;
            }

            // Custo médio ponderado
            const allVariants = await tx.productVariant.findMany({ where: { productId: product.id } });
            const currentTotalStock = allVariants.reduce((acc, v) => acc + v.stockQuantity, 0);

            let newCostPrice = product.costPrice;
            if (currentTotalStock + qty > 0) {
                newCostPrice = ((currentTotalStock * (product.costPrice || 0)) + (qty * cost)) / (currentTotalStock + qty);
            } else {
                newCostPrice = cost;
            }

            await tx.product.update({ where: { id: product.id }, data: { costPrice: newCostPrice } });
            await tx.productVariant.update({ where: { id: targetVariantId }, data: { stockQuantity: { increment: qty } } });

            await tx.stockMovement.create({
                data: {
                    type: "IN",
                    quantity: qty,
                    costPrice: cost,
                    productVariantId: targetVariantId,
                    reason: "Restock (Compra)",
                    storeId,
                },
            });

            await tx.treasuryTransaction.create({
                data: {
                    description: `Compra de Estoque: ${product.name} (${variant.size} - ${variant.color})`,
                    amount: qty * cost,
                    type: "OUT",
                    category: "RESTOCK",
                    date: new Date(),
                    storeId,
                },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error processing restock:", error);
        return NextResponse.json({ error: `Error processing restock: ${(error as Error).message}` }, { status: 500 });
    }
}
