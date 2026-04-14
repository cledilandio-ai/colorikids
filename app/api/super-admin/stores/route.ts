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
                const prevStore = await tx.store.findUnique({ where: { id: storeId }, include: { subscription: true } });
                await tx.store.update({ where: { id: storeId }, data: { status } });
                
                // Se estamos aprovando (Ativando) a loja, renovamos o ciclo para +30 dias
                if (status === "ACTIVE" && prevStore && prevStore.status !== "ACTIVE") {
                    const nextDueDate = new Date();
                    nextDueDate.setDate(nextDueDate.getDate() + 30); // 30 dias a partir de hoje
                    
                    if (prevStore.subscription) {
                        await tx.subscription.update({
                            where: { storeId },
                            data: { nextDueDate, status: "ACTIVE" }
                        });
                    } else {
                        // Caso a assinatura não exista (vem do Self Service)
                        const config = await tx.platformConfig.findUnique({ where: { id: 1 } });
                        await tx.subscription.create({
                            data: {
                                storeId,
                                status: "ACTIVE",
                                amount: config?.platformPlanValue ?? 49.90,
                                billingDay: nextDueDate.getDate(),
                                nextDueDate
                            }
                        });
                    }
                }
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

/** DELETE /api/super-admin/stores — Apaga violentamente uma loja e TODOS os seus dependentes */
export async function DELETE(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Acesso restrito ao Super Admin" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("id");

        if (!storeId) {
            return NextResponse.json({ error: "storeId é obrigatório" }, { status: 400 });
        }

        // Verifica se a loja existe e se está em PENDING
        const storeToDelete = await prisma.store.findUnique({ where: { id: storeId } });
        if (!storeToDelete) {
            return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
        }
        if (storeToDelete.status !== "PENDING") {
            return NextResponse.json({ error: "Segurança: Apenas lojas PENDENTES (nunca aprovadas) podem ser apagadas via Super Admin." }, { status: 403 });
        }

        // Deleta em cascata manualmente de forma estritamente mapeada com o Prisma Schema
        await prisma.$transaction(async (tx) => {
            // Remove Products & Variants
            const products = await tx.product.findMany({ where: { storeId }, select: { id: true } });
            if (products.length > 0) {
                await tx.productVariant.deleteMany({ where: { productId: { in: products.map(p => p.id) } } });
                await tx.product.deleteMany({ where: { storeId } });
            }

            // Remove Orders & Payments & Receivables
            const orders = await tx.order.findMany({ where: { storeId }, select: { id: true } });
            if (orders.length > 0) {
                await tx.payment.deleteMany({ where: { orderId: { in: orders.map(o => o.id) } } });
                await tx.accountReceivable.deleteMany({ where: { orderId: { in: orders.map(o => o.id) } } });
                await tx.order.deleteMany({ where: { storeId } });
            }

            // Remove Cash Registers & Transactions
            const registers = await tx.cashRegister.findMany({ where: { storeId }, select: { id: true } });
            if (registers.length > 0) {
                await tx.cashTransaction.deleteMany({ where: { cashRegisterId: { in: registers.map(r => r.id) } } });
                await tx.cashRegister.deleteMany({ where: { storeId } });
            }

            // Other dependencies mapped dynamically on Store
            await tx.inventoryLog.deleteMany({ where: { storeId } });
            await tx.stockMovement.deleteMany({ where: { storeId } });
            await tx.treasuryTransaction.deleteMany({ where: { storeId } });
            await tx.transactionCategory.deleteMany({ where: { storeId } });
            await tx.accountReceivable.deleteMany({ where: { customer: { storeId } } }); // Any orphan receivables
            await tx.customer.deleteMany({ where: { storeId } });
            await tx.user.deleteMany({ where: { storeId } });
            
            // 1-to-1 Relations
            await tx.storeConfig.deleteMany({ where: { storeId } });
            await tx.subscription.deleteMany({ where: { storeId } });
            
            // Delete Root Store
            await tx.store.delete({ where: { id: storeId } });
        });

        return NextResponse.json({ success: true, message: "Loja e todos os seus dados foram excluídos com sucesso." });
    } catch (error: any) {
        console.error("Error deleting store:", error);
        return NextResponse.json({ error: `Falha ao deletar loja e seus registros base. Detalhes: ${error.message}` }, { status: 500 });
    }
}
