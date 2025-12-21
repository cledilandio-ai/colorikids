import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StockDashboardClient } from "@/components/admin/StockDashboardClient";

export const dynamic = "force-dynamic";

export default async function InventoryDashboardPage() {
    // 1. Fetch Data
    // 1. Busca todos os variantes de produtos do banco de dados
    // Inclui os dados do produto pai para acesso a preço e custo
    const variants = await prisma.productVariant.findMany({
        include: {
            product: true,
        },
    });

    // 2. Agrupamento por Produto
    // 2. Agrupamento por Produto
    // Mapa para consolidar variantes (P/M/G) em um único produto abstrato para o dashboard
    const productsMap = new Map<string, {
        id: string;
        name: string;
        stockQuantity: number;
        minStock: number;
        totalValue: number;         // Custo total estocado (Custo Unit. * Qtd)
        totalPotentialRevenue: number; // Venda total projetada (Preço Venda * Qtd)
        costPrice: number;          // Custo unitário médio (apenas ref)
        price: number;              // Preço venda médio (apenas ref)
        lastRestockAt: Date | null;
        lastSoldAt: Date | null;
        createdAt: Date;
        variantCount: number;
        hasBrokenGrid: boolean;     // Se tem alguma variante zerada
        zeroedVariants: string[];   // Lista de nomes de variantes zeradas
        lowStockVariants: string[]; // Lista de nomes de variantes com estoque baixo
    }>();

    // Métricas Globais (Acumuladores para o topo do dashboard)
    let globalTotalStockCost = 0;
    let globalPotentialRevenue = 0;

    variants.forEach(variant => {
        const productId = variant.productId;
        const cost = Number(variant.product.costPrice || 0);
        const price = Number(variant.product.basePrice || 0);
        const qty = variant.stockQuantity;

        // Atualiza Globais Financeiros
        globalTotalStockCost += cost * qty;
        globalPotentialRevenue += price * qty;

        // Inicializa entrada no mapa se não existir
        if (!productsMap.has(productId)) {
            productsMap.set(productId, {
                id: productId,
                name: variant.product.name,
                stockQuantity: 0,
                minStock: 0,
                totalValue: 0,
                totalPotentialRevenue: 0,
                costPrice: cost,
                price: price,
                lastRestockAt: null,
                lastSoldAt: null,
                createdAt: variant.createdAt,
                variantCount: 0,
                hasBrokenGrid: false,
                zeroedVariants: [],
                lowStockVariants: []
            });
        }

        const product = productsMap.get(productId)!;
        product.stockQuantity += qty;

        // Soma estoque mínimo das variantes para ter o mínimo do produto
        // (Type casting necessário pois Prisma types podem estar defasados)
        const vMinStock = (variant as any).minStock || 1;
        product.minStock += vMinStock;

        product.totalValue += (qty * cost);
        product.totalPotentialRevenue += (qty * price);
        product.variantCount += 1;

        // Verificação de Grade Quebrada: Se tem zero estoque em uma variante específica
        if (qty === 0) {
            product.hasBrokenGrid = true;
            product.zeroedVariants.push(`${(variant as any).size} ${(variant as any).color}`);
        } else if (qty < vMinStock) {
            // Verificação de Baixo Estoque por variante
            product.lowStockVariants.push(`${(variant as any).size} ${(variant as any).color} (${qty})`);
        }

        // Atualiza Data mais recente de restock (reposição)
        const vRestock = (variant as any).lastRestockAt || variant.createdAt;
        if (!product.lastRestockAt || vRestock > product.lastRestockAt) {
            product.lastRestockAt = vRestock;
        }

        // Atualiza Data mais recente de venda
        const vSold = (variant as any).lastSoldAt;
        if (vSold && (!product.lastSoldAt || vSold > product.lastSoldAt)) {
            product.lastSoldAt = vSold;
        }
    });

    const OBSOLETE_MONTHS = 6;
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - OBSOLETE_MONTHS);

    let countBelowMin = 0;
    let countOutOfStock = 0;
    let countObsolete = 0;
    let valueObsolete = 0;

    // 3. Processamento Final e Classificação de Status
    // Converte o Map em Array e define o status final de cada produto
    const aggregatedProducts = Array.from(productsMap.values()).map(p => {
        const isOutOfStock = p.stockQuantity === 0;
        const isLowStock = p.stockQuantity < p.minStock && p.stockQuantity > 0;

        let status: 'ok' | 'low' | 'out' | 'obsolete' = 'ok';

        // Lógica de Obsolescência (Item parado há mais de X meses)
        const lastInput = p.lastRestockAt || p.createdAt;
        const isObsolete = p.stockQuantity > 0 && lastInput < sixMonthsAgo;

        // Definição de Prioridade de Status:
        // 1. Esgotado / Grade Quebrada (Mais crítico)
        // 2. Baixo Estoque
        // 3. Obsoleto
        // 4. OK
        if (isOutOfStock) {
            status = 'out';
            countOutOfStock++;
        } else if (p.hasBrokenGrid) {
            // Itens com grade quebrada aparecem no filtro de Esgotados
            status = 'out';
            countOutOfStock++;
        } else if (isLowStock || p.lowStockVariants.length > 0) {
            status = 'low';
            countBelowMin++;
        } else if (isObsolete) {
            status = 'obsolete';
            countObsolete++;
            valueObsolete += p.totalValue;
        }

        // Casos de borda: Se for baixo estoque mas também obsoleto, prioriza baixo estoque (alerta de reposição)
        if (status === 'low' && isObsolete) status = 'low';

        return {
            id: p.id,
            name: p.name,
            stockQuantity: p.stockQuantity,
            minStock: p.minStock,
            totalValue: p.totalValue,
            totalPotentialProfit: p.totalPotentialRevenue - p.totalValue, // Margem de Contribuição Bruta
            price: p.price,
            costPrice: p.costPrice,
            lastRestockAt: lastInput,
            lastSoldAt: p.lastSoldAt || null,
            status: status,
            variantCount: p.variantCount,
            hasBrokenGrid: p.hasBrokenGrid,
            zeroedVariants: p.zeroedVariants,
            lowStockVariants: p.lowStockVariants
        };
    });

    const metrics = {
        totalCost: globalTotalStockCost,
        potentialProfit: globalPotentialRevenue - globalTotalStockCost,
        obsoleteValue: valueObsolete,
        lowStockCount: countBelowMin,
        outOfStockCount: countOutOfStock,
        totalItems: aggregatedProducts.length,
        obsoleteCount: countObsolete
    };

    return (
        <div className="space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard de Estoque</h1>
                <p className="text-gray-500">Visão geral agregada por Produto.</p>
            </div>

            <StockDashboardClient metrics={metrics} products={aggregatedProducts} />
        </div>
    );
}
