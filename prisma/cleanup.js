const fs = require('fs');
const path = require('path');

// Load environment variables from .env
// Load environment variables from .env and .env.local
['.env', '.env.local'].forEach(file => {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^"(.*)"$/, '$1'); // Remove quotes
                process.env[key] = value;
            }
        });
    }
});

// Fallback logic
if (!process.env.DATABASE_URL_POOLER) {
    if (process.env.DATABASE_URL) {
        console.log('DATABASE_URL_POOLER not found, using DATABASE_URL');
        process.env.DATABASE_URL_POOLER = process.env.DATABASE_URL;
    } else if (process.env.POSTGRES_PRISMA_URL) {
        console.log('DATABASE_URL_POOLER not found, using POSTGRES_PRISMA_URL');
        process.env.DATABASE_URL_POOLER = process.env.POSTGRES_PRISMA_URL;
    } else if (process.env.POSTGRES_URL_NON_POOLING) {
        console.log('DATABASE_URL_POOLER not found, using POSTGRES_URL_NON_POOLING');
        process.env.DATABASE_URL_POOLER = process.env.POSTGRES_URL_NON_POOLING;
    } else if (process.env.POSTGRES_URL) {
        console.log('DATABASE_URL_POOLER not found, using POSTGRES_URL');
        process.env.DATABASE_URL_POOLER = process.env.POSTGRES_URL;
    }
}

const { PrismaClient } = require('@prisma/client');

console.log('Available URL env vars:', Object.keys(process.env).filter(k => k.includes('URL')));
if (process.env.DATABASE_URL_POOLER) console.log('DATABASE_URL_POOLER length:', process.env.DATABASE_URL_POOLER.length);
else console.log('DATABASE_URL_POOLER is missing');

const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('Erro: Nenhuma variável de conexão com o banco de dados encontrada (.env).');
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: connectionString
        }
    }
});

async function main() {
    console.log('Iniciando limpeza do banco de dados...');

    // Ordem de exclusão para respeitar Foreign Keys

    // 1. Financeiro e Pagamentos
    console.log('Deletando Pagamentos...');
    await prisma.payment.deleteMany({});

    console.log('Deletando Contas a Receber...');
    await prisma.accountReceivable.deleteMany({});

    console.log('Deletando Transações de Tesouraria...');
    await prisma.treasuryTransaction.deleteMany({});

    // 2. Estoque e Inventário
    console.log('Deletando Logs de Inventário...');
    await prisma.inventoryLog.deleteMany({});

    console.log('Deletando Movimentações de Estoque...');
    await prisma.stockMovement.deleteMany({});

    // 3. Pedidos (Remove dependências de Customer e CashRegister)
    console.log('Deletando Pedidos...');
    await prisma.order.deleteMany({});

    // 4. Caixas
    console.log('Deletando Registros de Caixa...');
    await prisma.cashRegister.deleteMany({});

    // 5. Clientes
    console.log('Deletando Clientes...');
    await prisma.customer.deleteMany({});

    // 6. Produtos
    console.log('Deletando Variantes de Produtos...');
    await prisma.productVariant.deleteMany({});

    console.log('Deletando Produtos...');
    await prisma.product.deleteMany({});

    console.log('Limpeza concluída com sucesso!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('Erro durante a limpeza:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
