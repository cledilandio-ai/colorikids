"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Clock, Calendar, Search, AlertCircle, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Receivable {
    id: string;
    amount: number;
    dueDate: string;
    status: "PENDING" | "PAID" | "OVERDUE";
    customer: {
        name: string;
        phone?: string;
    };
    order: {
        id: string;
        createdAt: string;
    };
}

// Componente que lista contas a receber (Crediário)
export default function AccountsReceivableList() {
    // Lista de contas carregadas da API
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    // Filtro atual: 'PENDING' (A Vencer/Vencidos) ou 'PAID' (Pagos)
    const [filter, setFilter] = useState("PENDING");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReceivables();
    }, [filter]);

    // Busca as contas baseado no filtro selecionado
    const fetchReceivables = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/receivables?status=${filter}`);
            const data = await res.json();
            setReceivables(data);
        } catch (error) {
            console.error("Error loading receivables:", error);
        } finally {
            setLoading(false);
        }
    };

    // Marca uma conta como paga
    // Envia requisição para API atualizar o status e gerar a transação no caixa
    const handleMarkAsPaid = async (id: string) => {
        if (!confirm("Confirmar recebimento deste valor?")) return;

        try {
            const res = await fetch("/api/finance/receivables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action: "MARK_PAID" })
            });

            if (res.ok) {
                alert("Recebimento confirmado!");
                fetchReceivables();
            } else {
                alert("Erro ao confirmar recebimento.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const totalAmount = receivables.reduce((acc, r) => acc + r.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex gap-2">
                    <Button
                        variant={filter === "PENDING" ? "default" : "outline"}
                        onClick={() => setFilter("PENDING")}
                        className="gap-2"
                    >
                        <Clock className="h-4 w-4" /> A Receber
                    </Button>
                    <Button
                        variant={filter === "PAID" ? "default" : "outline"}
                        onClick={() => setFilter("PAID")}
                        className="gap-2"
                    >
                        <Check className="h-4 w-4" /> Recebidos
                    </Button>
                </div>
                <div className="text-right">
                    <span className="text-sm text-gray-500 block">Total na Tela</span>
                    <span className="text-2xl font-bold text-gray-800">R$ {totalAmount.toFixed(2)}</span>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Carregando contas...</div>
            ) : receivables.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed text-gray-500">
                    Nenhuma conta encontrada neste filtro.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {receivables.map((item) => {
                        const isOverdue = new Date(item.dueDate) < new Date() && item.status === "PENDING";
                        return (
                            <div key={item.id} className={`relative bg-white p-5 rounded-xl shadow-sm border transition-all hover:shadow-md ${isOverdue ? "border-l-4 border-l-red-500" : "border-l-4 border-l-blue-500"}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.customer.name}</h3>
                                        <p className="text-xs text-gray-500">Ref. Pedido via PDV</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-gray-800">R$ {item.amount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-600 font-bold" : "text-gray-600"}`}>
                                        <Calendar className="h-4 w-4" />
                                        <span>Vence: {format(new Date(item.dueDate), "dd/MM/yyyy")}</span>
                                        {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-auto">Atrasado</span>}
                                    </div>
                                    {item.customer.phone && (
                                        <div className="text-sm text-gray-500">
                                            Tel: {item.customer.phone}
                                        </div>
                                    )}
                                </div>

                                {item.status === "PENDING" && (
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleMarkAsPaid(item.id)}
                                    >
                                        <DollarSign className="h-4 w-4 mr-2" /> Confirmar Recebimento
                                    </Button>
                                )}
                                {item.status === "PAID" && (
                                    <div className="w-full py-2 text-center text-sm font-bold text-green-600 bg-green-50 rounded-md border border-green-100">
                                        Pago com Sucesso
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
