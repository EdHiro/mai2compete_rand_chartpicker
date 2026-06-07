import type { Song, Difficulty, ChartType } from '@/store/songStore'

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

interface LxnsSongListResponse {
  songs: LxnsSong[]
  genres: unknown[]
  versions: unknown[]
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
  const level = parseInt(levelStr.replace('+', ''), 10)
  return { level: isNaN(level) ? 1 : level, isPlus }
}

// 将 lxns.net API 返回的单首歌曲数据转换为应用内部的 Song 格式
function convertLxnsSong(song: LxnsSong): Song[] {
  const result: Song[] = []
  const { id, title, artist, bpm } = song

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
      })
    }
  }

  return result
}

// 从 lxns.net API 获取全部歌曲数据
export async function fetchMusicData(): Promise<Song[]> {
  const response = await fetch('https://maimai.lxns.net/api/v0/maimai/song/list')

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

  return allSongs
}
