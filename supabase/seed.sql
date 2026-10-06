-- GymTrack — catálogo de exercícios + rotinas-modelo (academia e casa)
-- Rode depois do schema.sql e das migrações. Pode rodar de novo: limpa os modelos antes.

-- renomeia exercícios de versões anteriores (para quem já rodou o seed antes)
update public.exercises_gymtrack set name = 'Tríceps na polia' where name = 'Tríceps na polia (corda)' and user_id is null;
update public.exercises_gymtrack set name = 'Tríceps francês com barra W', equipment = 'barra W'
  where name = 'Tríceps francês com halter' and user_id is null;

-- exercisedb_id conferido um a um na API; o GIF fica em static.exercisedb.dev/media/<id>.gif
insert into public.exercises_gymtrack (name, muscle_group, body_region, equipment, exercisedb_query, exercisedb_id) values
  ('Supino reto com barra',          'peito',       'superior', 'barra',     'barbell bench press', 'EIeI8Vf'),
  ('Supino inclinado com halteres',  'peito',       'superior', 'halteres',  'dumbbell incline bench press', 'ns0SIbU'),
  ('Supino reto com halteres',       'peito',       'superior', 'halteres',  'dumbbell bench press', 'SpYC0Kp'),
  ('Crucifixo com halteres',         'peito',       'superior', 'halteres',  'dumbbell fly', 'yz9nUhF'),
  ('Flexão de braço',                'peito',       'superior', 'peso corporal', 'push-up', 'I4hDWkc'),
  ('Puxada frontal',                 'costas',      'superior', 'polia',     'cable pulldown', 'RVwzP10'),
  ('Remada sentada na polia',        'costas',      'superior', 'polia',     'cable seated row', 'fUBheHs'),
  ('Remada curvada com barra',       'costas',      'superior', 'barra',     'barbell bent over row', 'eZyBC3j'),
  ('Remada unilateral com halter',   'costas',      'superior', 'halteres',  'dumbbell one arm bent-over row', 'C0MA9bC'),
  ('Barra fixa',                     'costas',      'superior', 'barra fixa', 'pull-up', 'lBDjFxJ'),
  ('Desenvolvimento com halteres',   'ombros',      'superior', 'halteres',  'dumbbell seated shoulder press', 'znQUdHY'),
  ('Elevação lateral',               'ombros',      'superior', 'halteres',  'dumbbell lateral raise', 'DsgkuIt'),
  ('Crucifixo inverso',              'ombros',      'superior', 'halteres',  'dumbbell rear lateral raise', 'v1qBec9'),
  ('Rosca direta com barra',         'biceps',      'superior', 'barra',     'barbell curl', '25GPyDY'),
  ('Rosca alternada com halteres',   'biceps',      'superior', 'halteres',  'dumbbell alternate biceps curl', 'BU15nH4'),
  ('Rosca martelo',                  'biceps',      'superior', 'halteres',  'dumbbell hammer curl', '2NpxjC1'),
  ('Tríceps na polia',               'triceps',     'superior', 'polia',     'cable triceps pushdown', 'gAwDzB3'),
  ('Tríceps francês com barra W',    'triceps',     'superior', 'barra W',   'ez-bar seated triceps extension', 'iaapw0g'),
  ('Agachamento livre',              'pernas',      'inferior', 'barra',     'barbell full squat', 'qXTaZnJ'),
  ('Leg press 45°',                  'pernas',      'inferior', 'máquina',   'sled 45 leg press', '10Z2DXU'),
  ('Cadeira extensora',              'pernas',      'inferior', 'máquina',   'lever leg extension', 'my33uHU'),
  ('Mesa flexora',                   'pernas',      'inferior', 'máquina',   'lever lying leg curl', '17lJ1kr'),
  ('Stiff com barra',                'pernas',      'inferior', 'barra',     'barbell straight-leg deadlift', 'hrVQWvE'),
  ('Levantamento terra',             'costas',      'inferior', 'barra',     'barbell deadlift', 'ila4NZS'),
  ('Afundo com halteres',            'pernas',      'inferior', 'halteres',  'dumbbell lunge', 'RRWFUcw'),
  ('Elevação pélvica',               'gluteos',     'inferior', 'barra',     'barbell glute bridge', 'qKBpF7I'),
  ('Panturrilha em pé',              'panturrilha', 'inferior', 'máquina',   'lever standing calf raise', 'ykUOVze'),
  ('Prancha',                        'core',        'core',     'peso corporal', 'front plank', 'VBAWRPG'),
  ('Abdominal crunch',               'core',        'core',     'peso corporal', 'crunch floor', 'TFqbd8t'),
  ('Elevação de pernas',             'core',        'core',     'peso corporal', 'hanging leg raise', 'I3tsCnC')
on conflict (name) where user_id is null do update set
  exercisedb_query = excluded.exercisedb_query,
  exercisedb_id    = excluded.exercisedb_id,
  equipment        = excluded.equipment;

-- ===== Calistenia / treino em casa =====
insert into public.exercises_gymtrack (name, muscle_group, body_region, equipment, unit, exercisedb_query, exercisedb_id) values
  ('Flexão com joelhos apoiados',    'peito',       'superior', 'peso corporal', 'reps',     'kneeling push-up', 'ZOuKWir'),
  ('Flexão inclinada',               'peito',       'superior', 'peso corporal', 'reps',     'incline push-up', 'B1EVP9F'),
  ('Flexão declinada',               'peito',       'superior', 'peso corporal', 'reps',     'decline push-up', 'i5cEhka'),
  ('Flexão diamante',                'triceps',     'superior', 'peso corporal', 'reps',     'diamond push-up', 'soIB2rj'),
  ('Mergulho no banco',              'triceps',     'superior', 'cadeira',       'reps',     'bench dip (knees bent)', 'RrLske5'),
  ('Remada invertida',               'costas',      'superior', 'mesa ou barra baixa', 'reps', 'inverted row', 'bZGHsAZ'),
  ('Barra fixa supinada',            'costas',      'superior', 'barra fixa',    'reps',     'chin-up', 'T2mxWqc'),
  ('Agachamento (peso corporal)',    'pernas',      'inferior', 'peso corporal', 'reps',     'quads (bodyweight squat)', '6YUfHPL'),
  ('Agachamento com salto',          'pernas',      'inferior', 'peso corporal', 'reps',     'jump squat', 'LIlE5Tn'),
  ('Afundo (peso corporal)',         'pernas',      'inferior', 'peso corporal', 'reps',     'forward lunge', 'kMzUs9Y'),
  ('Agachamento búlgaro',            'pernas',      'inferior', 'peso corporal', 'reps',     'split squats', '9E25EOx'),
  ('Ponte de glúteo',                'gluteos',     'inferior', 'peso corporal', 'reps',     'low glute bridge on floor', 'u0cNiij'),
  ('Panturrilha em pé (peso corporal)', 'panturrilha', 'inferior', 'peso corporal', 'reps',  'bodyweight standing calf raise', 'bJYHBIN'),
  ('Prancha lateral',                'core',        'core',     'peso corporal', 'segundos', 'side bridge', 'RKjH6Lt'),
  ('Elevação de pernas deitado',     'core',        'core',     'peso corporal', 'reps',     'lying leg raise flat bench', 'WhuFnR7'),
  ('Abdominal canivete',             'core',        'core',     'peso corporal', 'reps',     'jackknife sit-up', 'mbkgB44'),
  ('Mountain climber',               'cardio',      'core',     'peso corporal', 'segundos', 'mountain climber', 'RJgzwny'),
  ('Burpee',                         'cardio',      'core',     'peso corporal', 'reps',     'burpee', 'dK9394r'),
  ('Polichinelo',                    'cardio',      'core',     'peso corporal', 'segundos', 'jack jump', '1g5bPpA')
on conflict (name) where user_id is null do update set
  muscle_group     = excluded.muscle_group,
  equipment        = excluded.equipment,
  unit             = excluded.unit,
  exercisedb_query = excluded.exercisedb_query,
  exercisedb_id    = excluded.exercisedb_id;

-- ===== Variedade extra (academia e casa) =====
insert into public.exercises_gymtrack (name, muscle_group, body_region, equipment, unit, exercisedb_query, exercisedb_id) values
  ('Supino inclinado com barra',     'peito',       'superior', 'barra',         'reps',     'barbell incline bench press', '3TZduzM'),
  ('Crossover na polia',             'peito',       'superior', 'polia',         'reps',     'cable crossover', '0CXGHya'),
  ('Voador (peck deck)',             'peito',       'superior', 'máquina',       'reps',     'machine seated fly', 'v3xmPAR'),
  ('Mergulho nas paralelas',         'peito',       'superior', 'paralelas',     'reps',     'chest dip', '9WTm7dq'),
  ('Remada cavalinho',               'costas',      'superior', 'máquina',       'reps',     'machine t bar row', 'aaXr7ld'),
  ('Puxada supinada',                'costas',      'superior', 'polia',         'reps',     'cable underhand pulldown', 'xBYcQHj'),
  ('Pulldown com braço estendido',   'costas',      'superior', 'polia',         'reps',     'cable straight arm pulldown', 'x69MAlq'),
  ('Pullover com halter',            'costas',      'superior', 'halteres',      'reps',     'dumbbell straight arm pullover', 'i8BdLTK'),
  ('Encolhimento com barra',         'costas',      'superior', 'barra',         'reps',     'barbell shrug', 'dG7tG5y'),
  ('Desenvolvimento com barra',      'ombros',      'superior', 'barra',         'reps',     'barbell seated overhead press', 'kTbSH9h'),
  ('Desenvolvimento Arnold',         'ombros',      'superior', 'halteres',      'reps',     'dumbbell arnold press', 'Xy4jlWA'),
  ('Elevação frontal',               'ombros',      'superior', 'halteres',      'reps',     'dumbbell front raise', '3eGE2JC'),
  ('Rosca concentrada',              'biceps',      'superior', 'halteres',      'reps',     'dumbbell concentration curl', 'gvsWLQw'),
  ('Rosca Scott com halter',         'biceps',      'superior', 'halteres',      'reps',     'dumbbell preacher curl', 'jivWf8n'),
  ('Tríceps testa',                  'triceps',     'superior', 'barra',         'reps',     'barbell lying triceps extension skull crusher', 'h8LFzo9'),
  ('Tríceps coice com halter',       'triceps',     'superior', 'halteres',      'reps',     'dumbbell kickback', 'W6PxUkg'),
  ('Hack squat',                     'pernas',      'inferior', 'máquina',       'reps',     'sled hack squat', 'Qa55kX1'),
  ('Agachamento frontal',            'pernas',      'inferior', 'barra',         'reps',     'barbell front squat', 'zG0zs85'),
  ('Agachamento goblet',             'pernas',      'inferior', 'halteres',      'reps',     'dumbbell goblet squat', 'yn8yg1r'),
  ('Cadeira flexora',                'pernas',      'inferior', 'máquina',       'reps',     'machine seated leg curl', 'Zg3XY7P'),
  ('Stiff com halteres',             'pernas',      'inferior', 'halteres',      'reps',     'dumbbell straight-leg deadlift', 'oom75KC'),
  ('Bom dia com barra',              'pernas',      'inferior', 'barra',         'reps',     'barbell good morning', 'XlZ4lAC'),
  ('Cadeira abdutora',               'gluteos',     'inferior', 'máquina',       'reps',     'machine seated hip abduction', 'CHpahtl'),
  ('Cadeira adutora',                'pernas',      'inferior', 'máquina',       'reps',     'machine seated hip adduction', 'oHsrypV'),
  ('Panturrilha sentado',            'panturrilha', 'inferior', 'máquina',       'reps',     'lever seated calf raise', 'bOOdeyc'),
  ('Subida no banco com halteres',   'gluteos',     'inferior', 'halteres',      'reps',     'dumbbell step-up', 'aXtJhlg'),
  ('Afundo caminhando',              'pernas',      'inferior', 'peso corporal', 'reps',     'walking lunge', 'IZVHb27'),
  ('Agachamento pistol',             'pernas',      'inferior', 'peso corporal', 'reps',     'single leg squat (pistol)', 'nqs5HGV'),
  ('Flexão arqueiro',                'peito',       'superior', 'peso corporal', 'reps',     'archer push up', 'A9qxk2F'),
  ('Flexão em parada de mão',        'ombros',      'superior', 'peso corporal', 'reps',     'handstand push-up', 'rQxwMxO'),
  ('Barra fixa arqueiro',            'costas',      'superior', 'barra fixa',    'reps',     'archer pull-up', '72BC5Za'),
  ('L-sit no chão',                  'core',        'core',     'peso corporal', 'segundos', 'l-sit on floor', 'UpWmA5E'),
  ('Abdominal bicicleta',            'core',        'core',     'peso corporal', 'reps',     'bicycle crunch', '1ZFqTDN'),
  ('Russian twist',                  'core',        'core',     'peso corporal', 'reps',     'russian twist', 'XVDdcoj'),
  ('Dead bug',                       'core',        'core',     'peso corporal', 'reps',     'dead bug', 'iny3m5y'),
  ('Abdução lateral deitado',        'gluteos',     'inferior', 'peso corporal', 'reps',     'side hip abduction', '7WaDzyL'),
  ('Ponte de glúteo com marcha',     'gluteos',     'inferior', 'peso corporal', 'reps',     'glute bridge march', 'GibBPPg'),
  ('Engatinhar do urso',             'cardio',      'core',     'peso corporal', 'segundos', 'bear crawl', '0Yz8WdV')
on conflict (name) where user_id is null do update set
  muscle_group     = excluded.muscle_group,
  equipment        = excluded.equipment,
  unit             = excluded.unit,
  exercisedb_query = excluded.exercisedb_query,
  exercisedb_id    = excluded.exercisedb_id;

-- exercícios contados em segundos
update public.exercises_gymtrack set unit = 'segundos' where name in ('Prancha') and user_id is null;

update public.exercises_gymtrack
  set gif_url = 'https://static.exercisedb.dev/media/' || exercisedb_id || '.gif'
  where exercisedb_id is not null and user_id is null;

-- helper para montar os modelos pelo nome do exercício
create or replace function public._seed_add_gymtrack(p_day bigint, p_name text, p_pos int,
  p_sets int, p_min int, p_max int, p_rest int)
returns void language sql as $$
  insert into public.routine_exercises_gymtrack (routine_day_id, exercise_id, position, sets, reps_min, reps_max, rest_seconds)
  select p_day, id, p_pos, p_sets, p_min, p_max, p_rest
  from public.exercises_gymtrack where name = p_name and user_id is null limit 1;
$$;

delete from public.routines_gymtrack where is_template;

do $$
declare r bigint; d bigint;
begin
  -- ===== Full Body 3x (iniciante) =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Full Body 3x por semana', 'Corpo inteiro em todos os treinos. Ideal para iniciantes: seg, qua, sex.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 3, 8, 12, 120);
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 2, 3, 8, 12, 120);
  perform _seed_add_gymtrack(d, 'Puxada frontal', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com halteres', 4, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Prancha', 5, 3, 30, 45, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Leg press 45°', 1, 3, 10, 12, 120);
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 2, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Remada sentada na polia', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Mesa flexora', 5, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Abdominal crunch', 6, 3, 15, 20, 60);

  -- ===== ABC (intermediário) =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('ABC — Push / Pull / Legs', 'A: peito, ombro e tríceps. B: costas e bíceps. C: pernas. 3 a 6x por semana.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'A — Peito, ombro e tríceps', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 1, 4, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 2, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Crucifixo com halteres', 3, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com halteres', 4, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 5, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Tríceps na polia', 6, 3, 10, 15, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'B — Costas e bíceps', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Puxada frontal', 1, 4, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Remada curvada com barra', 2, 3, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Remada unilateral com halter', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Crucifixo inverso', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Rosca direta com barra', 5, 3, 8, 12, 60);
  perform _seed_add_gymtrack(d, 'Rosca martelo', 6, 3, 10, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'C — Pernas', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 4, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Leg press 45°', 2, 3, 10, 12, 120);
  perform _seed_add_gymtrack(d, 'Stiff com barra', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Cadeira extensora', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Mesa flexora', 5, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé', 6, 4, 12, 15, 45);

  -- ===== Upper / Lower 4x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Upper / Lower 4x', 'Superior e inferior alternados, 4 dias por semana.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Superior', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 1, 4, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Remada curvada com barra', 2, 4, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com halteres', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Puxada frontal', 4, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Rosca alternada com halteres', 5, 2, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Tríceps francês com barra W', 6, 2, 10, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Inferior', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 4, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Levantamento terra', 2, 3, 5, 8, 150);
  perform _seed_add_gymtrack(d, 'Afundo com halteres', 3, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Elevação pélvica', 4, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé', 5, 4, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Elevação de pernas', 6, 3, 10, 15, 60);
  -- ===== CASA: Iniciante 3x (corpo inteiro) =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Iniciante 3x', 'Corpo inteiro sem equipamento, alternando A e B. Só precisa de uma cadeira firme e uma mesa resistente.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento (peso corporal)', 1, 3, 12, 20, 60);
  perform _seed_add_gymtrack(d, 'Flexão com joelhos apoiados', 2, 3, 8, 15, 60);
  perform _seed_add_gymtrack(d, 'Remada invertida', 3, 3, 6, 12, 90);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo', 4, 3, 12, 20, 45);
  perform _seed_add_gymtrack(d, 'Prancha', 5, 3, 20, 40, 45);
  perform _seed_add_gymtrack(d, 'Polichinelo', 6, 3, 30, 45, 30);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Afundo (peso corporal)', 1, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Flexão inclinada', 2, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Mergulho no banco', 3, 3, 8, 15, 60);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé (peso corporal)', 4, 3, 15, 25, 30);
  perform _seed_add_gymtrack(d, 'Prancha lateral', 5, 3, 20, 30, 30);
  perform _seed_add_gymtrack(d, 'Mountain climber', 6, 3, 20, 40, 30);

  -- ===== CASA: Calistenia intermediário (Empurrar / Puxar / Pernas) =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Calistenia Push / Pull / Pernas', 'Intermediário, 3 a 6x por semana. O treino Puxar precisa de uma barra fixa.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Empurrar — peito, ombro e tríceps', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Flexão de braço', 1, 4, 10, 20, 90);
  perform _seed_add_gymtrack(d, 'Flexão declinada', 2, 3, 8, 15, 90);
  perform _seed_add_gymtrack(d, 'Flexão diamante', 3, 3, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Mergulho no banco', 4, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Prancha', 5, 3, 30, 60, 45);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Puxar — costas, bíceps e abdômen', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Barra fixa', 1, 4, 5, 10, 120);
  perform _seed_add_gymtrack(d, 'Barra fixa supinada', 2, 3, 5, 10, 120);
  perform _seed_add_gymtrack(d, 'Remada invertida', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Elevação de pernas deitado', 4, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Abdominal canivete', 5, 3, 10, 15, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Pernas', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento búlgaro', 1, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Agachamento com salto', 2, 3, 10, 15, 75);
  perform _seed_add_gymtrack(d, 'Afundo (peso corporal)', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo', 4, 3, 15, 20, 45);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé (peso corporal)', 5, 4, 15, 25, 30);

  -- ===== CASA: HIIT 20 minutos =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — HIIT 20 minutos', 'Circuito rápido para dias corridos: descanso curto, ritmo alto.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Circuito', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Polichinelo', 1, 4, 30, 45, 15);
  perform _seed_add_gymtrack(d, 'Agachamento com salto', 2, 4, 10, 15, 20);
  perform _seed_add_gymtrack(d, 'Mountain climber', 3, 4, 30, 45, 15);
  perform _seed_add_gymtrack(d, 'Burpee', 4, 4, 8, 12, 30);
  perform _seed_add_gymtrack(d, 'Flexão de braço', 5, 4, 8, 15, 20);
  perform _seed_add_gymtrack(d, 'Prancha', 6, 4, 30, 45, 15);
  -- ===== ACADEMIA: Iniciante 2x por semana =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Iniciante 2x por semana', 'Para quem está começando ou tem pouco tempo: corpo inteiro, máquinas e halteres.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Leg press 45°', 1, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Supino reto com halteres', 2, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Puxada frontal', 3, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Cadeira flexora', 4, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 5, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Prancha', 6, 3, 20, 40, 45);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento goblet', 1, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Voador (peck deck)', 2, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Remada sentada na polia', 3, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Cadeira extensora', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Rosca direta com barra', 5, 2, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Tríceps na polia', 6, 2, 10, 12, 60);

  -- ===== ACADEMIA: Glúteos e inferiores 3x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Glúteos e inferiores 3x', 'Ênfase em glúteos e pernas, com um dia de superiores para equilibrar.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Glúteos', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Elevação pélvica', 1, 4, 8, 12, 120);
  perform _seed_add_gymtrack(d, 'Agachamento livre', 2, 4, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Cadeira abdutora', 3, 3, 12, 20, 60);
  perform _seed_add_gymtrack(d, 'Stiff com halteres', 4, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Subida no banco com halteres', 5, 3, 10, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Superiores', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Puxada frontal', 1, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 2, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Remada unilateral com halter', 3, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com halteres', 4, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 5, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Prancha', 6, 3, 30, 45, 45);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Posterior e glúteos', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Levantamento terra', 1, 3, 5, 8, 150);
  perform _seed_add_gymtrack(d, 'Hack squat', 2, 3, 8, 12, 120);
  perform _seed_add_gymtrack(d, 'Cadeira flexora', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Cadeira adutora', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Afundo caminhando', 5, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Panturrilha sentado', 6, 4, 12, 15, 45);

  -- ===== ACADEMIA: Força 5x5 =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Força 5x5', 'Clássico de força: poucos exercícios básicos, 5 séries de 5, alternando A e B. 3x por semana.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 5, 5, 5, 180);
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 2, 5, 5, 5, 180);
  perform _seed_add_gymtrack(d, 'Remada curvada com barra', 3, 5, 5, 5, 180);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 5, 5, 5, 180);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com barra', 2, 5, 5, 5, 180);
  perform _seed_add_gymtrack(d, 'Levantamento terra', 3, 1, 5, 5, 180);

  -- ===== ACADEMIA: Hipertrofia 5 dias =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Hipertrofia 5 dias', 'Um grupo muscular por dia, volume alto. Para intermediários e avançados.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Peito', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 1, 4, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 2, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Crossover na polia', 3, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Voador (peck deck)', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Mergulho nas paralelas', 5, 3, 8, 12, 90);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Costas', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Barra fixa', 1, 4, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Remada cavalinho', 2, 4, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Puxada supinada', 3, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Pulldown com braço estendido', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Encolhimento com barra', 5, 3, 10, 15, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Pernas', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 4, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Hack squat', 2, 3, 8, 12, 120);
  perform _seed_add_gymtrack(d, 'Cadeira extensora', 3, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Mesa flexora', 4, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Stiff com barra', 5, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé', 6, 4, 12, 15, 45);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Ombros', 4) returning id into d;
  perform _seed_add_gymtrack(d, 'Desenvolvimento com barra', 1, 4, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Desenvolvimento Arnold', 2, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 3, 4, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Elevação frontal', 4, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Crucifixo inverso', 5, 3, 12, 15, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Braços e abdômen', 5) returning id into d;
  perform _seed_add_gymtrack(d, 'Rosca direta com barra', 1, 4, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Tríceps testa', 2, 4, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Rosca Scott com halter', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Tríceps na polia', 4, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Rosca martelo', 5, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Tríceps coice com halter', 6, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Abdominal bicicleta', 7, 3, 15, 20, 45);

  -- ===== CASA: Glúteos e pernas =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Glúteos e pernas', 'Inferiores sem equipamento, com foco em glúteos. Só precisa de uma cadeira.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Glúteos e pernas', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento (peso corporal)', 1, 4, 15, 25, 60);
  perform _seed_add_gymtrack(d, 'Agachamento búlgaro', 2, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo com marcha', 3, 3, 12, 20, 45);
  perform _seed_add_gymtrack(d, 'Abdução lateral deitado', 4, 3, 15, 20, 30);
  perform _seed_add_gymtrack(d, 'Afundo caminhando', 5, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Agachamento com salto', 6, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé (peso corporal)', 7, 4, 15, 25, 30);

  -- ===== CASA: Abdômen 15 minutos =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Abdômen 15 minutos', 'Core completo e rápido: dá para fazer depois de qualquer treino.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Abdômen', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Prancha', 1, 3, 30, 45, 30);
  perform _seed_add_gymtrack(d, 'Abdominal bicicleta', 2, 3, 15, 20, 30);
  perform _seed_add_gymtrack(d, 'Dead bug', 3, 3, 10, 12, 30);
  perform _seed_add_gymtrack(d, 'Russian twist', 4, 3, 15, 20, 30);
  perform _seed_add_gymtrack(d, 'Elevação de pernas deitado', 5, 3, 10, 15, 30);
  perform _seed_add_gymtrack(d, 'Prancha lateral', 6, 3, 20, 30, 30);

  -- ===== CASA: Calistenia avançada =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Calistenia avançada', 'Variações difíceis para quem já domina o básico. Precisa de barra fixa.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Empurrar', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Flexão arqueiro', 1, 4, 5, 8, 120);
  perform _seed_add_gymtrack(d, 'Flexão em parada de mão', 2, 3, 3, 8, 150);
  perform _seed_add_gymtrack(d, 'Flexão diamante', 3, 3, 10, 15, 90);
  perform _seed_add_gymtrack(d, 'Mergulho no banco', 4, 3, 12, 20, 60);
  perform _seed_add_gymtrack(d, 'L-sit no chão', 5, 3, 10, 20, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Puxar', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Barra fixa', 1, 4, 6, 12, 120);
  perform _seed_add_gymtrack(d, 'Barra fixa arqueiro', 2, 3, 3, 6, 150);
  perform _seed_add_gymtrack(d, 'Barra fixa supinada', 3, 3, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Remada invertida', 4, 3, 10, 15, 75);
  perform _seed_add_gymtrack(d, 'Elevação de pernas', 5, 3, 8, 12, 75);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Pernas', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento pistol', 1, 4, 3, 8, 120);
  perform _seed_add_gymtrack(d, 'Agachamento búlgaro', 2, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Agachamento com salto', 3, 3, 10, 15, 75);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo com marcha', 4, 3, 12, 20, 45);
  perform _seed_add_gymtrack(d, 'Engatinhar do urso', 5, 3, 20, 40, 45);

  -- ===== Emagrecimento — circuito 3x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Emagrecimento — circuito 3x', 'Circuito com descanso curto para gastar mais energia, alternando A e B.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Circuito A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Leg press 45°', 1, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Supino reto com halteres', 2, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Puxada frontal', 3, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Afundo com halteres', 4, 3, 10, 12, 45);
  perform _seed_add_gymtrack(d, 'Burpee', 5, 3, 8, 12, 45);
  perform _seed_add_gymtrack(d, 'Mountain climber', 6, 3, 30, 45, 30);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Circuito B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento goblet', 1, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Remada sentada na polia', 2, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com halteres', 3, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Stiff com halteres', 4, 3, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Polichinelo', 5, 3, 30, 45, 30);
  perform _seed_add_gymtrack(d, 'Prancha', 6, 3, 30, 45, 30);

  -- ===== Push / Pull / Legs 6x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Push / Pull / Legs 6x', 'Volume alto para avançados: faça o ciclo Empurrar → Puxar → Pernas duas vezes por semana.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Empurrar', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 1, 4, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com barra', 2, 3, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 3, 3, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 4, 4, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Crossover na polia', 5, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Tríceps testa', 6, 3, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Tríceps na polia', 7, 3, 10, 15, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Puxar', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Levantamento terra', 1, 3, 5, 8, 180);
  perform _seed_add_gymtrack(d, 'Barra fixa', 2, 4, 6, 10, 120);
  perform _seed_add_gymtrack(d, 'Remada curvada com barra', 3, 3, 8, 10, 120);
  perform _seed_add_gymtrack(d, 'Puxada supinada', 4, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Crucifixo inverso', 5, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Rosca direta com barra', 6, 3, 8, 12, 60);
  perform _seed_add_gymtrack(d, 'Rosca martelo', 7, 3, 10, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Pernas', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 4, 6, 10, 180);
  perform _seed_add_gymtrack(d, 'Stiff com barra', 2, 3, 8, 10, 120);
  perform _seed_add_gymtrack(d, 'Leg press 45°', 3, 3, 10, 12, 120);
  perform _seed_add_gymtrack(d, 'Cadeira extensora', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Mesa flexora', 5, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé', 6, 4, 10, 15, 45);
  perform _seed_add_gymtrack(d, 'Elevação de pernas', 7, 3, 10, 15, 60);

  -- ===== Força Upper / Lower 4x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Força Upper / Lower 4x', 'Dois dias pesados (3 a 5 reps) e dois de volume. Para quem quer ficar mais forte sem perder massa.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Superiores — força', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Supino reto com barra', 1, 5, 3, 5, 180);
  perform _seed_add_gymtrack(d, 'Remada curvada com barra', 2, 5, 3, 5, 180);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com barra', 3, 3, 5, 8, 150);
  perform _seed_add_gymtrack(d, 'Barra fixa', 4, 3, 5, 8, 150);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Inferiores — força', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento livre', 1, 5, 3, 5, 180);
  perform _seed_add_gymtrack(d, 'Levantamento terra', 2, 3, 3, 5, 180);
  perform _seed_add_gymtrack(d, 'Afundo com halteres', 3, 3, 8, 10, 90);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé', 4, 3, 8, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Superiores — volume', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 1, 4, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Remada cavalinho', 2, 4, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Desenvolvimento Arnold', 3, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Puxada frontal', 4, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Rosca direta com barra', 5, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Tríceps testa', 6, 3, 10, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Inferiores — volume', 4) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento frontal', 1, 4, 8, 10, 120);
  perform _seed_add_gymtrack(d, 'Stiff com halteres', 2, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Hack squat', 3, 3, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Cadeira flexora', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Panturrilha sentado', 5, 4, 12, 15, 45);

  -- ===== Treino express 30 minutos =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Treino express 30 minutos', 'Quatro exercícios por dia, direto ao ponto. Ideal para dias corridos.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento goblet', 1, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Supino reto com halteres', 2, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Remada unilateral com halter', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Prancha', 4, 3, 30, 45, 30);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Leg press 45°', 1, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Puxada frontal', 2, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Desenvolvimento com halteres', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Abdominal bicicleta', 4, 3, 15, 20, 30);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino C', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Afundo com halteres', 1, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Voador (peck deck)', 2, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Remada sentada na polia', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 4, 3, 12, 15, 45);

  -- ===== Glúteos 4x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Glúteos 4x', 'Ênfase máxima em glúteos: dois dias pesados, um de volume e um de superiores.', 'template', true, 'academia')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Glúteos — pesado', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Elevação pélvica', 1, 5, 6, 10, 150);
  perform _seed_add_gymtrack(d, 'Agachamento livre', 2, 4, 6, 8, 180);
  perform _seed_add_gymtrack(d, 'Bom dia com barra', 3, 3, 8, 10, 120);
  perform _seed_add_gymtrack(d, 'Cadeira abdutora', 4, 4, 12, 20, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Superiores', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Puxada frontal', 1, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Supino inclinado com halteres', 2, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Remada sentada na polia', 3, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'Elevação lateral', 4, 3, 12, 15, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Glúteos — volume', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento búlgaro', 1, 4, 8, 12, 90);
  perform _seed_add_gymtrack(d, 'Stiff com halteres', 2, 4, 10, 12, 90);
  perform _seed_add_gymtrack(d, 'Subida no banco com halteres', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo com marcha', 4, 3, 15, 20, 45);
  perform _seed_add_gymtrack(d, 'Abdução lateral deitado', 5, 3, 15, 20, 30);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Pernas completas', 4) returning id into d;
  perform _seed_add_gymtrack(d, 'Hack squat', 1, 4, 8, 12, 120);
  perform _seed_add_gymtrack(d, 'Cadeira extensora', 2, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Cadeira flexora', 3, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Cadeira adutora', 4, 3, 12, 15, 60);
  perform _seed_add_gymtrack(d, 'Panturrilha em pé', 5, 4, 12, 15, 45);

  -- ===== Casa — Iniciante absoluto 2x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Iniciante absoluto 2x', 'Primeiro contato com treino: poucos exercícios, poucas séries, tudo com o peso do corpo.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento (peso corporal)', 1, 2, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Flexão inclinada', 2, 2, 8, 12, 60);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo', 3, 2, 12, 15, 45);
  perform _seed_add_gymtrack(d, 'Prancha', 4, 2, 15, 30, 45);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Afundo (peso corporal)', 1, 2, 8, 10, 60);
  perform _seed_add_gymtrack(d, 'Flexão com joelhos apoiados', 2, 2, 6, 10, 60);
  perform _seed_add_gymtrack(d, 'Polichinelo', 3, 2, 20, 30, 45);
  perform _seed_add_gymtrack(d, 'Dead bug', 4, 2, 8, 10, 45);

  -- ===== Casa — Emagrecimento 4x =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Emagrecimento 4x', 'Dois dias de HIIT e dois de força, alternados. Ritmo alto e descanso curto.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'HIIT 1', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Burpee', 1, 4, 8, 12, 30);
  perform _seed_add_gymtrack(d, 'Agachamento com salto', 2, 4, 12, 15, 30);
  perform _seed_add_gymtrack(d, 'Mountain climber', 3, 4, 30, 45, 20);
  perform _seed_add_gymtrack(d, 'Flexão de braço', 4, 4, 10, 15, 30);
  perform _seed_add_gymtrack(d, 'Polichinelo', 5, 4, 30, 45, 20);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Força — pernas', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Agachamento búlgaro', 1, 3, 10, 12, 60);
  perform _seed_add_gymtrack(d, 'Afundo caminhando', 2, 3, 12, 16, 60);
  perform _seed_add_gymtrack(d, 'Ponte de glúteo com marcha', 3, 3, 15, 20, 45);
  perform _seed_add_gymtrack(d, 'Agachamento (peso corporal)', 4, 3, 20, 25, 45);
  perform _seed_add_gymtrack(d, 'Prancha lateral', 5, 3, 20, 30, 30);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'HIIT 2', 3) returning id into d;
  perform _seed_add_gymtrack(d, 'Engatinhar do urso', 1, 4, 20, 30, 30);
  perform _seed_add_gymtrack(d, 'Abdominal bicicleta', 2, 4, 20, 30, 20);
  perform _seed_add_gymtrack(d, 'Agachamento com salto', 3, 4, 10, 15, 30);
  perform _seed_add_gymtrack(d, 'Burpee', 4, 4, 8, 10, 30);
  perform _seed_add_gymtrack(d, 'Russian twist', 5, 4, 20, 30, 20);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Força — superiores', 4) returning id into d;
  perform _seed_add_gymtrack(d, 'Flexão de braço', 1, 4, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Remada invertida', 2, 4, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Mergulho no banco', 3, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Flexão declinada', 4, 3, 8, 12, 60);
  perform _seed_add_gymtrack(d, 'Prancha', 5, 3, 30, 45, 30);

  -- ===== Casa — Superiores sem equipamento =====
  insert into public.routines_gymtrack (name, description, source, is_template, place)
  values ('Casa — Superiores sem equipamento', 'Peito, costas, ombros e braços em casa. O treino B usa barra fixa.', 'template', true, 'casa')
  returning id into r;

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino A', 1) returning id into d;
  perform _seed_add_gymtrack(d, 'Flexão de braço', 1, 4, 10, 20, 75);
  perform _seed_add_gymtrack(d, 'Remada invertida', 2, 4, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Flexão diamante', 3, 3, 8, 12, 60);
  perform _seed_add_gymtrack(d, 'Mergulho no banco', 4, 3, 10, 15, 60);
  perform _seed_add_gymtrack(d, 'Flexão declinada', 5, 3, 8, 12, 60);

  insert into public.routine_days_gymtrack (routine_id, name, day_order) values (r, 'Treino B', 2) returning id into d;
  perform _seed_add_gymtrack(d, 'Flexão declinada', 1, 4, 8, 12, 75);
  perform _seed_add_gymtrack(d, 'Barra fixa supinada', 2, 3, 5, 10, 120);
  perform _seed_add_gymtrack(d, 'Flexão arqueiro', 3, 3, 4, 8, 90);
  perform _seed_add_gymtrack(d, 'Remada invertida', 4, 3, 10, 12, 75);
  perform _seed_add_gymtrack(d, 'L-sit no chão', 5, 3, 10, 20, 60);

  -- ===== ficha dos modelos (filtros) =====
  update public.routines_gymtrack set level = 'iniciante', goal = 'hipertrofia', days_per_week = 3, session_minutes = 50 where is_template and name = 'Full Body 3x por semana';
  update public.routines_gymtrack set level = 'intermediario', goal = 'hipertrofia', days_per_week = 3, session_minutes = 60 where is_template and name = 'ABC — Push / Pull / Legs';
  update public.routines_gymtrack set level = 'intermediario', goal = 'hipertrofia', days_per_week = 4, session_minutes = 60 where is_template and name = 'Upper / Lower 4x';
  update public.routines_gymtrack set level = 'iniciante', goal = 'condicionamento', days_per_week = 3, session_minutes = 35 where is_template and name = 'Casa — Iniciante 3x';
  update public.routines_gymtrack set level = 'intermediario', goal = 'hipertrofia', days_per_week = 3, session_minutes = 45 where is_template and name = 'Casa — Calistenia Push / Pull / Pernas';
  update public.routines_gymtrack set level = 'intermediario', goal = 'emagrecimento', days_per_week = 3, session_minutes = 20 where is_template and name = 'Casa — HIIT 20 minutos';
  update public.routines_gymtrack set level = 'iniciante', goal = 'hipertrofia', days_per_week = 2, session_minutes = 45 where is_template and name = 'Iniciante 2x por semana';
  update public.routines_gymtrack set level = 'intermediario', goal = 'gluteos', days_per_week = 3, session_minutes = 60 where is_template and name = 'Glúteos e inferiores 3x';
  update public.routines_gymtrack set level = 'intermediario', goal = 'forca', days_per_week = 3, session_minutes = 50 where is_template and name = 'Força 5x5';
  update public.routines_gymtrack set level = 'avancado', goal = 'hipertrofia', days_per_week = 5, session_minutes = 60 where is_template and name = 'Hipertrofia 5 dias';
  update public.routines_gymtrack set level = 'iniciante', goal = 'gluteos', days_per_week = 2, session_minutes = 30 where is_template and name = 'Casa — Glúteos e pernas';
  update public.routines_gymtrack set level = 'iniciante', goal = 'core', days_per_week = 3, session_minutes = 15 where is_template and name = 'Casa — Abdômen 15 minutos';
  update public.routines_gymtrack set level = 'avancado', goal = 'forca', days_per_week = 3, session_minutes = 50 where is_template and name = 'Casa — Calistenia avançada';
  update public.routines_gymtrack set level = 'iniciante', goal = 'emagrecimento', days_per_week = 3, session_minutes = 40 where is_template and name = 'Emagrecimento — circuito 3x';
  update public.routines_gymtrack set level = 'avancado', goal = 'hipertrofia', days_per_week = 6, session_minutes = 70 where is_template and name = 'Push / Pull / Legs 6x';
  update public.routines_gymtrack set level = 'intermediario', goal = 'forca', days_per_week = 4, session_minutes = 70 where is_template and name = 'Força Upper / Lower 4x';
  update public.routines_gymtrack set level = 'iniciante', goal = 'condicionamento', days_per_week = 3, session_minutes = 30 where is_template and name = 'Treino express 30 minutos';
  update public.routines_gymtrack set level = 'avancado', goal = 'gluteos', days_per_week = 4, session_minutes = 60 where is_template and name = 'Glúteos 4x';
  update public.routines_gymtrack set level = 'iniciante', goal = 'condicionamento', days_per_week = 2, session_minutes = 25 where is_template and name = 'Casa — Iniciante absoluto 2x';
  update public.routines_gymtrack set level = 'intermediario', goal = 'emagrecimento', days_per_week = 4, session_minutes = 35 where is_template and name = 'Casa — Emagrecimento 4x';
  update public.routines_gymtrack set level = 'intermediario', goal = 'hipertrofia', days_per_week = 2, session_minutes = 35 where is_template and name = 'Casa — Superiores sem equipamento';
end $$;

drop function if exists public._seed_add_gymtrack(bigint, text, int, int, int, int, int);