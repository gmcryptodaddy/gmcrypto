import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { client, urlFor } from '../lib/sanity'
import { allPostsQuery, featuredPostsQuery } from '../lib/queries'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export default function Home({ featured, posts }) {
  const hero = featured?.[0]
  const heroSidebar = featured?.slice(1, 4) || []
  const gridPosts = posts?.slice(0, 8) || []

  return (
    <>
      <Head>
        <title>GM Crypto — Daily Crypto News & Market Insights</title>
        <meta name="description" content="Your daily dose of crypto news, market analysis, and blockchain insights. No hype. Just signal." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* Open Graph */}
        <meta property="og:title" content="GM Crypto" />
        <meta property="og:description" content="Daily crypto news, market analysis, and blockchain insights." />
        <meta property="og:type" content="website" />
      </Head>

      <Ticker />
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        {/* Featured post */}
        {hero ? (
          <Link href={`/post/${hero.slug.current}`} className="hero-featured">
            {hero.mainImage ? (
              <img
                src={urlFor(hero.mainImage).width(700).height(280).url()}
                alt={hero.title}
              />
            ) : (
              <div className="img-placeholder" style={{ height: 280 }}>NO IMAGE</div>
            )}
            <div className="hero-featured-body">
              {hero.category && <span className="category-tag">{hero.category}</span>}
              <h2>{hero.title}</h2>
              {hero.excerpt && <p>{hero.excerpt}</p>}
              <span className="post-meta">{formatDate(hero.publishedAt)}</span>
            </div>
          </Link>
        ) : (
          <div className="hero-featured" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="img-placeholder" style={{ height: 280 }}>ADD YOUR FIRST ARTICLE IN SANITY</div>
            <div className="hero-featured-body">
              <span className="category-tag">Markets</span>
              <h2>Your first article will appear here</h2>
              <p>Log in to Sanity Studio and publish your first crypto news article to get started.</p>
            </div>
          </div>
        )}

        {/* Sidebar posts */}
        <div className="hero-sidebar">
          <div className="hero-sidebar-label">Latest Stories</div>
          {heroSidebar.length > 0 ? heroSidebar.map(post => (
            <Link key={post._id} href={`/post/${post.slug.current}`} className={`sidebar-post ${!post.mainImage ? 'sidebar-no-img' : ''}`}>
              {post.mainImage && (
                <img
                  src={urlFor(post.mainImage).width(160).height(120).url()}
                  alt={post.title}
                />
              )}
              <div className="sidebar-post-body">
                {post.category && <span className="category-tag">{post.category}</span>}
                <h3>{post.title}</h3>
                <span className="post-meta">{formatDate(post.publishedAt)}</span>
              </div>
            </Link>
          )) : (
            <div style={{ padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
              More articles will appear here as you publish them in Sanity.
            </div>
          )}
        </div>
      </section>

      {/* Main content */}
      <div className="main-grid">
        <main>
          <div className="section-label"><span>▸</span>Latest News</div>
          <div className="posts-grid">
            {gridPosts.length > 0 ? gridPosts.map(post => (
              <Link key={post._id} href={`/post/${post.slug.current}`} className={`post-card ${!post.mainImage ? 'post-card-no-img' : ''}`}>
                {post.mainImage && (
                  <img
                    src={urlFor(post.mainImage).width(400).height(160).url()}
                    alt={post.title}
                  />
                )}
                <div className="post-card-body">
                  {post.category && <span className="category-tag">{post.category}</span>}
                  <h3>{post.title}</h3>
                  {post.excerpt && <p>{post.excerpt.substring(0, 90)}...</p>}
                  <span className="post-meta">{formatDate(post.publishedAt)}</span>
                </div>
              </Link>
            )) : (
              <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                <p style={{ fontSize: 14 }}>No articles published yet.</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                  Go to your Sanity Studio → Create articles → They'll appear here automatically.
                </p>
              </div>
            )}
          </div>
        </main>
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
