import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { client, urlFor } from '../lib/sanity'

const NEWS_CATEGORIES = [
  { label: 'Breaking News', href: '/category/breaking-news' },
  { label: 'Explainer', href: '/category/explainer' },
  { label: 'Policy', href: '/category/policy' },
  { label: 'Companies', href: '/category/companies' },
  { label: 'DeFi', href: '/category/defi' },
  { label: 'Tech', href: '/category/tech' },
  { label: 'Security', href: '/category/security' },
  { label: 'TradFi', href: '/category/tradfi' },
]

export default function Navbar() {
  const [isDark, setIsDark] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [recentPosts, setRecentPosts] = useState([])
  const [trendingCoins, setTrendingCoins] = useState([])
  const [searchValue, setSearchValue] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const closeTimer = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      setIsDark(false)
      document.body.classList.add('light')
    }
  }, [])

  // Fetch recent posts for News dropdown (once)
  useEffect(() => {
    async function loadPosts() {
      try {
        const query = `*[_type == "post"] | order(publishedAt desc)[0...4] {
          _id, title, slug, mainImage, category, publishedAt
        }`
        const posts = await client.fetch(query)
        setRecentPosts(posts || [])
      } catch (err) {
        console.error('Navbar posts fetch error:', err)
      }
    }
    loadPosts()
  }, [])

  // Fetch trending coins for Markets dropdown (once)
  useEffect(() => {
    async function loadTrending() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=7&page=1&sparkline=false&price_change_percentage=24h'
        )
        const data = await res.json()
        setTrendingCoins(data || [])
      } catch (err) {
        console.error('Navbar trending fetch error:', err)
      }
    }
    loadTrending()
  }, [])

  // Quick search (debounced) for Markets dropdown
  useEffect(() => {
    if (!searchValue || searchValue.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchValue)}`
        )
        const data = await res.json()
        setSearchResults((data.coins || []).slice(0, 5))
      } catch (err) {
        console.error('Search error:', err)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchValue])

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

  const handleEnter = (name) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenDropdown(name)
  }

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120)
  }

  const closeDropdown = () => {
    setOpenDropdown(null)
    setSearchValue('')
    setSearchResults([])
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <img src={isDark ? '/logo.png' : '/logo-full.png'} alt="[ gm crypto ]" />
        </Link>

        <div className="nav-links">
          {/* News */}
          <div
            className="nav-item-wrap"
            onMouseEnter={() => handleEnter('news')}
            onMouseLeave={handleLeave}
          >
            <Link href="/" className="nav-link-item">
              News
              <svg className="nav-caret" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Markets */}
          <div
            className="nav-item-wrap"
            onMouseEnter={() => handleEnter('markets')}
            onMouseLeave={handleLeave}
          >
            <Link href="/markets" className="nav-link-item">
              Markets
              <svg className="nav-caret" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <Link href="/category/learn" className="nav-link-item">Learn</Link>
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          <span className="toggle-label">{isDark ? 'GN' : 'GM'}</span>
          <span className="toggle-track">
            <span className="toggle-thumb" style={{ transform: isDark ? 'translateX(0)' : 'translateX(16px)' }} />
          </span>
        </button>
      </div>

      {/* MEGA DROPDOWNS — positioned absolutely below nav, no layout shift */}

      {/* News dropdown */}
      <div
        className={`mega-dropdown ${openDropdown === 'news' ? 'mega-open' : ''}`}
        onMouseEnter={() => handleEnter('news')}
        onMouseLeave={handleLeave}
      >
        <div className="mega-inner">
          <div className="mega-sidebar">
            <div className="mega-sidebar-title">Categories</div>
            <Link href="/" className="mega-sidebar-link" onClick={closeDropdown}>
              All News
            </Link>
            {NEWS_CATEGORIES.map(cat => (
              <Link
                key={cat.href}
                href={cat.href}
                className="mega-sidebar-link"
                onClick={closeDropdown}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <div className="mega-content">
            <div className="mega-content-title">Latest Articles</div>
            <div className="mega-posts-grid">
              {recentPosts.length > 0 ? recentPosts.map(post => (
                <Link
                  key={post._id}
                  href={`/post/${post.slug.current}`}
                  className="mega-post-card"
                  onClick={closeDropdown}
                >
                  {post.mainImage ? (
                    <img
                      src={urlFor(post.mainImage).width(320).height(180).url()}
                      alt={post.title}
                      className="mega-post-img"
                    />
                  ) : (
                    <div className="mega-post-img mega-post-img-placeholder" />
                  )}
                  <div className="mega-post-body">
                    {post.category && (
                      <span className="mega-post-cat">{post.category}</span>
                    )}
                    <h4 className="mega-post-title">{post.title}</h4>
                  </div>
                </Link>
              )) : (
                <div className="mega-empty">Loading latest articles…</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Markets dropdown */}
      <div
        className={`mega-dropdown ${openDropdown === 'markets' ? 'mega-open' : ''}`}
        onMouseEnter={() => handleEnter('markets')}
        onMouseLeave={handleLeave}
      >
        <div className="mega-inner">
          <div className="mega-sidebar">
            <div className="mega-sidebar-title">Navigate</div>
            <Link href="/markets" className="mega-sidebar-link" onClick={closeDropdown}>
              Prices
            </Link>

            <div className="mega-search-wrap">
              <div className="mega-sidebar-title" style={{ marginTop: 20 }}>Quick Search</div>
              <input
                type="text"
                className="mega-search-input"
                placeholder="Search coin…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="mega-search-results">
                  {searchResults.map(coin => (
                    <Link
                      key={coin.id}
                      href={`/markets/${coin.id}`}
                      className="mega-search-result"
                      onClick={closeDropdown}
                    >
                      {coin.thumb && (
                        <img src={coin.thumb} alt={coin.name} className="mega-search-img" />
                      )}
                      <div>
                        <div className="mega-search-name">{coin.name}</div>
                        <div className="mega-search-symbol">{coin.symbol}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mega-content">
            <div className="mega-content-title">Trending Coins</div>
            <div className="mega-coins-grid">
              {trendingCoins.length > 0 ? trendingCoins.map(coin => {
                const change = coin.price_change_percentage_24h
                const up = change >= 0
                return (
                  <Link
                    key={coin.id}
                    href={`/markets/${coin.id}`}
                    className="mega-coin-card"
                    onClick={closeDropdown}
                  >
                    <div className="mega-coin-top">
                      {coin.image && (
                        <img src={coin.image} alt={coin.name} className="mega-coin-img" />
                      )}
                      <span className="mega-coin-name">{coin.name}</span>
                    </div>
                    <div className={`mega-coin-change ${up ? 'up' : 'down'}`}>
                      {up ? '+' : ''}{change?.toFixed(2)}%
                    </div>
                  </Link>
                )
              }) : (
                <div className="mega-empty">Loading trending coins…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
