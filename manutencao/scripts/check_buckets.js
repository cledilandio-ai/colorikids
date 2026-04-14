
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Tentar carregar env do root (.env.local ou .env)
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

try {
    let envConfig;
    if (fs.existsSync(envLocalPath)) {
        envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    } else if (fs.existsSync(envPath)) {
        envConfig = dotenv.parse(fs.readFileSync(envPath));
    } else {
        console.log("No .env or .env.local found");
    }

    if (envConfig) {
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
} catch (e) {
    console.log("Error loading env files", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials (URL or KEY) in .env/.env.local");
    process.exit(1);
}

console.log(`Using key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY'}`);

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
