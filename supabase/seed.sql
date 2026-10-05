-- GymTrack — catálogo de exercícios + 3 rotinas-modelo
-- Rode depois do schema.sql. Pode rodar de novo: limpa os modelos antes.

insert into public.exercises (name, muscle_group, body_region, equipment, exercisedb_query) values
  ('Supino reto com barra',          'peito',       'superior', 'barra',     'barbell bench press'),
  ('Supino inclinado com halteres',  'peito',       'superior', 'halteres',  'dumbbell incline bench press'),
  ('Supino reto com halteres',       'peito',       'superior', 'halteres',  'dumbbell bench press'),
  ('Crucifixo com halteres',         'peito',       'superior', 'halteres',  'dumbbell fly'),
  ('Flexão de braço',                'peito',       'superior', 'peso corporal', 'push-up'),
  ('Puxada frontal',                 'costas',      'superior', 'polia',     'cable pulldown'),
  ('Remada sentada na polia',        'costas',      'superior', 'polia',     'cable seated row'),
  ('Remada curvada com barra',       'costas',      'superior', 'barra',     'barbell bent over row'),
  ('Remada unilateral com halter',   'costas',      'superior', 'halteres',  'dumbbell one arm bent-over row'),
  ('Barra fixa',                     'costas',      'superior', 'peso corporal', 'pull-up'),
  ('Desenvolvimento com halteres',   'ombros',      'superior', 'halteres',  'dumbbell seated shoulder press'),
  ('Elevação lateral',               'ombros',      'superior', 'halteres',  'dumbbell lateral raise'),
  ('Crucifixo inverso',              'ombros',      'superior', 'halteres',  'dumbbell rear lateral raise'),
  ('Rosca direta com barra',         'biceps',      'superior', 'barra',     'barbell curl'),
  ('Rosca alternada com halteres',   'biceps',      'superior', 'halteres',  'dumbbell alternate biceps curl'),
  ('Rosca martelo',                  'biceps',      'superior', 'halteres',  'dumbbell hammer curl'),
  ('Tríceps na polia (corda)',       'triceps',     'superior', 'polia',     'cable triceps pushdown'),
  ('Tríceps francês com halter',     'triceps',     'superior', 'halteres',  'dumbbell seated triceps extension'),
  ('Agachamento livre',              'pernas',      'inferior', 'barra',     'barbell full squat'),
  ('Leg press 45°',                  'pernas',      'inferior', 'máquina',   'sled 45 leg press'),
  ('Cadeira extensora',              'pernas',      'inferior', 'máquina',   'lever leg extension'),
  ('Mesa flexora',                   'pernas',      'inferior', 'máquina',   'lever lying leg curl'),
  ('Stiff com barra',                'pernas',      'inferior', 'barra',     'barbell straight-leg deadlift'),
  ('Levantamento terra',             'costas',      'inferior', 'barra',     'barbell deadlift'),
  ('Afundo com halteres',            'pernas',      'inferior', 'halteres',  'dumbbell lunge'),
  ('Elevação pélvica',               'gluteos',     'inferior', 'barra',     'barbell glute bridge'),
  ('Panturrilha em pé',              'panturrilha', 'inferior', 'máquina',   'lever standing calf raise'),
  ('Prancha',                        'core',        'core',     'peso corporal', 'front plank'),
  ('Abdominal crunch',               'core',        'core',     'peso corporal', 'crunch floor'),
  ('Elevação de pernas',             'core',        'core',     'peso corporal', 'hanging leg raise')
on conflict do nothing;

-- helper para montar os modelos pelo nome do exercício
create or replace function public._seed_add(p_day bigint, p_name text, p_pos int,
  p_sets int, p_min int, p_max int, p_rest int)
returns void language sql as $$
  insert into public.routine_exercises (routine_day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds)
  select p_day, id, p_pos, p_sets, p_min, p_max, p_rest
  from public.exercises where name = p_name and user_id is null limit 1;
$$;

delete from public.routines where is_template;

do $$
declare r bigint; d bigint;
begin
  -- ===== Full Body 3x (iniciante) =====
  insert into public.routines (name, description, source, is_template)
  values ('Full Body 3x por semana', 'Corpo inteiro em todos os treinos. Ideal para iniciantes: seg, qua, sex.', 'template', true)
  returning id into r;

  insert into public.routine_days (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add(d, 'Agachamento livre', 1, 3, 8, 12, 120);
  perform _seed_add(d, 'Supino reto com barra', 2, 3, 8, 12, 120);
  perform _seed_add(d, 'Puxada frontal', 3, 3, 8, 12, 90);
  perform _seed_add(d, 'Desenvolvimento com halteres', 4, 3, 10, 12, 90);
  perform _seed_add(d, 'Prancha', 5, 3, 30, 45, 60);

  insert into public.routine_days (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add(d, 'Leg press 45°', 1, 3, 10, 12, 120);
  perform _seed_add(d, 'Supino inclinado com halteres', 2, 3, 8, 12, 90);
  perform _seed_add(d, 'Remada sentada na polia', 3, 3, 8, 12, 90);
  perform _seed_add(d, 'Elevação lateral', 4, 3, 12, 15, 60);
  perform _seed_add(d, 'Mesa flexora', 5, 3, 10, 12, 60);
  perform _seed_add(d, 'Abdominal crunch', 6, 3, 15, 20, 60);

  -- ===== ABC (intermediário) =====
  insert into public.routines (name, description, source, is_template)
  values ('ABC — Push / Pull / Legs', 'A: peito, ombro e tríceps. B: costas e bíceps. C: pernas. 3 a 6x por semana.', 'template', true)
  returning id into r;

  insert into public.routine_days (routine_id, name, day_order) values (r, 'A — Peito, ombro e tríceps', 1) returning id into d;
  perform _seed_add(d, 'Supino reto com barra', 1, 4, 6, 10, 120);
  perform _seed_add(d, 'Supino inclinado com halteres', 2, 3, 8, 12, 90);
  perform _seed_add(d, 'Crucifixo com halteres', 3, 3, 10, 15, 60);
  perform _seed_add(d, 'Desenvolvimento com halteres', 4, 3, 8, 12, 90);
  perform _seed_add(d, 'Elevação lateral', 5, 3, 12, 15, 60);
  perform _seed_add(d, 'Tríceps na polia (corda)', 6, 3, 10, 15, 60);

  insert into public.routine_days (routine_id, name, day_order) values (r, 'B — Costas e bíceps', 2) returning id into d;
  perform _seed_add(d, 'Puxada frontal', 1, 4, 8, 12, 90);
  perform _seed_add(d, 'Remada curvada com barra', 2, 3, 6, 10, 120);
  perform _seed_add(d, 'Remada unilateral com halter', 3, 3, 8, 12, 90);
  perform _seed_add(d, 'Crucifixo inverso', 4, 3, 12, 15, 60);
  perform _seed_add(d, 'Rosca direta com barra', 5, 3, 8, 12, 60);
  perform _seed_add(d, 'Rosca martelo', 6, 3, 10, 12, 60);

  insert into public.routine_days (routine_id, name, day_order) values (r, 'C — Pernas', 3) returning id into d;
  perform _seed_add(d, 'Agachamento livre', 1, 4, 6, 10, 150);
  perform _seed_add(d, 'Leg press 45°', 2, 3, 10, 12, 120);
  perform _seed_add(d, 'Stiff com barra', 3, 3, 8, 12, 90);
  perform _seed_add(d, 'Cadeira extensora', 4, 3, 12, 15, 60);
  perform _seed_add(d, 'Mesa flexora', 5, 3, 10, 12, 60);
  perform _seed_add(d, 'Panturrilha em pé', 6, 4, 12, 15, 45);

  -- ===== Upper / Lower 4x =====
  insert into public.routines (name, description, source, is_template)
  values ('Upper / Lower 4x', 'Superior e inferior alternados, 4 dias por semana.', 'template', true)
  returning id into r;

  insert into public.routine_days (routine_id, name, day_order) values (r, 'Superior', 1) returning id into d;
  perform _seed_add(d, 'Supino reto com barra', 1, 4, 6, 10, 120);
  perform _seed_add(d, 'Remada curvada com barra', 2, 4, 6, 10, 120);
  perform _seed_add(d, 'Desenvolvimento com halteres', 3, 3, 8, 12, 90);
  perform _seed_add(d, 'Puxada frontal', 4, 3, 8, 12, 90);
  perform _seed_add(d, 'Rosca alternada com halteres', 5, 2, 10, 12, 60);
  perform _seed_add(d, 'Tríceps francês com halter', 6, 2, 10, 12, 60);

  insert into public.routine_days (routine_id, name, day_order) values (r, 'Inferior', 2) returning id into d;
  perform _seed_add(d, 'Agachamento livre', 1, 4, 6, 10, 150);
  perform _seed_add(d, 'Levantamento terra', 2, 3, 5, 8, 150);
  perform _seed_add(d, 'Afundo com halteres', 3, 3, 10, 12, 90);
  perform _seed_add(d, 'Elevação pélvica', 4, 3, 8, 12, 90);
  perform _seed_add(d, 'Panturrilha em pé', 5, 4, 12, 15, 45);
  perform _seed_add(d, 'Elevação de pernas', 6, 3, 10, 15, 60);
end $$;

drop function if exists public._seed_add(bigint, text, int, int, int, int, int);
