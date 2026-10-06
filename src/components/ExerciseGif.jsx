import { useEffect, useState } from 'react'
import { ensureGif } from '../lib/exercisedb'

export default function ExerciseGif({ exercise }) {
  const [url, setUrl] = useState(exercise.gif_url)
  const [status, setStatus] = useState(exercise.gif_url ? 'ok' : 'loading')

  useEffect(() => {
    if (url) return
    let alive = true
    ensureGif(exercise).then((u) => {
      if (!alive) return
      setUrl(u)
      setStatus(u ? 'ok' : 'missing')
    })
    return () => { alive = false }
  }, [exercise, url])

  if (status === 'loading') return <div className="gif placeholder">carregando vídeo…</div>
  if (status === 'missing' || !url) {
    return exercise.youtube_url
      ? <a className="gif placeholder" href={exercise.youtube_url} target="_blank" rel="noreferrer">Assistir vídeo no YouTube</a>
      : <div className="gif placeholder">sem vídeo</div>
  }
  return (
    <img
      className="gif"
      src={url}
      alt={`Execução: ${exercise.name}`}
      loading="lazy"
      onError={() => setStatus('missing')}
    />
  )
}