import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user && user.password === password) {
            // In a real app, use bcrypt to compare hashed passwords
            const { password: _, ...userWithoutPassword } = user;
            return NextResponse.json({
                success: true,
                user: {
                    ...userWithoutPassword,
                    shouldChangePassword: user.shouldChangePassword
                }
            });
        }

        return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
