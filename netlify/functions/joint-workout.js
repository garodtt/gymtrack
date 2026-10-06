// Netlify Function: monta um treino em dupla com o Gemini.
// Rota: POST /api/joint-workout  { context, catalog[], place, groups[], minutes }
import { json, verifyUser, callGemini } from '../lib/gemini.js'

const person = {
  type: 'OBJECT',
  properties: { sets: { type: 'INTEGER' }, reps_min: { type: 'INTEGER' }, reps_max: { type: 'INTEGER' } },
  required: ['sets', 'reps_min', 'reps_max'],
}
const schema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Nome curto do treino, ex.: "Dupla — Pernas e core"' },
    explanation: { type: 'STRING', description: '2-3 frases: por que esse treino é bom para os dois' },
    exercises: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          exercise_id: { type: 'INTEGER' },
          rest_seconds: { type: 'INTEGER' },
          notes: { type: 'STRING', description: 'dica curta, opcional (ex.: revezem na máquina)' },
          creator: person,
          partner: person,
        },
        required: ['exercise_id', 'rest_seconds', 'creator', 'partner'],
      },
    },
  },
  required: ['title', 'explanation', 'exercises'],
}

const GROUP_PT = {
  peito: 'peito', costas: 'costas', ombros: 'ombros', biceps: 'bíceps', triceps: 'tríceps', antebraco: 'antebraço',
  pernas: 'pernas', gluteos: 'glúteos', panturrilha: 'panturrilha', core: 'abdômen/core', cardio: 'cardio',
}

const describe = (p) => `- Nome: ${p?.name}
- Objetivo: ${p?.goal ?? 'não informado'}
- Nível: ${p?.level ?? 'não informado'}
- Tempo disponível: ${p?.session_minutes ?? 60} min
- Equipamentos: ${(p?.equipment ?? []).join(', ') || 'não informado'}
- Lesões/observações: ${p?.notes || 'nenhuma'}`

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (!(await verifyUser(req))) return json({ error: 'Não autenticado' }, 401)

  const { context, catalog = [], place = 'academia', groups = [], minutes = 60 } = await req.json()
  if (!context?.me || !context?.partner) return json({ error: 'Contexto inválido' }, 400)

  const catalogText = catalog
    .map((e) => `${e.id} | ${e.name} | ${e.muscle_group} | ${e.equipment ?? ''} | ${e.unit === 'segundos' ? 'segundos' : 'reps'}`)
    .join('\n')

  const prompt = `Você é um personal trainer montando UM treino para duas pessoas treinarem juntas, lado a lado.

Pessoa A (quem está criando):
${describe(context.me)}
- Grupos musculares treinados nos últimos 4 dias: ${(context.me_recent ?? []).join(', ') || 'nenhum'}

Pessoa B (parceiro):
${describe(context.partner)}
- Grupos musculares treinados nos últimos 4 dias: ${(context.partner_recent ?? []).join(', ') || 'nenhum'}

Treino:
- Local: ${place === 'casa' ? 'em casa, sem academia (calistenia)' : 'academia'}
- Foco: ${groups.length ? groups.map((g) => GROUP_PT[g] ?? g).join(', ') : 'escolha o foco ideal considerando o que cada um treinou recentemente (evite músculos treinados nos últimos 2 dias por qualquer um)'}
- Duração: cerca de ${minutes} minutos

Regras:
- Os DOIS fazem os MESMOS exercícios, na mesma ordem (treinam juntos).
- Escolha exercícios bons para os objetivos e níveis de ambos e seguros para as lesões de ambos.
- Ajuste séries e repetições para cada pessoa ("creator" = Pessoa A, "partner" = Pessoa B) conforme o objetivo e o nível de cada uma
  (ex.: força 4-6 reps, hipertrofia 8-12, emagrecimento/condicionamento 12-20).
- O descanso é o mesmo para os dois.
- 4 a 7 exercícios. Compostos primeiro.
- Use SOMENTE exercícios do catálogo abaixo, pelo id. Quando a unidade for "segundos", reps_min/reps_max são segundos.
- Textos em português do Brasil. Na explicação, cite os nomes das duas pessoas.

Catálogo (id | nome | grupo | equipamento | unidade):
${catalogText}`

  try {
    const plan = await callGemini(prompt, schema, { fast: true })
    const valid = new Set(catalog.map((e) => e.id))
    plan.exercises = (plan.exercises ?? []).filter((e) => valid.has(e.exercise_id))
    if (!plan.exercises.length) return json({ error: 'A IA não conseguiu montar o treino. Tente de novo.' }, 502)
    return json(plan)
  } catch (err) {
    console.error('[joint-workout]', err.message)
    const limit = /429|RESOURCE_EXHAUSTED/i.test(err.message)
    return json({ error: limit ? 'Limite da IA atingido, tente em alguns minutos.' : 'Falha ao gerar o treino em dupla.' }, limit ? 429 : 502)
  }
}

export const config = { path: '/api/joint-workout' }