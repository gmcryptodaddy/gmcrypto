import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { client, urlFor } from '../lib/sanity'

const NEWS_CATEGORIES = [
  { label: 'Breaking News', href: '/category/breaking-news' },
  { label: 'Policy', href: '/category/policy' },
  { label: 'Tech', href: '/category/tech' },
  { label: 'DeFi', href: '/category/defi' },
  { label: 'TradFi', href: '/category/tradfi' },
]

const MARKETS_LINKS = [
  { label: 'Prices', href: '/markets' },
  { label: 'Top Gainers', href: '/markets/gainers' },
  { label: 'Top Losers', href: '/markets/losers' },
  { label: 'Converter', href: '/markets/converter' },
  { label: 'Exchanges', href: '/markets/exchanges' },
]

function formatCoinPrice(price) {
  if (price == null) return '$—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 0.01) return '$' + price.toFixed(4)
  return '$' + price.toFixed(6)
}

export default function Navbar() {
  const [isDark, setIsDark] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [recentPosts, setRecentPosts] = useState([])
  const [trendingCoins, setTrendingCoins] = useState([])
  const closeTimer = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') {
      setIsDark(false)
      document.body.classList.add('light')
    }
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

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

  const closeDropdown = () => setOpenDropdown(null)
  const closeMobile = () => setMobileOpen(false)

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <img src={isDark ? '/logo.png' : '/logo-full.png'} alt="[ gm crypto ]" />
        </Link>

        <div className="nav-links">
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

          <div className="nav-item-wrap">
            <Link href="/category/learn" className="nav-link-item">Learn</Link>
          </div>
        </div>

        <div className="nav-right">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            <span className="toggle-label">{isDark ? 'GN' : 'GM'}</span>
            <span className="toggle-track">
              <span className="toggle-thumb" style={{ transform: isDark ? 'translateX(0)' : 'translateX(16px)' }} />
            </span>
          </button>

          <button
            className="nav-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* News dropdown */}
      <div
        className={`mega-dropdown ${openDropdown === 'news' ? 'mega-open' : ''}`}
        onMouseEnter={() => handleEnter('news')}
        onMouseLeave={handleLeave}
      >
        <div className="mega-inner">
          <div className="mega-sidebar">
            <div className="mega-sidebar-title">Categories</div>
            <Link href="/" className="mega-sidebar-link" onClick={closeDropdown}>All News</Link>
            {NEWS_CATEGORIES.map(cat => (
              <Link key={cat.href} href={cat.href} className="mega-sidebar-link" onClick={closeDropdown}>
                {cat.label}
              </Link>
            ))}
          </div>
          <div className="mega-content">
            <div className="mega-content-title">Latest Articles</div>
            <div className="mega-posts-grid">
              {recentPosts.length > 0 ? recentPosts.map(post => (
                <Link key={post._id} href={`/post/${post.slug.current}`} className="mega-post-card" onClick={closeDropdown}>
                  {post.mainImage ? (
                    <img src={urlFor(post.mainImage).width(320).height(180).url()} alt={post.title} className="mega-post-img" />
                  ) : (
                    <div className="mega-post-img mega-post-img-placeholder" />
                  )}
                  <div className="mega-post-body">
                    {post.category && <span className="mega-post-cat">{post.category}</span>}
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

      {/* Markets dropdown — no Quick Search, tighter sidebar */}
      <div
        className={`mega-dropdown ${openDropdown === 'markets' ? 'mega-open' : ''}`}
        onMouseEnter={() => handleEnter('markets')}
        onMouseLeave={handleLeave}
      >
        <div className="mega-inner mega-inner-tight">
          <div className="mega-sidebar">
            <div className="mega-sidebar-title">Navigate</div>
            {MARKETS_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="mega-sidebar-link" onClick={closeDropdown}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mega-content">
            <div className="mega-content-title">Trending Coins</div>
            <div className="mega-coins-grid">
              {trendingCoins.length > 0 ? trendingCoins.map(coin => {
                const change = coin.price_change_percentage_24h
                const up = change >= 0
                return (
                  <Link key={coin.id} href={`/markets/${coin.id}`} className="mega-coin-card" onClick={closeDropdown}>
                    <div className="mega-coin-top">
                      {coin.image && <img src={coin.image} alt={coin.name} className="mega-coin-img" />}
                      <div className="mega-coin-names">
                        <span className="mega-coin-name">{coin.name}</span>
                        <span className="mega-coin-symbol">{coin.symbol?.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="mega-coin-price">{formatCoinPrice(coin.current_price)}</div>
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

      {/* Mobile overlay menu */}
      <div className={`mobile-menu ${mobileOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-inner">
          <div className="mobile-menu-section">
            <div className="mobile-menu-heading">Browse</div>
            <Link href="/" className="mobile-menu-link" onClick={closeMobile}>All News</Link>
            <Link href="/markets" className="mobile-menu-link" onClick={closeMobile}>Markets</Link>
            <Link href="/category/learn" className="mobile-menu-link" onClick={closeMobile}>Learn</Link>
          </div>

          <div className="mobile-menu-section">
            <div className="mobile-menu-heading">Markets</div>
            <Link href="/markets/gainers" className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>Top Gainers</Link>
            <Link href="/markets/losers" className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>Top Losers</Link>
            <Link href="/markets/converter" className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>Converter</Link>
            <Link href="/markets/exchanges" className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>Exchanges</Link>
          </div>

          <div className="mobile-menu-section">
            <div className="mobile-menu-heading">News Categories</div>
            {NEWS_CATEGORIES.map(cat => (
              <Link key={cat.href} href={cat.href} className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>
                {cat.label}
              </Link>
            ))}
          </div>

          <div className="mobile-menu-section">
            <div className="mobile-menu-heading">About</div>
            <Link href="/about" className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>About</Link>
            <Link href="/advertise" className="mobile-menu-link mobile-menu-sublink" onClick={closeMobile}>Advertise</Link>
          </div>

          <div className="mobile-menu-footer">
            <a href="https://twitter.com/gm_cryptonews" target="_blank" rel="noopener noreferrer" className="mobile-menu-social">
              Follow @gm_cryptonews →
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
