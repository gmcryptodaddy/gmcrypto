import Head from 'next/head'
import Link from 'next/link'
import { PortableText } from '@portabletext/react'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import { client, urlFor } from '../../lib/sanity'
import { singlePostQuery, allPostsQuery } from '../../lib/queries'

const SITE_URL = 'https://gmcrypto.news'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

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
      <Head>
        <title>Article not found — [ gm crypto ]</title>
      </Head>
      <Ticker />
      <Navbar />
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text2)' }}>
        <h2>Article not found</h2>
        <Link href="/" style={{ color: 'var(--text)', marginTop: 16, display: 'block', textDecoration: 'underline', textUnderlineOffset: '3px' }}>← Back to home</Link>
      </div>
      <Footer />
    </>
  )

  const ogImage = post.mainImage
    ? urlFor(post.mainImage).width(1200).height(630).url()
    : DEFAULT_OG_IMAGE

  const postUrl = `${SITE_URL}/post/${post.slug.current}`
  const description = post.excerpt || `Read ${post.title} on gm crypto.`

  return (
    <>
      <Head>
        <title>{post.title} — [ gm crypto ]</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph — Facebook, LinkedIn, Discord, etc. */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={postUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="gm crypto" />
        {post.publishedAt && (
          <meta property="article:published_time" content={post.publishedAt} />
        )}
        {post.author?.name && (
          <meta property="article:author" content={post.author.name} />
        )}
        {post.category && (
          <meta property="article:section" content={post.category} />
        )}

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@gm_cryptonews" />
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
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 14 }}>{post.author.name}</div>
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
