// Progressão dupla: bateu o topo da faixa em todas as séries → sobe a carga.
const STEP = { superior: 2.5, inferior: 5, core: 0 }

/**
 * @param lastSets  séries da última sessão deste exercício [{weight_kg, reps}]
 * @param plan      {sets, reps_min, reps_max}
 * @param region    'superior' | 'inferior' | 'core'
 */
export function suggestNext(lastSets, plan, region = 'superior') {
  if (!lastSets?.length) {
    return { weight: null, reps: plan.reps_min, text: 'Primeira vez: escolha uma carga confortável.' }
  }
  const weight = Math.max(...lastSets.map((s) => Number(s.weight_kg)))
  const topSets = lastSets.filter((s) => Number(s.weight_kg) === weight)
  const hitTop = topSets.length >= plan.sets && topSets.every((s) => s.reps >= plan.reps_max)

  if (hitTop && STEP[region] > 0) {
    const next = weight + STEP[region]
    return { weight: next, reps: plan.reps_min, text: `Subir para ${fmt(next)} kg e buscar ${plan.reps_min}+ reps.` }
  }
  if (hitTop) {
    return { weight, reps: plan.reps_max + 2, text: `Aumente o tempo/reps: busque ${plan.reps_max + 2}.` }
  }
  const minReps = Math.min(...topSets.map((s) => s.reps))
  const target = Math.min(minReps + 1, plan.reps_max)
  return { weight, reps: target, text: `Manter ${fmt(weight)} kg e buscar ${target} reps em todas.` }
}

export const fmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
