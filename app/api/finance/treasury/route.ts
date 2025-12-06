import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
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
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: "Error creating transaction" },
            { status: 500 }
        );
    }
}
