"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer } from "lucide-react";

export interface LabelItem {
    id: string;
    sku: string;
    productName: string;
    size: string;
    color?: string | null;
    price?: number | null;
    quantity: number; // Quantidade de etiquetas sugerida (ex: estoque ou NF-e)
}

interface LabelPrinterModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: LabelItem[];
    storeName?: string;
}

type PrintFormat = "thermal_50x30" | "thermal_40x25" | "a4_sheet";

export function LabelPrinterModal({
    isOpen,
    onClose,
    items,
    storeName = "ColoriKids"
}: LabelPrinterModalProps) {
    const [mounted, setMounted] = useState(false);
    const [format, setFormat] = useState<PrintFormat>("thermal_50x30");
    const [showPrice, setShowPrice] = useState(true);
    const [showStoreName, setShowStoreName] = useState(true);
    const [showSkuText, setShowSkuText] = useState(true);

    // Copia local das quantidades por item para permitir edição antes de imprimir
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && items.length > 0) {
            const initialQty: Record<string, number> = {};
            items.forEach((item, idx) => {
                const key = `${item.id}-${idx}`;
                initialQty[key] = item.quantity > 0 ? Math.round(item.quantity) : 1;
            });
            setQuantities(initialQty);
        }
    }, [isOpen, items]);

    if (!isOpen || items.length === 0) return null;

    const handleQtyChange = (key: string, val: number) => {
        setQuantities((prev) => ({
            ...prev,
            [key]: Math.max(0, val)
        }));
    };

    // Total de etiquetas que serão impressas no lote
    const totalLabelsToPrint = Object.values(quantities).reduce((acc, q) => acc + (q || 0), 0);

    // Expandir itens de acordo com a quantidade configurada
    const expandedPrintItems: Array<{ item: LabelItem; indexInItem: number; key: string }> = [];
    items.forEach((item, idx) => {
        const key = `${item.id}-${idx}`;
        const qty = quantities[key] || 0;
        for (let i = 0; i < qty; i++) {
            expandedPrintItems.push({
                item,
                indexInItem: i + 1,
                key: `${key}-${i}`
            });
        }
    });

    const handlePrint = () => {
        window.print();
    };

    // Conteúdo da Área Exclusiva de Impressão (Será Injetado diretamente no document.body via Portal)
    const printPortalArea = (
        <div id="print-label-area">
            <style jsx global>{`
                @media screen {
                    #print-label-area {
                        display: none !important;
                    }
                }
                @media print {
                    body > *:not(#print-label-area) {
                        display: none !important;
                    }
                    #print-label-area {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                    @page {
                        margin: 0;
                        size: auto;
                    }
                }
            `}</style>

            <div className="w-full bg-white">
                {format === "a4_sheet" ? (
                    /* Layout Grade A4 */
                    <div className="grid grid-cols-3 gap-2 p-2 w-full">
                        {expandedPrintItems.map(({ item, key }) => (
                            <div
                                key={key}
                                className="border border-black p-2 flex flex-col justify-between break-inside-avoid bg-white"
                                style={{ height: "120px", boxSizing: "border-box" }}
                            >
                                {showStoreName && (
                                    <p className="text-[9px] font-bold text-center text-black uppercase tracking-tighter truncate border-b border-black pb-0.5 mb-1">
                                        {storeName}
                                    </p>
                                )}
                                <div className="flex gap-2 items-center">
                                    <QRCodeSVG value={item.sku || item.id} size={48} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-black leading-tight">
                                            {item.productName}
                                        </p>
                                        <p className="text-[9px] font-semibold text-black mt-0.5">
                                            Tam: {item.size} {item.color ? `/ ${item.color}` : ""}
                                        </p>
                                        {showSkuText && (
                                            <p className="text-[8px] font-mono text-black font-semibold truncate">
                                                {item.sku}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {showPrice && item.price && item.price > 0 && (
                                    <div className="border-t border-black pt-0.5 flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-black">À VISTA</span>
                                        <span className="text-[12px] font-black text-black">
                                            R$ {item.price.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Layout Térmica Contínua (Etiqueta por Etiqueta) */
                    <div className="flex flex-col items-center">
                        {expandedPrintItems.map(({ item, key }) => (
                            <div
                                key={key}
                                className="p-1.5 flex flex-col justify-between bg-white border border-black mb-1"
                                style={{
                                    width: format === "thermal_40x25" ? "150px" : "190px",
                                    height: format === "thermal_40x25" ? "95px" : "115px",
                                    pageBreakAfter: "always",
                                    breakAfter: "page",
                                    boxSizing: "border-box"
                                }}
                            >
                                {showStoreName && (
                                    <p className="text-[8px] font-bold text-center text-black uppercase tracking-tighter truncate border-b border-black pb-0.5">
                                        {storeName}
                                    </p>
                                )}
                                <div className="flex gap-1.5 items-center my-auto">
                                    <QRCodeSVG value={item.sku || item.id} size={format === "thermal_40x25" ? 38 : 46} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold text-black leading-none truncate">
                                            {item.productName}
                                        </p>
                                        <p className="text-[8px] font-bold text-black mt-0.5">
                                            Tam: {item.size} {item.color ? `/${item.color}` : ""}
                                        </p>
                                        {showSkuText && (
                                            <p className="text-[7px] font-mono text-black font-bold truncate mt-0.5">
                                                {item.sku}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {showPrice && item.price && item.price > 0 && (
                                    <div className="border-t border-black pt-0.5 flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-black">VALOR</span>
                                        <span className="text-[11px] font-black text-black">
                                            R$ {item.price.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Modal UI Interativa (Visível na tela) */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
                    {/* ── Header ────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between border-b p-4">
                        <div className="flex items-center gap-2">
                            <Printer className="h-5 w-5 text-pink-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Imprimir Etiquetas com QR Code</h3>
                                <p className="text-xs text-gray-500">
                                    {items.length} produto(s) · <span className="font-semibold text-pink-600">{totalLabelsToPrint} etiqueta(s) a imprimir</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* ── Configurações e Controles ──────────────────────────── */}
                    <div className="border-b bg-gray-50 p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Formato da mídia */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Formato / Impressora
                                </label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as PrintFormat)}
                                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                                >
                                    <option value="thermal_50x30">Térmica Direta (50x30mm - Elgin/Zebra)</option>
                                    <option value="thermal_40x25">Térmica Direta Pequena (40x25mm)</option>
                                    <option value="a4_sheet">Grade A4 (Folha com Etiquetas)</option>
                                </select>
                            </div>

                            {/* Opções visuais */}
                            <div className="sm:col-span-3 flex flex-wrap items-center gap-4 pt-4 sm:pt-0">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showPrice}
                                        onChange={(e) => setShowPrice(e.target.checked)}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    Exibir Preço (R$)
                                </label>

                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showStoreName}
                                        onChange={(e) => setShowStoreName(e.target.checked)}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    Exibir Nome da Loja
                                </label>

                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showSkuText}
                                        onChange={(e) => setShowSkuText(e.target.checked)}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    Exibir SKU Legível
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* ── Conteúdo Principal (Lista de Itens + Prévia) ───────────── */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Ajuste de Quantidades por Item */}
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                Ajustar Quantidade de Etiquetas por Produto
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {items.map((item, idx) => {
                                    const key = `${item.id}-${idx}`;
                                    const currentQty = quantities[key] ?? 1;

                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-2.5"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {item.productName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Tam: <span className="font-semibold text-gray-700">{item.size}</span>
                                                    {item.color && (
                                                        <span className="ml-2 uppercase">Cor: <span className="font-semibold text-gray-700">{item.color}</span></span>
                                                    )}
                                                    <span className="ml-3 font-mono text-gray-400">SKU: {item.sku}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-500">Qtd de etiquetas:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="500"
                                                    value={currentQty}
                                                    onChange={(e) => handleQtyChange(key, parseInt(e.target.value) || 0)}
                                                    className="w-16 rounded-md border border-gray-300 p-1 text-center text-xs font-semibold focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Prévia Visual da Impressão */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                Prévia da Etiqueta ({expandedPrintItems.length} cópias prontas)
                            </h4>

                            {expandedPrintItems.length === 0 ? (
                                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                    Nenhuma etiqueta selecionada para impressão. Defina a quantidade acima.
                                </p>
                            ) : (
                                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-100 p-4 max-h-64 overflow-y-auto">
                                    <div className={`grid gap-3 ${
                                        format === "a4_sheet" 
                                            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" 
                                            : "grid-cols-2 sm:grid-cols-3"
                                    }`}>
                                        {expandedPrintItems.slice(0, 12).map(({ item, key }) => (
                                            <div
                                                key={key}
                                                className="bg-white rounded-md border border-gray-300 p-2 shadow-sm flex flex-col justify-between"
                                                style={{
                                                    minHeight: format === "thermal_40x25" ? "90px" : "110px"
                                                }}
                                            >
                                                {showStoreName && (
                                                    <p className="text-[9px] font-bold text-center text-gray-700 uppercase tracking-tighter truncate border-b pb-0.5 mb-1">
                                                        {storeName}
                                                    </p>
                                                )}

                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-shrink-0 bg-white p-0.5 border rounded">
                                                        <QRCodeSVG
                                                            value={item.sku || item.id}
                                                            size={format === "thermal_40x25" ? 36 : 44}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold text-gray-900 leading-tight line-clamp-2">
                                                            {item.productName}
                                                        </p>
                                                        <p className="text-[9px] font-semibold text-gray-600 mt-0.5">
                                                            Tam: {item.size} {item.color ? `/ ${item.color}` : ""}
                                                        </p>
                                                        {showSkuText && (
                                                            <p className="text-[8px] font-mono text-gray-500 truncate">
                                                                {item.sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {showPrice && item.price && item.price > 0 && (
                                                    <div className="mt-1 border-t pt-0.5 flex items-center justify-between">
                                                        <span className="text-[8px] text-gray-400">Preço</span>
                                                        <span className="text-[11px] font-extrabold text-gray-900">
                                                            R$ {item.price.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {expandedPrintItems.length > 12 && (
                                        <p className="text-[11px] text-gray-500 text-center mt-3 font-medium">
                                            + {expandedPrintItems.length - 12} etiquetas adicionais serão geradas no envio à impressora.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Footer ──────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between border-t p-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handlePrint}
                            disabled={expandedPrintItems.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-pink-700 disabled:opacity-50 shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir {totalLabelsToPrint} Etiqueta(s)
                        </button>
                    </div>
                </div>
            </div>

            {/* Portal de Impressão nativa injetado direto no body */}
            {mounted && createPortal(printPortalArea, document.body)}
        </>
    );
}
