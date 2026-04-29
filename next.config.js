/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.sanity.io'],
  },
  async redirects() {
    return [
      // Redirect old category URLs to new query-param-based homepage filter.
      // 308 = permanent redirect (preserves SEO + tells crawlers the URL has moved).
      // Footer/legacy slug → display label mapping (keeps inbound links working):
      { source: '/category/news',         destination: '/?category=News',           permanent: true },
      { source: '/category/breaking-news',destination: '/?category=Breaking%20News',permanent: true },
      { source: '/category/explainer',    destination: '/?category=Explainer',      permanent: true },
      { source: '/category/markets',      destination: '/?category=Markets',        permanent: true },
      { source: '/category/companies',    destination: '/?category=Companies',      permanent: true },
      { source: '/category/tradfi',       destination: '/?category=TradFi',         permanent: true },
      { source: '/category/policy',       destination: '/?category=Policy',         permanent: true },
      { source: '/category/defi',         destination: '/?category=DeFi',           permanent: true },
      { source: '/category/tech',         destination: '/?category=Tech',           permanent: true },
      { source: '/category/web3',         destination: '/?category=Web3',           permanent: true },
      { source: '/category/security',     destination: '/?category=Security',       permanent: true },
      // Footer "Crypto News" placeholders
      { source: '/category/xrp',          destination: '/?category=XRP%20News',         permanent: true },
      { source: '/category/bitcoin',      destination: '/?category=Bitcoin%20News',     permanent: true },
      { source: '/category/ethereum',     destination: '/?category=Ethereum%20News',    permanent: true },
      { source: '/category/dogecoin',     destination: '/?category=Dogecoin%20News',    permanent: true },
      { source: '/category/solana',       destination: '/?category=Solana%20News',      permanent: true },
      { source: '/category/meme-coins',   destination: '/?category=Meme%20Coin%20News', permanent: true },
      { source: '/category/etf',          destination: '/?category=ETF%20News',         permanent: true },
      { source: '/category/learn',        destination: '/learn',                        permanent: true },
      // Catch-all for any other /category/* URL not listed above
      { source: '/category/:slug',        destination: '/?category=:slug',          permanent: true },
    ]
  },
}

module.exports = nextConfig
