"use client";

import { CartProvider } from "@/context/CartContext";
import { SettingsProvider } from "@/context/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SettingsProvider>
            <CartProvider>{children}</CartProvider>
        </SettingsProvider>
    );
}
