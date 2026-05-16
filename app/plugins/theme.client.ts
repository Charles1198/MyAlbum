export default defineNuxtPlugin(() => {
  const { setTheme } = useTheme()

  const stored = localStorage.getItem('pa-theme') as 'light' | 'dark' | null
  setTheme(stored)

  if (!stored) {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const handler = () => setTheme(null)
    media?.addEventListener?.('change', handler)
    window.addEventListener('beforeunload', () => media?.removeEventListener?.('change', handler))
  }
})

