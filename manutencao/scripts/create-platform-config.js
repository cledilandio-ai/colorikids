const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('Criando tabela PlatformConfig...');

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PlatformConfig" (
            "id"                 INTEGER PRIMARY KEY DEFAULT 1,
            "heroTitle"          TEXT NOT NULL DEFAULT 'Bem-vindo à nossa plataforma',
            "heroSubtitle"       TEXT NOT NULL DEFAULT 'Gerencie sua loja com facilidade.',
            "ctaText"            TEXT NOT NULL DEFAULT 'Acessar meu Painel',
            "ctaLink"            TEXT NOT NULL DEFAULT '/login',
            "logoUrl"            TEXT,
            "backgroundImageUrl" TEXT,
            "primaryColor"       TEXT NOT NULL DEFAULT '#e91e8c',
            "accentColor"        TEXT NOT NULL DEFAULT '#9c27b0',
            "platformName"       TEXT NOT NULL DEFAULT 'Vast Cosmos',
            "contactEmail"       TEXT,
            "socialLinks"        TEXT NOT NULL DEFAULT '{}',
            "footerText"         TEXT,
            "showActiveStores"   BOOLEAN NOT NULL DEFAULT true,
            "updatedAt"          TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `);
    console.log('Tabela PlatformConfig criada (ou ja existia).');

    await prisma.$executeRawUnsafe(`
        INSERT INTO "PlatformConfig" ("id", "updatedAt")
        VALUES (1, NOW())
        ON CONFLICT ("id") DO NOTHING;
    `);
    console.log('Registro singleton garantido (id=1).');

    console.log('Banco atualizado com sucesso!');
}

main()
    .catch(err => {
        console.error('Erro:', err.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
