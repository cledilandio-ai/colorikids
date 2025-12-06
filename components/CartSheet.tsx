"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart, X, Trash, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useSettings } from "@/context/SettingsContext";

export function CartSheet() {
    const { cart, removeFromCart, updateQty, total, cartCount, clearCart, isCartOpen, toggleCart } = useCart();
    const { whatsapp, companyName, pixKey, pixKeyType } = useSettings();
    // const [isOpen, setIsOpen] = useState(false); // Removed local state
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");

    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            // 1. Create order in database
            const orderData = {
                customerName: customerName || "Cliente Site",
                customerPhone: customerPhone || "",
                total: total,
                status: "PENDING",
                type: "WEB",
                items: JSON.stringify(cart),
                paymentMethod: paymentMethod
            };

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData),
            });

            if (!res.ok) {
                console.error("Failed to create order");
                alert("Erro ao registrar pedido. Tente novamente.");
                return;
            }

            // 2. Open WhatsApp
            const formatPhone = (phone: string) => {
                const cleaned = phone.replace(/\D/g, "");
                if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) return cleaned;
                if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
                return cleaned;
            };

            const whatsappNumber = formatPhone(whatsapp);

            const message = `Olá! Gostaria de finalizar meu pedido no *${companyName}*.\n\n` +
                `*Cliente:* ${customerName || "Não informado"}\n` +
                `*Telefone:* ${customerPhone || "Não informado"}\n` +
                `*Pagamento:* ${paymentMethod}\n\n` +
                `*Itens:*\n` +
                cart.map(item => `- ${item.qty}x ${item.name} (${item.variantName}) - R$ ${(item.price * item.qty).toFixed(2)}`).join("\n") +
                `\n\n*Total: R$ ${total.toFixed(2)}*`;

            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, "_blank");

            // 3. Clear cart
            clearCart();
            toggleCart();
            setCustomerName("");
            setCustomerPhone("");

        } catch (error) {
            console.error(error);
            alert("Erro ao processar pedido.");
        } finally {
            setLoading(false);
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={toggleCart}
            >
                <ShoppingCart className="h-6 w-6 text-secondary" />
                {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                        {cartCount}
                    </span>
                )}
            </Button>

            {mounted && createPortal(
                <>
                    {/* Backdrop */}
                    {isCartOpen && (
                        <div
                            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm transition-opacity"
                            onClick={toggleCart}
                        />
                    )}

                    {/* Drawer */}
                    <div
                        className={`fixed inset-y-0 right-0 z-[9999] w-full max-w-md bg-white shadow-xl transition-transform duration-300 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full"
                            }`}
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b p-4">
                                <h2 className="text-lg font-bold text-gray-800">Seu Carrinho</h2>
                                <Button variant="ghost" size="icon" onClick={toggleCart}>
                                    <X className="h-6 w-6 text-gray-500" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {cart.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                        <ShoppingCart className="mb-4 h-12 w-12 opacity-20" />
                                        <p>Seu carrinho está vazio</p>
                                        <Button
                                            variant="link"
                                            className="mt-2 text-primary"
                                            onClick={toggleCart}
                                        >
                                            Continuar comprando
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((item) => (
                                            <div key={item.variantId} className="flex gap-4 rounded-lg border p-3">
                                                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                                            Sem Foto
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 flex-col justify-between">
                                                    <div>
                                                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                                                        <p className="text-sm text-gray-500">{item.variantName}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => updateQty(item.variantId, item.qty - 1)}
                                                                className="rounded-md border p-1 hover:bg-gray-100"
                                                                disabled={item.qty <= 1}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </button>
                                                            <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                                                            <button
                                                                onClick={() => updateQty(item.variantId, item.qty + 1)}
                                                                className="rounded-md border p-1 hover:bg-gray-100"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-primary">
                                                                R$ {(item.price * item.qty).toFixed(2)}
                                                            </span>
                                                            <button
                                                                onClick={() => removeFromCart(item.variantId)}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="border-t bg-gray-50 p-6">
                                    <div className="mb-4 space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Seu Nome (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                placeholder="Digite seu nome..."
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Seu Telefone (Opcional)
                                            </label>
                                            <input
                                                type="tel"
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                placeholder="(00) 00000-0000"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Forma de Pagamento
                                            </label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="DINHEIRO">Dinheiro / Transferência</option>
                                                <option value="PIX">PIX</option>
                                                <option value="CARTAO">Cartão (Link de Pagamento)</option>
                                            </select>
                                        </div>

                                        {paymentMethod === "PIX" && pixKey && (
                                            <div className="rounded-md bg-blue-50 p-3 border border-blue-100">
                                                <p className="text-xs font-bold text-blue-800 mb-1">Chave PIX ({pixKeyType}):</p>
                                                <p className="text-sm font-mono text-gray-800 select-all break-all">{pixKey}</p>
                                                <p className="text-[10px] text-blue-600 mt-1">Copie a chave acima para pagar.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-lg font-medium text-gray-600">Total</span>
                                        <span className="text-2xl font-bold text-primary">
                                            R$ {total.toFixed(2)}
                                        </span>
                                    </div>

                                    <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={loading}>
                                        {loading ? "Processando..." : "Finalizar no WhatsApp"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
