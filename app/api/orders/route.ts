import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createOrderSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimiter";
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
        logger.error({ err: error, route: "orders/GET" }, "Error fetching orders");
        return NextResponse.json({ error: "Error fetching orders" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // ── Rate limit: 30 req/min por IP ───────────────────────────────────
    const ip = getClientIp(request);
    const rateCheck = await checkRateLimit(`orders:post:${ip}`, RATE_LIMITS.ORDERS);
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter);

    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId, userId } = ctx;

    try {
        const body = await request.json();
        const parsed = createOrderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { customerName, customerPhone, total, status, type, items, paymentMethod, cashRegisterId, payments, customerId } = parsed.data;

        if (payments && payments.length > 0) {
            const paymentsTotal = payments.reduce((acc, p) => acc + p.amount, 0);
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
            if (payments && payments.length > 0) {
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
        logger.error({ err: error, route: "orders/POST", userId }, "Error creating order");
        return NextResponse.json({ error: `Error creating order: ${error.message || "Unknown error"}` }, { status: 500 });
    }
}
