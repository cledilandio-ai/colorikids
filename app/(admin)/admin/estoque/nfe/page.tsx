"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { NfeUploadZone } from "@/components/admin/nfe/NfeUploadZone";
import { NfePreview } from "@/components/admin/nfe/NfePreview";
import { NfeMatchModal } from "@/components/admin/nfe/NfeMatchModal";
import { NfeConfirmButton } from "@/components/admin/nfe/NfeConfirmButton";
import type { NfeItemPreview } from "@/components/admin/nfe/types";

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
            allocations: Array<{ variantId: string; quantity: number; isNewProduct?: boolean }>
        ) => {
            setItems((prev) => {
                // Find one of the original items to copy its properties (unitValue, nfeCode, etc)
                const originalItem = prev.find((item) => item.nfeItemNumber === itemNumber);
                if (!originalItem) return prev;

                // Remove all previous instances with this nfeItemNumber
                const otherItems = prev.filter((item) => item.nfeItemNumber !== itemNumber);

                const product = products.find((p) => p.id === productId);

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

                    return {
                        ...originalItem,
                        quantity: qty,
                        totalValue: totalVal,
                        matched: true,
                        matchedBy: "MANUAL" as const,
                        productId,
                        variantId: alloc.variantId,
                        isNewProduct: alloc.isNewProduct || false,
                        productName: product?.name || null,
                        variantLabel: variant ? `${variant.size}${variant.color ? " - " + variant.color : ""}` : null,
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

    const handleCreateProduct = useCallback(async (
        itemNumber: number,
        productData: {
            name: string;
            sku: string;
            price: number;
            cost: number;
            imageUrl?: string;
            variants: Array<{ size: string; color: string; quantity: number }>;
        }
    ): Promise<{ productId: string; variantIds: string[] } | null> => {
        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: productData.name,
                    basePrice: productData.price,
                    costPrice: productData.cost,
                    imageUrl: productData.imageUrl || undefined,
                    supplier: nfeData?.supplier.name || "",
                    variants: productData.variants.map((v) => ({
                        size: v.size || "U",
                        color: v.color || undefined,
                        stockQuantity: v.quantity,
                        sku: productData.sku || undefined,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao criar produto");
            }

            const newProduct = await res.json();

            // Adicionar o novo produto à lista local
            const mappedProduct = {
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
            };
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao criar produto");
            return null;
        }
    }, [nfeData]);

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

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Entrada por XML NF-e</h1>
                <p className="mt-1 text-gray-500">
                    Faça upload do XML de uma Nota Fiscal Eletrônica para dar entrada automática no estoque.
                </p>
            </div>

            {/* Error alert */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">Erro ao processar</p>
                            <p className="mt-1 text-sm text-red-600">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 1: Upload */}
            {step === "upload" && (
                <div className="space-y-4">
                    <NfeUploadZone onFileSelect={handleFileSelect} loading={loading} />
                </div>
            )}

            {/* Step 2: Preview + Match */}
            {step === "preview" && nfeData && (
                <div className="space-y-6">
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
                    />

                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setStep("upload")}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            ← Voltar e escolher outro XML
                        </button>
                    </div>

                    <NfeConfirmButton
                        items={items}
                        totalValue={nfeData.totalValue}
                        onConfirm={handleConfirm}
                        disabled={loading}
                    />
                </div>
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
                onConfirm={handleMatchConfirm}
                onCreateProduct={handleCreateProduct}
                onUpdateProductVariants={handleUpdateProductVariants}
                allNfeItems={items}
            />
        </div>
    );
}
