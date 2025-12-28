import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json({ error: "Senha necessária" }, { status: 400 });
        }

        // Find ANY user with role OWNER
        const owners = await prisma.user.findMany({
            where: { role: "OWNER" }
        });

        if (owners.length === 0) {
            return NextResponse.json({ error: "Nenhum proprietário encontrado no sistema." }, { status: 404 });
        }

        // Check password against all owners (usually just one, but supports multiple)
        let isValid = false;
        let ownerMaxDiscount = 0;

        for (const owner of owners) {
            const match = await bcrypt.compare(password, owner.password);
            if (match) {
                isValid = true;
                ownerMaxDiscount = owner.maxDiscount;
                break;
            }
        }

        if (isValid) {
            return NextResponse.json({ success: true, maxDiscount: ownerMaxDiscount });
        } else {
            return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
        }

    } catch (error) {
        console.error("Error verifying owner password:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
