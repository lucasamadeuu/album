-- Se você já rodou migration_002 com índice PARCIAL, o upsert (ON CONFLICT album_number) falha.
-- Rode este bloco UMA vez no SQL Editor do Supabase.

drop index if exists public.stickers_album_number_unique;

create unique index stickers_album_number_unique
  on public.stickers (album_number);
