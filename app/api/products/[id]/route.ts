import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                variants: {
                    where: { active: true },
                    orderBy: { id: 'asc' }
                }
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Error fetching product" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { name, description, basePrice, costPrice, imageUrl, variants, category, gender, financialRecord, supplier } = body;


        // 1. Separate incoming variants into Create vs Update
        const variantsToUpdate = variants.filter((v: any) => v.id);
        const variantsToCreate = variants.filter((v: any) => !v.id);
        const incomingIds = variantsToUpdate.map((v: any) => v.id);

        // 2. Identify variants to delete (In DB but not in incoming list)
        const currentDbVariants = await prisma.productVariant.findMany({
            where: { productId: id },
            select: { id: true }
        });
        const dbIds = currentDbVariants.map(v => v.id);
        const idsToDelete = dbIds.filter(dbId => !incomingIds.includes(dbId));

        // 2.5 Filter out variants that cannot be deleted due to FK constraints (StockMovement, InventoryLog)
        // This prevents the "Foreign key constraint violated" error.
        // Doing this check *outside* the transaction or before the delete command.
        // Since we are inside a transaction block below, doing async checks here is fine.
        // We will perform a check to see which of `idsToDelete` have related records.
        const variantsWithHistory = await prisma.productVariant.findMany({
            where: {
                id: { in: idsToDelete },
                OR: [
                    { stockMovements: { some: {} } },
                    { inventoryLogs: { some: {} } }
                ]
            },
            select: { id: true }
        });
        const idsWithHistory = variantsWithHistory.map(v => v.id);
        const safeToDeleteIds = idsToDelete.filter(id => !idsWithHistory.includes(id));

        // Ensure "deleted" variants with history are effectively "kept" but maybe zeroed out? 
        // If we don't delete them, they remain linked to the product.
        // The user will see them again.
        // For now, preventing the crash is priority.


        // Transaction to update product and process variants
        await prisma.$transaction(async (tx) => {
            // Update product details
            await tx.product.update({
                where: { id },
                data: {
                    name,
                    description,
                    basePrice: parseFloat(basePrice) || 0,
                    costPrice: parseFloat(costPrice) || 0,
                    imageUrl,
                    category,
                    gender,
                    supplier,
                },
            });

            // 3. Delete removed variants (Soft Delete + Image Cleanup)
            if (idsToDelete.length > 0) {
                // Fetch variants to be deleted to get their images
                const variantsToRemove = await tx.productVariant.findMany({
                    where: { id: { in: idsToDelete } }
                });

                // Soft Delete
                await tx.productVariant.updateMany({
                    where: { id: { in: idsToDelete } },
                    data: { active: false }
                });

                // Delete images side-effect (after transaction or parallel? ideally after, but here is fine to trigger)
                // We don't await this inside the transaction to avoid slowing it down too much, 
                // OR we do it. Since it's file deletion, it's external.
                // We'll trigger it without awaiting strictly or await it if we want to ensure it happens.
                // Given Vercel functions, better to await or use Promise.allSettled

                // We can't use `tx` for this, it's external.
                // We will collect urls and delete them AFTER the transaction or inside if we don't mind the wait.
                if (supabaseServiceKey) {
                    const cleanupPromises = variantsToRemove
                        .filter(v => v.imageUrl)
                        .map(v => deleteImageFromSupabase(v.imageUrl));

                    // We attach this promise to the end but don't block the logic heavily if possible.
                    // But Next.js usage usually waits.
                    await Promise.allSettled(cleanupPromises);
                }
            }


            // 4. Update existing variants (Parallel execution for performance)
            if (variantsToUpdate.length > 0) {
                await Promise.all(variantsToUpdate.map((v: any) =>
                    tx.productVariant.update({
                        where: { id: v.id },
                        data: {
                            size: v.size,
                            color: v.color,
                            stockQuantity: parseInt(v.stockQuantity) || 0,
                            minStock: parseInt(v.minStock) || 1,
                            imageUrl: v.imageUrl,
                            sku: v.sku || null, // Ensure null if empty string to avoid unique constraint on empty strings if applicable
                        }
                    })
                ));
            }

            // 5. Create new variants
            if (variantsToCreate.length > 0) {
                await tx.productVariant.createMany({
                    data: variantsToCreate.map((v: any) => ({
                        productId: id,
                        size: v.size,
                        color: v.color,
                        stockQuantity: parseInt(v.stockQuantity) || 0,
                        minStock: parseInt(v.minStock) || 1,
                        lastRestockAt: parseInt(v.stockQuantity) > 0 ? new Date() : null,
                        imageUrl: v.imageUrl,
                        sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${(v.color || "VAR").substring(0, 3).toUpperCase()}-${v.size}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
                    }))
                });
            }
        }, {
            maxWait: 10000,
            timeout: 20000
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating product:", error);
        return NextResponse.json(
            { error: `Error updating product: ${error.message}` },
            { status: 500 }
        );
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper to delete image from Supabase
async function deleteImageFromSupabase(imageUrl: string | null) {
    if (!imageUrl || !supabaseServiceKey) return;

    try {
        // Extract path from URL
        // Example: https://.../storage/v1/object/public/uploads/filename.jpg
        const path = imageUrl.split("/uploads/")[1];
        if (!path) return;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { error } = await supabaseAdmin
            .storage
            .from("uploads")
            .remove([path]);

        if (error) {
            console.error("Error deleting image from Supabase:", error);
        } else {
            console.log("Image deleted successfully:", path);
        }
    } catch (error) {
        console.error("Exception deleting image:", error);
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // 1. Fetch Key to delete images
        const product = await prisma.product.findUnique({
            where: { id },
            include: { variants: true }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // 2. Soft Delete (Archive) Product
        await prisma.product.update({
            where: { id },
            data: { active: false }
        });

        // 3. Delete images from storage (Background task effectively)
        // We delete images for ALL variants since the product is archived.
        // Optional: Do we want to keep images if we un-archive? 
        // User requested: "aproveite ao arquivar apagar a foto para liberar espaç no db"
        // So yes, delete images.
        if (supabaseServiceKey) {
            const imagePromises = product.variants
                .filter(v => v.imageUrl)
                .map(v => deleteImageFromSupabase(v.imageUrl));

            await Promise.allSettled(imagePromises);
        } else {
            console.warn("Skipping image deletion: SUPABASE_SERVICE_ROLE_KEY is missing.");
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error archiving product:", error);
        return NextResponse.json(
            { error: `Erro ao arquivar produto: ${error.message || "Erro desconhecido"}` },
            { status: 500 }
        );
    }
}
