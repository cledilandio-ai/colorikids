import { prisma } from "@/lib/db";
import { FinanceTabs } from "@/components/admin/finance/FinanceTabs";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    // Fetch all transactions
    const transactions = await prisma.treasuryTransaction.findMany({
        orderBy: { date: 'desc' },
    });

    // Calculate totals
    const totalIn = transactions
        .filter(t => t.type === 'IN')
        .reduce((acc, t) => acc + t.amount, 0);

    const totalOut = transactions
        .filter(t => t.type === 'OUT')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = totalIn - totalOut;

    // Filter Revenue for Display (Exclude Internal Transfers)
    // "Entradas" in the UI will represent Revenue/Faturamento
    const revenue = transactions
        .filter(t => t.type === 'IN' && t.category !== 'INTERNAL_TRANSFER')
        .reduce((acc, t) => acc + t.amount, 0);

    // Fetch Sales (Orders) for Margin Calculation
    const orders = await prisma.order.findMany({
        where: {
            status: 'COMPLETED',
            active: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const products = await prisma.product.findMany({
        select: { id: true, costPrice: true }
    });

    const variants = await prisma.productVariant.findMany({
        select: { id: true, productId: true }
    });

    // Create a generic cost map that can resolve cost from either ProductId or VariantId
    const costMap = new Map<string, number>();

    // 1. Map Product ID -> Cost
    products.forEach(p => costMap.set(p.id, p.costPrice));

    // 2. Map Variant ID -> Cost (inherited from Product)
    variants.forEach(v => {
        const productCost = costMap.get(v.productId);
        if (productCost !== undefined) {
            costMap.set(v.id, productCost);
        }
    });

    const salesData = orders.map(order => {
        let totalCost = 0;
        try {
            const items = JSON.parse(order.items as string);
            if (Array.isArray(items)) {
                items.forEach((item: any) => {
                    // Try to resolve cost using various potential ID fields
                    // Priority: productVariantId -> variantId -> productId -> id
                    const idToContent = item.productVariantId || item.variantId || item.productId || item.id;
                    const cost = costMap.get(idToContent) || 0;

                    totalCost += cost * (item.quantity || 1);
                });
            }
        } catch (e) {
            console.error(`Error parsing items for order ${order.id}`, e);
        }

        return {
            id: order.id,
            date: order.createdAt,
            customerName: order.customerName || 'Cliente Não Identificado',
            total: order.total,
            cost: totalCost,
            margin: order.total - totalCost,
            marginPercent: order.total > 0 ? ((order.total - totalCost) / order.total) * 100 : 0
        };
    });

    const config = await prisma.storeConfig.findFirst();
    const companyName = config?.companyName || 'Vast Cosmos';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Financeiro Central</h1>
            <FinanceTabs
                transactions={transactions}
                salesData={salesData}
                totalIn={revenue}
                totalOut={totalOut}
                balance={balance}
                companyName={companyName}
            />
        </div>
    );
}
