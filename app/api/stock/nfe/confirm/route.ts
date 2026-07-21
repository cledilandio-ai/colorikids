import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { parseNfeXml, isValidNfeXml } from "@/lib/nfeParser";
import { nfeImportConfirmSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const body = await request.json();

        // Validação Zod
        const parsed = nfeImportConfirmSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({
                error: "Dados inválidos",
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const { accessKey, items, xmlRaw, nfeNumber: bodyNfe, serie: bodySerie, supplierName, supplierCnpj, totalValue: bodyTotal } = parsed.data;

        // Verificar duplicidade
        const existing = await prisma.nfeImport.findUnique({
            where: { accessKey },
        });

        if (existing) {
            return NextResponse.json(
                {
                    error: "Esta NF-e já foi importada",
                    existingImport: {
                        id: existing.id,
                        status: existing.status,
                        createdAt: existing.createdAt,
                    },
                },
                { status: 409 }
            );
        }

        // Validar items — cada item precisa de variante associada E não estar ignorado
        const validItems = items.filter((item) => {
            if (item.ignore) return false;
            if (!item.matched) return false;
            if (!item.variantId) return false;
            return true;
        }) as Array<typeof items[number] & { variantId: string }>;

        if (validItems.length === 0) {
            return NextResponse.json(
                { error: "Nenhum item válido para importar. Associe produtos aos itens da NF-e." },
                { status: 400 }
            );
        }

        // Re-parse do XML para obter dados completos
        let parsedData = { supplier: { name: supplierName || "", cnpj: supplierCnpj || "" }, nfeNumber: parseInt(bodyNfe || "0") || 0, serie: parseInt(bodySerie || "0") || 0, totalValue: bodyTotal || 0, issuedAt: new Date() };
        if (xmlRaw && isValidNfeXml(xmlRaw)) {
            const parsedXml = parseNfeXml(xmlRaw);
            if (!("error" in parsedXml)) {
                parsedData = parsedXml;
            }
        }

        // Executar transação
        const result = await prisma.$transaction(async (tx) => {
            // 1. Criar NfeImport
            const nfeImport = await tx.nfeImport.create({
                data: {
                    storeId,
                    accessKey,
                    nfeNumber: parsedData.nfeNumber,
                    serie: parsedData.serie,
                    issuedAt: parsedData.issuedAt,
                    supplierCnpj: parsedData.supplier.cnpj || supplierCnpj || "",
                    supplierName: parsedData.supplier.name || supplierName || "",
                    totalValue: parsedData.totalValue || bodyTotal || 0,
                    xmlRaw: xmlRaw || null,
                    status: "CONFIRMED",
                    itemsTotal: validItems.length,
                    itemsMatched: validItems.length,
                },
            });

            let movementsCreated = 0;
            let totalCost = 0;

            // 2. Para cada item válido, criar movimentos de estoque
            for (const item of validItems) {
                const isNewProduct = item.isNewProduct || false;

                if (isNewProduct) {
                    // ── Produto NOVO criado no fluxo NF-e ──
                    // O estoque e transação financeira já foram criados no POST /api/products
                    // Aqui só registramos o histórico de importação

                    // Buscar variante (apenas para validação + histórico)
                    const variant = await tx.productVariant.findFirst({
                        where: {
                            id: item.variantId as string,
                            product: { storeId },
                        },
                    });

                    if (!variant) {
                        logger.warn({ variantId: item.variantId, storeId, nfeCode: item.nfeCode }, "Variante não encontrada — ignorando item NF-e (new product)");
                        continue;
                    }

                    await tx.nfeImportItem.create({
                        data: {
                            nfeImportId: nfeImport.id,
                            nfeItemNumber: item.nfeItemNumber,
                            nfeCode: item.nfeCode,
                            description: item.description,
                            unit: item.unit,
                            quantity: item.quantity,
                            unitValue: item.unitValue,
                            totalValue: item.totalValue,
                            productId: variant.productId,
                            variantId: variant.id,
                            matchedBy: item.matchedBy || "MANUAL",
                            stockMovementId: null,
                            inventoryLogId: null,
                        },
                    });

                    movementsCreated++;
                    totalCost += Math.round(item.quantity) * item.unitValue;
                    continue;
                }

                // ── Produto EXISTENTE (match manual/automático) ──
                // Atualizar estoque, criar movimentos e transação financeira

                const variant = await tx.productVariant.findFirst({
                    where: {
                        id: item.variantId as string,
                        product: { storeId },
                    },
                    include: { product: true },
                });

                if (!variant) {
                    logger.warn({ variantId: item.variantId, storeId, nfeCode: item.nfeCode }, "Variante não encontrada ou não pertence à loja — ignorando item NF-e");
                    continue;
                }

                const qty = Math.round(item.quantity);
                const costPrice = item.unitValue;

                // Calcular custo médio ponderado
                const allVariants = await tx.productVariant.findMany({
                    where: { productId: variant.productId },
                });
                const currentTotalStock = allVariants.reduce((acc, v) => acc + v.stockQuantity, 0);
                const currentCost = variant.product.costPrice || 0;

                const newCostPrice = currentTotalStock + qty > 0
                    ? ((currentTotalStock * currentCost) + (qty * costPrice)) / (currentTotalStock + qty)
                    : costPrice;

                await tx.product.update({
                    where: { id: variant.productId },
                    data: { costPrice: newCostPrice },
                });

                await tx.productVariant.update({
                    where: { id: variant.id },
                    data: {
                        stockQuantity: { increment: qty },
                        lastRestockAt: new Date(),
                    },
                });

                const movement = await tx.stockMovement.create({
                    data: {
                        type: "IN",
                        quantity: qty,
                        costPrice,
                        productVariantId: variant.id,
                        reason: `NF-e ${parsedData.nfeNumber} - ${item.nfeCode}`,
                        storeId,
                    },
                });

                const log = await tx.inventoryLog.create({
                    data: {
                        variantId: variant.id,
                        change: qty,
                        reason: `Entrada por NF-e #${parsedData.nfeNumber} - ${item.description}`,
                        storeId,
                    },
                });

                await tx.nfeImportItem.create({
                    data: {
                        nfeImportId: nfeImport.id,
                        nfeItemNumber: item.nfeItemNumber,
                        nfeCode: item.nfeCode,
                        description: item.description,
                        unit: item.unit,
                        quantity: item.quantity,
                        unitValue: item.unitValue,
                        totalValue: item.totalValue,
                        productId: variant.productId,
                        variantId: variant.id,
                        matchedBy: item.matchedBy || "MANUAL",
                        stockMovementId: movement.id,
                        inventoryLogId: log.id,
                    },
                });

                movementsCreated++;
                totalCost += qty * costPrice;

                await tx.treasuryTransaction.create({
                    data: {
                        description: `Compra NF-e #${parsedData.nfeNumber}: ${variant.product.name} (${variant.size})`,
                        amount: qty * costPrice,
                        type: "OUT",
                        category: "RESTOCK",
                        date: new Date(),
                        storeId,
                    },
                });
            }

            // Atualizar contagem no NfeImport
            await tx.nfeImport.update({
                where: { id: nfeImport.id },
                data: {
                    itemsTotal: validItems.length,
                    itemsMatched: movementsCreated,
                },
            });

            return { nfeImportId: nfeImport.id, movementsCreated, totalCost };
        });

        logger.info(
            { nfeImportId: result.nfeImportId, movementsCreated: result.movementsCreated, totalCost: result.totalCost, storeId },
            "Importação NF-e confirmada"
        );

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        logger.error({ err: error, route: "stock/nfe/confirm/POST", storeId }, "Erro ao confirmar importação NF-e");
        return NextResponse.json(
            { error: `Erro ao confirmar importação: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
