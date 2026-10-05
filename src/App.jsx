import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import Today from './pages/Today'
import Workout from './pages/Workout'
import Routines from './pages/Routines'
const Progress = lazy(() => import('./pages/Progress'))

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="center muted">Carregando…</div>
  if (!session) return <Login />

  return (
    <>
      <main className="container">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/treino/:dayId" element={<Workout session={session} />} />
          <Route path="/rotinas" element={<Routines session={session} />} />
          <Route path="/progresso" element={<Suspense fallback={<p className="muted">Carregando…</p>}><Progress /></Suspense>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <NavBar />
    </>
  )
}
