export default function FilterButton({ label, value, current, onChange }) {
  const active = current === value

  return (
    <button
      onClick={() => onChange(value)}
      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-500/25 text-indigo-200'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )
}
