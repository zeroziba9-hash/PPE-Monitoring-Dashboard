export default function KpiCard({ title, value, sub, tone = 'default' }) {
  const toneStyle = tone === 'warn'
    ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/12 to-slate-900/40'
    : tone === 'good'
      ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/12 to-slate-900/40'
      : 'border-slate-700/80 bg-gradient-to-br from-slate-800/80 to-slate-900/60'

  return (
    <article className={`rounded-xl border px-2.5 py-2 shadow-sm ${toneStyle}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs leading-none">
        <p className="text-slate-300 truncate">{title}</p>
        <p className="text-sm font-bold shrink-0">{value}</p>
        <p className="text-slate-500 truncate text-right">{sub}</p>
      </div>
    </article>
  )
}
