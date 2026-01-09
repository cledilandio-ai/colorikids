import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// Supabase client will be initialized inside the handler to allow build without env vars
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
// const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase configuration");
            // If env vars are missing, we return a server error, but build succeeds
            return NextResponse.json(
                { error: "Server configuration error: Missing Supabase credentials." },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file received." },
                { status: 400 }
            );
        }

        let buffer = Buffer.from(await file.arrayBuffer());
        let contentType = file.type;

        // Otimização com Sharp (apenas se for imagem)
        if (file.type.startsWith("image/")) {
            try {
                // Redimensionar e converter para WebP
                buffer = await sharp(buffer)
                    .resize({ width: 1080, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                contentType = "image/webp";
            } catch (sharpError) {
                console.warn("Falha na otimização com Sharp, usando arquivo original:", sharpError);
                // Continua com o buffer original em caso de erro no sharp
            }
        }

        // Adiciona prefixo 'private/'
        let filename = "private/" + Date.now() + "_" + file.name.replaceAll(" ", "_");

        // Ajustar extensão se virou webp
        if (contentType === "image/webp" && !filename.endsWith(".webp")) {
            filename = filename.replace(/\.[^/.]+$/, "") + ".webp";
        }

        // Upload para o Supabase Storage
        const { data, error } = await supabase.storage
            .from("uploads")
            .upload(filename, buffer, {
                contentType: contentType,
                upsert: false
            });

        if (error) {
            console.error("Erro detalhado do Supabase Storage:", JSON.stringify(error, null, 2));
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from("uploads")
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Error uploading file" },
            { status: 500 }
        );
    }
}
