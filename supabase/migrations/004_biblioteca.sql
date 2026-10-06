-- GymTrack — migração 004: biblioteca de exercícios
-- passo a passo da execução (em português)
alter table public.exercises_gymtrack
  add column if not exists instructions text[];

-- permite excluir os exercícios que você mesmo criou/adicionou
drop policy if exists "exercises_gymtrack delete own" on public.exercises_gymtrack;
create policy "exercises_gymtrack delete own" on public.exercises_gymtrack
  for delete to authenticated using (user_id = auth.uid());