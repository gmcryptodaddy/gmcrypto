import Link from 'next/link'

export default function Footer() {
  return (
    <>
      <footer className="footer">
        <div>
          <div className="footer-logo">GM <span>Crypto</span></div>
          <p className="footer-desc">
            GM!Your daily dose of crypto news, market analysis, and blockchain insights.
          </p>
        </div>
        <div className="footer-col">
          <h4>Coverage</h4>
          <Link href="/category/markets">Markets</Link>
          <Link href="/category/defi">DeFi</Link>
          <Link href="/category/nfts">NFTs</Link>
          <Link href="/category/regulation">Regulation</Link>
          <Link href="/category/bitcoin">Bitcoin</Link>
          <Link href="/category/ethereum">Ethereum</Link>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/advertise">Advertise</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} GM Crypto. Not financial advice.</span>
        <span>Built with Next.js + Sanity</span>
      </div>
    </>
  )
}
