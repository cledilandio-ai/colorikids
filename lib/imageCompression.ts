
import imageCompression from 'browser-image-compression';

// Formatos HEIC/HEIF do iPhone que o browser-image-compression não processa nativamente
const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

/**
 * Comprime imagens de DESTAQUE / LOGO / BANNER.
 * Configurado para: Max 1080px, Max 500KB, WebP 80%.
 * Uma foto de iPhone de 10MB vira ~150–300KB.
 */
export async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;

    // HEIC (iPhone "Alta Eficiência") — alerta pois compressão será limitada
    if (HEIC_TYPES.includes(file.type.toLowerCase())) {
        console.warn('⚠️ Arquivo HEIC detectado. Para melhores resultados, salve a foto como JPEG antes de enviar.');
    }

    const options = {
        maxSizeMB: 0.5,          // Max 500KB — reduz de 10MB para ~200KB
        maxWidthOrHeight: 1080,   // Max 1080px de largura ou altura
        useWebWorker: true,
        fileType: 'image/webp',   // Converte para WebP sempre
        initialQuality: 0.8,      // 80% de qualidade
    };

    try {
        const before = (file.size / 1024 / 1024).toFixed(2);
        const compressedFile = await imageCompression(file, options);
        const after = (compressedFile.size / 1024).toFixed(0);
        console.log(`✅ Compressão: ${before}MB → ${after}KB`);
        return compressedFile;
    } catch (error) {
        console.error("Erro ao comprimir imagem:", error);
        return file; // Fallback para o original
    }
}

/**
 * Comprime imagens de PRODUTO (catálogo/vitrine).
 * Mais agressivo: Max 800px, Max 300KB.
 * Ideal para thumbnails e grid de produtos.
 */
export async function compressProductImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;

    const options = {
        maxSizeMB: 0.3,           // Max 300KB
        maxWidthOrHeight: 800,    // Max 800px — suficiente para grid de produtos
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.75,     // 75% de qualidade
    };

    try {
        const before = (file.size / 1024 / 1024).toFixed(2);
        const compressedFile = await imageCompression(file, options);
        const after = (compressedFile.size / 1024).toFixed(0);
        console.log(`✅ Produto comprimido: ${before}MB → ${after}KB`);
        return compressedFile;
    } catch (error) {
        console.error("Erro ao comprimir imagem de produto:", error);
        return file;
    }
}
