-- GymTrack — migração 008: gamificação (XP, níveis, sequência, emblemas, ranking)
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