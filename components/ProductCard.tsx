import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Product } from "@prisma/client";

interface ProductCardProps {
    product: Partial<Product> & {
        variants?: { size: string; price?: number }[];
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
            <div className="p-4">
                <Link href={`/products/${product.id}`}>
                    <h3 className="cursor-pointer text-lg font-semibold text-gray-800 hover:text-primary">{product.name}</h3>
                </Link>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {product.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                        R$ {product.basePrice?.toFixed(2)}
                    </span>
                    <Link href={`/products/${product.id}`}>
                        <Button size="sm" className="bg-secondary hover:bg-secondary/90">
                            Ver Detalhes
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
