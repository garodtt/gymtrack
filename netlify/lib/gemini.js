// Funções compartilhadas pelas Netlify Functions que usam o Gemini.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Confere se quem chamou está logado no Supabase (evita gastarem sua cota)
export async function verifyUser(req) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY },
  })
  return res.ok
}

// Chama o Gemini pedindo JSON; tenta o modelo reserva se o principal estiver ocupado.
// fast: pede raciocínio curto (thinkingLevel "low"), bem mais rápido para respostas estruturadas.
export async function callGemini(prompt, schema, { fast = false } = {}) {
  const {
    GEMINI_API_KEY,
    GEMINI_MODEL = 'gemini-3.8-flash',
    GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite',
  } = process.env
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada')

  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i)
  let lastError = ''
  for (const model of models) {
    let useThinking = fast
    for (let attempt = 0; attempt < 2; attempt++) {
      const generationConfig = { responseMimeType: 'application/json', responseSchema: schema }
      if (useThinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' }
      const res = await fetch(`${GEMINI_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
        return JSON.parse(text)
      }
      const body = await res.text()
      lastError = `${model} ${res.status}: ${body}`
      // modelo não aceita thinkingLevel: tenta de novo sem ele
      if (res.status === 400 && useThinking && /thinking/i.test(body)) { useThinking = false; continue }
      break
    }
    if (!/ (404|429|503):/.test(lastError)) break
  }
  throw new Error(lastError)
}