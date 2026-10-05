import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveRoutine } from '../lib/data'

const SELECT = '*, routine_days(*, routine_exercises(*, exercises(id, name)))'

export default function Routines({ session }) {
  const userId = session.user.id
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [mine, setMine] = useState([])
  const [tab, setTab] = useState('ia')

  async function load() {
    const { data } = await supabase.from('routines').select(SELECT).order('created_at', { ascending: false })
    const sorted = (data ?? []).map((r) => ({
      ...r,
      routine_days: r.routine_days.sort((a, b) => a.day_order - b.day_order).map((d) => ({
        ...d,
        routine_exercises: d.routine_exercises.sort((a, b) => a.position - b.position),
      })),
    }))
    setTemplates(sorted.filter((r) => r.is_template))
    setMine(sorted.filter((r) => !r.is_template))
  }
  useEffect(() => { load() }, [])

  async function applyTemplate(t) {
    await saveRoutine(
      {
        name: t.name,
        description: t.description,
        source: 'template',
        days: t.routine_days.map((d) => ({
          name: d.name,
          exercises: d.routine_exercises.map((re) => ({ ...re, exercise_id: re.exercise_id })),
        })),
      },
      userId,
    )
    navigate('/')
  }

  async function activate(id) {
    await supabase.from('routines').update({ is_active: false }).eq('user_id', userId)
    await supabase.from('routines').update({ is_active: true }).eq('id', id)
    navigate('/')
  }

  return (
    <div className="stack">
      <h1>Rotinas</h1>
      <div className="tabs">
        <button className={tab === 'ia' ? 'active' : ''} onClick={() => setTab('ia')}>Gerar com IA</button>
        <button className={tab === 'modelos' ? 'active' : ''} onClick={() => setTab('modelos')}>Modelos</button>
        <button className={tab === 'minhas' ? 'active' : ''} onClick={() => setTab('minhas')}>Minhas</button>
      </div>

      {tab === 'ia' && <AiGenerator session={session} onSaved={() => navigate('/')} />}

      {tab === 'modelos' && templates.map((t) => (
        <RoutineCard key={t.id} routine={t} action={<button className="primary" onClick={() => applyTemplate(t)}>Usar esta rotina</button>} />
      ))}

      {tab === 'minhas' && (mine.length === 0 ? <p className="muted">Nenhuma rotina salva ainda.</p> :
        mine.map((r) => (
          <RoutineCard key={r.id} routine={r} action={r.is_active
            ? <span className="badge">Ativa</span>
            : <button onClick={() => activate(r.id)}>Ativar</button>} />
        )))}
    </div>
  )
}

function RoutineCard({ routine, action }) {
  return (
    <section className="card">
      <h2>{routine.name} {routine.source === 'ai' && <span className="badge">IA</span>}</h2>
      {routine.description && <p className="muted">{routine.description}</p>}
      {routine.routine_days.map((d) => (
        <details key={d.id}>
          <summary>{d.name} · {d.routine_exercises.length} exercícios</summary>
          <ul className="list small">
            {d.routine_exercises.map((re) => (
              <li key={re.id}><span>{re.exercises?.name}</span><span className="muted">{re.sets} × {re.reps_min}–{re.reps_max}</span></li>
            ))}
          </ul>
        </details>
      ))}
      <div className="row-end">{action}</div>
    </section>
  )
}

function AiGenerator({ session, onSaved }) {
  const [profile, setProfile] = useState(null)
  const [extra, setExtra] = useState('')
  const [plan, setPlan] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)
      const { data: c } = await supabase.from('exercises').select('id, name, muscle_group, equipment')
      setCatalog(c ?? [])
    })()
  }, [session.user.id])

  if (!profile) return <p className="muted">Carregando perfil…</p>
  const set = (k, v) => setProfile((p) => ({ ...p, [k]: v }))

  async function generate(e) {
    e.preventDefault()
    setLoading(true); setError(null); setPlan(null)
    await supabase.from('profiles').update({
      goal: profile.goal, level: profile.level, days_per_week: profile.days_per_week,
      session_minutes: profile.session_minutes, equipment: profile.equipment, notes: profile.notes,
    }).eq('id', session.user.id)
    try {
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ profile, catalog, extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(res.status === 429 ? 'Limite da IA atingido, tente em alguns minutos.' : data.error)
      setPlan(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    await saveRoutine({ ...plan, source: 'ai' }, session.user.id)
    onSaved()
  }

  const nameOf = (id) => catalog.find((c) => c.id === id)?.name ?? `#${id}`

  return (
    <div className="stack">
      <form className="card stack" onSubmit={generate}>
        <label>Objetivo
          <select value={profile.goal} onChange={(e) => set('goal', e.target.value)}>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="forca">Força</option>
            <option value="emagrecimento">Emagrecimento</option>
            <option value="condicionamento">Condicionamento</option>
          </select>
        </label>
        <label>Nível
          <select value={profile.level} onChange={(e) => set('level', e.target.value)}>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </label>
        <div className="grid2">
          <label>Dias/semana
            <input type="number" min="1" max="7" value={profile.days_per_week} onChange={(e) => set('days_per_week', Number(e.target.value))} />
          </label>
          <label>Minutos/treino
            <input type="number" min="20" max="180" step="5" value={profile.session_minutes} onChange={(e) => set('session_minutes', Number(e.target.value))} />
          </label>
        </div>
        <label>Equipamentos (separados por vírgula)
          <input value={(profile.equipment ?? []).join(', ')} onChange={(e) => set('equipment', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </label>
        <label>Lesões ou limitações
          <input value={profile.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="ex.: dor no ombro direito" />
        </label>
        <label>Pedido extra (opcional)
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="ex.: foco em glúteos" />
        </label>
        <button className="primary" disabled={loading}>{loading ? 'Gerando…' : 'Gerar treino com IA'}</button>
        {error && <p className="error">{error}</p>}
      </form>

      {plan && (
        <section className="card">
          <h2>{plan.name} <span className="badge">IA</span></h2>
          <p className="muted">{plan.description}</p>
          {plan.days.map((d, i) => (
            <div key={i}>
              <h3>{d.name}</h3>
              <ul className="list small">
                {d.exercises.map((e, j) => (
                  <li key={j}><span>{nameOf(e.exercise_id)}</span><span className="muted">{e.sets} × {e.reps_min}–{e.reps_max} · {e.rest_seconds}s</span></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="row-end">
            <button onClick={() => setPlan(null)}>Descartar</button>
            <button className="primary" onClick={save}>Salvar e ativar</button>
          </div>
        </section>
      )}
    </div>
  )
}
