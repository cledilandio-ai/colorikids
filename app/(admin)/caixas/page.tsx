"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CashRegisterHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRegister, setSelectedRegister] = useState<any>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/cash-register/history");
            const data = await res.json();
            setHistory(data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando histórico...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/pos">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Histórico de Caixas</h1>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                        <tr>
                            <th className="p-4">Abertura</th>
                            <th className="p-4">Fechamento</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Fundo Inicial</th>
                            <th className="p-4 text-right">Total Vendas</th>
                            <th className="p-4 text-right">Total Final</th>
                            <th className="p-4 text-right">Diferença</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {history.map((reg) => (
                            <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    {new Date(reg.openedAt).toLocaleString('pt-BR')}
                                </td>
                                <td className="p-4">
                                    {reg.closedAt ? new Date(reg.closedAt).toLocaleString('pt-BR') : "-"}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${reg.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                        }`}>
                                        {reg.status === "OPEN" ? "ABERTO" : "FECHADO"}
                                    </span>
                                </td>
                                <td className="p-4 text-right">R$ {reg.initialAmount.toFixed(2)}</td>
                                <td className="p-4 text-right">R$ {reg.totalSales.toFixed(2)}</td>
                                <td className="p-4 text-right font-medium">
                                    {reg.finalAmount ? `R$ ${reg.finalAmount.toFixed(2)}` : "-"}
                                </td>
                                <td className={`p-4 text-right font-bold ${reg.difference < -0.01 ? "text-red-600" : reg.difference > 0.01 ? "text-green-600" : "text-gray-400"
                                    }`}>
                                    {reg.status === "CLOSED" ? `R$ ${reg.difference.toFixed(2)}` : "-"}
                                </td>
                                <td className="p-4 text-center">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedRegister(reg)}>
                                        <Eye className="h-4 w-4 text-blue-600" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {selectedRegister && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Detalhes do Fechamento</h2>
                            <button onClick={() => setSelectedRegister(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Abertura:</span>
                                    <span className="font-medium">{new Date(selectedRegister.openedAt).toLocaleString('pt-BR')}</span>
                                </div>
                                {selectedRegister.closedAt && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Fechamento:</span>
                                        <span className="font-medium">{new Date(selectedRegister.closedAt).toLocaleString('pt-BR')}</span>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                                <h3 className="font-bold text-blue-900 text-sm mb-2">Resumo Financeiro</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700">Fundo Inicial:</span>
                                    <span className="font-medium">R$ {selectedRegister.initialAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700">Vendas (Dinheiro):</span>
                                    <span className="font-medium">R$ {(selectedRegister.salesByMethod["DINHEIRO"] || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700">Vendas (Cartão):</span>
                                    <span className="font-medium">R$ {(selectedRegister.salesByMethod["CARTAO"] || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700">Vendas (Pix):</span>
                                    <span className="font-medium">R$ {(selectedRegister.salesByMethod["PIX"] || 0).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-blue-900">
                                    <span>Total Esperado:</span>
                                    <span>R$ {selectedRegister.expectedTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className={`rounded-lg p-4 space-y-2 ${selectedRegister.difference < -0.01 ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"
                                }`}>
                                <div className="flex justify-between font-bold">
                                    <span className={selectedRegister.difference < -0.01 ? "text-red-800" : "text-green-800"}>
                                        Total Informado (Fechamento):
                                    </span>
                                    <span className={selectedRegister.difference < -0.01 ? "text-red-800" : "text-green-800"}>
                                        R$ {(selectedRegister.finalAmount || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Diferença:</span>
                                    <span className={`font-bold ${selectedRegister.difference < -0.01 ? "text-red-600" : "text-green-600"}`}>
                                        R$ {selectedRegister.difference.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button onClick={() => setSelectedRegister(null)} className="w-full">
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
