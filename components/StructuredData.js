// components/StructuredData.js
// JSON-LD structured data components for SEO.
//
// Available schemas:
//   <OrganizationSchema />            — every page (knowledge panel eligibility)
//   <WebsiteSchema />                 — homepage
//   <NewsArticleSchema post={...} />  — article pages (Google News eligibility)
//   <BreadcrumbSchema items={[...]} /> — any page with breadcrumb structure
//   <CryptocurrencySchema coin={...}/> — coin detail pages
//
// Notes:
//   - JSON-LD is the format Google explicitly recommends over microdata/RDFa
//   - Multiple schemas can coexist on a single page

import Head from 'next/head'

const SITE_URL = 'https://www.gmcrypto.news'
const SITE_NAME = 'GM Crypto News'

export function JsonLd({ data }) {
  return (
    <Head>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </Head>
  )
}

// Organization → knowledge panel eligibility for branded searches
export function OrganizationSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: SITE_NAME,
    alternateName: 'gm crypto',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo-full.png`,
      width: 600,
      height: 200,
    },
    description: 'Daily crypto news, market analysis, and blockchain insights. No hype. Just signal.',
    sameAs: [
      'https://x.com/gm_cryptonews',
      'https://t.me/gmcryptofeed',
    ],
  }
  return <JsonLd data={data} />
}

// WebSite — registers your site + future SearchAction support
export function WebsiteSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-full.png` },
    },
  }
  return <JsonLd data={data} />
}

// NewsArticle — Google News + Top Stories eligibility
// Now includes: wordCount, keywords, Person author when available, articleBody preview
export function NewsArticleSchema({ post, imageUrl, wordCount, hashtags }) {
  if (!post) return null
  const url = `${SITE_URL}/post/${post.slug.current}`

  // Person author preferred over Organization for news content (Google E-E-A-T)
  const author = post.author?.name
    ? {
        '@type': 'Person',
        name: post.author.name,
        ...(post.author.bio ? { description: post.author.bio } : {}),
        // Link the byline to the on-site author page…
        ...(post.author.slug?.current
          ? { url: `${SITE_URL}/author/${post.author.slug.current}` }
          : {}),
        // …and to their X profile, so Google can verify the (pseudonymous)
        // author as a consistent, real online entity.
        ...(post.author.xUrl ? { sameAs: [post.author.xUrl] } : {}),
      }
    : { '@type': 'Organization', name: SITE_NAME }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt || post.title,
    image: imageUrl ? [imageUrl] : [`${SITE_URL}/og-image.png`],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-full.png`,
        width: 600,
        height: 200,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: post.category || 'News',
    inLanguage: 'en',
    ...(wordCount ? { wordCount } : {}),
    ...(hashtags?.length
      ? { keywords: hashtags.map(t => t.replace(/^#/, '')).join(', ') }
      : {}),
  }
  return <JsonLd data={data} />
}

// BreadcrumbList — shows breadcrumb path in search results
export function BreadcrumbSchema({ items }) {
  if (!items || items.length === 0) return null
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return <JsonLd data={data} />
}

// Cryptocurrency / FinancialProduct schema for coin detail pages.
// Uses both @type values via array — schema.org supports multi-typing,
// and Google indexes financial entities better with FinancialProduct.
export function CryptocurrencySchema({ coin }) {
  if (!coin) return null
  const md = coin.market_data || {}
  const url = `${SITE_URL}/markets/${coin.id}`

  const data = {
    '@context': 'https://schema.org',
    '@type': ['Product', 'FinancialProduct'],
    name: coin.name,
    alternateName: coin.symbol?.toUpperCase(),
    description:
      (coin.description?.en || `${coin.name} (${coin.symbol?.toUpperCase()}) live price, chart, market cap, and trading volume.`)
        .replace(/<[^>]*>/g, '')
        .slice(0, 500),
    image: coin.image?.large,
    url,
    category: 'Cryptocurrency',
    brand: { '@type': 'Brand', name: coin.name },
    ...(md.current_price?.usd
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: md.current_price.usd,
            url,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }
  return <JsonLd data={data} />
}
