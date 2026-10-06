import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUp, ArrowDown, ArrowLeftRight, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WEEKDAYS } from '../lib/data'
import ExercisePicker from '../components/ExercisePicker'
import { isTimed } from '../lib/exercise'
import { useFeedback } from '../components/Feedback'

const SELECT =
  '*, routine_days:routine_days_gymtrack(*, routine_exercises:routine_exercises_gymtrack(*, exercises:exercises_gymtrack(id, name, muscle_group, gif_url, unit, equipment)))'

// chave local para itens ainda não salvos
let tmp = 0
const newKey = () => `novo-${++tmp}`

export default function RoutineEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirm, toast } = useFeedback()
  const [routine, setRoutine] = useState(null)
  const [days, setDays] = useState([])
  const [removed, setRemoved] = useState({ days: [], exercises: [] })
  const [catalog, setCatalog] = useState([])
  const [picker, setPicker] = useState(null) // { dayKey, exKey?, muscle? }
  const [openDay, setOpenDay] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: r, error } = await supabase.from('routines_gymtrack').select(SELECT).eq('id', id).maybeSingle()
      if (error || !r) return setError('Rotina não encontrada.')
      if (r.is_template) return setError('Modelos não podem ser editados. Use o modelo e edite a sua cópia em "Minhas".')
      setRoutine({ id: r.id, name: r.name, place: r.place })
      const ds = r.routine_days
        .sort((a, b) => a.day_order - b.day_order)
        .map((d) => ({
          key: d.id, id: d.id, name: d.name, weekdays: d.weekdays ?? [],
          exercises: d.routine_exercises
            .sort((a, b) => a.position - b.position)
            .map((re) => ({ ...re, key: re.id, exercise: re.exercises })),
        }))
      setDays(ds)
      setOpenDay(ds[0]?.key ?? null)
      const { data: c } = await supabase
        .from('exercises_gymtrack')
        .select('id, name, muscle_group, equipment, gif_url, unit')
        .order('name')
      setCatalog(c ?? [])
    })()
  }, [id])

  // dias da semana já usados por outro treino (para avisar conflito)
  const usedBy = useMemo(() => {
    const map = {}
    days.forEach((d) => d.weekdays.forEach((w) => (map[w] = d.key)))
    return map
  }, [days])

  // ---------- helpers de edição ----------
  const updateDay = (dayKey, patch) => setDays((ds) => ds.map((d) => (d.key === dayKey ? { ...d, ...patch } : d)))
  const updateEx = (dayKey, exKey, patch) =>
    setDays((ds) => ds.map((d) => d.key !== dayKey ? d : {
      ...d, exercises: d.exercises.map((e) => (e.key === exKey ? { ...e, ...patch } : e)),
    }))

  const move = (list, index, dir) => {
    const j = index + dir
    if (j < 0 || j >= list.length) return list
    const copy = [...list]
    ;[copy[index], copy[j]] = [copy[j], copy[index]]
    return copy
  }

  function toggleWeekday(dayKey, w) {
    setDays((ds) => ds.map((d) => {
      if (d.key === dayKey) {
        const has = d.weekdays.includes(w)
        return { ...d, weekdays: has ? d.weekdays.filter((x) => x !== w) : [...d.weekdays, w].sort() }
      }
      // um dia da semana só pode ter um treino: tira do outro
      return { ...d, weekdays: d.weekdays.filter((x) => x !== w) }
    }))
  }

  function addDay() {
    const letter = String.fromCharCode(65 + days.length)
    const d = { key: newKey(), name: `Treino ${letter}`, weekdays: [], exercises: [] }
    setDays((ds) => [...ds, d])
    setOpenDay(d.key)
  }

  async function removeDay(d) {
    const ok = await confirm({
      title: `Remover "${d.name}"?`,
      message: 'O treino sai da rotina quando você salvar. O histórico continua salvo.',
      confirmText: 'Remover', danger: true,
    })
    if (!ok) return
    if (d.id) setRemoved((r) => ({ ...r, days: [...r.days, d.id] }))
    setDays((ds) => ds.filter((x) => x.key !== d.key))
  }

  function removeExercise(dayKey, e) {
    toast(`${e.exercise?.name ?? 'Exercício'} removido. Salve para confirmar.`)
    if (e.id) setRemoved((r) => ({ ...r, exercises: [...r.exercises, e.id] }))
    setDays((ds) => ds.map((d) => d.key !== dayKey ? d : { ...d, exercises: d.exercises.filter((x) => x.key !== e.key) }))
  }

  function onPick(ex) {
    const { dayKey, exKey } = picker
    if (exKey) {
      // trocar exercício: mantém séries, reps e descanso
      updateEx(dayKey, exKey, { exercise_id: ex.id, exercise: ex })
    } else {
      setDays((ds) => ds.map((d) => d.key !== dayKey ? d : {
        ...d,
        exercises: [...d.exercises, {
          key: newKey(), exercise_id: ex.id, exercise: ex, sets: 3,
          reps_min: isTimed(ex) ? 30 : 8, reps_max: isTimed(ex) ? 45 : 12, rest_seconds: isTimed(ex) ? 45 : 90, notes: null,
        }],
      }))
    }
    setPicker(null)
  }

  // ---------- salvar ----------
  async function save() {
    setSaving(true); setError(null)
    try {
      const check = (res) => { if (res.error) throw res.error; return res.data }

      check(await supabase.from('routines_gymtrack').update({ name: routine.name }).eq('id', id))
      if (removed.exercises.length)
        check(await supabase.from('routine_exercises_gymtrack').delete().in('id', removed.exercises))
      if (removed.days.length)
        check(await supabase.from('routine_days_gymtrack').delete().in('id', removed.days))

      for (const [i, d] of days.entries()) {
        const dayRow = { name: d.name || `Treino ${i + 1}`, day_order: i + 1, weekdays: d.weekdays }
        let dayId = d.id
        if (dayId) check(await supabase.from('routine_days_gymtrack').update(dayRow).eq('id', dayId))
        else dayId = check(await supabase.from('routine_days_gymtrack').insert({ ...dayRow, routine_id: Number(id) }).select().single()).id

        for (const [j, e] of d.exercises.entries()) {
          const row = {
            exercise_id: e.exercise_id,
            position: j + 1,
            sets: clampInt(e.sets, 1, 10),
            reps_min: clampInt(e.reps_min, 1, 600),
            reps_max: Math.max(clampInt(e.reps_max, 1, 600), clampInt(e.reps_min, 1, 600)),
            rest_seconds: clampInt(e.rest_seconds, 0, 600),
            notes: e.notes || null,
          }
          if (e.id) check(await supabase.from('routine_exercises_gymtrack').update(row).eq('id', e.id))
          else check(await supabase.from('routine_exercises_gymtrack').insert({ ...row, routine_day_id: dayId }))
        }
      }
      toast('Alterações salvas')
      navigate('/rotinas?aba=minhas')
    } catch (err) {
      setError(`Erro ao salvar: ${err.message}`)
      setSaving(false)
    }
  }

  async function deleteRoutine() {
    const ok = await confirm({
      title: `Excluir "${routine.name}"?`,
      message: 'O histórico de treinos continua salvo.',
      confirmText: 'Excluir', danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('routines_gymtrack').delete().eq('id', id)
    if (error) return toast(`Erro ao excluir: ${error.message}`, 'error')
    toast('Rotina excluída')
    navigate('/rotinas?aba=minhas')
  }

  if (error && !routine) return <div className="stack"><p className="error">{error}</p><Link to="/rotinas" className="icon-text"><ArrowLeft size={16} /> Rotinas</Link></div>
  if (!routine) return <p className="muted">Carregando…</p>

  return (
    <div className="stack editor has-save-bar">
      <Link to="/rotinas?aba=minhas" className="muted back icon-text"><ArrowLeft size={16} /> Rotinas</Link>
      <label>Nome da rotina
        <input value={routine.name} onChange={(e) => setRoutine({ ...routine, name: e.target.value })} />
      </label>

      {days.map((d, di) => (
        <section key={d.key} className="card">
          <div className="row-between">
            <button className="link day-toggle icon-text" onClick={() => setOpenDay(openDay === d.key ? null : d.key)}>
              {openDay === d.key ? <ChevronDown size={18} /> : <ChevronRight size={18} />} {d.name || 'Sem nome'}
              <span className="muted"> · {d.exercises.length} exercícios</span>
            </button>
            <div className="mini-actions">
              <button className="mini" onClick={() => setDays((ds) => move(ds, di, -1))} disabled={di === 0} aria-label="Subir treino"><ArrowUp size={16} /></button>
              <button className="mini" onClick={() => setDays((ds) => move(ds, di, 1))} disabled={di === days.length - 1} aria-label="Descer treino"><ArrowDown size={16} /></button>
            </div>
          </div>

          <div className="weekdays">
            {WEEKDAYS.map((label, w) => {
              const mine = d.weekdays.includes(w)
              const other = !mine && usedBy[w] !== undefined
              return (
                <button key={w} className={`chip ${mine ? 'on' : ''} ${other ? 'taken' : ''}`} onClick={() => toggleWeekday(d.key, w)}>
                  {label}
                </button>
              )
            })}
          </div>

          {openDay === d.key && (
            <div className="stack day-body">
              <label>Nome do treino
                <input value={d.name} onChange={(e) => updateDay(d.key, { name: e.target.value })} />
              </label>

              {d.exercises.map((e, ei) => (
                <div key={e.key} className="ex-row">
                  <div className="row-between">
                    <b>{ei + 1}. {e.exercise?.name}</b>
                    <div className="mini-actions">
                      <button className="mini" disabled={ei === 0} onClick={() => updateDay(d.key, { exercises: move(d.exercises, ei, -1) })} aria-label="Subir"><ArrowUp size={16} /></button>
                      <button className="mini" disabled={ei === d.exercises.length - 1} onClick={() => updateDay(d.key, { exercises: move(d.exercises, ei, 1) })} aria-label="Descer"><ArrowDown size={16} /></button>
                    </div>
                  </div>
                  <div className="grid4">
                    <label>Séries<input inputMode="numeric" value={e.sets} onChange={(ev) => updateEx(d.key, e.key, { sets: ev.target.value })} /></label>
                    <label>{isTimed(e.exercise) ? 'Seg. mín.' : 'Reps mín.'}<input inputMode="numeric" value={e.reps_min} onChange={(ev) => updateEx(d.key, e.key, { reps_min: ev.target.value })} /></label>
                    <label>{isTimed(e.exercise) ? 'Seg. máx.' : 'Reps máx.'}<input inputMode="numeric" value={e.reps_max} onChange={(ev) => updateEx(d.key, e.key, { reps_max: ev.target.value })} /></label>
                    <label>Descanso (s)<input inputMode="numeric" value={e.rest_seconds} onChange={(ev) => updateEx(d.key, e.key, { rest_seconds: ev.target.value })} /></label>
                  </div>
                  <div className="row-between">
                    <button className="link icon-text" onClick={() => setPicker({ dayKey: d.key, exKey: e.key, muscle: e.exercise?.muscle_group, current: e.exercise_id })}><ArrowLeftRight size={16} /> Trocar exercício</button>
                    <button className="link danger-text icon-text" onClick={() => removeExercise(d.key, e)}><Trash2 size={16} /> Remover</button>
                  </div>
                </div>
              ))}

              <button className="icon-text" onClick={() => setPicker({ dayKey: d.key })}><Plus size={18} /> Adicionar exercício</button>
              <button className="link danger-text icon-text" onClick={() => removeDay(d)}><Trash2 size={16} /> Remover este treino</button>
            </div>
          )}
        </section>
      ))}

      <button className="icon-text" onClick={addDay}><Plus size={18} /> Adicionar treino</button>
      <p className="muted small-text">Marque os dias da semana de cada treino. Sem dias marcados, o app segue a ordem A → B → C.</p>

      {error && <p className="error">{error}</p>}
      <button className="danger-outline icon-text" onClick={deleteRoutine}><Trash2 size={18} /> Excluir rotina</button>

      {/* barra fixa logo acima do menu inferior */}
      <div className="save-bar">
        <div className="save-bar-inner">
          <button className="primary big" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
        </div>
      </div>

      {picker && (
        <ExercisePicker
          catalog={catalog}
          muscle={picker.muscle}
          exclude={picker.current}
          title={picker.exKey ? 'Trocar por…' : 'Adicionar exercício'}
          homeDefault={routine.place === 'casa'}
          onPick={onPick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10)
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}