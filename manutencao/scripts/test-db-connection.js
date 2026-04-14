const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Função simples para carregar .env
function loadEnv(filePath) {
    if (fs.existsSync(filePath)) {
        console.log(`Carregando variáveis de ${filePath}...`);
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}

// Tenta carregar .env.local e depois .env
loadEnv(path.join(__dirname, '..', '.env.local'));
loadEnv(path.join(__dirname, '..', '.env'));

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log("Iniciando teste de conexão com o banco de dados...");
    console.log(`DATABASE_URL configurada: ${process.env.DATABASE_URL ? "SIM (Oculta)" : "NÃO"}`);

    if (!process.env.DATABASE_URL) {
        console.error("ERRO: DATABASE_URL não encontrada nas variáveis de ambiente.");
        process.exit(1);
    }

    try {
        console.time("Conexão");
        // Tenta uma query leve
        const count = await prisma.treasuryTransaction.count();
        console.timeEnd("Conexão");
        console.log(`Conexão BEM SUCEDIDA! Encontradas ${count} transações.`);
    } catch (e) {
        console.error("FALHA NA CONEXÃO:");
        console.error(e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
