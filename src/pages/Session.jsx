import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFeedback } from '../components/Feedback'
import { unitHeader } from '../lib/exercise'

// datetime-local usa horário local sem fuso: "2026-10-05T18:30"
const toLocalInput = (iso) => {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function Session() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [sets, setSets] = useState([])
  const { confirm, toast } = useFeedback()

  async function load() {
    const { data: s } = await supabase
      .from('workout_sessions_gymtrack')
      .select('*, routine_days:routine_days_gymtrack(name)')
      .eq('id', id)
      .maybeSingle()
    setSession(s)
    const { data: l } = await supabase
      .from('set_logs_gymtrack')
      .select('id, exercise_id, set_number, weight_kg, reps, exercises:exercises_gymtrack(name, unit)')
      .eq('session_id', id)
      .order('exercise_id')
      .order('set_number')
    setSets((l ?? []).map((x) => ({ ...x, weight_kg: String(x.weight_kg), reps: String(x.reps) })))
  }
  useEffect(() => { load() }, [id])

  // agrupa as séries por exercício, na ordem em que foram feitos
  const groups = useMemo(() => {
    const map = new Map()
    sets.forEach((s) => {
      if (!map.has(s.exercise_id)) map.set(s.exercise_id, { name: s.exercises?.name, exercise: s.exercises, sets: [] })
      map.get(s.exercise_id).sets.push(s)
    })
    return [...map.entries()]
  }, [sets])

  const flash = (text) => toast(text, text.startsWith('Erro') || text.startsWith('Valor') ? 'error' : 'success')

  const change = (setId, field, value) =>
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, [field]: value } : s)))

  async function saveSet(s) {
    const weight = Number(String(s.weight_kg).replace(',', '.'))
    const reps = Number(s.reps)
    if (Number.isNaN(weight) || !Number.isInteger(reps) || reps < 0) return flash('Valor inválido')
    const { error } = await supabase
      .from('set_logs_gymtrack')
      .update({ weight_kg: weight, reps })
      .eq('id', s.id)
    flash(error ? `Erro: ${error.message}` : 'Salvo')
  }

  async function deleteSet(s) {
    const ok = await confirm({
      title: `Excluir a série ${s.set_number}?`,
      message: s.exercises?.name,
      confirmText: 'Excluir', danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('set_logs_gymtrack').delete().eq('id', s.id)
    if (error) return flash(`Erro: ${error.message}`)
    setSets((prev) => prev.filter((x) => x.id !== s.id))
    flash('Série excluída')
  }

  async function addSet(exerciseId, groupSets) {
    const last = groupSets.at(-1)
    const { data, error } = await supabase
      .from('set_logs_gymtrack')
      .insert({
        session_id: Number(id),
        exercise_id: exerciseId,
        set_number: Math.max(...groupSets.map((s) => s.set_number)) + 1,
        weight_kg: Number(last.weight_kg) || 0,
        reps: Number(last.reps) || 0,
      })
      .select('id, exercise_id, set_number, weight_kg, reps, exercises:exercises_gymtrack(name, unit)')
      .single()
    if (error) return flash(`Erro: ${error.message}`)
    setSets((prev) => [...prev, { ...data, weight_kg: String(data.weight_kg), reps: String(data.reps) }])
    flash('Série adicionada')
  }

  async function changeDate(value) {
    if (!value) return
    const started = new Date(value)
    const patch = { started_at: started.toISOString() }
    // mantém a duração do treino ao mudar a data
    if (session.finished_at) {
      const dur = new Date(session.finished_at) - new Date(session.started_at)
      patch.finished_at = new Date(started.getTime() + dur).toISOString()
    }
    const { error } = await supabase.from('workout_sessions_gymtrack').update(patch).eq('id', id)
    if (!error) setSession((s) => ({ ...s, ...patch }))
    flash(error ? `Erro: ${error.message}` : 'Data atualizada')
  }

  async function finish() {
    const finished_at = new Date().toISOString()
    await supabase.from('workout_sessions_gymtrack').update({ finished_at }).eq('id', id)
    setSession((s) => ({ ...s, finished_at }))
    flash('Treino finalizado')
  }

  async function deleteSession() {
    const ok = await confirm({
      title: 'Excluir este treino?',
      message: 'Todas as séries dele serão apagadas. Não dá para desfazer.',
      confirmText: 'Excluir', danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('workout_sessions_gymtrack').delete().eq('id', id)
    if (error) return flash(`Erro: ${error.message}`)
    flash('Treino excluído')
    navigate('/progresso')
  }

  if (session === null) return <p className="muted">Carregando…</p>
  if (!session) return <p className="muted">Treino não encontrado. <Link to="/progresso">Voltar</Link></p>

  return (
    <div className="stack">
      <Link to="/progresso" className="muted back icon-text"><ArrowLeft size={16} /> Progresso</Link>
      <h1>{session.routine_days?.name ?? 'Treino'}</h1>

      <section className="card stack">
        <label>Data e hora do treino
          <input type="datetime-local" defaultValue={toLocalInput(session.started_at)} onBlur={(e) => changeDate(e.target.value)} />
        </label>
        {!session.finished_at && (
          <div className="row-between">
            <span className="muted">Este treino não foi finalizado.</span>
            <button onClick={finish}>Finalizar agora</button>
          </div>
        )}
      </section>

      {groups.length === 0 && <p className="muted">Nenhuma série registrada neste treino.</p>}

      {groups.map(([exerciseId, g]) => (
        <section key={exerciseId} className="card">
          <h2>{g.name}</h2>
          <table className="sets">
            <thead><tr><th>Série</th><th>kg</th><th>{unitHeader(g.exercise)}</th><th></th></tr></thead>
            <tbody>
              {g.sets.map((s) => (
                <tr key={s.id}>
                  <td>{s.set_number}</td>
                  <td><input inputMode="decimal" value={s.weight_kg} onChange={(e) => change(s.id, 'weight_kg', e.target.value)} onBlur={() => saveSet(s)} /></td>
                  <td><input inputMode="numeric" value={s.reps} onChange={(e) => change(s.id, 'reps', e.target.value)} onBlur={() => saveSet(s)} /></td>
                  <td><button className="check danger" onClick={() => deleteSet(s)} aria-label="Excluir série"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="link add icon-text" onClick={() => addSet(exerciseId, g.sets)}><Plus size={16} /> adicionar série</button>
        </section>
      ))}

      <button className="danger-outline icon-text" onClick={deleteSession}><Trash2 size={18} /> Excluir treino inteiro</button>
    </div>
  )
}