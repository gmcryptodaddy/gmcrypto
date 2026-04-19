import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { client, urlFor } from '../lib/sanity'
import { allPostsQuery } from '../lib/queries'

function timeAgo(dateStr) {
  if (!dateStr) return 'recently'
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  const d = Math.floor(diff / 86400)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

const FILTERS = [
  'All', 'News', 'Breaking News', 'Explainer', 'Markets',
  'Companies', 'TradFi', 'Policy', 'DeFi', 'Tech', 'Web3', 'Security'
]

const POSTS_PER_PAGE = 10

export default function Home({ posts }) {
  const allPosts = posts || []
  const [activeFilter, setActiveFilter] = useState('All')
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)
  const scrollRef = useRef(null)

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE)
  }, [activeFilter])

  const filteredPosts = activeFilter === 'All'
    ? allPosts
    : allPosts.filter(p =>
        p.category &&
        p.category.toLowerCase() === activeFilter.toLowerCase()
      )

  const visiblePosts = filteredPosts.slice(0, visibleCount)
  const hasMore = visibleCount < filteredPosts.length

  const latestPosts = allPosts.slice(0, 15)

  const scrollFilters = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -200 : 200,
      behavior: 'smooth'
    })
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + POSTS_PER_PAGE)
  }

  return (
    <>
      <Head>
        <title>[ gm ] Crypto News</title>
        <meta name="description" content="Your daily dose of crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph — Facebook, LinkedIn, Discord, etc. */}
        <meta property="og:title" content="[ gm ] Crypto News" />
        <meta property="og:description" content="Daily crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta property="og:image" content="https://gmcrypto.news/og-image.png" />
        <meta property="og:url" content="https://gmcrypto.news" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="gm crypto" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="[ gm ] Crypto News" />
        <meta name="twitter:description" content="Daily crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta name="twitter:image" content="https://gmcrypto.news/og-image.png" />
        <meta name="twitter:site" content="@gm_cryptonews" />
      </Head>

      <Ticker />
      <Navbar />

      <div className="home-layout">
        <aside className="latest-feed">
          <div className="feed-header">
            <span className="feed-dot" />
            <span className="feed-title">Latest news</span>
          </div>
          <div className="feed-list">
            {latestPosts.length > 0 ? latestPosts.map(post => (
              <Link key={post._id} href={`/post/${post.slug.current}`} className="feed-item">
                <div className="feed-item-meta">
                  <div className="feed-item-tags">
                    {post.category && <span className="feed-category">{post.category}</span>}
                  </div>
                  <span className="feed-time">{timeAgo(post.publishedAt)}</span>
                </div>
                <h3 className="feed-item-title">{post.title}</h3>
              </Link>
            )) : (
              <div className="feed-empty">
                Publish your first article in Sanity Studio — it'll appear here.
              </div>
            )}
          </div>
        </aside>

        <main className="center-col">
          <div className="filter-bar">
            <button
              className="filter-arrow"
              onClick={() => scrollFilters('left')}
              aria-label="Scroll filters left"
            >
              ‹
            </button>
            <div className="filter-scroll-wrap" ref={scrollRef}>
              <div className="filter-scroll-inner">
                {FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`filter-pill ${activeFilter === f ? 'filter-pill-active' : ''}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="filter-arrow"
              onClick={() => scrollFilters('right')}
              aria-label="Scroll filters right"
            >
              ›
            </button>
          </div>

          {visiblePosts.length > 0 ? (
            <div className="article-list">
              {visiblePosts.map(post => (
                <article key={post._id} className="article-item">
                  <Link href={`/post/${post.slug.current}`}>
                    {post.mainImage ? (
                      <img
                        src={urlFor(post.mainImage).width(900).height(500).url()}
                        alt={post.title}
                        className="article-item-img"
                      />
                    ) : (
                      <div className="article-item-img img-placeholder" style={{ height: 360 }}>[ no image ]</div>
                    )}
                  </Link>

                  <div className="article-item-meta">
                    <div className="article-item-author">
                      {post.author?.image && (
                        <img
                          src={urlFor(post.author.image).width(60).height(60).url()}
                          alt={post.author.name}
                          className="article-item-avatar"
                        />
                      )}
                      {post.author?.name && (
                        <span className="article-item-author-name">{post.author.name}</span>
                      )}
                    </div>
                    <div className="article-item-tags">
                      {post.category && <span className="article-item-tag">{post.category}</span>}
                    </div>
                  </div>

                  <Link href={`/post/${post.slug.current}`}>
                    <h2 className="article-item-title">{post.title}</h2>
                  </Link>

                  {post.excerpt && (
                    <p className="article-item-excerpt">{post.excerpt}</p>
                  )}

                  <div className="article-item-footer">
                    <Link href={`/post/${post.slug.current}`} className="article-read-btn">
                      Read
                    </Link>
                    <span className="article-item-time">{timeAgo(post.publishedAt)}</span>
                  </div>
                </article>
              ))}

              {hasMore && (
                <div className="load-more-wrap">
                  <button className="load-more-btn" onClick={handleLoadMore}>
                    Load more
                  </button>
                  <span className="load-more-count">
                    Showing {visiblePosts.length} of {filteredPosts.length}
                  </span>
                </div>
              )}

              <Footer />
            </div>
          ) : (
            <>
              <div className="filter-empty">
                <div className="filter-empty-emoji">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="50" cy="55" rx="32" ry="28" />
                    <circle cx="32" cy="28" r="11" />
                    <circle cx="68" cy="28" r="11" />
                    <circle cx="32" cy="28" r="3" fill="#FF6B00" />
                    <circle cx="68" cy="28" r="3" fill="#FF6B00" />
                    <path d="M 32 62 Q 50 74 68 62" />
                    <circle cx="26" cy="58" r="1.5" fill="#FF6B00" />
                    <circle cx="74" cy="58" r="1.5" fill="#FF6B00" />
                  </svg>
                </div>
                <div className="filter-empty-text">Let us cook</div>
                <div className="filter-empty-sub">
                  No articles in "{activeFilter}" yet — check back soon.
                </div>
              </div>
              <Footer />
            </>
          )}
        </main>

        <Sidebar />
      </div>
    </>
  )
}

export async function getStaticProps() {
  try {
    const posts = await client.fetch(allPostsQuery)
    return {
      props: { posts: posts || [] },
      revalidate: 60,
    }
  } catch (error) {
    return {
      props: { posts: [] },
      revalidate: 60,
    }
  }
}
