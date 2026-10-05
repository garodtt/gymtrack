import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main className="container center">
      <h1>GymTrack</h1>
      {sent ? (
        <p>Enviamos um link para <b>{email}</b>. Abra no celular para entrar.</p>
      ) : (
        <form onSubmit={submit} className="stack">
          <input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="primary">Entrar com link mágico</button>
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </main>
  )
}
