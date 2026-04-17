import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { client, urlFor } from '../lib/sanity'
import { allPostsQuery, featuredPostsQuery } from '../lib/queries'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago'
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago'
  return Math.floor(diff / 86400) + ' days ago'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const FILTERS = ['All', 'Markets', 'Bitcoin', 'Ethereum', 'DeFi', 'NFTs', 'Regulation', 'Learn', 'Opinion']

export default function Home({ featured, posts }) {
  const hero = featured?.[0]
  const latestPosts = posts?.slice(0, 10) || []
  const gridPosts = posts?.slice(1, 7) || []

  return (
    <>
      <Head>
        <title>GM Crypto — Daily Crypto News & Market Insights</title>
        <meta name="description" content="Your daily dose of crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="GM Crypto" />
        <meta property="og:description" content="Daily crypto news, market analysis, and blockchain insights." />
        <meta property="og:type" content="website" />
      </Head>

      <Ticker />
      <Navbar />

      {/* ── Main 3-column layout ── */}
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
                  {post.category && <span className="feed-category">{post.category}</span>}
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

        {/* CENTER — Featured Article + Filter + Grid */}
        <main className="center-col">

          {/* Category filter pills */}
          <div className="filter-bar">
            {FILTERS.map((f, i) => (
              <Link key={f} href={f === 'All' ? '/' : `/category/${f.toLowerCase()}`}>
                <span className={`filter-pill ${i === 0 ? 'filter-pill-active' : ''}`}>{f}</span>
              </Link>
            ))}
          </div>

          {/* Hero featured article */}
          {hero ? (
            <Link href={`/post/${hero.slug.current}`} className="center-hero">
              {hero.mainImage ? (
                <img
                  src={urlFor(hero.mainImage).width(800).height(420).url()}
                  alt={hero.title}
                  className="center-hero-img"
                />
              ) : (
                <div className="center-hero-img img-placeholder">NO IMAGE</div>
              )}
              <div className="center-hero-body">
                <div className="center-hero-meta">
                  {hero.author?.name && (
                    <span className="center-hero-author">{hero.author.name}</span>
                  )}
                  {hero.category && <span className="feed-category">{hero.category}</span>}
                </div>
                <h1 className="center-hero-title">{hero.title}</h1>
                {hero.excerpt && <p className="center-hero-excerpt">{hero.excerpt}</p>}
              </div>
            </Link>
          ) : (
            <div className="center-hero" style={{ border: '1px solid var(--border)', padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text2)' }}>Publish your first article in Sanity Studio</p>
            </div>
          )}

          {/* Secondary posts grid */}
          {gridPosts.length > 0 && (
            <div className="secondary-grid">
              {gridPosts.map(post => (
                <Link key={post._id} href={`/post/${post.slug.current}`} className="secondary-card">
                  {post.mainImage && (
                    <img
                      src={urlFor(post.mainImage).width(300).height(140).url()}
                      alt={post.title}
                      className="secondary-card-img"
                    />
                  )}
                  <div className="secondary-card-body">
                    {post.category && <span className="feed-category">{post.category}</span>}
                    <h3 className="secondary-card-title">{post.title}</h3>
                    <span className="feed-time">{timeAgo(post.publishedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        {/* RIGHT — Markets + Widgets */}
        <Sidebar />
      </div>

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  try {
    const [featured, posts] = await Promise.all([
      client.fetch(featuredPostsQuery),
      client.fetch(allPostsQuery),
    ])
    return {
      props: { featured: featured || [], posts: posts || [] },
      revalidate: 60,
    }
  } catch (error) {
    return {
      props: { featured: [], posts: [] },
      revalidate: 60,
    }
  }
}
