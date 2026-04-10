import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: any = { active: true, storeId };
        if (status) where.status = status;

        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { payments: true },
        });
        return NextResponse.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        return NextResponse.json({ error: "Error fetching orders" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId, userId } = ctx;

    try {
        const body = await request.json();
        const { customerName, customerPhone, total, status, type, items, paymentMethod, cashRegisterId, payments, customerId } = body;

        if (payments && Array.isArray(payments)) {
            const paymentsTotal = payments.reduce((acc: number, p: any) => acc + p.amount, 0);
            if (Math.abs(paymentsTotal - total) > 0.01) {
                return NextResponse.json({ error: "Total de pagamentos não bate com o total do pedido." }, { status: 400 });
            }
        }

        const order = await prisma.$transaction(async (tx) => {
            // 1. Cria o Pedido
            const newOrder = await tx.order.create({
                data: {
                    customerName,
                    customerPhone,
                    total,
                    status: status || "PENDING",
                    type: type || "WEB",
                    items,
                    paymentMethod: paymentMethod || (payments && payments.length > 0 ? "MULTIPLE" : "PENDING"),
                    cashRegisterId,
                    customerId,
                    storeId,
                },
            });

            // 2. Cria Pagamentos
            if (payments && Array.isArray(payments)) {
                for (const p of payments) {
                    await tx.payment.create({
                        data: { amount: p.amount, method: p.method, orderId: newOrder.id }
                    });

                    if (p.method === "PIX" || p.method === "CARTAO") {
                        await tx.treasuryTransaction.create({
                            data: {
                                description: `Venda PDV #${newOrder.id.slice(0, 8)} - Via ${p.method}`,
                                amount: p.amount,
                                type: "IN",
                                category: "VENDA_DIGITAL",
                                userId,
                                date: new Date(),
                                storeId,
                            }
                        });
                    }

                    if (p.method === "CREDIARIO") {
                        if (!customerId) throw new Error("Cliente é obrigatório para vendas no Crediário.");
                        if (!p.dueDate) throw new Error("Data de vencimento é obrigatória para Crediário.");

                        await tx.accountReceivable.create({
                            data: {
                                amount: p.amount,
                                dueDate: new Date(p.dueDate),
                                status: "PENDING",
                                customerId,
                                orderId: newOrder.id,
                            }
                        });
                    }
                }
            }

            // 3. Dedução de estoque (se COMPLETED)
            if (newOrder.status === "COMPLETED") {
                const parsedItems = JSON.parse(items);
                for (const item of parsedItems) {
                    if (item.variantId) {
                        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
                        if (!variant) throw new Error(`Variante não encontrada: ${item.name}`);

                        if (variant.stockQuantity < item.qty) {
                            throw new Error(`Estoque insuficiente para "${item.name} - ${item.variantName}". Disponível: ${variant.stockQuantity}, Solicitado: ${item.qty}`);
                        }

                        await tx.productVariant.update({
                            where: { id: item.variantId },
                            data: { stockQuantity: { decrement: item.qty } },
                        });

                        await tx.inventoryLog.create({
                            data: {
                                variantId: item.variantId,
                                change: -item.qty,
                                reason: `Venda #${newOrder.id.slice(0, 8)}`,
                                userId,
                                storeId,
                            }
                        });
                    }
                }
            }

            return newOrder;
        });

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Error creating order:", error);
        return NextResponse.json({ error: `Error creating order: ${error.message || "Unknown error"}` }, { status: 500 });
    }
}
