"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function CloseRegisterButton({ registerId, initialAmount, totalSales, salesByMethod }: { registerId: string, initialAmount: number, totalSales: number, salesByMethod: any }) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [cashInput, setCashInput] = useState("");
    const [loading, setLoading] = useState(false);

    const expectedCash = (salesByMethod["DINHEIRO"] || 0) + initialAmount;
    const expectedCard = salesByMethod["CARTAO"] || 0;
    const expectedPix = salesByMethod["PIX"] || 0;
    const expectedTotal = initialAmount + totalSales;

    const handleCloseRegister = async () => {
        setLoading(true);

        // Calculate final total based on Cash Input + Expected Card + Expected Pix
        // We assume Card and Pix are correct as per system records (since they are digital)
        const actualCash = cashInput ? parseFloat(cashInput) : expectedCash;
        const finalTotal = actualCash + expectedCard + expectedPix;

        try {
            const res = await fetch("/api/cash-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "CLOSE",
                    finalAmount: finalTotal.toString()
                }),
            });

            if (res.ok) {
                alert("Caixa fechado com sucesso!");
                setShowModal(false);
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao fechar caixa.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowModal(true)}
                className="gap-2"
            >
                <Lock className="h-3 w-3" /> Fechar
            </Button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Fechar Caixa</h2>
                            <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
                        </div>

                        <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Fundo Inicial:</span>
                                <span className="font-medium">R$ {initialAmount.toFixed(2)}</span>
                            </div>
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Vendas em Dinheiro:</span>
                                <span className="font-medium">R$ {(salesByMethod["DINHEIRO"] || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Vendas em Cartão:</span>
                                <span className="font-medium">R$ {expectedCard.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Vendas em Pix:</span>
                                <span className="font-medium">R$ {expectedPix.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-primary">
                                <span>Total Esperado:</span>
                                <span>R$ {expectedTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>(Dinheiro Esperado em Caixa: R$ {expectedCash.toFixed(2)})</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Valor em Dinheiro (Espécie)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={cashInput}
                                onChange={(e) => setCashInput(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder={`R$ ${expectedCash.toFixed(2)}`}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Informe apenas o valor em dinheiro encontrado na gaveta.
                                <br />
                                O sistema assumirá que os valores de Cartão e Pix estão corretos.
                            </p>
                        </div>

                        <Button onClick={handleCloseRegister} disabled={loading} className="w-full bg-red-600 hover:bg-red-700">
                            {loading ? "Fechando..." : "Confirmar Fechamento"}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
