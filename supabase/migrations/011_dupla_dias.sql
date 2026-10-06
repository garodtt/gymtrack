-- GymTrack — migração 011: treino em dupla ligado a um dia da semana (se repete toda semana)
alter table public.joint_workouts_gymtrack
  add column if not exists weekday smallint check (weekday between 0 and 6);