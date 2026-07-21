"use client";

import { useState, useEffect } from "react";
import { Search, X, Check, Package, PlusCircle, Loader2, ImagePlus, Trash2, ArrowLeft, Plus } from "lucide-react";
import type { NfeItemPreview, VariantInput } from "./types";

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

interface NfeMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: NfeItemPreview | null;
    products: MatchedProduct[];
    allNfeItems?: NfeItemPreview[];
    onConfirm: (
        itemNumber: number,
        productId: string,
        allocations: Array<{ variantId: string; quantity: number; isNewProduct?: boolean }>
    ) => void;
    onCreateProduct?: (itemNumber: number, productData: {
        name: string;
        sku: string;
        price: number;
        cost: number;
        imageUrl?: string;
        variants: VariantInput[];
    }) => Promise<{ productId: string; variantIds: string[] } | null>;
    onUpdateProductVariants?: (productId: string, newVariants: MatchedProduct["variants"]) => void;
}

const COMMON_SIZES = ["1 Ano", "2 Anos", "3 Anos", "4 Anos", "6 Anos", "8 Anos", "10 Anos", "12 Anos", "14 Anos", "P", "M", "G", "GG", "U"];

export function NfeMatchModal({
    isOpen,
    onClose,
    item,
    products,
    allNfeItems = [],
    onConfirm,
    onCreateProduct,
    onUpdateProductVariants
}: NfeMatchModalProps) {
    const [mode, setMode] = useState<"search" | "create">("search");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // ─── Direct Variant Allocations for Existing Product ───
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [newVariantSize, setNewVariantSize] = useState("");
    const [newVariantColor, setNewVariantColor] = useState("");
    const [addingVariant, setAddingVariant] = useState(false);

    // ─── Form state for new product ────────────────────────────────────────
    const [newName, setNewName] = useState("");
    const [newSku, setNewSku] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newCost, setNewCost] = useState("");

    // ─── Variantes dinâmicas (Modo Criar Produto) ───────────────────────────
    const [variants, setVariants] = useState<VariantInput[]>([{ size: "U", color: "", quantity: 1 }]);

    // ─── Upload de imagem ──────────────────────────────────────────────────
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // ─── Estados de loading/erro ───────────────────────────────────────────
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // ─── Computed total XML Qty ─────────────────────────────────────────────
    const siblingItems = item ? allNfeItems.filter(i => i.nfeItemNumber === item.nfeItemNumber) : [];
    const totalNfeQty = item
        ? (siblingItems.length > 0 ? siblingItems.reduce((acc, i) => acc + (i.quantity || 0), 0) : Math.round(item.quantity))
        : 0;

    const distributedQty = mode === "search"
        ? Object.values(allocations).reduce((acc, qty) => acc + (qty || 0), 0)
        : variants.reduce((acc, v) => acc + (v.quantity || 0), 0);

    const remainingQty = totalNfeQty - distributedQty;
    const qtyValid = distributedQty <= totalNfeQty;
    const qtyExact = distributedQty === totalNfeQty;

    // ─── Reset state when modal opens ──────────────────────────────────────
    useEffect(() => {
        if (isOpen && item) {
            setMode("search");
            setSearchTerm("");
            setCreateError(null);
            setNewVariantSize("");
            setNewVariantColor("");

            const siblings = allNfeItems.filter(i => i.nfeItemNumber === item.nfeItemNumber);
            const totalQty = siblings.length > 0 ? siblings.reduce((acc, i) => acc + (i.quantity || 0), 0) : Math.round(item.quantity);

            // Populate allocations from existing matched siblings
            const initialAllocations: Record<string, number> = {};
            siblings.forEach(i => {
                if (i.matched && i.variantId) {
                    initialAllocations[i.variantId] = i.quantity;
                }
            });

            // Fallback if item itself has variantId
            if (Object.keys(initialAllocations).length === 0 && item.variantId) {
                initialAllocations[item.variantId] = totalQty;
            }

            setAllocations(initialAllocations);
            setSelectedProductId(item.productId || null);

            // Init form for create mode
            setNewName(item.description || "");
            setNewSku(item.nfeCode || "");
            setNewPrice(item.unitValue ? item.unitValue.toFixed(2) : "");
            setNewCost(item.unitValue ? item.unitValue.toFixed(2) : "");
            setVariants([{ size: "U", color: "", quantity: totalQty || 1 }]);
            setImageFile(null);
            setImagePreview(null);
        }
    }, [isOpen, item, allNfeItems]);

    // ─── Cleanup image preview ─────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    if (!isOpen || !item) return null;

    // ─── Filtered products for search mode ─────────────────────────────────
    const filteredProducts = products.filter((p) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            p.name.toLowerCase().includes(term) ||
            p.variants.some((v) => v.sku?.toLowerCase().includes(term))
        );
    });

    const selectedProduct = products.find((p) => p.id === selectedProductId);

    // ─── Handlers for Existing Product Distribution ─────────────────────────
    const handleConfirmSearch = () => {
        if (!selectedProductId) return;

        const activeAllocations = Object.entries(allocations)
            .filter(([_, qty]) => qty > 0)
            .map(([variantId, quantity]) => ({
                variantId,
                quantity,
                isNewProduct: false,
            }));

        if (activeAllocations.length === 0) {
            setCreateError("Informe a quantidade para pelo menos uma variante.");
            return;
        }

        onConfirm(item.nfeItemNumber, selectedProductId, activeAllocations);
        onClose();
    };

    const distributeSearchEvenly = () => {
        if (!selectedProduct || selectedProduct.variants.length === 0) return;
        const count = selectedProduct.variants.length;
        const base = Math.floor(totalNfeQty / count);
        const remainder = totalNfeQty % count;
        const nextAllocations: Record<string, number> = {};
        selectedProduct.variants.forEach((v, idx) => {
            nextAllocations[v.id] = base + (idx < remainder ? 1 : 0);
        });
        setAllocations(nextAllocations);
    };

    const handleAddNewVariantToProduct = async () => {
        if (!selectedProductId || !newVariantSize.trim()) {
            setCreateError("Informe o tamanho da nova variante.");
            return;
        }
        setAddingVariant(true);
        setCreateError(null);

        try {
            const res = await fetch(`/api/products/${selectedProductId}`);
            if (!res.ok) throw new Error("Erro ao carregar dados do produto");
            const prodData = await res.json();

            const formattedSize = /^\d+$/.test(newVariantSize.trim())
                ? `${newVariantSize.trim()} Anos`
                : newVariantSize.trim();
            const formattedColor = newVariantColor.trim().toUpperCase();

            const existingVars = (prodData.variants || []).map((v: any) => ({
                id: v.id,
                size: v.size,
                color: v.color || null,
                stockQuantity: v.stockQuantity || 0,
                minStock: v.minStock || 1,
                imageUrl: v.imageUrl || null,
                sku: v.sku || null,
            }));

            const newVar = {
                size: formattedSize,
                color: formattedColor || null,
                stockQuantity: 0,
                minStock: 1,
                imageUrl: null,
                sku: `${(prodData.name || "PROD").substring(0, 3).toUpperCase()}-${(formattedColor || "VAR").substring(0, 3).toUpperCase()}-${formattedSize.replace(/\s/g, "")}-${Date.now().toString().slice(-4)}`
            };

            const putRes = await fetch(`/api/products/${selectedProductId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variants: [...existingVars, newVar] }),
            });

            if (!putRes.ok) {
                const errData = await putRes.json();
                throw new Error(errData.error || "Erro ao criar nova variante");
            }

            // Re-fetch updated variants
            const updatedRes = await fetch(`/api/products/${selectedProductId}`);
            const updatedProd = await updatedRes.json();
            const updatedVariants = (updatedProd.variants || []).map((v: any) => ({
                id: v.id,
                size: v.size,
                color: v.color || null,
                sku: v.sku || null,
                stockQuantity: v.stockQuantity || 0,
            }));

            if (onUpdateProductVariants) {
                onUpdateProductVariants(selectedProductId, updatedVariants);
            }

            // Find created variant
            const created = updatedVariants.find(
                (v: any) => v.size === formattedSize && (v.color || "").toUpperCase() === formattedColor
            );

            if (created) {
                const nextQty = remainingQty > 0 ? remainingQty : 0;
                setAllocations(prev => ({
                    ...prev,
                    [created.id]: nextQty
                }));
            }

            setNewVariantSize("");
            setNewVariantColor("");
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Erro ao adicionar variante");
        } finally {
            setAddingVariant(false);
        }
    };

    // ─── Image Upload Handlers ─────────────────────────────────────────────
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setCreateError("Apenas imagens são permitidas.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setCreateError("Imagem muito grande. Máximo 5MB.");
            return;
        }

        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setCreateError(null);
    };

    const handleRemoveImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview(null);
    };

    // ─── Create Product Handlers ───────────────────────────────────────────
    const addVariant = () => {
        const nextQty = remainingQty > 0 ? remainingQty : 0;
        setVariants((prev) => [...prev, { size: "", color: "", quantity: nextQty }]);
    };

    const removeVariant = (index: number) => {
        if (variants.length <= 1) return;
        setVariants((prev) => prev.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: keyof VariantInput, value: string | number) => {
        setVariants((prev) =>
            prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
        );
    };

    const insertCommonSize = (size: string) => {
        const formattedSize = /^\d+$/.test(size) ? `${size} Anos` : size;
        const emptyIdx = variants.findIndex((v) => !v.size);
        if (emptyIdx >= 0) {
            updateVariant(emptyIdx, "size", formattedSize);
        } else {
            const nextQty = remainingQty > 0 ? remainingQty : 0;
            setVariants((prev) => [...prev, { size: formattedSize, color: "", quantity: nextQty }]);
        }
    };

    const distributeEvenly = () => {
        const count = variants.length;
        if (count === 0) return;
        const base = Math.floor(totalNfeQty / count);
        const remainder = totalNfeQty % count;
        setVariants((prev) =>
            prev.map((v, i) => ({
                ...v,
                quantity: base + (i < remainder ? 1 : 0),
            }))
        );
    };

    const handleCreateProduct = async () => {
        if (!onCreateProduct || !item) return;
        setCreating(true);
        setCreateError(null);

        try {
            let imageUrl = "";

            if (imageFile) {
                const formData = new FormData();
                formData.append("file", imageFile);

                const uploadRes = await fetch("/api/upload?type=product", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const err = await uploadRes.json();
                    throw new Error(err.error || "Erro ao fazer upload da imagem");
                }

                const uploadData = await uploadRes.json();
                imageUrl = uploadData.url || "";
            }

            const result = await onCreateProduct(item.nfeItemNumber, {
                name: newName,
                sku: newSku,
                price: parseFloat(newPrice) || 0,
                cost: parseFloat(newCost) || 0,
                imageUrl,
                variants: variants.map((v) => ({
                    size: v.size || "U",
                    color: v.color,
                    quantity: v.quantity || 0,
                })),
            });

            if (result) {
                const activeAllocations = result.variantIds.map((variantId, idx) => ({
                    variantId,
                    quantity: variants[idx]?.quantity || 0,
                    isNewProduct: true,
                }));
                onConfirm(item.nfeItemNumber, result.productId, activeAllocations);
                onClose();
            }
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Erro ao criar produto");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between border-b p-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {mode === "search" ? "Associar Produto" : "Criar Novo Produto"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Item #{item.nfeItemNumber}: <span className="font-medium text-gray-700">{item.description}</span> ({totalNfeQty} un)
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* ── Tabs ──────────────────────────────────────────────── */}
                <div className="flex border-b px-4">
                    <button
                        onClick={() => { setMode("search"); setCreateError(null); }}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${mode === "search"
                                ? "border-pink-500 text-pink-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Buscar produto existente
                    </button>
                    <button
                        onClick={() => { setMode("create"); setCreateError(null); }}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${mode === "create"
                                ? "border-pink-500 text-pink-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        + Criar novo produto
                    </button>
                </div>

                {/* ── Content ────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* ===== MODO BUSCA ===== */}
                    {mode === "search" ? (
                        <>
                            {!selectedProduct ? (
                                <>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pink-500 focus:ring-pink-500"
                                            placeholder="Buscar produto por nome ou SKU..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {filteredProducts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <Package className="mb-2 h-8 w-8 text-gray-300" />
                                            <p className="text-sm text-gray-500">Nenhum produto encontrado</p>
                                            <button
                                                onClick={() => setMode("create")}
                                                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-pink-700"
                                            >
                                                <PlusCircle className="h-4 w-4" />
                                                Criar novo produto com os dados da NF-e
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {filteredProducts.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className="rounded-lg border border-gray-200 p-3 cursor-pointer transition-all hover:border-pink-300 hover:bg-pink-50/50 flex items-center justify-between"
                                                    onClick={() => setSelectedProductId(product.id)}
                                                >
                                                    <div>
                                                        <span className="font-medium text-gray-800">{product.name}</span>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {product.variants.length} variante(s) cadastrada(s)
                                                        </p>
                                                    </div>
                                                    <button className="rounded-lg bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 border border-pink-200">
                                                        Selecionar →
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* ===== PRODUTO SELECIONADO (Tabela de Distribuição) ===== */
                                <div className="space-y-4">
                                    {/* Top Bar - Produto Escolhido */}
                                    <div className="flex items-center justify-between rounded-xl border border-pink-200 bg-pink-50/60 p-3">
                                        <div className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-pink-600" />
                                            <div>
                                                <p className="text-xs text-pink-700 font-medium">Produto Selecionado</p>
                                                <h4 className="text-base font-bold text-gray-900">{selectedProduct.name}</h4>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedProductId(null); setAllocations({}); }}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border rounded-lg px-2.5 py-1.5 transition-colors"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" />
                                            Alterar Produto
                                        </button>
                                    </div>

                                    {/* Distribuição Header & Progress */}
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-gray-800">
                                                📦 Distribuir Quantidade nas Variantes
                                            </h4>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${qtyExact
                                                    ? "bg-green-100 text-green-700"
                                                    : qtyValid
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}>
                                                {distributedQty} / {totalNfeQty} un
                                            </span>
                                        </div>

                                        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${qtyExact
                                                        ? "bg-green-500"
                                                        : qtyValid
                                                            ? "bg-amber-400"
                                                            : "bg-red-500"
                                                    }`}
                                                style={{ width: `${Math.min((distributedQty / totalNfeQty) * 100, 100)}%` }}
                                            />
                                        </div>

                                        {/* Tabela de Variantes Existentes */}
                                        <div className="space-y-2 mt-3">
                                            {selectedProduct.variants.length === 0 ? (
                                                <p className="text-xs text-amber-600 py-2 text-center">
                                                    Nenhuma variante cadastrada neste produto. Adicione uma nova variante abaixo.
                                                </p>
                                            ) : (
                                                selectedProduct.variants.map((v) => {
                                                    const qty = allocations[v.id] || 0;
                                                    return (
                                                        <div
                                                            key={v.id}
                                                            className={`flex items-center justify-between rounded-lg border p-2.5 transition-all ${qty > 0 ? "border-pink-300 bg-white shadow-sm" : "border-gray-200 bg-white"
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                                                                    Tam: {v.size}
                                                                </span>
                                                                {v.color && (
                                                                    <span className="text-xs font-medium text-gray-600 uppercase">
                                                                        Cor: {v.color}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-gray-400">
                                                                    (Est. atual: {v.stockQuantity})
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs text-gray-500">Qtd a adicionar:</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={totalNfeQty}
                                                                    value={allocations[v.id] ?? ""}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        setAllocations(prev => ({
                                                                            ...prev,
                                                                            [v.id]: val
                                                                        }));
                                                                    }}
                                                                    placeholder="0"
                                                                    className="w-20 rounded-md border border-gray-300 p-1.5 text-center text-sm focus:border-pink-500 focus:ring-pink-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Ações rápidas de distribuição */}
                                        {selectedProduct.variants.length > 0 && (
                                            <div className="flex items-center justify-between pt-2">
                                                <button
                                                    type="button"
                                                    onClick={distributeSearchEvenly}
                                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                                                >
                                                    Distribuir igualmente ({totalNfeQty} / {selectedProduct.variants.length})
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setAllocations({})}
                                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200"
                                                >
                                                    Limpar quantidades
                                                </button>
                                            </div>
                                        )}

                                        {/* Avisos */}
                                        {!qtyValid && (
                                            <p className="text-xs text-red-500 pt-1">
                                                ⚠️ A soma das quantidades ({distributedQty}) excede o total da NF-e ({totalNfeQty}).
                                            </p>
                                        )}
                                        {qtyValid && !qtyExact && remainingQty > 0 && (
                                            <p className="text-xs text-amber-500 pt-1">
                                                💡 Ainda faltam {remainingQty} unidade(s) para distribuir.
                                            </p>
                                        )}
                                    </div>

                                    {/* Card: Adicionar Nova Variante ao Produto Existente */}
                                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 space-y-3">
                                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                            <Plus className="h-4 w-4 text-pink-600" />
                                            Criar Nova Variante para este Produto
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Tamanho *</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: 2 ou P"
                                                    value={newVariantSize}
                                                    onChange={(e) => setNewVariantSize(e.target.value)}
                                                    onBlur={(e) => {
                                                        const val = e.target.value.trim();
                                                        if (/^\d+$/.test(val)) {
                                                            setNewVariantSize(`${val} Anos`);
                                                        }
                                                    }}
                                                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cor (opcional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: AZUL"
                                                    value={newVariantColor}
                                                    onChange={(e) => setNewVariantColor(e.target.value.toUpperCase())}
                                                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Tamanhos infantis / padrão rápida */}
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Sugestões rápidas:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {COMMON_SIZES.map((size) => (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={() => {
                                                            const formatted = /^\d+$/.test(size) ? `${size} Anos` : size;
                                                            setNewVariantSize(formatted);
                                                        }}
                                                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200 transition-colors"
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddNewVariantToProduct}
                                            disabled={!newVariantSize.trim() || addingVariant}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
                                        >
                                            {addingVariant ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Criando variante...
                                                </>
                                            ) : (
                                                <>
                                                    <PlusCircle className="h-3.5 w-3.5" />
                                                    Adicionar Variante ao Produto
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* ===== MODO CRIAR NOVO PRODUTO ===== */
                        <div className="space-y-6">
                            <p className="text-sm text-gray-500">
                                Os campos abaixo foram pré-preenchidos com os dados da NF-e. Ajuste se necessário.
                            </p>

                            {/* ── Nome + SKU ─────────────────────────────── */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto *</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Nome do produto"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU (código)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500"
                                        value={newSku}
                                        onChange={(e) => setNewSku(e.target.value)}
                                        placeholder="Código do produto"
                                    />
                                </div>
                            </div>

                            {/* ── Preços ──────────────────────────────────── */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500"
                                        value={newCost}
                                        onChange={(e) => setNewCost(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ── DESMEMBRAR VARIANTES ────────────────────── */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-800">
                                        📦 Variantes <span className="font-normal text-gray-400">(desmembrar quantidade)</span>
                                    </h4>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${qtyExact
                                            ? "bg-green-100 text-green-700"
                                            : qtyValid
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-red-100 text-red-700"
                                        }`}>
                                        {distributedQty} / {totalNfeQty} un
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="mb-4 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${qtyExact
                                                ? "bg-green-500"
                                                : qtyValid
                                                    ? "bg-amber-400"
                                                    : "bg-red-500"
                                            }`}
                                        style={{ width: `${Math.min((distributedQty / totalNfeQty) * 100, 100)}%` }}
                                    />
                                </div>

                                {/* Tamanhos comuns (quick-add) */}
                                <div className="mb-4">
                                    <p className="text-xs text-gray-500 mb-1.5">Tamanhos rápidos:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {COMMON_SIZES.map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => insertCommonSize(size)}
                                                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50"
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tabela de variantes */}
                                <div className="space-y-2">
                                    {variants.map((variant, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5"
                                        >
                                            <span className="w-5 text-center text-xs font-medium text-gray-400">
                                                {index + 1}
                                            </span>

                                            {/* Size */}
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={variant.size}
                                                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                                                    onBlur={(e) => {
                                                        const val = e.target.value.trim();
                                                        if (/^\d+$/.test(val)) {
                                                            updateVariant(index, "size", `${val} Anos`);
                                                        }
                                                    }}
                                                    placeholder="Tam (ex: 2)"
                                                    className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>

                                            {/* Color */}
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={variant.color}
                                                    onChange={(e) => updateVariant(index, "color", e.target.value.toUpperCase())}
                                                    placeholder="Cor (ex: ROSA)"
                                                    className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={totalNfeQty}
                                                    value={variant.quantity}
                                                    onChange={(e) => updateVariant(index, "quantity", parseInt(e.target.value) || 0)}
                                                    className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-center focus:border-pink-500 focus:ring-pink-500"
                                                />
                                            </div>

                                            {/* Remove */}
                                            <button
                                                type="button"
                                                onClick={() => removeVariant(index)}
                                                disabled={variants.length <= 1}
                                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Remover variante"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer da tabela */}
                                <div className="mt-3 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={addVariant}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50"
                                    >
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        Adicionar variante
                                    </button>

                                    {variants.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={distributeEvenly}
                                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                                        >
                                            Distribuir igualmente ({totalNfeQty} / {variants.length})
                                        </button>
                                    )}
                                </div>

                                {/* Warning */}
                                {!qtyValid && (
                                    <p className="mt-2 text-xs text-red-500">
                                        ⚠️ A soma das quantidades ({distributedQty}) excede o total da NF-e ({totalNfeQty}).
                                    </p>
                                )}
                                {qtyValid && !qtyExact && remainingQty > 0 && (
                                    <p className="mt-2 text-xs text-amber-500">
                                        💡 Ainda faltam {remainingQty} unidade(s) para distribuir.
                                    </p>
                                )}
                            </div>

                            {/* ── UPLOAD DE FOTO ──────────────────────────── */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                    🖼️ Foto do Produto <span className="font-normal text-gray-400">(opcional)</span>
                                </h4>

                                {imagePreview ? (
                                    <div className="flex items-center gap-4">
                                        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-white">
                                            <img
                                                src={imagePreview}
                                                alt="Preview do produto"
                                                className="h-full w-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">{imageFile?.name}</p>
                                            <p className="text-xs text-gray-400">
                                                {(imageFile ? (imageFile.size / 1024).toFixed(0) : 0)} KB · Será comprimida para ~300KB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                            title="Remover imagem"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative inline-block w-full">
                                        <input
                                            key={imageFile ? "has-image" : "no-image"}
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                            onChange={handleImageSelect}
                                        />
                                        <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-pink-300 hover:bg-pink-50/30">
                                            <ImagePlus className="mb-2 h-8 w-8 text-gray-300" />
                                            <p className="text-sm font-medium text-gray-600">Clique para selecionar imagem</p>
                                            <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP · Máx. 5MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Error message */}
                            {createError && (
                                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                    {createError}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Global error message for search mode if outside form */}
                    {mode === "search" && createError && (
                        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-200 mt-2">
                            {createError}
                        </p>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <div className="flex items-center justify-between border-t p-4">
                    {mode === "create" && (
                        <button
                            onClick={() => setMode("search")}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            ← Voltar para busca
                        </button>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>

                        {mode === "search" ? (
                            <button
                                onClick={handleConfirmSearch}
                                disabled={!selectedProductId || !qtyValid || distributedQty === 0 || !qtyExact}
                                className="rounded-lg bg-pink-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Confirmar e Associar
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateProduct}
                                disabled={!newName || !newPrice || !newCost || !qtyValid || distributedQty === 0 || creating}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {imageFile ? "Enviando imagem..." : "Criando..."}
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="h-4 w-4" />
                                        Criar e Associar
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
