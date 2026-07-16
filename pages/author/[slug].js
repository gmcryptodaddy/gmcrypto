// pages/author/[slug].js
// Author profile page: avatar, display name, @handle (links to X), bio,
// and a list of every article by this author.
//
// SEO purpose:
//   - Person structured data with sameAs -> X profile. This is the key
//     E-E-A-T signal: it tells Google the (pseudonymous) author is a real,
//     consistent online entity, verifiable via their X presence.
//   - Adds a hub of internal links (every article by the author), which
//     helps crawl discovery — the same benefit as the /articles archive.

import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { JsonLd } from '../../components/StructuredData'
import { client, urlFor } from '../../lib/sanity'
import { authorBySlugQuery, allAuthorSlugsQuery } from '../../lib/queries'

const SITE_URL = 'https://www.gmcrypto.news'
const SITE_NAME = 'GM Crypto News'

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

export default function AuthorPage({ author }) {
  if (!author) return null

  const authorUrl = `${SITE_URL}/author/${author.slug.current}`
  const avatarUrl = author.image
    ? urlFor(author.image).width(240).height(240).url()
    : null
  const posts = author.posts || []

  // Person schema — sameAs links the author to their X profile so Google can
  // treat the pseudonym as a verified, consistent entity.
  const personData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: authorUrl,
    ...(author.bio ? { description: author.bio } : {}),
    ...(avatarUrl ? { image: avatarUrl } : {}),
    ...(author.xUrl ? { sameAs: [author.xUrl] } : {}),
  }

  const title = `${author.name} — Author at ${SITE_NAME}`
  const description = author.bio
    ? author.bio
    : `Articles written by ${author.name} at ${SITE_NAME}.`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={authorUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={authorUrl} />
        {avatarUrl && <meta property="og:image" content={avatarUrl} />}
      </Head>
      <JsonLd data={personData} />

      <Ticker />
      <Navbar />

      <div className="author-page">
        <header className="author-hero">
          {avatarUrl ? (
            <img
              className="author-hero-avatar"
              src={avatarUrl}
              alt={author.name}
              width={96}
              height={96}
              decoding="async"
            />
          ) : (
            <div className="author-hero-avatar author-hero-avatar-placeholder" />
          )}

          <div className="author-hero-info">
            <h1 className="author-hero-name">{author.name}</h1>

            {author.xHandle && (
              <a
                className="author-hero-handle"
                href={author.xUrl || `https://x.com/${author.xHandle}`}
                target="_blank"
                rel="me noopener noreferrer"
              >
                @{author.xHandle}
              </a>
            )}

            {author.bio && <p className="author-hero-bio">{author.bio}</p>}
          </div>
        </header>

        <section className="author-articles">
          <h2 className="author-articles-title">
            {posts.length > 0
              ? `Articles by ${author.name}`
              : `No articles yet`}
          </h2>

          {posts.length > 0 && (
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
                      <h3 className="articles-archive-headline">{post.title}</h3>
                      {post.excerpt && (
                        <p className="articles-archive-excerpt">{post.excerpt}</p>
                      )}
                      <div className="articles-archive-meta">
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <Footer />
    </>
  )
}

export async function getStaticPaths() {
  let slugs = []
  try {
    const result = await client.fetch(allAuthorSlugsQuery)
    slugs = (result || []).map(a => a.slug).filter(Boolean)
  } catch (err) {
    console.error('Author paths error:', err)
  }
  return {
    paths: slugs.map(slug => ({ params: { slug } })),
    // New authors added in Sanity get built on first visit.
    fallback: 'blocking',
  }
}

export async function getStaticProps({ params }) {
  try {
    const author = await client.fetch(authorBySlugQuery, { slug: params.slug })
    if (!author) {
      return { notFound: true, revalidate: 60 }
    }
    return {
      props: { author },
      revalidate: 300, // 5 min — new articles by this author appear reasonably fast
    }
  } catch (err) {
    console.error('Author page error:', err)
    return { notFound: true, revalidate: 60 }
  }
}
