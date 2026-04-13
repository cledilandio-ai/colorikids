"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Highlight {
    url: string;
    instagramLink?: string;
}

interface SettingsContextType {
    whatsapp: string;
    whatsappMessage: string;
    companyName: string;
    cnpj: string;
    instagram: string;
    pixKey: string;
    pixKeyType: string;
    featuredImageUrls: Highlight[];
    storeSlug: string;
    refreshSettings: () => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [whatsapp, setWhatsapp] = useState("");
    const [whatsappMessage, setWhatsappMessage] = useState("Olá! Vim pelo site e gostaria de saber mais.");
    const [companyName, setCompanyName] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [instagram, setInstagram] = useState("");
    const [featuredImageUrls, setFeaturedImageUrls] = useState<Highlight[]>([]);
    const [pixKey, setPixKey] = useState("");
    const [pixKeyType, setPixKeyType] = useState("CPF");
    const [loading, setLoading] = useState(true);
    const [storeSlug, setStoreSlug] = useState("");

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setWhatsapp(data.whatsapp || "");
                setWhatsappMessage(data.whatsappMessage || "Olá! Vim pelo site e gostaria de saber mais.");
                setCompanyName(data.companyName || "Minha Loja");
                setCnpj(data.cnpj || "");
                setInstagram(data.instagram || "");
                setPixKey(data.pixKey || "");
                setPixKeyType(data.pixKeyType || "CPF");
                setStoreSlug(data.store?.slug || "");

                try {
                    const parsed = JSON.parse(data.featuredImageUrls || "[]");
                    if (Array.isArray(parsed)) {
                        // Normalize legacy data (string[]) to Highlight[]
                        const normalized: Highlight[] = parsed.map((item: any) => {
                            if (typeof item === 'string') {
                                return { url: item };
                            }
                            return item; // Assume it's already a Highlight object
                        });
                        setFeaturedImageUrls(normalized);
                    } else {
                        setFeaturedImageUrls([]);
                    }
                } catch (e) {
                    console.error("Error parsing featuredImageUrls:", e);
                    setFeaturedImageUrls([]);
                }
            }
        } catch (error) {
            console.error("Failed to load settings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ whatsapp, whatsappMessage, companyName, cnpj, instagram, pixKey, pixKeyType, featuredImageUrls, storeSlug, refreshSettings: fetchSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
