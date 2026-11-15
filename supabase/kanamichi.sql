-- かなみち 학습 기록 표
-- Supabase 대시보드 → SQL Editor → New query 에 전부 붙여 넣고 Run 한 번이면 된다.
-- 여러 번 실행해도 문제없도록 작성했다. (MAGI·SEED 10K와 같은 프로젝트에서 실행)

-- 계정마다 한 줄. 본인 기록만 읽고 쓸 수 있다.
create table if not exists public.kanamichi_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint kanamichi_progress_size check (pg_column_size(data) < 2000000)
);
alter table public.kanamichi_progress enable row level security;

drop policy if exists "kanamichi_progress_select_own" on public.kanamichi_progress;
drop policy if exists "kanamichi_progress_insert_own" on public.kanamichi_progress;
drop policy if exists "kanamichi_progress_update_own" on public.kanamichi_progress;
drop policy if exists "kanamichi_progress_delete_own" on public.kanamichi_progress;
create policy "kanamichi_progress_select_own" on public.kanamichi_progress for select using (auth.uid() = user_id);
create policy "kanamichi_progress_insert_own" on public.kanamichi_progress for insert with check (auth.uid() = user_id);
create policy "kanamichi_progress_update_own" on public.kanamichi_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "kanamichi_progress_delete_own" on public.kanamichi_progress for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.kanamichi_progress to authenticated;
