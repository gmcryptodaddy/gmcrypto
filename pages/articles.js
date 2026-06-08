// pages/articles.js
// Archive / index page listing every article on the site, paginated.
//
// SEO purpose: gives Google a single hub of internal links to every article,
// so the crawler doesn't have to rely solely on the sitemap to discover them.
// Each article that isn't currently surfaced on the homepage (i.e., anything
// older than the first scroll) gets a real, click-followable <Link> here.
//
// Architecture:
//   - getServerSideProps (not static) so listings stay current as posts are
//     published, and so ?page=N renders fresh server-side HTML (crawler-friendly).
//   - Sanity GROQ does the pagination via [start...end] — no over-fetching.
//   - Optional ?category= filter, which links from the footer's category list.
//
// Indexing strategy:
//   - Page 1 (no query params): canonical, indexable. The main entry point.
//   - Page 2+, or any with ?category=: canonical points to page 1, robots
//     noindex,follow. Google still follows the links from these pages, which
//     is what we want for discovery, but they don't dilute search results
//     with thin paginated duplicates.

import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'
import { client, urlFor } from '../lib/sanity'
import { articlesArchiveQuery, articlesArchiveCountQuery } from '../lib/queries'

const SITE_URL = 'https://www.gmcrypto.news'
const PER_PAGE = 20

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  } catch {
    return ''
  }
}

export default function ArticlesPage({ posts, total, page, totalPages, category }) {
  const isFiltered = !!category
  const isPaged = page > 1
  const isIndexable = !isFiltered && !isPaged

  const title = isFiltered
    ? `${category} Articles — GM Crypto News`
    : (isPaged ? `All Articles — Page ${page} — GM Crypto News` : 'All Articles — GM Crypto News')
  const description = isFiltered
    ? `All ${category} articles published on GM Crypto News.`
    : 'Browse the full archive of crypto news, analysis, and explainers from GM Crypto News.'
  const canonical = isFiltered || isPaged
    ? `${SITE_URL}/articles`
    : `${SITE_URL}/articles`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        {/* Pages 2+ and filtered views aren't unique enough to index, but we
            DO want Google to follow the links on them. */}
        {!isIndexable && <meta name="robots" content="noindex, follow" />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
      </Head>

      <Ticker />
      <Navbar />

      <div className="articles-archive">
        <header className="articles-archive-header">
          <h1 className="articles-archive-title">
            {isFiltered ? `${category}` : 'All Articles'}
          </h1>
          <p className="articles-archive-subtitle">
            {isFiltered ? (
              <>
                Showing {total} article{total === 1 ? '' : 's'} in {category}.{' '}
                <Link href="/articles" className="articles-archive-clear">
                  Show all
                </Link>
              </>
            ) : (
              <>The full archive — {total} article{total === 1 ? '' : 's'} and counting.</>
            )}
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="articles-archive-empty">No articles to show.</div>
        ) : (
          <ol className="articles-archive-list">
            {posts.map((post, idx) => (
              <li key={post._id} className="articles-archive-row">
                <Link href={`/post/${post.slug.current}`} className="articles-archive-link">
                  {post.mainImage ? (
                    <img
                      src={urlFor(post.mainImage).width(160).height(120).url()}
                      alt={post.title}
                      className="articles-archive-thumb"
                      width={140}
                      height={100}
                      /* First few thumbs are above the fold; load eagerly.
                         Rest get lazy-loaded so the page renders fast. */
                      loading={idx < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  ) : (
                    <div className="articles-archive-thumb articles-archive-thumb-placeholder" />
                  )}
                  <div className="articles-archive-body">
                    {post.category && (
                      <span className="articles-archive-cat">{post.category}</span>
                    )}
                    <h2 className="articles-archive-headline">{post.title}</h2>
                    {post.excerpt && (
                      <p className="articles-archive-excerpt">{post.excerpt}</p>
                    )}
                    <div className="articles-archive-meta">
                      <span>{formatDate(post.publishedAt)}</span>
                      {post.author?.name && (
                        <>
                          <span className="articles-archive-dot">·</span>
                          <span>{post.author.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {totalPages > 1 && (
          <nav className="articles-archive-pagination" aria-label="Pagination">
            {page > 1 ? (
              <Link
                href={buildPageHref(page - 1, category)}
                className="articles-archive-page-btn"
                rel="prev"
              >
                ← Previous
              </Link>
            ) : (
              <span className="articles-archive-page-btn articles-archive-page-btn-disabled">
                ← Previous
              </span>
            )}

            <span className="articles-archive-page-info">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildPageHref(page + 1, category)}
                className="articles-archive-page-btn"
                rel="next"
              >
                Next →
              </Link>
            ) : (
              <span className="articles-archive-page-btn articles-archive-page-btn-disabled">
                Next →
              </span>
            )}
          </nav>
        )}

        {/* Numbered page links so crawlers can reach every page in one hop.
            Without these, Google would have to follow Next 1→2→3→... sequentially. */}
        {totalPages > 1 && (
          <div className="articles-archive-page-list" aria-label="All pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <Link
                key={n}
                href={buildPageHref(n, category)}
                className={`articles-archive-page-num ${n === page ? 'articles-archive-page-num-active' : ''}`}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}

function buildPageHref(pageNum, category) {
  const params = new URLSearchParams()
  if (pageNum > 1) params.set('page', String(pageNum))
  if (category) params.set('category', category)
  const qs = params.toString()
  return qs ? `/articles?${qs}` : '/articles'
}

export async function getServerSideProps({ query, res }) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const category = typeof query.category === 'string' && query.category.trim()
    ? query.category.trim()
    : null

  const start = (page - 1) * PER_PAGE
  const end = start + PER_PAGE

  try {
    const [posts, total] = await Promise.all([
      client.fetch(articlesArchiveQuery, { start, end, category }),
      client.fetch(articlesArchiveCountQuery, { category }),
    ])

    const totalCount = typeof total === 'number' ? total : 0
    const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))

    // Edge cache: 10 min fresh, 1 hour stale. Light on Sanity, fresh enough.
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=3600'
    )

    return {
      props: {
        posts: posts || [],
        total: totalCount,
        page,
        totalPages,
        category,
      },
    }
  } catch (err) {
    console.error('Articles archive fetch error:', err)
    return {
      props: { posts: [], total: 0, page: 1, totalPages: 1, category },
    }
  }
}
