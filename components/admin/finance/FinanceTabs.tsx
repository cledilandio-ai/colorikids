"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceDashboardClient } from "./FinanceDashboardClient";
import { FinancialReport } from "./FinancialReport";
import CashRegisterHistory from "./CashRegisterHistory";
import AccountsReceivableList from "./AccountsReceivableList";

interface FinanceTabsProps {
    transactions: any[];
    salesData: any[];
    totalIn: number;
    totalOut: number;
    balance: number;
    companyName: string;
}

export function FinanceTabs({ transactions, salesData, totalIn, totalOut, balance, companyName }: FinanceTabsProps) {
    const [summaryType, setSummaryType] = useState<'BALANCE' | 'IN' | 'OUT' | 'MARGIN' | null>(null);
    const [showFilter, setShowFilter] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // ... (rest of the component logic remains the same until the return)

    // Inside the return, update FinancialReport usage:


    // Cálculo do Resumo Global da Margem de Contribuição a partir de todos os dados de vendas
    const totalSalesRevenue = salesData.reduce((acc, s) => acc + s.total, 0);
    const totalSalesCost = salesData.reduce((acc, s) => acc + s.cost, 0);
    const globalMargin = totalSalesRevenue - totalSalesCost;


    const handleCardClick = (type: 'BALANCE' | 'IN' | 'OUT' | 'MARGIN') => {
        setSummaryType(type);
        setShowFilter(true);
    };

    const handleFilterConfirm = () => {
        setShowFilter(false);
    };

    // Filtrar transações e vendas com base no intervalo de datas e tipo selecionado
    const getFilteredData = () => {
        const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
        const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

        const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);
        const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        // Filtrar Transações Financeiras
        const filteredTrans = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        // IMPORTANTE: fIn inclui todas as entradas, inclusive Transferências Internas (Recolhimentos),
        // para garantir que o total bata com a soma da lista e com a receita real.
        const fIn = filteredTrans.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
        const fOut = filteredTrans.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);

        // Filtrar Dados de Vendas (para Margem)
        const filteredSales = salesData.filter(s => {
            const sDate = new Date(s.date);
            return sDate >= start && sDate <= end;
        });

        const fSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
        const fSalesCost = filteredSales.reduce((acc, s) => acc + s.cost, 0);

        return {
            filteredTransactions: filteredTrans,
            filteredTotalIn: fIn,
            filteredTotalOut: fOut,
            filteredBalance: fIn - fOut,

            // Margin Data
            filteredSalesData: filteredSales,
            filteredSalesRevenue: fSalesRevenue,
            filteredSalesCost: fSalesCost,
            filteredMargin: fSalesRevenue - fSalesCost
        };
    };

    const {
        filteredTransactions,
        filteredTotalIn,
        filteredTotalOut,
        filteredBalance,
        filteredSalesData,
        filteredSalesRevenue,
        filteredSalesCost,
        filteredMargin
    } = getFilteredData();

    // Determinar valores para passar ao relatório com base no tipo selecionado
    const getReportValues = () => {
        if (summaryType === 'MARGIN') {
            return {
                // For Margin report, we might want to show Revenue vs Variable Costs
                // But the report component usually takes totalIn/totalOut. 
                // We'll pass specific values or handle logic in Report.
                // Let's pass the real calculated values.
                totalIn: filteredTotalIn,
                totalOut: filteredTotalOut // Or filteredVariableCosts? Report logic will need update.
            };
        }
        return {
            totalIn: filteredTotalIn,
            totalOut: filteredTotalOut
        };
    };

    return (
        <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-1 mb-8 h-auto md:grid-cols-3">
                <TabsTrigger value="transactions">Transações & Tesouraria</TabsTrigger>
                <TabsTrigger value="receipts">Contas a Receber (Crediário)</TabsTrigger>
                <TabsTrigger value="history">Histórico de Caixas</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div
                        onClick={() => handleCardClick('BALANCE')}
                        className="rounded-xl border bg-white p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute right-0 top-0 h-full w-1 bg-gray-200 group-hover:bg-gray-400 transition-colors" />
                        <div className="text-sm font-medium text-gray-500">Saldo Atual</div>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    <div
                        onClick={() => handleCardClick('IN')}
                        className="rounded-xl border bg-white p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute right-0 top-0 h-full w-1 bg-green-200 group-hover:bg-green-500 transition-colors" />
                        <div className="text-sm font-medium text-gray-500">Entradas (Total)</div>
                        <div className="text-2xl font-bold text-green-600">
                            {totalIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    <div
                        onClick={() => handleCardClick('OUT')}
                        className="rounded-xl border bg-white p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute right-0 top-0 h-full w-1 bg-red-200 group-hover:bg-red-500 transition-colors" />
                        <div className="text-sm font-medium text-gray-500">Saídas (Total)</div>
                        <div className="text-2xl font-bold text-red-600">
                            {totalOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    {/* New Contribution Margin Card */}
                    <div
                        onClick={() => handleCardClick('MARGIN')}
                        className="rounded-xl border bg-white p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className="absolute right-0 top-0 h-full w-1 bg-blue-200 group-hover:bg-blue-500 transition-colors" />
                        <div className="text-sm font-medium text-gray-500">Margem de Contribuição</div>
                        <div className={`text-2xl font-bold ${globalMargin >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {globalMargin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                </div>

                {/* Date Filter Modal */}
                {summaryType && showFilter && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl p-6">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">Filtrar Período</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="w-full rounded-md border border-gray-300 p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="w-full rounded-md border border-gray-300 p-2"
                                    />
                                </div>
                                <div className="pt-4 flex gap-2">
                                    <button
                                        onClick={handleFilterConfirm}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                                    >
                                        Gerar Relatório
                                    </button>
                                    <button
                                        onClick={() => { setSummaryType(null); setShowFilter(false); }}
                                        className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Preview */}
                {summaryType && !showFilter && (
                    <FinancialReport
                        type={summaryType}
                        transactions={filteredTransactions}
                        salesData={filteredSalesData}
                        totalIn={summaryType === 'MARGIN' ? filteredSalesRevenue : filteredTotalIn}
                        totalOut={summaryType === 'MARGIN' ? filteredSalesCost : filteredTotalOut}
                        balance={filteredBalance}
                        marginResult={summaryType === 'MARGIN' ? filteredMargin : undefined}
                        companyName={companyName}
                        onClose={() => setSummaryType(null)}
                    />
                )}

                <FinanceDashboardClient initialTransactions={transactions} />
            </TabsContent>

            <TabsContent value="receipts">
                <AccountsReceivableList />
            </TabsContent>

            <TabsContent value="history">
                <CashRegisterHistory />
            </TabsContent>
        </Tabs>
    );
}

