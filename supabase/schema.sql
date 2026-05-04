-- Álbum Copa — rode no SQL Editor do Supabase (projeto novo ou existente).
-- Usuários: Authentication no dashboard (e-mail/senha ou o que você já usar no cashflow).
--
-- O catálogo do álbum oficial não vem de API pública: use importação CSV (app) ou INSERTs manuais.
-- Colunas album_number + sticker_kind espelham “número da figurinha” e tipo (brasão, time, jogador…).

create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  album_number int,
  album_code text,
  sticker_kind text not null default 'player',
  api_player_id int unique,
  player_name text not null,
  team_name text not null,
  api_team_id int,
  photo_url text,
  position text,
  shirt_number int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stickers_sticker_kind_check check (
    sticker_kind in ('player', 'crest', 'team', 'special', 'mascot', 'other')
  )
);

-- Um número de álbum por linha (vários NULL são permitidos no Postgres em índice UNIQUE).
create unique index if not exists stickers_album_number_unique
  on public.stickers (album_number);

create unique index if not exists stickers_album_code_unique
  on public.stickers (album_code);

create index if not exists idx_stickers_team_name on public.stickers (team_name);
create index if not exists idx_stickers_player_name_lower on public.stickers (lower(player_name));
create index if not exists idx_stickers_album_number on public.stickers (album_number);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Colecionador',
  share_collection boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_share
  on public.profiles (share_collection)
  where share_collection = true;

create table if not exists public.user_owned_stickers (
  user_id uuid not null references auth.users (id) on delete cascade,
  sticker_id uuid not null references public.stickers (id) on delete cascade,
  quantity int not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, sticker_id),
  constraint user_owned_quantity_min check (quantity >= 1)
);

create index if not exists idx_user_owned_user on public.user_owned_stickers (user_id);

alter table public.stickers enable row level security;
alter table public.profiles enable row level security;
alter table public.user_owned_stickers enable row level security;

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

drop policy if exists "stickers_select_auth" on public.stickers;
create policy "stickers_select_auth"
  on public.stickers for select
  to authenticated
  using (true);

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

drop policy if exists "uos_insert_own" on public.user_owned_stickers;
create policy "uos_insert_own"
  on public.user_owned_stickers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "uos_delete_own" on public.user_owned_stickers;
create policy "uos_delete_own"
  on public.user_owned_stickers for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "uos_update_own" on public.user_owned_stickers;
create policy "uos_update_own"
  on public.user_owned_stickers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
