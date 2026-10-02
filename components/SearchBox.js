// components/SearchBox.js
// Universal search: a visible "Search…" pill in the navbar that opens a command
// palette searching BOTH articles (via /api/search) and coins (via the cached
// /api/coins-index list). Opens on click or ⌘K / Ctrl+K. Full keyboard nav:
// ↑/↓ to move, Enter to go, Esc to close.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'

// ── Coin list: fetched once, shared across opens (≈600KB, edge-cached) ──
let coinsCache = null
let coinsPromise = null
async function loadCoins() {
  if (coinsCache) return coinsCache
  if (coinsPromise) return coinsPromise
  coinsPromise = fetch('/api/coins-index')
    .then(r => r.json())
    .then(data => {
      coinsCache = Array.isArray(data) ? data : []
      coinsPromise = null
      return coinsCache
    })
    .catch(() => {
      coinsPromise = null
      return []
    })
  return coinsPromise
}

function filterCoins(list, q) {
  if (!list || !list.length || q.length < 1) return []
  const s = q.toLowerCase()
  const scored = []
  for (const c of list) {
    const sym = (c.symbol || '').toLowerCase()
    const name = (c.name || '').toLowerCase()
    let score = -1
    if (sym === s) score = 0
    else if (sym.startsWith(s)) score = 1
    else if (name.startsWith(s)) score = 2
    else if (name.includes(s)) score = 3
    else if (sym.includes(s)) score = 4
    if (score >= 0) scored.push({ c, score })
  }
  scored.sort((a, b) => a.score - b.score || a.c.name.length - b.c.name.length)
  return scored.slice(0, 5).map(x => x.c)
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function SearchBox() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState([])
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const debounceRef = useRef(null)

  // Flattened result list (coins first, then articles) for keyboard nav.
  const items = [
    ...coins.map(c => ({ type: 'coin', data: c })),
    ...articles.map(a => ({ type: 'article', data: a })),
  ]

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setArticles([])
    setCoins([])
    setSearched(false)
    setActive(0)
  }, [])

  const go = useCallback((item) => {
    if (!item) return
    const href = item.type === 'coin'
      ? `/markets/${item.data.id}`
      : `/post/${item.data.slug}`
    close()
    router.push(href)
  }, [router, close])

  // Open with ⌘K / Ctrl+K from anywhere; close with Esc while open.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // On open: focus input, lock scroll, warm the coin list.
  useEffect(() => {
    if (!open) return
    loadCoins()
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 10)
    return () => {
      document.body.style.overflow = ''
      clearTimeout(t)
    }
  }, [open])

  // Query → coins (instant, from cache) + articles (debounced fetch).
  useEffect(() => {
    const q = query.trim()
    setActive(0)
    setCoins(filterCoins(coinsCache, q))

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setArticles([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setArticles(data.results || [])
      } catch {
        setArticles([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Keep the highlighted row in view.
  useEffect(() => {
    const el = listRef.current && listRef.current.querySelector('[data-active="true"]')
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [active, items.length])

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, Math.max(0, items.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[active])
    }
  }

  const q = query.trim()

  return (
    <>
      <button className="nav-search-pill" onClick={() => setOpen(true)} aria-label="Search">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <line x1="14" y1="14" x2="18" y2="18" />
        </svg>
        <span className="nav-search-pill-text">Search…</span>
        <span className="nav-search-kbd">⌘K</span>
      </button>

      {open && (
        <div className="search-overlay" onClick={close}>
          <div className="search-panel" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-row">
              <svg className="search-input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="9" cy="9" r="6" />
                <line x1="14" y1="14" x2="18" y2="18" />
              </svg>
              <input
                ref={inputRef}
                className="search-input"
                type="text"
                placeholder="Search articles and coins…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
              />
              <button className="search-close" onClick={close} aria-label="Close search">Esc</button>
            </div>

            <div className="search-results" ref={listRef}>
              {q.length < 2 && coins.length === 0 && (
                <div className="search-status">Search articles by keyword, or type a coin name or ticker.</div>
              )}

              {coins.length > 0 && (
                <>
                  <div className="search-section-label">Coins</div>
                  {coins.map((c, i) => {
                    const idx = i
                    return (
                      <button
                        key={c.id}
                        className={`search-result${active === idx ? ' active' : ''}`}
                        data-active={active === idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go({ type: 'coin', data: c })}
                      >
                        <div className="search-coin">
                          <span className="search-coin-badge">{(c.symbol || '?').slice(0, 3).toUpperCase()}</span>
                          <span className="search-coin-name">{c.name}</span>
                        </div>
                        <span className="search-result-time">{(c.symbol || '').toUpperCase()}</span>
                      </button>
                    )
                  })}
                </>
              )}

              {loading && <div className="search-status">Searching articles…</div>}

              {!loading && articles.length > 0 && (
                <>
                  <div className="search-section-label">Articles</div>
                  {articles.map((a, i) => {
                    const idx = coins.length + i
                    return (
                      <button
                        key={a._id}
                        className={`search-result${active === idx ? ' active' : ''}`}
                        data-active={active === idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go({ type: 'article', data: a })}
                      >
                        <div className="search-result-body">
                          {a.category && <span className="search-result-cat">{a.category}</span>}
                          <span className="search-result-title">{a.title}</span>
                        </div>
                        <span className="search-result-time">{timeAgo(a.publishedAt)}</span>
                      </button>
                    )
                  })}
                </>
              )}

              {!loading && searched && q.length >= 2 && items.length === 0 && (
                <div className="search-status">No results for “{q}”.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
