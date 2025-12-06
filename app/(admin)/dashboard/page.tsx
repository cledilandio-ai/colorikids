import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Force dynamic rendering as we are fetching data that changes constantly
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // Determine start of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Run queries in parallel
    const [
        todaySalesAgg,
        todayOrdersCount,
        pendingOrdersCount,
        lowStockCount,
        latestSales
    ] = await Promise.all([
        prisma.order.aggregate({
            _sum: { total: true },
            where: {
                createdAt: { gte: startOfDay },
                status: { not: "CANCELLED" }
            }
        }),
        prisma.order.count({
            where: { createdAt: { gte: startOfDay } }
        }),
        prisma.order.count({
            where: { status: "PENDING" }
        }),
        prisma.productVariant.count({
            where: { stockQuantity: { lte: 5 } }
        }),
        prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { customer: true }
        })
    ]);

    const todaySalesTotal = todaySalesAgg._sum.total || 0;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Visão Geral</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Link href="/orders" className="block transition-transform hover:scale-105">
                    <div className="rounded-xl border bg-white p-6 shadow-sm h-full">
                        <h3 className="text-sm font-medium text-gray-500">Vendas Hoje</h3>
                        <p className="mt-2 text-3xl font-bold text-primary">
                            {formatCurrency(todaySalesTotal)}
                        </p>
                        <span className="text-xs text-gray-500">
                            {todayOrdersCount} pedidos hoje
                        </span>
                    </div>
                </Link>
                <Link href="/orders?status=PENDING" className="block transition-transform hover:scale-105">
                    <div className="rounded-xl border bg-white p-6 shadow-sm h-full">
                        <h3 className="text-sm font-medium text-gray-500">Pedidos Pendentes</h3>
                        <p className="mt-2 text-3xl font-bold text-secondary">{pendingOrdersCount}</p>
                        <span className="text-xs text-gray-500">Aguardando processamento</span>
                    </div>
                </Link>
                <Link href="/products?lowStock=true" className="block transition-transform hover:scale-105">
                    <div className="rounded-xl border bg-white p-6 shadow-sm h-full">
                        <h3 className="text-sm font-medium text-gray-500">Estoque Baixo</h3>
                        <p className="mt-2 text-3xl font-bold text-red-500">{lowStockCount}</p>
                        <span className="text-xs text-gray-500">Produtos precisam de reposição</span>
                    </div>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">Últimas Vendas</h2>
                {latestSales.length === 0 ? (
                    <div className="text-gray-500">Nenhuma venda recente registrada.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {latestSales.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                                        <td className="px-4 py-3">{order.customer?.name || order.customerName || "Cliente não iden."}</td>
                                        <td className="px-4 py-3 font-medium">{formatCurrency(order.total)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium 
                                                ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'}`}>
                                                {order.status === 'COMPLETED' ? 'Concluído' :
                                                    order.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
