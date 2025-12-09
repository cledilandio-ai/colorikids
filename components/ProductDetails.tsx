"use client";

import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface ProductDetailsProps {
    product: any;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
    const router = useRouter();
    const [selectedColor, setSelectedColor] = useState<string>("");
    const [selectedSize, setSelectedSize] = useState<string>("");
    const { addToCart, toggleCart } = useCart();
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Group variants by color
    const variantsByColor = product.variants.reduce((acc: any, variant: any) => {
        const color = variant.color || "Padrão";
        if (!acc[color]) acc[color] = [];
        acc[color].push(variant);
        return acc;
    }, {});

    const colors = Object.keys(variantsByColor);

    // Get available sizes for selected color
    const availableSizes = selectedColor ? variantsByColor[selectedColor] : [];

    // Find the specific variant based on selection
    const selectedVariant = availableSizes.find((v: any) => v.size === selectedSize);

    // Collect all unique images
    const allImages = [
        product.imageUrl,
        ...product.variants.map((v: any) => v.imageUrl)
    ].filter((url, index, self) => url && self.indexOf(url) === index);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Update carousel when variant is selected
    const handleVariantChange = (color: string) => {
        setSelectedColor(color);
        setSelectedSize("");

        // Find first image for this color
        const variantImage = product.variants.find((v: any) => v.color === color && v.imageUrl)?.imageUrl;
        if (variantImage) {
            const index = allImages.indexOf(variantImage);
            if (index !== -1) setCurrentImageIndex(index);
        }
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const handleAddToCart = () => {
        if (!selectedVariant) {
            alert("Por favor, selecione uma cor e um tamanho.");
            return;
        }

        addToCart({
            id: product.id,
            name: product.name,
            price: product.basePrice,
            qty: 1,
            variantId: selectedVariant.id,
            variantName: `${selectedVariant.size} ${selectedVariant.color ? `- ${selectedVariant.color}` : ""}`,
            imageUrl: allImages[currentImageIndex] || product.imageUrl,
            sku: selectedVariant.sku
        });

        setShowSuccessDialog(true);
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="container mx-auto px-4 py-12">
                <Link href="/">
                    <Button variant="ghost" className="mb-6 gap-2">
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </Button>
                </Link>

                <div className="grid gap-12 md:grid-cols-2">
                    {/* Image Gallery */}
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 border group">
                        {/* Carousel Main Image */}
                        {allImages.length > 0 ? (
                            <>
                                <div
                                    className="flex h-full w-full transition-transform duration-500 ease-out"
                                    style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                                >
                                    {allImages.map((src, index) => (
                                        <div key={index} className="relative h-full w-full flex-shrink-0">
                                            <Image
                                                src={src}
                                                alt={`${product.name} - Imagem ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Navigation Arrows */}
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow-md hover:bg-white"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow-md hover:bg-white"
                                            style={{ transform: 'translateY(-50%) rotate(180deg)' }}
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                    </>
                                )}

                                {/* Dots Indicators */}
                                {allImages.length > 1 && (
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                                        {allImages.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentImageIndex(index)}
                                                className={`h-2 w-2 rounded-full transition-all ${currentImageIndex === index
                                                    ? "bg-primary w-4"
                                                    : "bg-white/60 hover:bg-white"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                                Sem Imagem
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">{product.name}</h1>
                            <p className="mt-2 text-lg text-gray-500">{product.category}</p>
                        </div>

                        <div className="text-3xl font-bold text-primary">
                            R$ {product.basePrice.toFixed(2)}
                        </div>

                        <div className="prose text-gray-600">
                            <p>{product.description}</p>
                        </div>

                        {/* Selection Controls */}
                        <div className="space-y-6 rounded-xl bg-gray-50 p-6">
                            {/* Color Selection */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">1. Escolha a Cor:</h3>
                                <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={selectedColor}
                                    onChange={(e) => handleVariantChange(e.target.value)}
                                >
                                    <option value="">Selecione uma cor...</option>
                                    {colors.map((color) => (
                                        <option key={color} value={color}>
                                            {color}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Size Selection */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">2. Escolha o Tamanho (Idade):</h3>
                                <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-400"
                                    value={selectedSize}
                                    onChange={(e) => setSelectedSize(e.target.value)}
                                    disabled={!selectedColor}
                                >
                                    <option value="">
                                        {selectedColor ? "Selecione um tamanho..." : "Selecione uma cor primeiro"}
                                    </option>
                                    {availableSizes.map((variant: any) => (
                                        <option
                                            key={variant.id}
                                            value={variant.size}
                                            disabled={variant.stockQuantity === 0}
                                        >
                                            {variant.size} {variant.stockQuantity === 0 ? "(Esgotado)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                size="lg"
                                className="w-full gap-2 text-lg md:w-auto"
                                onClick={handleAddToCart}
                                disabled={!selectedVariant || selectedVariant.stockQuantity === 0}
                            >
                                <ShoppingBag className="h-5 w-5" />
                                Adicionar ao Carrinho
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-6 w-6" />
                            Produto Adicionado!
                        </DialogTitle>
                        <DialogDescription>
                            O que você deseja fazer agora?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => {
                            setShowSuccessDialog(false);
                            router.push("/");
                        }}>
                            Continuar Comprando
                        </Button>
                        <Button onClick={() => {
                            setShowSuccessDialog(false);
                            toggleCart();
                        }}>
                            Ir para o Carrinho
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
