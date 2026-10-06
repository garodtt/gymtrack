// Utilidades sobre exercícios: unidade (reps x segundos) e se dá para fazer em casa.

// equipamentos que existem em casa (calistenia)
export const HOME_EQUIPMENT = ['peso corporal', 'barra fixa', 'cadeira', 'mesa ou barra baixa']
export const isHome = (ex) => HOME_EQUIPMENT.includes(ex?.equipment)

export const isTimed = (ex) => ex?.unit === 'segundos'
export const unitShort = (ex) => (isTimed(ex) ? 's' : 'reps') // "3 × 30–45 s"
export const unitHeader = (ex) => (isTimed(ex) ? 'Seg.' : 'Reps') // cabeçalho da tabela

export const GROUPS = {
  peito: 'Peito', costas: 'Costas', ombros: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps', antebraco: 'Antebraço',
  pernas: 'Pernas', gluteos: 'Glúteos', panturrilha: 'Panturrilha', core: 'Core', cardio: 'Cardio',
}

export const PLACES = { academia: 'Academia', casa: 'Casa' }

export const REGION_OF = (group) =>
  ['pernas', 'gluteos', 'panturrilha'].includes(group) ? 'inferior'
    : ['core', 'cardio'].includes(group) ? 'core' : 'superior'

export const EQUIPMENT_OPTIONS = [
  'peso corporal', 'halteres', 'barra', 'barra W', 'polia', 'máquina', 'kettlebell',
  'elástico', 'barra fixa', 'cadeira', 'mesa ou barra baixa', 'suspensão', 'bola', 'anilha',
]

// ficha dos modelos de rotina
export const LEVELS = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
export const GOALS = {
  hipertrofia: 'Ganhar massa', forca: 'Força', emagrecimento: 'Emagrecer',
  condicionamento: 'Condicionamento', gluteos: 'Glúteos e pernas', core: 'Abdômen',
}