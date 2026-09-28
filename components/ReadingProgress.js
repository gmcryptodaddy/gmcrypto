// components/ReadingProgress.js
// Thin bar pinned to the top of the viewport that fills as the reader scrolls.

import { useState, useEffect } from 'react'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let ticking = false
    const update = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      const pct = max > 0 ? (el.scrollTop / max) * 100 : 0
      setProgress(Math.min(100, Math.max(0, pct)))
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  )
}
