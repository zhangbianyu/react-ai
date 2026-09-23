begin;

create table if not exists public.request_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid references auth.users(id)
    on delete set null,
  route text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  duration_ms integer,
  status text not null
    check (status in ('success', 'error')),
  error_code text,
  created_at timestamptz not null default now()
);

alter table public.tool_logs
add column if not exists request_id text;

alter table public.tool_logs
add column if not exists model text;

alter table public.tool_logs
add column if not exists input_tokens integer;

alter table public.tool_logs
add column if not exists output_tokens integer;

alter table public.tool_logs
add column if not exists total_tokens integer;

create index if not exists request_logs_user_created_idx
on public.request_logs(user_id, created_at desc);

create index if not exists request_logs_request_id_idx
on public.request_logs(request_id);

create index if not exists tool_logs_request_id_idx
on public.tool_logs(request_id);

alter table public.request_logs enable row level security;

drop policy if exists "users can read own request logs"
on public.request_logs;

create policy "users can read own request logs"
on public.request_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own request logs"
on public.request_logs;

create policy "users can insert own request logs"
on public.request_logs
for insert
to authenticated
with check (user_id = auth.uid());

grant select, insert
on public.request_logs
to authenticated;

commit;