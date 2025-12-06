import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface FinancialReportProps {
    type: 'BALANCE' | 'IN' | 'OUT';
    transactions: any[];
    onClose: () => void;
    totalIn: number;
    totalOut: number;
    balance: number;
}

export function FinancialReport({ type, transactions, onClose, totalIn, totalOut, balance }: FinancialReportProps) {
    const title = type === 'BALANCE' ? 'Relatório de Saldo Geral' :
        type === 'IN' ? 'Relatório de Entradas' : 'Relatório de Saídas';

    // Filter transactions based on type
    const filteredTransactions = transactions.filter(t => {
        if (type === 'BALANCE') return true;
        return t.type === type;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalValue = type === 'BALANCE' ? balance : type === 'IN' ? totalIn : totalOut;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900/80 backdrop-blur-sm overflow-y-auto pt-10 pb-10 print:p-0 print:bg-white print:static">
            {/* Toolbar - Hidden on Print */}
            <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / Salvar PDF
                </Button>
                <Button variant="outline" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-800 shadow-lg">
                    <X className="mr-2 h-4 w-4" />
                    Fechar
                </Button>
            </div>

            {/* A4 Paper Container */}
            <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl print:shadow-none print:w-full print:min-h-0 print:p-0 text-gray-900">

                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-wide text-gray-900">VAST COSMOS</h1>
                            <p className="text-sm text-gray-500">Relatório Financeiro do Sistema</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Gerado em:</p>
                            <p className="font-mono font-medium">{new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {/* Report Title & Summary */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8 print:bg-white print:border-gray-300">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
                    <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-600">
                            Total de Registros: <span className="font-bold">{filteredTransactions.length}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-sm text-gray-500 uppercase tracking-wider">Valor Total</span>
                            <span className={`text-3xl font-bold ${type === 'OUT' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-2 font-bold uppercase text-xs text-gray-600">Data</th>
                            <th className="py-2 font-bold uppercase text-xs text-gray-600">Descrição</th>
                            <th className="py-2 font-bold uppercase text-xs text-gray-600">Categoria</th>
                            <th className="py-2 font-bold uppercase text-xs text-gray-600 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((t) => (
                            <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent">
                                <td className="py-3 pr-4 whitespace-nowrap font-mono text-gray-500">
                                    {new Date(t.date).toLocaleDateString('pt-BR')} <span className="text-xs text-gray-400">{new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="py-3 pr-4 font-medium text-gray-800">
                                    {t.description}
                                </td>
                                <td className="py-3 pr-4">
                                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 print:bg-transparent print:p-0 print:text-gray-800">
                                        {t.category ? t.category.replace(/_/g, " ") : "GERAL"}
                                    </span>
                                </td>
                                <td className={`py-3 text-right font-bold ${t.type === 'IN' ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {t.type === 'IN' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-gray-300 text-center text-xs text-gray-400">
                    <p>Relatório gerado automaticamente pelo sistema Vast Cosmos.</p>
                </div>
            </div>

            {/* Print Styles to hide everything else */}
            <style jsx global>{`
                @media print {
                    body > *:not(.fixed) {
                        display: none !important;
                    }
                    nav, header, aside {
                        display: none !important;
                    }
                    /* Ensure the modal content is visible */
                    .fixed {
                        position: static !important;
                        background: white !important;
                        height: auto !important;
                        width: auto !important;
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}
