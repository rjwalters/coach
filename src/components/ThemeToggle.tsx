import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getIcon = () => {
    if (theme === 'light') return '☀️'
    if (theme === 'dark') return '🌙'
    return '💻'
  }

  const getLabel = () => {
    if (theme === 'light') return 'Light'
    if (theme === 'dark') return 'Dark'
    return 'System'
  }

  return (
    <Button variant="outline" size="sm" onClick={cycleTheme} className="gap-2">
      <span>{getIcon()}</span>
      <span className="hidden sm:inline">{getLabel()}</span>
    </Button>
  )
}
