-- GymTrack — migração 003: treino em casa (calistenia)
-- unidade do exercício: repetições ou segundos (prancha, polichinelo...)
alter table public.exercises_gymtrack
  add column if not exists unit text not null default 'reps';
alter table public.exercises_gymtrack drop constraint if exists exercises_gymtrack_unit_check;
alter table public.exercises_gymtrack
  add constraint exercises_gymtrack_unit_check check (unit in ('reps', 'segundos'));

-- onde a rotina é feita
alter table public.routines_gymtrack
  add column if not exists place text not null default 'academia';
alter table public.routines_gymtrack drop constraint if exists routines_gymtrack_place_check;
alter table public.routines_gymtrack
  add constraint routines_gymtrack_place_check check (place in ('academia', 'casa'));

-- novo grupo: cardio (burpee, polichinelo...)
-- (muscle_group é texto livre, não precisa de alteração)