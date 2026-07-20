import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const registers = await prisma.cashRegister.findMany({
            where: { storeId },
            orderBy: { openedAt: "desc" },
            include: {
                orders: {
                    where: { storeId },
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
        logger.error({ err: error, route: "cash-register/history/GET", storeId }, "Error fetching register history");
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
