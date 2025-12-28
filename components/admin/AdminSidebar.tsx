"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Menu, X, Archive, PanelLeftClose, PanelLeftOpen, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

interface AdminSidebarProps {
    role?: string;
    permissions?: string[];
}

export function AdminSidebar({ role, permissions = [] }: AdminSidebarProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();


    // Fechar sidebar mobile ao navegar
    const closeMobileSidebar = () => setIsMobileOpen(false);

    const links = [
        { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
        { href: "/products", label: "Produtos", icon: Package },
        { href: "/admin/estoque/dashboard", label: "Estoque (Dash)", icon: Archive },
        { href: "/orders", label: "Pedidos", icon: ShoppingBag },
        { href: "/pos", label: "PDV (Caixa)", icon: ShoppingCart },
        { href: "/clientes", label: "Clientes", icon: Users },
    ];

    const ownerLinks = [
        { href: "/financeiro", label: "Financeiro", icon: () => <span className="font-bold text-lg">$</span> },
        { href: "/settings", label: "Configurações", icon: Settings },
    ];

    // Default permissions for backward compatibility
    const effectivePermissions = (permissions && permissions.length > 0) ? permissions : links.map(l => l.href);

    const allAvailableLinks = [...links, ...ownerLinks];

    const allLinks = role === "OWNER"
        ? allAvailableLinks
        : allAvailableLinks.filter(link => effectivePermissions.includes(link.href));

    return (
        <>
            {/* Mobile Header */}
            <div className="flex h-16 items-center border-b bg-white px-4 md:hidden fixed top-0 left-0 right-0 z-40 justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)} className="mr-2">
                        <Menu className="h-6 w-6" />
                    </Button>
                    <span className="text-lg font-bold text-primary">Colorikids Admin</span>
                </div>
            </div>

            {/* Spacer for Mobile Header */}
            <div className="h-16 md:hidden" />

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white transition-all duration-300 md:static md:h-screen",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Desktop Header with Toggle */}
                <div className={cn("hidden md:flex h-16 items-center border-b px-4 transition-all duration-300", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && <span className="text-xl font-bold text-primary truncate">Colorikids Admin</span>}

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                        title={isCollapsed ? "Expandir" : "Recolher"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile Header inside Sidebar (close button) */}
                <div className="flex md:hidden h-16 items-center justify-between border-b px-4">
                    <span className="text-xl font-bold text-primary">Colorikids Admin</span>
                    <button onClick={() => setIsMobileOpen(false)} className="p-2">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
                    {allLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMobileSidebar}
                                className={cn(
                                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1",
                                    isActive
                                        ? "bg-pink-50 text-pink-600"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? link.label : undefined}
                            >
                                <Icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                                {!isCollapsed && <span className="truncate">{link.label}</span>}
                            </Link>
                        );
                    })}

                    <div className="my-4 border-t border-gray-200" />

                    <Link
                        href="/"
                        target="_blank"
                        className={cn(
                            "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? "Ver Loja" : undefined}
                    >
                        <ShoppingBag className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                        {!isCollapsed && <span className="truncate">Ver Loja</span>}
                    </Link>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = "/login";
                        }}
                        className={cn(
                            "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-1",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? "Sair" : undefined}
                    >
                        <LogOut className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                        {!isCollapsed && <span className="truncate">Sair</span>}
                    </button>

                </nav>
            </aside>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}

// Simple Button component if not imported, but better use standard HTML button or import Button from ui
function Button({ children, className, variant, size, onClick, ...props }: any) {
    return (
        <button
            className={cn("p-2 rounded-md hover:bg-gray-100", className)}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    )
}
