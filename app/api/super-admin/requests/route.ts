import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { logger } from "@/lib/logger";

/** 
 * API para Gestão de Solicitações de Cadastro 
 * GET - Lista solicitações
 * POST - Aprova uma solicitação (Cria a loja e o usuário)
 * DELETE - Recusa/Exclui uma solicitação
 */

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const requests = await prisma.registrationRequest.findMany({
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(requests);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const { requestId, action } = await request.json();

        if (action === "APPROVE") {
            const req = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
            if (!req) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });

            // Transação Atômica: Cria Loja, Usuário e Configuração, depois apaga a solicitação
            const result = await prisma.$transaction(async (tx) => {
                // 1. Cria a Loja
                const store = await tx.store.create({
                    data: {
                        name: req.storeName,
                        slug: req.storeSlug,
                        status: "ACTIVE", // Já entra como ativa pois o Admin aprovou o Pix
                    }
                });

                // 2. Cria o Usuário Owner
                const user = await tx.user.create({
                    data: {
                        name: req.ownerName,
                        email: req.ownerEmail,
                        password: req.ownerPassword,
                        role: "OWNER",
                        storeId: store.id
                    }
                });

                // 3. Cria Config Inicial e Assinatura
                await tx.storeConfig.create({
                    data: {
                        storeId: store.id,
                        companyName: req.storeName,
                        whatsapp: req.phone || "",
                    }
                });

                const config = await tx.platformConfig.findUnique({ where: { id: 1 } });
                const nextDueDate = new Date();
                nextDueDate.setDate(nextDueDate.getDate() + 30);

                await tx.subscription.create({
                    data: {
                        storeId: store.id,
                        status: "ACTIVE",
                        amount: config?.platformPlanValue ?? 49.90,
                        billingDay: nextDueDate.getDate(),
                        nextDueDate
                    }
                });

                // 4. Apaga a solicitação
                await tx.registrationRequest.delete({ where: { id: requestId } });

                return store;
            });

            return NextResponse.json({ success: true, store: result });
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

    } catch (error: any) {
        logger.error({ err: error, route: "super-admin/requests/POST" }, "Error approving request");
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

        await prisma.registrationRequest.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
