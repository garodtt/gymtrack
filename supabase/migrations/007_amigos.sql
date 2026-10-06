-- GymTrack — migração 007: amigos
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