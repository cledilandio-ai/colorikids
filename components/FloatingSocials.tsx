"use client";

import { useSettings } from "@/context/SettingsContext";
import { Instagram, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function FloatingSocials() {
    const { whatsapp, whatsappMessage, instagram } = useSettings();
    const pathname = usePathname();

    // Don't show on admin pages
    if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/products") || pathname?.startsWith("/settings") || pathname?.startsWith("/orders") || pathname?.startsWith("/pos") || pathname?.startsWith("/login")) {
        return null;
    }

    // Also check for /admin if that route exists, or any other admin related paths
    // Based on file list, admin routes seem to be in (admin) group which doesn't add /admin to path unless specified.
    // Let's check if (admin) folder adds a prefix. Usually it doesn't unless it's in a folder named [admin].
    // But looking at previous file paths: app/(admin)/dashboard/page.tsx -> /dashboard.
    // So checking for /dashboard, /settings, /orders, /pos is correct.
    // Also /products might be admin or public?
    // Public product page is app/products/[id]/page.tsx -> /products/123
    // Admin product list is app/(admin)/products/page.tsx?
    // Let's check if there is a conflict.
    // app/products/[id]/page.tsx is public.
    // app/(admin)/products/page.tsx is admin?
    // Let's check the file list again.
    // app/(admin)/dashboard/page.tsx
    // app/(admin)/products/[id]/edit/page.tsx
    // app/products/[id]/page.tsx

    // So /products/123 is public. /dashboard is admin.
    // I should probably only hide on known admin routes.

    const isAdminRoute =
        pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/settings") ||
        pathname?.startsWith("/orders") ||
        pathname?.startsWith("/pos") ||
        pathname?.startsWith("/login");

    if (isAdminRoute) return null;

    const formatPhone = (phone: string) => {
        // 1. Remove all non-numeric characters
        const cleaned = phone.replace(/\D/g, "");

        // 2. Check if it starts with 55 (Brazil country code)
        // If it has 12 or 13 digits and starts with 55, it's likely correct (55 + 2 digit DDD + 8/9 digit number)
        if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
            return cleaned;
        }

        // 3. If it has 10 or 11 digits (DDD + Number), add 55
        if (cleaned.length === 10 || cleaned.length === 11) {
            return `55${cleaned}`;
        }

        // 4. Fallback: return cleaned number (might be international or incomplete, but better than nothing)
        return cleaned;
    };

    const whatsappNumber = formatPhone(whatsapp);
    const message = encodeURIComponent(whatsappMessage || "Olá! Vim pelo site da Colorikids e gostaria de saber mais.");

    return (
        <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-3">
            {instagram && (
                <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white shadow-lg transition-transform hover:scale-110"
                    aria-label="Instagram"
                >
                    <Instagram className="h-6 w-6" />
                </a>
            )}
            <a
                href={`https://wa.me/${whatsappNumber}?text=${message}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110"
                aria-label="WhatsApp"
            >
                <MessageCircle className="h-6 w-6" />
            </a>
        </div>
    );
}
