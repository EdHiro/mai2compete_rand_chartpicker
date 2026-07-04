import { useRef, useState, useEffect, useMemo, memo } from 'react'
import type { Song, Difficulty } from '@/store/songStore'

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
  UTAGE: 'UTG',
}

const IMAGE_CACHE = (() => {
  const cache: Record<string, string> = {}
  const difficulties: Difficulty[] = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER', 'UTAGE']
  const chartTypes: ('dx' | 'standard')[] = ['dx', 'standard']
  const chartTypeSuffix: Record<'dx' | 'standard', string> = { dx: 'DX', standard: 'STD' }

  for (const diff of difficulties) {
    const code = DIFFICULTY_CODES[diff]
    // UTAGE 没有 STD/DX 之分，沿用单一背景
    if (diff === 'UTAGE') {
      cache[`bg-${diff}`] = `/levbg/Sprite/UI_TST_MBase_${code}.png`
    } else {
      for (const ct of chartTypes) {
        cache[`bg-${diff}-${ct}`] = `/levbg/Sprite/UI_TST_MBase_${code}_${chartTypeSuffix[ct]}.png`
      }
    }
    cache[`lv-${diff}`] = `/levbg/Sprite/UI_TST_MBase_LV_${code}.png`
    cache[`icon-${diff}`] = `/levbg/Sprite/UI_CMN_MusicLevel_${code}_level.png`
    cache[`plus-${diff}`] = code === 'MST_Re'
      ? `/levbg/Sprite/UI_CMN_MusicLevel_${code}_pluis.png`
      : `/levbg/Sprite/UI_CMN_MusicLevel_${code}_plus.png`
    for (let i = 0; i <= 9; i++) {
      cache[`num-${diff}-${i}`] = `/levbg/Sprite/UI_CMN_MusicLevel_${code}_${i}.png`
    }
  }
  // UTAGE 额外问号贴图，位于 + 下方
  cache['qmark-UTAGE'] = '/levbg/Sprite/UI_CMN_MusicLevel_UTG_qmark.png'
  return cache
})()

function SongCardContent({ song, className = '' }: SongCardContentProps) {
  const titleContainerRef = useRef<HTMLDivElement>(null)
  const titleTextRef = useRef<HTMLParagraphElement>(null)
  const authorContainerRef = useRef<HTMLDivElement>(null)
  const authorTextRef = useRef<HTMLParagraphElement>(null)
  const [shouldScroll, setShouldScroll] = useState(false)
  const [animationDuration, setAnimationDuration] = useState(10)
  const [authorShouldScroll, setAuthorShouldScroll] = useState(false)
  const [authorAnimationDuration, setAuthorAnimationDuration] = useState(10)

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

    if (authorContainerRef.current && authorTextRef.current) {
      const containerWidth = authorContainerRef.current.clientWidth
      const textWidth = authorTextRef.current.scrollWidth

      const needsScroll = textWidth > containerWidth
      setAuthorShouldScroll(needsScroll)

      if (needsScroll) {
        const singleItemWidth = textWidth + 64
        const scrollSpeed = 80
        const calculatedDuration = Math.max(singleItemWidth / scrollSpeed, 4)
        setAuthorAnimationDuration(calculatedDuration)
      }
    }
  }, [song.name, song.author])

  // 使用预计算的图片缓存，避免运行时重复计算
  const { chartTypeText, chartTypeColor, cardBg, lvBg, levelIcon } = useMemo(() => {
    const isDx = song.chartType === 'dx'
    const isUtage = song.difficulty === 'UTAGE'
    // UTAGE 无 STD/DX 区分，缓存键不带 chartType 后缀
    const bgKey = isUtage ? `bg-${song.difficulty}` : `bg-${song.difficulty}-${song.chartType}`
    return {
      chartTypeText: isUtage ? 'UTAGE谱面' : isDx ? 'DX谱面' : '标准谱面',
      chartTypeColor: isDx ? 'text-red' : 'text-white',
      cardBg: IMAGE_CACHE[bgKey],
      lvBg: IMAGE_CACHE[`lv-${song.difficulty}`],
      levelIcon: IMAGE_CACHE[`icon-${song.difficulty}`],
    }
  }, [song.chartType, song.difficulty])

  const isPlus = song.isPlus
  const isUtage = song.difficulty === 'UTAGE'
  const levelDigit1 = Math.floor(song.level / 10)
  const levelDigit2 = song.level % 10
  const isSingleDigit = song.level < 10 && song.level > 0

  // 使用预计算的图片缓存
  const levelImages = useMemo(() => {
    const diff = song.difficulty
    // UTAGE 等级为 0 时只显示问号，不显示数字
    if (isUtage && song.level === 0) return []
    if (isSingleDigit || song.level < 10) {
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
  }, [song.difficulty, isUtage, song.level, isSingleDigit, levelDigit1, levelDigit2])

  const plusImage = isPlus ? IMAGE_CACHE[`plus-${song.difficulty}`] : null
  const qmarkImage = isUtage ? IMAGE_CACHE['qmark-UTAGE'] : null

  return (
    <div className={`w-full h-full overflow-hidden ${className}`}>
      <img
        src={cardBg}
        alt="Card Background"
        className="absolute w-full h-full"
      />

      {/* Top ChartType Label */}
      <div className="absolute top-9 left-1/2  -translate-x-1/2 w-[220px] pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-black tracking-[0.26em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] ${chartTypeColor}`}>

          </span>
        </div>
      </div>

      <div className="card-cover-window">
        <img
          src={song.cover}
          alt={song.name}
          className="w-[246px] h-[247px]  object-cover"
          loading="lazy"
        />
      </div>

      {/* Title strip */}
      <div className="absolute top-[365px] left-[14px] right-[14px] z-25 pointer-events-none">
        <div className="card-title-strip">
          <div ref={titleContainerRef} className="w-full overflow-hidden h-[28px]">
            <div 
              className={shouldScroll ? 'animate-marquee' : 'flex justify-center'}
              style={shouldScroll ? { animationDuration: `${animationDuration}s` } : {}}
            >
              <p 
                ref={titleTextRef} 
                className={`text-white text-base font-black tracking-[0.06em] drop-shadow-[0_3px_14px_rgba(0,0,0,0.68)] whitespace-nowrap ${shouldScroll ? 'marquee-text' : ''}`}
              >
                {song.name}
              </p>

              {shouldScroll && (
                <p 
                  className="text-white text-base font-black tracking-[0.06em] drop-shadow-[0_3px_14px_rgba(0,0,0,0.68)] whitespace-nowrap marquee-text"
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
      <div className="absolute top-[410px] left-[18px] right-[18px] z-25 text-center pointer-events-none">
        <div ref={authorContainerRef} className="w-full overflow-hidden h-[22px]">
          <div
            className={authorShouldScroll ? 'animate-marquee' : 'flex justify-center'}
            style={authorShouldScroll ? { animationDuration: `${authorAnimationDuration}s` } : {}}
          >
            <p
              ref={authorTextRef}
              className={`card-author whitespace-nowrap ${authorShouldScroll ? 'marquee-text' : ''}`}
            >
              {song.author}
            </p>

            {authorShouldScroll && (
              <p
                className="card-author whitespace-nowrap marquee-text"
                aria-hidden="true"
              >
                {song.author}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Left purple difficulty label */}
      <div className="absolute top-[435px] left-[1px] pointer-events-none">
        <div className="flex items-center justify-center w-[300px] h-[28px] text-black rounded-[14px]">
              <p>Suining maimai Championship THE 1 ST</p>
        </div>
      </div>

      {/* Right floating LV pill using sprites for numbers */}
      <div className="absolute top-[270px] right-[3px] z-30 pointer-events-none">
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
            {qmarkImage && (
              <img
                src={qmarkImage}
                alt="?"
                className={`absolute left-full h-[30px] w-auto -ml-[9px] ${isPlus ? 'top-[20px]' : 'top-0'}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-2 left-[18px] right-[18px] z-20">
        <div className="relative flex items-center justify-between gap-4">
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">Notes Designer</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{song.difficultyAuthor}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-[0.32em] text-slate-500">BPM</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{song.bpm}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(SongCardContent)
