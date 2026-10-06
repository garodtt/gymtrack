// Netlify Function: traduções de exercícios com o Gemini.
// Rota: POST /api/translate-exercise
//   { name, instructions[] }        → { name, instructions[] }   (exercício completo)
//   { mode: 'names', names[] }      → { names[] }                (lista de nomes, mesma ordem)
//   { mode: 'query', query }        → { term }                   (busca em português → termo em inglês)
import { json, verifyUser, callGemini } from '../lib/gemini.js'

const STYLE = `Use o nome popular nas academias brasileiras (ex.: "barbell bench press" → "Supino reto com barra",
"lat pulldown" → "Puxada frontal", "lunge" → "Afundo", "fly" → "Crucifixo", "curl" → "Rosca",
"push-up" → "Flexão", "squat" → "Agachamento", "row" → "Remada"). Primeira letra maiúscula, sem ponto final.
Mantenha detalhes entre parênteses traduzidos (ex.: "(on stability ball)" → "(na bola suíça)").`

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)
  if (!(await verifyUser(req))) return json({ error: 'Não autenticado' }, 401)
  const body = await req.json()

  try {
    if (body.mode === 'names') {
      const names = (body.names ?? []).slice(0, 40)
      if (!names.length) return json({ names: [] })
      const out = await callGemini(
        `Traduza estes nomes de exercícios de musculação para português do Brasil, na MESMA ordem e quantidade (${names.length} itens).
${STYLE}

${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
        { type: 'OBJECT', properties: { names: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['names'] },
      )
      // garante mesma quantidade; se vier diferente, devolve os originais
      return json({ names: out.names?.length === names.length ? out.names : names })
    }

    if (body.mode === 'query') {
      const out = await callGemini(
        `Converta esta busca de exercício de academia (em português) para o termo curto em inglês usado em bancos de exercícios
(ex.: "crucifixo" → "fly", "supino inclinado" → "incline bench press", "agachamento" → "squat", "rosca" → "curl",
"puxada" → "pulldown", "remada" → "row", "panturrilha" → "calf raise", "abdominal" → "crunch").
Responda só o termo, em minúsculas. Se já estiver em inglês, devolva igual.

Busca: ${body.query}`,
        { type: 'OBJECT', properties: { term: { type: 'STRING' } }, required: ['term'] },
      )
      return json({ term: (out.term ?? body.query).trim() })
    }

    // exercício completo: nome + instruções
    const { name, instructions = [] } = body
    if (!name) return json({ error: 'Nome obrigatório' }, 400)
    const out = await callGemini(
      `Traduza este exercício de musculação para português do Brasil.
- ${STYLE}
- Traduza cada instrução de forma curta e direta, no imperativo, mantendo a mesma quantidade de itens.

Nome: ${name}
Instruções:
${instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, instructions: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['name', 'instructions'],
      },
    )
    return json(out)
  } catch (err) {
    console.error('[translate-exercise]', err.message)
    return json({ error: 'Falha na tradução' }, 502)
  }
}

export const config = { path: '/api/translate-exercise' }