import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    try {
        const where = search ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } }
            ]
        } : {};

        const customers = await prisma.customer.findMany({
            where: where as any, // "mode" insentive requires casting or specific prisma types, simplifying here
            orderBy: { name: "asc" },
            take: 20
        });

        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, cpf, email, address } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const customer = await prisma.customer.create({
            data: { name, phone, cpf, email, address }
        });

        return NextResponse.json(customer);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, phone, cpf, email, address } = body;

        if (!id || !name) {
            return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: { name, phone, cpf, email, address }
        });

        return NextResponse.json(customer);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}
