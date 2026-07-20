import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform-config
 * Rota pública — retorna as configurações da plataforma para a landing page.
 * Cria o registro singleton com valores padrão se não existir.
 */
export async function GET() {
    try {
        let config = await prisma.platformConfig.findUnique({ where: { id: 1 } });

        if (!config) {
            config = await prisma.platformConfig.create({
                data: { id: 1 }
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        logger.error({ err: error, route: "platform-config/GET" }, "Error fetching platform config");
        return NextResponse.json({ error: "Erro ao buscar configurações da plataforma" }, { status: 500 });
    }
}
