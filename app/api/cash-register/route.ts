import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { cashRegisterSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const openRegister = await prisma.cashRegister.findFirst({
            where: { storeId, status: "OPEN" },
            include: {
                orders: {
                    where: { active: true },
                    include: { payments: true }
                }
            }
        });

        if (!openRegister) {
            const lastRegister = await prisma.cashRegister.findFirst({
                where: { storeId, status: "CLOSED" },
                orderBy: { closedAt: "desc" }
            });

            return NextResponse.json({
                status: "CLOSED",
                suggestedInitialAmount: lastRegister?.retainedAmount || 0
            });
        }

        // Calculate breakdown
        const salesByMethod: Record<string, number> = {};
        let totalSales = 0;
        let totalCashInDrawer = openRegister.initialAmount;

        openRegister.orders.forEach(order => {
            totalSales += order.total;

            const payments = (order as any).payments;
            if (payments && Array.isArray(payments) && payments.length > 0) {
                payments.forEach((p: any) => {
                    salesByMethod[p.method] = (salesByMethod[p.method] || 0) + p.amount;
                    if (p.method === "DINHEIRO") {
                        totalCashInDrawer += p.amount;
                    }
                });
            } else {
                const method = order.paymentMethod || "OUTROS";
                salesByMethod[method] = (salesByMethod[method] || 0) + order.total;
            }
        });

        return NextResponse.json({
            status: "OPEN",
            id: openRegister.id,
            openedAt: openRegister.openedAt,
            initialAmount: openRegister.initialAmount,
            totalSales,
            salesByMethod,
            currentTotal: totalCashInDrawer
        });
    } catch (error) {
        logger.error({ err: error, route: "cash-register/GET", storeId }, "Error fetching cash register");
        return NextResponse.json({ error: "Falha ao buscar dados do caixa: " + (error as Error).message }, { status: 500 });
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
        const parsed = cashRegisterSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        if (parsed.data.action === "OPEN") {
            const { initialAmount: amount, withdrawFromTreasury } = parsed.data;

            const existingOpen = await prisma.cashRegister.findFirst({ where: { storeId, status: "OPEN" } });
            if (existingOpen) return NextResponse.json({ error: "Já existe um caixa aberto." }, { status: 400 });

            const lastRegister = await prisma.cashRegister.findFirst({
                where: { storeId, status: "CLOSED" },
                orderBy: { closedAt: "desc" }
            });
            const previousBalance = lastRegister?.retainedAmount || 0;
            const difference = amount - previousBalance;

            const newRegister = await prisma.$transaction(async (tx) => {
                const register = await tx.cashRegister.create({
                    data: {
                        storeId,
                        initialAmount: amount,
                        status: "OPEN",
                        userId: userId || "UNKNOWN",
                        retainedAmount: 0
                    },
                });

                if (withdrawFromTreasury && difference > 0) {
                    await tx.treasuryTransaction.create({
                        data: {
                            storeId,
                            description: `Abertura PDV - Aporte de Troco`,
                            amount: difference,
                            type: "OUT",
                            category: "SUPPLY_PDV",
                            userId: userId || "UNKNOWN",
                        }
                    });
                }
                return register;
            });

            return NextResponse.json(newRegister);
        }

        if (parsed.data.action === "CLOSE") {
            const { finalAmount: finalAmt, transferredAmount: transferred } = parsed.data;

            const openRegister = await prisma.cashRegister.findFirst({ where: { storeId, status: "OPEN" } });
            if (!openRegister) return NextResponse.json({ error: "Não há caixa aberto." }, { status: 400 });

            const retained = finalAmt - transferred;
            if (retained < -0.01) {
                return NextResponse.json({ error: "Valor a transferir não pode ser maior que o dinheiro em caixa." }, { status: 400 });
            }

            const closedRegister = await prisma.$transaction(async (tx) => {
                const register = await tx.cashRegister.update({
                    where: { id: openRegister.id },
                    data: {
                        status: "CLOSED",
                        closedAt: new Date(),
                        finalAmount: finalAmt,
                        retainedAmount: retained,
                        userId: userId || "UNKNOWN",
                    },
                });

                const orders = await tx.order.findMany({
                    where: { storeId, cashRegisterId: openRegister.id, active: true },
                    include: { payments: true }
                });

                let cashSales = 0;
                orders.forEach(o => {
                    const payments = (o as any).payments;
                    if (Array.isArray(payments)) {
                        payments.forEach((p: any) => {
                            if (p.method === "DINHEIRO") cashSales += p.amount;
                        });
                    }
                });

                const expectedCash = openRegister.initialAmount + cashSales;
                const difference = finalAmt - expectedCash;

                if (Math.abs(difference) > 0.01) {
                    const isLoss = difference < 0;
                    await tx.treasuryTransaction.create({
                        data: {
                            storeId,
                            description: isLoss ? "Quebra de Caixa - Fechamento" : "Sobra de Caixa - Fechamento",
                            amount: Math.abs(difference),
                            type: isLoss ? "OUT" : "IN",
                            category: isLoss ? "QUEBRA_DE_CAIXA" : "SOBRA_DE_CAIXA",
                            userId: userId || "UNKNOWN",
                        }
                    });
                }

                if (transferred > 0) {
                    await tx.treasuryTransaction.create({
                        data: {
                            storeId,
                            description: `Recolhimento de Caixa - Fechamento`,
                            amount: transferred,
                            type: "IN",
                            category: "INTERNAL_TRANSFER",
                            userId: userId || "UNKNOWN",
                        }
                    });
                }
                return register;
            });

            return NextResponse.json(closedRegister);
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error) {
        logger.error({ err: error, route: "cash-register/POST", storeId }, "Error managing cash register");
        return NextResponse.json({ error: "Erro interno: " + (error as Error).message }, { status: 500 });
    }
}
