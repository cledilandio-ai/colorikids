"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, CheckCircle, XCircle, Trash, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [variants, setVariants] = useState<any[]>([]);

    useEffect(() => {
        fetchOrder();
        fetchVariants();
    }, []);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            } else {
                alert("Pedido não encontrado");
                router.push("/orders");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVariants = async () => {
        try {
            const res = await fetch("/api/products"); // This fetches products, we might need a better way to get all variants or just fetch relevant ones.
            // For now, let's assume we can get product details. 
            // Actually, the order items have variantId. We can fetch specific variants if needed, 
            // but for "Current Stock" display, we might need a dedicated endpoint or just fetch all products if the list isn't huge.
            // Let's try fetching all products for now as it's simpler.
            const data = await res.json();
            const allVariants = data.flatMap((p: any) => p.variants);
            setVariants(allVariants);
        } catch (error) {
            console.error(error);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!confirm(`Deseja alterar o status para ${newStatus === "COMPLETED" ? "Concluído" : "Cancelado"}?`)) return;

        try {
            const res = await fetch(`/api/orders/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                alert(newStatus === "COMPLETED" ? "Pedido concluído e estoque atualizado!" : "Status atualizado.");
                fetchOrder();
                fetchVariants(); // Refresh stock
            } else {
                alert("Erro ao atualizar pedido.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor.");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja EXCLUIR este pedido? Esta ação não pode ser desfeita.")) return;

        try {
            const res = await fetch(`/api/orders/${params.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.push("/orders");
            } else {
                alert("Erro ao excluir pedido.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!order) return null;

    const items = JSON.parse(order.items || "[]");

    const getStock = (variantId: string) => {
        const variant = variants.find((v) => v.id === variantId);
        return variant ? variant.stockQuantity : "N/A";
    };

    return (
        <div className="p-6 max-w-4xl mx-auto print:p-0 print:max-w-none">
            {/* Header / Actions - Hidden on Print */}
            <div className="mb-6 flex items-center justify-between print:hidden">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" /> Imprimir
                    </Button>
                    {order.status === "PENDING" && (
                        <>
                            <Button onClick={() => router.push(`/pos?orderId=${order.id}`)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <CheckCircle className="h-4 w-4" /> Enviar para Caixa (PDV)
                            </Button>
                            <Button variant="outline" onClick={() => alert("Funcionalidade de edição em breve")} className="gap-2">
                                <Edit className="h-4 w-4" /> Alterar
                            </Button>
                            <Button onClick={() => handleStatusChange("CANCELLED")} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                                <XCircle className="h-4 w-4" /> Cancelar
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-700">
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Order Content */}
            <div className="rounded-xl border bg-white p-8 shadow-sm print:border-none print:shadow-none">
                <div className="mb-8 border-b pb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.id.slice(0, 8)}</h1>
                            <p className="text-gray-500">
                                Realizado em {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${order.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                                order.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-red-100 text-red-800"
                                }`}>
                                {order.status === "COMPLETED" ? "Concluído" :
                                    order.status === "PENDING" ? "Pendente" : "Cancelado"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-900">Dados do Cliente</h3>
                        <p className="text-gray-700"><span className="font-medium">Nome:</span> {order.customerName}</p>
                        <p className="text-gray-700"><span className="font-medium">Telefone:</span> {order.customerPhone || "Não informado"}</p>
                    </div>
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-900">Resumo</h3>
                        <p className="text-gray-700"><span className="font-medium">Tipo:</span> {order.type}</p>
                        <p className="text-gray-700"><span className="font-medium">Total:</span> R$ {order.total.toFixed(2)}</p>
                    </div>
                </div>

                <div>
                    <h3 className="mb-4 font-semibold text-gray-900">Itens do Pedido</h3>
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50">
                            <tr>
                                <th className="py-3 pl-4">Produto</th>
                                <th className="py-3">SKU</th>
                                <th className="py-3">Variação</th>
                                <th className="py-3 text-center">Qtd</th>
                                <th className="py-3 text-center print:hidden">Estoque Atual</th>
                                <th className="py-3 text-right pr-4">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item: any, index: number) => {
                                // Find full product details to show description if needed
                                // We can find it via variants list if we have productId there, or just iterate variants
                                const variant = variants.find(v => v.id === item.variantId);
                                // Note: variants state currently only has variant info, we might need to fetch product info better.
                                // But let's check if we can get the image from item.imageUrl which we saved.

                                return (
                                    <tr key={index}>
                                        <td className="py-4 pl-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 border">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                                            Sem Foto
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{item.name}</p>
                                                    {/* If we had description, we would show it here. For now, let's show variant details clearly */}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-gray-600 font-mono text-xs">{item.sku || "-"}</td>
                                        <td className="py-4 text-gray-600">{item.variantName}</td>
                                        <td className="py-4 text-center">{item.qty}</td>
                                        <td className="py-4 text-center font-medium text-blue-600 print:hidden">
                                            {getStock(item.variantId)}
                                        </td>
                                        <td className="py-4 text-right pr-4">R$ {(item.price * item.qty).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t bg-gray-50 font-semibold">
                            <tr>
                                <td colSpan={4} className="py-4 text-right pr-4">Total</td>
                                <td className="py-4 text-right pr-4">R$ {order.total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
