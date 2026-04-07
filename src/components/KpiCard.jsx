export default function KpiCard({ title, value, sub, tone = 'default' }) {
  const toneStyle = tone === 'warn'
    ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/12 to-slate-900/40'
    : tone === 'good'
      ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/12 to-slate-900/40'
      : 'border-slate-700/80 bg-gradient-to-br from-slate-800/80 to-slate-900/60'

  return (
    <article className={`rounded-xl border px-2 py-1.5 shadow-sm min-h-[58px] ${toneStyle}`}>
      <p className="text-[11px] text-slate-300 truncate leading-tight">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-lg font-bold leading-none tracking-tight">{value}</p>
        <p className="text-[10px] text-slate-500 text-right leading-tight">{sub}</p>
      </div>
    </article>
  )
}
