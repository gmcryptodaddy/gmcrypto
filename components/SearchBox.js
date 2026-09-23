// components/SearchBox.js
// Navbar search. Opens an overlay, debounces input, and queries the existing
// /api/search endpoint. Results link straight to the article.

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function SearchBox() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSearched(false)
  }, [])

  // Focus the input when the overlay opens.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  // Lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // Debounced search as the user types.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const q = query.trim()

  return (
    <>
      <button
        className="nav-search-btn"
        onClick={() => setOpen(true)}
        aria-label="Search articles"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <line x1="14" y1="14" x2="18" y2="18" />
        </svg>
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
                placeholder="Search articles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="search-close" onClick={close} aria-label="Close search">Esc</button>
            </div>

            <div className="search-results">
              {loading && <div className="search-status">Searching…</div>}
              {!loading && q.length < 2 && (
                <div className="search-status">Type at least 2 characters.</div>
              )}
              {!loading && searched && q.length >= 2 && results.length === 0 && (
                <div className="search-status">No results for “{q}”.</div>
              )}
              {!loading && results.map((r) => (
                <Link key={r._id} href={`/post/${r.slug}`} className="search-result" onClick={close}>
                  <div className="search-result-body">
                    {r.category && <span className="search-result-cat">{r.category}</span>}
                    <span className="search-result-title">{r.title}</span>
                  </div>
                  <span className="search-result-time">{timeAgo(r.publishedAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
