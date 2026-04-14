const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando limpeza de dados transacionais...');

    // 1. Apagar Contas a Receber (Depende de Order e Customer)
    const receivables = await prisma.accountReceivable.deleteMany({});
    console.log(`Apagados ${receivables.count} registros de Contas a Receber.`);

    // 2. Apagar Pagamentos (Depende de Order)
    const payments = await prisma.payment.deleteMany({});
    console.log(`Apagados ${payments.count} registros de Pagamentos.`);

    // 3. Apagar Logs de Inventário (Depende de ProductVariant)
    const inventoryLogs = await prisma.inventoryLog.deleteMany({});
    console.log(`Apagados ${inventoryLogs.count} registros de Logs de Inventário.`);

    // 4. Apagar Movimentações de Estoque (Depende de ProductVariant)
    const stockMovements = await prisma.stockMovement.deleteMany({});
    console.log(`Apagados ${stockMovements.count} registros de Movimentações de Estoque.`);

    // 5. Apagar Itens de Pedido (Se houvesse tabela separada, mas aqui é JSON no Order)
    // Apagar Pedidos (Depende de CashRegister e Customer - opcional, mas Foreign Key pode reclamar se não cuidar da ordem inversa se a relação fosse obrigatória. Aqui Order tem Fks opcionais)
    const orders = await prisma.order.deleteMany({});
    console.log(`Apagados ${orders.count} registros de Pedidos.`);

    // 6. Apagar Caixas (Depende de Usuário - opcional)
    // Precisa apagar pedidos antes de apagar caixas se houver restrição, mas Order.cashRegisterId é opcional.
    // Porém se houver update/delete cascade...
    const cashRegisters = await prisma.cashRegister.deleteMany({});
    console.log(`Apagados ${cashRegisters.count} registros de Caixas.`);

    // 7. Apagar Transações de Tesouraria
    const treasury = await prisma.treasuryTransaction.deleteMany({});
    console.log(`Apagados ${treasury.count} registros de Tesouraria.`);

    // 8. Apagar Variantes de Produto (Depende de Product)
    const variants = await prisma.productVariant.deleteMany({});
    console.log(`Apagados ${variants.count} registros de Variantes.`);

    // 9. Apagar Produtos
    const products = await prisma.product.deleteMany({});
    console.log(`Apagados ${products.count} registros de Produtos.`);

    // 10. Apagar Clientes
    const customers = await prisma.customer.deleteMany({});
    console.log(`Apagados ${customers.count} registros de Clientes.`);

    console.log('-----------------------------------');
    console.log('Limpeza TOTAL concluída com sucesso!');
    console.log('Dados MANTIDOS APENAS: Usuários e Configurações.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
