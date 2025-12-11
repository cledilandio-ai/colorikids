import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // Importando a biblioteca de segurança

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Busca o usuário no banco
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        // 2. Se o usuário não existir
        if (!user) {
            console.log("Login failed: User not found", normalizedEmail);
            return NextResponse.json({ success: false, error: "DEBUG: Usuário não encontrado no banco." }, { status: 401 });
        }

        // 3. Compara a senha
        const passwordMatch = await bcrypt.compare(password, user.password);

        // 4. Se a senha não bater
        if (!passwordMatch) {
            console.log("Login failed: Password mismatch for", normalizedEmail);
            return NextResponse.json({ success: false, error: "DEBUG: Senha incorreta." }, { status: 401 });
        }

        // 5. Se chegou aqui, deu tudo certo! Retorna os dados (sem a senha)
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            success: true,
            user: {
                ...userWithoutPassword,
                shouldChangePassword: user.shouldChangePassword
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}