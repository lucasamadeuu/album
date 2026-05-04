-- Perfis públicos + leitura da coleção de quem ativa "partilhar".
-- Rode no SQL Editor (projeto com dados existentes).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Colecionador',
  share_collection boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_share
  on public.profiles (share_collection)
  where share_collection = true;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
  on public.profiles for select
  to authenticated
  using (share_collection = true or auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Perfis para utilizadores já criados (sem linha em profiles).
insert into public.profiles (user_id, display_name, share_collection)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1),
    'Colecionador'
  ),
  true
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, share_collection)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1),
      'Colecionador'
    ),
    true
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Ver coleção de outrem só se essa parte partilha.
drop policy if exists "uos_select_own" on public.user_owned_stickers;
drop policy if exists "uos_select_own_or_public_share" on public.user_owned_stickers;

create policy "uos_select_own_or_public_share"
  on public.user_owned_stickers for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles pr
      where pr.user_id = user_owned_stickers.user_id
        and pr.share_collection is true
    )
  );
