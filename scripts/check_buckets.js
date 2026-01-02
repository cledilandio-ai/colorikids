
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Tentar carregar env do root
try {
    const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.local')));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log("No .env.local found, checking process env");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error);
    } else {
        console.log("Buckets:", data.map(b => b.name));

        // Se existir 'uploads', listar pastas raiz
        if (data.find(b => b.name === 'uploads')) {
            console.log("\nListing root of 'uploads' bucket:");
            const { data: files } = await supabase.storage.from('uploads').list();
            console.log(files.map(f => f.name));
        }
    }
}

listBuckets();
