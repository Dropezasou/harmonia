import { useEffect } from 'react'

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="pb-safe max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="px-2 text-2xl leading-none text-ink-3" aria-label="Fechar">×</button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  )
}

// group: para conteúdos com vários botões (um <label> repassaria o toque ao primeiro)
export function Field({ label, children, group }) {
  const title = <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-3">{label}</span>
  return group
    ? <div role="group" aria-label={label}>{title}{children}</div>
    : <label className="block">{title}{children}</label>
}

export const inputCls = 'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink placeholder:text-ink-3 focus:border-gold focus:outline-none'

export function Input(props) {
  return <input {...props} className={inputCls} />
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg bg-bg p-1">
      {Object.entries(options).map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(value === k ? '' : k)}
          className={`flex-1 rounded-md px-2 py-2 text-sm ${value === k ? 'bg-gold font-semibold text-bg' : 'text-ink-2'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Stars({ value = 0, onChange, size = 'text-2xl' }) {
  return (
    <div className={`flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n === value ? 0 : n)}
          className={n <= value ? 'text-gold' : 'text-line'} aria-label={`${n} estrelas`}>★</button>
      ))}
    </div>
  )
}

export function Chip({ children, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-gold bg-gold/15 text-gold' : 'border-line text-ink-2'}`}>
      {children}
    </button>
  )
}

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = { primary: 'bg-gold text-bg font-semibold', ghost: 'border border-line text-ink-2', danger: 'border border-warn/50 text-warn' }[variant]
  return <button {...p} className={`rounded-lg px-4 py-2.5 disabled:opacity-40 ${v} ${className}`} />
}

export function Empty({ children }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-ink-3">{children}</p>
}
