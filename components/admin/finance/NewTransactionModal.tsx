"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "IN" | "OUT";
}

export function NewTransactionModal({ isOpen, onClose, type }: NewTransactionModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/finance/treasury", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description,
                    amount: parseFloat(amount),
                    type,
                    category
                }),
            });

            if (res.ok) {
                onClose();
                setDescription("");
                setAmount("");
                setCategory("");
                router.refresh();
            } else {
                alert("Erro ao salvar transação.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {type === 'IN' ? 'Nova Entrada' : 'Nova Saída'}
                    </h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <input
                            required
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                            placeholder={type === 'IN' ? "Ex: Capital Inicial, Venda Extra..." : "Ex: Aluguel, Luz, Fornecedor..."}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <select
                            required
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {type === 'IN' ? (
                                <>
                                    <option value="CAPITAL_INICIAL">Capital Inicial</option>
                                    <option value="SALES_PDV">Vendas PDV</option>
                                    <option value="OTHER_INCOME">Outras Receitas</option>
                                </>
                            ) : (
                                <>
                                    <option value="OPERATIONAL">Operacional (Luz, Água, etc)</option>
                                    <option value="SUPPLIERS">Fornecedores</option>
                                    <option value="SALARY">Salários/Prolabore</option>
                                    <option value="TAXES">Impostos</option>
                                    <option value="OTHER_EXPENSE">Outras Despesas</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className={`w-full ${type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {loading ? "Salvando..." : "Confirmar"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
