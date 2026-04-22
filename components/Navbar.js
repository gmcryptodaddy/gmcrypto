import Link from 'next/link'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  {
    label: 'News',
    href: '/category/news',
    hasDropdown: true,
    dropdown: [
      { label: 'All News', href: '/' },
      { label: 'Breaking News', href: '/category/breaking-news' },
      { label: 'Explainer', href: '/category/explainer' },
      { label: 'Policy', href: '/category/policy' },
      { label: 'Security', href: '/category/security' },
    ],
  },
  {
    label: 'Markets',
    href: '/markets',
    hasDropdown: true,
    dropdown: [
      { label: 'Prices', href: '/markets' },
      { label: 'Top Gainers', href: '/markets?sort=gainers' },
      { label: 'Top Losers', href: '/markets?sort=losers' },
      { label: 'Trending', href: '/markets?sort=trending' },
    ],
  },
  { label: 'Learn', href: '/category/learn', hasDropdown: false },
]

export default function Navbar() {
  const [isDark, setIsDark] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)

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
          {NAV_ITEMS.map(item => (
            <div
              key={item.label}
              className="nav-item-wrap"
              onMouseEnter={() => item.hasDropdown && setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link href={item.href} className="nav-link-item">
                {item.label}
                {item.hasDropdown && (
                  <svg className="nav-caret" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </Link>

              {item.hasDropdown && openDropdown === item.label && (
                <div className="nav-dropdown">
                  {item.dropdown.map(sub => (
                    <Link key={sub.href} href={sub.href} className="nav-dropdown-item">
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
