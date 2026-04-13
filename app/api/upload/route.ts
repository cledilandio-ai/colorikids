import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

/**
 * API de Upload Universal com Sharp (server-side)
 * ------------------------------------------------
 * Garante compressão em TODOS os formatos, incluindo HEIC do iPhone.
 *
 * Query params:
 *   ?type=product  → 800px, qualidade 75%, max ~300KB (grade de produtos)
 *   ?type=banner   → 1080px, qualidade 80%, max ~500KB (destaque/logo)  [padrão]
 *
 * Sharp processa: JPEG, PNG, WebP, AVIF, TIFF, GIF e HEIC (via libvips).
 */
export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // Aceita service role (produção) ou anon key (fallback)
        const supabaseKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: "Configuração do servidor incompleta." },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Lê o tipo de upload para escolher o preset de compressão
        const { searchParams } = new URL(request.url);
        const uploadType = searchParams.get("type") ?? "banner";

        // Presets de compressão
        const isProduct = uploadType === "product";
        const maxWidth  = isProduct ? 800 : 1080;
        const quality   = isProduct ? 75  : 80;
        const folder    = "public"; // sempre pasta pública

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "Nenhum arquivo recebido." }, { status: 400 });
        }

        // Verifica se é uma imagem
        if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif|jpg|jpeg|png|webp|gif|avif|tiff)$/i)) {
            return NextResponse.json({ error: "Apenas imagens são permitidas." }, { status: 400 });
        }

        const rawBuffer = Buffer.from(await file.arrayBuffer());
        const sizeBefore = (rawBuffer.length / 1024).toFixed(0);

        let outputBuffer = rawBuffer;
        let contentType  = "image/webp";

        try {
            // Sharp converte TUDO para WebP: JPEG, PNG, HEIC, AVIF, GIF, etc.
            outputBuffer = await sharp(rawBuffer)
                .resize({ width: maxWidth, withoutEnlargement: true })
                .webp({ quality })
                .toBuffer();

            const sizeAfter = (outputBuffer.length / 1024).toFixed(0);
            console.log(`✅ Sharp: ${sizeBefore}KB → ${sizeAfter}KB | ${maxWidth}px | type=${uploadType}`);
        } catch (sharpError) {
            // Fallback: sobe o arquivo original se o sharp falhar
            console.error("Sharp falhou, usando original:", sharpError);
            contentType = file.type;
        }

        // Sanitiza e monta o nome do arquivo
        const baseName = file.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/\.[^/.]+$/, ""); // remove extensão original

        const filename = `${folder}/${Date.now()}_${baseName}.webp`;

        const { error: uploadError } = await supabase.storage
            .from("uploads")
            .upload(filename, outputBuffer, {
                contentType,
                upsert: false,
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        const { data: urlData } = supabase.storage
            .from("uploads")
            .getPublicUrl(filename);

        return NextResponse.json({ success: true, url: urlData.publicUrl });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
    }
}
