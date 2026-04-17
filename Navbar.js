import Link from 'next/link'

const CATEGORIES = ['Markets', 'DeFi', 'NFTs', 'Regulation', 'Bitcoin', 'Ethereum']

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          GM <span>Crypto</span>
        </Link>
        <div className="nav-links">
          {CATEGORIES.map(cat => (
            <Link key={cat} href={`/category/${cat.toLowerCase()}`}>{cat}</Link>
          ))}
        </div>
        <span className="nav-tag">Live</span>
      </div>
    </nav>
  )
}
