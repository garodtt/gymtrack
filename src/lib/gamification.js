// Gamificação: definições de níveis e emblemas (o cálculo fica no banco)
import {
  Footprints, Dumbbell, Medal, Trophy, CalendarCheck, Flame, Crown, TrendingUp, Rocket, Mountain,
  Weight, Anvil, Sunrise, Moon, CalendarDays, Users, UsersRound, Compass, House, Handshake,
} from 'lucide-react'
import { supabase } from './supabase'

export const LEVEL_NAMES = [
  'Novato', 'Iniciante', 'Aprendiz', 'Regular', 'Dedicado', 'Focado',
  'Atleta', 'Forte', 'Monstro', 'Elite', 'Lenda',
]
export const levelName = (lvl) => LEVEL_NAMES[Math.max(0, Math.min(lvl - 1, LEVEL_NAMES.length - 1))]

// ordem = ordem de exibição
export const BADGES = {
  primeiro_treino: { name: 'Primeiro passo', desc: 'Finalize seu primeiro treino', Icon: Footprints },
  treinos_10:      { name: 'Pegando o ritmo', desc: '10 treinos finalizados', Icon: Dumbbell },
  treinos_50:      { name: 'Frequentador', desc: '50 treinos finalizados', Icon: Medal },
  treinos_100:     { name: 'Centenário', desc: '100 treinos finalizados', Icon: Trophy },
  semana_perfeita: { name: 'Semana perfeita', desc: 'Bata sua meta de treinos em uma semana', Icon: CalendarCheck },
  sequencia_4:     { name: 'Em chamas', desc: '4 semanas seguidas batendo a meta', Icon: Flame },
  sequencia_12:    { name: 'Imparável', desc: '12 semanas seguidas batendo a meta', Icon: Crown },
  recorde_1:       { name: 'Recorde!', desc: 'Bata seu primeiro recorde de carga', Icon: TrendingUp },
  recorde_10:      { name: 'Evoluindo', desc: '10 recordes pessoais', Icon: Rocket },
  recorde_50:      { name: 'Sem limites', desc: '50 recordes pessoais', Icon: Mountain },
  tonelada_treino: { name: 'Uma tonelada', desc: 'Levante 1.000 kg em um único treino', Icon: Weight },
  toneladas_10:    { name: '10 toneladas', desc: '10.000 kg levantados no total', Icon: Anvil },
  toneladas_100:   { name: '100 toneladas', desc: '100.000 kg levantados no total', Icon: Anvil },
  madrugador:      { name: 'Madrugador', desc: 'Comece um treino antes das 7h', Icon: Sunrise },
  coruja:          { name: 'Coruja', desc: 'Comece um treino depois das 21h', Icon: Moon },
  fim_de_semana:   { name: 'Sem folga', desc: 'Treine no sábado e no domingo da mesma semana', Icon: CalendarDays },
  social:          { name: 'Parceria', desc: 'Adicione seu primeiro amigo', Icon: Users },
  galera:          { name: 'Galera', desc: 'Tenha 5 amigos no app', Icon: UsersRound },
  explorador:      { name: 'Explorador', desc: 'Adicione um exercício ao seu catálogo', Icon: Compass },
  em_casa:         { name: 'Treino em casa', desc: 'Finalize um treino de uma rotina de casa', Icon: House },
  dupla:           { name: 'Dupla dinâmica', desc: 'Finalize um treino em dupla com um amigo', Icon: Handshake },
}

export async function fetchGamification() {
  const { data, error } = await supabase.rpc('gamification_gymtrack')
  if (error) throw error
  return data
}

// progresso dentro do nível atual (0 a 1)
export function levelProgress(g) {
  if (!g?.level_next) return 1
  return Math.min(1, (g.total_xp - g.level_floor) / (g.level_next - g.level_floor))
}