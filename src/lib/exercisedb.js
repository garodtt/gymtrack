// ExerciseDB (versão gratuita/open source): 1.500 exercícios com GIF, sem chave de API.
import { supabase } from './supabase'

const BASE = 'https://oss.exercisedb.dev/api/v1'

export async function searchExerciseDB(term, limit = 10) {
  const res = await fetch(`${BASE}/exercises/search?search=${encodeURIComponent(term)}&limit=${limit}`)
  if (!res.ok) throw new Error(`ExerciseDB ${res.status}`)
  const json = await res.json()
  return json.data ?? []
}

// Busca o GIF na 1ª vez e salva no Supabase (cache), para não depender da API sempre.
export async function ensureGif(exercise) {
  if (exercise.gif_url) return exercise.gif_url
  if (!exercise.exercisedb_query) return null
  try {
    const results = await searchExerciseDB(exercise.exercisedb_query, 5)
    const q = exercise.exercisedb_query.toLowerCase()
    const best = results.find((r) => r.name.toLowerCase() === q) ?? results[0]
    if (!best) return null
    await supabase
      .from('exercises')
      .update({ exercisedb_id: best.exerciseId, gif_url: best.gifUrl })
      .eq('id', exercise.id)
    return best.gifUrl
  } catch (err) {
    console.warn('Falha ao buscar GIF', err)
    return null
  }
}
