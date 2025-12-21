import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

// Função GET: Chamada quando o frontend pede a lista de produtos (ex: busca)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        const where: any = { active: true };

        // Se houver termo de busca, filtra pelo nome
        if (search) {
            where.name = {
                contains: search,
                mode: 'insensitive' // Ignora maiúsculas/minúsculas
            };
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { variants: true },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { error: "Error fetching products" },
            { status: 500 }
        );
    }
}

// Função POST: Chamada para Criar um Novo Produto
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, basePrice, costPrice, imageUrl, variants, category, gender, supplier } = body;

        // Transação: Garante que tudo seja salvo ou nada seja salvo (em caso de erro)
        const product = await prisma.$transaction(async (tx) => {
            // 1. Cria o Produto e suas Variantes
            const newProduct = await tx.product.create({
                data: {
                    name,
                    description,
                    basePrice: parseFloat(basePrice),
                    costPrice: costPrice ? parseFloat(costPrice) : 0,
                    imageUrl: variants[0]?.imageUrl || null,
                    category,
                    gender,
                    supplier,
                    variants: {
                        create: variants.map((v: any, index: number) => ({
                            size: v.size,
                            color: v.color,
                            stockQuantity: parseInt(v.stockQuantity),
                            minStock: parseInt(v.minStock) || 1,
                            lastRestockAt: parseInt(v.stockQuantity) > 0 ? new Date() : null,
                            imageUrl: v.imageUrl,
                            // Gera SKU automático se não informado
                            sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${v.color?.substring(0, 3).toUpperCase()}-${v.size}-${Date.now().toString().slice(-4)}-${index}`,
                        })),
                    },
                },
                include: { variants: true }
            });

            // 2. Calcula o Custo Total do Estoque Inicial
            const costPerUnit = parseFloat(costPrice) || 0;
            const totalInitialStock = variants.reduce((acc: number, v: any) => acc + parseInt(v.stockQuantity), 0);
            const totalInitialCost = totalInitialStock * costPerUnit;

            // 3. Registra Transação Financeira de Saída (Compra de Estoque)
            if (totalInitialCost > 0) {
                await tx.treasuryTransaction.create({
                    data: {
                        description: `Estoque Inicial - ${name}`,
                        amount: totalInitialCost,
                        type: "OUT",
                        category: "COMPRA_PRODUTO",
                        date: new Date(),
                    }
                });
            }

            return newProduct;
        });

        // Revalidate cache to show new product immediately
        revalidatePath("/products");
        revalidatePath("/"); // Home page usually lists products

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json(
            { error: "Error creating product" },
            { status: 500 }
        );
    }
}
