export default function StateTile({ label, value, tone = 'default' }) {
  const style = tone === 'good'
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    : tone === 'bad'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      : 'bg-slate-900 border-slate-800 text-slate-100'

  return (
    <div className={`rounded-lg border p-3 ${style}`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
