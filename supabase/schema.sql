-- sketchcards schema. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

create table if not exists public.decks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 200),
  default_answer_mode text not null default 'flip' check (default_answer_mode in ('flip', 'draw')),
  new_per_day         int check (new_per_day is null or new_per_day between 0 and 1000), -- null = use account default
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.cards (
  id           uuid primary key default gen_random_uuid(),
  deck_id      uuid not null references public.decks(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  front_text   text not null default '',
  front_image  text,           -- storage path ("<uid>/<file>.webp") or URL ("/starter/ala.svg")
  back_text    text not null default '',
  back_image   text,
  back_strokes jsonb,          -- sketched reference answer: [{ points: [[x,y,p],...], pen: bool }]
  answer_mode  text not null default 'flip' check (answer_mode in ('flip', 'draw')),
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.progress (
  card_id         uuid primary key references public.cards(id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ease            real not null default 2.5,
  interval_days   int  not null default 0,
  repetitions     int  not null default 0,
  due_date        date not null default current_date,
  last_grade      text check (last_grade in ('missed', 'close', 'got')),
  first_studied_on date not null default current_date, -- used for the "new cards per day" limit
  updated_at      timestamptz not null default now()
);

-- ───────────────────────── Indexes ─────────────────────────

create index if not exists progress_user_due_idx on public.progress (user_id, due_date);
create index if not exists cards_deck_idx        on public.cards (deck_id);
create index if not exists cards_user_idx        on public.cards (user_id);
create index if not exists decks_user_idx        on public.decks (user_id);

-- ─────────────── Last-write-wins on updated_at ───────────────
-- Clients set updated_at themselves (so offline edits keep their real time).
-- An UPDATE carrying an older updated_at than the stored row is silently skipped.

create or replace function public.lww_guard() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at then
    return null; -- keep the newer row
  end if;
  return new;
end $$;

drop trigger if exists decks_lww on public.decks;
create trigger decks_lww before update on public.decks
  for each row execute function public.lww_guard();
drop trigger if exists cards_lww on public.cards;
create trigger cards_lww before update on public.cards
  for each row execute function public.lww_guard();
drop trigger if exists progress_lww on public.progress;
create trigger progress_lww before update on public.progress
  for each row execute function public.lww_guard();

-- ───────────────────── Row Level Security ─────────────────────

alter table public.decks    enable row level security;
alter table public.cards    enable row level security;
alter table public.progress enable row level security;

drop policy if exists "own decks" on public.decks;
create policy "own decks" on public.decks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own cards" on public.cards;
create policy "own cards" on public.cards
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  );

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

-- ───────────────────── Storage: card-images ─────────────────────
-- Private bucket; each user may only touch objects under "<their uid>/...".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', false, 2097152,
        array['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "card-images read own"   on storage.objects;
drop policy if exists "card-images insert own" on storage.objects;
drop policy if exists "card-images update own" on storage.objects;
drop policy if exists "card-images delete own" on storage.objects;

create policy "card-images read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card-images insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card-images update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card-images delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);
