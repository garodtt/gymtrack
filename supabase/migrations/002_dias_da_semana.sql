-- GymTrack — migração 002: dias da semana em cada treino da rotina
-- 0 = domingo, 1 = segunda, ..., 6 = sábado. Vazio = segue o ciclo A → B → C.
alter table public.routine_days_gymtrack
  add column if not exists weekdays smallint[] not null default '{}';