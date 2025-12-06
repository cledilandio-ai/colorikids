import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const registers = await prisma.cashRegister.findMany({
            orderBy: { openedAt: "desc" },
            include: {
                orders: {
                    include: { payments: true }
                }
            }
        });

        const history = registers.map(reg => {
            const totalSales = reg.orders.reduce((acc, order) => acc + order.total, 0);

            // Calculate breakdown from payments
            const salesByMethod: Record<string, number> = {};
            let cashSales = 0;

            reg.orders.forEach(order => {
                const payments = (order as any).payments;
                if (payments && Array.isArray(payments) && payments.length > 0) {
                    payments.forEach((p: any) => {
                        salesByMethod[p.method] = (salesByMethod[p.method] || 0) + p.amount;
                        if (p.method === "DINHEIRO") {
                            cashSales += p.amount;
                        }
                    });
                } else if (order.paymentMethod) {
                    // Legacy fallback
                    salesByMethod[order.paymentMethod] = (salesByMethod[order.paymentMethod] || 0) + order.total;
                    if (order.paymentMethod === "DINHEIRO") {
                        cashSales += order.total;
                    }
                }
            });

            // Expected Total (Drawer) = Initial + Cash Sales ONLY
            const expectedTotal = reg.initialAmount + cashSales;

            // Difference = Final (Physical) - Expected
            const difference = (reg.finalAmount || 0) - expectedTotal;

            return {
                id: reg.id,
                openedAt: reg.openedAt,
                closedAt: reg.closedAt,
                status: reg.status,
                initialAmount: reg.initialAmount,
                finalAmount: reg.finalAmount,
                totalSales,
                salesByMethod,
                expectedTotal,
                difference
            };
        });

        return NextResponse.json(history);
    } catch (error) {
        console.error("Error fetching register history:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
