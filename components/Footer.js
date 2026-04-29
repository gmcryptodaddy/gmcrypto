import Link from 'next/link'
import SocialIcons from './SocialIcons'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-logo-col">
          <img src="/logo-full.png" alt="[ gm crypto ]" className="footer-logo-img" />
          <p className="footer-tagline">
            Your daily dose of crypto news, market analysis, and blockchain insights.
          </p>
          <SocialIcons size="md" />
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <Link href="/about">About Us</Link>
          <Link href="/advertise">Advertise</Link>
        </div>

        <div className="footer-col">
          <h4>Products</h4>
          <Link href="/?category=News">News</Link>
          <Link href="/learn">Learn</Link>
          <Link href="/markets">Markets</Link>
        </div>

        <div className="footer-col">
          <h4>Crypto News</h4>
          <Link href="/?category=XRP%20News">XRP News</Link>
          <Link href="/?category=Bitcoin%20News">Bitcoin News</Link>
          <Link href="/?category=Ethereum%20News">Ethereum News</Link>
          <Link href="/?category=US%20Crypto%20News">US Crypto News</Link>
          <Link href="/?category=Dogecoin%20News">Dogecoin News</Link>
          <Link href="/?category=Solana%20News">Solana News</Link>
          <Link href="/?category=Meme%20Coin%20News">Meme Coin News</Link>
          <Link href="/?category=ETF%20News">ETF News</Link>
        </div>
      </div>

      <div className="footer-bottom-row">
        <span>© {new Date().getFullYear()} [ gm crypto ] — Not financial advice.</span>
        <div className="footer-legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </div>
    </footer>
  )
}
