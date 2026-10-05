import { useEffect, useState } from 'react'

export default function RestTimer({ seconds, startKey }) {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!startKey) return
    setLeft(seconds)
    const t = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(t), navigator.vibrate?.(300), 0) : s - 1)), 1000)
    return () => clearInterval(t)
  }, [startKey, seconds])

  if (!left) return null
  return (
    <div className="timer">
      Descanso: {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      <button className="link" onClick={() => setLeft(0)}>pular</button>
    </div>
  )
}
