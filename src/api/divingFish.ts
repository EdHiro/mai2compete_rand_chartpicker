import type { Song, Difficulty, GameVersion } from '@/store/songStore'

// lxns.net API 返回的谱面难度数据结构
interface LxnsSongDifficulty {
  type: 'standard' | 'dx' | 'utage'
  difficulty: number  // 0=BASIC, 1=ADVANCED, 2=EXPERT, 3=MASTER, 4=Re:MASTER
  level: string        // 难度标级，如 "14+"
  level_value: number  // 谱面定数
  note_designer: string // 谱师
  version: number
  notes?: unknown
}

interface LxnsSongDifficulties {
  standard: LxnsSongDifficulty[]
  dx: LxnsSongDifficulty[]
  utage?: LxnsSongDifficulty[]
}

interface LxnsSong {
  id: number
  title: string
  artist: string
  genre: string
  bpm: number
  version: number
  rights?: string
  map?: string
  locked?: boolean
  disabled?: boolean
  difficulties: LxnsSongDifficulties
}

interface LxnsVersion {
  id: number
  title: string
  version: number
}

interface LxnsSongListResponse {
  songs: LxnsSong[]
  genres: unknown[]
  versions: LxnsVersion[]
}

interface LxnsAlias {
  song_id: number
  aliases: string[]
}

interface LxnsAliasListResponse {
  aliases: LxnsAlias[]
}

// 难度索引对应关系：0=Basic, 1=Advanced, 2=Expert, 3=Master, 4=Re:MASTER
const DIFFICULTY_MAP: Record<number, Difficulty> = {
  0: 'BASIC',
  1: 'ADVANCED',
  2: 'EXPERT',
  3: 'MASTER',
  4: 'Re:MASTER',
}

// 解析等级字符串 "13+" -> { level: 13, isPlus: true }
function parseLevel(levelStr: string): { level: number; isPlus: boolean } {
  const isPlus = levelStr.includes('+')
  const cleaned = levelStr.replace('+', '').trim()
  const level = /\d/.test(cleaned) ? parseInt(cleaned, 10) : 0
  return { level: isNaN(level) ? 0 : level, isPlus }
}

// 将 lxns.net API 返回的单首歌曲数据转换为应用内部的 Song 格式
function convertLxnsSong(song: LxnsSong): Song[] {
  const result: Song[] = []
  const { id, title, artist, bpm, version: songVersion } = song

  const cover = `https://assets2.lxns.net/maimai/jacket/${id}.png`

  // 处理 standard 和 dx 两种谱面类型
  for (const chartType of ['standard', 'dx'] as const) {
    const difficulties = song.difficulties[chartType]
    if (!difficulties) continue

    for (const diff of difficulties) {
      // 只转换 Expert, Master, Re:Master (difficulty 2, 3, 4)
      const difficulty = DIFFICULTY_MAP[diff.difficulty]
      if (!difficulty) continue

      const { level, isPlus } = parseLevel(diff.level)

      result.push({
        id: `${song.id}-${chartType}-${diff.difficulty}`,
        songId: song.id,
        name: title,
        difficulty,
        level,
        isPlus,
        cover,
        author: artist,
        difficultyAuthor: diff.note_designer ?? '',
        bpm,
        chartType,
        genre: song.genre,
        levelValue: diff.level_value ?? level + (isPlus ? 0.5 : 0),
        version: diff.version ?? songVersion,
      })
    }
  }

  // 处理 UTAGE 谱面
  const utageDiffs = song.difficulties.utage
  if (utageDiffs) {
    for (const diff of utageDiffs) {
      const { level, isPlus } = parseLevel(diff.level)
      result.push({
        id: `${song.id}-utage-${diff.difficulty}`,
        songId: song.id,
        name: title,
        difficulty: 'UTAGE',
        level,
        isPlus,
        cover,
        author: artist,
        difficultyAuthor: diff.note_designer ?? '',
        bpm,
        chartType: 'standard',
        genre: song.genre,
        levelValue: diff.level_value ?? level + (isPlus ? 0.5 : 0),
        version: diff.version ?? songVersion,
      })
    }
  }

  return result
}

export interface FetchMusicResult {
  songs: Song[]
  versions: GameVersion[]
}

// 从 lxns.net API 获取全部歌曲数据（含版本列表）
export async function fetchMusicData(): Promise<FetchMusicResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch('https://maimai.lxns.net/api/v0/maimai/song/list', {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`获取歌曲数据失败: ${response.status} ${response.statusText}`)
    }

    const data: LxnsSongListResponse = await response.json()

    const allSongs: Song[] = []
    for (const song of data.songs) {
      if (song.disabled) continue
      const converted = convertLxnsSong(song)
      allSongs.push(...converted)
    }

    const versions: GameVersion[] = (data.versions || []).map(v => ({
      version: v.version,
      title: v.title,
    }))

    return { songs: allSongs, versions }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('获取歌曲数据超时，请检查网络连接')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// 获取游戏版本列表（单独调用，用于已有数据时补充版本信息）
export async function fetchVersions(): Promise<GameVersion[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch('https://maimai.lxns.net/api/v0/maimai/song/list', {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`获取版本数据失败: ${response.status} ${response.statusText}`)
    }

    const data: LxnsSongListResponse = await response.json()
    return (data.versions || []).map(v => ({ version: v.version, title: v.title }))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('获取版本数据超时')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

// 获取曲目别名列表
export async function fetchAliases(): Promise<Record<number, string[]>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch('https://maimai.lxns.net/api/v0/maimai/alias/list', {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`获取别名数据失败: ${response.status} ${response.statusText}`)
    }

    const data: LxnsAliasListResponse = await response.json()
    const result: Record<number, string[]> = {}
    for (const item of data.aliases) {
      result[item.song_id] = item.aliases
    }
    return result
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('获取别名数据超时')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
