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
        console.error("Error fetching treasury:", error);
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
        const { description, amount, type, category } = body;

        if (!description || !amount || !type || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const transaction = await prisma.treasuryTransaction.create({
            data: {
                description,
                amount: parseFloat(amount),
                type,
                category,
                date: new Date(),
                userId,
                storeId,
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Error creating transaction" }, { status: 500 });
    }
}
