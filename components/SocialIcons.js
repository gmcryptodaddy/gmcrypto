// components/SocialIcons.js
// Reusable X + Telegram icon buttons.

export default function SocialIcons({ size = 'md' }) {
  return (
    <div className={`social-icons social-icons-${size}`}>
      <a
        href="https://x.com/gm_cryptonews"
        target="_blank"
        rel="noopener noreferrer"
        className="social-icon-btn"
        aria-label="Follow on X"
        title="Follow on X"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>
      <a
        href="https://t.me/gmcryptofeed"
        target="_blank"
        rel="noopener noreferrer"
        className="social-icon-btn"
        aria-label="Join on Telegram"
        title="Join on Telegram"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.66-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
        </svg>
      </a>
    </div>
  )
}
