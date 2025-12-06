import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"; // Importação para criptografia

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { userId, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // --- HASHING IMPLEMENTADO AQUI ---
        // 1. Gera o hash da nova senha com 10 rounds de salt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword, // AGORA SALVA A SENHA CRIPTOGRAFADA
                shouldChangePassword: false
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}