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

            <div className="rounded-xl border bg-white shadow-sm">
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
        </div>
    );
}
