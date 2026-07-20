import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
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

        const where: any = { customer: { storeId } }; // Receivables pertence ao Customer que pertence à Store
        if (status) {
            where.status = status;
        }

        const receivables = await prisma.accountReceivable.findMany({
            where,
            include: { customer: true, order: true },
            orderBy: { dueDate: "asc" }
        });

        return NextResponse.json(receivables);
    } catch (error) {
        logger.error({ err: error, route: "finance/receivables/GET", storeId }, "Error fetching receivables");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
