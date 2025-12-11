"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { NewTransactionModal } from "./NewTransactionModal";

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    date: Date;
}

const CATEGORY_LABELS = {
    CAPITAL_INICIAL: "Capital Inicial",
    SALES_PDV: "Vendas PDV",
    OTHER_INCOME: "Outras Receitas",
    OPERATIONAL: "Operacional",
    SUPPLIERS: "Fornecedores",
    SALARY: "Salários/Prolabore",
    TAXES: "Impostos",
    OTHER_EXPENSE: "Outras Despesas",
    RESTOCK: "Reposição de Estoque",
    SUPPLY_PDV: "Fundo de Troco",
    INTERNAL_TRANSFER: "Transferência Interna",
};

export function FinanceDashboardClient({ initialTransactions }: { initialTransactions: Transaction[] }) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"IN" | "OUT">("IN");

    const openModal = (type: "IN" | "OUT") => {
        setModalType(type);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <Button onClick={() => openModal("IN")} className="gap-2 bg-green-600 hover:bg-green-700">
                    <ArrowUpCircle className="h-4 w-4" />
                    Nova Entrada
                </Button>
                <Button onClick={() => openModal("OUT")} className="gap-2 bg-red-600 hover:bg-red-700">
                    <ArrowDownCircle className="h-4 w-4" />
                    Nova Saída
                </Button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="px-6 py-4 font-medium">Data</th>
                            <th className="px-6 py-4 font-medium">Descrição</th>
                            <th className="px-6 py-4 font-medium">Categoria</th>
                            <th className="px-6 py-4 font-medium text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Nenhuma transação registrada.
                                </td>
                            </tr>
                        ) : (
                            transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(t.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {t.description}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                            {CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS] || t.category}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'IN' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards (Visible only on mobile) */}
            <div className="md:hidden space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Nenhuma transação registrada.</div>
                ) : (
                    transactions.map((t) => (
                        <div key={t.id} className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm text-gray-500">
                                    {new Date(t.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className={`font-bold ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'IN' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div className="font-medium text-gray-900 mb-2">
                                {t.description}
                            </div>
                            <div className="flex justify-end">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                    {CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS] || t.category}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <NewTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                type={modalType}
            />
        </div>
    );
}
