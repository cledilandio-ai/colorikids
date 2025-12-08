import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Product } from "@prisma/client";

interface ProductCardProps {
    product: Partial<Product> & {
        variants?: { size: string; price?: number; imageUrl?: string }[];
    };
}

import Link from "next/link";

export function ProductCard({ product }: ProductCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
            <Link href={`/products/${product.id}`}>
                <div className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer">
                    {(product.imageUrl || (product.variants && product.variants.length > 0 && (product.variants as any)[0].imageUrl)) ? (
                        <Image
                            src={product.imageUrl || product.variants?.[0]?.imageUrl || ""}
                            alt={product.name || "Product"}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                            No Image
                        </div>
                    )}
                </div>
            </Link>
            <div className="p-3">
                <Link href={`/products/${product.id}`}>
                    <h3 className="cursor-pointer text-sm font-semibold text-gray-800 hover:text-primary truncate">{product.name}</h3>
                </Link>
                <p className="mt-1 text-xs text-gray-500 line-clamp-1 h-4 overflow-hidden">
                    {product.description}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                        R$ {product.basePrice?.toFixed(2)}
                    </span>
                    <Link href={`/products/${product.id}`} className="w-full max-w-[80px]">
                        <Button size="sm" className="h-7 w-full text-xs px-2 bg-secondary hover:bg-secondary/90">
                            Detalhes
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
