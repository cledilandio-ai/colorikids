import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            where: { storeId: ctx.storeId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                maxDiscount: true,
                permissions: true,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // 1. Garante que quem está criando tem contexto de loja (OWNER)
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { name, email, password, role, maxDiscount, permissions } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
        }

        // 2. Verifica se email já existe globalmente (para evitar colisões de login)
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            return NextResponse.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 409 });
        }

        // 3. Cria o funcionário vinculado ao storeId da sessão — isolamento garantido!
        const hashed = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase().trim(),
                password: hashed,
                role: role ?? "SELLER",
                maxDiscount: maxDiscount ?? 0,
                permissions: permissions ?? [],
                // ⬇️ CHAVE DO MULTI-TENANT: vincula ao storeId da sessão logada
                storeId: ctx.storeId,
            },
            select: { id: true, name: true, email: true, role: true },
        });

        return NextResponse.json({ success: true, user }, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Erro ao cadastrar funcionário." }, { status: 500 });
    }
}
