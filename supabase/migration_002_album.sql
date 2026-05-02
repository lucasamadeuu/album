-- Rode depois do schema.sql se o projeto já existia.
-- Campos para espelhar o álbum oficial: número, tipo (brasão, time, jogador…), textos e URL de imagem opcional.

alter table public.stickers
  add column if not exists album_number int,
  add column if not exists sticker_kind text not null default 'player';

alter table public.stickers drop constraint if exists stickers_sticker_kind_check;

alter table public.stickers add constraint stickers_sticker_kind_check
  check (sticker_kind in ('player', 'crest', 'team', 'special', 'mascot', 'other'));

-- Índice único completo (não parcial): necessário para upsert ON CONFLICT (album_number) no PostgREST/Supabase.
create unique index if not exists stickers_album_number_unique
  on public.stickers (album_number);

create index if not exists idx_stickers_album_number on public.stickers (album_number);
