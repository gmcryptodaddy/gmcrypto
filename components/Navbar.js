import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { client, urlFor } from '../lib/sanity'

const NEWS_CATEGORIES = [
  { label: 'Breaking News', href: '/?category=Breaking%20News' },
  { label: 'Policy', href: '/?category=Policy' },
  { label: 'Tech', href: '/?category=Tech' },
  { label: 'DeFi', href: '/?category=DeFi' },
  { label: 'TradFi', href: '/?category=TradFi' },
]

const MARKETS_LINKS = [
  { label: 'Prices', href: '/markets' },
  { label: 'Top Gainers', href: '/markets/gainers' },
  { label: 'Top Losers', href: '/markets/losers' },
  { label: 'Converter', href: '/markets/converter' },
  { label: 'Exchanges', href: '/markets/exchanges' },
]

const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_LENGTH = 2

function formatCoinPrice(price) {
  if (price == null) return '$—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 0.01) return '$' + price.toFixed(4)
  return '$' + price.toFixed(6)
}

function formatSearchDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function Navbar() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [recentPosts, setRecentPosts] = useState([])
  const [trendingCoins, setTrendingCoins] = useState([])
  const closeTimer = useRef(null)

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeResultIndex, setActiveResultIndex] = useState(-1)
  const searchInputRef = useRef(null)
  const searchWrapperRef = useRef(null)
  const searchAbortRef = useRef(null)
  const searchDebounceRef = useRef(null)

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

  // Focus the input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchOpen) return
    function handleClickOutside(e) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        closeSearch()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchOpen])

  // Close search when route changes (e.g., user clicks a result)
  useEffect(() => {
    const handleRouteChange = () => {
      closeSearch()
      setMobileOpen(false)
    }
    router.events.on('routeChangeStart', handleRouteChange)
    return () => router.events.off('routeChangeStart', handleRouteChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.events])

  // Debounced search fetch.
  // - 300ms wait after typing stops keeps Sanity calls reasonable
  // - AbortController cancels in-flight requests so a stale slow response
  //   can't overwrite a newer fast one
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    const trimmed = searchQuery.trim()
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setSearchResults([])
      setSearchLoading(false)
      setActiveResultIndex(-1)
      if (searchAbortRef.current) searchAbortRef.current.abort()
      return
    }

    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort()
      const controller = new AbortController()
      searchAbortRef.current = controller
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        )
        const data = await res.json()
        setSearchResults(data.results || [])
        setActiveResultIndex(-1)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Search fetch failed:', err)
          setSearchResults([])
        }
      } finally {
        // Only clear loading if this is still the current request
        if (searchAbortRef.current === controller) {
          setSearchLoading(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery])

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

  const openSearch = () => {
    setOpenDropdown(null)
    setSearchOpen(true)
  }

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setSearchLoading(false)
    setActiveResultIndex(-1)
    if (searchAbortRef.current) searchAbortRef.current.abort()
  }, [])

  // Keyboard nav inside search input
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
      return
    }
    if (!searchResults.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveResultIndex(i => (i + 1) % searchResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveResultIndex(i => (i <= 0 ? searchResults.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = activeResultIndex >= 0 ? activeResultIndex : 0
      const target = searchResults[idx]
      if (target?.slug) {
        router.push(`/post/${target.slug}`)
      }
    }
  }

  // Renders the dropdown contents (used by both desktop and mobile search UIs)
  const renderSearchBody = () => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      return (
        <div className="search-hint">
          Type at least {MIN_SEARCH_LENGTH} characters to search articles.
        </div>
      )
    }
    if (searchLoading && searchResults.length === 0) {
      return <div className="search-hint">Searching…</div>
    }
    if (!searchLoading && searchResults.length === 0) {
      return (
        <div className="search-hint">
          No articles found for &ldquo;{trimmed}&rdquo;.
        </div>
      )
    }
    return (
      <ul className="search-results-list" role="listbox">
        {searchResults.map((post, idx) => (
          <li key={post._id} role="option" aria-selected={idx === activeResultIndex}>
            <Link
              href={`/post/${post.slug}`}
              className={`search-result-item ${idx === activeResultIndex ? 'search-result-active' : ''}`}
              onMouseEnter={() => setActiveResultIndex(idx)}
            >
              {post.mainImage ? (
                <img
                  src={urlFor(post.mainImage).width(120).height(80).url()}
                  alt={post.title}
                  className="search-result-img"
                  width={60}
                  height={40}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="search-result-img search-result-img-placeholder" />
              )}
              <div className="search-result-body">
                {post.category && (
                  <span className="search-result-cat">{post.category}</span>
                )}
                <h4 className="search-result-title">{post.title}</h4>
                <div className="search-result-meta">
                  {post.publishedAt && (
                    <span>{formatSearchDate(post.publishedAt)}</span>
                  )}
                  {post.excerpt && (
                    <>
                      {post.publishedAt && <span className="search-result-dot">·</span>}
                      <span className="search-result-excerpt">{post.excerpt}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

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
            <Link href="/learn" className="nav-link-item">Learn</Link>
          </div>
        </div>

        <div className="nav-right">
          {/* Search — desktop. Icon expands to input within the navbar. */}
          <div
            className={`nav-search-wrap ${searchOpen ? 'nav-search-open' : ''}`}
            ref={searchWrapperRef}
          >
            {!searchOpen ? (
              <button
                className="nav-search-toggle"
                onClick={openSearch}
                aria-label="Search articles"
                title="Search articles"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            ) : (
              <div className="nav-search-form">
                <svg className="nav-search-icon-inside" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="nav-search-input"
                  placeholder="Search articles…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  aria-label="Search articles"
                  autoComplete="off"
                />
                <button
                  className="nav-search-close"
                  onClick={closeSearch}
                  aria-label="Close search"
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="6" y1="18" x2="18" y2="6" />
                  </svg>
                </button>
              </div>
            )}

            {/* Results dropdown — only render when there's something to show */}
            {searchOpen && searchQuery.trim().length >= MIN_SEARCH_LENGTH && (
              <div className="search-dropdown" role="region" aria-label="Search results">
                {renderSearchBody()}
              </div>
            )}
          </div>

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
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
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
                    <img src={urlFor(post.mainImage).width(320).height(180).url()} alt={post.title} className="mega-post-img" width={160} height={90} loading="lazy" decoding="async" />
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

      {/* Markets dropdown */}
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
                      {coin.image && <img src={coin.image} alt={coin.name} className="mega-coin-img" width={24} height={24} loading="lazy" decoding="async" />}
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

      {/* Mobile overlay menu — with close button */}
      <div className={`mobile-menu ${mobileOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-close-bar">
          <button
            className="mobile-menu-close"
            onClick={closeMobile}
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        <div className="mobile-menu-inner">
          {/* Mobile search — full-width input at top of menu */}
          <div className="mobile-search-section">
            <div className="mobile-search-form">
              <svg className="nav-search-icon-inside" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="nav-search-input mobile-search-input"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search articles"
                autoComplete="off"
              />
            </div>
            {searchQuery.trim().length >= MIN_SEARCH_LENGTH && (
              <div className="mobile-search-results">
                {renderSearchBody()}
              </div>
            )}
          </div>

          <div className="mobile-menu-section">
            <div className="mobile-menu-heading">Browse</div>
            <Link href="/" className="mobile-menu-link" onClick={closeMobile}>All News</Link>
            <Link href="/articles" className="mobile-menu-link" onClick={closeMobile}>All Articles</Link>
            <Link href="/markets" className="mobile-menu-link" onClick={closeMobile}>Markets</Link>
            <Link href="/learn" className="mobile-menu-link" onClick={closeMobile}>Learn</Link>
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
            <a href="https://x.com/gm_cryptonews" target="_blank" rel="noopener noreferrer" className="mobile-menu-social">
              Follow @gm_cryptonews →
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
