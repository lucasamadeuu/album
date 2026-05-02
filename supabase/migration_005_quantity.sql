-- Quantidade total de cada figurinha (1 = só no álbum; 4 = 1 no álbum + 3 repetidas).

alter table public.user_owned_stickers
  add column if not exists quantity int;

update public.user_owned_stickers set quantity = 1 where quantity is null;

alter table public.user_owned_stickers alter column quantity set not null;
alter table public.user_owned_stickers alter column quantity set default 1;

alter table public.user_owned_stickers drop constraint if exists user_owned_quantity_min;
alter table public.user_owned_stickers add constraint user_owned_quantity_min check (quantity >= 1);

drop policy if exists "uos_update_own" on public.user_owned_stickers;
create policy "uos_update_own"
  on public.user_owned_stickers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
