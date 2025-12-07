
-- Criar um novo bucket chamado 'uploads' (se não existir)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Remover políticas existentes para evitar erros de duplicidade ao rodar novamente
drop policy if exists "Permitir acesso publico a imagens" on storage.objects;
drop policy if exists "Permitir upload publico" on storage.objects;
drop policy if exists "Permitir update publico" on storage.objects;
drop policy if exists "Permitir delete publico" on storage.objects;

-- Política 1: Permitir que QUALQUER UM visualize (download) arquivos no bucket 'uploads'
create policy "Permitir acesso publico a imagens"
on storage.objects for select
using ( bucket_id = 'uploads' );

-- Política 2: Permitir que QUALQUER UM faça upload (insert) de arquivos no bucket 'uploads'
-- OBS: Em um ambiente ideal, restringiríamos apenas a usuários autenticados (auth.role() = 'authenticated'),
-- mas para garantir que funcione sem problemas de sessão/cookie neste admin, vamos liberar para anon também temporariamente se necessário.
-- Se preferir segurança estrita, mude 'true' para "(auth.role() = 'authenticated')".
create policy "Permitir upload publico"
on storage.objects for insert
with check ( bucket_id = 'uploads' );

-- Política 3: Permitir update (caso precise substituir imagem)
create policy "Permitir update publico"
on storage.objects for update
using ( bucket_id = 'uploads' );

-- Política 4: Permitir delete (caso precise remover imagem)
create policy "Permitir delete publico"
on storage.objects for delete
using ( bucket_id = 'uploads' );
