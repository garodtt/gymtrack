-- GymTrack — cria amigos de TESTE ligados ao seu código de amigo.
-- 1) Troque o código abaixo pelo seu (aparece na aba Amigos).
-- 2) Rode no SQL Editor do Supabase.
-- Cria:
--   • "Ana Teste"   → já é sua amiga, com 4 treinos nos últimos dias (aparece na Atividade)
--   • "Bruno Teste" → te mandou um pedido de amizade (para testar Aceitar/Recusar)
-- Para apagar tudo depois: rode apagar_amigos_teste.sql
do $$
declare
  meu_codigo text := 'F94F47';   -- <<< SEU CÓDIGO AQUI
  me uuid;
  ana uuid := '00000000-0000-4000-8000-0000000a7e57';
  bruno uuid := '00000000-0000-4000-8000-0000000b7e57';
  dia record;
  sessao bigint;
  i int;
begin
  select id into me from public.profiles_gymtrack where friend_code = upper(meu_codigo);
  if me is null then
    raise exception 'Código % não encontrado. Confira o código na aba Amigos.', meu_codigo;
  end if;

  -- usuários de teste (sem senha: não dá para entrar com eles, só aparecem para você)
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (ana,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@teste.gymtrack.local',   now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
    (bruno, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bruno@teste.gymtrack.local', now(), now(), '{"provider":"email","providers":["email"]}', '{}')
  on conflict (id) do nothing;

  insert into public.profiles_gymtrack (id, name) values (ana, 'Ana Teste'), (bruno, 'Bruno Teste')
  on conflict (id) do update set name = excluded.name;

  -- perfil da Ana diferente do seu (para testar o "Treinar junto")
  update public.profiles_gymtrack
    set goal = 'emagrecimento', level = 'intermediario', days_per_week = 4, session_minutes = 50,
        equipment = array['academia completa'], notes = 'dor leve no joelho esquerdo'
    where id = ana;

  -- Ana: amizade aceita | Bruno: pedido pendente para você
  insert into public.friendships_gymtrack (requester_id, addressee_id, status) values (ana, me, 'accepted')
  on conflict do nothing;
  insert into public.friendships_gymtrack (requester_id, addressee_id, status) values (bruno, me, 'pending')
  on conflict do nothing;

  -- 4 treinos da Ana (usa os dias do modelo ABC), 3 séries por exercício
  delete from public.workout_sessions_gymtrack where user_id = ana;
  for i in 0..3 loop
    select rd.id into dia
    from public.routine_days_gymtrack rd
    join public.routines_gymtrack r on r.id = rd.routine_id
    where r.is_template and r.name = 'ABC — Push / Pull / Legs'
    order by rd.day_order offset (i % 3) limit 1;

    insert into public.workout_sessions_gymtrack (user_id, routine_day_id, started_at, finished_at)
    values (ana, dia.id,
            now() - make_interval(days => i * 2) - interval '3 hours',
            now() - make_interval(days => i * 2) - interval '3 hours' + make_interval(mins => 45 + i * 5))
    returning id into sessao;

    insert into public.set_logs_gymtrack (user_id, session_id, exercise_id, set_number, weight_kg, reps)
    select ana, sessao, re.exercise_id, g, 15 + re.position * 5, 10
    from public.routine_exercises_gymtrack re
    cross join generate_series(1, 3) g
    where re.routine_day_id = dia.id;
  end loop;

  raise notice 'Pronto! Ana Teste (amiga) e Bruno Teste (pedido pendente) criados.';
end $$;