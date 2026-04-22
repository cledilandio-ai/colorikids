"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, UserCircle, ShoppingCart, Tag, BarChart3, ChevronLeft, Search, PlusCircle, PackageOpen, CreditCard, Scan } from "lucide-react";

const TOPICS = [
    {
        id: "caixa_abertura",
        title: "1. O Sistema de Caixa (Abertura e Fechamento)",
        icon: <PackageOpen size={24} strokeWidth={2.5} />,
        color: "indigo",
        keywords: "caixa abrir fechar gaveta fundo de troco tesouraria sangria abertura fechamento dinheiro",
        content: (
            <>
                <p>O <strong>Ponto de Venda (PDV)</strong> não funciona sem uma gaveta aberta. Ao entrar no PDV, o sistema verificará se seu Caixa está aberto.</p>
                <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">Abertura:</h3>
                <ul className="list-disc pl-5 space-y-2 font-medium">
                    <li>Se fechado, o sistema abre um pop-up pedindo o <strong>Valor Inicial</strong> (Fundo de troco do dia).</li>
                    <li>O sistema sugere automaticamente o valor que ficou na gaveta no dia anterior.</li>
                    <li>Se você digitar um valor maior que o esperado, o sistema perguntará: <em>"Detectada diferença... Isso foi retirado do Caixa Principal (Tesouraria)?"</em>. Marque a caixa vermelha se foi.</li>
                </ul>
                <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">Fechamento:</h3>
                <ul className="list-disc pl-5 space-y-2 font-medium">
                    <li>Ao clicar em <strong>Fechar Caixa</strong> (botão vermelho no topo do PDV), o sistema exibe o **Total Esperado** (Troco + Vendas apenas em Dinheiro vivo efetuadas no dia). Pagamentos em Pix e Cartão caem no sistema, mas não aumentam o cálculo físico da 'gaveta'.</li>
                    <li>Você deve realizar a contagem física: digite exatamente o que está na gaveta e o que deseja **Transferir para Tesouraria** (sangria de final do expediente). O que sobrar será salvo para o fundo do dia seguinte!</li>
                </ul>
            </>
        )
    },
    {
        id: "pdv",
        title: "2. PDV Avançado (Busca Inteligente, SKU e Descontos)",
        icon: <ShoppingCart size={24} strokeWidth={2.5} />,
        color: "green",
        keywords: "caixa pdv vender balcao pedidos desconto gerente limite autorização porcentagem sku busca autocomplete leitor barcode codigo barra variante tamanho cor",
        content: (
            <>
                <p>A tela de Ponto de Venda é o coração da sua loja física ou atendimento via Instagram.</p>

                <h3 className="text-lg font-bold text-slate-800 mt-5 mb-2">🔍 Busca Inteligente com Autocomplete</h3>
                <p className="mb-3">Ao digitar no campo de busca do PDV, um <strong>painel de sugestões</strong> aparece automaticamente mostrando resultados em tempo real. Existem dois tipos de resultado:</p>
                <ul className="list-disc pl-5 space-y-2 font-medium mb-4">
                    <li><strong className="text-blue-700">[SKU]</strong> — Aparece quando o que você digitou bate com o código SKU de uma variante específica (ex: tamanho P, cor Rosa). Clicar ou pressionar Enter <strong>adiciona a peça direto ao carrinho</strong>, sem abrir nenhum pop-up!</li>
                    <li><strong className="text-purple-700">[→]</strong> — Aparece quando o que você digitou bate com o nome do produto. Clicar abre o pop-up de escolha de variante (tamanho/cor).</li>
                </ul>

                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg text-green-900 text-sm mb-4">
                    ⚡ <strong>Dica de Velocidade:</strong> Use as teclas <strong>↑ ↓</strong> para navegar nas sugestões, <strong>Enter</strong> para selecionar e <strong>Esc</strong> para fechar o painel. O campo tem um <strong>X</strong> no canto direito para limpar a busca rapidamente.
                </div>

                <h3 className="text-lg font-bold text-slate-800 mt-5 mb-2">📷 Leitor de Código de Barras (SKU)</h3>
                <p className="mb-3">O campo de busca é <strong>100% compatível com leitores de código de barras</strong>. Ao bipar uma etiqueta, o sistema localiza automaticamente a variante pelo SKU e adiciona ao carrinho instantaneamente — o leitor envia o código e pressiona Enter sozinho!</p>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg text-blue-900 text-sm">
                    🏷️ O SKU de cada variante é definido na tela de <strong>Produtos</strong>, dentro de cada tamanho/cor. Configure-os antes de imprimir as etiquetas!
                </div>

                <h3 className="text-lg font-bold text-slate-800 mt-5 mb-2">💬 Adicionando pelo Pop-up de Variante</h3>
                <ol className="list-decimal pl-5 space-y-3 font-medium">
                    <li><strong>Busque pelo nome</strong> do produto e clique no card dele.</li>
                    <li>O sistema pergunta <strong>qual Tamanho e Cor (Variação)</strong> para puxar automaticamente do estoque correto.</li>
                    <li>Clique na variante desejada e ela entra no carrinho.</li>
                </ol>

                <h3 className="text-lg font-bold text-slate-800 mt-5 mb-2">🔒 A Regra do Desconto</h3>
                <p className="mb-2">Quando a compra estiver montada, você pode dar descontos em <strong>R$ ou %</strong>. Mas atenção! Se você for um Vendedor, o lojista definiu sua faixa máxima de desconto.</p>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-2 text-red-900 text-sm">
                    🛑 <strong>A Trava do Vendedor:</strong> Se você digitar um desconto de 20% mas o seu limite for 10%, a tela bloqueará o total e aparecerá o link <strong>"Solicitar Autorização"</strong>. A lojista pode se aproximar, digitar a senha mestra e liberar o desconto naquele momento exato para salvar a venda!
                </div>
            </>
        )
    },
    {
        id: "pagamentos_crediario",
        title: "3. Pagamentos Híbridos, Clientes e Crediário",
        icon: <CreditCard size={24} strokeWidth={2.5} />,
        color: "blue",
        keywords: "pagamento cartao dinheiro pix Qrcode crediario cliente divida fiado misto",
        content: (
            <>
                <h3 className="text-lg font-bold text-slate-800 mt-2 mb-2">Múltiplos Pagamentos ao Mesmo Tempo</h3>
                <p className="mb-4">Se a conta deu R$ 150 e a cliente quer pagar R$ 50 no Cartão e R$ 100 no Pix, basta clicar no método respectivo, digitar o valor, aplicar e escolher o próximo método. O sistema monitora a balança de "Falta Pagar" ou "Troco Pendente" automaticamente.</p>
                
                <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">A Regra do Crediário (Fiado)</h3>
                <ul className="list-disc pl-5 space-y-2 font-medium">
                    <li>A plataforma aceita o botão <strong>"Crediário"</strong>. O sistema anotará individualmente na conta da cliente.</li>
                    <li>Ao selecionar Crediário, aparecerá um campo obrigatório para a **Data de Vencimento** daquela promissória.</li>
                    <li><strong>Proteção:</strong> É impossível fechar a compra como "Crediário" se você não tiver selecionado quem é o cliente!</li>
                </ul>

                <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">Cadastro Rápido Clicou-Cadastrou</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-2 text-blue-900 text-sm font-medium">
                    🔍 Na barra de Clientes do PDV, digite o nome do cliente que está na sua frente. Se a busca mostrar "Nenhum resultado", mas você tiver digitado mais de 3 letras, aparecerá um botão mágico escrito <strong>+ Cadastrar NOME...</strong>. Clique nele e a venda será registrada para essa pessoa no primeiro clique. Zero telas complicadas!
                </div>
            </>
        )
    },
    {
        id: "produtos",
        title: "4. A Inteligência dos Produtos e Variações",
        icon: <Tag size={24} strokeWidth={2.5} />,
        color: "pink",
        keywords: "produtos variacoes cor tamanho estoque custo repor grade fotos imagens preco de venda",
        content: (
            <>
                <p>Nossa regra máxima: Você não cadastra a mesma blusa 3 vezes! Você adiciona uma Blusa Mãe e insere as numerações M, P e G dentro dela.</p>
                <ol className="list-decimal pl-5 space-y-3 font-medium mt-4">
                    <li>Ao criar o Produto, insira o <strong>Preço de Custo</strong> e <strong>Preço de Venda</strong>. O sistema jamais deixará o valor de venda ser menor que o custo.</li>
                    <li><strong>Variações (Cor e Tamanho):</strong> Ao descer a tela, você pode ir adicionando as peças por estoque. O campo de imagens é sincronizado, ou seja, arrastando uma foto principal, os outros tamanhos herdarão!</li>
                </ol>

                <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Botão Mágico de Repor Estoque</h3>
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mt-2 text-indigo-900 text-sm">
                    ⚠️ Ao lado do título "Produtos" e dentro da Vitrine, há o botão verde <strong>Repor Estoque</strong>. Nunca atualize a quantidade "na mão" para o que chegou da caixa do correio. Entre em "Repor Estoque" daquela grade com o produto que chegou, e digite a entrada (Ex: Chegaram mais +5 da China). O sistema perguntará se quer somar os custos dessa recém-produção em um "registro de saída na Tesouraria" automático!
                </div>
            </>
        )
    },
    {
        id: "financeiro",
        title: "5. Tesouraria, Gastos e Visual",
        icon: <BarChart3 size={24} strokeWidth={2.5} />,
        color: "amber",
        keywords: "financeiro despesas configuracoes saídas fluxo relatorios dashboard painel cnpj",
        content: (
            <>
                <ul className="list-disc pl-5 mt-2 space-y-3 font-medium">
                    <li><strong>Dashboard Reluzente:</strong> Sua tela inicial (Dashboard) condensa o financeiro de forma fácil, separando os tipos de caixa, descontando todas as vezes que você clicar em "Repor estoque". Dando acesso as transações mais recentes da loja.</li>
                    <li><strong>Despesas Operacionais:</strong> Aluguel, impulsionamento do instagram e lanches não são compras fornecedoras. Na aba "Tesouraria / Financeiro", clique em <em>Lançar Despesa</em>. Essas saídas são fundamentais para que as barras de Lucratividade mostrem o quão rentável seu mês se tornou.</li>
                    <li><strong>Configurações Finais:</strong> A qualquer momento, na tela "Minha Loja", mude seu Nome, Descrição e seu WhatsApp. É esse WhatsApp que aparece pro cliente final em `/c/sua_loja`, enviando o pedido final direto no seu bolso com a saudação exata.</li>
                </ul>
            </>
        )
    }
];

export default function ManualPage() {
    const [search, setSearch] = useState("");

    const filteredTopics = TOPICS.filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) || 
        t.keywords.includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-primary/20">
            {/* Header / Nav */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-slate-500 hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-slate-100">
                            <ChevronLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-2 text-primary font-bold text-lg">
                            <BookOpen size={24} />
                            Central de Ajuda
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="O que você deseja aprender?"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-12 pb-24">
                <div className="mb-12 text-center sm:text-left">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                        Aprenda a dominar a Plataforma
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                        Esqueça as planilhas. Descubra aqui todos os atalhos para cadastrar produtos rápido, controlar estoque sem erros e ver seu lucro saltar no final do mês.
                    </p>
                </div>

                <div className="space-y-8">
                    {filteredTopics.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p className="text-lg font-semibold">Nenhum resultado encontrado para "{search}"</p>
                            <p className="text-sm">Tente buscar por termos como "produto", "vendas" ou "estoque".</p>
                            <button onClick={() => setSearch("")} className="mt-4 text-primary font-medium hover:underline">Limpar busca</button>
                        </div>
                    ) : (
                        filteredTopics.map((topic) => (
                            <section key={topic.id} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm transition-all hover:shadow-md">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center
                                        ${topic.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                                        ${topic.color === 'pink' ? 'bg-pink-100 text-pink-600' : ''}
                                        ${topic.color === 'green' ? 'bg-green-100 text-green-600' : ''}
                                        ${topic.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                                        ${topic.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : ''}
                                    `}>
                                        {topic.icon}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 leading-tight">{topic.title}</h2>
                                </div>
                                <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                                    {topic.content}
                                </div>
                            </section>
                        ))
                    )}
                </div>
                
                {/* Footer Help */}
                <div className="mt-16 bg-slate-100 rounded-2xl p-8 border border-slate-200 text-center flex flex-col items-center">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Resolveu seu problema?</h3>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Se mesmo com o manual você tiver travas, não precisa paralisar suas vendas! 
                    </p>
                    <Link href="/" className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 shadow-md transition-transform hover:-translate-y-0.5">
                        Voltar para a Tela Inicial
                    </Link>
                </div>
            </div>
        </div>
    );
}
