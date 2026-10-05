-- GymTrack — schema do Supabase
-- Rode no SQL Editor do Supabase (uma vez), depois rode seed.sql.

-- ============ PERFIL ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  goal text default 'hipertrofia',          -- hipertrofia | forca | emagrecimento | condicionamento
  level text default 'iniciante',           -- iniciante | intermediario | avancado
  days_per_week int default 3 check (days_per_week between 1 and 7),
  session_minutes int default 60,
  equipment text[] default array['academia completa'],
  notes text,                               -- lesões, preferências etc.
  created_at timestamptz default now()
);

-- cria o perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ CATÁLOGO DE EXERCÍCIOS ============
create table if not exists public.exercises (
  id bigint generated always as identity primary key,
  name text not null,                       -- nome em português
  muscle_group text not null,               -- peito, costas, pernas, ombros, biceps, triceps, core, gluteos, panturrilha
  body_region text not null default 'superior' check (body_region in ('superior','inferior','core')),
  equipment text,
  exercisedb_query text,                    -- termo em inglês para buscar no ExerciseDB
  exercisedb_id text,                       -- preenchido na 1ª busca
  gif_url text,                             -- preenchido na 1ª busca
  youtube_url text,                         -- opcional: vídeo extra
  user_id uuid references auth.users(id) on delete cascade, -- null = catálogo público
  created_at timestamptz default now()
);

create unique index if not exists exercises_catalog_name_uq
  on public.exercises (name) where user_id is null;

-- ============ ROTINAS ============
create table if not exists public.routines (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade, -- null = modelo público
  name text not null,
  description text,
  source text not null default 'manual' check (source in ('template','ai','manual')),
  is_template boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.routine_days (
  id bigint generated always as identity primary key,
  routine_id bigint not null references public.routines(id) on delete cascade,
  name text not null,                       -- "Treino A — Peito e Tríceps"
  day_order int not null
);

create table if not exists public.routine_exercises (
  id bigint generated always as identity primary key,
  routine_day_id bigint not null references public.routine_days(id) on delete cascade,
  exercise_id bigint not null references public.exercises(id),
  position int not null,
  sets int not null default 3,
  reps_min int not null default 8,
  reps_max int not null default 12,
  rest_seconds int not null default 90,
  notes text
);

-- ============ REGISTRO DE TREINOS ============
create table if not exists public.workout_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_day_id bigint references public.routine_days(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);

create table if not exists public.set_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id bigint not null references public.workout_sessions(id) on delete cascade,
  exercise_id bigint not null references public.exercises(id),
  set_number int not null,
  weight_kg numeric(6,2) not null default 0,
  reps int not null,
  created_at timestamptz default now(),
  unique (session_id, exercise_id, set_number)
);

create index if not exists set_logs_user_ex_idx on public.set_logs (user_id, exercise_id, created_at desc);
create index if not exists sessions_user_idx on public.workout_sessions (user_id, started_at desc);

-- ============ RLS ============
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_days      enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.set_logs          enable row level security;

-- perfil: só o dono
create policy "profile owner" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- exercícios: catálogo público visível; os seus você edita
create policy "exercises read" on public.exercises
  for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "exercises insert own" on public.exercises
  for insert to authenticated with check (user_id = auth.uid());
create policy "exercises update own" on public.exercises
  for update to authenticated using (user_id = auth.uid());
-- permite gravar o GIF em cache nos exercícios do catálogo
create policy "exercises cache gif" on public.exercises
  for update to authenticated using (user_id is null) with check (user_id is null);

-- rotinas: modelos visíveis; as suas você controla
create policy "routines read" on public.routines
  for select to authenticated using (is_template or user_id = auth.uid());
create policy "routines write own" on public.routines
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "days read" on public.routine_days
  for select to authenticated using (exists (
    select 1 from public.routines r where r.id = routine_id and (r.is_template or r.user_id = auth.uid())));
create policy "days write own" on public.routine_days
  for all to authenticated using (exists (
    select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()))
  with check (exists (
    select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));

create policy "rex read" on public.routine_exercises
  for select to authenticated using (exists (
    select 1 from public.routine_days d join public.routines r on r.id = d.routine_id
    where d.id = routine_day_id and (r.is_template or r.user_id = auth.uid())));
create policy "rex write own" on public.routine_exercises
  for all to authenticated using (exists (
    select 1 from public.routine_days d join public.routines r on r.id = d.routine_id
    where d.id = routine_day_id and r.user_id = auth.uid()))
  with check (exists (
    select 1 from public.routine_days d join public.routines r on r.id = d.routine_id
    where d.id = routine_day_id and r.user_id = auth.uid()));

create policy "sessions own" on public.workout_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sets own" on public.set_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
