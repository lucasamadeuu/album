-- Código do checklist Panini (ex.: BRA3, SUI12, FWC1). Rode no SQL Editor.

alter table public.stickers
  add column if not exists album_code text;

create unique index if not exists stickers_album_code_unique
  on public.stickers (album_code);
