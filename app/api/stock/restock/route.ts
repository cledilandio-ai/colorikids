import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { variantId, quantity, unitCost, productId, size, color, imageUrl, minStock } = body;

        if (!quantity || unitCost === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const qty = parseInt(quantity);
        const cost = parseFloat(unitCost);

        // Transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            let targetVariantId = variantId;
            let product;
            let variant;

            // 1. Handle New Variant Creation
            if (variantId === "NEW") {
                if (!productId || !size) {
                    throw new Error("Product ID and Size are required for new variant");
                }

                // Create the new variant
                variant = await tx.productVariant.create({
                    data: {
                        productId,
                        size,
                        color: color || null,
                        imageUrl: imageUrl || null,
                        stockQuantity: 0, // Will be incremented below
                        minStock: parseInt(minStock) || 1,
                        lastRestockAt: new Date(), // New variant being stocked now
                        sku: `${size}-${color || 'STD'}-${Date.now().toString().slice(-4)}` // Simple auto-SKU
                    },
                    include: { product: true }
                });
                targetVariantId = variant.id;
                product = variant.product;
            } else {
                // Fetch existing Variant and Product
                variant = await tx.productVariant.findUnique({
                    where: { id: variantId },
                    include: { product: true },
                });

                if (!variant) throw new Error("Variant not found");
                product = variant.product;
            }

            // 2. Calculate New Weighted Average Cost for Product
            // Formula: ((CurrentTotalStock * CurrentCost) + (NewQty * NewCost)) / (CurrentTotalStock + NewQty)
            // Note: We use the Product's global cost, but we should ideally weigh it by the total stock of the product across all variants.
            // For simplicity and robustness, let's use the Product's current cost and the TOTAL stock of the product.

            const allVariants = await tx.productVariant.findMany({
                where: { productId: product.id }
            });
            const currentTotalStock = allVariants.reduce((acc, v) => acc + v.stockQuantity, 0);

            let newCostPrice = product.costPrice;

            if (currentTotalStock + qty > 0) {
                const currentValue = currentTotalStock * (product.costPrice || 0);
                const newValue = qty * cost;
                newCostPrice = (currentValue + newValue) / (currentTotalStock + qty);
            } else {
                // If stock is 0 or negative (shouldn't happen on restock), just use the new cost
                newCostPrice = cost;
            }

            // 3. Update Product Cost
            await tx.product.update({
                where: { id: product.id },
                data: { costPrice: newCostPrice },
            });

            // 4. Update Variant Stock
            await tx.productVariant.update({
                where: { id: targetVariantId },
                data: { stockQuantity: { increment: qty } },
            });

            // 5. Create Stock Movement
            await tx.stockMovement.create({
                data: {
                    type: "IN",
                    quantity: qty,
                    costPrice: cost,
                    productVariantId: targetVariantId,
                    reason: "Restock (Compra)",
                },
            });

            // 6. Create Treasury Transaction (Expense)
            await tx.treasuryTransaction.create({
                data: {
                    description: `Compra de Estoque: ${product.name} (${variant.size} - ${variant.color})`,
                    amount: qty * cost,
                    type: "OUT",
                    category: "RESTOCK",
                    date: new Date(),
                },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error processing restock:", error);
        return NextResponse.json(
            { error: `Error processing restock: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
