import { useSongStore, Difficulty } from '@/store/songStore'
import { cn } from '@/lib/utils'

const difficulties: { value: Difficulty; label: string; gradient: string; border: string; text: string }[] = [
  { value: 'BASIC', label: 'BASIC', gradient: 'from-emerald-400 to-emerald-600', border: 'border-emerald-400', text: 'text-emerald-200' },
  { value: 'ADVANCED', label: 'ADVANCED', gradient: 'from-yellow-400 to-amber-500', border: 'border-yellow-400', text: 'text-yellow-200' },
  { value: 'EXPERT', label: 'EXPERT', gradient: 'from-pink-500 to-rose-600', border: 'border-pink-400', text: 'text-pink-200' },
  { value: 'MASTER', label: 'MASTER', gradient: 'from-violet-500 to-purple-700', border: 'border-violet-400', text: 'text-violet-200' },
  { value: 'Re:MASTER', label: 'Re:MASTER', gradient: 'from-violet-400 to-fuchsia-500', border: 'border-fuchsia-400', text: 'text-fuchsia-200' },
]

export default function DifficultyFilter() {
  const { activeFilters, toggleFilter } = useSongStore()

  return (
    <div className="flex gap-3 px-4 animate-enter stagger-children">
      {difficulties.map(({ value, label, gradient, border, text }) => {
        const isActive = activeFilters.has(value)
        return (
          <button
            key={value}
            onClick={() => toggleFilter(value)}
            className={cn(
              'relative px-6 py-2 rounded-2xl font-orbitron font-black text-base transition-all duration-200 border shadow-lg press-down',
              isActive
                ? `text-white bg-gradient-to-b ${gradient} ${border} scale-105 shadow-black/30`
                : `glass-panel ${text} hover:bg-white/[0.08] hover:text-white hover:border-white/20`
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
