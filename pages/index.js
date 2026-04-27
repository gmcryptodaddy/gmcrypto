import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import NewsFeed from '../components/NewsFeed'
import { client, urlFor } from '../lib/sanity'
import { allPostsQuery } from '../lib/queries'
import { generateHashtags } from '../lib/hashtags'
import { getTelegramFeed } from '../lib/telegram'

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

export default function Home({ posts, telegramPosts }) {
  const allPosts = posts || []
  const [activeFilter, setActiveFilter] = useState('All')
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE)
  const scrollRef = useRef(null)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE)
  }, [activeFilter])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      setCanScrollLeft(el.scrollLeft > 5)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5)
    }
    handleScroll()
    el.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

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

  const heroPost = visiblePosts[0] || null
  const restPosts = visiblePosts.slice(1)

  return (
    <>
      <Head>
        <title>GM Crypto News</title>
        <meta name="description" content="Your daily dose of crypto news, market analysis, and blockchain insights. No hype. Just signal." />

        <meta property="og:title" content="GM Crypto News" />
        <meta property="og:description" content="Daily crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta property="og:image" content="https://www.gmcrypto.news/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://www.gmcrypto.news" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GM Crypto News" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GM Crypto News" />
        <meta name="twitter:description" content="Daily crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta name="twitter:image" content="https://www.gmcrypto.news/og-image.png" />
        <meta name="twitter:site" content="@gm_cryptonews" />
      </Head>

      <Ticker />
      <Navbar />

      <div className="home-layout">
        {/* LEFT: Latest news */}
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

        {/* CENTER: Main feed */}
        <main className="center-col">
          {/* News wire from Telegram — above filters */}
          <NewsFeed posts={telegramPosts} />

          {/* Desktop filter pills */}
          <div className="filter-bar">
            <button
              className="filter-arrow"
              onClick={() => scrollFilters('left')}
              aria-label="Scroll filters left"
              data-hidden={!canScrollLeft}
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
              data-hidden={!canScrollRight}
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Mobile dropdown filter */}
          <div className="filter-bar-mobile">
            <label className="filter-dropdown-label">Category</label>
            <div className="filter-dropdown-wrap">
              <select
                className="filter-dropdown"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                {FILTERS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <svg className="filter-dropdown-caret" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {visiblePosts.length > 0 ? (
            <>
              {/* DESKTOP article list */}
              <div className="article-list">
                {visiblePosts.map(post => {
                  const hashtags = generateHashtags(post.title, post.category, 3)
                  return (
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

                      {hashtags.length > 0 && (
                        <div className="article-item-hashtags">
                          {hashtags.map(tag => (
                            <span key={tag} className="article-hashtag">{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="article-item-footer">
                        <Link href={`/post/${post.slug.current}`} className="article-read-btn">
                          Read
                        </Link>
                        <span className="article-item-time">{timeAgo(post.publishedAt)}</span>
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* MOBILE article list: hero + compact rows */}
              <div className="article-list-mobile">
                {heroPost && (() => {
                  const heroHashtags = generateHashtags(heroPost.title, heroPost.category, 3)
                  return (
                    <article className="mobile-hero-article">
                      <Link href={`/post/${heroPost.slug.current}`}>
                        {heroPost.mainImage ? (
                          <img
                            src={urlFor(heroPost.mainImage).width(800).height(450).url()}
                            alt={heroPost.title}
                            className="mobile-hero-img"
                          />
                        ) : (
                          <div className="mobile-hero-img img-placeholder">[ no image ]</div>
                        )}
                      </Link>
                      <div className="mobile-hero-body">
                        <div className="mobile-hero-meta">
                          {heroPost.category && (
                            <span className="mobile-hero-cat">{heroPost.category}</span>
                          )}
                          <span className="mobile-hero-time">{timeAgo(heroPost.publishedAt)}</span>
                        </div>
                        <Link href={`/post/${heroPost.slug.current}`}>
                          <h2 className="mobile-hero-title">{heroPost.title}</h2>
                        </Link>
                        {heroPost.excerpt && (
                          <p className="mobile-hero-excerpt">{heroPost.excerpt}</p>
                        )}
                        {heroHashtags.length > 0 && (
                          <div className="mobile-hero-hashtags">
                            {heroHashtags.map(tag => (
                              <span key={tag} className="article-hashtag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })()}

                {restPosts.length > 0 && (
                  <div className="mobile-article-list">
                    {restPosts.map(post => (
                      <Link
                        key={post._id}
                        href={`/post/${post.slug.current}`}
                        className="mobile-article-row"
                      >
                        {post.mainImage ? (
                          <img
                            src={urlFor(post.mainImage).width(240).height(240).url()}
                            alt={post.title}
                            className="mobile-article-thumb"
                          />
                        ) : (
                          <div className="mobile-article-thumb img-placeholder">—</div>
                        )}
                        <div className="mobile-article-text">
                          <div className="mobile-article-meta">
                            {post.category && (
                              <span className="mobile-article-cat">{post.category}</span>
                            )}
                          </div>
                          <h3 className="mobile-article-title">{post.title}</h3>
                          <div className="mobile-article-time">{timeAgo(post.publishedAt)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

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
            </>
          ) : (
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
          )}

          {/* Mobile-only sidebar widgets at bottom */}
          <div className="mobile-sidebar-wrap">
            <Sidebar />
          </div>
        </main>

        {/* RIGHT: Sidebar */}
        <aside className="home-sidebar">
          <Sidebar />
        </aside>
      </div>

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  try {
    const [posts, telegramPosts] = await Promise.all([
      client.fetch(allPostsQuery),
      getTelegramFeed(),
    ])
    return {
      props: {
        posts: posts || [],
        telegramPosts: telegramPosts || [],
      },
      revalidate: 300, // 5 minutes
    }
  } catch (error) {
    console.error('Homepage data error:', error)
    return {
      props: { posts: [], telegramPosts: [] },
      revalidate: 60,
    }
  }
}
