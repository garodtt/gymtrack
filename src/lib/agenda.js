// Agenda da semana: o que fazer em cada dia (rotina, treino com amigo ou descanso)
import { supabase } from './supabase'

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // segunda → domingo
export const WEEKDAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const SELECT = '*, routine_days:routine_days_gymtrack(id, name, routines:routines_gymtrack(id, name))'

export async function loadMyAgenda() {
  const { data } = await supabase.from('schedule_gymtrack').select(SELECT).order('weekday').order('position')
  return data ?? []
}

export async function loadAgendaWithMe() {
  const { data } = await supabase.rpc('agenda_with_me_gymtrack')
  return data ?? []
}

// treino em dupla para hoje com essa pessoa: o salvo para este dia da semana ou o montado hoje
export async function jointToday(friendId, myId, weekday = new Date().getDay()) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { data } = await supabase.from('joint_workouts_gymtrack')
    .select('id, title, creator_id, partner_id, weekday, created_at')
    .or(pairFilter(myId, friendId, [`weekday.eq.${weekday}`, `created_at.gte."${today.toISOString()}"`]))
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

// (eu e o amigo, em qualquer ordem) E (alguma das condições)
function pairFilter(a, b, conds) {
  const pairs = [[a, b], [b, a]]
  return pairs.flatMap(([c, p]) => conds.map((cond) => `and(creator_id.eq.${c},partner_id.eq.${p},${cond})`)).join(',')
}

export const jointLink = ({ friendId, groups = [], place = 'academia', minutes = 60, weekday = new Date().getDay() }) =>
  `/junto/novo?amigo=${friendId}&dia=${weekday}&grupos=${groups.join(',')}&local=${place}&min=${minutes}`