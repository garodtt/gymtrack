-- GymTrack — migração 009: treinar junto (treino em dupla)
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