/**
 * SCRIPT: Adicionar colunas platformInstagram e platformWhatsapp à tabela PlatformConfig
 * Execute: node scripts/add-platform-socials.js
 *
 * Usa @supabase/supabase-js (já instalado) para executar SQL via rpc/query.
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Usa a service_role key se disponível, ou fallback para anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou chave não encontrada no .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(sql, label) {
    const { error } = await supabase.rpc("exec_sql", { sql });
    if (error) {
        // Tenta via from/select se rpc não estiver disponível
        console.warn(`⚠️  rpc não disponível para "${label}". Erro: ${error.message}`);
        return false;
    }
    console.log(`✅ ${label}`);
    return true;
}

async function main() {
    console.log("🔌 Conectando ao Supabase...");

    // Testa a conexão
    const { data, error: testError } = await supabase
        .from("PlatformConfig")
        .select("id")
        .limit(1);

    if (testError) {
        console.error("❌ Erro ao conectar:", testError.message);
        process.exit(1);
    }

    console.log("✅ Conexão OK. Verificando colunas...");

    // Verifica se as colunas já existem
    const { data: cols, error: colErr } = await supabase
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_name", "PlatformConfig")
        .in("column_name", ["platformInstagram", "platformWhatsapp"]);

    if (colErr) {
        console.warn("⚠️  Não foi possível verificar colunas existentes, prosseguindo...");
    } else {
        const existing = (cols || []).map(c => c.column_name);
        console.log("Colunas já existentes:", existing.length > 0 ? existing.join(", ") : "nenhuma das novas");
        if (existing.includes("platformInstagram") && existing.includes("platformWhatsapp")) {
            console.log("✅ Ambas as colunas já existem. Nada a fazer.");
            return;
        }
    }

    // Tenta via SQL direto usando exec_sql RPC
    const ok1 = await runSQL(
        `ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "platformInstagram" TEXT;`,
        "platformInstagram adicionada"
    );
    const ok2 = await runSQL(
        `ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "platformWhatsapp" TEXT;`,
        "platformWhatsapp adicionada"
    );

    if (!ok1 || !ok2) {
        console.log("\n⚠️  O método RPC não está disponível neste projeto.");
        console.log("👉 Execute manualmente no Supabase SQL Editor:");
        console.log(`
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "platformInstagram" TEXT;
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "platformWhatsapp" TEXT;
        `);
    } else {
        console.log("\n🎉 Migração concluída! Rode: npx prisma generate");
    }
}

main().catch((err) => {
    console.error("❌ Erro inesperado:", err.message);
    process.exit(1);
});
