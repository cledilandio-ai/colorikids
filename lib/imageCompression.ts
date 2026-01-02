
import imageCompression from 'browser-image-compression';

/**
 * Comprime uma imagem antes do upload.
 * Configurado para: Max 1080px (largura ou altura), Max 1MB, WebP.
 */
export async function compressImage(file: File): Promise<File> {
    // Se não for imagem, retorna original
    if (!file.type.startsWith('image/')) return file;

    const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1080, // Resize to max 1080px
        useWebWorker: true,
        fileType: 'image/webp', // Convert to WebP
        initialQuality: 0.8, // 80% quality
    };

    try {
        console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        // Criar um novo arquivo com a extensão correta se mudou para webp
        // O Supabase storage prefere que a extensão bata com o mime type, embora não quebre se não bater.
        // Mas a gente definiu 'image/webp' nas options.
        // Vamos garantir que o nome do arquivo tenha .webp se o output for webp
        /* 
           Nota: browser-image-compression retorna um Blob/File. Se o type for image/webp, 
           mas o nome original for .jpg, seria bom mudar para .webp, mas isso muda a URL pública.
           O plano original do user pedia para MANTER O NOME/PATH. 
           Porém, isso era pro LEGADO. Para NOVOS uploads, podemos usar .webp no nome.
           Vamos manter o nome limpo.
        */

        return compressedFile;
    } catch (error) {
        console.error("Error compressing image:", error);
        return file; // Fallback to original if compression fails
    }
}
