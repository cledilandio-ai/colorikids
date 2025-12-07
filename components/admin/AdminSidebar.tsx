"use client";

import Link from "next/link";
import { LayoutDashboard, Package, ShoppingCart, LogOut, ShoppingBag, Settings, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils"; // Assuming you have a utility for class merging, otherwise I'll use template literals carefully or check if clxs/tailwind-merge is used (it is in package.json)

interface AdminSidebarProps {
    role?: string;
}

export function AdminSidebar({ role }: AdminSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);
    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            {/* Mobile Header / Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b flex items-center justify-between px-4 z-40">
                <span className="font-bold text-lg text-primary">Colorikids Admin</span>
                <button onClick={toggleSidebar} className="p-2 text-gray-600">
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar Aside */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen",
                isOpen ? "translate-x-0" : "-translate-x-full",
                // Adjust for mobile header height if fixed, but here we just want it full height z-50
            )}>
                <div className="flex h-16 items-center justify-center border-b">
                    {/* On mobile, we might want to hide this or keep it. Keeping it for consistency. */}
                    <h1 className="text-xl font-bold text-primary">Colorikids Admin</h1>
                </div>
                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
                    <Link
                        href="/dashboard"
                        onClick={closeSidebar}
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Visão Geral</span>
                    </Link>
                    <Link
                        href="/products"
                        onClick={closeSidebar}
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <Package className="h-5 w-5" />
                        <span>Produtos</span>
                    </Link>
                    <Link
                        href="/orders"
                        onClick={closeSidebar}
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <ShoppingBag className="h-5 w-5" />
                        <span>Pedidos</span>
                    </Link>
                    <Link
                        href="/pos"
                        onClick={closeSidebar}
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        <span>PDV (Caixa)</span>
                    </Link>
                    <Link
                        href="/clientes"
                        onClick={closeSidebar}
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <User className="h-5 w-5" />
                        <span>Clientes</span>
                    </Link>
                    {role === "OWNER" && (
                        <>
                            <Link
                                href="/financeiro"
                                onClick={closeSidebar}
                                className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                            >
                                <div className="h-5 w-5 flex items-center justify-center font-bold text-lg">$</div>
                                <span>Financeiro</span>
                            </Link>
                            <Link
                                href="/settings"
                                onClick={closeSidebar}
                                className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                            >
                                <Settings className="h-5 w-5" />
                                <span>Configurações</span>
                            </Link>
                        </>
                    )}
                    <div className="pt-4 mt-4 border-t space-y-2">
                        <Link
                            href="/"
                            target="_blank"
                            className="flex items-center gap-3 rounded-lg px-4 py-2 text-blue-600 hover:bg-blue-50"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            <span>Ver Loja</span>
                        </Link>
                        <Link
                            href="/login"
                            className="flex items-center gap-3 rounded-lg px-4 py-2 text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Sair</span>
                        </Link>
                    </div>
                </nav>
            </aside>
        </>
    );
}
