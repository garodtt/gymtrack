-- GymTrack — migração 010: agenda da semana
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