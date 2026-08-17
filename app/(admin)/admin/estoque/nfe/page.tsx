"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { NfeUploadZone } from "@/components/admin/nfe/NfeUploadZone";
import { NfePreview } from "@/components/admin/nfe/NfePreview";
import { NfeMatchModal } from "@/components/admin/nfe/NfeMatchModal";
import { NfeConfirmButton } from "@/components/admin/nfe/NfeConfirmButton";
import type { NfeItemPreview } from "@/components/admin/nfe/types";

import { LabelPrinterModal, type LabelItem } from "@/components/admin/labels/LabelPrinterModal";

interface MatchedProduct {
    id: string;
    name: string;
    variants: {
        id: string;
        size: string;
        color: string | null;
        sku: string | null;
        stockQuantity: number;
    }[];
}

interface NfeParsedData {
    accessKey: string;
    nfeNumber: number;
    serie: number;
    issuedAt: string;
    supplier: {
        cnpj: string;
        name: string;
    };
    totalValue: number;
    items: NfeItemPreview[];
    summary: {
        totalItems: number;
        totalMatched: number;
        totalUnmatched: number;
        totalValue: number;
    };
    xmlRaw: string;
}

export default function NfeImportPage() {
    const [step, setStep] = useState<"upload" | "preview" | "confirm">("upload");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nfeData, setNfeData] = useState<NfeParsedData | null>(null);
    const [items, setItems] = useState<NfeItemPreview[]>([]);
    const [products, setProducts] = useState<MatchedProduct[]>([]);

    // Match modal state
    const [matchModalItem, setMatchModalItem] = useState<NfeItemPreview | null>(null);
    const [matchModalOpen, setMatchModalOpen] = useState(false);

    // Label printer modal state
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printItems, setPrintItems] = useState<LabelItem[]>([]);

    // Carregar produtos para match manual
    useEffect(() => {
        if (step === "preview" && products.length === 0) {
            fetch("/api/products?limit=500")
                .then((res) => res.json())
                .then((data) => {
                    const mapped = (data.products || data || []).map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        variants: (p.variants || []).map((v: any) => ({
                            id: v.id,
                            size: v.size,
                            color: v.color || null,
                            sku: v.sku || null,
                            stockQuantity: v.stockQuantity || 0,
                        })),
                    }));
                    setProducts(mapped);
                })
                .catch(() => {}); // Silently fail, match modal will show empty
        }
    }, [step, products.length]);

    const handleFileSelect = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/stock/nfe/parse", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao processar XML");
            }

            setNfeData(data);
            setItems(data.items || []);
            setStep("preview");

            // Se tiver erro de parse, mostrar
            if (data.parseError) {
                setError(data.parseError);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao processar XML");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!nfeData) return;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                accessKey: nfeData.accessKey,
                nfeNumber: nfeData.nfeNumber.toString(),
                serie: nfeData.serie.toString(),
                supplierName: nfeData.supplier.name,
                supplierCnpj: nfeData.supplier.cnpj,
                totalValue: nfeData.totalValue,
                xmlRaw: nfeData.xmlRaw,
                items: items.map((item) => ({
                    nfeItemNumber: item.nfeItemNumber,
                    nfeCode: item.nfeCode,
                    description: item.description,
                    unit: item.unit || "UN",
                    quantity: item.quantity,
                    unitValue: item.unitValue,
                    totalValue: item.totalValue,
                    matched: item.matched,
                    matchedBy: item.matchedBy,
                    variantId: item.variantId,
                    productId: item.productId,
                    ignore: item.ignore,
                    isNewProduct: item.isNewProduct || false,
                })),
            };

            const res = await fetch("/api/stock/nfe/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao confirmar importação");
            }

            setStep("confirm");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao confirmar importação");
        } finally {
            setLoading(false);
        }
    }, [nfeData, items]);

    const handleMatchConfirm = useCallback(
        (
            itemNumber: number,
            productId: string,
            allocations: Array<{ variantId: string; quantity: number; isNewProduct?: boolean; variantLabel?: string }>,
            createdProduct?: MatchedProduct
        ) => {
            setItems((prev) => {
                // Find one of the original items to copy its properties (unitValue, nfeCode, etc)
                const originalItem = prev.find((item) => item.nfeItemNumber === itemNumber);
                if (!originalItem) return prev;

                // Remove all previous instances with this nfeItemNumber
                const otherItems = prev.filter((item) => item.nfeItemNumber !== itemNumber);

                const product = createdProduct || products.find((p) => p.id === productId);

                // If allocations are empty, we keep one unassociated item row
                if (allocations.length === 0) {
                    return [...otherItems, {
                        ...originalItem,
                        matched: false,
                        matchedBy: null,
                        productId: null,
                        variantId: null,
                        isNewProduct: false,
                        productName: null,
                        variantLabel: null,
                        confidence: 0,
                    }].sort((a, b) => a.nfeItemNumber - b.nfeItemNumber);
                }

                // Create new split rows
                const newSplitItems = allocations.map((alloc) => {
                    const variant = product?.variants.find((v) => v.id === alloc.variantId);
                    const qty = alloc.quantity;
                    const totalVal = qty * originalItem.unitValue;

                    const label = variant
                        ? `${variant.size}${variant.color ? " - " + variant.color : ""}`
                        : alloc.variantLabel || null;

                    return {
                        ...originalItem,
                        quantity: qty,
                        totalValue: totalVal,
                        matched: true,
                        matchedBy: "MANUAL" as const,
                        productId,
                        variantId: alloc.variantId,
                        isNewProduct: alloc.isNewProduct || false,
                        productName: product?.name || originalItem.description || null,
                        variantLabel: label,
                        confidence: 1,
                        ignore: false,
                    };
                });

                return [...otherItems, ...newSplitItems].sort((a, b) => a.nfeItemNumber - b.nfeItemNumber);
            });
        },
        [products]
    );

    const handleUpdateProductVariants = useCallback((productId: string, newVariants: MatchedProduct["variants"]) => {
        setProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, variants: newVariants } : p))
        );
    }, []);

    const handleUnmatchItem = useCallback((nfeItemNumber: number) => {
        setItems((prev) =>
            prev.map((i) => {
                if (i.nfeItemNumber === nfeItemNumber) {
                    return {
                        ...i,
                        matched: false,
                        matchedBy: null,
                        productId: null,
                        variantId: null,
                        productName: null,
                        variantLabel: null,
                        confidence: 0,
                        isNewProduct: false,
                    };
                }
                return i;
            })
        );
    }, []);

    const handleResetAllMatches = useCallback(() => {
        setItems((prev) =>
            prev.map((i) => ({
                ...i,
                matched: false,
                matchedBy: null,
                productId: null,
                variantId: null,
                productName: null,
                variantLabel: null,
                confidence: 0,
                isNewProduct: false,
            }))
        );
    }, []);

    const handleCreateProduct = useCallback(async (
        itemNumber: number,
        productData: {
            name: string;
            sku: string;
            price: number;
            cost: number;
            category?: string;
            gender?: string;
            supplier?: string;
            description?: string;
            imageUrl?: string;
            variants: Array<{ size: string; color: string; quantity: number; minStock?: number; sku?: string; imageUrl?: string }>;
        }
    ): Promise<{ productId: string; variantIds: string[]; createdProduct: MatchedProduct } | null> => {
        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: productData.name,
                    description: productData.description || undefined,
                    basePrice: productData.price,
                    costPrice: productData.cost,
                    category: productData.category || undefined,
                    gender: productData.gender || undefined,
                    supplier: productData.supplier || nfeData?.supplier.name || undefined,
                    imageUrl: productData.imageUrl || undefined,
                    variants: productData.variants.map((v, idx) => {
                        // Se o usuário preencheu um SKU individual na variante, usa-o diretamente
                        let variantSku: string | undefined = v.sku?.trim() || undefined;
                        // Caso contrário, gera automaticamente a partir do SKU base do produto
                        if (!variantSku && productData.sku?.trim()) {
                            const baseSku = productData.sku.trim().toUpperCase();
                            if (productData.variants.length > 1) {
                                const cleanSize = (v.size || "U").replace(/\s+/g, "").toUpperCase();
                                const cleanColor = v.color?.trim() ? v.color.trim().substring(0, 3).toUpperCase() : `VAR${idx + 1}`;
                                variantSku = `${baseSku}-${cleanColor}-${cleanSize}`;
                            } else {
                                variantSku = baseSku;
                            }
                        }
                        return {
                            size: v.size || "U",
                            color: v.color || undefined,
                            stockQuantity: v.quantity,
                            minStock: v.minStock || 1,
                            sku: variantSku,
                            imageUrl: v.imageUrl || undefined,
                        };
                    }),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao criar produto");
            }

            const newProduct = await res.json();

            // Adicionar o novo produto à lista local
            const mappedProduct: MatchedProduct = {
                id: newProduct.id,
                name: newProduct.name,
                variants: (newProduct.variants || []).map((v: any) => ({
                    id: v.id,
                    size: v.size,
                    color: v.color || null,
                    sku: v.sku || null,
                    stockQuantity: v.stockQuantity || 0,
                })),
            };
            setProducts((prev) => [...prev, mappedProduct]);

            const variantIds = mappedProduct.variants.map((v: any) => v.id);
            if (variantIds.length === 0) return null;

            return {
                productId: mappedProduct.id,
                variantIds,
                createdProduct: mappedProduct,
            };
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao criar produto");
            return null;
        }
    }, [nfeData]);

    // Função para gerar as etiquetas da NF-e inteira
    const handlePrintNfeLabels = useCallback(() => {
        const validItems = items.filter((i) => i.matched && !i.ignore);
        const labels: LabelItem[] = validItems.map((item) => {
            let variantSize = "U";
            let variantColor: string | null = null;
            let variantSku = item.nfeCode;

            if (item.productId && item.variantId) {
                const p = products.find((prod) => prod.id === item.productId);
                const v = p?.variants.find((varItem) => varItem.id === item.variantId);
                if (v) {
                    variantSize = v.size;
                    variantColor = v.color;
                    if (v.sku) variantSku = v.sku;
                }
            }

            if (item.variantLabel && variantSize === "U") {
                const parts = item.variantLabel.split(" - ");
                variantSize = parts[0] || "U";
                if (parts[1]) variantColor = parts[1];
            }

            return {
                id: item.variantId || `${item.nfeItemNumber}`,
                sku: variantSku,
                productName: item.productName || item.description,
                size: variantSize,
                color: variantColor,
                price: item.unitValue,
                quantity: Math.round(item.quantity)
            };
        });

        setPrintItems(labels);
        setPrintModalOpen(true);
    }, [items, products]);

    // Função para imprimir etiqueta de um item individual da NF-e
    const handlePrintItemLabel = useCallback((item: NfeItemPreview) => {
        let variantSize = "U";
        let variantColor: string | null = null;
        let variantSku = item.nfeCode;

        if (item.productId && item.variantId) {
            const p = products.find((prod) => prod.id === item.productId);
            const v = p?.variants.find((varItem) => varItem.id === item.variantId);
            if (v) {
                variantSize = v.size;
                variantColor = v.color;
                if (v.sku) variantSku = v.sku;
            }
        }

        if (item.variantLabel && variantSize === "U") {
            const parts = item.variantLabel.split(" - ");
            variantSize = parts[0] || "U";
            if (parts[1]) variantColor = parts[1];
        }

        setPrintItems([{
            id: item.variantId || `${item.nfeItemNumber}`,
            sku: variantSku,
            productName: item.productName || item.description,
            size: variantSize,
            color: variantColor,
            price: item.unitValue,
            quantity: Math.round(item.quantity)
        }]);
        setPrintModalOpen(true);
    }, [products]);

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-6">
            {/* Back button */}
            <Link
                href="/admin/estoque/dashboard"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard de Estoque
            </Link>

            {/* Error Banner */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-medium">⚠️ Erro</p>
                    <p className="mt-1">{error}</p>
                </div>
            )}

            {/* Step 1: Upload */}
            {step === "upload" && (
                <NfeUploadZone
                    onFileSelect={handleFileSelect}
                    loading={loading}
                />
            )}

            {/* Step 2: Preview & Match */}
            {step === "preview" && nfeData && (
                <>
                    <NfePreview
                        supplierName={nfeData.supplier.name}
                        supplierCnpj={nfeData.supplier.cnpj}
                        nfeNumber={nfeData.nfeNumber}
                        serie={nfeData.serie}
                        totalValue={nfeData.totalValue}
                        items={items}
                        onItemsChange={setItems}
                        onOpenMatchModal={(item) => {
                            setMatchModalItem(item);
                            setMatchModalOpen(true);
                        }}
                        onUnmatchItem={handleUnmatchItem}
                        onResetAllMatches={handleResetAllMatches}
                        onPrintItemLabel={handlePrintItemLabel}
                    />

                    <NfeConfirmButton
                        items={items}
                        totalValue={nfeData.totalValue}
                        onConfirm={handleConfirm}
                        disabled={loading}
                        onPrintLabels={handlePrintNfeLabels}
                    />
                </>
            )}

            {/* Step 3: Confirmed */}
            {step === "confirm" && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <FileText className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-green-800">Importação Confirmada!</h2>
                    <p className="mt-2 text-sm text-green-600">
                        Os produtos foram adicionados ao estoque com sucesso.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-4">
                        <button
                            onClick={handlePrintNfeLabels}
                            className="rounded-lg bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 transition-colors shadow-sm"
                        >
                            🖨️ Imprimir Etiquetas da NF-e
                        </button>
                        <Link
                            href="/admin/estoque/nfe"
                            className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-green-700 border border-green-300 hover:bg-green-100 transition-colors"
                        >
                            Nova Importação
                        </Link>
                        <Link
                            href="/admin/estoque/dashboard"
                            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                        >
                            Ver Estoque
                        </Link>
                    </div>
                </div>
            )}

            {/* Match Modal */}
            <NfeMatchModal
                isOpen={matchModalOpen}
                onClose={() => setMatchModalOpen(false)}
                item={matchModalItem}
                products={products}
                supplierName={nfeData?.supplier.name || ""}
                onConfirm={handleMatchConfirm}
                onCreateProduct={handleCreateProduct}
                onUpdateProductVariants={handleUpdateProductVariants}
                allNfeItems={items}
            />

            {/* Modal de Impressão de Etiquetas */}
            <LabelPrinterModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                items={printItems}
            />
        </div>
    );
}
