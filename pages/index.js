import { useState, useRef } from 'react'
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

export default function Home({ posts }) {
  const allPosts = posts || []
  const [activeFilter, setActiveFilter] = useState('All')
  const scrollRef = useRef(null)

  const filteredPosts = activeFilter === 'All'
    ? allPosts
    : allPosts.filter(p =>
        p.category &&
        p.category.toLowerCase() === activeFilter.toLowerCase()
      )

  const latestPosts = allPosts.slice(0, 15)

  const scrollFilters = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -200 : 200,
      behavior: 'smooth'
    })
  }

  return (
    <>
      <Head>
        <title>[ gm ] Crypto News</title>
        <meta name="description" content="Your daily dose of crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="[ gm crypto ]" />
        <meta property="og:description" content="Daily crypto news, market analysis, and blockchain insights." />
        <meta property="og:type" content="website" />
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

          {filteredPosts.length > 0 ? (
            <div className="article-list">
              {filteredPosts.map(post => (
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

              {/* Footer inside the scrollable center column */}
              <Footer />
            </div>
          ) : (
            <>
              <div className="filter-empty">
                No articles in "{activeFilter}" yet.
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
