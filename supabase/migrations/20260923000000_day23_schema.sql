begin;

create extension if not exists vector;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. documents
-- =========================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  filename text not null,
  source_hash text not null,
  created_at timestamptz not null default now()
);

-- 如果 documents 表原本已经存在，补充缺失字段
alter table public.documents
add column if not exists user_id uuid;

alter table public.documents
add column if not exists filename text;

alter table public.documents
add column if not exists source_hash text;

alter table public.documents
add column if not exists created_at timestamptz;

alter table public.documents
alter column created_at
set default now();

-- 补充 documents.user_id 外键
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_user_id_fkey'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
    add constraint documents_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
  end if;
end $$;

-- 这里不直接设置 user_id/source_hash NOT NULL，
-- 因为旧表可能已经存在没有用户归属的数据。
-- 等 verify 文件检查并完成旧数据处理后，再执行：
--
-- alter table public.documents
-- alter column user_id set not null;
--
-- alter table public.documents
-- alter column filename set not null;
--
-- alter table public.documents
-- alter column source_hash set not null;

-- =========================================================
-- 2. document_chunks
-- =========================================================

-- 当前项目已经有 document_chunks。
-- 如果表不存在，按项目实际已有字段创建。
-- embedding 字段必须是 vector(1536)。
alter table public.document_chunks
add column if not exists document_id uuid;

-- 补充 document_chunks.document_id 外键
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_chunks_document_id_fkey'
      and conrelid = 'public.document_chunks'::regclass
  ) then
    alter table public.document_chunks
    add constraint document_chunks_document_id_fkey
    foreign key (document_id)
    references public.documents(id)
    on delete cascade;
  end if;
end $$;

-- =========================================================
-- 3. notes
-- =========================================================

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.notes
add column if not exists user_id uuid;

alter table public.notes
add column if not exists title text;

alter table public.notes
add column if not exists content text;

alter table public.notes
add column if not exists created_at timestamptz;

alter table public.notes
alter column created_at
set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_user_id_fkey'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
    add constraint notes_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
  end if;
end $$;

-- =========================================================
-- 4. tasks
-- =========================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists user_id uuid;

alter table public.tasks
add column if not exists title text;

alter table public.tasks
add column if not exists due_date date;

alter table public.tasks
add column if not exists status text;

alter table public.tasks
add column if not exists created_at timestamptz;

alter table public.tasks
alter column status
set default 'pending';

alter table public.tasks
alter column created_at
set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_user_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
    add constraint tasks_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
  end if;
end $$;

-- 如果 tasks.status 原本没有约束，补充状态约束
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_status_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
    add constraint tasks_status_check
    check (
      status in (
        'pending',
        'in_progress',
        'completed',
        'cancelled'
      )
    );
  end if;
end $$;

-- =========================================================
-- 5. conversations
-- =========================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations
add column if not exists user_id uuid;

alter table public.conversations
add column if not exists title text;

alter table public.conversations
add column if not exists created_at timestamptz;

alter table public.conversations
add column if not exists updated_at timestamptz;

alter table public.conversations
alter column created_at
set default now();

alter table public.conversations
alter column updated_at
set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_user_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
    add constraint conversations_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
  end if;
end $$;

-- =========================================================
-- 6. messages
-- =========================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,
  user_id uuid not null references auth.users(id)
    on delete cascade,
  role text not null
    check (role in ('user', 'assistant', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.messages
add column if not exists conversation_id uuid;

alter table public.messages
add column if not exists user_id uuid;

alter table public.messages
add column if not exists role text;

alter table public.messages
add column if not exists content text;

alter table public.messages
add column if not exists metadata jsonb;

alter table public.messages
add column if not exists created_at timestamptz;

alter table public.messages
alter column metadata
set default '{}'::jsonb;

alter table public.messages
alter column created_at
set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_conversation_id_fkey'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
    add constraint messages_conversation_id_fkey
    foreign key (conversation_id)
    references public.conversations(id)
    on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_user_id_fkey'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
    add constraint messages_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_role_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
    add constraint messages_role_check
    check (
      role in ('user', 'assistant', 'tool')
    );
  end if;
end $$;

-- =========================================================
-- 7. tool_logs
-- =========================================================

create table if not exists public.tool_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  conversation_id uuid references public.conversations(id)
    on delete set null,
  tool_name text not null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb,
  status text not null
    check (status in ('success', 'failed', 'timeout')),
  error_code text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

alter table public.tool_logs
add column if not exists user_id uuid;

alter table public.tool_logs
add column if not exists conversation_id uuid;

alter table public.tool_logs
add column if not exists tool_name text;

alter table public.tool_logs
add column if not exists arguments jsonb;

alter table public.tool_logs
add column if not exists result jsonb;

alter table public.tool_logs
add column if not exists status text;

alter table public.tool_logs
add column if not exists error_code text;

alter table public.tool_logs
add column if not exists duration_ms integer;

alter table public.tool_logs
add column if not exists created_at timestamptz;

alter table public.tool_logs
alter column arguments
set default '{}'::jsonb;

alter table public.tool_logs
alter column created_at
set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tool_logs_user_id_fkey'
      and conrelid = 'public.tool_logs'::regclass
  ) then
    alter table public.tool_logs
    add constraint tool_logs_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tool_logs_conversation_id_fkey'
      and conrelid = 'public.tool_logs'::regclass
  ) then
    alter table public.tool_logs
    add constraint tool_logs_conversation_id_fkey
    foreign key (conversation_id)
    references public.conversations(id)
    on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tool_logs_status_check'
      and conrelid = 'public.tool_logs'::regclass
  ) then
    alter table public.tool_logs
    add constraint tool_logs_status_check
    check (
      status in ('success', 'failed', 'timeout')
    );
  end if;
end $$;

-- =========================================================
-- 8. 索引
-- =========================================================

create index if not exists documents_user_created_idx
on public.documents(user_id, created_at desc);

create index if not exists document_chunks_document_idx
on public.document_chunks(document_id);

create index if not exists notes_user_created_idx
on public.notes(user_id, created_at desc);

create index if not exists tasks_user_status_idx
on public.tasks(user_id, status);

create index if not exists conversations_user_updated_idx
on public.conversations(user_id, updated_at desc);

create index if not exists messages_conversation_created_idx
on public.messages(conversation_id, created_at);

create index if not exists tool_logs_user_created_idx
on public.tool_logs(user_id, created_at desc);

-- documents 已有数据时，这个唯一索引可能因为重复数据失败。
-- 如果失败，先执行 verify 文件检查重复数据。
create unique index if not exists documents_user_source_hash_uidx
on public.documents(user_id, source_hash);

-- =========================================================
-- 9. conversations.updated_at 触发器
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_updated_at
on public.conversations;

create trigger conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

-- =========================================================
-- 10. 开启 RLS
-- =========================================================

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tool_logs enable row level security;

-- =========================================================
-- 11. documents Policy
-- =========================================================

drop policy if exists "users can read own documents"
on public.documents;

create policy "users can read own documents"
on public.documents
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own documents"
on public.documents;

create policy "users can insert own documents"
on public.documents
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can delete own documents"
on public.documents;

create policy "users can delete own documents"
on public.documents
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- 12. document_chunks Policy
-- =========================================================

drop policy if exists "users can read own document chunks"
on public.document_chunks;

create policy "users can read own document chunks"
on public.document_chunks
for select
to authenticated
using (
  exists (
    select 1
    from public.documents d
    where d.id = document_chunks.document_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "users can insert own document chunks"
on public.document_chunks;

create policy "users can insert own document chunks"
on public.document_chunks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.documents d
    where d.id = document_chunks.document_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "users can delete own document chunks"
on public.document_chunks;

create policy "users can delete own document chunks"
on public.document_chunks
for delete
to authenticated
using (
  exists (
    select 1
    from public.documents d
    where d.id = document_chunks.document_id
      and d.user_id = auth.uid()
  )
);

-- =========================================================
-- 13. notes Policy
-- =========================================================

drop policy if exists "users can read own notes"
on public.notes;

create policy "users can read own notes"
on public.notes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own notes"
on public.notes;

create policy "users can insert own notes"
on public.notes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own notes"
on public.notes;

create policy "users can update own notes"
on public.notes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own notes"
on public.notes;

create policy "users can delete own notes"
on public.notes
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- 14. tasks Policy
-- =========================================================

drop policy if exists "users can read own tasks"
on public.tasks;

create policy "users can read own tasks"
on public.tasks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own tasks"
on public.tasks;

create policy "users can insert own tasks"
on public.tasks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own tasks"
on public.tasks;

create policy "users can update own tasks"
on public.tasks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own tasks"
on public.tasks;

create policy "users can delete own tasks"
on public.tasks
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- 15. conversations Policy
-- =========================================================

drop policy if exists "users can read own conversations"
on public.conversations;

create policy "users can read own conversations"
on public.conversations
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own conversations"
on public.conversations;

create policy "users can insert own conversations"
on public.conversations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own conversations"
on public.conversations;

create policy "users can update own conversations"
on public.conversations
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete own conversations"
on public.conversations;

create policy "users can delete own conversations"
on public.conversations
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- 16. messages Policy
-- =========================================================

drop policy if exists "users can read own messages"
on public.messages;

create policy "users can read own messages"
on public.messages
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "users can insert own messages"
on public.messages;

create policy "users can insert own messages"
on public.messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "users can delete own messages"
on public.messages;

create policy "users can delete own messages"
on public.messages
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = auth.uid()
  )
);

-- =========================================================
-- 17. tool_logs Policy
-- =========================================================

drop policy if exists "users can read own tool logs"
on public.tool_logs;

create policy "users can read own tool logs"
on public.tool_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own tool logs"
on public.tool_logs;

create policy "users can insert own tool logs"
on public.tool_logs
for insert
to authenticated
with check (user_id = auth.uid());

-- 工具日志不允许普通用户修改或删除。
-- 管理员可以使用 Service Role Client 处理。

-- =========================================================
-- 18. 表权限
-- =========================================================

revoke all on public.documents from anon;
revoke all on public.document_chunks from anon;
revoke all on public.notes from anon;
revoke all on public.tasks from anon;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;
revoke all on public.tool_logs from anon;

grant select, insert, delete
on public.documents
to authenticated;

grant select, insert, delete
on public.document_chunks
to authenticated;

grant select, insert, update, delete
on public.notes
to authenticated;

grant select, insert, update, delete
on public.tasks
to authenticated;

grant select, insert, update, delete
on public.conversations
to authenticated;

grant select, insert, delete
on public.messages
to authenticated;

grant select, insert
on public.tool_logs
to authenticated;

commit;