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
          <Link href="/category/news">News</Link>
          <Link href="/category/learn">Learn</Link>
          <Link href="/markets">Markets</Link>
        </div>

        <div className="footer-col">
          <h4>Crypto News</h4>
          <Link href="/category/xrp">XRP News</Link>
          <Link href="/category/bitcoin">Bitcoin News</Link>
          <Link href="/category/ethereum">Ethereum News</Link>
          <Link href="/category/policy">US Crypto News</Link>
          <Link href="/category/dogecoin">Dogecoin News</Link>
          <Link href="/category/solana">Solana News</Link>
          <Link href="/category/meme-coins">Meme Coin News</Link>
          <Link href="/category/etf">ETF News</Link>
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
