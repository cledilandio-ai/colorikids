import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { userId, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                shouldChangePassword: false
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}