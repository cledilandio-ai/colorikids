"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { useSettings } from "@/context/SettingsContext";
import { Instagram, MessageCircle, Search } from "lucide-react";
import { HeroCarousel } from "@/components/HeroCarousel";

interface Product {
    id: string;
    name: string;
    description: string | null;
    basePrice: number;
    imageUrl: string | null;
    category: string | null;
    gender: string | null;
    variants: { id: string; imageUrl: string | null; size: string; price?: number }[];
}

interface StorefrontHomeProps {
    initialProducts: Product[];
}

export function StorefrontHome({ initialProducts }: StorefrontHomeProps) {
    const [selectedGender, setSelectedGender] = useState<string>("Todos");
    const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
    const [searchQuery, setSearchQuery] = useState("");

    const categories = useMemo(() => {
        const cats = new Set(initialProducts.map(p => p.category).filter((c): c is string => !!c));
        return ["Todos", ...Array.from(cats)];
    }, [initialProducts]);

    const filteredProducts = useMemo(() => {
        return initialProducts.filter(product => {
            const matchGender = selectedGender === "Todos" || product.gender === selectedGender;
            const matchCategory = selectedCategory === "Todos" || product.category === selectedCategory;
            const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchGender && matchCategory && matchSearch;
        });
    }, [initialProducts, selectedGender, selectedCategory, searchQuery]);

    const { whatsapp, instagram, featuredImageUrls } = useSettings();

    return (
        <main className="min-h-screen bg-background flex flex-col">
            <Navbar />

            {/* Hero Section */}
            {featuredImageUrls && featuredImageUrls.length > 0 ? (
                <HeroCarousel images={featuredImageUrls} />
            ) : (
                <section className="bg-primary/10 py-12 md:py-20">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-primary md:text-6xl">
                            Vamos Colorir o Mundo!
                        </h1>
                        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
                            Moda infantil e juvenil com alegria, conforto e muito estilo.
                        </p>
                    </div>
                </section>
            )}

            {/* Filters & Grid */}
            <section className="container mx-auto px-4 py-12 flex-grow">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 md:text-3xl">
                        Nossa Coleção
                    </h2>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar produtos..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Gender Filter */}
                        <div className="flex rounded-md border bg-white p-1">
                            {["Todos", "Menina", "Menino", "Unissex"].map((gender) => (
                                <button
                                    key={gender}
                                    onClick={() => setSelectedGender(gender === "Menina" ? "Feminino" : gender === "Menino" ? "Masculino" : gender)}
                                    className={`rounded px-3 py-1 text-sm font-medium transition-colors ${(selectedGender === gender) ||
                                        (selectedGender === "Feminino" && gender === "Menina") ||
                                        (selectedGender === "Masculino" && gender === "Menino")
                                        ? "bg-primary text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    {gender}
                                </button>
                            ))}
                        </div>

                        {/* Category Filter */}
                        <select
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none h-10"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        Nenhum produto encontrado com os filtros selecionados.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer className="bg-white border-t py-8 mt-auto">
                <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-6">
                        {/* Icons moved to floating component */}
                    </div>
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} Colorikids. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </main>
    );
}
