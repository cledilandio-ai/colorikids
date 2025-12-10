"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Archive, AlertTriangle, PackageX, TrendingUp, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface DashboardMetrics {
    totalCost: number;
    potentialProfit: number;
    obsoleteValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalItems: number;
    obsoleteCount: number;
}

interface AggregatedProduct {
    id: string;
    name: string;
    stockQuantity: number;
    minStock: number;
    totalValue: number; // Custo Total
    totalPotentialProfit: number; // Margem de Contribuição Total (Lucro)
    price: number; // Preço Unitário
    costPrice: number; // Custo Unitário
    lastRestockAt: Date | null;
    lastSoldAt: Date | null;
    status: 'ok' | 'low' | 'out' | 'obsolete';
    variantCount: number;
    hasBrokenGrid: boolean;
}

interface StockDashboardClientProps {
    metrics: DashboardMetrics;
    products: AggregatedProduct[];
}

export function StockDashboardClient({ metrics, products }: StockDashboardClientProps) {
    const [activeFilter, setActiveFilter] = useState<'all' | 'low' | 'out' | 'obsolete'>('all');
    // viewMode controla quais colunas aparecem na tabela
    // all -> Datas de Entrada/Saída (SEM FINANCEIRO)
    // unitary -> Unitários
    // total -> Totais
    const [viewMode, setViewMode] = useState<'all' | 'unitary' | 'total'>('all');

    const [sortConfig, setSortConfig] = useState<{ key: keyof AggregatedProduct, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

    const handleSort = (key: keyof AggregatedProduct) => {
        let direction: 'asc' | 'desc' = 'desc'; // Default desc for numbers
        if (key === 'name') direction = 'asc'; // Default asc for text

        if (sortConfig && sortConfig.key === key) {
            if (sortConfig.direction === 'desc') direction = 'asc';
            else direction = 'desc';
        }

        setSortConfig({ key, direction });
    };

    const handleFilterClick = (filter: 'all' | 'low' | 'out' | 'obsolete') => {
        setActiveFilter(filter === activeFilter ? 'all' : filter);
    };

    const handleCardClick = (mode: 'unitary' | 'total') => {
        if (mode === 'total') {
            setViewMode('total');
            handleSort('totalValue');
        } else {
            setViewMode('unitary');
            handleSort('price');
        }
    };

    const handleReset = () => {
        setActiveFilter('all');
        setSortConfig({ key: 'name', direction: 'asc' });
        setViewMode('all');
    };

    // Calculate averages safely
    const validCostCount = products.filter(p => p.costPrice > 0).length;
    const avgUnitCost = validCostCount > 0
        ? products.reduce((acc, p) => acc + (p.costPrice || 0), 0) / products.length
        : 0;

    const validPriceCount = products.filter(p => p.price > 0).length;
    const avgUnitPrice = validPriceCount > 0
        ? products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length
        : 0;

    // Calcular Margem Média Unitária
    const avgMarginValue = avgUnitPrice - avgUnitCost;
    const avgMarginPercent = avgUnitPrice > 0 ? (avgMarginValue / avgUnitPrice) * 100 : 0;

    const sortedProducts = [...products].filter(p => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'low') return p.status === 'low';
        if (activeFilter === 'out') return p.status === 'out';
        if (activeFilter === 'obsolete') return p.status === 'obsolete';
        return true;
    }).sort((a, b) => {
        if (!sortConfig) return 0;

        const { key, direction } = sortConfig;

        let valA = a[key] as any;
        let valB = b[key] as any;

        if (valA === null || valA === undefined) valA = 0;
        if (valB === null || valB === undefined) valB = 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;

        return 0;
    });

    const SortIcon = ({ columnKey }: { columnKey: keyof AggregatedProduct }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-300 opacity-50 inline" />;
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-1 h-3 w-3 text-black inline" />;
        return <ArrowDown className="ml-1 h-3 w-3 text-black inline" />;
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return format(new Date(date), 'dd/MM/yy');
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* CARD 1: FINANCEIRO DO MONTANTE (AGRUPADO) */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${viewMode === 'total' ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-gradient-to-br from-blue-50 to-white'}`}
                    onClick={() => handleCardClick('total')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
                            <DollarSign className="h-4 w-4" /> Financeiro (Montante)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-muted-foreground underline decoration-dotted" title="Soma do custo de todos os itens em estoque">Custo Total:</span>
                            <span className="text-lg font-bold text-blue-700">{formatCurrency(metrics.totalCost)}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-muted-foreground underline decoration-dotted" title="Diferença total entre Preço de Venda e Custo (Lucro Bruto Projetado)">Margem Contrib.:</span>
                            <span className="text-lg font-bold text-green-600">{formatCurrency(metrics.potentialProfit)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t text-center flex items-center justify-center gap-1">
                            {viewMode === 'total' ?
                                (sortConfig?.direction === 'desc' ? '⬇ Ordenado por Maior Custo' : '⬆ Ordenado por Menor Custo')
                                : 'Clique para ver Totais'}
                        </p>
                    </CardContent>
                </Card>

                {/* CARD 2: FINANCEIRO POR PEÇA (AGRUPADO) */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${viewMode === 'unitary' ? 'ring-2 ring-purple-400 bg-purple-50' : 'bg-gradient-to-br from-purple-50 to-white'}`}
                    onClick={() => handleCardClick('unitary')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-800">
                            <TrendingUp className="h-4 w-4" /> Financeiro (Peça/Média)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-muted-foreground">Custo Médio:</span>
                            <span className="text-lg font-bold text-purple-700">{formatCurrency(avgUnitCost)}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-muted-foreground">Margem Contrib. Média:</span>
                            <div className="text-right">
                                <span className="text-lg font-bold text-green-600">{formatCurrency(avgMarginValue)}</span>
                                <span className="text-xs font-medium text-green-700 ml-1">({avgMarginPercent.toFixed(0)}%)</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t text-center flex items-center justify-center gap-1">
                            {viewMode === 'unitary' ?
                                (sortConfig?.direction === 'desc' ? '⬇ Ordenado por Preço Unit.' : '⬆ Ordenado por Preço Unit.')
                                : 'Clique para ver Unitários'}
                        </p>
                    </CardContent>
                </Card>

                {/* CARD 3: OBSOLETO */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'obsolete' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                    onClick={() => handleFilterClick('obsolete')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estoque Obsoleto</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <Archive className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.obsoleteValue)}</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.totalItems > 0
                                ? `${((metrics.obsoleteCount / metrics.totalItems) * 100).toFixed(1)}%`
                                : '0%'} do total
                        </p>
                    </CardContent>
                </Card>

                {/* CARD 4: ABAIXO DO MÍNIMO */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'low' ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
                    onClick={() => handleFilterClick('low')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Abaixo do Mínimo</CardTitle>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${metrics.lowStockCount ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{metrics.lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">Produtos</p>
                    </CardContent>
                </Card>

                {/* CARD 5: ESGOTADOS */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'out' ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                    onClick={() => handleFilterClick('out')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tot. Esgotados</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <PackageX className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.outOfStockCount}</div>
                        <p className="text-xs text-muted-foreground">Produtos</p>
                    </CardContent>
                </Card>

                {/* CARD 6: TOTAL */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === 'all' && viewMode === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                    onClick={handleReset}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Archive className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalItems}</div>
                        <p className="text-xs text-muted-foreground">Cadastrados</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Detalhamento
                        {activeFilter !== 'all' && (
                            <span className="text-sm font-normal text-muted-foreground px-2 py-0.5 bg-gray-200 rounded-full">
                                {activeFilter === 'low' ? 'Baixo Estoque' : activeFilter === 'out' ? 'Esgotados' : 'Obsoletos'}
                            </span>
                        )}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                            ({viewMode === 'all' ? 'Datas de Movimentação' : viewMode === 'unitary' ? 'Visão Unitária' : 'Visão Montante'})
                        </span>
                    </h2>
                    {(activeFilter !== 'all' || viewMode !== 'all' || sortConfig?.key !== 'name') && (
                        <Button variant="ghost" size="sm" onClick={handleReset} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <X className="mr-2 h-4 w-4" /> Resetar
                        </Button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                            <tr>
                                <th className="p-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                                    Produto <SortIcon columnKey="name" />
                                </th>
                                <th className="p-3 text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('variantCount')}>
                                    Var. <SortIcon columnKey="variantCount" />
                                </th>
                                <th className="p-3 text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('stockQuantity')}>
                                    Qtd. <SortIcon columnKey="stockQuantity" />
                                </th>
                                <th className="p-3 text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('minStock')}>
                                    Min. <SortIcon columnKey="minStock" />
                                </th>

                                {/* DATAS - VISÍVEL APENAS EM 'ALL' */}
                                {viewMode === 'all' && (
                                    <>
                                        <th className="p-3 text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('lastRestockAt')}>
                                            Entrada <SortIcon columnKey="lastRestockAt" />
                                        </th>
                                        <th className="p-3 text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('lastSoldAt')}>
                                            Última Venda <SortIcon columnKey="lastSoldAt" />
                                        </th>
                                    </>
                                )}

                                {/* FINANCEIRO POR PEÇA - VISÍVEL APENAS EM UNITARY */}
                                {viewMode === 'unitary' && (
                                    <>
                                        <th className="p-3 text-right bg-purple-50/50 cursor-pointer hover:bg-purple-100 border-l border-purple-100" onClick={() => handleSort('costPrice')}>
                                            Custo Unit. <SortIcon columnKey="costPrice" />
                                        </th>
                                        <th className="p-3 text-right bg-purple-50/50 cursor-pointer hover:bg-purple-100 border-r border-purple-100" onClick={() => handleSort('price')}>
                                            Venda Unit. <SortIcon columnKey="price" />
                                        </th>
                                    </>
                                )}

                                {/* FINANCEIRO MONTANTE - VISÍVEL APENAS EM TOTAL */}
                                {viewMode === 'total' && (
                                    <>
                                        <th className="p-3 text-right bg-blue-50/50 cursor-pointer hover:bg-blue-100 border-l border-blue-100" onClick={() => handleSort('totalValue')}>
                                            Custo Total <SortIcon columnKey="totalValue" />
                                        </th>
                                        <th className="p-3 text-right bg-blue-50/50 cursor-pointer hover:bg-blue-100 border-r border-blue-100" onClick={() => handleSort('totalPotentialProfit')}>
                                            Margem Contrib. <SortIcon columnKey="totalPotentialProfit" />
                                        </th>
                                    </>
                                )}

                                <th className="p-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSort('status')}>
                                    Status <SortIcon columnKey="status" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">
                                        Nenhum item encontrado.
                                    </td>
                                </tr>
                            ) : (
                                sortedProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="p-3 font-medium text-gray-900 border-r border-transparent">
                                            {product.name}
                                            {product.hasBrokenGrid && (
                                                <div className="mt-1">
                                                    <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-[10px] h-5 px-1 gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Grade Quebrada
                                                    </Badge>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center text-gray-500 border-r border-transparent">
                                            {product.variantCount}
                                        </td>
                                        <td className={`p-3 text-center font-bold border-r border-transparent ${product.stockQuantity === 0 ? 'text-red-600' : product.stockQuantity < product.minStock ? 'text-orange-600' : 'text-green-600'}`}>
                                            {product.stockQuantity}
                                        </td>
                                        <td className="p-3 text-center text-gray-500 border-r border-transparent">{product.minStock}</td>

                                        {/* DATAS */}
                                        {viewMode === 'all' && (
                                            <>
                                                <td className="p-3 text-center text-gray-500 text-xs">
                                                    {formatDate(product.lastRestockAt)}
                                                </td>
                                                <td className="p-3 text-center text-gray-500 text-xs">
                                                    {formatDate(product.lastSoldAt)}
                                                </td>
                                            </>
                                        )}

                                        {/* UNITÁRIO */}
                                        {viewMode === 'unitary' && (
                                            <>
                                                <td className="p-3 text-right text-gray-500 bg-purple-50/30 border-l border-purple-100 font-mono text-xs">
                                                    {formatCurrency(product.costPrice)}
                                                </td>
                                                <td className="p-3 text-right text-purple-700 bg-purple-50/30 border-r border-purple-100 font-mono font-medium text-xs">
                                                    {formatCurrency(product.price)}
                                                </td>
                                            </>
                                        )}

                                        {/* MONTANTE */}
                                        {viewMode === 'total' && (
                                            <>
                                                <td className="p-3 text-right text-gray-600 bg-blue-50/30 border-l border-blue-100 font-mono text-xs">
                                                    {formatCurrency(product.totalValue)}
                                                </td>
                                                <td className="p-3 text-right text-green-600 bg-blue-50/30 border-r border-blue-100 font-mono font-bold text-xs">
                                                    {formatCurrency(product.totalPotentialProfit)}
                                                </td>
                                            </>
                                        )}

                                        <td className="p-3 border-l border-transparent">
                                            {product.status === 'out' && <Badge variant="destructive" className="h-5 text-[10px]">Esgotado</Badge>}
                                            {product.status === 'low' && <Badge className="bg-orange-500 hover:bg-orange-600 h-5 text-[10px]">Baixo</Badge>}
                                            {product.status === 'obsolete' && <Badge variant="secondary" className="text-red-500 h-5 text-[10px]">Obsoleto</Badge>}
                                            {product.status === 'ok' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 h-5 text-[10px]">Normal</Badge>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
