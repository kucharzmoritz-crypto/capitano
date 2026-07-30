-- =====================================================================
--  Kapitaenswahl - PostgreSQL Schema fuer Supabase
--  Einfuegen unter: Supabase Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

-- 1) Tabelle mit den Stimmen ------------------------------------------
--    Bewusst OHNE Namen, E-Mail oder IP. Der voter_token ist ein
--    Zufallswert aus dem Browser und laesst keinen Rueckschluss auf
--    eine Person zu - er verhindert nur doppeltes Abstimmen.

create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  candidate   text not null,
  voter_token text not null unique,
  created_at  timestamptz not null default now(),
  constraint votes_candidate_allowed check (
    candidate in ('David', 'Tim', 'Patrick', 'Alex', 'Perparim', 'Lukas F', 'Moritz')
  )
);

-- 2) Row Level Security ----------------------------------------------
--    Standardmaessig ist damit alles verboten. Erlaubt wird genau
--    eine Sache: das Einfuegen einer Stimme.

alter table public.votes enable row level security;

drop policy if exists "stimme abgeben" on public.votes;
create policy "stimme abgeben"
  on public.votes
  for insert
  to anon
  with check (true);

-- Kein select/update/delete fuer anon: niemand kann ueber die Website
-- einzelne Stimmen auslesen, aendern oder loeschen.

-- 3) Ergebnis-View ----------------------------------------------------
--    Liefert nur die Summen pro Kandidat, keine Einzelstimmen.
--    security_invoker = off => die View darf die Tabelle lesen,
--    obwohl anon das nicht darf.

create or replace view public.results
with (security_invoker = off) as
  select candidate, count(*)::int as stimmen
  from public.votes
  group by candidate;

grant select on public.results to anon;

-- =====================================================================
--  Nuetzliche Abfragen fuer dich im SQL Editor
-- =====================================================================

-- Aktueller Stand inkl. Kandidaten mit 0 Stimmen:
--   select c.candidate, coalesce(r.stimmen, 0) as stimmen
--   from (values ('David'),('Tim'),('Patrick'),('Alex'),
--                ('Perparim'),('Lukas F'),('Moritz')) as c(candidate)
--   left join public.results r on r.candidate = c.candidate
--   order by stimmen desc, c.candidate;

-- Wahl zuruecksetzen (Achtung: loescht alle Stimmen):
--   truncate public.votes;

-- Abstimmung schliessen (danach schlaegt jedes Einfuegen fehl):
--   drop policy "stimme abgeben" on public.votes;
