import { flavors, rules, noteLabel, STRENGTHS, BODIES } from './knowledge'

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const DIMS = ['doce', 'amargo', 'picante', 'acido']

export function tasteProfile(notes = []) {
  const p = Object.fromEntries(DIMS.map((d) => [d, 0]))
  for (const id of notes) for (const d of DIMS) p[d] += flavors.notes[id]?.taste?.[d] ?? 0
  const n = Math.max(notes.length, 1)
  for (const d of DIMS) p[d] /= n
  return p
}

const famOf = (id) => flavors.notes[id]?.family
// 'a' = família da bebida, 'b' = do charuto; invertido usa texto neutro
function affinity(cigarFam, drinkFam) {
  const direct = rules.flavor.affinity.find((r) => r.a === drinkFam && r.b === cigarFam)
  if (direct) return direct
  const rev = rules.flavor.affinity.find((r) => r.a === cigarFam && r.b === drinkFam)
  return rev && { score: rev.score, text: rules.flavor.reverseText[rev.score < 0.4 ? 'warnText' : 'text'] }
}

function intensity(cigar, drink, moment) {
  const r = rules.intensity
  const c = r.cigarScale[cigar.strength] ?? 2
  const d = (r.drinkScale[drink.body] ?? 2) + (r.categoryOffset[drink.category] ?? 0)
  const target = c + (rules.context.moments[moment]?.bodyPreference ?? 0)
  const diff = Math.abs(d - target)
  const score = r.scoreByDiff.find((s) => diff <= s.maxDiff).score
  const vars = { cStrength: STRENGTHS[cigar.strength]?.toLowerCase(), dBody: BODIES[drink.body]?.toLowerCase() }
  let key = Math.abs(d - c) <= 0.3 ? 'match' : d > c ? 'drinkStronger' : 'cigarStronger'
  if (key === 'cigarStronger' && target < c && score >= 0.75) key = 'lighterByMoment'
  return { score, reason: { good: key === 'match' || score >= 0.75, text: fill(r.texts[key], vars) } }
}

function flavor(cigar, drink) {
  const f = rules.flavor
  const pairs = []
  for (const cn of cigar.notes || []) {
    for (const dn of drink.notes || []) {
      let rule
      if (cn === dn) rule = f.sameNote
      else if (famOf(cn) && famOf(cn) === famOf(dn)) rule = f.sameFamily
      else rule = affinity(famOf(cn), famOf(dn))
      if (rule) pairs.push({ score: rule.score, text: fill(rule.text, { cNote: noteLabel(cn).toLowerCase(), dNote: noteLabel(dn).toLowerCase() }), cn, dn: 'd:' + dn })
    }
  }
  pairs.sort((a, b) => b.score - a.score)
  const good = pairs.filter((p) => p.score >= 0.7)
  const bad = pairs.filter((p) => p.score < 0.4)
  if (!pairs.length) return { score: 0.25, reasons: [{ good: false, text: f.noMatchText }] }
  // evita repetir a mesma nota do charuto em duas explicações
  const used = new Set()
  const top = good.filter((p) => { if (used.has(p.cn) || used.has(p.dn)) return false; used.add(p.cn).add(p.dn); return true }).slice(0, 2)
  const score = clamp(pairs[0].score + 0.06 * Math.max(good.length - 1, 0) - 0.08 * bad.length)
  return {
    score,
    reasons: [...top.map((p) => ({ good: true, text: p.text })), ...bad.slice(0, 1).map((p) => ({ good: false, text: p.text }))]
  }
}

function balance(cigar, drink) {
  const b = rules.balance
  const cp = tasteProfile(cigar.notes), dp = tasteProfile(drink.notes)
  let score = b.baseline
  const reasons = []
  for (const r of b.rules) {
    if (cp[r.cigar.taste] >= r.cigar.min && dp[r.drink.taste] >= r.drink.min) {
      score += r.delta
      reasons.push({ good: r.delta > 0, text: r.text })
    }
  }
  return { score: clamp(score), reasons }
}

function context(drink, moment, occasion) {
  const m = rules.context.moments[moment]
  const o = rules.context.occasions[occasion]
  if (!m) return { score: 0.6, reasons: [] }
  const typeBonus = (src) => Object.entries(src?.types || {}).reduce((s, [k, v]) => (drink.type || '').toLowerCase().includes(k.toLowerCase()) ? s + v : s, 0)
  const score = clamp((m.categories[drink.category] ?? 0.5) + typeBonus(m) + (o?.categories?.[drink.category] ?? 0) + typeBonus(o))
  const reasons = []
  if (score >= 0.8) reasons.push({ good: true, text: `Combina com o momento (${m.label.toLowerCase()}${o ? ', ' + o.label.toLowerCase() : ''}).` })
  else if (score < 0.35) reasons.push({ good: false, text: m.text })
  return { score, reasons }
}

function personal(cigar, drink, sessions) {
  const rated = sessions.filter((s) => s.cigarId === cigar.id && s.drinkId === drink.id && s.rating)
  if (!rated.length) return { delta: 0, reasons: [] }
  const avg = rated.reduce((s, x) => s + x.rating, 0) / rated.length
  return {
    delta: (avg - 3) * rules.history.perStar,
    reasons: [{ good: avg >= 3, text: `Você já provou esse par ${rated.length}× (média ${avg.toFixed(1)}★).` }]
  }
}

export function scorePair(cigar, drink, { moment, occasion, sessions = [] } = {}) {
  const w = rules.weights
  const parts = {
    intensity: intensity(cigar, drink, moment),
    flavor: flavor(cigar, drink),
    balance: balance(cigar, drink),
    context: context(drink, moment, occasion)
  }
  const hist = personal(cigar, drink, sessions)
  const score = clamp(Object.entries(w).reduce((s, [k, wt]) => s + wt * parts[k].score, 0) + hist.delta)
  const reasons = [
    parts.intensity.reason,
    ...parts.flavor.reasons,
    ...parts.balance.reasons,
    ...parts.context.reasons,
    ...hist.reasons
  ]
  return {
    drink,
    score,
    verdict: rules.verdicts.find((v) => score >= v.min).label,
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.score])),
    reasons
  }
}

export function recommend(cigar, drinks, opts) {
  return drinks.filter((d) => (d.qty ?? 1) > 0).map((d) => scorePair(cigar, d, opts)).sort((a, b) => b.score - a.score)
}
