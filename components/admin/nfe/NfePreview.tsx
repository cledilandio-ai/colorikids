"use client";

import { FileText, Building2, Hash, Calendar, DollarSign, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import type { NfeItemPreview } from "./types";
import { NfeItemRow } from "./NfeItemRow";

interface NfePreviewProps {
    supplierName: string;
    supplierCnpj: string;
    nfeNumber: number;
    serie: number;
    totalValue: number;
    items: NfeItemPreview[];
    onItemsChange: (items: NfeItemPreview[]) => void;
    onOpenMatchModal: (item: NfeItemPreview) => void;
    onUnmatchItem?: (nfeItemNumber: number) => void;
    onResetAllMatches?: () => void;
    onPrintItemLabel?: (item: NfeItemPreview) => void;
}

export function NfePreview({
    supplierName,
    supplierCnpj,
    nfeNumber,
    serie,
    totalValue,
    items,
    onItemsChange,
    onOpenMatchModal,
    onUnmatchItem,
    onResetAllMatches,
    onPrintItemLabel,
}: NfePreviewProps) {
    const totalMatched = items.filter((i) => i.matched && !i.ignore).length;
    const totalIgnored = items.filter((i) => i.ignore).length;
    const totalUnmatched = items.filter((i) => !i.matched && !i.ignore).length;

    return (
        <div className="space-y-4">
            {/* Cabeçalho da NF-e */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Fornecedor</p>
                            <p className="text-sm font-semibold text-gray-800">{supplierName}</p>
                            <p className="text-xs text-gray-400">{supplierCnpj}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                            <Hash className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">NF-e</p>
                            <p className="text-sm font-semibold text-gray-800">
                                Nº {nfeNumber} | Série {serie}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Total NF-e</p>
                            <p className="text-sm font-semibold text-gray-800">
                                R$ {totalValue.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <FileText className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Itens</p>
                            <p className="text-sm font-semibold text-gray-800">
                                {items.length} itens
                                {totalMatched > 0 && (
                                    <span className="ml-1 text-green-600">({totalMatched} match)</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de status */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-green-700 border border-green-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {totalMatched} match automático
                </span>
                {totalUnmatched > 0 && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700 border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {totalUnmatched} sem match
                    </span>
                )}
                {totalIgnored > 0 && (
                    <span className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-gray-500 border border-gray-200">
                        <XCircle className="h-3.5 w-3.5" />
                        {totalIgnored} ignorados
                    </span>
                )}
                {totalMatched > 0 && onResetAllMatches && (
                    <button
                        type="button"
                        onClick={onResetAllMatches}
                        className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 shadow-sm"
                        title="Desfazer a associação de todos os itens para refazer do início"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Desfazer todos os matches
                    </button>
                )}
            </div>

            {/* Tabela de itens */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Item
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Código
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Descrição
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Qtd
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    R$ Unit
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    R$ Total
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Match
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {items.map((item, idx) => (
                                <NfeItemRow
                                    key={`${item.nfeItemNumber}-${item.variantId || 'unmatched'}-${item.ignore ? 'ignored' : 'active'}-${idx}`}
                                    item={item}
                                    onToggleIgnore={(nfeItemNumber) => {
                                        onItemsChange(
                                            items.map((i) =>
                                                i.nfeItemNumber === nfeItemNumber
                                                    ? { ...i, ignore: !i.ignore }
                                                    : i
                                            )
                                        );
                                    }}
                                    onOpenMatchModal={() => onOpenMatchModal(item)}
                                    onUnmatch={(nfeItemNumber) => onUnmatchItem?.(nfeItemNumber)}
                                    onPrintItemLabel={onPrintItemLabel}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
