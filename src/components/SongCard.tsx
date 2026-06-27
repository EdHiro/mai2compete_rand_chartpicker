import { memo } from 'react'
import SongCardContent from './SongCardContent'
import type { Song, Difficulty } from '@/store/songStore'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SongCardProps {
  song: Song
  isDrawn?: boolean
}

// 难度色外发光（hover 时显现）
const GLOW_COLORS: Record<Difficulty, string> = {
  BASIC: 'rgba(34, 197, 94, 0.55)',
  ADVANCED: 'rgba(234, 179, 8, 0.55)',
  EXPERT: 'rgba(255, 68, 136, 0.6)',
  MASTER: 'rgba(153, 68, 255, 0.65)',
  'Re:MASTER': 'rgba(255, 170, 0, 0.7)',
}

const SongCard = memo(({ song, isDrawn = false }: SongCardProps) => {
  const glowColor = GLOW_COLORS[song.difficulty]

  return (
    <div className="group relative w-[300px] h-[520px] transition-transform duration-300 hover:-translate-y-2 hover:z-20">
      {/* hover 难度色外发光环 */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ boxShadow: `0 0 50px 4px ${glowColor}` }}
      />

      {/* 卡片主体 */}
      <div
        className={cn(
          'relative w-full h-full transition-transform duration-300 group-hover:scale-[1.04] origin-center',
          isDrawn && 'saturate-[0.5] opacity-70'
        )}
      >
        <SongCardContent song={song} />
      </div>

      {/* 已抽过角标 */}
      {isDrawn && (
        <div className="absolute top-3 right-3 z-40 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/65 backdrop-blur-sm border border-white/15 text-[10px] font-bold font-rajdhani text-white/80 shadow-lg">
          <History size={11} />
          已抽
        </div>
      )}
    </div>
  )
})

SongCard.displayName = 'SongCard'

export default SongCard
