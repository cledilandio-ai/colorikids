import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { parseNfeXml, isValidNfeXml } from "@/lib/nfeParser";
import { matchNfeItems } from "@/lib/nfeMatcher";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    const ctx = await getAuthContext(request);
    if (!ctx?.storeId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { storeId } = ctx;

    try {
        // Extrair XML do FormData
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
        }

        // Validação de tipo
        if (!file.name.endsWith(".xml") && file.type !== "text/xml" && file.type !== "application/xml") {
            return NextResponse.json(
                { error: "Formato inválido. Envie um arquivo XML." },
                { status: 400 }
            );
        }

        // Validação de tamanho (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "Arquivo muito grande. Máximo: 5MB." },
                { status: 400 }
            );
        }

        // Ler conteúdo do XML
        const xmlContent = await file.text();

        // Validar se é XML de NF-e
        if (!isValidNfeXml(xmlContent)) {
            return NextResponse.json(
                { error: "Arquivo não parece ser uma NF-e válida. Verifique o conteúdo." },
                { status: 400 }
            );
        }

        // Parsear XML
        const parsed = parseNfeXml(xmlContent);

        if ("error" in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        // Fazer matching com produtos existentes
        const matches = await matchNfeItems(parsed.items, storeId);

        const totalMatched = matches.filter((m) => m.matched).length;

        logger.info(
            { nfeNumber: parsed.nfeNumber, supplierName: parsed.supplier.name, itemsTotal: parsed.items.length, itemsMatched: totalMatched, storeId },
            "NF-e processada com sucesso"
        );

        return NextResponse.json({
            ...parsed,
            items: matches,
            summary: {
                totalItems: parsed.items.length,
                totalMatched,
                totalUnmatched: parsed.items.length - totalMatched,
                totalValue: parsed.totalValue,
            },
            // XML raw para salvar depois no confirm
            xmlRaw: xmlContent,
        });
    } catch (error) {
        logger.error({ err: error, route: "stock/nfe/parse/POST", storeId }, "Error parsing NF-e XML");
        return NextResponse.json(
            { error: `Erro ao processar NF-e: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
