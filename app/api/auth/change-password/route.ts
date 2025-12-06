import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcrypt"; // Manter comentado

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            // --- INICIO DO DEBUG: ESTAMOS REGISTRANDO AS SENHAS ---
            console.log("--- DEBUG INICIO ---");
            console.log("Senha digitada (Input):", password);
            console.log("Senha no Banco (Valor Real Lido):", user.password);
            console.log("--- DEBUG FIM ---");
            // --- FIM DO DEBUG ---

            // COMPARACAO INSEGURA DE EMERGENCIA (PARA DEBUG):
            if (user.password === password) {
                const { password: _, ...userWithoutPassword } = user;
                return NextResponse.json({
                    success: true,
                    user: {
                        ...userWithoutPassword,
                        shouldChangePassword: user.shouldChangePassword
                    }
                });
            }
        }

        return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}