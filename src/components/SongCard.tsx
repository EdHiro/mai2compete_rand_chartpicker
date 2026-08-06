import { memo } from 'react'
import SongCardContent from './SongCardContent'
import type { Song } from '@/store/songStore'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SongCardProps {
  song: Song
  isDrawn?: boolean
}

const SongCard = memo(({ song, isDrawn = false }: SongCardProps) => {
  return (
 <div className="group relative w-[400px] h-[580px] transition-transform duration-300 hover:-translate-y-2 hover:z-20">
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
