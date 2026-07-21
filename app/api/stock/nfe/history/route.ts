import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
        const skip = (page - 1) * limit;

        const [imports, total] = await Promise.all([
            prisma.nfeImport.findMany({
                where: { storeId },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: {
                    items: {
                        select: {
                            id: true,
                            nfeItemNumber: true,
                            nfeCode: true,
                            description: true,
                            quantity: true,
                            unitValue: true,
                            totalValue: true,
                            matchedBy: true,
                            productId: true,
                            variantId: true,
                        },
                    },
                },
            }),
            prisma.nfeImport.count({ where: { storeId } }),
        ]);

        return NextResponse.json({
            imports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error({ err: error, route: "stock/nfe/history/GET", storeId }, "Erro ao buscar histórico NF-e");
        return NextResponse.json(
            { error: "Erro ao buscar histórico" },
            { status: 500 }
        );
    }
}
