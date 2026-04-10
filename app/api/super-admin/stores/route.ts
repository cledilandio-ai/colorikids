import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

/** GET /api/super-admin/stores — Lista todas as lojas com métricas básicas */
export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const stores = await prisma.store.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                subscription: true,
                _count: {
                    select: {
                        users: true,
                        orders: true,
                        products: true,
                    }
                }
            }
        });

        return NextResponse.json(stores);
    } catch (error) {
        console.error("Error fetching stores:", error);
        return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
    }
}

/** POST /api/super-admin/stores — Cria nova loja + usuário OWNER */
export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const {
            storeName,
            storeSlug,
            ownerName,
            ownerEmail,
            ownerPassword,
            subscriptionAmount,
            billingDay,
        } = body;

        if (!storeName || !storeSlug || !ownerName || !ownerEmail || !ownerPassword) {
            return NextResponse.json({ error: "Campos obrigatórios: storeName, storeSlug, ownerName, ownerEmail, ownerPassword" }, { status: 400 });
        }

        // Verifica slug único
        const slugExists = await prisma.store.findUnique({ where: { slug: storeSlug } });
        if (slugExists) {
            return NextResponse.json({ error: "Slug já está em uso. Escolha outro." }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(ownerPassword, 12);
        const nextDueDate = new Date();
        nextDueDate.setDate(billingDay || 1);
        if (nextDueDate < new Date()) {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Cria a Store
            const store = await tx.store.create({
                data: {
                    name: storeName,
                    slug: storeSlug,
                    status: "ACTIVE",
                }
            });

            // 2. Cria a Subscription
            await tx.subscription.create({
                data: {
                    storeId: store.id,
                    status: "ACTIVE",
                    amount: parseFloat(subscriptionAmount) || 0,
                    billingDay: parseInt(billingDay) || 1,
                    nextDueDate,
                }
            });

            // 3. Cria o usuário OWNER
            const owner = await tx.user.create({
                data: {
                    name: ownerName,
                    email: ownerEmail.toLowerCase().trim(),
                    password: hashedPassword,
                    role: "OWNER",
                    storeId: store.id,
                    shouldChangePassword: true, // Força troca no primeiro acesso
                }
            });

            // 4. Cria StoreConfig padrão
            await tx.storeConfig.create({
                data: {
                    storeId: store.id,
                    companyName: storeName,
                }
            });

            return { store, ownerId: owner.id };
        });

        return NextResponse.json({
            success: true,
            storeId: result.store.id,
            storeSlug: result.store.slug,
            message: `Loja "${storeName}" criada com sucesso. Owner: ${ownerEmail} (senha temporária definida, troca obrigatória no primeiro acesso).`
        });

    } catch (error: any) {
        console.error("Error creating store:", error);
        return NextResponse.json({ error: `Failed to create store: ${error.message}` }, { status: 500 });
    }
}

/** PATCH /api/super-admin/stores — Atualiza status de uma loja */
export async function PATCH(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { storeId, status, subscriptionStatus, notes } = body;

        if (!storeId) {
            return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            if (status) {
                await tx.store.update({ where: { id: storeId }, data: { status } });
            }
            if (subscriptionStatus || notes) {
                await tx.subscription.update({
                    where: { storeId },
                    data: {
                        ...(subscriptionStatus && { status: subscriptionStatus }),
                        ...(notes !== undefined && { notes }),
                    }
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating store:", error);
        return NextResponse.json({ error: `Failed to update store: ${error.message}` }, { status: 500 });
    }
}
