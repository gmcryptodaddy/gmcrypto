// components/NewsletterInline.js
// Inline newsletter capture for article pages. Posts to the same /api/subscribe
// endpoint as the sidebar form; shows real states and never fakes success.

import { useState } from 'react'

export default function NewsletterInline() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error | soon
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('error')
      setMessage('Enter a valid email.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = await res.json()
      if (data.ok) setStatus('success')
      else if (data.error === 'not_configured') setStatus('soon')
      else if (data.error === 'invalid_email') { setStatus('error'); setMessage('Enter a valid email.') }
      else { setStatus('error'); setMessage('Something went wrong. Try again.') }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  return (
    <aside className="nl-inline">
      <div className="nl-inline-copy">
        <div className="nl-inline-title">No hype. Just signal.</div>
        <div className="nl-inline-sub">Get the crypto stories that matter, in your inbox.</div>
      </div>

      {status === 'success' ? (
        <p className="nl-inline-done">✓ You're in. GM anon!</p>
      ) : status === 'soon' ? (
        <p className="nl-inline-done">🙌 Newsletter opening soon — you're early.</p>
      ) : (
        <form className="nl-inline-form" onSubmit={submit}>
          <input
            className="nl-inline-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />
          <button className="nl-inline-btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Subscribing…' : 'Subscribe Free'}
          </button>
          {status === 'error' && <p className="nl-inline-err">{message}</p>}
        </form>
      )}
    </aside>
  )
}
