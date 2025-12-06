
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let output = `Querying data for today: ${todayStart} to ${todayEnd}\n\n`;

    const registers = await prisma.cashRegister.findMany({
        where: {
            OR: [
                { openedAt: { gte: todayStart, lte: todayEnd } },
                { closedAt: { gte: todayStart, lte: todayEnd } },
                { status: "OPEN" }
            ]
        },
        include: { orders: true }
    });

    output += `Found ${registers.length} registers active today:\n`;
    registers.forEach(r => {
        const regSales = r.orders.reduce((acc, o) => acc + o.total, 0);
        output += `Register ID: ${r.id}, Status: ${r.status}, Opened: ${r.openedAt}, Initial: ${r.initialAmount}, Sales: ${regSales}\n`;
    });

    const orders = await prisma.order.findMany({
        where: {
            createdAt: {
                gte: todayStart,
                lte: todayEnd
            },
            status: "COMPLETED"
        }
    });

    output += `\nTotal Orders Today (All): ${orders.length}\n`;
    let total = 0;
    orders.forEach(o => {
        total += o.total;
    });
    output += `Calculated Total Sales Today: ${total}\n`;

    fs.writeFileSync('debug_sales.txt', output);
    console.log("Debug output written to debug_sales.txt");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
