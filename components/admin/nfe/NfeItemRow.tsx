"use client";

import { CheckCircle2, AlertTriangle, XCircle, Search, EyeOff, Printer, RotateCcw } from "lucide-react";
import type { NfeItemPreview } from "./types";

interface NfeItemRowProps {
    item: NfeItemPreview;
    onToggleIgnore: (nfeItemNumber: number) => void;
    onOpenMatchModal: () => void;
    onUnmatch?: (nfeItemNumber: number) => void;
    onPrintItemLabel?: (item: NfeItemPreview) => void;
}

export function NfeItemRow({ item, onToggleIgnore, onOpenMatchModal, onUnmatch, onPrintItemLabel }: NfeItemRowProps) {
    const isIgnored = item.ignore;

    const matchBadge = () => {
        if (isIgnored) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    <EyeOff className="h-3 w-3" />
                    Ignorado
                </span>
            );
        }

        if (item.matched && item.matchedBy === "SKU") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    SKU
                </span>
            );
        }

        if (item.matched && item.matchedBy === "NAME") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    Nome
                </span>
            );
        }

        if (item.matched) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Manual
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                <XCircle className="h-3 w-3" />
                Sem match
            </span>
        );
    };

    return (
        <tr className={`transition-colors ${isIgnored ? "opacity-50 bg-gray-50" : "hover:bg-gray-50"}`}>
            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {item.nfeItemNumber}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-600">
                {item.nfeCode}
            </td>
            <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-700">
                <span title={item.description}>{item.description}</span>
                {item.productName && (
                    <div className="mt-0.5 text-xs text-green-600 font-medium">
                        → {item.productName} {item.variantLabel && `(${item.variantLabel})`}
                    </div>
                )}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                {Math.round(item.quantity)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">
                R$ {item.unitValue.toFixed(2)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                R$ {item.totalValue.toFixed(2)}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-center">
                {matchBadge()}
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                    {item.matched && !isIgnored && onPrintItemLabel && (
                        <button
                            onClick={() => onPrintItemLabel(item)}
                            className="rounded-lg p-1.5 text-pink-600 hover:bg-pink-50 transition-colors"
                            title="Imprimir etiqueta deste item"
                        >
                            <Printer className="h-4 w-4" />
                        </button>
                    )}
                    {!isIgnored && (
                        <button
                            onClick={onOpenMatchModal}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title={item.matched ? "Alterar associação ou criar produto" : "Buscar produto manualmente"}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    )}
                    {item.matched && !isIgnored && onUnmatch && (
                        <button
                            onClick={() => onUnmatch(item.nfeItemNumber)}
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Desfazer associação deste item"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onToggleIgnore(item.nfeItemNumber)}
                        className={`rounded-lg p-1.5 transition-colors ${
                            isIgnored
                                ? "text-gray-400 hover:bg-gray-100"
                                : "text-red-400 hover:bg-red-50"
                        }`}
                        title={isIgnored ? "Reativar item" : "Ignorar item"}
                    >
                        <EyeOff className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
