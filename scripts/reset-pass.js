const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function resetPassword() {
    console.log("Forçando reset de senha do Super Admin...");
    
    // Nova senha temporária
    const plainText = "123456";
    const hashed = await bcrypt.hash(plainText, 12);
    
    const user = await prisma.user.update({
        where: { email: "admin@seudominio.com" },
        data: { password: hashed }
    });
    
    console.log("✅ Senha alterada com sucesso no banco de dados.");
    
    // Teste de verificação imediato
    const match = await bcrypt.compare(plainText, user.password);
    console.log(`Teste de validação bcrypt local: ${match ? "PASSOU ✨" : "FALHOU ❌"}`);
    
    console.log("\n🔑 Suas novas credenciais são:");
    console.log("Email: admin@seudominio.com");
    console.log("Senha: 123456");
}

resetPassword()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
