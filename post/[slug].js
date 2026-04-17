import Head from 'next/head'
import Link from 'next/link'
import { PortableText } from '@portabletext/react'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import { client, urlFor } from '../../lib/sanity'
import { singlePostQuery, allPostsQuery } from '../../lib/queries'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })
}

const ptComponents = {
  block: {
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    normal: ({ children }) => <p>{children}</p>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  marks: {
    link: ({ value, children }) => (
      <a href={value.href} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
}

export default function PostPage({ post }) {
  if (!post) return (
    <>
      <Ticker />
      <Navbar />
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text2)' }}>
        <h2>Article not found</h2>
        <Link href="/" style={{ color: 'var(--accent)', marginTop: 16, display: 'block' }}>← Back to home</Link>
      </div>
      <Footer />
    </>
  )

  return (
    <>
      <Head>
        <title>{post.title} — GM Crypto</title>
        <meta name="description" content={post.excerpt || post.title} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ''} />
        {post.mainImage && (
          <meta property="og:image" content={urlFor(post.mainImage).width(1200).height(630).url()} />
        )}
      </Head>

      <Ticker />
      <Navbar />

      <div className="article-wrap">
        <article className="article-main">
          <div className="article-header">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Link href="/" style={{ fontSize: 12, color: 'var(--text3)' }}>Home</Link>
              <span style={{ color: 'var(--text3)' }}>/</span>
              {post.category && (
                <>
                  <Link href={`/category/${post.category.toLowerCase()}`} style={{ fontSize: 12, color: 'var(--text3)' }}>{post.category}</Link>
                  <span style={{ color: 'var(--text3)' }}>/</span>
                </>
              )}
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Article</span>
            </div>
            {post.category && <span className="category-tag">{post.category}</span>}
            <h1>{post.title}</h1>
            {post.excerpt && <p className="excerpt">{post.excerpt}</p>}
            <div className="article-meta">
              {post.author?.image && (
                <img
                  className="author-avatar"
                  src={urlFor(post.author.image).width(72).height(72).url()}
                  alt={post.author.name}
                />
              )}
              <div>
                {post.author?.name && (
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{post.author.name}</div>
                )}
                <div className="post-meta">{formatDate(post.publishedAt)}</div>
              </div>
            </div>
          </div>

          {post.mainImage && (
            <img
              className="article-cover"
              src={urlFor(post.mainImage).width(800).height(480).url()}
              alt={post.title}
            />
          )}

          <div className="article-body">
            {post.body ? (
              <PortableText value={post.body} components={ptComponents} />
            ) : (
              <p style={{ color: 'var(--text3)' }}>No content yet.</p>
            )}
          </div>

          <div style={{ marginTop: 48, padding: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
            ⚠️ <strong style={{ color: 'var(--text2)' }}>Disclaimer:</strong> This article is for informational purposes only and does not constitute financial advice. Always do your own research before making investment decisions.
          </div>
        </article>

        <Sidebar />
      </div>

      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  try {
    const posts = await client.fetch(allPostsQuery)
    const paths = (posts || []).map(post => ({
      params: { slug: post.slug.current }
    }))
    return { paths, fallback: 'blocking' }
  } catch {
    return { paths: [], fallback: 'blocking' }
  }
}

export async function getStaticProps({ params }) {
  try {
    const post = await client.fetch(singlePostQuery, { slug: params.slug })
    return {
      props: { post: post || null },
      revalidate: 60,
    }
  } catch {
    return { props: { post: null }, revalidate: 60 }
  }
}
