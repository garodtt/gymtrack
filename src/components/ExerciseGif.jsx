import { useEffect, useState } from 'react'
import { ensureGif } from '../lib/exercisedb'

export default function ExerciseGif({ exercise }) {
  const [url, setUrl] = useState(exercise.gif_url)

  useEffect(() => {
    if (!url) ensureGif(exercise).then(setUrl)
  }, [exercise, url])

  if (!url) return <div className="gif placeholder">sem vídeo</div>
  return <img className="gif" src={url} alt={`Execução: ${exercise.name}`} loading="lazy" />
}
