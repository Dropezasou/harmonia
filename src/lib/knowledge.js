import flavors from '../knowledge/flavors.json'
import rules from '../knowledge/pairing-rules.json'
import drinkTypes from '../knowledge/drink-types.json'
import cigarsDb from '../knowledge/cigars-db.json'
import drinksDb from '../knowledge/drinks-db.json'
import cetDb from '../knowledge/cigars-cet.json'

export { flavors, rules, drinkTypes, cigarsDb, drinksDb, cetDb }

export const noteLabel = (id) => flavors.notes[id]?.label ?? id
export const STRENGTHS = { suave: 'Suave', 'suave-medio': 'Suave-médio', medio: 'Médio', 'medio-pleno': 'Médio-pleno', pleno: 'Pleno' }
export const BODIES = { leve: 'Leve', medio: 'Médio', encorpado: 'Encorpado' }

export const notesByFamily = Object.entries(flavors.families).map(([fid, f]) => ({
  id: fid,
  label: f.label,
  notes: Object.entries(flavors.notes).filter(([, n]) => n.family === fid).map(([id, n]) => ({ id, label: n.label }))
}))
