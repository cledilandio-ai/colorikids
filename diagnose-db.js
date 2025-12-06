const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC START ---');

    try {
        console.log('1. Checking if CashRegister model exists in client...');
        if (!prisma.cashRegister) {
            throw new Error('prisma.cashRegister is undefined. Client is not generated correctly.');
        }
        console.log('   OK.');

        console.log('2. Attempting to count existing registers...');
        const count = await prisma.cashRegister.count();
        console.log(`   OK. Found ${count} registers.`);

        console.log('3. Attempting to create a test register...');
        const testReg = await prisma.cashRegister.create({
            data: {
                initialAmount: 100,
                status: "TEST_OPEN",
                userId: "DIAGNOSTIC",
            }
        });
        console.log('   OK. Created register:', testReg.id);

        console.log('4. Cleaning up test register...');
        await prisma.cashRegister.delete({ where: { id: testReg.id } });
        console.log('   OK. Deleted.');

        console.log('--- DIAGNOSTIC SUCCESS ---');
        console.log('The database and client are working correctly in this script.');
        console.log('If the app still fails, it is likely a server caching issue or file lock.');

    } catch (error) {
        console.error('--- DIAGNOSTIC FAILED ---');
        console.error(error);
        console.error('-------------------------');
        if (error.code === 'P2021') {
            console.log("HINT: The table does not exist in the database. Run 'npx prisma db push'.");
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
