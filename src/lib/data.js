import { supabase } from './supabase'

// Rotina ativa com dias e exercícios
export async function getActiveRoutine() {
  const { data, error } = await supabase
    .from('routines')
    .select('*, routine_days(*, routine_exercises(*, exercises(*)))')
    .eq('is_active', true)
    .eq('is_template', false)
    .maybeSingle()
  if (error) throw error
  if (data) {
    data.routine_days.sort((a, b) => a.day_order - b.day_order)
    data.routine_days.forEach((d) => d.routine_exercises.sort((a, b) => a.position - b.position))
  }
  return data
}

// Próximo dia do ciclo, com base na última sessão finalizada
export async function getNextDay(routine) {
  const days = routine.routine_days
  if (!days.length) return null
  const ids = days.map((d) => d.id)
  const { data } = await supabase
    .from('workout_sessions')
    .select('routine_day_id')
    .in('routine_day_id', ids)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
  const lastId = data?.[0]?.routine_day_id
  const idx = days.findIndex((d) => d.id === lastId)
  return days[(idx + 1) % days.length]
}

// Séries da última sessão em que este exercício foi feito
export async function getLastSets(exerciseId, excludeSessionId) {
  let q = supabase
    .from('set_logs')
    .select('session_id, set_number, weight_kg, reps, created_at')
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (excludeSessionId) q = q.neq('session_id', excludeSessionId)
  const { data } = await q
  if (!data?.length) return []
  const sid = data[0].session_id
  return data.filter((s) => s.session_id === sid).sort((a, b) => a.set_number - b.set_number)
}

// Copia uma rotina (modelo ou gerada pela IA) para o usuário e ativa
export async function saveRoutine({ name, description, source, days }, userId) {
  await supabase.from('routines').update({ is_active: false }).eq('user_id', userId)
  const { data: routine, error } = await supabase
    .from('routines')
    .insert({ name, description, source, user_id: userId, is_active: true })
    .select()
    .single()
  if (error) throw error

  for (const [i, day] of days.entries()) {
    const { data: d, error: e1 } = await supabase
      .from('routine_days')
      .insert({ routine_id: routine.id, name: day.name, day_order: i + 1 })
      .select()
      .single()
    if (e1) throw e1
    const rows = day.exercises.map((ex, j) => ({
      routine_day_id: d.id,
      exercise_id: ex.exercise_id,
      position: j + 1,
      sets: ex.sets,
      reps_min: ex.reps_min,
      reps_max: ex.reps_max,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes ?? null,
    }))
    const { error: e2 } = await supabase.from('routine_exercises').insert(rows)
    if (e2) throw e2
  }
  return routine
}
