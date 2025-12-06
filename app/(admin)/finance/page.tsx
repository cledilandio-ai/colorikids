import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloseRegisterButton } from "@/components/admin/CloseRegisterButton";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    const registers = await prisma.cashRegister.findMany({
        orderBy: { createdAt: "desc" },
        include: { orders: true },
    });

    // Calculate Today's Sales based on Registers active today
    // This avoids counting "orphaned" orders (e.g. from testing) that aren't linked to a register
    const todayStr = new Date().toDateString();
    const activeRegistersSales = registers
        .filter(r => {
            const isOpen = r.status === "OPEN";
            const openedToday = new Date(r.openedAt).toDateString() === todayStr;
            const closedToday = r.closedAt && new Date(r.closedAt).toDateString() === todayStr;
            return isOpen || openedToday || closedToday;
        })
        .reduce((acc, r) => acc + r.orders.reduce((oAcc, o) => oAcc + o.total, 0), 0);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Financeiro (Caixa)</h1>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Caixas Abertos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {registers.filter((r) => r.status === "OPEN").length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas Hoje (Caixas)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            R$ {activeRegistersSales.toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Soma dos caixas abertos ou fechados hoje
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border bg-white shadow-sm">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">Histórico de Caixas</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Abertura</th>
                                <th className="px-6 py-4 font-medium">Fechamento</th>
                                <th className="px-6 py-4 font-medium">Inicial</th>
                                <th className="px-6 py-4 font-medium">Vendas</th>
                                <th className="px-6 py-4 font-medium">Total Esperado</th>
                                <th className="px-6 py-4 font-medium">Total Final</th>
                                <th className="px-6 py-4 font-medium">Diferença</th>
                                <th className="px-6 py-4 font-medium">Usuário</th>
                                <th className="px-6 py-4 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {registers.map((register) => {
                                const totalSales = register.orders.reduce((acc, order) => acc + order.total, 0);
                                const expectedTotal = register.initialAmount + totalSales;
                                const difference = register.finalAmount ? register.finalAmount - expectedTotal : 0;

                                // Breakdown by payment method
                                const salesByMethod = register.orders.reduce((acc: any, order) => {
                                    const method = order.paymentMethod || "OUTROS";
                                    acc[method] = (acc[method] || 0) + order.total;
                                    return acc;
                                }, {});

                                return (
                                    <tr key={register.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <Badge variant={register.status === "OPEN" ? "default" : "secondary"}>
                                                {register.status === "OPEN" ? "ABERTO" : "FECHADO"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {format(new Date(register.openedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {register.closedAt
                                                ? format(new Date(register.closedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            R$ {register.initialAmount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="font-bold">R$ {totalSales.toFixed(2)}</div>
                                            <div className="text-xs text-gray-500 mt-1 space-y-1">
                                                {salesByMethod["DINHEIRO"] && (
                                                    <div className="flex justify-between gap-2">
                                                        <span>Dinheiro:</span>
                                                        <span>R$ {salesByMethod["DINHEIRO"].toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {salesByMethod["CARTAO"] && (
                                                    <div className="flex justify-between gap-2">
                                                        <span>Cartão:</span>
                                                        <span>R$ {salesByMethod["CARTAO"].toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {salesByMethod["PIX"] && (
                                                    <div className="flex justify-between gap-2">
                                                        <span>Pix:</span>
                                                        <span>R$ {salesByMethod["PIX"].toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            R$ {expectedTotal.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {register.finalAmount ? `R$ ${register.finalAmount.toFixed(2)}` : "-"}
                                        </td>
                                        <td className={`px-6 py-4 font-medium ${difference < 0 ? "text-red-500" : difference > 0 ? "text-green-500" : "text-gray-600"}`}>
                                            {register.finalAmount ? `R$ ${difference.toFixed(2)}` : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {register.userId || "Sistema"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {register.status === "OPEN" && (
                                                <CloseRegisterButton
                                                    registerId={register.id}
                                                    initialAmount={register.initialAmount}
                                                    totalSales={totalSales}
                                                    salesByMethod={salesByMethod}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
