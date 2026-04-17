import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Sidebar from '../components/Sidebar'
import { client, urlFor } from '../lib/sanity'
import { allPostsQuery, featuredPostsQuery } from '../lib/queries'

function timeAgo(dateStr) {
  if (!dateStr) return ''
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

const FILTERS = ['All', 'Markets', 'Bitcoin', 'Ethereum', 'DeFi', 'NFTs', 'Regulation', 'Learn', 'Opinion']

export default function Home({ posts }) {
  const allPosts = posts || []
  const latestPosts = allPosts.slice(0, 15)

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
        {/* LEFT — Latest News Feed */}
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

        {/* CENTER — Filter + All articles list */}
        <main className="center-col">
          <div className="filter-bar">
            {FILTERS.map((f, i) => (
              <Link key={f} href={f === 'All' ? '/' : `/category/${f.toLowerCase()}`}>
                <span className={`filter-pill ${i === 0 ? 'filter-pill-active' : ''}`}>{f}</span>
              </Link>
            ))}
          </div>

          {allPosts.length > 0 ? (
            <div className="article-list">
              {allPosts.map(post => (
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
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', padding: 48, textAlign: 'center', borderRadius: 14 }}>
              <p style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
                [ publish your first article in sanity studio ]
              </p>
            </div>
          )}
        </main>

        {/* RIGHT — Sidebar */}
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
