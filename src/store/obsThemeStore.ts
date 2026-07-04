/**
 * Custom theme store for OBS display pages.
 * Persists theme settings to localStorage.
 */
import { create } from 'zustand'

export interface ObsTheme {
  textColor: string
  accentColor: string
  borderColor: string
  cardBg: string
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  fontFamily: string
}

const defaultTheme: ObsTheme = {
  textColor: '#ffffff',
  accentColor: '#3b82f6',
  borderColor: '#374151',
  cardBg: '#1f2937',
  fontSize: 'md',
  fontFamily: 'system-ui',
}

const THEME_STORAGE_KEY = 'obs-theme'

function loadTheme(): ObsTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw) return { ...defaultTheme, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...defaultTheme }
}

function saveTheme(theme: ObsTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch { /* ignore */ }
}

interface ObsThemeState {
  theme: ObsTheme
  updateTheme: (partial: Partial<ObsTheme>) => void
  resetTheme: () => void
}

const persisted = loadTheme()

export const useObsThemeStore = create<ObsThemeState>((set) => ({
  theme: persisted,

  updateTheme: (partial) => {
    set((state) => {
      const next = { ...state.theme, ...partial }
      saveTheme(next)
      return { theme: next }
    })
  },

  resetTheme: () => {
    saveTheme(defaultTheme)
    set({ theme: defaultTheme })
  },
}))

// Font size to Tailwind class mapping
export const FONT_SIZE_CLASSES: Record<ObsTheme['fontSize'], string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
}
