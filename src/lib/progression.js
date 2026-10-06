// Progressão dupla: bateu o topo da faixa em todas as séries → sobe a carga.
// Exercícios por tempo (segundos) e sem carga (peso corporal) progridem em reps/tempo.
const STEP = { superior: 2.5, inferior: 5, core: 0 }

/**
 * @param lastSets  séries da última sessão deste exercício [{weight_kg, reps}]
 * @param plan      {sets, reps_min, reps_max}
 * @param region    'superior' | 'inferior' | 'core'
 * @param unit      'reps' | 'segundos'
 */
export function suggestNext(lastSets, plan, region = 'superior', unit = 'reps') {
  const timed = unit === 'segundos'
  const u = timed ? 's' : 'reps'

  if (!lastSets?.length) {
    return {
      weight: null,
      reps: plan.reps_min,
      text: timed
        ? `Primeira vez: comece com ${plan.reps_min} s por série.`
        : 'Primeira vez: escolha uma carga confortável.',
    }
  }

  const weight = Math.max(...lastSets.map((s) => Number(s.weight_kg)))
  const topSets = lastSets.filter((s) => Number(s.weight_kg) === weight)
  const hitTop = topSets.length >= plan.sets && topSets.every((s) => s.reps >= plan.reps_max)
  const canAddWeight = !timed && weight > 0 && STEP[region] > 0

  if (hitTop && canAddWeight) {
    const next = weight + STEP[region]
    return { weight: next, reps: plan.reps_min, text: `Subir para ${fmt(next)} kg e buscar ${plan.reps_min}+ reps.` }
  }
  if (hitTop) {
    const step = timed ? 5 : 2
    const target = plan.reps_max + step
    const extra = timed ? '' : ' ou use uma variação mais difícil'
    return { weight, reps: target, text: `Bateu o topo! Busque ${target} ${u}${extra}.` }
  }
  const minReps = Math.min(...topSets.map((s) => s.reps))
  const target = Math.min(minReps + (timed ? 5 : 1), plan.reps_max)
  const load = weight > 0 ? `Manter ${fmt(weight)} kg e buscar` : 'Buscar'
  return { weight, reps: target, text: `${load} ${target} ${u} em todas.` }
}

export const fmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })