"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import type { NfeItemPreview } from "./types";

interface NfeConfirmButtonProps {
    items: NfeItemPreview[];
    totalValue: number;
    onConfirm: () => Promise<void>;
    disabled?: boolean;
}

export function NfeConfirmButton({ items, totalValue, onConfirm, disabled }: NfeConfirmButtonProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const validItems = items.filter((i) => i.matched && !i.ignore);
    const totalCost = validItems.reduce((acc, item) => acc + item.totalValue, 0);

    const handleClick = async () => {
        if (validItems.length === 0) {
            alert("Nenhum item válido para importar. Associe ou desassocie produtos aos itens.");
            return;
        }

        setLoading(true);
        try {
            await onConfirm();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-500">Resumo da Importação</p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                            R$ {totalCost.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">
                            ({validItems.length} de {items.length} itens)
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                        <span>{items.filter((i) => i.matchedBy === "SKU").length} match por SKU</span>
                        <span>·</span>
                        <span>{items.filter((i) => i.matchedBy === "NAME").length} match por nome</span>
                        <span>·</span>
                        <span>{items.filter((i) => i.ignore).length} ignorados</span>
                    </div>
                </div>

                <button
                    onClick={handleClick}
                    disabled={loading || disabled || validItems.length === 0}
                    className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all ${
                        success
                            ? "bg-green-600"
                            : "bg-pink-600 hover:bg-pink-700 active:scale-[0.98]"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Importando...
                        </>
                    ) : success ? (
                        <>
                            <CheckCircle2 className="h-5 w-5" />
                            Importado com Sucesso!
                        </>
                    ) : (
                        <>
                            <PackageCheck className="h-5 w-5" />
                            Confirmar Entrada no Estoque
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
