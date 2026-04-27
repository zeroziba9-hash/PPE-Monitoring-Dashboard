export default function KpiCard({ title, value, sub, tone = 'default' }) {
  const toneStyle = tone === 'warn'
    ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-slate-900/60'
    : tone === 'good'
      ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 to-slate-900/60'
      : 'border-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-900/60'

  const valueColor = tone === 'warn'
    ? 'text-amber-300'
    : tone === 'good'
      ? 'text-emerald-300'
      : 'text-slate-100'

  return (
    <article className={`rounded-xl border px-4 py-3 shadow-sm ${toneStyle}`}>
      <p className="text-xs text-slate-400 leading-tight mb-2">{title}</p>
      <p className={`text-2xl font-bold leading-none tracking-tight ${valueColor}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1.5 leading-tight">{sub}</p>
    </article>
  )
}
