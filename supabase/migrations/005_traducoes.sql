-- GymTrack — migração 005: traduções do ExerciseDB guardadas no banco
-- Cada exercício é traduzido uma vez e reaproveitado em qualquer aparelho.
create table if not exists public.exercise_translations_gymtrack (
  exercisedb_id text primary key,
  name_pt text,
  instructions_pt text[],
  updated_at timestamptz not null default now()
);

alter table public.exercise_translations_gymtrack enable row level security;

drop policy if exists "translations_gymtrack read" on public.exercise_translations_gymtrack;
create policy "translations_gymtrack read" on public.exercise_translations_gymtrack
  for select to authenticated using (true);

drop policy if exists "translations_gymtrack write" on public.exercise_translations_gymtrack;
create policy "translations_gymtrack write" on public.exercise_translations_gymtrack
  for insert to authenticated with check (true);

drop policy if exists "translations_gymtrack update" on public.exercise_translations_gymtrack;
create policy "translations_gymtrack update" on public.exercise_translations_gymtrack
  for update to authenticated using (true) with check (true);