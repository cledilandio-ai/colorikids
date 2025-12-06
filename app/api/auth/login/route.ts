import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"; // Importando a biblioteca de segurança

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // 1. Busca o usuário no banco
        console.log("Login attempt for:", email);
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // 2. Se o usuário não existir, retorna erro imediatamente
        if (!user) {
            console.log("User not found:", email);
            return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
        }

        console.log("User found, checking password...");
        // 3. Compara a senha digitada com a senha criptografada no banco
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log("Password match result:", passwordMatch);

        // 4. Se a senha não bater, retorna erro
        if (!passwordMatch) {
            console.log("Password mismatch for user:", email);
            return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
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