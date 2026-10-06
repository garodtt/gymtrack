// Traduções do ExerciseDB para português, guardadas no Supabase (tabela compartilhada).
// Fluxo: a lista carrega → nomes traduzidos na hora → passo a passo traduzido em segundo plano,
// em lotes pequenos. Ao abrir um exercício, a tradução normalmente já está pronta.
import { supabase } from './supabase'

const TABLE = 'exercise_translations_gymtrack'
const mem = new Map()      // exercisedb_id → { name, instructions }
const pending = new Map()  // exercisedb_id → Promise<{ name, instructions } | null>

export const getTranslation = (id) => mem.get(id)
export const hasFull = (id) => !!mem.get(id)?.instructions?.length

async function callApi(body, token) {
  const res = await fetch('/api/translate-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Tradução indisponível')
  return res.json()
}

function remember(id, patch) {
  const cur = mem.get(id) ?? {}
  mem.set(id, { ...cur, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v != null)) })
}

// 1) lê do banco o que já foi traduzido antes
export async function loadSaved(ids) {
  const missing = ids.filter((id) => !mem.has(id))
  if (!missing.length) return
  const { data } = await supabase.from(TABLE).select('exercisedb_id, name_pt, instructions_pt').in('exercisedb_id', missing)
  ;(data ?? []).forEach((r) => remember(r.exercisedb_id, { name: r.name_pt, instructions: r.instructions_pt }))
}

// 2) traduz os nomes que faltam (uma chamada para a página toda)
export async function ensureNames(items, token) {
  const missing = items.filter((x) => !mem.get(x.exerciseId)?.name)
  if (!missing.length) return
  const { names } = await callApi({ mode: 'names', names: missing.map((x) => x.name) }, token)
  const rows = missing.map((x, i) => ({ exercisedb_id: x.exerciseId, name_pt: names[i] })).filter((r) => r.name_pt)
  rows.forEach((r) => remember(r.exercisedb_id, { name: r.name_pt }))
  if (rows.length) await supabase.from(TABLE).upsert(rows, { onConflict: 'exercisedb_id' })
}

// 3) traduz nome + passo a passo em lotes de 5, em segundo plano
export function ensureFull(items, token) {
  const todo = items.filter((x) => x.instructions?.length && !hasFull(x.exerciseId) && !pending.has(x.exerciseId))
  for (let i = 0; i < todo.length; i += 5) {
    const chunk = todo.slice(i, i + 5)
    // lotes em sequência: cada um espera o anterior (não estoura o limite do Gemini)
    const prev = i === 0 ? Promise.resolve() : pending.get(todo[i - 1].exerciseId)
    const run = (prev ?? Promise.resolve()).catch(() => {}).then(() => translateChunk(chunk, token))
    chunk.forEach((x) => pending.set(x.exerciseId, run.then(() => mem.get(x.exerciseId) ?? null)))
  }
}

async function translateChunk(chunk, token) {
  try {
    const { items } = await callApi({
      mode: 'batch',
      items: chunk.map((x) => ({ name: x.name, instructions: cleanSteps(x.instructions) })),
    }, token)
    const rows = chunk.map((x, i) => ({
      exercisedb_id: x.exerciseId, name_pt: items[i].name, instructions_pt: items[i].instructions, updated_at: new Date().toISOString(),
    }))
    rows.forEach((r) => remember(r.exercisedb_id, { name: r.name_pt, instructions: r.instructions_pt }))
    await supabase.from(TABLE).upsert(rows, { onConflict: 'exercisedb_id' })
  } finally {
    chunk.forEach((x) => pending.delete(x.exerciseId))
  }
}

// 4) ao abrir um exercício: devolve a tradução completa (espera a que está em andamento, ou traduz agora)
export async function getFull(x, token) {
  if (hasFull(x.exerciseId)) return mem.get(x.exerciseId)
  await loadSaved([x.exerciseId])
  if (hasFull(x.exerciseId)) return mem.get(x.exerciseId)
  const inFlight = pending.get(x.exerciseId)
  if (inFlight) {
    const r = await inFlight.catch(() => null)
    if (r?.instructions?.length) return r
  }
  const { name, instructions } = await callApi({ name: x.name, instructions: cleanSteps(x.instructions) }, token)
  remember(x.exerciseId, { name, instructions })
  await supabase.from(TABLE).upsert(
    { exercisedb_id: x.exerciseId, name_pt: name, instructions_pt: instructions, updated_at: new Date().toISOString() },
    { onConflict: 'exercisedb_id' },
  )
  return mem.get(x.exerciseId)
}

const cleanSteps = (list) => (list ?? []).map((s) => s.replace(/^Step:\s*\d+\s*/i, ''))