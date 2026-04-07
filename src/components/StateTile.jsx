export default function StateTile({ label, value, tone = 'default' }) {
  const style = tone === 'good'
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
    : tone === 'bad'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
      : 'bg-slate-900 border-slate-800 text-slate-100'

  return (
    <div className={`rounded-lg border p-2 ${style}`}>
      <div className="text-slate-400">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  )
}
