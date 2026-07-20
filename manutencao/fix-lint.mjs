/**
 * Fix lint errors across project files.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function read(file) { return readFileSync(join(ROOT, file), 'utf-8'); }
function write(file, content) { writeFileSync(join(ROOT, file), content, 'utf-8'); console.log('  \u2713', file); }

// ═══════════════════════════════════════════════════════════════════════════════
// 1. react/no-unescaped-entities — replace " and ' in JSX text with &quot; &apos;
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== Unescaped entities ===\n');

const manualReplacements = [
  ['<em>"Detectada diferença', '<em>&quot;Detectada diferença'],
  ['(Tesouraria)?"</em>', '(Tesouraria)?&quot;</em>'],
  ["da 'gaveta'.", "da &apos;gaveta&apos;."],
  ['<strong>"Solicitar Autorização"</strong>', '<strong>&quot;Solicitar Autorização&quot;</strong>'],
  ['balança de "Falta Pagar" ou "Troco Pendente"', 'balança de &quot;Falta Pagar&quot; ou &quot;Troco Pendente&quot;'],
  ['<strong>"Crediário"</strong>', '<strong>&quot;Crediário&quot;</strong>'],
  ['compra como "Crediário"', 'compra como &quot;Crediário&quot;'],
  ['busca mostrar "Nenhum resultado"', 'busca mostrar &quot;Nenhum resultado&quot;'],
  ['título "Produtos" e dentro da Vitrine', 'título &quot;Produtos&quot; e dentro da Vitrine'],
  ['quantidade "na mão"', 'quantidade &quot;na mão&quot;'],
  ['Entre em "Repor Estoque"', 'Entre em &quot;Repor Estoque&quot;'],
  ['um "registro de saída na Tesouraria"', 'um &quot;registro de saída na Tesouraria&quot;'],
  ['clicar em "Repor estoque"', 'clicar em &quot;Repor estoque&quot;'],
  ['aba "Tesouraria / Financeiro"', 'aba &quot;Tesouraria / Financeiro&quot;'],
  ['tela "Minha Loja"', 'tela &quot;Minha Loja&quot;'],
  ['para "{search}"', 'para &quot;{search}&quot;'],
  ['"produto", "vendas" ou "estoque"', '&quot;produto&quot;, &quot;vendas&quot; ou &quot;estoque&quot;'],
];

// Fix manual page
let manual = read('app/manual/page.tsx');
for (const [from, to] of manualReplacements) {
  if (manual.includes(from)) {
    manual = manual.replaceAll(from, to);
  } else {
    // Try escaped version (some might use \")
    const escaped = from.replace(/"/g, '\\"');
    if (manual.includes(escaped)) {
      manual = manual.replaceAll(escaped, to.replace(/"/g, '\\"'));
    }
  }
}
write('app/manual/page.tsx', manual);

// Fix ProductList.tsx — feedback section with "{searchTerm}"
let pl = read('components/admin/ProductList.tsx');
pl = pl
  .replace('<span className="font-semibold text-pink-600">"{searchTerm}"</span>',
    '<span className="font-semibold text-pink-600">&quot;{searchTerm}&quot;</span>')
  .replace('`Nenhum produto encontrado para "${searchTerm}".`',
    '`Nenhum produto encontrado para &quot;${searchTerm}&quot;.`');
write('components/admin/ProductList.tsx', pl);

// Fix super-admin — line 637
let sa = read('app/super-admin/page.tsx');
// Find " in JSX text (between > and <, not in attributes or strings)
sa = sa.replace(/(>)([^<]*?)"([^<]*?)"([^<]*?)(<)/g, '$1$2&quot;$3&quot;$4$5');
write('app/super-admin/page.tsx', sa);

// Fix pos/page.tsx — line 884
let pos = read('app/(admin)/pos/page.tsx');
pos = pos.replace(/(>)([^<]*?)"([^<]*?)"([^<]*?)(<)/g, '$1$2&quot;$3&quot;$4$5');
write('app/(admin)/pos/page.tsx', pos);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. react-hooks/exhaustive-deps — add missing deps
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== extsive-deps ===\n');

try {
  const clientes = read('app/(admin)/clientes/page.tsx');
  // Replace useEffect dep array to include fetchCustomers
  const patched = clientes.replace(
    /(useEffect\(\(\)\s*=>\s*\{[^}]*fetchCustomers[^}]*\},\s*\[)(\])/,
    '$1fetchCustomers$2'
  );
  if (patched !== clientes) {
    write('app/(admin)/clientes/page.tsx', patched);
    console.log('  Fixed clientes/page.tsx');
  }
} catch(e) { console.log('  Skipping clientes (error):', e.message); }

try {
  const orders = read('app/(admin)/orders/[id]/page.tsx');
  const patched = orders.replace(
    /(useEffect\(\(\)\s*=>\s*\{[^}]*fetchOrder[^}]*\},\s*\[)(\])/,
    '$1fetchOrder$2'
  );
  if (patched !== orders) {
    write('app/(admin)/orders/[id]/page.tsx', patched);
    console.log('  Fixed orders/[id]/page.tsx');
  }
} catch(e) { console.log('  Skipping orders (error):', e.message); }

try {
  const pix = read('app/assinatura/PixQrCode.tsx');
  const patched = pix.replace(
    /(useEffect\(\(\)\s*=>\s*\{[^}]*city[^}]*\},\s*\[)(\])/,
    '$1city$2'
  );
  if (patched !== pix) {
    write('app/assinatura/PixQrCode.tsx', patched);
    console.log('  Fixed PixQrCode.tsx');
  }
} catch(e) { console.log('  Skipping PixQrCode (error):', e.message); }

try {
  const ar = read('components/admin/finance/AccountsReceivableList.tsx');
  const patched = ar.replace(
    /(useEffect\(\(\)\s*=>\s*\{[^}]*fetchReceivables[^}]*\},\s*\[)(\])/,
    '$1fetchReceivables$2'
  );
  if (patched !== ar) {
    write('components/admin/finance/AccountsReceivableList.tsx', patched);
    console.log('  Fixed AccountsReceivableList.tsx');
  }
} catch(e) { console.log('  Skipping AccountsReceivableList (error):', e.message); }

console.log('\n\u2713 Done!');
