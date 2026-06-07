import { useRef, useState, useEffect, useMemo, memo } from 'react'
import type { Song, Difficulty, ChartType } from '@/store/songStore'

interface SongCardContentProps {
  song: Song
  className?: string
}

// 预计算所有可能的图片路径，避免运行时重复计算
const DIFFICULTY_CODES: Record<Difficulty, string> = {
  BASIC: 'BSC',
  ADVANCED: 'ADV',
  EXPERT: 'EXP',
  MASTER: 'MST',
  'Re:MASTER': 'MST_Re',
}

const IMAGE_CACHE = (() => {
  const cache: Record<string, string> = {}
  const difficulties: Difficulty[] = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
  
  for (const diff of difficulties) {
    const code = DIFFICULTY_CODES[diff]
    cache[`bg-${diff}`] = `/levbg/Sprite/UI_TST_MBase_${code}.png`
    cache[`lv-${diff}`] = `/levbg/Sprite/UI_TST_MBase_LV_${code}.png`
    cache[`icon-${diff}`] = `/levbg/Sprite/UI_CMN_MusicLevel_${code}_level.png`
    cache[`plus-${diff}`] = code === 'MST_Re'
      ? `/levbg/Sprite/UI_CMN_MusicLevel_${code}_pluis.png`
      : `/levbg/Sprite/UI_CMN_MusicLevel_${code}_plus.png`
    for (let i = 0; i <= 9; i++) {
      cache[`num-${diff}-${i}`] = `/levbg/Sprite/UI_CMN_MusicLevel_${code}_${i}.png`
    }
  }
  return cache
})()

function SongCardContent({ song, className = '' }: SongCardContentProps) {
  const titleContainerRef = useRef<HTMLDivElement>(null)
  const titleTextRef = useRef<HTMLParagraphElement>(null)
  const [shouldScroll, setShouldScroll] = useState(false)
  const [animationDuration, setAnimationDuration] = useState(10)

  useEffect(() => {
    if (titleContainerRef.current && titleTextRef.current) {
      const containerWidth = titleContainerRef.current.clientWidth
      const textWidth = titleTextRef.current.scrollWidth
      
      const needsScroll = textWidth > containerWidth
      setShouldScroll(needsScroll)

      if (needsScroll) {
        const singleItemWidth = textWidth + 64 
        const scrollSpeed = 80 
        const calculatedDuration = Math.max(singleItemWidth / scrollSpeed, 4)
        setAnimationDuration(calculatedDuration)
      }
    }
  }, [song.name])

  // 使用预计算的图片缓存，避免运行时重复计算
  const { chartTypeText, chartTypeColor, cardBg, lvBg, levelIcon } = useMemo(() => {
    const isDx = song.chartType === 'dx'
    return {
      chartTypeText: isDx ? 'DX谱面' : '标准谱面',
      chartTypeColor: isDx ? 'text-red' : 'text-white',
      cardBg: IMAGE_CACHE[`bg-${song.difficulty}`],
      lvBg: IMAGE_CACHE[`lv-${song.difficulty}`],
      levelIcon: IMAGE_CACHE[`icon-${song.difficulty}`],
    }
  }, [song.chartType, song.difficulty])

  const isPlus = song.isPlus
  const levelDigit1 = Math.floor(song.level / 10)
  const levelDigit2 = song.level % 10
  const isSingleDigit = song.level < 10

  // 使用预计算的图片缓存
  const levelImages = useMemo(() => {
    const diff = song.difficulty
    if (isSingleDigit) {
      return [{
        src: IMAGE_CACHE[`num-${diff}-${levelDigit2}`],
        alt: levelDigit2.toString(),
        key: 0,
        mlClass: '',
      }]
    }
    return [
      {
        src: IMAGE_CACHE[`num-${diff}-${levelDigit1}`],
        alt: levelDigit1.toString(),
        key: 0,
        mlClass: '',
      },
      {
        src: IMAGE_CACHE[`num-${diff}-${levelDigit2}`],
        alt: levelDigit2.toString(),
        key: 1,
        mlClass: '-ml-3.5',
      },
    ]
  }, [song.difficulty, isSingleDigit, levelDigit1, levelDigit2])

  const plusImage = isPlus ? IMAGE_CACHE[`plus-${song.difficulty}`] : null

  return (
    <div className={`w-full h-full overflow-hidden ${className}`}>
      <img
        src={cardBg}
        alt="Card Background"
        className="absolute w-full h-full"
      />

      {/* Top ChartType Label */}
      <div className="absolute top-4 left-1/2  -translate-x-1/2 w-[220px] pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-black uppercase tracking-[0.26em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] ${chartTypeColor}`}>
            {chartTypeText}
          </span>
        </div>
      </div>

      <div className="card-cover-window">
        <img
          src={song.cover}
          alt={song.name}
          className="w-[250px] h-[270px] object-cover"
          loading="lazy"
        />
      </div>

      {/* Title strip */}
      <div className="absolute top-[345px] left-[14px] right-[14px] z-25 pointer-events-none">
        <div className="card-title-strip">
          <div ref={titleContainerRef} className="w-full overflow-hidden h-[28px]">
            <div 
              className={shouldScroll ? 'animate-marquee' : 'flex justify-center'}
              style={shouldScroll ? { animationDuration: `${animationDuration}s` } : {}}
            >
              <p 
                ref={titleTextRef} 
                className={`text-white text-base font-black uppercase tracking-[0.06em] drop-shadow-[0_3px_14px_rgba(0,0,0,0.68)] whitespace-nowrap ${shouldScroll ? 'marquee-text' : ''}`}
              >
                {song.name}
              </p>

              {shouldScroll && (
                <p 
                  className="text-white text-base font-black uppercase tracking-[0.06em] drop-shadow-[0_3px_14px_rgba(0,0,0,0.68)] whitespace-nowrap marquee-text" 
                  aria-hidden="true"
                >
                  {song.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Author line under title strip */}
      <div className="absolute top-[397px] left-[18px] right-[18px] z-25 text-center pointer-events-none">
        <p className="card-author">{song.author}</p>
      </div>

      {/* Left purple difficulty label */}
      <div className="absolute top-[426px] left-[5px] pointer-events-none">
        <div className="flex items-center justify-center w-[300px] h-[28px] text-black rounded-[14px]">
              <p>Suining maimai Championship THE 1 ST</p>
        </div>
      </div>

      {/* Right floating LV pill using sprites for numbers */}
      <div className="absolute top-[253px] right-[3px] z-30 pointer-events-none">
        <img
          src={lvBg}
          alt="LV Background"
          className="h-[90px] w-[130px]"
        />

        <div className="absolute top-[38px] left-[32px] flex items-center whitespace-nowrap">
          <img
            src={levelIcon}
            alt="LV"
            className={`h-[48px] w-auto mb-[4px] ${isSingleDigit ? 'mr-[-2px]' : 'mr-[-12px]'}`}
          />

          <div className="relative flex items-end">
            {levelImages.map(({ src, alt, key, mlClass }) => (
              <img
                key={key}
                src={src}
                alt={alt}
                className={`h-[44px] w-auto ${mlClass}`}
              />
            ))}

            {isPlus && plusImage && (
              <img
                src={plusImage}
                alt="+"
                className="absolute left-full top-0 h-[45px] w-auto -ml-3.5"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-4 left-[18px] right-[18px] z-20">
        <div className="relative flex items-center justify-between gap-4">
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">Notes Designer</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{song.difficultyAuthor}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">BPM</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{song.bpm}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(SongCardContent)
