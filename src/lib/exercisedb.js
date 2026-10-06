// ExerciseDB (versão gratuita/open source): 1.500 exercícios com GIF, sem chave de API.
// Os exercícios do catálogo já vêm com o GIF salvo no banco (seed.sql).
// A busca abaixo só é usada para exercícios sem GIF (ex.: criados por você).
import { supabase } from './supabase'

const BASE = 'https://oss.exercisedb.dev/api/v1'
export const gifFromId = (id) => `https://static.exercisedb.dev/media/${id}.gif`

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Fila: uma busca por vez, para não sobrecarregar a API gratuita
let queue = Promise.resolve()
function enqueue(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

// A API às vezes responde 503 (ocupada): tenta de novo até 3 vezes
export function searchExerciseDB(term, limit = 10) {
  return enqueue(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`${BASE}/exercises/search?search=${encodeURIComponent(term)}&limit=${limit}`)
      if (res.ok) return (await res.json()).data ?? []
      if (res.status !== 503 && res.status !== 429) throw new Error(`ExerciseDB ${res.status}`)
      await wait(800 * attempt)
    }
    throw new Error('ExerciseDB indisponível')
  })
}

// Garante um GIF: usa o salvo, monta pelo id ou busca pelo nome em inglês (e salva)
export async function ensureGif(exercise) {
  if (exercise.gif_url) return exercise.gif_url
  if (exercise.exercisedb_id) return gifFromId(exercise.exercisedb_id)
  if (!exercise.exercisedb_query) return null
  try {
    const results = await searchExerciseDB(exercise.exercisedb_query, 5)
    const q = exercise.exercisedb_query.toLowerCase()
    const best = results.find((r) => r.name.toLowerCase() === q) ?? results[0]
    if (!best) return null
    await supabase
      .from('exercises_gymtrack')
      .update({ exercisedb_id: best.exerciseId, gif_url: best.gifUrl })
      .eq('id', exercise.id)
    return best.gifUrl
  } catch (err) {
    console.warn('Falha ao buscar GIF', err)
    return null
  }
}

// ---------- Biblioteca: navegar e importar do ExerciseDB ----------

// partes do corpo da API → rótulo em português
export const DB_BODY_PARTS = {
  chest: 'Peito', back: 'Costas', shoulders: 'Ombros', 'upper arms': 'Braços',
  'lower arms': 'Antebraço', 'upper legs': 'Coxas e glúteos', 'lower legs': 'Panturrilha',
  waist: 'Abdômen', cardio: 'Cardio', neck: 'Pescoço',
}
export const DB_EQUIPMENTS = {
  bodyweight: 'Peso corporal', dumbbell: 'Halteres', barbell: 'Barra', cable: 'Polia',
  'leverage machine': 'Máquina', 'smith machine': 'Smith', kettlebell: 'Kettlebell',
  'resistance band': 'Elástico', 'EZ bar': 'Barra W', 'suspension trainer': 'Suspensão',
}

// lista com filtros e paginação por cursor
export function listExerciseDB({ bodyPart, equipment, after, limit = 20 } = {}) {
  const p = new URLSearchParams({ limit: String(limit) })
  if (bodyPart) p.set('bodyParts', bodyPart)
  if (equipment) p.set('equipments', equipment)
  if (after) p.set('after', after)
  return enqueue(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`${BASE}/exercises?${p}`)
      if (res.ok) {
        const json = await res.json()
        return { items: json.data ?? [], next: json.meta?.hasNextPage ? json.meta.nextCursor : null }
      }
      if (res.status !== 503 && res.status !== 429) throw new Error(`ExerciseDB ${res.status}`)
      await wait(800 * attempt)
    }
    throw new Error('ExerciseDB indisponível')
  })
}

// detalhes completos (músculos, equipamento, instruções)
export function getExerciseDB(id) {
  return enqueue(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`${BASE}/exercises/${id}`)
      if (res.ok) return (await res.json()).data
      if (res.status !== 503 && res.status !== 429) throw new Error(`ExerciseDB ${res.status}`)
      await wait(800 * attempt)
    }
    throw new Error('ExerciseDB indisponível')
  })
}

const EQUIPMENT_PT = {
  bodyweight: 'peso corporal', 'body weight': 'peso corporal', dumbbell: 'halteres', barbell: 'barra',
  'olympic barbell': 'barra', 'trap bar': 'barra', 'ez bar': 'barra W', cable: 'polia',
  'leverage machine': 'máquina', 'sled machine': 'máquina', 'smith machine': 'máquina', assisted: 'máquina',
  'resistance band': 'elástico', band: 'elástico', kettlebell: 'kettlebell', 'suspension trainer': 'suspensão',
  'stability ball': 'bola', 'bosu ball': 'bola', 'medicine ball': 'bola', weighted: 'anilha', rope: 'corda',
}

// converte um exercício da API para o formato do nosso catálogo
export function mapFromExerciseDB(x) {
  const parts = (x.bodyParts ?? []).map((s) => s.toLowerCase())
  const targets = (x.targetMuscles ?? []).map((s) => s.toLowerCase())
  const has = (...words) => words.some((w) => targets.some((t) => t.includes(w)))

  let group = 'core'
  if (parts.includes('chest')) group = 'peito'
  else if (parts.includes('back')) group = 'costas'
  else if (parts.includes('shoulders') || parts.includes('neck')) group = 'ombros'
  else if (parts.includes('upper arms')) group = has('tricep') ? 'triceps' : 'biceps'
  else if (parts.includes('lower arms')) group = 'antebraco'
  else if (parts.includes('upper legs')) group = has('glute', 'abductor') ? 'gluteos' : 'pernas'
  else if (parts.includes('lower legs')) group = 'panturrilha'
  else if (parts.includes('cardio') || has('cardio')) group = 'cardio'
  else if (parts.includes('waist')) group = 'core'

  const region = ['pernas', 'gluteos', 'panturrilha'].includes(group) ? 'inferior'
    : ['core', 'cardio'].includes(group) ? 'core' : 'superior'

  const eq = (x.equipments?.[0] ?? '').toLowerCase()
  const name = (x.name ?? '').toLowerCase()
  const timed = /plank|hold|isometric|stretch|wall sit|hang\b/.test(name)

  return {
    name: x.name,
    muscle_group: group,
    body_region: region,
    equipment: EQUIPMENT_PT[eq] ?? eq,
    unit: timed ? 'segundos' : 'reps',
    exercisedb_id: x.exerciseId,
    exercisedb_query: x.name,
    gif_url: x.gifUrl ?? gifFromId(x.exerciseId),
    instructions: (x.instructions ?? []).map((s) => s.replace(/^Step:\s*\d+\s*/i, '')),
  }
}

// tradução do nome e das instruções via Gemini (Netlify Function)
export async function translateExercise({ name, instructions }, accessToken) {
  const res = await fetch('/api/translate-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name, instructions }),
  })
  if (!res.ok) throw new Error('Tradução indisponível')
  return res.json() // { name, instructions }
}

// ---------- Tradução de listas (com cache no aparelho) ----------
const CACHE_KEY = 'gymtrack:nomes-pt'
let nameCache = null
function loadCache() {
  if (nameCache) return nameCache
  try { nameCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { nameCache = {} }
  return nameCache
}
function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(nameCache)) } catch { /* sem espaço/privado: ignora */ }
}

export const cachedNamePt = (id) => loadCache()[id]

// traduz os nomes que ainda não estão no cache; devolve { [exerciseId]: nomePt }
export async function translateNames(items, accessToken) {
  const cache = loadCache()
  const missing = items.filter((x) => !cache[x.exerciseId])
  if (missing.length) {
    const res = await fetch('/api/translate-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ mode: 'names', names: missing.map((x) => x.name) }),
    })
    if (res.ok) {
      const { names } = await res.json()
      missing.forEach((x, i) => { if (names[i]) cache[x.exerciseId] = names[i] })
      saveCache()
    }
  }
  return Object.fromEntries(items.map((x) => [x.exerciseId, cache[x.exerciseId]]))
}

// busca em português → termo em inglês
export async function translateQuery(query, accessToken) {
  try {
    const res = await fetch('/api/translate-exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ mode: 'query', query }),
    })
    if (res.ok) return (await res.json()).term || query
  } catch { /* usa o texto original */ }
  return query
}

// músculos e equipamentos da API em português (linha de detalhes da lista)
const MUSCLE_PT = {
  pectorals: 'peitoral', 'latissimus dorsi': 'dorsal', lats: 'dorsal', 'upper back': 'costas superiores',
  back: 'costas', trapezius: 'trapézio', traps: 'trapézio', rhomboids: 'romboides', deltoids: 'deltoides',
  delts: 'deltoides', 'rear deltoids': 'deltoide posterior', 'rotator cuff': 'manguito rotador',
  biceps: 'bíceps', triceps: 'tríceps', brachialis: 'braquial', forearms: 'antebraço',
  'wrist flexors': 'flexores do punho', 'wrist extensors': 'extensores do punho', 'grip muscles': 'pegada',
  quadriceps: 'quadríceps', quads: 'quadríceps', hamstrings: 'posterior de coxa', glutes: 'glúteos',
  adductors: 'adutores', abductors: 'abdutores', calves: 'panturrilha', soleus: 'sóleo',
  abs: 'abdômen', abdominals: 'abdômen', obliques: 'oblíquos', core: 'core', 'erector spinae': 'lombar',
  'lower back': 'lombar', 'hip flexors': 'flexores do quadril', 'serratus anterior': 'serrátil',
  'cardiovascular system': 'cardio', 'levator scapulae': 'elevador da escápula', neck: 'pescoço',
  'tibialis anterior': 'tibial',
}
export const musclePt = (m) => MUSCLE_PT[m?.toLowerCase()] ?? m
export const equipmentPt = (e) => EQUIPMENT_PT[e?.toLowerCase()] ?? e