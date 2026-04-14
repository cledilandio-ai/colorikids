/**
 * SCRIPT: Criar usuário SUPER_ADMIN
 * ----------------------------------
 * Rode UMA VEZ para criar seu acesso de super admin.
 *
 * COMO USAR:
 *   node scripts/create-super-admin.js
 *
 * Altere as variáveis abaixo antes de rodar.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── CONFIGURE AQUI ───────────────────────────────────────────────────────────
const SUPER_ADMIN_NAME = "Cledilandio (Admin)";
const SUPER_ADMIN_EMAIL = "admin@cledilandio.com";
const SUPER_ADMIN_PASS = "Cle882142#"; // Troque antes de rodar!
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
    const existing = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

    if (existing) {
        console.log(`⚠️  Usuário já existe: ${SUPER_ADMIN_EMAIL}`);
        if (existing.role !== "SUPER_ADMIN") {
            await prisma.user.update({
                where: { email: SUPER_ADMIN_EMAIL },
                data: { role: "SUPER_ADMIN", storeId: null }
            });
            console.log("✅ Role atualizado para SUPER_ADMIN.");
        } else {
            console.log("✅ Já é SUPER_ADMIN. Nada a fazer.");
        }
        return;
    }

    const hashed = await bcrypt.hash(SUPER_ADMIN_PASS, 12);

    await prisma.user.create({
        data: {
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            password: hashed,
            role: "SUPER_ADMIN",
            storeId: null, // SUPER_ADMIN não pertence a nenhuma loja
        }
    });

    console.log(`✅ Super Admin criado com sucesso!`);
    console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Acesso: /super-admin`);
    console.log(`\n🔒 IMPORTANTE: Delete este script após o primeiro uso ou remova a senha hardcoded.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
