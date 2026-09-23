-- =========================================================
-- 1. 检查表是否存在
-- =========================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'documents',
    'document_chunks',
    'notes',
    'tasks',
    'conversations',
    'messages',
    'tool_logs'
  )
order by table_name;

-- =========================================================
-- 2. 检查字段
-- =========================================================

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'documents',
    'document_chunks',
    'notes',
    'tasks',
    'conversations',
    'messages',
    'tool_logs'
  )
order by table_name, ordinal_position;

-- =========================================================
-- 3. 检查 RLS
-- =========================================================

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'documents',
    'document_chunks',
    'notes',
    'tasks',
    'conversations',
    'messages',
    'tool_logs'
  )
order by tablename;

-- rowsecurity 应该全部为 true。

-- =========================================================
-- 4. 检查 Policy
-- =========================================================

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'documents',
    'document_chunks',
    'notes',
    'tasks',
    'conversations',
    'messages',
    'tool_logs'
  )
order by tablename, policyname;

-- =========================================================
-- 5. 检查索引
-- =========================================================

select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'documents',
    'document_chunks',
    'notes',
    'tasks',
    'conversations',
    'messages',
    'tool_logs'
  )
order by tablename, indexname;

-- =========================================================
-- 6. 检查外键
-- =========================================================

select
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in (
    'documents',
    'document_chunks',
    'notes',
    'tasks',
    'conversations',
    'messages',
    'tool_logs'
  )
order by tc.table_name, tc.constraint_name;

-- =========================================================
-- 7. 检查旧数据是否缺少用户归属
-- =========================================================

select count(*) as documents_without_user
from public.documents
where user_id is null;

select count(*) as chunks_without_document
from public.document_chunks
where document_id is null;

select count(*) as notes_without_user
from public.notes
where user_id is null;

select count(*) as tasks_without_user
from public.tasks
where user_id is null;

select count(*) as conversations_without_user
from public.conversations
where user_id is null;

select count(*) as messages_without_user
from public.messages
where user_id is null;

select count(*) as tool_logs_without_user
from public.tool_logs
where user_id is null;

-- 上述结果最好全部为 0。

-- =========================================================
-- 8. 检查 documents 是否存在重复文件
-- =========================================================

select
  user_id,
  source_hash,
  count(*) as duplicate_count
from public.documents
group by user_id, source_hash
having count(*) > 1;

-- 结果应该为空。

-- =========================================================
-- 9. 检查孤立 Chunk
-- =========================================================

select count(*) as orphan_chunks
from public.document_chunks dc
left join public.documents d
  on d.id = dc.document_id
where d.id is null;

-- 结果应该为 0。

-- =========================================================
-- 10. 检查 RPC 函数签名
-- =========================================================

select
  p.oid::regprocedure as function_signature,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'match_document_chunks';

-- 应该只保留四参数版本：
-- match_document_chunks(vector, double precision, integer, jsonb)