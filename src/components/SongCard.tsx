import { memo } from 'react'
import SongCardContent from './SongCardContent'
import type { Song } from '@/store/songStore'

interface SongCardProps {
  song: Song
}

const SongCard = memo(({ song }: SongCardProps) => {
  return (
    <div className="relative w-[300px] h-[520px] transition-all duration-300 hover:scale-105 hover:shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
      <SongCardContent song={song} />
    </div>
  )
})

SongCard.displayName = 'SongCard'

export default SongCard
