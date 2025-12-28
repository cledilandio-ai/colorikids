"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Trash, CreditCard, Banknote, QrCode, X, User, Calendar, Copy, Check, Lock, Send, ShoppingCart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useSettings } from "@/context/SettingsContext";
import { generatePixPayload } from "@/lib/pix";

interface Payment {
    method: string;
    amount: number | string;
    dueDate?: string;
}

interface Customer {
    id: string;
    name: string;
    cpf?: string;
    phone?: string;
}

export default function POSPage() {
    // --- Estados Principais ---
    const searchParams = useSearchParams();
    const router = useRouter();
    const { pixKey, companyName, whatsapp } = useSettings();

    // Lista de produtos carregados do banco
    const [products, setProducts] = useState<any[]>([]);
    // Carrinho de compras
    const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; variantId: string; variantName: string; sku?: string }[]>([]);
    // Busca
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    // Pedido atual
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

    // --- Estados de Pagamento ---
    const [payments, setPayments] = useState<Payment[]>([]);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    // --- Estados de Cliente ---
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

    // Produto selecionado
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // --- Estados do Caixa ---
    const [registerStatus, setRegisterStatus] = useState<"OPEN" | "CLOSED" | "LOADING">("LOADING");
    const [registerData, setRegisterData] = useState<any>(null);

    // Abertura Caixa
    const [initialAmount, setInitialAmount] = useState("");
    const [withdrawFromTreasury, setWithdrawFromTreasury] = useState(true);
    const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);

    // Fechamento Caixa
    const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
    const [closingCashCounted, setClosingCashCounted] = useState("");
    const [amountToTransfer, setAmountToTransfer] = useState("");
    const [suggestedAmount, setSuggestedAmount] = useState(0);

    // --- Estados PIX ---
    const [showPixModal, setShowPixModal] = useState(false);
    const [pixPayload, setPixPayload] = useState("");

    // --- Mobile ---
    const [showPostAddAction, setShowPostAddAction] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);

    // --- Sucesso ---
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOrderData, setLastOrderData] = useState<{ total: number; change: number; pixPayment?: Payment & { payload: string } } | null>(null);

    // --- Logica Desconto ---
    const [discount, setDiscount] = useState(0);
    const [isDiscountInvalid, setIsDiscountInvalid] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // --- Override de Desconto ---
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overridePassword, setOverridePassword] = useState("");
    const [isOverrideAuthorized, setIsOverrideAuthorized] = useState(false);
    const [tempMaxDiscount, setTempMaxDiscount] = useState(0);

    useEffect(() => {
        fetchProducts();
        checkRegisterStatus();
    }, []);

    useEffect(() => {
        const orderId = searchParams.get("orderId");
        if (orderId) {
            setCurrentOrderId(orderId);
            fetchOrder(orderId);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            // Robust cookie parse
            const cookies = document.cookie.split(";");
            const userIdCookie = cookies.find((row) => row.trim().startsWith("user_id="));
            const userId = userIdCookie ? userIdCookie.split("=")[1] : null;

            if (userId) {
                try {
                    const res = await fetch(`/api/users/${userId}`);
                    if (res.ok) {
                        const user = await res.json();
                        setCurrentUser(user);
                    }
                } catch (e) {
                    console.error("Failed to load user permissions", e);
                }
            }
        };
        fetchCurrentUser();
    }, []);

    // --- Funcoes de Busca e Dados ---
    const fetchOrder = async (id: string) => {
        try {
            const res = await fetch(`/api/orders/${id}`);
            if (res.ok) {
                const order = await res.json();
                try {
                    const items = JSON.parse(order.items || "[]");
                    setCart(items);
                } catch (e) { console.error("Error parsing items", e); }

                if (order.customerId) {
                    setSelectedCustomer({
                        id: order.customerId,
                        name: order.customerName || "Cliente",
                        phone: order.customerPhone
                    });
                } else if (order.customerName) {
                    setCustomerSearch(order.customerName);
                }
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (customerSearch.length > 2) searchCustomers();
            else setCustomers([]);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [customerSearch]);

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            if (Array.isArray(data)) setProducts(data);
        } catch (error) { console.error(error); }
    };

    const searchCustomers = async () => {
        setIsSearchingCustomer(true);
        try {
            const res = await fetch(`/api/customers?search=${customerSearch}`);
            const data = await res.json();
            setCustomers(data);
        } catch (error) { console.error(error); }
        finally { setIsSearchingCustomer(false); }
    };

    // --- Caixa (Register) Logic ---
    const checkRegisterStatus = async () => {
        try {
            const res = await fetch("/api/cash-register", { cache: "no-store" });
            const data = await res.json();
            if (data.status === "OPEN") {
                setRegisterStatus("OPEN");
                setRegisterData(data);
            } else {
                setRegisterStatus("CLOSED");
                const suggested = data.suggestedInitialAmount || 0;
                setSuggestedAmount(suggested);
                if (suggested > 0) {
                    setInitialAmount(suggested.toString());
                    setWithdrawFromTreasury(false);
                } else {
                    setInitialAmount("");
                    setWithdrawFromTreasury(true);
                }
                setShowOpenRegisterModal(true);
            }
        } catch (error) { console.error(error); }
    };

    const handleOpenRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(initialAmount);
        let withdraw = withdrawFromTreasury;

        if (amount > suggestedAmount) {
            const diff = amount - suggestedAmount;
            if (confirm(`Detectada diferença de R$ ${diff.toFixed(2)} maior que o valor anterior.\nIsso foi retirado do Caixa Principal?`)) {
                withdraw = true;
            } else {
                withdraw = false;
            }
        }

        try {
            const res = await fetch("/api/cash-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "OPEN", initialAmount, withdrawFromTreasury: withdraw }),
            });
            if (res.ok) {
                const data = await res.json();
                setRegisterStatus("OPEN");
                setRegisterData(data);
                setShowOpenRegisterModal(false);
                alert("Caixa aberto com sucesso!");
            } else {
                const errorData = await res.json();
                alert(errorData.error || "Erro ao abrir caixa.");
            }
        } catch (error) { console.error(error); }
    };

    const handleCloseRegister = async () => {
        const cashPhysicallyInDrawer = parseFloat(closingCashCounted) || 0;
        const cashToTransfer = parseFloat(amountToTransfer) || 0;
        const initial = registerData?.initialAmount || 0;
        const salesCash = registerData?.salesByMethod?.["DINHEIRO"] || 0;
        const expectedCash = initial + salesCash;
        const diff = cashPhysicallyInDrawer - expectedCash;

        if (Math.abs(diff) > 0.01) {
            if (!confirm(`Diferença de caixa de R$ ${diff.toFixed(2)}.\nDeseja confirmar?`)) return;
        }
        if (cashToTransfer > cashPhysicallyInDrawer) {
            alert("Erro: Sangria maior que dinheiro na gaveta.");
            return;
        }

        try {
            const res = await fetch("/api/cash-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "CLOSE", finalAmount: cashPhysicallyInDrawer, transferredAmount: cashToTransfer }),
            });

            if (res.ok) {
                setRegisterStatus("CLOSED");
                setRegisterData(null);
                setShowCloseRegisterModal(false);
                setClosingCashCounted("");
                setAmountToTransfer("");
                alert("Caixa fechado!");
                checkRegisterStatus();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao fechar caixa.");
            }
        } catch (error) { console.error(error); }
    };

    // --- Carrinho e Desconto ---
    const handleProductClick = (product: any) => setSelectedProduct(product);

    const addToCart = (variant: any) => {
        if (!selectedProduct) return;
        const currentQty = cart.find((p) => p.variantId === variant.id)?.qty || 0;
        const availableStock = variant.stockQuantity || 0;

        if (currentQty + 1 > availableStock) {
            alert(`Estoque insuficiente! Disponível: ${availableStock} un.`);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((p) => p.variantId === variant.id);
            if (existing) return prev.map((p) => (p.variantId === variant.id ? { ...p, qty: p.qty + 1 } : p));
            return [...prev, { id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.basePrice, qty: 1, variantId: variant.id, variantName: `${variant.size} ${variant.color ? `- ${variant.color}` : ""}`, sku: variant.sku }];
        });
        setSelectedProduct(null);

        if (window.innerWidth < 1024) setShowPostAddAction(true);
    };

    const removeFromCart = (variantId: string) => setCart((prev) => prev.filter((p) => p.variantId !== variantId));

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const total = Math.max(0, subtotal - discount);

    const handleDiscountChange = (val: string, type: 'money' | 'percent') => {
        const num = parseFloat(val) || 0;
        let finalDiscount = 0;
        if (type === 'percent') finalDiscount = subtotal * (num / 100);
        else finalDiscount = num;

        const maxPercent = currentUser?.maxDiscount || 0;
        const currentPercent = subtotal > 0 ? (finalDiscount / subtotal) * 100 : 0;

        console.log("Discount Debug:", {
            role: currentUser?.role,
            maxPercent,
            currentPercent,
            isOwner: currentUser?.role === 'OWNER',
            willBlock: currentUser && currentUser.role !== 'OWNER' && currentPercent > maxPercent
        });

        // Tolerance for floating point math
        // Removing OWNER bypass as requested per user feedback
        if (currentUser && currentPercent > maxPercent + 0.01) {
            setIsDiscountInvalid(true);
        } else {
            setIsDiscountInvalid(false);
        }
        setDiscount(finalDiscount);
    };

    const handleAuthorizeOverride = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/auth/verify-owner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: overridePassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setIsOverrideAuthorized(true);
                setTempMaxDiscount(data.maxDiscount || 100);
                setShowOverrideModal(false);
                setIsDiscountInvalid(false);

                // Re-validate immediately
                const currentPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
                if (currentPercent <= (data.maxDiscount || 100)) setIsDiscountInvalid(false);

                alert("Desconto autorizado pelo Proprietário!");
            } else {
                alert(data.error || "Senha inválida");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao validar senha");
        }
    };

    // --- Pagamento ---
    const totalPaid = payments.reduce((acc, p) => acc + (typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount), 0);
    const remaining = Math.max(0, total - totalPaid);

    const addPayment = (method: string, value: number) => {
        if (value <= 0) return;
        setPayments([...payments, { method, amount: value }]);
    };

    const updatePayment = (index: number, field: string, value: any) => {
        const newPayments = [...payments];
        (newPayments[index] as any)[field] = value;
        setPayments(newPayments);
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const handlePixSelection = () => {
        if (!pixKey) { alert("Chave Pix não configurada."); return; }
        setShowPixModal(true);
        try {
            const payload = generatePixPayload({
                key: pixKey,
                name: companyName,
                city: "SAO PAULO",
                amount: remaining,
                transactionId: `POS${Date.now()}`
            });
            setPixPayload(payload);
        } catch (e) { console.error(e); }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (isDiscountInvalid) {
            alert('Desconto inválido! Cancele ou reduza o desconto.');
            return;
        }

        const maxPercent = currentUser?.maxDiscount || 0;
        const currentPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
        if (currentUser && currentPercent > maxPercent + 0.1) {
            alert(`Desconto maior que o permitido!`);
            return;
        }

        if (remaining > 0.01) {
            alert(`Falta receber R$ ${remaining.toFixed(2)}`);
            return;
        }

        const hasCrediario = payments.some(p => p.method === "CREDIARIO");
        if (hasCrediario && !selectedCustomer) { alert("Crediário exige cliente selecionado."); return; }

        let paymentsToSubmit = payments.map(p => ({ ...p, amount: parseFloat(p.amount.toString()) || 0 }));
        const change = Math.abs(remaining);

        if (change > 0.01) {
            const cashIndex = paymentsToSubmit.findIndex(p => p.method === "DINHEIRO");
            if (cashIndex !== -1) {
                const cashPayment = paymentsToSubmit[cashIndex];
                paymentsToSubmit[cashIndex] = { ...cashPayment, amount: cashPayment.amount - change };
            } else {
                alert("Troco detectado sem pagamento em dinheiro.");
                return;
            }
        }

        setLoading(true);
        try {
            const url = currentOrderId ? `/api/orders/${currentOrderId}` : "/api/orders";
            const method = currentOrderId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: selectedCustomer ? selectedCustomer.name : (customerSearch || "Cliente Balcão"),
                    customerId: selectedCustomer?.id,
                    total,
                    status: "COMPLETED",
                    type: "POS",
                    items: JSON.stringify(cart),
                    payments: paymentsToSubmit,
                    cashRegisterId: registerData?.id
                })
            });

            if (res.ok) {
                const pixPayment = paymentsToSubmit.find(p => p.method === "PIX");
                let pixData = undefined;
                if (pixPayment && pixKey) {
                    const payload = generatePixPayload({ key: pixKey, name: companyName, city: "SAO PAULO", amount: pixPayment.amount, transactionId: `POS${Date.now()}` });
                    pixData = { ...pixPayment, payload };
                }
                setLastOrderData({ total, change: change > 0.01 ? change : 0, pixPayment: pixData });
                setShowSuccessModal(true);
                setCart([]); setPayments([]); setSelectedCustomer(null); setCustomerSearch(""); setShowCheckoutModal(false);
                checkRegisterStatus();
                fetchProducts();
                if (currentOrderId) { router.push("/orders"); setCurrentOrderId(null); }
            } else {
                const data = await res.json();
                alert(`Erro: ${data.error}`);
            }
        } catch (e) { console.error(e); alert("Erro de conexão."); }
        finally { setLoading(false); }
    };

    // --- Filter Vars ---
    const initial = registerData?.initialAmount || 0;
    const cashSales = registerData?.salesByMethod?.["DINHEIRO"] || 0;
    const calculatedExpectedCash = initial + cashSales;
    const cashInDrawer = parseFloat(closingCashCounted) || 0;
    const retainedAmount = cashInDrawer - (parseFloat(amountToTransfer) || 0);

    const filteredProducts = products.filter((p) => {
        const lowerSearch = search.toLowerCase();
        return p.name.toLowerCase().includes(lowerSearch) || p.variants.some((v: any) => v.sku?.toLowerCase().includes(lowerSearch));
    });

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Ponto de Venda</h1>
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${registerStatus === "OPEN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {registerStatus === "OPEN" ? "Caixa Aberto" : "Caixa Fechado"}
                    </div>
                    {registerStatus === "OPEN" && (
                        <Button size="sm" onClick={() => setShowCloseRegisterModal(true)} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                            <Lock className="h-3 w-3 mr-2" /> Fechar Caixa
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6 lg:flex-1 lg:flex-row lg:overflow-hidden">
                <div className="flex flex-col gap-4 lg:flex-1 lg:overflow-hidden">
                    <div className="relative flex-shrink-0">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input className="w-full rounded-xl border border-gray-300 p-3 pl-10 text-lg focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                    </div>
                    <div className="w-full relative h-[500px] lg:h-auto lg:flex-1 lg:min-h-0">
                        <div className="flex flex-wrap content-start gap-4 h-full overflow-y-auto pb-24 lg:pb-4 pr-2">
                            {filteredProducts.map((product) => (
                                <button key={product.id} onClick={() => handleProductClick(product)} className="text-left group flex flex-col justify-between overflow-hidden rounded-xl border bg-white shadow-sm hover:border-primary hover:bg-blue-50 transition-all duration-200 w-[calc(50%-0.5rem)] sm:w-[12rem] md:w-[13rem] lg:w-[14rem] shrink-0">
                                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gray-100">
                                        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-400">Sem Foto</div>}
                                    </div>
                                    <div className="p-3 w-full flex flex-col flex-1 justify-between gap-1">
                                        <span className="block font-semibold text-gray-800 line-clamp-2 text-sm leading-tight">{product.name}</span>
                                        <div className="flex items-end justify-between w-full">
                                            <span className="text-base font-bold text-primary">R$ {product.basePrice.toFixed(2)}</span>
                                            <span className="text-[10px] text-gray-500 mb-1">{product.variants?.length || 0} op.</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop Cart */}
                <div className="hidden lg:flex w-96 flex-col rounded-xl border bg-white shadow-lg">
                    <div className="border-b p-4"><h2 className="text-xl font-bold text-gray-800">Carrinho</h2></div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {cart.length === 0 ? <div className="flex items-center justify-center h-full text-gray-400">Vazio</div> : cart.map(i => (
                            <div key={i.variantId} className="flex justify-between p-2 bg-gray-50 mb-2 rounded">
                                <div><div className="font-medium">{i.name}</div><div className="text-xs text-gray-500">{i.variantName}</div></div>
                                <div className="flex items-center gap-2 font-bold">R$ {(i.price * i.qty).toFixed(2)} <button onClick={() => removeFromCart(i.variantId)} className="text-red-500"><Trash className="w-4 h-4" /></button></div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t bg-gray-50 p-6">
                        {cart.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Desc. R$</label>
                                    <input type="number" min="0" step="0.01" className="w-full border rounded p-1 text-sm font-medium" placeholder="0,00" value={discount > 0 ? discount : ''} onChange={(e) => handleDiscountChange(e.target.value, 'money')} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">
                                        Desc. % {currentUser && <span className="text-xs text-red-500 ml-1">(Max: {currentUser.maxDiscount}%)</span>}
                                    </label>
                                    <input type="number" min="0" max="100" step="1" className="w-full border rounded p-1 text-sm font-medium" placeholder="0%" value={subtotal > 0 && discount > 0 ? ((discount / subtotal) * 100).toFixed(1) : ''} onChange={(e) => handleDiscountChange(e.target.value, 'percent')} />
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between mb-2 text-sm text-gray-500"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                        {discount > 0 && <div className="flex justify-between mb-2 text-sm text-green-600 font-medium"><span>Desconto</span><span>- R$ {discount.toFixed(2)}</span></div>}

                        {discount > 0 && <div className="flex justify-between mb-2 text-sm text-green-600 font-medium"><span>Desconto</span><span>- R$ {discount.toFixed(2)}</span></div>}

                        {isDiscountInvalid && (
                            <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-center text-xs font-bold text-red-500 flex flex-col items-center gap-1">
                                <span>🚫 Limite excedido ({((discount / subtotal) * 100).toFixed(1)}% &gt; {currentUser?.maxDiscount}%)</span>
                                <button onClick={() => { setShowOverrideModal(true); setOverridePassword(""); }} className="underline text-red-700 hover:text-red-900 font-bold cursor-pointer">
                                    Solicitar Autorização
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between mb-4"><span className="text-lg font-medium">Total Final</span><span className="text-3xl font-bold text-primary">R$ {total.toFixed(2)}</span></div>
                        <Button className="w-full h-12" onClick={() => { setPayments([]); setShowCheckoutModal(true); }} disabled={cart.length === 0 || isDiscountInvalid}>Ir para Pagamento</Button>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex flex-col"><span className="text-sm text-gray-500">Total</span><span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span></div>
                <Button className="h-10" onClick={() => setShowMobileCart(true)} disabled={cart.length === 0}><ShoppingCart className="w-4 h-4 mr-2" /> Finalizar</Button>
            </div>

            {/* Mobile Cart Modal */}
            {showMobileCart && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
                    <div className="flex items-center justify-between p-4 border-b"><h2 className="text-xl font-bold">Meu Carrinho</h2><button onClick={() => setShowMobileCart(false)}><X className="h-6 w-6" /></button></div>
                    <div className="flex-1 overflow-y-auto p-4">{cart.map(i => <div key={i.variantId} className="flex justify-between p-3 bg-gray-50 mb-3 rounded-lg border"><div><div className="font-medium">{i.name}</div><div className="text-xs text-gray-500">{i.variantName}</div></div><div className="flex items-center gap-3 font-bold">R$ {(i.price * i.qty).toFixed(2)}<button onClick={() => removeFromCart(i.variantId)} className="text-red-500 p-1"><Trash className="w-5 h-5" /></button></div></div>)}</div>
                    <div className="border-t bg-gray-50 p-6">
                        {/* Discount Mobile */}
                        {cart.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><label className="text-xs font-semibold text-gray-500 uppercase">Desc. R$</label><input type="number" className="w-full border rounded p-1" value={discount > 0 ? discount : ''} onChange={(e) => handleDiscountChange(e.target.value, 'money')} /></div>
                                <div><label className="text-xs font-semibold text-gray-500 uppercase">Desc. %</label><input type="number" className="w-full border rounded p-1" value={subtotal > 0 && discount > 0 ? ((discount / subtotal) * 100).toFixed(1) : ''} onChange={(e) => handleDiscountChange(e.target.value, 'percent')} /></div>
                            </div>
                        )}
                        <div className="flex justify-between mb-4"><span className="text-lg font-medium">Total</span><span className="text-3xl font-bold text-primary">R$ {total.toFixed(2)}</span></div>
                        <Button className="w-full h-12 text-lg" onClick={() => { setPayments([]); setShowCheckoutModal(true); setShowMobileCart(false); }} disabled={cart.length === 0}>Ir para Pagamento</Button>
                    </div>
                </div>
            )}

            {/* Post Add Action */}
            {showPostAddAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-2xl flex flex-col gap-4">
                        <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4"><Check className="h-8 w-8 text-green-600" /></div><h3 className="text-lg font-bold text-gray-900">Produto Adicionado!</h3></div>
                        <Button variant="outline" className="w-full h-12 text-lg" onClick={() => setShowPostAddAction(false)}>Continuar Comprando</Button>
                        <Button className="w-full h-12 text-lg" onClick={() => { setShowPostAddAction(false); setShowMobileCart(true); }}>Fechar Carrinho / Pagar</Button>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow-2xl h-[90vh] flex flex-col">
                        <div className="flex justify-between mb-4 border-b pb-4"><h2 className="text-2xl font-bold">Pagamento</h2><button onClick={() => setShowCheckoutModal(false)}><X /></button></div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Cliente</label>
                                    <input className="w-full border p-2 rounded" placeholder="Buscar..." value={selectedCustomer ? selectedCustomer.name : customerSearch} onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }} />
                                    {customers.length > 0 && !selectedCustomer && <div className="border mt-1 rounded max-h-40 overflow-auto">{customers.map(c => <div key={c.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedCustomer(c); setCustomers([]); }}>{c.name}</div>)}</div>}
                                </div>
                                <div className="bg-gray-50 p-4 rounded">
                                    <div className="mb-4">
                                        <div className="grid grid-cols-2 gap-2 mb-2 items-end">
                                            <div>
                                                <label className="text-xs text-gray-500 font-semibold uppercase">Desc. R$</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full border rounded p-1 text-sm text-right bg-white"
                                                    placeholder="0,00"
                                                    value={discount > 0 ? discount : ''}
                                                    onChange={(e) => handleDiscountChange(e.target.value, 'money')}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-semibold uppercase flex flex-col sm:flex-row sm:items-center sm:gap-1">
                                                    Desc. % {currentUser && <span className="text-[10px] text-red-500 whitespace-nowrap">(Max: {currentUser.maxDiscount}%)</span>}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    className="w-full border rounded p-1 text-sm text-right bg-white"
                                                    placeholder="0%"
                                                    value={subtotal > 0 && discount > 0 ? ((discount / subtotal) * 100).toFixed(1) : ''}
                                                    onChange={(e) => handleDiscountChange(e.target.value, 'percent')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold"><span>Total a Pagar</span><span>R$ {total.toFixed(2)}</span></div>
                                    {discount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-medium mb-1 border-b pb-1 border-dashed border-green-200">
                                            <span>Desconto Aplicado</span>
                                            <span>- R$ {discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm mt-2"><span>Recebido</span><span className="text-green-600">R$ {totalPaid.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-bold pt-2 border-t mt-2">
                                        {remaining > 0.01 ? <><span>Falta</span><span className="text-red-600">R$ {remaining.toFixed(2)}</span></> : <><span>Troco</span><span className="text-blue-600 text-xl">R$ {Math.abs(remaining).toFixed(2)}</span></>}
                                    </div>
                                    {isDiscountInvalid && <div className="text-red-500 font-bold text-xs mt-2 bg-red-50 p-2 rounded border border-red-200 flex flex-col items-center gap-1">
                                        <span>🚫 Desconto ({((discount / subtotal) * 100).toFixed(1)}%) excede seu limite de {currentUser?.maxDiscount}%</span>
                                        <button onClick={() => { setShowOverrideModal(true); setOverridePassword(""); }} className="underline text-red-700 hover:text-red-900 font-bold cursor-pointer">Solicitar Autorização</button>
                                    </div>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" onClick={() => addPayment("DINHEIRO", remaining)}>Dinheiro</Button>
                                    <Button variant="outline" size="sm" onClick={() => addPayment("CARTAO", remaining)}>Cartão</Button>
                                    <Button variant="outline" size="sm" onClick={handlePixSelection}>Pix</Button>
                                    <Button variant="outline" size="sm" onClick={() => addPayment("CREDIARIO", remaining)}>Crediário</Button>
                                </div>
                                <div className="space-y-2">
                                    {payments.map((p, i) => (
                                        <div key={i} className="flex flex-col gap-1 border p-2 rounded bg-gray-50">
                                            <div className="flex justify-between items-center"><span className="font-medium">{p.method}</span><div className="flex items-center gap-2"><input type="number" className="w-24 text-right border rounded p-1" value={p.amount} onChange={e => updatePayment(i, "amount", e.target.value)} /><Trash className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => removePayment(i)} /></div></div>
                                            {p.method === "CREDIARIO" && <div className="flex items-center justify-end gap-2 text-sm mt-1"><span className="text-gray-500">Vencimento:</span><input type="date" className="border rounded p-1" value={p.dueDate || ""} onChange={e => updatePayment(i, "dueDate", e.target.value)} /></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <Button className="w-full h-12" onClick={handleCheckout} disabled={isDiscountInvalid}>{isDiscountInvalid ? "Desconto Inválido" : "Finalizar"}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Register Modal */}
            {showOpenRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <h2 className="mb-4 text-xl font-bold text-gray-900">Abrir Caixa</h2>
                        <form onSubmit={handleOpenRegister}>
                            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">Valor Inicial</label><input type="number" step="0.01" required value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} className="w-full rounded-md border border-gray-300 p-2" /></div>
                            <div className="mb-6 flex items-start gap-2 rounded-md bg-yellow-50 p-3 border border-yellow-100"><input type="checkbox" id="withdraw" className="mt-1" checked={withdrawFromTreasury} onChange={(e) => setWithdrawFromTreasury(e.target.checked)} /><label htmlFor="withdraw" className="text-sm text-gray-700"><strong>Retirar do Caixa Principal?</strong></label></div>
                            <Button type="submit" className="w-full">Abrir Caixa</Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Register Modal */}
            {showCloseRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Fechar Caixa</h2><button onClick={() => setShowCloseRegisterModal(false)}><X /></button></div>
                        <div className="bg-gray-50 p-4 rounded mb-4 text-sm space-y-2">
                            <div className="flex justify-between text-gray-600"><span>Fundo de Troco:</span><span>R$ {(registerData?.initialAmount || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-green-700 font-medium"><span>(+) Vendas Dinheiro:</span><span>R$ {(registerData?.salesByMethod?.["DINHEIRO"] || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-gray-500 text-xs pl-2"><span>(+) Vendas Cartão (Info):</span><span>R$ {(registerData?.salesByMethod?.["CARTAO"] || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-gray-500 text-xs pl-2"><span>(+) Vendas Pix (Info):</span><span>R$ {(registerData?.salesByMethod?.["PIX"] || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-gray-500 text-xs pl-2"><span>(+) Vendas Crediário (Info):</span><span>R$ {(registerData?.salesByMethod?.["CREDIARIO"] || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold border-t border-gray-300 pt-2 mt-2 text-base"><span>Total Esperado (Dinheiro):</span><span>R$ {calculatedExpectedCash.toFixed(2)}</span></div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">1. Dinheiro na Gaveta (Contagem)</label><input type="number" step="0.01" className="w-full border p-2 rounded" value={closingCashCounted} onChange={e => setClosingCashCounted(e.target.value)} /></div>
                            <div><label className="block text-sm font-medium text-gray-700">2. Transferir para Tesouraria</label><input type="number" step="0.01" className="w-full border p-2 rounded" value={amountToTransfer} onChange={e => setAmountToTransfer(e.target.value)} /></div>
                            <div className="bg-blue-50 p-3 rounded border border-blue-100 flex justify-between items-center"><span className="text-blue-900 font-medium text-sm">Fica na Gaveta</span><span className={`text-lg font-bold ${retainedAmount < 0 ? "text-red-500" : "text-blue-700"}`}>R$ {retainedAmount.toFixed(2)}</span></div>
                            <Button onClick={handleCloseRegister} className="w-full bg-red-600 hover:bg-red-700" disabled={!closingCashCounted}>Confirmar Fechamento</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pix Modal */}
            {showPixModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl max-w-sm w-full text-center">
                        <h3 className="font-bold text-lg mb-2">Pagamento Pix</h3>
                        <div className="bg-white p-2 border rounded inline-block mb-4 shadow-sm"><QRCodeSVG value={pixPayload} size={180} /></div>
                        <p className="font-bold text-xl mb-4 text-green-700">R$ {remaining > 0 ? remaining.toFixed(2) : total.toFixed(2)}</p>
                        <Button onClick={handleCheckout} className="w-full mb-2 h-10">Confirmar Pagamento</Button>
                        <Button variant="ghost" className="w-full h-8 text-xs text-gray-500" onClick={() => setShowPixModal(false)}>Cancelar</Button>
                    </div>
                </div>
            )}

            {/* Product Variant Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl max-w-md w-full">
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">{selectedProduct.name}</h3><button onClick={() => setSelectedProduct(null)}><X /></button></div>
                        <div className="grid grid-cols-2 gap-2 max-h-96 overflow-auto">{selectedProduct.variants?.map((v: any) => <button key={v.id} onClick={() => addToCart(v)} disabled={v.stockQuantity === 0} className="border p-2 rounded hover:bg-gray-50 flex flex-col items-center"><span>{v.size} {v.color}</span><span className="text-xs text-gray-500">{v.stockQuantity} un.</span></button>)}</div>
                    </div>
                </div>
            )}

            {/* Override Authorization Modal */}
            {showOverrideModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-lg text-red-600 flex items-center gap-2"><Lock className="w-5 h-5" /> Autorização Necessária</h3><button onClick={() => setShowOverrideModal(false)}><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleAuthorizeOverride}>
                            <p className="text-sm text-gray-600 mb-4">Insira a senha de um <strong>Proprietário</strong> para autorizar este desconto excessivo.</p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Proprietário</label>
                                <input type="password" required autoFocus className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none" value={overridePassword} onChange={e => setOverridePassword(e.target.value)} />
                            </div>
                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white">Autorizar Desconto</Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl">
                        <div className="flex justify-center mb-4"><div className="bg-green-100 p-4 rounded-full"><Check className="w-12 h-12 text-green-600" /></div></div>
                        <h2 className="text-2xl font-bold mb-2">Venda Realizada!</h2>
                        <p className="text-gray-600 mb-6">Total: R$ {lastOrderData?.total.toFixed(2)}</p>
                        {lastOrderData && lastOrderData.change > 0 && <div className="bg-blue-50 p-3 rounded-lg mb-6 border border-blue-100"><p className="text-sm text-blue-800 font-medium">Troco</p><p className="text-2xl font-bold text-blue-600">R$ {lastOrderData.change.toFixed(2)}</p></div>}
                        <Button onClick={() => setShowSuccessModal(false)} variant="outline" className="w-full h-12">Iniciar Nova Venda</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
