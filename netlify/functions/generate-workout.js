// Netlify Function: gera uma rotina com o Gemini.
// A chave GEMINI_API_KEY fica só no servidor (variáveis de ambiente do Netlify).
// Rota pública: POST /api/generate-workout

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// Schema da resposta (formato Schema do Gemini) — o Gemini devolve exatamente neste formato
const planSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Nome curto da rotina, em português' },
    description: { type: 'STRING', description: 'Resumo de 1-2 frases: divisão e frequência' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Ex.: "A — Peito e tríceps"' },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                exercise_id: { type: 'INTEGER', description: 'id do catálogo fornecido' },
                sets: { type: 'INTEGER' },
                reps_min: { type: 'INTEGER' },
                reps_max: { type: 'INTEGER' },
                rest_seconds: { type: 'INTEGER' },
                notes: { type: 'STRING' },
              },
              required: ['exercise_id', 'sets', 'reps_min', 'reps_max', 'rest_seconds'],
            },
          },
        },
        required: ['name', 'exercises'],
      },
    },
  },
  required: ['name', 'description', 'days'],
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const {
    GEMINI_API_KEY,
    GEMINI_MODEL = 'gemini-3.8-flash',
    GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite',
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  } = process.env
  if (!GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY não configurada' }, 500)

  // 1) Só usuários logados podem gerar (evita gastarem sua cota)
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Não autenticado' }, 401)
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
  if (!userRes.ok) return json({ error: 'Sessão inválida' }, 401)

  // 2) Dados enviados pelo app
  const { profile, catalog, extra, place = 'academia' } = await req.json()
  const catalogText = catalog
    .map((e) => `${e.id} | ${e.name} | ${e.muscle_group} | ${e.equipment ?? ''} | ${e.unit === 'segundos' ? 'segundos' : 'reps'}`)
    .join('\n')

  const prompt = `Você é um personal trainer. Monte uma rotina semanal de musculação.

Perfil:
- Objetivo: ${profile.goal}
- Nível: ${profile.level}
- Dias por semana: ${profile.days_per_week}
- Tempo por treino: ${profile.session_minutes} minutos
- Equipamentos: ${(profile.equipment || []).join(', ')}
- Local: ${place === 'casa' ? 'em casa, sem academia (calistenia / peso corporal)' : 'academia'}
- Observações/lesões: ${profile.notes || 'nenhuma'}
${extra ? `- Pedido extra: ${extra}` : ''}

Regras:
- Crie exatamente ${profile.days_per_week} dias de treino (a rotina repete em ciclo).
- Use SOMENTE exercícios do catálogo abaixo, referenciando pelo id.
- 4 a 7 exercícios por dia, compostos primeiro, isolados depois.
- Faixas de repetição coerentes com o objetivo (ex.: força 4-6, hipertrofia 8-12).
- Quando a unidade do exercício for "segundos", reps_min/reps_max são segundos (ex.: 30-45).
${place === 'casa' ? '- Treino em casa: progrida com variações mais difíceis e mais repetições, não com carga. Inclua exercícios de cardio quando o objetivo for emagrecimento ou condicionamento.' : ''}
- Respeite o tempo por treino e as lesões.
- Textos em português do Brasil.

Catálogo (id | nome | grupo | equipamento | unidade):
${catalogText}`

  // 3) Chamada ao Gemini com saída estruturada em JSON.
  //    Se o modelo principal estiver sobrecarregado (503), sem cota (429) ou indisponível (404),
  //    tenta o modelo reserva, mais leve.
  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i)
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: planSchema,
    },
  })

  let geminiRes
  let usedModel
  for (const model of models) {
    usedModel = model
    geminiRes = await fetch(`${GEMINI_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (geminiRes.ok) break
    console.warn(`[generate-workout] ${model} respondeu ${geminiRes.status}`)
    if (![404, 429, 503].includes(geminiRes.status)) break // erro de chave/pedido: não adianta trocar
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text()
    console.error(`[generate-workout] Gemini ${geminiRes.status} (modelo ${usedModel}):`, detail)
    let message = detail
    try { message = JSON.parse(detail).error?.message ?? detail } catch {}
    const status = geminiRes.status === 429 ? 429 : 502
    return json({ error: `Falha no Gemini (${geminiRes.status}): ${message}`, detail }, status)
  }
  console.log(`[generate-workout] rotina gerada com ${usedModel}`)

  const data = await geminiRes.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''

  let plan
  try {
    plan = JSON.parse(text)
  } catch {
    return json({ error: 'Resposta da IA não veio em JSON', raw: text }, 502)
  }

  // 4) Remove exercícios que não existem no catálogo (segurança extra)
  const validIds = new Set(catalog.map((e) => e.id))
  plan.days = (plan.days || []).map((d) => ({
    ...d,
    exercises: (d.exercises || []).filter((e) => validIds.has(e.exercise_id)),
  }))

  return json(plan)
}

export const config = { path: '/api/generate-workout' }