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
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          <span className="toggle-label">{isDark ? 'GN' : 'GM'}</span>
          <span className="toggle-track">
            <span className="toggle-thumb" style={{ transform: isDark ? 'translateX(0)' : 'translateX(16px)' }} />
          </span>
        </button>
      </div>
    </nav>
  )
}
