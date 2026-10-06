import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import Today from './pages/Today'
import Workout from './pages/Workout'
import Routines from './pages/Routines'
const Progress = lazy(() => import('./pages/Progress'))
import Session from './pages/Session'
import RoutineEditor from './pages/RoutineEditor'
import Library from './pages/Library'
import Friends from './pages/Friends'
import JointNew from './pages/JointNew'
import Agenda from './pages/Agenda'

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
          <Route path="/" element={<Today session={session} />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/treino/:dayId" element={<Workout session={session} />} />
          <Route path="/junto/novo" element={<JointNew session={session} />} />
          <Route path="/junto/:jointId" element={<Workout session={session} />} />
          <Route path="/rotinas" element={<Routines session={session} />} />
          <Route path="/progresso" element={<Suspense fallback={<p className="muted">Carregando…</p>}><Progress /></Suspense>} />
          <Route path="/sessao/:id" element={<Session />} />
          <Route path="/rotinas/:id/editar" element={<RoutineEditor />} />
          <Route path="/exercicios" element={<Library session={session} />} />
          <Route path="/amigos" element={<Friends session={session} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <NavBar />
    </>
  )
}