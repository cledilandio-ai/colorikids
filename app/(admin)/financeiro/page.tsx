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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Financeiro Central</h1>
            <FinanceTabs
                transactions={transactions}
                totalIn={revenue}
                totalOut={totalOut}
                balance={balance}
            />
        </div>
    );
}
