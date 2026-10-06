// Traduz TODOS os exercícios do ExerciseDB para português e gera arquivos .sql
// para rodar no Supabase (tabela exercise_translations_gymtrack).
//
// Como usar (na pasta do projeto):   npm run traduzir
// - Usa a GEMINI_API_KEY do seu .env.
// - Pode parar (Ctrl+C) e rodar de novo: continua de onde parou.
// - Ao final, os arquivos ficam em supabase/traducoes/ (rode cada um no SQL Editor).
import fs from 'node:fs'
import path from 'node:path'

process.loadEnvFile?.('.env')
const { callGemini } = await import('../netlify/lib/gemini.js')

const API = 'https://oss.exercisedb.dev/api/v1'
const DIR = 'scripts/.cache'
const RAW_FILE = path.join(DIR, 'exercisedb.json')
const DONE_FILE = path.join(DIR, 'traducoes.json')
const OUT_DIR = 'supabase/traducoes'
const BATCH = 8          // exercícios por chamada ao Gemini
const PAUSE_MS = 4500    // pausa entre chamadas (respeita o limite do plano gratuito)
const PER_SQL = 250      // exercícios por arquivo .sql

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(DIR, { recursive: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

// ---------- 1) baixa a lista completa (uma vez) ----------
async function fetchJson(url) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url).catch(() => null)
    if (res?.ok) return res.json()
    const status = res?.status ?? 'sem conexão'
    console.log(`  ExerciseDB respondeu ${status}, tentando de novo (${attempt}/6)...`)
    await wait(2000 * attempt)
  }
  throw new Error(`Falha ao acessar ${url}`)
}

async function downloadAll() {
  if (fs.existsSync(RAW_FILE)) return JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'))
  console.log('Baixando a lista de exercícios do ExerciseDB...')
  const all = []
  let after = null
  do {
    const url = `${API}/exercises?limit=50${after ? `&after=${after}` : ''}`
    const json = await fetchJson(url)
    all.push(...(json.data ?? []))
    after = json.meta?.hasNextPage ? json.meta.nextCursor : null
    process.stdout.write(`\r  ${all.length} de ${json.meta?.total ?? '?'} exercícios`)
    await wait(300)
  } while (after)
  console.log('\n  Lista salva.')
  fs.writeFileSync(RAW_FILE, JSON.stringify(all))
  return all
}

// ---------- 2) traduz em lotes ----------
const STYLE = `Use o nome popular nas academias brasileiras (ex.: "barbell bench press" → "Supino reto com barra",
"lat pulldown" → "Puxada frontal", "lunge" → "Afundo", "fly" → "Crucifixo", "curl" → "Rosca",
"push-up" → "Flexão", "squat" → "Agachamento", "row" → "Remada"). Primeira letra maiúscula, sem ponto final.
Mantenha detalhes entre parênteses traduzidos (ex.: "(on stability ball)" → "(na bola suíça)").`

const schema = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, instructions: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['name', 'instructions'],
      },
    },
  },
  required: ['items'],
}

const clean = (list) => (list ?? []).map((s) => s.replace(/^Step:\s*\d+\s*/i, ''))

async function translateBatch(batch) {
  const prompt = `Traduza estes ${batch.length} exercícios de musculação para português do Brasil, na MESMA ordem.
- ${STYLE}
- Traduza cada instrução de forma curta e direta, no imperativo, mantendo a mesma quantidade de instruções de cada exercício.

${batch.map((x, i) => `### ${i + 1}. ${x.name}\n${clean(x.instructions).map((s, j) => `${j + 1}) ${s}`).join('\n')}`).join('\n\n')}`
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const out = await callGemini(prompt, schema)
      if (out.items?.length === batch.length) return out.items
      throw new Error('quantidade diferente na resposta')
    } catch (err) {
      const limit = /429|quota|RESOURCE_EXHAUSTED/i.test(err.message)
      const ms = limit ? 30000 * attempt : 4000 * attempt
      console.log(`\n  Gemini: ${limit ? 'limite atingido' : err.message.slice(0, 120)} — esperando ${ms / 1000}s (${attempt}/5)`)
      await wait(ms)
    }
  }
  return null // pula este lote; rode o script de novo depois
}

// ---------- 3) gera os arquivos .sql ----------
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const arr = (list) => (list?.length ? `array[${list.map(q).join(', ')}]` : 'null')

function writeSql(done) {
  for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith('.sql')) fs.unlinkSync(path.join(OUT_DIR, f))
  const ids = Object.keys(done)
  for (let i = 0, n = 1; i < ids.length; i += PER_SQL, n++) {
    const rows = ids.slice(i, i + PER_SQL).map((id) => `  (${q(id)}, ${q(done[id].name)}, ${arr(done[id].instructions)})`)
    const sql = `-- GymTrack — traduções do ExerciseDB (parte ${n})
-- Rode no SQL Editor do Supabase. Pode rodar de novo sem problema.
insert into public.exercise_translations_gymtrack (exercisedb_id, name_pt, instructions_pt) values
${rows.join(',\n')}
on conflict (exercisedb_id) do update set
  name_pt = excluded.name_pt,
  instructions_pt = excluded.instructions_pt,
  updated_at = now();
`
    fs.writeFileSync(path.join(OUT_DIR, `traducoes_${String(n).padStart(2, '0')}.sql`), sql)
  }
}

// ---------- execução ----------
const all = await downloadAll()
const done = fs.existsSync(DONE_FILE) ? JSON.parse(fs.readFileSync(DONE_FILE, 'utf8')) : {}
const todo = all.filter((x) => !done[x.exerciseId])
console.log(`Total: ${all.length} · já traduzidos: ${Object.keys(done).length} · faltam: ${todo.length}`)
if (todo.length) {
  const minutes = Math.ceil((todo.length / BATCH) * (PAUSE_MS + 5000) / 60000)
  console.log(`Tempo estimado: ~${minutes} min. Pode deixar rodando (Ctrl+C para parar e continuar depois).\n`)
}

let skipped = 0
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH)
  const items = await translateBatch(batch)
  if (items) {
    batch.forEach((x, j) => { done[x.exerciseId] = { name: items[j].name, instructions: items[j].instructions } })
    fs.writeFileSync(DONE_FILE, JSON.stringify(done))
  } else skipped += batch.length
  const pct = Math.round(((i + batch.length) / todo.length) * 100)
  process.stdout.write(`\r  Traduzindo... ${Object.keys(done).length}/${all.length} (${pct}%)   `)
  await wait(PAUSE_MS)
}

writeSql(done)
const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.sql')).sort()
console.log(`\n\nPronto! ${Object.keys(done).length} exercícios traduzidos.`)
if (skipped) console.log(`${skipped} ficaram sem tradução (limite do Gemini). Rode "npm run traduzir" de novo para completar.`)
console.log(`Arquivos gerados em ${OUT_DIR}/:`)
files.forEach((f) => console.log(`  - ${f}`))
console.log('Rode cada um no SQL Editor do Supabase.')