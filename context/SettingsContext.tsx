"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type SettingsContextType = {
    whatsapp: string;
    whatsappMessage: string;
    companyName: string;
    cnpj: string;
    instagram: string;
    pixKey: string;
    pixKeyType: string;
    featuredImageUrls: string[];
    refreshSettings: () => Promise<void>;
    loading: boolean;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [whatsapp, setWhatsapp] = useState("5511999999999");
    const [whatsappMessage, setWhatsappMessage] = useState("Olá! Vim pelo site da Colorikids e gostaria de saber mais.");
    const [companyName, setCompanyName] = useState("Colorikids");
    const [cnpj, setCnpj] = useState("");
    const [instagram, setInstagram] = useState("");
    const [featuredImageUrls, setFeaturedImageUrls] = useState<string[]>([]);
    const [pixKey, setPixKey] = useState("");
    const [pixKeyType, setPixKeyType] = useState("CPF");
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setWhatsapp(data.whatsapp);
                setWhatsappMessage(data.whatsappMessage || "Olá! Vim pelo site da Colorikids e gostaria de saber mais.");
                setCompanyName(data.companyName);
                setCnpj(data.cnpj || "");
                setInstagram(data.instagram || "");
                setPixKey(data.pixKey || "");
                setPixKeyType(data.pixKeyType || "CPF");
                try {
                    setFeaturedImageUrls(JSON.parse(data.featuredImageUrls || "[]"));
                } catch {
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
        <SettingsContext.Provider value={{ whatsapp, whatsappMessage, companyName, cnpj, instagram, pixKey, pixKeyType, featuredImageUrls, refreshSettings: fetchSettings, loading }}>
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
