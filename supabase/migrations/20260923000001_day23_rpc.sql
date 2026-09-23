begin;

-- 删除可能存在的旧三参数函数。
-- 当前项目应统一使用四参数版本。
drop function if exists public.match_document_chunks(
  vector,
  double precision,
  integer
);

-- 旧四参数函数可能存在默认参数。
-- 先删除再创建，避免：
-- cannot remove parameter defaults from existing function
drop function if exists public.match_document_chunks(
  vector,
  double precision,
  integer,
  jsonb
);

create function public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer,
  filter_metadata jsonb
)
returns table (
  id uuid,
  source text,
  title text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
as $$
  select
    dc.id,
    dc.source,
    dc.title,
    dc.content,
    dc.metadata,
    (
      1 - (dc.embedding <=> query_embedding)
    )::double precision as similarity
  from public.document_chunks dc
  join public.documents d
    on d.id = dc.document_id
  where d.user_id = auth.uid()
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding)
      >= match_threshold
    and dc.metadata @> coalesce(
      filter_metadata,
      '{}'::jsonb
    )
  order by dc.embedding <=> query_embedding
  limit least(
    greatest(match_count, 1),
    20
  );
$$;

revoke execute on function public.match_document_chunks(
  vector,
  double precision,
  integer,
  jsonb
) from public;

revoke execute on function public.match_document_chunks(
  vector,
  double precision,
  integer,
  jsonb
) from anon;

grant execute on function public.match_document_chunks(
  vector,
  double precision,
  integer,
  jsonb
) to authenticated;

commit;