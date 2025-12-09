import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const orderId = params.id;
        const body = await request.json();
        const { items, restock, refundAmount } = body;
        // items: { id: string (orderItemId), quantity: number, variantId: string }[]

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "No items selected for return" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Restock Items
            if (restock) {
                for (const item of items) {
                    if (item.variantId && item.quantity > 0) {
                        await tx.productVariant.update({
                            where: { id: item.variantId },
                            data: {
                                stockQuantity: { increment: item.quantity }
                            }
                        });
                    }
                }
            }

            // 2. Financial Transaction (Refund)
            if (refundAmount > 0) {
                // Check for OPEN Cash Register if requested
                const openRegister = await tx.cashRegister.findFirst({
                    where: { status: "OPEN" }
                });

                // Logic: If there is an open register, we prefer to register the refund there to keep the drawer accurate,
                // UNLESS explicitly told not to (logic can be refined, but "Refund from POS" is best default if open).
                // User asked: "does it interact with open POS?" -> Yes, we make it interact.

                if (openRegister) {
                    await tx.cashTransaction.create({
                        data: {
                            cashRegisterId: openRegister.id,
                            type: "OUT",
                            amount: parseFloat(refundAmount),
                            description: `Reembolso - Pedido #${orderId.slice(-4)}`
                        }
                    });
                } else {
                    // Closed POS or no POS active -> Treasury Withdraw
                    await tx.treasuryTransaction.create({
                        data: {
                            description: `Reembolso/Devolução - Pedido #${orderId.slice(-4)}`,
                            amount: parseFloat(refundAmount),
                            type: "OUT",
                            category: "REEMBOLSO",
                            date: new Date(),
                        }
                    });
                }
            }

            // 3. Update Order Status?? 
            // Optional: for now, we leave status as is, or maybe add a Note if Order model supports it.
            // Keeping it simple as requested: Stock + Finance.
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error processing return:", error);
        return NextResponse.json(
            { error: `Error processing return: ${error.message}` },
            { status: 500 }
        );
    }
}
