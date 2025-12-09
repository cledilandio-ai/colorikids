import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("Error fetching order:", error);
        return NextResponse.json(
            { error: "Error fetching order" },
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
        const { status, total, items, payments, cashRegisterId, customerId, type, customerName } = body;

        // Transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findUnique({ where: { id } });
            if (!currentOrder) throw new Error("Order not found");

            // 1. Update Order Basic Fields
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    status: status || currentOrder.status,
                    total: total !== undefined ? total : currentOrder.total,
                    items: items ? (typeof items === 'string' ? items : JSON.stringify(items)) : currentOrder.items,
                    cashRegisterId: cashRegisterId || currentOrder.cashRegisterId,
                    customerId: customerId || currentOrder.customerId,
                    type: type || currentOrder.type,
                    customerName: customerName || currentOrder.customerName,
                    paymentMethod: (payments && payments.length > 0) ? "MULTIPLE" : currentOrder.paymentMethod
                },
            });

            // 2. Handle Payments (If provided, REPLACE existing payments)
            if (payments && Array.isArray(payments)) {
                // Remove existing payments and account receivables for this order to avoid duplicates/conflicts
                await tx.payment.deleteMany({ where: { orderId: id } });
                await tx.accountReceivable.deleteMany({ where: { orderId: id } });

                for (const p of payments) {
                    await tx.payment.create({
                        data: {
                            amount: p.amount,
                            method: p.method,
                            orderId: id
                        }
                    });

                    // Handle Crediario
                    if (p.method === "CREDIARIO") {
                        const targetCustomerId = customerId || currentOrder.customerId;
                        if (!targetCustomerId) {
                            throw new Error("Cliente é obrigatório para vendas no Crediário.");
                        }
                        // Default due date to 30 days if not provided (safety net, though frontend should provide it)
                        const dueDate = p.dueDate ? new Date(p.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                        await tx.accountReceivable.create({
                            data: {
                                amount: p.amount,
                                dueDate: dueDate,
                                status: "PENDING",
                                customerId: targetCustomerId,
                                orderId: id
                            }
                        });
                    }
                }
            }

            // 3. Stock Deduction
            // Only deduct if converting to COMPLETED and it wasn't already COMPLETED
            if (status === "COMPLETED" && currentOrder.status !== "COMPLETED") {
                const orderItems = items ? (typeof items === 'string' ? JSON.parse(items) : items) : JSON.parse(currentOrder.items);

                if (Array.isArray(orderItems)) {
                    for (const item of orderItems) {
                        if (item.variantId) {
                            await tx.productVariant.update({
                                where: { id: item.variantId },
                                data: {
                                    stockQuantity: {
                                        decrement: item.qty || 1
                                    }
                                }
                            });

                            // Create inventory log
                            await tx.inventoryLog.create({
                                data: {
                                    variantId: item.variantId,
                                    change: -(item.qty || 1),
                                    reason: `Venda #${id.slice(0, 8)}`,
                                    userId: "SYSTEM"
                                }
                            });
                        }
                    }
                }
            }

            return updatedOrder;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error updating order:", error);
        return NextResponse.json(
            { error: error.message || "Error updating order" },
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

        // Fetch order to check status
        const order = await prisma.order.findUnique({
            where: { id },
            select: { status: true }
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Soft Delete (Archive) for ALL Orders
        // This preserves financial/stock history and prevents Foreign Key errors with Payments/Receivables
        await prisma.order.update({
            where: { id },
            data: { active: false }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting order:", error);
        return NextResponse.json(
            { error: `Erro ao excluir pedido: ${error.message || "Erro desconhecido"}` },
            { status: 500 }
        );
    }
}
