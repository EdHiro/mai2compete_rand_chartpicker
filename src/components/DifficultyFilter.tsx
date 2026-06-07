import { useSongStore, Difficulty } from '@/store/songStore'

const difficulties: { value: Difficulty; label: string; gradient: string; border: string }[] = [
  { value: 'BASIC', label: 'BASIC', gradient: 'from-green-500 to-emerald-600', border: 'border-green-400' },
  { value: 'ADVANCED', label: 'ADVANCED', gradient: 'from-yellow-600 to-yellow-400', border: 'border-yellow-400' },
  { value: 'EXPERT', label: 'EXPERT', gradient: 'from-pink-500 to-red-600', border: 'border-red-400' },
  { value: 'MASTER', label: 'MASTER', gradient: 'from-purple-600 to-purple-800', border: 'border-purple-400' },
  { value: 'Re:MASTER', label: 'Re:MASTER', gradient: 'from-purple-600 to-purple-300', border: 'border-purple-400' },
]

export default function DifficultyFilter() {
  const { activeFilters, toggleFilter } = useSongStore()

  return (
    <div className="flex gap-3 px-4">
      {difficulties.map(({ value, label, gradient, border }) => {
        const isActive = activeFilters.has(value)
        return (
          <button
            key={value}
            onClick={() => toggleFilter(value)}
            className={`
              relative px-6 py-2 rounded-xl font-orbitron font-black text-base
              transition-all duration-200 border-4 shadow-lg
              ${isActive
                ? `text-white bg-gradient-to-b ${gradient} ${border} scale-105 shadow-black/30`
                : 'text-white bg-gradient-to-b from-gray-600 to-gray-700 border-gray-500 hover:from-gray-500 hover:to-gray-600'
              }
            `}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
