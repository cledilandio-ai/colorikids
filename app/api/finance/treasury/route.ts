import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { treasurySchema } from "@/lib/validation";
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
        const type = searchParams.get("type");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const where: any = { storeId };
        if (type) where.type = type;
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to);
        }

        const transactions = await prisma.treasuryTransaction.findMany({
            where,
            orderBy: { date: "desc" },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        logger.error({ err: error, route: "finance/treasury/GET", storeId }, "Error fetching treasury");
        return NextResponse.json({ error: "Error fetching treasury" }, { status: 500 });
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
        const parsed = treasurySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { description, amount, type, category } = parsed.data;

        const transaction = await prisma.treasuryTransaction.create({
            data: {
                description,
                amount,
                type,
                category,
                date: new Date(),
                userId,
                storeId,
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        logger.error({ err: error, route: "finance/treasury/POST", storeId }, "Error creating treasury transaction");
        return NextResponse.json({ error: "Error creating transaction" }, { status: 500 });
    }
}
