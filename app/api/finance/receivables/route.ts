import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // PENDING, PAID, OVERDUE

    try {
        const where: any = {};
        if (status) {
            where.status = status;
        }

        const receivables = await prisma.accountReceivable.findMany({
            where,
            include: {
                customer: {
                    select: { name: true, phone: true }
                },
                order: {
                    select: { id: true, createdAt: true }
                }
            },
            orderBy: { dueDate: "asc" }
        });

        return NextResponse.json(receivables);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch receivables" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, action } = body;

        if (action === "MARK_PAID") {
            const receivable = await prisma.accountReceivable.update({
                where: { id },
                data: {
                    status: "PAID",
                    updatedAt: new Date()
                }
            });

            // Optionally: Create a TreasuryTransaction for this income?
            // For now, let's keep it simple.

            return NextResponse.json(receivable);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update receivable" }, { status: 500 });
    }
}
