# 📉 Guia de Sobrevivência: Economia de Tokens & Memória da IA
### Como usar o Antigravity / Gemini com máxima eficiência e baixo custo

Este guia prático foi criado para te ajudar a **economizar a franquia de tokens** do seu plano de IA e evitar que os limites mensais se esgotem rapidamente.

---

## 🚀 1. COMANDOS ÚTEIS (Atalhos do Chat)

O chat do sistema possui **Slash Commands** (comandos com barra) que automatizam tarefas complexas e evitam que você precise digitar explicações longas (o que economiza muitos tokens).

| Comando | Para que serve? | Como usar? | Por que economiza? |
| :--- | :--- | :--- | :--- |
| `/grill-me` | **Alinhamento Interativo** | Digite `/grill-me` antes de planejar um recurso complexo. A IA te fará perguntas diretas e curtas. | Evita que a IA escreva códigos errados por falta de informação, economizando tokens de retrabalho. |
| `/goal` | **Modo Super Focado** | Digite `/goal [objetivo]` para tarefas muito longas. A IA trabalhará de forma contínua até terminar. | Evita que você precise ficar pedindo "continue" dezenas de vezes, o que acumula tokens de contexto. |
| `/schedule` | **Agendar Tarefa** | Digite `/schedule` para criar lembretes ou tarefas recorrentes em background. | Poupa a necessidade de manter o chat aberto esperando uma build longa finalizar. |

---

## 🧼 2. REGRA DE OURO: "Reiniciar Sessão"

Este é o fator **número um** no consumo de tokens.

* **O Problema:** A IA é "sem memória de longo prazo" nativa. Para que ela lembre do que vocês conversaram, a plataforma **reenvia todo o histórico da conversa** a cada nova mensagem que você digita. Se o chat tem 40 mensagens, você paga o custo de 40 mensagens em **cada pergunta nova**.
* **A Solução:** Assim que uma tarefa for concluída e testada, **feche o chat e inicie um novo**.
* **Como a nova IA saberá o que fazer?** O repositório está limpo, o código está atualizado no GitHub e nós criamos o arquivo [manutencao/walkthrough.md](file:///c:/Users/ger/Documents/HTML/DashOperacoes/manutencao/walkthrough.md), que serve como resumo executivo para o próximo agente ler e se situar instantaneamente em segundos.

---

## 📂 3. ORGANIZAÇÃO DO CÓDIGO (Projeto Limpo = IA Inteligente)

### O que já fizemos hoje:
1. **Criamos `.geminiignore` e `.aiignore`:** Bloqueiam a leitura de arquivos gigantes (como `package-lock.json` e `node_modules`).
2. **Deletamos backups antigos da raiz:** Removemos `_ProducaoApp.old.jsx`, `_ProducaoApp2.jsx` e `_ProducaoContext.old.jsx`.
3. **Movemos scripts soltos para `manutencao/`:** Todos os scripts de testes e scripts `.mjs` agora estão organizados na pasta de manutenção.

### O que você deve fazer no dia a dia:
* **Não crie arquivos com sufixo `.old` na raiz do projeto.** Se precisar de um backup temporário de um arquivo, guarde-o na pasta `scratch/` ou faça um commit no Git. O Git é o melhor sistema de backup do mundo.

---

## ✍️ 4. COMO PEDIR AJUDA GASTANDO POUCO

Quando precisar de alguma alteração de código, siga este modelo de instrução curta e direta:

```markdown
"Preciso ajustar o cálculo de rendimento do café no arquivo src/pages/MateriaPrima.jsx.
Foque apenas na função renderCardInsumo para mudar a cor do cabeçalho de amber para brown."
```

* **Por que isso ajuda?** Ao invés de a IA ler todos os arquivos da pasta para tentar adivinhar onde está o problema, ela vai diretamente ao arquivo indicado. Menos arquivos abertos = muito menos tokens gastos.

---

> 📌 **Lembre-se:** Economizar tokens não é apenas uma questão de custos, mas também de velocidade. Chats mais curtos e projetos organizados fazem a IA responder até 5x mais rápido!
