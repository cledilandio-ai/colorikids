import { prisma } from "@/lib/db";
import type { NfeItem } from "@/lib/nfeParser";

// =============================================================================
// Tipos
// =============================================================================

export interface MatchResult {
    nfeItemNumber: number;
    nfeCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
    matched: boolean;
    matchedBy: "SKU" | "NAME" | "MANUAL" | null;
    productId: string | null;
    variantId: string | null;
    productName: string | null;
    variantLabel: string | null;
    confidence: number; // 0 a 1
}

export interface MatchedProduct {
    id: string;
    name: string;
    variants: {
        id: string;
        size: string;
        color: string | null;
        sku: string | null;
        stockQuantity: number;
    }[];
}

// =============================================================================
// Normalização de string para comparação
// =============================================================================

function normalize(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s]/g, "")      // Remove caracteres especiais
        .replace(/\s+/g, " ")             // Espaços múltiplos → um
        .trim();
}

/**
 * Similaridade de Levenshtein simples.
 * Retorna valor entre 0 e 1 (1 = idêntico).
 */
function levenshteinSimilarity(a: string, b: string): number {
    const aNorm = normalize(a);
    const bNorm = normalize(b);

    if (aNorm === bNorm) return 1;
    if (aNorm.length === 0 || bNorm.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= bNorm.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= aNorm.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= bNorm.length; i++) {
        for (let j = 1; j <= aNorm.length; j++) {
            const cost = aNorm[j - 1] === bNorm[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const maxLen = Math.max(aNorm.length, bNorm.length);
    return 1 - matrix[bNorm.length][aNorm.length] / maxLen;
}

// =============================================================================
// Matching
// =============================================================================

const CONFIDENCE_AUTO = 1.0;
const CONFIDENCE_SKU_SIMILAR = 0.85;
const CONFIDENCE_NAME_STRONG = 0.7;
const CONFIDENCE_NAME_WEAK = 0.4;

/**
 * Busca produtos e variantes da loja para matching.
 */
async function getStoreProducts(storeId: string): Promise<MatchedProduct[]> {
    const products = await prisma.product.findMany({
        where: { storeId, active: true },
        include: {
            variants: {
                where: { active: true },
                select: {
                    id: true,
                    size: true,
                    color: true,
                    sku: true,
                    stockQuantity: true,
                },
            },
        },
    });

    return products.map((p) => ({
        id: p.id,
        name: p.name,
        variants: p.variants.map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            sku: v.sku,
            stockQuantity: v.stockQuantity,
        })),
    }));
}

type BestMatch = {
    productId: string;
    variantId: string | null;
    productName: string;
    variantLabel: string;
    confidence: number;
};

/**
 * Algoritmo principal de matching:
 * 1. Match por SKU exato (cProd = sku)
 * 2. Match por SKU similar (case-insensitive, sem espaços)
 * 3. Match por nome (fuzzy via Levenshtein)
 */
export async function matchNfeItems(
    items: NfeItem[],
    storeId: string
): Promise<MatchResult[]> {
    const products = await getStoreProducts(storeId);

    return items.map((item) => {
        const result: MatchResult = {
            nfeItemNumber: item.nfeItemNumber,
            nfeCode: item.nfeCode,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitValue: item.unitValue,
            totalValue: item.totalValue,
            matched: false,
            matchedBy: null,
            productId: null,
            variantId: null,
            productName: null,
            variantLabel: null,
            confidence: 0,
        };

        const nfeCodeNormalized = normalize(item.nfeCode);
        if (!nfeCodeNormalized) return result;

        let bestMatch: BestMatch | null = null;

        for (const product of products) {
            for (const variant of product.variants) {
                if (!variant.sku) continue;

                const skuNorm = normalize(variant.sku);

                // Passo 1: SKU exato (case-insensitive)
                if (skuNorm === nfeCodeNormalized) {
                    bestMatch = {
                        productId: product.id,
                        variantId: variant.id,
                        productName: product.name,
                        variantLabel: `${variant.size}${variant.color ? " - " + variant.color : ""}`,
                        confidence: CONFIDENCE_AUTO,
                    };
                    break;
                }

                // Passo 2: SKU sem espaços (códigos com formatação diferente)
                const skuNoSpace = skuNorm.replace(/\s/g, "");
                const codeNoSpace = nfeCodeNormalized.replace(/\s/g, "");
                if (skuNoSpace === codeNoSpace) {
                    if (!bestMatch || bestMatch.confidence < CONFIDENCE_SKU_SIMILAR) {
                        bestMatch = {
                            productId: product.id,
                            variantId: variant.id,
                            productName: product.name,
                            variantLabel: `${variant.size}${variant.color ? " - " + variant.color : ""}`,
                            confidence: CONFIDENCE_SKU_SIMILAR,
                        };
                    }
                    continue;
                }
            }

            // Se já achou SKU exato, não precisa fazer fuzzy match por nome
            if (bestMatch && bestMatch.confidence >= CONFIDENCE_AUTO) break;
        }

        // Passo 3: Fuzzy match por nome do produto (se não achou por SKU)
        if (!bestMatch || bestMatch.confidence < CONFIDENCE_AUTO) {
            let bestNameConfidence = 0;
            let nameBestMatch: BestMatch | null = null;

            for (const product of products) {
                const similarity = levenshteinSimilarity(item.description, product.name);

                if (similarity >= CONFIDENCE_NAME_STRONG && similarity > bestNameConfidence) {
                    bestNameConfidence = similarity;
                    nameBestMatch = {
                        productId: product.id,
                        variantId: null,
                        productName: product.name,
                        variantLabel: "",
                        confidence: similarity,
                    };
                }
            }

            // Só substitui se a confiança for maior que o match atual
            if (nameBestMatch && (!bestMatch || nameBestMatch.confidence > bestMatch.confidence)) {
                bestMatch = nameBestMatch;
            }
        }

        if (bestMatch) {
            result.matched = true;
            result.matchedBy = bestMatch.confidence >= CONFIDENCE_AUTO ? "SKU" : "NAME";
            result.productId = bestMatch.productId;
            result.variantId = bestMatch.variantId;
            result.productName = bestMatch.productName;
            result.variantLabel = bestMatch.variantLabel;
            result.confidence = bestMatch.confidence;
        }

        return result;
    });
}

/**
 * Busca todos os produtos da loja para o modal de match manual.
 */
export async function getProductsForManualMatch(storeId: string): Promise<MatchedProduct[]> {
    return getStoreProducts(storeId);
}
