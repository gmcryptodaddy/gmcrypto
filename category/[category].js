import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import { client, urlFor } from '../../lib/sanity'

const CATEGORIES = ['markets', 'defi', 'nfts', 'regulation', 'bitcoin', 'ethereum', 'layer-2', 'web3']

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CategoryPage({ posts, category }) {
  const label = category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <>
      <Head>
        <title>{label} News — GM Crypto</title>
        <meta name="description" content={`Latest ${label} news and analysis on GM Crypto.`} />
      </Head>
      <Ticker />
      <Navbar />
      <div className="main-grid" style={{ paddingTop: 40 }}>
        <main>
          <div className="section-label"><span>▸</span>{label}</div>
          <div className="posts-grid">
            {posts.length > 0 ? posts.map(post => (
              <Link key={post._id} href={`/post/${post.slug.current}`} className={`post-card ${!post.mainImage ? 'post-card-no-img' : ''}`}>
                {post.mainImage && (
                  <img src={urlFor(post.mainImage).width(400).height(160).url()} alt={post.title} />
                )}
                <div className="post-card-body">
                  {post.category && <span className="category-tag">{post.category}</span>}
                  <h3>{post.title}</h3>
                  {post.excerpt && <p>{post.excerpt.substring(0, 90)}...</p>}
                  <span className="post-meta">{formatDate(post.publishedAt)}</span>
                </div>
              </Link>
            )) : (
              <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                <p>No articles in {label} yet. Publish some in Sanity Studio!</p>
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

export async function getStaticPaths() {
  return {
    paths: CATEGORIES.map(cat => ({ params: { category: cat } })),
    fallback: 'blocking'
  }
}

export async function getStaticProps({ params }) {
  const { category } = params
  const label = category.replace('-', ' ')
  try {
    const posts = await client.fetch(
      `*[_type == "post" && lower(category) == $cat] | order(publishedAt desc) {
        _id, title, slug, publishedAt, excerpt, category, mainImage
      }`,
      { cat: label }
    )
    return { props: { posts: posts || [], category }, revalidate: 60 }
  } catch {
    return { props: { posts: [], category }, revalidate: 60 }
  }
}
