"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrderItem {
    id: string;
    productName: string;
    variantName?: string;
    quantity: number;
    price: number;
    variantId?: string;
}

interface OrderReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    items: OrderItem[];
    onConfirm: () => void;
}

export function OrderReturnModal({ isOpen, onClose, orderId, items, onConfirm }: OrderReturnModalProps) {
    const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [restock, setRestock] = useState(true);
    const [refundAmount, setRefundAmount] = useState<string>("0.00");
    const [loading, setLoading] = useState(false);

    const handleToggleItem = (itemId: string, checked: boolean) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        setSelectedItems(prev => ({ ...prev, [itemId]: checked }));

        if (checked) {
            // Default to max quantity
            setQuantities(prev => ({ ...prev, [itemId]: item.quantity }));
            // Update estimated refund
            updateEstimatedRefund(itemId, item.quantity, true);
        } else {
            // Remove quantity
            setQuantities(prev => {
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
            updateEstimatedRefund(itemId, 0, false);
        }
    };

    const handleQuantityChange = (itemId: string, qty: number) => {
        setQuantities(prev => ({ ...prev, [itemId]: qty }));
        // Recalculate total refund
        recalculateRefund({ ...quantities, [itemId]: qty });
    };

    const updateEstimatedRefund = (itemIdArg: string, qtyArg: number, adding: boolean) => {
        // Helper to update without full recalc if simple toggle, but easier to just recalc all
        // We will just use recalculateRefund with current state
        // Actually, state updates are async, so this helper is tricky.
        // Better to use useEffect or a precise calculator function.
        // For simplicity, let's recalculate based on 'items' and the proposed change.
    };

    const recalculateRefund = (currentQuantities: { [key: string]: number }) => {
        let total = 0;
        items.forEach(item => {
            if (selectedItems[item.id] || (currentQuantities[item.id] > 0 && selectedItems[item.id] !== false)) { // Check selection logic
                // This logic is getting complex due to async state. 
                // Let's rely on a calculated value in render or effect for suggestion, 
                // but 'refundAmount' is an editable input, so we should only auto-update it on specific actions if desired.
                // Let's auto-update only when selection changes for now.
            }
        });
    };

    // Auto-calculate refund when selection changes
    const calculateTotal = () => {
        return items.reduce((acc, item) => {
            if (selectedItems[item.id]) {
                const qty = quantities[item.id] || 0;
                return acc + (qty * item.price);
            }
            return acc;
        }, 0);
    };

    // Update refund input when selection/quantities change
    const estimatedTotal = calculateTotal();
    // We won't force-bind the input to this, but we can set it when things happen.
    // Ideally, user wants to see the recommended value.

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const returnItems = items
                .filter(i => selectedItems[i.id])
                .map(i => ({
                    id: i.id,
                    quantity: quantities[i.id] || 0,
                    variantId: i.variantId
                }));

            const res = await fetch(`/api/orders/${orderId}/return`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: returnItems,
                    restock,
                    refundAmount: parseFloat(refundAmount)
                })
            });

            if (res.ok) {
                alert("Devolução processada com sucesso!");
                onConfirm();
                onClose();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao processar devolução.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Devolução / Troca</DialogTitle>
                    <DialogDescription>Selecione os itens para devolver ao estoque.</DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Itens do Pedido</Label>
                        <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                            {items.map(item => (
                                <div key={item.id} className="p-2 flex items-center gap-3">
                                    <Checkbox
                                        checked={!!selectedItems[item.id]}
                                        onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
                                    />
                                    <div className="flex-1 text-sm">
                                        <div className="font-medium">{item.productName}</div>
                                        <div className="text-gray-500">{item.variantName}</div>
                                    </div>
                                    {selectedItems[item.id] && (
                                        <div className="w-20">
                                            <Input
                                                type="number"
                                                min={1}
                                                max={item.quantity}
                                                value={quantities[item.id] || 0}
                                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                                                className="h-8"
                                            />
                                        </div>
                                    )}
                                    <div className="text-sm font-semibold w-16 text-right">
                                        R$ {(item.price * (quantities[item.id] || item.quantity)).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="restock"
                            checked={restock}
                            onCheckedChange={(c) => setRestock(c as boolean)}
                        />
                        <Label htmlFor="restock">Devolver itens ao Estoque?</Label>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <Label>Valor a Reembolsar (Financeiro)</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">R$</span>
                            <Input
                                type="number"
                                step="0.01"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            Sugerido: R$ {estimatedTotal.toFixed(2)} (Clique para aplicar:
                            <button
                                className="text-blue-600 underline ml-1"
                                onClick={() => setRefundAmount(estimatedTotal.toFixed(2))}
                            >
                                Aplicar
                            </button>)
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading || Object.keys(selectedItems).length === 0}>
                        {loading ? "Processando..." : "Confirmar Devolução"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
