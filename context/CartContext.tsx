"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type CartItem = {
    id: string;
    name: string;
    price: number;
    qty: number;
    variantId: string;
    variantName: string;
    imageUrl?: string;
    sku?: string;
};

type CartContextType = {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (variantId: string) => void;
    updateQty: (variantId: string, qty: number) => void;
    clearCart: () => void;
    total: number;
    cartCount: number;
    isCartOpen: boolean;
    toggleCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem("colorikids-cart");
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("colorikids-cart", JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item: CartItem) => {
        setCart((prev) => {
            const existing = prev.find((p) => p.variantId === item.variantId);
            if (existing) {
                return prev.map((p) =>
                    p.variantId === item.variantId ? { ...p, qty: p.qty + item.qty } : p
                );
            }
            return [...prev, item];
        });
    };

    const removeFromCart = (variantId: string) => {
        setCart((prev) => prev.filter((p) => p.variantId !== variantId));
    };

    const updateQty = (variantId: string, qty: number) => {
        if (qty < 1) return;
        setCart((prev) =>
            prev.map((p) => (p.variantId === variantId ? { ...p, qty } : p))
        );
    };

    const clearCart = () => {
        setCart([]);
    };

    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

    const [isCartOpen, setIsCartOpen] = useState(false);

    const toggleCart = () => setIsCartOpen((prev) => !prev);

    return (
        <CartContext.Provider
            value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, cartCount, isCartOpen, toggleCart }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
