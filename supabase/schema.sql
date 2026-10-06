-- GymTrack — schema do Supabase
-- Rode no SQL Editor do Supabase, depois rode seed.sql. Pode rodar de novo sem erro.

-- ============ PERFIL ============
create table if not exists public.profiles_gymtrack (
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
create or replace function public.handle_new_user_gymtrack()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles_gymtrack (id) values (new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_gymtrack on auth.users;
create trigger on_auth_user_created_gymtrack
  after insert on auth.users
  for each row execute function public.handle_new_user_gymtrack();

-- ============ CATÁLOGO DE EXERCÍCIOS ============
create table if not exists public.exercises_gymtrack (
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

create unique index if not exists exercises_gymtrack_name_uq
  on public.exercises_gymtrack (name) where user_id is null;

-- ============ ROTINAS ============
create table if not exists public.routines_gymtrack (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade, -- null = modelo público
  name text not null,
  description text,
  source text not null default 'manual' check (source in ('template','ai','manual')),
  is_template boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.routine_days_gymtrack (
  id bigint generated always as identity primary key,
  routine_id bigint not null references public.routines_gymtrack(id) on delete cascade,
  name text not null,                       -- "Treino A — Peito e Tríceps"
  day_order int not null,
  weekdays smallint[] not null default '{}' -- 0=dom ... 6=sáb; vazio = segue o ciclo
);

alter table public.routine_days_gymtrack
  add column if not exists weekdays smallint[] not null default '{}';

create table if not exists public.routine_exercises_gymtrack (
  id bigint generated always as identity primary key,
  routine_day_id bigint not null references public.routine_days_gymtrack(id) on delete cascade,
  exercise_id bigint not null references public.exercises_gymtrack(id),
  position int not null,
  sets int not null default 3,
  reps_min int not null default 8,
  reps_max int not null default 12,
  rest_seconds int not null default 90,
  notes text
);

-- ============ REGISTRO DE TREINOS ============
create table if not exists public.workout_sessions_gymtrack (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_day_id bigint references public.routine_days_gymtrack(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);

create table if not exists public.set_logs_gymtrack (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id bigint not null references public.workout_sessions_gymtrack(id) on delete cascade,
  exercise_id bigint not null references public.exercises_gymtrack(id),
  set_number int not null,
  weight_kg numeric(6,2) not null default 0,
  reps int not null,
  created_at timestamptz default now(),
  unique (session_id, exercise_id, set_number)
);

create index if not exists set_logs_gymtrack_user_ex_idx on public.set_logs_gymtrack (user_id, exercise_id, created_at desc);
create index if not exists workout_sessions_gymtrack_user_idx on public.workout_sessions_gymtrack (user_id, started_at desc);

-- ============ RLS ============
alter table public.profiles_gymtrack          enable row level security;
alter table public.exercises_gymtrack         enable row level security;
alter table public.routines_gymtrack          enable row level security;
alter table public.routine_days_gymtrack      enable row level security;
alter table public.routine_exercises_gymtrack enable row level security;
alter table public.workout_sessions_gymtrack  enable row level security;
alter table public.set_logs_gymtrack          enable row level security;

-- perfil: só o dono
drop policy if exists "profile owner" on public.profiles_gymtrack;
create policy "profile owner" on public.profiles_gymtrack
  for all using (id = auth.uid()) with check (id = auth.uid());

-- exercícios: catálogo público visível; os seus você edita
drop policy if exists "exercises_gymtrack read" on public.exercises_gymtrack;
create policy "exercises_gymtrack read" on public.exercises_gymtrack
  for select to authenticated using (user_id is null or user_id = auth.uid());
drop policy if exists "exercises_gymtrack insert own" on public.exercises_gymtrack;
create policy "exercises_gymtrack insert own" on public.exercises_gymtrack
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "exercises_gymtrack update own" on public.exercises_gymtrack;
create policy "exercises_gymtrack update own" on public.exercises_gymtrack
  for update to authenticated using (user_id = auth.uid());
-- permite gravar o GIF em cache nos exercícios do catálogo
drop policy if exists "exercises_gymtrack cache gif" on public.exercises_gymtrack;
create policy "exercises_gymtrack cache gif" on public.exercises_gymtrack
  for update to authenticated using (user_id is null) with check (user_id is null);

-- rotinas: modelos visíveis; as suas você controla
drop policy if exists "routines_gymtrack read" on public.routines_gymtrack;
create policy "routines_gymtrack read" on public.routines_gymtrack
  for select to authenticated using (is_template or user_id = auth.uid());
drop policy if exists "routines_gymtrack write own" on public.routines_gymtrack;
create policy "routines_gymtrack write own" on public.routines_gymtrack
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "days read" on public.routine_days_gymtrack;
create policy "days read" on public.routine_days_gymtrack
  for select to authenticated using (exists (
    select 1 from public.routines_gymtrack r where r.id = routine_id and (r.is_template or r.user_id = auth.uid())));
drop policy if exists "days write own" on public.routine_days_gymtrack;
create policy "days write own" on public.routine_days_gymtrack
  for all to authenticated using (exists (
    select 1 from public.routines_gymtrack r where r.id = routine_id and r.user_id = auth.uid()))
  with check (exists (
    select 1 from public.routines_gymtrack r where r.id = routine_id and r.user_id = auth.uid()));

drop policy if exists "rex read" on public.routine_exercises_gymtrack;
create policy "rex read" on public.routine_exercises_gymtrack
  for select to authenticated using (exists (
    select 1 from public.routine_days_gymtrack d join public.routines_gymtrack r on r.id = d.routine_id
    where d.id = routine_day_id and (r.is_template or r.user_id = auth.uid())));
drop policy if exists "rex write own" on public.routine_exercises_gymtrack;
create policy "rex write own" on public.routine_exercises_gymtrack
  for all to authenticated using (exists (
    select 1 from public.routine_days_gymtrack d join public.routines_gymtrack r on r.id = d.routine_id
    where d.id = routine_day_id and r.user_id = auth.uid()))
  with check (exists (
    select 1 from public.routine_days_gymtrack d join public.routines_gymtrack r on r.id = d.routine_id
    where d.id = routine_day_id and r.user_id = auth.uid()));

drop policy if exists "sessions own" on public.workout_sessions_gymtrack;
create policy "sessions own" on public.workout_sessions_gymtrack
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sets own" on public.set_logs_gymtrack;
create policy "sets own" on public.set_logs_gymtrack
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ MIGRAÇÃO 003: calistenia ============
alter table public.exercises_gymtrack add column if not exists unit text not null default 'reps';
alter table public.exercises_gymtrack drop constraint if exists exercises_gymtrack_unit_check;
alter table public.exercises_gymtrack add constraint exercises_gymtrack_unit_check check (unit in ('reps', 'segundos'));
alter table public.routines_gymtrack add column if not exists place text not null default 'academia';
alter table public.routines_gymtrack drop constraint if exists routines_gymtrack_place_check;
alter table public.routines_gymtrack add constraint routines_gymtrack_place_check check (place in ('academia', 'casa'));

-- ============ MIGRAÇÃO 004: biblioteca ============
alter table public.exercises_gymtrack add column if not exists instructions text[];
drop policy if exists "exercises_gymtrack delete own" on public.exercises_gymtrack;
create policy "exercises_gymtrack delete own" on public.exercises_gymtrack
  for delete to authenticated using (user_id = auth.uid());

-- ============ MIGRAÇÃO 005: traduções ============
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

-- ============ MIGRAÇÃO 006: ficha dos modelos ============
alter table public.routines_gymtrack add column if not exists level text;          -- iniciante | intermediario | avancado
alter table public.routines_gymtrack add column if not exists goal text;           -- hipertrofia | forca | emagrecimento | condicionamento | gluteos | core
alter table public.routines_gymtrack add column if not exists days_per_week int;
alter table public.routines_gymtrack add column if not exists session_minutes int;

-- ============ MIGRAÇÃO 007: amigos ============
-- ---------- código de amigo no perfil ----------
alter table public.profiles_gymtrack
  add column if not exists friend_code text;

update public.profiles_gymtrack
  set friend_code = upper(substr(md5(random()::text || id::text), 1, 6))
  where friend_code is null;

alter table public.profiles_gymtrack
  alter column friend_code set default upper(substr(md5(random()::text), 1, 6));

create unique index if not exists profiles_gymtrack_friend_code_uq on public.profiles_gymtrack (friend_code);

-- ---------- amizades ----------
create table if not exists public.friendships_gymtrack (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- um único vínculo por par de pessoas, em qualquer direção
create unique index if not exists friendships_gymtrack_pair_uq on public.friendships_gymtrack
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships_gymtrack enable row level security;

drop policy if exists "friendships read" on public.friendships_gymtrack;
create policy "friendships read" on public.friendships_gymtrack
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "friendships request" on public.friendships_gymtrack;
create policy "friendships request" on public.friendships_gymtrack
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "friendships accept" on public.friendships_gymtrack;
create policy "friendships accept" on public.friendships_gymtrack
  for update to authenticated using (addressee_id = auth.uid()) with check (status = 'accepted');

drop policy if exists "friendships remove" on public.friendships_gymtrack;
create policy "friendships remove" on public.friendships_gymtrack
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

-- ---------- funções (mostram só o necessário dos amigos) ----------
-- achar alguém pelo código (devolve só id e nome)
create or replace function public.find_profile_by_code_gymtrack(p_code text)
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(trim(p.name), ''), 'Sem nome')
  from public.profiles_gymtrack p
  where p.friend_code = upper(trim(p_code)) and p.id <> auth.uid()
  limit 1;
$$;

-- meus amigos e pedidos, com resumo de treinos
create or replace function public.friends_list_gymtrack()
returns table (friendship_id bigint, friend_id uuid, name text, status text, incoming boolean,
               workouts_7d int, last_workout timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id,
         o.id,
         coalesce(nullif(trim(o.name), ''), 'Sem nome'),
         f.status,
         f.addressee_id = auth.uid(),
         case when f.status = 'accepted' then (
           select count(*)::int from public.workout_sessions_gymtrack s
           where s.user_id = o.id and s.finished_at is not null and s.started_at > now() - interval '7 days'
         ) end,
         case when f.status = 'accepted' then (
           select max(s.started_at) from public.workout_sessions_gymtrack s
           where s.user_id = o.id and s.finished_at is not null
         ) end
  from public.friendships_gymtrack f
  join public.profiles_gymtrack o
    on o.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by f.status desc, f.created_at desc;
$$;

-- feed: treinos finalizados dos amigos (resumo)
create or replace function public.friend_feed_gymtrack(p_limit int default 30)
returns table (session_id bigint, user_id uuid, name text, day_name text,
               started_at timestamptz, finished_at timestamptz, sets int, volume numeric)
language sql stable security definer set search_path = public as $$
  with friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as id
    from public.friendships_gymtrack
    where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  )
  select s.id, s.user_id, coalesce(nullif(trim(p.name), ''), 'Sem nome'), d.name,
         s.started_at, s.finished_at,
         (select count(*)::int from public.set_logs_gymtrack l where l.session_id = s.id),
         (select coalesce(sum(l.weight_kg * l.reps), 0) from public.set_logs_gymtrack l
            join public.exercises_gymtrack e on e.id = l.exercise_id
            where l.session_id = s.id and e.unit = 'reps')
  from public.workout_sessions_gymtrack s
  join friends fr on fr.id = s.user_id
  join public.profiles_gymtrack p on p.id = s.user_id
  left join public.routine_days_gymtrack d on d.id = s.routine_day_id
  where s.finished_at is not null
  order by s.started_at desc
  limit least(coalesce(p_limit, 30), 100);
$$;

revoke all on function public.find_profile_by_code_gymtrack(text) from public, anon;
revoke all on function public.friends_list_gymtrack() from public, anon;
revoke all on function public.friend_feed_gymtrack(int) from public, anon;
grant execute on function public.find_profile_by_code_gymtrack(text) to authenticated;
grant execute on function public.friends_list_gymtrack() to authenticated;
grant execute on function public.friend_feed_gymtrack(int) to authenticated;

-- ============ MIGRAÇÃO 008: gamificação ============
-- Tudo é calculado a partir dos treinos reais. Regras:
--   XP por treino finalizado = 50 + 2 por série (máx. 40 séries) + 25 por recorde pessoal (máx. 3 por treino)
--   Recorde pessoal = carga maior do que qualquer carga anterior no mesmo exercício
--   Sequência = semanas seguidas (seg–dom) batendo a meta de dias por semana do perfil

create table if not exists public.user_badges_gymtrack (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);
alter table public.user_badges_gymtrack enable row level security;
drop policy if exists "badges own read" on public.user_badges_gymtrack;
create policy "badges own read" on public.user_badges_gymtrack
  for select to authenticated using (user_id = auth.uid());

-- ---------- XP de cada treino ----------
create or replace function public.session_xp_gymtrack(p_user uuid)
returns table (session_id bigint, started_at timestamptz, week date, sets int, prs int, volume numeric, xp int)
language sql stable security definer set search_path = public as $$
  with s as (
    select ws.id, ws.started_at
    from workout_sessions_gymtrack ws
    where ws.user_id = p_user and ws.finished_at is not null
  ),
  l as (
    select sl.session_id, sl.exercise_id, sl.weight_kg, sl.reps, s.started_at, e.unit
    from set_logs_gymtrack sl
    join s on s.id = sl.session_id
    join exercises_gymtrack e on e.id = sl.exercise_id
  ),
  best as ( -- maior carga por exercício em cada treino
    select session_id, exercise_id, started_at, max(weight_kg) as w
    from l where unit = 'reps' and weight_kg > 0
    group by 1, 2, 3
  ),
  pr as ( -- recorde: maior que tudo antes (precisa ter histórico anterior)
    select b.session_id, count(*)::int as n
    from best b
    where b.w > (select max(b2.w) from best b2
                 where b2.exercise_id = b.exercise_id and b2.started_at < b.started_at)
    group by 1
  )
  select s.id,
         s.started_at,
         (date_trunc('week', s.started_at at time zone 'America/Sao_Paulo'))::date,
         coalesce(cnt.n, 0),
         coalesce(pr.n, 0),
         coalesce(cnt.vol, 0),
         50 + least(coalesce(cnt.n, 0), 40) * 2 + least(coalesce(pr.n, 0), 3) * 25
  from s
  left join (select session_id, count(*)::int n,
                    sum(case when unit = 'reps' then weight_kg * reps else 0 end) vol
             from l group by 1) cnt on cnt.session_id = s.id
  left join pr on pr.session_id = s.id;
$$;

-- ---------- resumo do jogador (e grava emblemas novos) ----------
create or replace function public.gamification_gymtrack()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target int;
  total_xp int; week_xp int; workouts int; total_prs int; total_volume numeric; max_session_volume numeric;
  streak int := 0; wk date; cur_week date;
  perfect_week boolean;
  friends int; own_exercises int; home_workouts int;
  early boolean; late boolean; weekend boolean;
  earned text[] := '{}';
  new_badges text[];
  lvl int; lvl_floor int; lvl_next int;
  thresholds int[] := array[0, 150, 400, 800, 1400, 2200, 3300, 4700, 6500, 9000, 12000];
begin
  if me is null then return null; end if;

  select greatest(coalesce(days_per_week, 3), 1) into target from profiles_gymtrack where id = me;
  target := coalesce(target, 3);

  cur_week := (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date;
  select coalesce(sum(xp), 0), count(*), coalesce(sum(prs), 0), coalesce(sum(volume), 0), coalesce(max(volume), 0)
    into total_xp, workouts, total_prs, total_volume, max_session_volume from session_xp_gymtrack(me) _xp;
  select coalesce(sum(xp), 0) into week_xp from session_xp_gymtrack(me) _xp where week = cur_week;

  -- sequência de semanas batendo a meta (a semana atual conta se já bateu)
  wk := cur_week;
  if (select count(*) from session_xp_gymtrack(me) _xp where week = wk) < target then wk := wk - 7; end if;
  while (select count(*) from session_xp_gymtrack(me) _xp where week = wk) >= target loop
    streak := streak + 1; wk := wk - 7;
  end loop;
  perfect_week := exists (select 1 from session_xp_gymtrack(me) _xp group by week having count(*) >= target);

  select count(*) into friends from friendships_gymtrack
    where status = 'accepted' and me in (requester_id, addressee_id);
  select count(*) into own_exercises from exercises_gymtrack where user_id = me;
  select count(*) into home_workouts from workout_sessions_gymtrack ws
    join routine_days_gymtrack d on d.id = ws.routine_day_id
    join routines_gymtrack r on r.id = d.routine_id
    where ws.user_id = me and ws.finished_at is not null and r.place = 'casa';
  select bool_or(extract(hour from started_at at time zone 'America/Sao_Paulo') < 7),
         bool_or(extract(hour from started_at at time zone 'America/Sao_Paulo') >= 21)
    into early, late from session_xp_gymtrack(me) _xp;
  select exists (
    select 1 from session_xp_gymtrack(me) _xp group by week
    having bool_or(extract(isodow from started_at at time zone 'America/Sao_Paulo') = 6)
       and bool_or(extract(isodow from started_at at time zone 'America/Sao_Paulo') = 7)
  ) into weekend;

  -- emblemas conquistados
  if workouts >= 1   then earned := array_append(earned, 'primeiro_treino'); end if;
  if workouts >= 10  then earned := array_append(earned, 'treinos_10'); end if;
  if workouts >= 50  then earned := array_append(earned, 'treinos_50'); end if;
  if workouts >= 100 then earned := array_append(earned, 'treinos_100'); end if;
  if perfect_week    then earned := array_append(earned, 'semana_perfeita'); end if;
  if streak >= 4     then earned := array_append(earned, 'sequencia_4'); end if;
  if streak >= 12    then earned := array_append(earned, 'sequencia_12'); end if;
  if total_prs >= 1  then earned := array_append(earned, 'recorde_1'); end if;
  if total_prs >= 10 then earned := array_append(earned, 'recorde_10'); end if;
  if total_prs >= 50 then earned := array_append(earned, 'recorde_50'); end if;
  if max_session_volume >= 1000  then earned := array_append(earned, 'tonelada_treino'); end if;
  if total_volume >= 10000       then earned := array_append(earned, 'toneladas_10'); end if;
  if total_volume >= 100000      then earned := array_append(earned, 'toneladas_100'); end if;
  if coalesce(early, false)      then earned := array_append(earned, 'madrugador'); end if;
  if coalesce(late, false)       then earned := array_append(earned, 'coruja'); end if;
  if weekend                     then earned := array_append(earned, 'fim_de_semana'); end if;
  if friends >= 1                then earned := array_append(earned, 'social'); end if;
  if friends >= 5                then earned := array_append(earned, 'galera'); end if;
  if own_exercises >= 1          then earned := array_append(earned, 'explorador'); end if;
  if home_workouts >= 1          then earned := array_append(earned, 'em_casa'); end if;

  -- grava e descobre os novos
  with ins as (
    insert into user_badges_gymtrack (user_id, badge)
    select me, b from unnest(earned) b
    on conflict do nothing
    returning badge
  ) select coalesce(array_agg(badge), '{}') into new_badges from ins;

  -- nível
  lvl := 1;
  for i in 1 .. array_length(thresholds, 1) loop
    if total_xp >= thresholds[i] then lvl := i; end if;
  end loop;
  lvl_floor := thresholds[lvl];
  lvl_next := case when lvl < array_length(thresholds, 1) then thresholds[lvl + 1] else null end;

  return jsonb_build_object(
    'total_xp', total_xp, 'week_xp', week_xp, 'workouts', workouts,
    'level', lvl, 'level_floor', lvl_floor, 'level_next', lvl_next,
    'streak_weeks', streak, 'week_target', target,
    'week_workouts', (select count(*) from session_xp_gymtrack(me) _xp where week = cur_week),
    'total_prs', total_prs, 'total_volume', total_volume,
    'badges', (select coalesce(jsonb_agg(jsonb_build_object('badge', badge, 'earned_at', earned_at) order by earned_at), '[]')
               from user_badges_gymtrack where user_id = me),
    'new_badges', to_jsonb(new_badges),
    'last_session', (select jsonb_build_object('session_id', session_id, 'xp', xp, 'prs', prs, 'sets', sets)
                     from session_xp_gymtrack(me) _xp order by started_at desc limit 1)
  );
end;
$$;

-- ---------- ranking da semana (você + amigos) ----------
create or replace function public.weekly_ranking_gymtrack()
returns table (user_id uuid, name text, week_xp int, workouts int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select auth.uid() as id
    union
    select case when requester_id = auth.uid() then addressee_id else requester_id end
    from friendships_gymtrack
    where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  )
  select p.id,
         coalesce(nullif(trim(pr.name), ''), 'Sem nome'),
         coalesce((select sum(x.xp) from session_xp_gymtrack(p.id) x
                   where x.week = (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date), 0)::int,
         coalesce((select count(*) from session_xp_gymtrack(p.id) x
                   where x.week = (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date), 0)::int,
         p.id = auth.uid()
  from people p
  left join profiles_gymtrack pr on pr.id = p.id
  where p.id is not null
  order by 3 desc, 2;
$$;

revoke all on function public.session_xp_gymtrack(uuid) from public, anon, authenticated;
revoke all on function public.gamification_gymtrack() from public, anon;
revoke all on function public.weekly_ranking_gymtrack() from public, anon;
grant execute on function public.gamification_gymtrack() to authenticated;
grant execute on function public.weekly_ranking_gymtrack() to authenticated;

-- ============ MIGRAÇÃO 009: treinar junto ============
create table if not exists public.joint_workouts_gymtrack (
  id bigint generated always as identity primary key,
  creator_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  place text not null default 'academia',
  plan jsonb not null,               -- { explanation, exercises: [{ exercise_id, rest_seconds, notes, creator:{sets,reps_min,reps_max}, partner:{...} }] }
  created_at timestamptz not null default now()
);
create index if not exists joint_workouts_gymtrack_people_idx on public.joint_workouts_gymtrack (creator_id, partner_id, created_at desc);

alter table public.joint_workouts_gymtrack enable row level security;
drop policy if exists "joint read" on public.joint_workouts_gymtrack;
create policy "joint read" on public.joint_workouts_gymtrack
  for select to authenticated using (auth.uid() in (creator_id, partner_id));
drop policy if exists "joint create" on public.joint_workouts_gymtrack;
create policy "joint create" on public.joint_workouts_gymtrack
  for insert to authenticated with check (
    creator_id = auth.uid() and exists (
      select 1 from public.friendships_gymtrack f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(creator_id, partner_id)
        and greatest(f.requester_id, f.addressee_id) = greatest(creator_id, partner_id)));
drop policy if exists "joint delete" on public.joint_workouts_gymtrack;
create policy "joint delete" on public.joint_workouts_gymtrack
  for delete to authenticated using (auth.uid() in (creator_id, partner_id));

-- sessões de treino podem vir de um treino em dupla
alter table public.workout_sessions_gymtrack
  add column if not exists joint_workout_id bigint references public.joint_workouts_gymtrack(id) on delete set null;

-- contexto para a IA: perfil dos dois + grupos musculares treinados nos últimos 4 dias
create or replace function public.joint_context_gymtrack(p_friend uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not exists (
    select 1 from friendships_gymtrack
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(me, p_friend)
      and greatest(requester_id, addressee_id) = greatest(me, p_friend)
  ) then
    raise exception 'Vocês precisam ser amigos para treinar junto';
  end if;

  return jsonb_build_object(
    'me', (select ctx from (select jsonb_build_object(
              'name', coalesce(nullif(trim(p.name), ''), 'Você'), 'goal', p.goal, 'level', p.level,
              'session_minutes', p.session_minutes, 'equipment', p.equipment, 'notes', p.notes) ctx
            from profiles_gymtrack p where p.id = me) x),
    'partner', (select ctx from (select jsonb_build_object(
              'name', coalesce(nullif(trim(p.name), ''), 'Amigo'), 'goal', p.goal, 'level', p.level,
              'session_minutes', p.session_minutes, 'equipment', p.equipment, 'notes', p.notes) ctx
            from profiles_gymtrack p where p.id = p_friend) x),
    'me_recent', (select coalesce(jsonb_agg(distinct e.muscle_group), '[]') from set_logs_gymtrack l
                  join workout_sessions_gymtrack s on s.id = l.session_id
                  join exercises_gymtrack e on e.id = l.exercise_id
                  where s.user_id = me and s.started_at > now() - interval '4 days'),
    'partner_recent', (select coalesce(jsonb_agg(distinct e.muscle_group), '[]') from set_logs_gymtrack l
                  join workout_sessions_gymtrack s on s.id = l.session_id
                  join exercises_gymtrack e on e.id = l.exercise_id
                  where s.user_id = p_friend and s.started_at > now() - interval '4 days')
  );
end;
$$;

-- nomes dos participantes de um treino em dupla
create or replace function public.joint_people_gymtrack(p_joint bigint)
returns table (creator_name text, partner_name text)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(c.name), ''), 'Sem nome'), coalesce(nullif(trim(p.name), ''), 'Sem nome')
  from joint_workouts_gymtrack j
  join profiles_gymtrack c on c.id = j.creator_id
  join profiles_gymtrack p on p.id = j.partner_id
  where j.id = p_joint and auth.uid() in (j.creator_id, j.partner_id);
$$;

-- feed: mostra o título do treino em dupla
create or replace function public.friend_feed_gymtrack(p_limit int default 30)
returns table (session_id bigint, user_id uuid, name text, day_name text,
               started_at timestamptz, finished_at timestamptz, sets int, volume numeric)
language sql stable security definer set search_path = public as $$
  with friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as id
    from public.friendships_gymtrack
    where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  )
  select s.id, s.user_id, coalesce(nullif(trim(p.name), ''), 'Sem nome'), coalesce(d.name, j.title),
         s.started_at, s.finished_at,
         (select count(*)::int from public.set_logs_gymtrack l where l.session_id = s.id),
         (select coalesce(sum(l.weight_kg * l.reps), 0) from public.set_logs_gymtrack l
            join public.exercises_gymtrack e on e.id = l.exercise_id
            where l.session_id = s.id and e.unit = 'reps')
  from public.workout_sessions_gymtrack s
  join friends fr on fr.id = s.user_id
  join public.profiles_gymtrack p on p.id = s.user_id
  left join public.routine_days_gymtrack d on d.id = s.routine_day_id
  left join public.joint_workouts_gymtrack j on j.id = s.joint_workout_id
  where s.finished_at is not null
  order by s.started_at desc
  limit least(coalesce(p_limit, 30), 100);
$$;

-- gamificação: novo emblema "dupla"
create or replace function public.gamification_gymtrack()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target int;
  total_xp int; week_xp int; workouts int; total_prs int; total_volume numeric; max_session_volume numeric;
  streak int := 0; wk date; cur_week date;
  perfect_week boolean;
  friends int; own_exercises int; home_workouts int; joint_workouts int;
  early boolean; late boolean; weekend boolean;
  earned text[] := '{}';
  new_badges text[];
  lvl int; lvl_floor int; lvl_next int;
  thresholds int[] := array[0, 150, 400, 800, 1400, 2200, 3300, 4700, 6500, 9000, 12000];
begin
  if me is null then return null; end if;

  select greatest(coalesce(days_per_week, 3), 1) into target from profiles_gymtrack where id = me;
  target := coalesce(target, 3);

  cur_week := (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date;
  select coalesce(sum(xp), 0), count(*), coalesce(sum(prs), 0), coalesce(sum(volume), 0), coalesce(max(volume), 0)
    into total_xp, workouts, total_prs, total_volume, max_session_volume from session_xp_gymtrack(me) _xp;
  select coalesce(sum(xp), 0) into week_xp from session_xp_gymtrack(me) _xp where week = cur_week;

  -- sequência de semanas batendo a meta (a semana atual conta se já bateu)
  wk := cur_week;
  if (select count(*) from session_xp_gymtrack(me) _xp where week = wk) < target then wk := wk - 7; end if;
  while (select count(*) from session_xp_gymtrack(me) _xp where week = wk) >= target loop
    streak := streak + 1; wk := wk - 7;
  end loop;
  perfect_week := exists (select 1 from session_xp_gymtrack(me) _xp group by week having count(*) >= target);

  select count(*) into friends from friendships_gymtrack
    where status = 'accepted' and me in (requester_id, addressee_id);
  select count(*) into own_exercises from exercises_gymtrack where user_id = me;
  select count(*) into home_workouts from workout_sessions_gymtrack ws
    join routine_days_gymtrack d on d.id = ws.routine_day_id
    join routines_gymtrack r on r.id = d.routine_id
    where ws.user_id = me and ws.finished_at is not null and r.place = 'casa';
  select count(*) into joint_workouts from workout_sessions_gymtrack
    where user_id = me and finished_at is not null and joint_workout_id is not null;
  select bool_or(extract(hour from started_at at time zone 'America/Sao_Paulo') < 7),
         bool_or(extract(hour from started_at at time zone 'America/Sao_Paulo') >= 21)
    into early, late from session_xp_gymtrack(me) _xp;
  select exists (
    select 1 from session_xp_gymtrack(me) _xp group by week
    having bool_or(extract(isodow from started_at at time zone 'America/Sao_Paulo') = 6)
       and bool_or(extract(isodow from started_at at time zone 'America/Sao_Paulo') = 7)
  ) into weekend;

  -- emblemas conquistados
  if workouts >= 1   then earned := array_append(earned, 'primeiro_treino'); end if;
  if workouts >= 10  then earned := array_append(earned, 'treinos_10'); end if;
  if workouts >= 50  then earned := array_append(earned, 'treinos_50'); end if;
  if workouts >= 100 then earned := array_append(earned, 'treinos_100'); end if;
  if perfect_week    then earned := array_append(earned, 'semana_perfeita'); end if;
  if streak >= 4     then earned := array_append(earned, 'sequencia_4'); end if;
  if streak >= 12    then earned := array_append(earned, 'sequencia_12'); end if;
  if total_prs >= 1  then earned := array_append(earned, 'recorde_1'); end if;
  if total_prs >= 10 then earned := array_append(earned, 'recorde_10'); end if;
  if total_prs >= 50 then earned := array_append(earned, 'recorde_50'); end if;
  if max_session_volume >= 1000  then earned := array_append(earned, 'tonelada_treino'); end if;
  if total_volume >= 10000       then earned := array_append(earned, 'toneladas_10'); end if;
  if total_volume >= 100000      then earned := array_append(earned, 'toneladas_100'); end if;
  if coalesce(early, false)      then earned := array_append(earned, 'madrugador'); end if;
  if coalesce(late, false)       then earned := array_append(earned, 'coruja'); end if;
  if weekend                     then earned := array_append(earned, 'fim_de_semana'); end if;
  if friends >= 1                then earned := array_append(earned, 'social'); end if;
  if friends >= 5                then earned := array_append(earned, 'galera'); end if;
  if own_exercises >= 1          then earned := array_append(earned, 'explorador'); end if;
  if home_workouts >= 1          then earned := array_append(earned, 'em_casa'); end if;
  if joint_workouts >= 1         then earned := array_append(earned, 'dupla'); end if;

  -- grava e descobre os novos
  with ins as (
    insert into user_badges_gymtrack (user_id, badge)
    select me, b from unnest(earned) b
    on conflict do nothing
    returning badge
  ) select coalesce(array_agg(badge), '{}') into new_badges from ins;

  -- nível
  lvl := 1;
  for i in 1 .. array_length(thresholds, 1) loop
    if total_xp >= thresholds[i] then lvl := i; end if;
  end loop;
  lvl_floor := thresholds[lvl];
  lvl_next := case when lvl < array_length(thresholds, 1) then thresholds[lvl + 1] else null end;

  return jsonb_build_object(
    'total_xp', total_xp, 'week_xp', week_xp, 'workouts', workouts,
    'level', lvl, 'level_floor', lvl_floor, 'level_next', lvl_next,
    'streak_weeks', streak, 'week_target', target,
    'week_workouts', (select count(*) from session_xp_gymtrack(me) _xp where week = cur_week),
    'total_prs', total_prs, 'total_volume', total_volume,
    'badges', (select coalesce(jsonb_agg(jsonb_build_object('badge', badge, 'earned_at', earned_at) order by earned_at), '[]')
               from user_badges_gymtrack where user_id = me),
    'new_badges', to_jsonb(new_badges),
    'last_session', (select jsonb_build_object('session_id', session_id, 'xp', xp, 'prs', prs, 'sets', sets)
                     from session_xp_gymtrack(me) _xp order by started_at desc limit 1)
  );
end;
$$;


revoke all on function public.joint_context_gymtrack(uuid) from public, anon;
revoke all on function public.joint_people_gymtrack(bigint) from public, anon;
grant execute on function public.joint_context_gymtrack(uuid) to authenticated;
grant execute on function public.joint_people_gymtrack(bigint) to authenticated;
grant execute on function public.gamification_gymtrack() to authenticated;

-- ============ MIGRAÇÃO 010: agenda ============
-- Cada item: um dia da semana + o que fazer (treino de rotina, treino com amigo ou descanso).
create table if not exists public.schedule_gymtrack (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = domingo ... 6 = sábado
  kind text not null check (kind in ('routine', 'friend', 'rest')),
  routine_day_id bigint references public.routine_days_gymtrack(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  muscle_groups text[] not null default '{}',
  place text not null default 'academia',
  minutes int not null default 60,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists schedule_gymtrack_user_idx on public.schedule_gymtrack (user_id, weekday, position);
create index if not exists schedule_gymtrack_friend_idx on public.schedule_gymtrack (friend_id, weekday);

alter table public.schedule_gymtrack enable row level security;
drop policy if exists "schedule own" on public.schedule_gymtrack;
create policy "schedule own" on public.schedule_gymtrack
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- itens da agenda de AMIGOS que marcaram treino comigo
create or replace function public.agenda_with_me_gymtrack()
returns table (id bigint, owner_id uuid, owner_name text, weekday smallint,
               muscle_groups text[], place text, minutes int)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, coalesce(nullif(trim(p.name), ''), 'Amigo'), s.weekday, s.muscle_groups, s.place, s.minutes
  from schedule_gymtrack s
  join profiles_gymtrack p on p.id = s.user_id
  where s.kind = 'friend' and s.friend_id = auth.uid()
    and exists (select 1 from friendships_gymtrack f
                where f.status = 'accepted'
                  and least(f.requester_id, f.addressee_id) = least(s.user_id, s.friend_id)
                  and greatest(f.requester_id, f.addressee_id) = greatest(s.user_id, s.friend_id));
$$;
revoke all on function public.agenda_with_me_gymtrack() from public, anon;
grant execute on function public.agenda_with_me_gymtrack() to authenticated;

-- ============ MIGRAÇÃO 011: dupla por dia da semana ============
alter table public.joint_workouts_gymtrack
  add column if not exists weekday smallint check (weekday between 0 and 6);