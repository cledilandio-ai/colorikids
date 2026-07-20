import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    try {
        const where: any = { storeId };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } }
            ];
        }

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { name: "asc" },
            take: 20
        });

        return NextResponse.json(customers);
    } catch (error) {
        logger.error({ err: error, route: "customers/GET", storeId }, "Failed to fetch customers");
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const body = await request.json();
        const parsed = createCustomerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { name, phone, cpf, email, address } = parsed.data;

        const customer = await prisma.customer.create({
            data: { name, phone: phone || null, cpf: cpf || null, email: email || null, address: address || null, storeId }
        });

        return NextResponse.json(customer);
    } catch (error) {
        logger.error({ err: error, route: "customers/POST", storeId }, "Failed to create customer");
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const body = await request.json();
        const parsed = updateCustomerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { id, name, phone, cpf, email, address } = parsed.data;

        // Verifica se o cliente pertence à loja antes de atualizar
        const existing = await prisma.customer.findFirst({ where: { id, storeId } });
        if (!existing) {
            return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: { name, phone: phone || null, cpf: cpf || null, email: email || null, address: address || null }
        });

        return NextResponse.json(customer);
    } catch (error) {
        logger.error({ err: error, route: "customers/PUT", storeId }, "Failed to update customer");
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}
