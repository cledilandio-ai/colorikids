import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function GET() {
    try {
        console.log("GET /api/cash-register called");
        const openRegister = await prisma.cashRegister.findFirst({
            where: { status: "OPEN" },
            orderBy: { createdAt: "desc" },
            include: {
                orders: {
                    where: { active: true },
                    include: { payments: true }
                }
            }
        });

        if (!openRegister) {
            // Check for last closed register to suggest retained amount
            const lastRegister = await prisma.cashRegister.findFirst({
                where: { status: "CLOSED" },
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

            // Check payments
            const payments = (order as any).payments;
            if (payments && Array.isArray(payments) && payments.length > 0) {
                payments.forEach((p: any) => {
                    salesByMethod[p.method] = (salesByMethod[p.method] || 0) + p.amount;
                    if (p.method === "DINHEIRO") {
                        totalCashInDrawer += p.amount;
                    }
                });
            } else {
                // Legacy support
                const method = order.paymentMethod || "OUTROS";
                salesByMethod[method] = (salesByMethod[method] || 0) + order.total;
                // Note: Legacy orders might not correctly increment 'totalCashInDrawer' if method isn't explicitly DINHEIRO
            }
        });

        return NextResponse.json({
            status: "OPEN",
            id: openRegister.id,
            openedAt: openRegister.openedAt,
            initialAmount: openRegister.initialAmount,
            totalSales,
            salesByMethod,
            currentTotal: totalCashInDrawer // This fixes the undefined error
        });
    } catch (error) {
        console.error("Error fetching cash register:", error);
        return NextResponse.json({ error: "Falha ao buscar dados do caixa: " + (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, initialAmount, finalAmount, transferredAmount, withdrawFromTreasury } = body;
        const cookieStore = cookies();
        const userRole = cookieStore.get("user_role")?.value;

        if (action === "OPEN") {
            const amount = parseFloat(initialAmount);
            if (isNaN(amount)) return NextResponse.json({ error: "Valor inicial inválido." }, { status: 400 });

            const existingOpen = await prisma.cashRegister.findFirst({ where: { status: "OPEN" } });
            if (existingOpen) return NextResponse.json({ error: "Já existe um caixa aberto." }, { status: 400 });

            console.log(`OPEN Register: Amount=${amount}, Withdraw=${withdrawFromTreasury}`);

            // Find last closed register to determine expected previous balance
            const lastRegister = await prisma.cashRegister.findFirst({
                where: { status: "CLOSED" },
                orderBy: { closedAt: "desc" }
            });
            const previousBalance = lastRegister?.retainedAmount || 0;
            const difference = amount - previousBalance;

            const newRegister = await prisma.$transaction(async (tx) => {
                const register = await tx.cashRegister.create({
                    data: {
                        initialAmount: amount,
                        status: "OPEN",
                        userId: userRole || "UNKNOWN",
                        retainedAmount: 0
                    },
                });

                // Only create transaction if there is a positive difference (injection) AND user confirmed it
                if (withdrawFromTreasury && difference > 0) {
                    await tx.treasuryTransaction.create({
                        data: {
                            description: `Abertura PDV - Aporte de Troco`,
                            amount: difference,
                            type: "OUT",
                            category: "SUPPLY_PDV",
                            userId: userRole || "UNKNOWN",
                        }
                    });
                }
                return register;
            });

            return NextResponse.json(newRegister);

        } else if (action === "CLOSE") {
            const openRegister = await prisma.cashRegister.findFirst({ where: { status: "OPEN" } });
            if (!openRegister) return NextResponse.json({ error: "Não há caixa aberto." }, { status: 400 });

            const finalAmt = parseFloat(finalAmount);
            const transferred = parseFloat(transferredAmount) || 0;
            const retained = finalAmt - transferred;

            if (retained < -0.01) {
                return NextResponse.json({ error: "Valor a transferir não pode ser maior que o dinheiro em caixa." }, { status: 400 });
            }

            console.log(`CLOSE Register: Final=${finalAmt}, Transferred=${transferred}, Retained=${retained}`);

            const closedRegister = await prisma.$transaction(async (tx) => {
                const register = await tx.cashRegister.update({
                    where: { id: openRegister.id },
                    data: {
                        status: "CLOSED",
                        closedAt: new Date(),
                        finalAmount: finalAmt,
                        retainedAmount: retained,
                        userId: userRole || "UNKNOWN",
                    },
                });

                // 1. Calculate Expected Cash (Initial + Cash Sales - Withdrawals[future feature])
                // We need to re-fetch or use logic to sum cash sales here to be secure, 
                // but for now we rely on the consistency. To be robust, let's recalculate from orders.
                const orders = await tx.order.findMany({
                    where: { cashRegisterId: openRegister.id, active: true },
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

                // 2. Register Difference (Breakage/Surplus)
                if (Math.abs(difference) > 0.01) {
                    const isLoss = difference < 0;
                    await tx.treasuryTransaction.create({
                        data: {
                            description: isLoss ? "Quebra de Caixa - Fechamento" : "Sobra de Caixa - Fechamento",
                            amount: Math.abs(difference),
                            type: isLoss ? "OUT" : "IN",
                            category: isLoss ? "QUEBRA_DE_CAIXA" : "SOBRA_DE_CAIXA",
                            userId: userRole || "UNKNOWN",
                        }
                    });
                }

                // 3. Register Transfer (Sangria/Recolhimento)
                if (transferred > 0) {
                    await tx.treasuryTransaction.create({
                        data: {
                            description: `Recolhimento de Caixa - Fechamento`,
                            amount: transferred,
                            type: "IN",
                            category: "INTERNAL_TRANSFER",
                            userId: userRole || "UNKNOWN",
                        }
                    });
                }
                return register;
            });

            return NextResponse.json(closedRegister);
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error) {
        console.error("Error managing cash register:", error);
        return NextResponse.json({ error: "Erro interno: " + (error as Error).message }, { status: 500 });
    }
}
