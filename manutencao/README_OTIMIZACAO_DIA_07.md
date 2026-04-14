# Instruções para Retomada da Otimização de Imagens (Dia 07/01)

Este projeto atingiu o limite de "Egress" (saída de dados) do Supabase em Jan/2026. A otimização das imagens antigas foi pausada aguardando a renovação da cota.

## Quando executar
A partir do dia **07 de Janeiro** (ou quando o ciclo de faturamento renovar).

## Procedimento

1. **Verificar Acesso**:
   Tente listar os arquivos para confirmar que o bloqueio saiu.
   ```bash
   node scripts/check_buckets.js
   ```

2. **Rodar Script de Otimização (Dry Run)**:
   Teste sem fazer alterações primeiro.
   ```bash
   node scripts/optimize_images.js --dry-run
   ```

3. **Executar Otimização Real**:
   Se tudo estiver ok, rode o script para valer.
   **Atenção**: O script está configurado para processar apenas 5 imagens por vez (`MAX_FILES = 5`).
   - Edite `scripts/optimize_images.js` e remova ou aumente o limite `MAX_FILES` para processar tudo.
   ```bash
   node scripts/optimize_images.js
   ```

4. **Monitorar**:
   Acompanhe os logs para garantir que as imagens estão sendo reduzidas e substituídas com sucesso.
