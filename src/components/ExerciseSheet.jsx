import { useEffect, useState } from 'react'
import { X, Pencil, Trash2, Plus, Languages, Video, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getExerciseDB, mapFromExerciseDB, translateExercise } from '../lib/exercisedb'
import { GROUPS, EQUIPMENT_OPTIONS, REGION_OF, isTimed, isHome } from '../lib/exercise'
import { useFeedback } from './Feedback'

/**
 * Janela de exercício da biblioteca.
 * mode: 'view'   → exercício do catálogo (ver; editar/excluir se for seu)
 *       'import' → exercício do ExerciseDB (ver e adicionar ao catálogo)
 *       'create' → criar exercício do zero
 */
export default function ExerciseSheet({ mode, exercise, session, inCatalog, onClose, onChanged }) {
  const { confirm, toast } = useFeedback()
  const userId = session.user.id
  const [ex, setEx] = useState(mode === 'create' ? emptyExercise() : exercise)
  const [editing, setEditing] = useState(mode !== 'view')
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const isOwn = ex?.user_id === userId

  // carrega detalhes do ExerciseDB e traduz
  useEffect(() => {
    let alive = true
    ;(async () => {
      // importar: busca dados completos (a busca por nome só traz id/nome/gif)
      if (mode === 'import') {
        let full = exercise
        if (!exercise.instructions?.length && exercise.exercisedb_id) {
          setLoading(true)
          try { full = mapFromExerciseDB(await getExerciseDB(exercise.exercisedb_id)) } catch { /* segue com o que tem */ }
          if (!alive) return
          setLoading(false)
        }
        setEx(full)
        translate(full, (t) => alive && setEx((cur) => ({ ...cur, name: t.name, instructions: t.instructions })))
      }
      // ver: se não tem passo a passo salvo, busca na API, traduz e guarda no banco
      if (mode === 'view' && !exercise.instructions?.length && exercise.exercisedb_id) {
        setLoading(true)
        try {
          const full = mapFromExerciseDB(await getExerciseDB(exercise.exercisedb_id))
          if (!alive) return
          setEx((cur) => ({ ...cur, instructions: full.instructions }))
          setLoading(false)
          translate({ name: exercise.name, instructions: full.instructions }, async (t) => {
            if (!alive) return
            setEx((cur) => ({ ...cur, instructions: t.instructions }))
            await supabase.from('exercises_gymtrack').update({ instructions: t.instructions }).eq('id', exercise.id)
          }, { keepName: true })
        } catch { setLoading(false) }
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function translate(src, apply, { keepName = false } = {}) {
    if (!src.name && !src.instructions?.length) return
    setTranslating(true)
    try {
      const t = await translateExercise({ name: src.name, instructions: src.instructions ?? [] }, session.access_token)
      apply(keepName ? { ...t, name: src.name } : t)
    } catch { /* fica em inglês */ }
    setTranslating(false)
  }

  const set = (k, v) => setEx((cur) => ({ ...cur, [k]: v }))

  async function save() {
    if (!ex.name?.trim()) return toast('Dê um nome ao exercício', 'error')
    setSaving(true)
    const row = {
      name: ex.name.trim(),
      muscle_group: ex.muscle_group,
      body_region: REGION_OF(ex.muscle_group),
      equipment: ex.equipment || null,
      unit: ex.unit,
      youtube_url: ex.youtube_url?.trim() || null,
      instructions: (ex.instructions ?? []).map((s) => s.trim()).filter(Boolean),
    }
    let res
    if (mode === 'view' && isOwn) {
      res = await supabase.from('exercises_gymtrack').update(row).eq('id', ex.id).select().single()
    } else {
      res = await supabase.from('exercises_gymtrack').insert({
        ...row,
        user_id: userId,
        exercisedb_id: ex.exercisedb_id ?? null,
        exercisedb_query: ex.exercisedb_query ?? null,
        gif_url: ex.gif_url ?? null,
      }).select().single()
    }
    setSaving(false)
    if (res.error) return toast(`Erro ao salvar: ${res.error.message}`, 'error')
    toast(mode === 'view' ? 'Exercício atualizado' : 'Exercício adicionado ao catálogo')
    onChanged?.()
    onClose()
  }

  async function remove() {
    const ok = await confirm({
      title: `Excluir "${ex.name}"?`,
      message: 'Ele sai do seu catálogo. Não é possível excluir se estiver em uma rotina ou no seu histórico.',
      confirmText: 'Excluir', danger: true,
    })
    if (!ok) return
    const { error } = await supabase.from('exercises_gymtrack').delete().eq('id', ex.id)
    if (error) {
      const msg = error.code === '23503'
        ? 'Esse exercício está em uma rotina ou no histórico. Remova de lá primeiro.'
        : `Erro ao excluir: ${error.message}`
      return toast(msg, 'error')
    }
    toast('Exercício excluído')
    onChanged?.()
    onClose()
  }

  const title = mode === 'create' ? 'Criar exercício' : mode === 'import' ? 'Adicionar ao catálogo' : editing ? 'Editar exercício' : ex.name
  const steps = ex.instructions ?? []

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <h2>{title}</h2>
          <button className="mini" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="sheet-body">
          {ex.gif_url
            ? <img className="gif" src={ex.gif_url} alt={`Execução: ${ex.name}`} />
            : mode !== 'create' && <div className="gif placeholder">sem vídeo</div>}
          {ex.youtube_url && (
            <a className="button icon-text" href={ex.youtube_url} target="_blank" rel="noreferrer"><Video size={18} /> Assistir no YouTube</a>
          )}

          {!editing && (
            <>
              <div className="tags">
                <span className="badge">{GROUPS[ex.muscle_group] ?? ex.muscle_group}</span>
                {ex.equipment && <span className="badge muted-badge">{ex.equipment}</span>}
                {isTimed(ex) && <span className="badge muted-badge">por tempo</span>}
                {isHome(ex) && <span className="badge muted-badge">dá para fazer em casa</span>}
                {isOwn && <span className="badge">Meu</span>}
              </div>
              <Steps steps={steps} loading={loading} translating={translating} />
              {isOwn && (
                <div className="dialog-actions">
                  <button className="danger-outline icon-text" onClick={remove}><Trash2 size={16} /> Excluir</button>
                  <button className="icon-text" onClick={() => setEditing(true)}><Pencil size={16} /> Editar</button>
                </div>
              )}
            </>
          )}

          {editing && (
            <div className="stack">
              {inCatalog && mode === 'import' && (
                <p className="hint icon-text"><Check size={16} /> Este exercício já está no seu catálogo. Você pode adicionar outra versão com outro nome.</p>
              )}
              {translating && <p className="muted small-text icon-text"><Languages size={15} /> Traduzindo para português…</p>}
              <label>Nome
                <input value={ex.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Supino inclinado na máquina" />
              </label>
              <div className="grid2">
                <label>Grupo muscular
                  <select value={ex.muscle_group} onChange={(e) => set('muscle_group', e.target.value)}>
                    {Object.entries(GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label>Contagem
                  <select value={ex.unit} onChange={(e) => set('unit', e.target.value)}>
                    <option value="reps">Repetições</option>
                    <option value="segundos">Segundos</option>
                  </select>
                </label>
              </div>
              <label>Equipamento
                <select value={ex.equipment ?? ''} onChange={(e) => set('equipment', e.target.value)}>
                  <option value="">—</option>
                  {[...new Set([...EQUIPMENT_OPTIONS, ex.equipment].filter(Boolean))].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label>Link de vídeo do YouTube (opcional)
                <input value={ex.youtube_url ?? ''} onChange={(e) => set('youtube_url', e.target.value)} placeholder="https://youtube.com/..." inputMode="url" />
              </label>
              <label>Passo a passo (um por linha, opcional)
                <textarea rows={5} value={steps.join('\n')} onChange={(e) => set('instructions', e.target.value.split('\n'))} />
              </label>
              <button className="primary big icon-text" onClick={save} disabled={saving || loading}>
                {saving ? 'Salvando…' : mode === 'view' ? 'Salvar alterações' : <><Plus size={18} /> Adicionar ao catálogo</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Steps({ steps, loading, translating }) {
  if (loading) return <p className="muted small-text">Carregando passo a passo…</p>
  if (!steps.length) return null
  return (
    <div>
      <h3 className="icon-text">Como fazer {translating && <span className="muted small-text">(traduzindo…)</span>}</h3>
      <ol className="steps">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  )
}

function emptyExercise() {
  return { name: '', muscle_group: 'peito', equipment: '', unit: 'reps', youtube_url: '', instructions: [] }
}