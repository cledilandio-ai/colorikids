import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { updateOrderSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimiter";
import { logger } from "@/lib/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ctx = await getAuthContext(request);
        if (!ctx?.storeId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        const { storeId } = ctx;

        const id = params.id;
        const order = await prisma.order.findFirst({
            where: { id, storeId },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        logger.error({ err: error, route: "orders/[id]/GET", orderId: params.id }, "Error fetching order");
        return NextResponse.json(
            { error: "Error fetching order" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // ── Rate limit: 30 req/min por IP ────────────────────────────────
        const ip = getClientIp(request);
        const rateCheck = await checkRateLimit(`orders:put:${ip}`, RATE_LIMITS.ORDERS);
        if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter);

        const ctx = await getAuthContext(request);
        if (!ctx?.storeId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        const { storeId } = ctx;

        const id = params.id;
        const body = await request.json();

        const parsed = updateOrderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }
        const { status, total, items, payments, cashRegisterId, customerId, type, customerName } = parsed.data;

        // Transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findFirst({ where: { id, storeId } });
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
                                    userId: "SYSTEM",
                                    storeId,
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
        logger.error({ err: error, route: "orders/[id]/PUT", orderId: params.id }, "Error updating order");
        return NextResponse.json(
            { error: error.message || "Error updating order" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const ctx = await getAuthContext(request);
        if (!ctx?.storeId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }
        const { storeId } = ctx;

        const id = params.id;

        // Fetch order to check status — verifica tenant
        const order = await prisma.order.findFirst({
            where: { id, storeId },
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
        logger.error({ err: error, route: "orders/[id]/DELETE", orderId: params.id }, "Error deleting order");
        return NextResponse.json(
            { error: `Erro ao excluir pedido: ${error.message || "Erro desconhecido"}` },
            { status: 500 }
        );
    }
}
