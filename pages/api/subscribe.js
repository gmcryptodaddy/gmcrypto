// pages/api/subscribe.js
// Newsletter subscribe endpoint — provider-agnostic scaffold.
//
// It goes live the moment you add ONE provider's env vars in Vercel
// (Project → Settings → Environment Variables), then redeploy:
//
//   Beehiiv:
//     BEEHIIV_API_KEY          — Beehiiv → Settings → Integrations → API
//     BEEHIIV_PUBLICATION_ID   — looks like "pub_xxxxxxxx-xxxx-..."
//
//   ConvertKit:
//     CONVERTKIT_API_KEY       — ConvertKit → Settings → Advanced → API
//     CONVERTKIT_FORM_ID       — the numeric id of the form to subscribe to
//
// Until a provider is configured it returns { ok:false, error:'not_configured' }
// and the form shows a friendly "opening soon" message — it never pretends to
// subscribe or throw the email away.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  const email = (req.body?.email || '').toString().trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' })
  }

  try {
    // ── Beehiiv ────────────────────────────────────────────────
    if (process.env.BEEHIIV_API_KEY && process.env.BEEHIIV_PUBLICATION_ID) {
      const r = await fetch(
        `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            reactivate_existing: true,
            send_welcome_email: true,
            utm_source: 'gmcrypto.news',
          }),
        }
      )
      if (!r.ok) {
        console.error('Beehiiv subscribe failed:', r.status, await r.text())
        return res.status(502).json({ ok: false, error: 'provider_error' })
      }
      return res.status(200).json({ ok: true })
    }

    // ── ConvertKit ─────────────────────────────────────────────
    if (process.env.CONVERTKIT_API_KEY && process.env.CONVERTKIT_FORM_ID) {
      const r = await fetch(
        `https://api.convertkit.com/v3/forms/${process.env.CONVERTKIT_FORM_ID}/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: process.env.CONVERTKIT_API_KEY, email }),
        }
      )
      if (!r.ok) {
        console.error('ConvertKit subscribe failed:', r.status, await r.text())
        return res.status(502).json({ ok: false, error: 'provider_error' })
      }
      return res.status(200).json({ ok: true })
    }

    // No provider configured yet.
    return res.status(200).json({ ok: false, error: 'not_configured' })
  } catch (err) {
    console.error('Subscribe error:', err)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
}
