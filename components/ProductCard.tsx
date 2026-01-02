import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Product } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCardProps {
    product: Partial<Product> & {
        variants?: { size: string; price?: number; imageUrl?: string | null }[];
    };
}

export function ProductCard({ product }: ProductCardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Collect all unique images: Main Product Image + Variant Images
    const allImages = [
        product.imageUrl,
        ...(product.variants?.map(v => v.imageUrl) || [])
    ].filter((img): img is string => !!img && img !== "")
        .filter((value, index, self) => self.indexOf(value) === index); // Unique

    const displayImage = allImages.length > 0 ? allImages[currentImageIndex] : "";
    const hasMultipleImages = allImages.length > 1;

    const [isHovered, setIsHovered] = useState(false);

    // Auto-cycle images
    useEffect(() => {
        if (!hasMultipleImages || isHovered) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [hasMultipleImages, isHovered, allImages.length]);

    const nextImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    return (
        <div
            className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Link href={`/products/${product.id}`} className="block w-full h-full">
                    {displayImage ? (

                        <Image
                            src={displayImage}
                            alt={product.name || "Product"}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            loading="lazy"
                            className="object-cover transition-transform group-hover:scale-105"
                        />

                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                            No Image
                        </div>
                    )}
                </Link>

                {/* Navigation Arrows (Visible on Hover/Touch if multiple images) */}
                {hasMultipleImages && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-gray-800 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-gray-800 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                            aria-label="Next image"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        {/* Dots Indicator */}
                        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {allImages.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 w-1.5 rounded-full ${idx === currentImageIndex ? 'bg-primary' : 'bg-white/60'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="p-3">
                <Link href={`/products/${product.id}`}>
                    <h3 className="cursor-pointer text-sm font-semibold text-gray-800 hover:text-primary truncate" title={product.name}>{product.name}</h3>
                </Link>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2 h-8 overflow-hidden">
                    {product.description}
                </p>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-base sm:text-sm font-bold text-primary whitespace-nowrap">
                        R$ {product.basePrice?.toFixed(2)}
                    </span>
                    <Link href={`/products/${product.id}`} className="w-full sm:w-auto sm:max-w-[80px]">
                        <Button size="sm" className="h-9 w-full text-sm px-3 bg-secondary hover:bg-secondary/90 shadow-sm active:scale-95 transition-transform">
                            Comprar
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
