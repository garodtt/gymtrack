import { useEffect, useMemo, useState } from 'react'
import { Plus, House, Search, CircleCheck } from 'lucide-react'
import FilterSelect from '../components/FilterSelect'
import { supabase } from '../lib/supabase'
import { GROUPS, isHome, isTimed } from '../lib/exercise'
import {
  DB_BODY_PARTS, DB_EQUIPMENTS, listExerciseDB, searchExerciseDB, mapFromExerciseDB, gifFromId,
  translateQuery, musclePt, equipmentPt,
} from '../lib/exercisedb'
import ExerciseSheet from '../components/ExerciseSheet'
import { loadSaved, ensureNames, ensureFull, getTranslation } from '../lib/translations'

export default function Library({ session }) {
  const [tab, setTab] = useState('catalogo')
  const [catalog, setCatalog] = useState([])
  const [sheet, setSheet] = useState(null) // { mode, exercise }

  async function loadCatalog() {
    const { data } = await supabase
      .from('exercises_gymtrack')
      .select('id, name, muscle_group, body_region, equipment, unit, gif_url, youtube_url, exercisedb_id, instructions, user_id')
      .order('name')
    setCatalog(data ?? [])
  }
  useEffect(() => { loadCatalog() }, [])

  const inCatalogIds = useMemo(() => new Set(catalog.map((e) => e.exercisedb_id).filter(Boolean)), [catalog])

  return (
    <div className="stack">
      <div className="row-between">
        <h1>Exercícios</h1>
        <button className="icon-text" onClick={() => setSheet({ mode: 'create' })}><Plus size={18} /> Criar</button>
      </div>
      <div className="tabs">
        <button className={tab === 'catalogo' ? 'active' : ''} onClick={() => setTab('catalogo')}>Meu catálogo</button>
        <button className={tab === 'buscar' ? 'active' : ''} onClick={() => setTab('buscar')}>Buscar mais</button>
      </div>

      {tab === 'catalogo'
        ? <CatalogTab catalog={catalog} onOpen={(e) => setSheet({ mode: 'view', exercise: e })} userId={session.user.id} />
        : <DiscoverTab session={session} inCatalogIds={inCatalogIds} onOpen={(e) => setSheet({ mode: 'import', exercise: e })} />}

      {sheet && (
        <ExerciseSheet
          key={sheet.exercise?.id ?? sheet.exercise?.exercisedb_id ?? 'novo'}
          mode={sheet.mode}
          exercise={sheet.exercise}
          inCatalog={sheet.exercise?.exercisedb_id && inCatalogIds.has(sheet.exercise.exercisedb_id)}
          session={session}
          onClose={() => setSheet(null)}
          onChanged={loadCatalog}
        />
      )}
    </div>
  )
}

// ---------- Meu catálogo ----------
function CatalogTab({ catalog, onOpen, userId }) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('todos')
  const [homeOnly, setHomeOnly] = useState(false)
  const [mineOnly, setMineOnly] = useState(false)

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return catalog
      .filter((e) => group === 'todos' || e.muscle_group === group)
      .filter((e) => !homeOnly || isHome(e))
      .filter((e) => !mineOnly || e.user_id === userId)
      .filter((e) => !term || e.name.toLowerCase().includes(term))
  }, [catalog, q, group, homeOnly, mineOnly, userId])

  return (
    <>
      <div className="search-box">
        <Search size={18} />
        <input placeholder="Buscar no catálogo" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="filters">
        <FilterSelect label="Músculo" value={group} onChange={setGroup}
          options={[['todos', 'Todos'], ...Object.entries(GROUPS)]} />
        <div className="toggles">
          <button className={`chip icon-text ${homeOnly ? 'on' : ''}`} onClick={() => setHomeOnly((v) => !v)}><House size={14} /> Casa</button>
          <button className={`chip ${mineOnly ? 'on' : ''}`} onClick={() => setMineOnly((v) => !v)}>Meus</button>
        </div>
      </div>
      <p className="muted small-text">{list.length} exercício{list.length === 1 ? '' : 's'}</p>
      <ul className="pick-list">
        {list.map((e) => (
          <li key={e.id}>
            <button onClick={() => onOpen(e)}>
              {e.gif_url ? <img src={e.gif_url} alt="" loading="lazy" /> : <span className="thumb-empty" />}
              <span className="grow">
                {e.name}
                <small className="muted">
                  {GROUPS[e.muscle_group] ?? e.muscle_group}{e.equipment ? ` · ${e.equipment}` : ''}{isTimed(e) ? ' · por tempo' : ''}
                </small>
              </span>
              {e.user_id === userId && <span className="badge">Meu</span>}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted">Nenhum exercício encontrado. Tente "Buscar mais".</li>}
      </ul>
    </>
  )
}

// ---------- Buscar mais (ExerciseDB) ----------
function DiscoverTab({ session, inCatalogIds, onOpen }) {
  const [bodyPart, setBodyPart] = useState('chest')
  const [equipment, setEquipment] = useState('')
  const [q, setQ] = useState('')
  const [searchTerm, setSearchTerm] = useState('') // termo em inglês enviado à API
  const [items, setItems] = useState([])
  const [names, setNames] = useState({}) // exerciseId → nome em português
  const [next, setNext] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // tradução da página: lê as salvas no banco, traduz os nomes que faltam e,
  // em segundo plano, o passo a passo (para abrir já em português)
  async function translatePage(list) {
    const ids = list.map((x) => x.exerciseId)
    const refresh = () => setNames((cur) => ({ ...cur, ...Object.fromEntries(ids.map((id) => [id, getTranslation(id)?.name]).filter(([, v]) => v)) }))
    try {
      await loadSaved(ids); refresh()
      await ensureNames(list, session.access_token); refresh()
      ensureFull(list, session.access_token)
    } catch { /* fica em inglês */ }
  }

  async function load(reset = true) {
    setLoading(true); setError(null)
    try {
      let page
      if (searchTerm) {
        page = await searchExerciseDB(searchTerm, 25)
        setItems(page); setNext(null)
      } else {
        const res = await listExerciseDB({ bodyPart, equipment, after: reset ? undefined : next, limit: 20 })
        page = res.items
        setItems((cur) => (reset ? page : [...cur, ...page]))
        setNext(res.next)
      }
      translatePage(page)
    } catch {
      setError('O banco de exercícios está ocupado agora. Tente de novo em alguns segundos.')
    }
    setLoading(false)
  }
  useEffect(() => { load(true) }, [bodyPart, equipment, searchTerm]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitSearch(e) {
    e.preventDefault()
    const text = q.trim()
    if (!text) return setSearchTerm('')
    setLoading(true)
    const term = await translateQuery(text, session.access_token)
    if (term === searchTerm) load(true) // mesma busca: recarrega
    else setSearchTerm(term)
  }

  function clearSearch() { setQ(''); setSearchTerm('') }

  return (
    <>
      <form className="search-box" onSubmit={submitSearch}>
        <Search size={18} />
        <input placeholder="Buscar (ex.: crucifixo, agachamento)" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
        {(q || searchTerm) && <button type="button" className="link" onClick={clearSearch}>limpar</button>}
      </form>

      {searchTerm ? (
        <p className="muted small-text">Resultados para "{q}"</p>
      ) : (
        <div className="filters">
          <FilterSelect label="Músculo" value={bodyPart} onChange={setBodyPart} options={Object.entries(DB_BODY_PARTS)} />
          <FilterSelect label="Equipamento" value={equipment} onChange={setEquipment}
            options={[['', 'Qualquer'], ...Object.entries(DB_EQUIPMENTS)]} />
        </div>
      )}

      {error && <p className="error">{error} <button className="link" onClick={() => load(true)}>tentar de novo</button></p>}

      <ul className="pick-list">
        {items.map((x) => {
          const added = inCatalogIds.has(x.exerciseId)
          const pt = names[x.exerciseId]
          const base = x.instructions
            ? mapFromExerciseDB(x)
            : { name: x.name, exercisedb_id: x.exerciseId, gif_url: x.gifUrl ?? gifFromId(x.exerciseId), muscle_group: 'peito', unit: 'reps' }
          return (
            <li key={x.exerciseId}>
              <button onClick={() => onOpen({ ...base, name: pt ?? base.name, raw: x })}>
                <img src={x.gifUrl ?? gifFromId(x.exerciseId)} alt="" loading="lazy" />
                <span className="grow">
                  <span className={pt ? '' : 'capitalize translating'}>{pt ?? x.name}</span>
                  {x.equipments && (
                    <small className="muted">
                      {x.equipments.map(equipmentPt).join(', ')}
                      {x.targetMuscles?.length ? ` · ${x.targetMuscles.map(musclePt).join(', ')}` : ''}
                    </small>
                  )}
                </span>
                {added && <CircleCheck size={20} className="added" aria-label="Já no catálogo" />}
              </button>
            </li>
          )
        })}
        {!loading && items.length === 0 && !error && <li className="muted">Nada encontrado. Tente outra palavra.</li>}
      </ul>
      {loading && <p className="muted center-link">Carregando…</p>}
      {!loading && next && <button onClick={() => load(false)}>Carregar mais</button>}
    </>
  )
}