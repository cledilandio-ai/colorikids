/**
 * Helper de upload via servidor (/api/upload).
 * 
 * Garante compressão server-side com Sharp em TODOS os formatos,
 * incluindo HEIC do iPhone. Nenhum arquivo "cru" chega ao Supabase.
 * 
 * @param file   - File object do input
 * @param type   - "product" (800px/300KB) | "banner" (1080px/500KB)
 * @returns      - URL pública do arquivo no Supabase
 */
export async function uploadImage(file: File, type: "product" | "banner" = "banner"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/upload?type=${type}`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erro no upload (${response.status})`);
    }

    const data = await response.json();
    if (!data.url) throw new Error("URL não retornada pelo servidor.");
    return data.url;
}
