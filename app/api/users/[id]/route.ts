import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

// GET user by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ctx = await getAuthContext(request);
        if (!ctx?.storeId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { id } = params;
        // Garante que só busca usuários da mesma loja
        const user = await prisma.user.findFirst({
            where: { id, storeId: ctx.storeId }
        });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

// DELETE — remove usuário da loja
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ctx = await getAuthContext(request);
        if (!ctx?.storeId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { id } = params;
        // Verifica se o usuário pertence à loja e não é o próprio usuário logado
        const user = await prisma.user.findFirst({
            where: { id, storeId: ctx.storeId }
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (user.id === ctx.userId) {
            return NextResponse.json({ error: "Não é possível excluir a si mesmo" }, { status: 403 });
        }

        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}

// PUT / PATCH to update user details
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const ctx = await getAuthContext(request);
        if (!ctx?.storeId) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { id } = params;

        // Verifica se o usuário pertence à loja
        const existingUser = await prisma.user.findFirst({
            where: { id, storeId: ctx.storeId }
        });
        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const { name, email, role, maxDiscount, password } = body;

        const dataToUpdate: any = {
            name,
            email,
            role,
            maxDiscount: parseFloat(maxDiscount) || 0,
            permissions: Array.isArray(body.permissions) ? body.permissions : undefined
        };

        if (password && password.length >= 4) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: dataToUpdate
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);
    } catch (error) {
        logger.error({ err: error, route: "users/[id]/PUT", userId: params.id }, "Error updating user");
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
