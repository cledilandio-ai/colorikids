# Guia Rápido do Git - Colorikids 🚀

Este é seu guia de bolso para gerenciar o projeto. Aqui estão os comandos que você mais vai usar.

## 1. O Dia a Dia (Na sua máquina)

Antes de começar qualquer coisa, sempre veja como estão as coisas.
```bash
git status
```
*Serve para:* Ver quais arquivos mudaram, quais são novos e se tem algo pendente. Use sem moderação!

### Passos para Salvar seu Trabalho (O "Save Game"):

**Passo 1: Preparar (Colocar na caixa)**
```bash
git add .
```
*O que faz:* Pega **todas** as alterações de todos os arquivos e coloca na "área de preparação".
*Variação:* `git add nome-do-arquivo` (se quiser adicionar só um arquivo específico).

**Passo 2: Confirmar (Fechar a caixa e etiquetar)**
```bash
git commit -m "Escreva aqui o que você fez"
```
*O que faz:* Salva definitivamente essa versão no histórico do seu computador.
*Exemplo:* `git commit -m "ajuste na altura do carrossel"`

---

## 2. Sincronizando com a Nuvem (GitHub)

**Enviar para a Nuvem (Upload)**
```bash
git push
```
*Quando usar:* Depois de fazer um ou vários commits, para garantir que o código esteja salvo no GitHub. Essencial antes de trocar de computador.

**Baixar da Nuvem (Download)**
```bash
git pull
```
*Quando usar:* Assim que você sentar no **outro computador**. Isso garante que você pegue o trabalho que fez no primeiro PC.

---

## 3. Comandos Úteis e Curiosidades

**Ver o Histórico**
```bash
git log
```
*O que faz:* Mostra uma lista dos últimos commits (quem fez, quando e a mensagem). Aperte `q` para sair da lista.

**Desfazer alterações (Restart da fase)**
⚠️ *Cuidado: Apaga o que você fez desde o último commit.*
```bash
git restore .
```
ou
```bash
git checkout .
```

## Resumo do Trabalho em 2 PCs:

1.  **PC 1 (Trabalhando):**
    *   `git status` (Checa o que fez)
    *   `git add .` (Prepara)
    *   `git commit -m "..."` (Salva local)
    *   `git push` (Envia pra nuvem)

2.  **PC 2 (Chegando para trabalhar):**
    *   `git pull` (Baixa as novidades)
    *   ...trabalha...
    *   (Repete o processo do PC 1)
