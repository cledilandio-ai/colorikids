import { prisma } from "@/lib/db";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
    const where = {
        ...(searchParams.status ? { status: searchParams.status } : {}),
        active: true
    };

    const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });

    const statusColors = {
        PENDING: "bg-yellow-100 text-yellow-800",
        COMPLETED: "bg-green-100 text-green-800",
        CANCELLED: "bg-red-100 text-red-800",
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Pedidos</h1>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Cliente</th>
                                <th className="px-6 py-4 font-medium">Data</th>
                                <th className="px-6 py-4 font-medium">Tipo</th>
                                <th className="px-6 py-4 font-medium">Total</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Itens</th>
                                <th className="px-6 py-4 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum pedido encontrado.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                                                {order.customerName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(order.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">
                                                {order.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            R$ {order.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColors[order.status as keyof typeof statusColors] || "bg-gray-100"
                                                    }`}
                                            >
                                                {order.status === "COMPLETED" ? "Concluído" :
                                                    order.status === "PENDING" ? "Pendente" :
                                                        order.status === "CANCELLED" ? "Cancelado" : order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">
                                            {/* Parse JSON items if needed, or just show count */}
                                            {(() => {
                                                try {
                                                    const items = JSON.parse(order.items);
                                                    return Array.isArray(items) ? `${items.length} itens` : "Detalhes...";
                                                } catch {
                                                    return order.items;
                                                }
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/orders/${order.id}`}>
                                                <Button variant="outline" size="sm" className="gap-2">
                                                    Ver / Separar
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards (Visible only on mobile) */}
            <div className="md:hidden space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Nenhum pedido encontrado.</div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <Link href={`/orders/${order.id}`} className="font-bold text-gray-900 text-lg hover:text-primary block">
                                        {order.customerName}
                                    </Link>
                                    <span className="text-xs text-gray-500 block mt-1">
                                        {format(order.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColors[order.status as keyof typeof statusColors] || "bg-gray-100"
                                        }`}
                                >
                                    {order.status === "COMPLETED" ? "Concluído" :
                                        order.status === "PENDING" ? "Pendente" :
                                            order.status === "CANCELLED" ? "Cancelado" : order.status}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-2 border-t border-b border-gray-50 my-2">
                                <div className="text-sm">
                                    <span className="text-gray-500">Total:</span>
                                    <span className="ml-2 font-bold text-gray-900">R$ {order.total.toFixed(2)}</span>
                                </div>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                    {order.type}
                                </span>
                            </div>

                            <div className="flex justify-between items-center mt-3">
                                <span className="text-xs text-gray-500">
                                    {(() => {
                                        try {
                                            const items = JSON.parse(order.items);
                                            return Array.isArray(items) ? `${items.length} itens` : "Detalhes...";
                                        } catch {
                                            return order.items;
                                        }
                                    })()}
                                </span>
                                <Link href={`/orders/${order.id}`}>
                                    <Button variant="outline" size="sm" className="w-full">
                                        Ver Detalhes
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
