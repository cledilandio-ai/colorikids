
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Load .env
try {
    const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env')));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.error("Error loading .env file:", e.message);
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseKey && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const key = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log(`Using key: ${key ? key.substring(0, 5) + '...' : 'None'}`);

const supabase = createClient(supabaseUrl, key);


const BUCKET = 'uploads';
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_FILES = 50; // Process only a few for safety first

async function listAllFiles(bucket, folder = '') {
    let allFiles = [];
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) throw error;

    for (const file of data) {
        if (file.name === '.emptyFolderPlaceholder') continue;

        // If it's a folder (no id, has metadata usually null or obscure, need to check implied type by list)
        // actually Supabase storage list returns objects with `id` for files, null for folders? 
        // Let's assume everything with an ID is a file.
        if (file.id) {
            allFiles.push({ ...file, path: folder ? `${folder}/${file.name}` : file.name });
        } else {
            // likely a folder, recurse (Supabase storage folders are virtual sometimes, need care)
            // For now, let's assume flat or one level 'private'
            const subFiles = await listAllFiles(bucket, folder ? `${folder}/${file.name}` : file.name);
            allFiles = allFiles.concat(subFiles);
        }
    }
    return allFiles;
}

async function optimizeImage(file) {
    console.log(`\nProcessing: ${file.path} (${(file.metadata.size / 1024 / 1024).toFixed(2)} MB)`);

    // 1. Download
    const { data: blob, error: downError } = await supabase.storage.from(BUCKET).download(file.path);
    if (downError) {
        console.error(`Error downloading ${file.path}:`, downError);
        return;
    }

    const buffer = await blob.arrayBuffer();

    // 2. Optimize
    try {
        const optimizedBuffer = await sharp(buffer)
            .resize({ width: 1080, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const originalSize = buffer.byteLength;
        const newSize = optimizedBuffer.byteLength;
        const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

        console.log(`Original: ${(originalSize / 1024).toFixed(1)} KB -> Optimized: ${(newSize / 1024).toFixed(1)} KB (-${reduction}%)`);

        if (newSize >= originalSize) {
            console.log("Optimization didn't reduce size significantly. Skipping upload.");
            return;
        }

        if (DRY_RUN) {
            console.log("DRY RUN: Upload skipped.");
            return;
        }

        // 3. Upload (Overwrite)
        // Keep same path, force contentType webp (browsers can handle webp content in .jpg extension, but better to be clean if possible. 
        // User asked to KEEP PATH/NAME to avoid breaking DB links. So we upload webp bytes to 'file.jpg'. Modern browsers sniff content-type.)
        const { error: upError } = await supabase.storage
            .from(BUCKET)
            .upload(file.path, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (upError) {
            console.error(`Error uploading ${file.path}:`, upError);
        } else {
            console.log(`Successfully updated ${file.path}`);
        }

    } catch (optError) {
        console.error(`Error optimizing ${file.path}:`, optError);
    }
}

async function main() {
    console.log(`Checking bucket: ${BUCKET}...`);
    try {
        const files = await listAllFiles(BUCKET);
        console.log(`Found ${files.length} files.`);

        const heavyFiles = files.filter(f => f.metadata.size > 200 * 1024); // > 200KB
        console.log(`Found ${heavyFiles.length} files larger than 200KB.`);

        const toProcess = heavyFiles.slice(0, MAX_FILES);

        for (const file of toProcess) {
            await optimizeImage(file);
        }

        if (heavyFiles.length > MAX_FILES) {
            console.log(`\n... and ${heavyFiles.length - MAX_FILES} more files waiting. remove MAX_FILES limit to process all.`);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}

main();
