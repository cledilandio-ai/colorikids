"use client";

import { useSettings } from "@/context/SettingsContext";
import { Instagram, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function FloatingSocials() {
    const { whatsapp, whatsappMessage, instagram } = useSettings();
    const pathname = usePathname();

    // Rotas admin — nunca mostrar
    const isAdminRoute =
        pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/settings") ||
        pathname?.startsWith("/orders") ||
        pathname?.startsWith("/pos") ||
        pathname?.startsWith("/login") ||
        pathname?.startsWith("/super-admin") ||
        pathname?.startsWith("/change-password");

    if (isAdminRoute) return null;

    // Na landing page da plataforma ("/") não mostrar botões sociais da loja
    // Cada loja tem seus próprios botões em /c/[slug]
    if (pathname === "/") return null;

    // A partir daqui, só renderiza em rotas de vitrine (/c/[slug])
    // Garante que whatsapp existe antes de montar o link
    if (!whatsapp) return null;

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, "");
        if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
            return cleaned;
        }
        if (cleaned.length === 10 || cleaned.length === 11) {
            return `55${cleaned}`;
        }
        return cleaned;
    };

    const whatsappNumber = formatPhone(whatsapp);
    const message = encodeURIComponent(whatsappMessage || "Olá! Vim pelo site e gostaria de saber mais.");

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
