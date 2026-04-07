export default function FilterButton({ label, value, current, onChange }) {
  const active = current === value

  return (
    <button
      onClick={() => onChange(value)}
      className={`text-[11px] px-2 py-1 rounded-md border ${
        active
          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  )
}
