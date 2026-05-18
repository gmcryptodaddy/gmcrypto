// components/ArticleReactions.js
// Emoji reaction bar shown at the end of articles.
//
// Reactions: 🚀 bullish · 🤔 interesting · 💀 rekt/bearish · 🔥 hot take · 👀 watching
//
// Abuse prevention (client side): localStorage records which reactions this
// browser has already given for this post, so the same person can't spam.
// (Server-side IP rate limiting is the harder backstop — see /api/reactions.)
//
// Note: localStorage is used here intentionally for a real deployed Next.js
// site. (It is only unsupported inside the Claude.ai artifact sandbox.)

import { useState, useEffect, useCallback } from 'react'

const REACTIONS = [
  { key: 'rocket',   emoji: '🚀', label: 'Bullish' },
  { key: 'thinking', emoji: '🤔', label: 'Interesting' },
  { key: 'skull',    emoji: '💀', label: 'Rekt' },
  { key: 'fire',     emoji: '🔥', label: 'Hot take' },
  { key: 'eyes',     emoji: '👀', label: 'Watching' },
]

export default function ArticleReactions({ postId }) {
  const [counts, setCounts] = useState(null)      // null = still loading
  const [reacted, setReacted] = useState({})       // { rocket: true, ... }
  const [pending, setPending] = useState(null)     // key currently being submitted
  const [error, setError] = useState('')

  const storageKey = postId ? `gmcrypto-reactions-${postId}` : null

  // Load this browser's prior reactions from localStorage
  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setReacted(JSON.parse(saved))
    } catch {
      // Corrupt/blocked storage — just start fresh, not worth surfacing.
    }
  }, [storageKey])

  // Fetch current counts on mount
  useEffect(() => {
    if (!postId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/reactions?postId=${encodeURIComponent(postId)}`)
        const data = await res.json()
        if (!cancelled) setCounts(data.counts || {})
      } catch {
        if (!cancelled) setCounts({})
      }
    }
    load()
    return () => { cancelled = true }
  }, [postId])

  const handleReact = useCallback(async (key) => {
    if (!postId || reacted[key] || pending) return

    setError('')
    setPending(key)

    // Optimistic update — bump the count immediately for snappy feel.
    setCounts(prev => ({
      ...(prev || {}),
      [key]: ((prev && prev[key]) || 0) + 1,
    }))
    const nextReacted = { ...reacted, [key]: true }
    setReacted(nextReacted)
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(nextReacted)) } catch {}
    }

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reaction: key }),
      })
      const data = await res.json()

      if (res.status === 429) {
        // Rate limited — roll back the optimistic bump and the localStorage flag.
        setError('Whoa, slow down — try again in a bit.')
        rollback(key, data.counts)
        return
      }
      if (!data.ok) {
        setError('Could not save your reaction. Try again later.')
        rollback(key, data.counts)
        return
      }
      // Success — trust the server's authoritative counts.
      if (data.counts) setCounts(data.counts)
    } catch {
      setError('Could not save your reaction. Try again later.')
      rollback(key, null)
    } finally {
      setPending(null)
    }
  }, [postId, reacted, pending, storageKey])

  // Undo an optimistic update when the server rejects it.
  const rollback = (key, serverCounts) => {
    const reverted = { ...reacted }
    delete reverted[key]
    setReacted(reverted)
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(reverted)) } catch {}
    }
    if (serverCounts) {
      setCounts(serverCounts)
    } else {
      setCounts(prev => ({
        ...(prev || {}),
        [key]: Math.max(0, ((prev && prev[key]) || 1) - 1),
      }))
    }
  }

  if (!postId) return null

  const totalReactions = counts
    ? Object.values(counts).reduce((sum, n) => sum + (n || 0), 0)
    : 0

  return (
    <div className="reactions">
      <div className="reactions-prompt">
        What&apos;s your take?
        {totalReactions > 0 && (
          <span className="reactions-total"> · {totalReactions} reaction{totalReactions === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="reactions-row">
        {REACTIONS.map(r => {
          const count = counts ? (counts[r.key] || 0) : 0
          const hasReacted = !!reacted[r.key]
          const isPending = pending === r.key
          return (
            <button
              key={r.key}
              className={`reaction-btn ${hasReacted ? 'reaction-btn-active' : ''}`}
              onClick={() => handleReact(r.key)}
              disabled={hasReacted || !!pending}
              title={hasReacted ? `You reacted: ${r.label}` : r.label}
              aria-label={`React with ${r.label}`}
              aria-pressed={hasReacted}
            >
              <span className="reaction-emoji">{r.emoji}</span>
              <span className="reaction-count">
                {counts === null ? '·' : (isPending ? '…' : count)}
              </span>
            </button>
          )
        })}
      </div>

      {error && <div className="reactions-error">{error}</div>}
    </div>
  )
}
