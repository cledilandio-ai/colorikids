import { XMLParser } from "fast-xml-parser";

// =============================================================================
// Tipos
// =============================================================================

export interface NfeSupplier {
    cnpj: string;
    name: string;
}

export interface NfeItem {
    nfeItemNumber: number;
    nfeCode: string;
    description: string;
    ncm: string | null;
    cfop: string | null;
    unit: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
    discount: number;
}

export interface NfeParseResult {
    accessKey: string;
    nfeNumber: number;
    serie: number;
    issuedAt: Date;
    supplier: NfeSupplier;
    totalValue: number;
    items: NfeItem[];
    rawJson: unknown; // JSON parsed do XML para debug
}

// =============================================================================
// Parser
// =============================================================================

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (name) =>
        name === "det" || name === "vol" || name === "pag" || name === "dup",
});

/**
 * Extrai a chave de acesso de 44 dígitos do Id da infNFe.
 * Formato: "NFe35260707009302000170550020000320761140520188"
 */
function extractAccessKey(infNFeId: string): string {
    // Remove prefixo "NFe" e retorna apenas os 44 dígitos
    return String(infNFeId || "").replace(/^NFe/i, "").trim();
}

/**
 * Converte string numérica brasileira (ex: "37.9") para number.
 * NF-e usa ponto como separador decimal (formato internacional).
 */
function parseNfeNumber(value: string | number): number {
    if (typeof value === "number") return value;
    return parseFloat(value.replace(",", ".")) || 0;
}

/**
 * Converte string de data ISO da NF-e para Date.
 * Formato: "2026-07-20T15:09:35-03:00"
 */
function parseNfeDate(dateStr: string | unknown): Date {
    return new Date(String(dateStr || ""));
}

/**
 * Processa o JSON parseado do XML da NF-e e extrai os dados estruturados.
 */
export function parseNfeXml(xmlContent: string): NfeParseResult | { error: string } {
    try {
        const parsed = parser.parse(xmlContent);

        // NF-e pode vir em nfeProc.NFe.infNFe ou direto em NFe.infNFe
        const infNFe = (parsed.nfeProc?.NFe?.infNFe) || (parsed.NFe?.infNFe);

        if (!infNFe) {
            return { error: "XML inválido: tag <infNFe> não encontrada" };
        }

        // ---- Dados do fornecedor ----
        const emit = infNFe.emit;
        if (!emit || !emit.CNPJ) {
            return { error: "XML inválido: tag <emit> ou <CNPJ> não encontrada" };
        }

        const supplier: NfeSupplier = {
            cnpj: String(emit.CNPJ).replace(/\D/g, ""), // Remove ./- da formatação
            name: String(emit.xNome || "Fornecedor não identificado"),
        };

        // ---- Dados da NF-e ----
        const ide = infNFe.ide;
        if (!ide || !ide.nNF) {
            return { error: "XML inválido: tag <ide> ou <nNF> não encontrada" };
        }

        const accessKey = extractAccessKey(infNFe["@_Id"] || "");
        if (accessKey.length !== 44) {
            return { error: "Chave de acesso inválida: deve ter 44 dígitos" };
        }

        const nfeNumber = parseInt(String(ide.nNF)) || 0;
        const serie = parseInt(String(ide.serie)) || 0;
        const issuedAt = parseNfeDate(ide.dhEmi || ide.dhSaiEnt);

        // ---- Total ----
        const tot = infNFe.total as Record<string, unknown> | undefined;
        const icmsTot = tot?.ICMSTot as Record<string, unknown> | undefined;
        const totalValue = parseNfeNumber(
            (icmsTot?.vNF as string | number) ||
            (tot?.vNFTot as string | number) ||
            0
        );

        // ---- Itens ----
        const detArray = infNFe.det;
        if (!detArray || !Array.isArray(detArray) || detArray.length === 0) {
            return { error: "XML inválido: nenhum item (<det>) encontrado" };
        }

        const items: NfeItem[] = detArray.map((det: Record<string, unknown>) => {
            const prod = (det.prod as Record<string, unknown>) || {};
            return {
                nfeItemNumber: parseInt(String(det["@_nItem"] || "0")),
                nfeCode: String(prod.cProd ?? "").trim(),
                description: String(prod.xProd ?? "").trim(),
                ncm: prod.NCM ? String(prod.NCM).trim() : null,
                cfop: prod.CFOP ? String(prod.CFOP).trim() : null,
                unit: String(prod.uCom ?? "UN").trim(),
                quantity: parseNfeNumber((prod.qCom as string | number) || 0),
                unitValue: parseNfeNumber((prod.vUnCom as string | number) || 0),
                totalValue: parseNfeNumber((prod.vProd as string | number) || 0),
                discount: parseNfeNumber((prod.vDesc as string | number) || 0),
            };
        });

        return {
            accessKey,
            nfeNumber,
            serie,
            issuedAt,
            supplier,
            totalValue,
            items,
            rawJson: parsed,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao parsear XML";
        return { error: `Erro ao processar XML: ${message}` };
    }
}

/**
 * Valida se o conteúdo parece ser um XML de NF-e.
 */
export function isValidNfeXml(xmlContent: string): boolean {
    const trimmed = xmlContent.trim();
    // Verifica se começa com <?xml e contém tags essenciais da NF-e
    return (
        (trimmed.startsWith("<?xml") || trimmed.startsWith("<nfeProc") || trimmed.startsWith("<NFe")) &&
        (trimmed.includes("<infNFe") || trimmed.includes("<det")) &&
        (trimmed.includes("<emit") || trimmed.includes("<prod"))
    );
}
