import Link from 'next/link'
import { useState, useEffect } from 'react'

const CATEGORIES = ['Markets', 'DeFi', 'NFTs', 'Regulation', 'Bitcoin', 'Ethereum']

export default function Navbar() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      setIsDark(false)
      document.body.classList.add('light')
    }
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.body.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <img
            src={isDark ? '/logo.png' : '/logo-full.png'}
            alt="[ gm crypto ]"
          />
        </Link>
        <div className="nav-links">
          {CATEGORIES.map(cat => (
            <Link key={cat} href={`/category/${cat.toLowerCase()}`}>{cat}</Link>
          ))}
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle light/dark mode">
          <span className="toggle-label">{isDark ? '[ gn ]' : '[ gm ]'}</span>
          <span className="toggle-track"><span className="toggle-thumb" /></span>
        </button>
      </div>
    </nav>
  )
}
