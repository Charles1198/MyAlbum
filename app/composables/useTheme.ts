type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pa-theme'

export function useTheme() {
  const theme = useState<Theme | null>('theme', () => null)

  const apply = (value: Theme | null) => {
    if (!import.meta.client) return
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const next = value ?? (prefersDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const setTheme = (value: Theme | null) => {
    theme.value = value
    if (import.meta.client) {
      if (value) localStorage.setItem(STORAGE_KEY, value)
      else localStorage.removeItem(STORAGE_KEY)
    }
    apply(value)
  }

  const toggle = () => {
    const current = theme.value ?? (import.meta.client && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggle, apply }
}

