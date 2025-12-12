
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');

console.log("Iniciando script de Deploy do Banco de Dados...");

try {
    if (!fs.existsSync(envPath)) {
        console.error("Arquivo .env.local não encontrado!");
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');

    // Encontrar DATABASE_URL
    const match = envContent.match(/DATABASE_URL=(.*)/);

    if (match) {
        let url = match[1].trim();
        // Remover aspas se houver
        if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
            url = url.slice(1, -1);
        }

        console.log("String de conexão encontrada.");

        // Substituir porta 6543 (Transaction Pooler) por 5432 (Session/Direct)
        if (url.includes(':6543')) {
            console.log("🔄 Detectada conexão via Pooler (6543). Alternando para Conexão Direta (5432) para permitir a atualização...");
            url = url.replace(':6543', ':5432');
        } else {
            console.log("ℹ️ Porta 6543 não detectada na URL. Tentando executar mesmo assim...");
        }

        // Executar prisma db push com a nova URL
        console.log("🚀 Executando 'prisma db push'...");

        // Definir variável de ambiente para este processo
        const env = { ...process.env, DATABASE_URL: url };

        try {
            execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: env });
            console.log("✅ Banco de dados sincronizado com sucesso!");
        } catch (err) {
            console.error("❌ Falha na execução do prisma db push.");
            // Não imprimir o erro bruto se contiver a URL com senha, mas stdio inherit já mostra o output do prisma
            process.exit(1);
        }

    } else {
        console.error("❌ DATABASE_URL não encontrada dentro do .env.local");
        process.exit(1);
    }

} catch (e) {
    console.error("Erro inesperado:", e.message);
    process.exit(1);
}
