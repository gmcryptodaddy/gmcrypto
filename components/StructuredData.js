// components/StructuredData.js
// JSON-LD structured data components for SEO.
// Helps Google understand your site → richer search results, knowledge panel
// eligibility, Google News inclusion, breadcrumb display in SERPs.
//
// Usage:
//   <OrganizationSchema />              — on every page (in _app or layout)
//   <WebsiteSchema />                   — on homepage
//   <NewsArticleSchema post={post} />   — on /post/[slug] pages
//   <BreadcrumbSchema items={[...]} /> — on any page with breadcrumb structure

import Head from 'next/head'

const SITE_URL = 'https://www.gmcrypto.news'
const SITE_NAME = 'GM Crypto News'

// Inline JSON-LD as a script tag in <head>
function JsonLd({ data }) {
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

// Organization schema — tells Google about your brand identity.
// Eligible for the "knowledge panel" sidebar on branded searches over time.
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

// WebSite schema — registers your site as a navigable property.
// (If you ever add site-wide search, this enables a search box in Google results.)
export function WebsiteSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-full.png`,
      },
    },
  }
  return <JsonLd data={data} />
}

// NewsArticle schema — eligible for Google News + Top Stories carousel.
// Pass the full Sanity post object plus a urlFor() helper for the image.
export function NewsArticleSchema({ post, imageUrl }) {
  if (!post) return null
  const url = `${SITE_URL}/post/${post.slug.current}`
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt || post.title,
    image: imageUrl ? [imageUrl] : [`${SITE_URL}/og-image.png`],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: post.author?.name
      ? { '@type': 'Person', name: post.author.name }
      : { '@type': 'Organization', name: SITE_NAME },
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
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: post.category || 'News',
    inLanguage: 'en',
  }
  return <JsonLd data={data} />
}

// BreadcrumbList — shows breadcrumb path in Google search results.
// items is an array of { name, url } in order.
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
