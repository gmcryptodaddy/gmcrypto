export const allPostsQuery = `
*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  category,
  mainImage,
  author->{name, image}
}
`

export const singlePostQuery = `
*[_type == "post" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  category,
  mainImage,
  body,
  author->{name, image, bio}
}
`

export const featuredPostsQuery = `
*[_type == "post"] | order(publishedAt desc)[0...4] {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  category,
  mainImage
}
`

// Related posts for "More in [category]" section at end of articles.
export const relatedPostsQuery = `
{
  "byCategory": *[_type == "post" && category == $category && _id != $currentId]
    | order(publishedAt desc)[0...4] {
      _id, title, slug, publishedAt, category, mainImage
    },
  "fallback": *[_type == "post" && _id != $currentId]
    | order(publishedAt desc)[0...4] {
      _id, title, slug, publishedAt, category, mainImage
    }
}
`

// Most Read widget — Strategy 2 (hybrid):
//   All posts from last 7 days, ordered with mostRead-flagged posts first,
//   then by publishedAt desc. Capped at 5.
//
// The $sevenDaysAgo param is supplied by the caller as an ISO string.
// Sorting note: GROQ doesn't have a clean "boolean desc" sort, so we coerce
// to a number — defined-and-true becomes 1, anything else becomes 0,
// then sort descending. That puts featured at the top regardless of date.
export const mostReadQuery = `
*[_type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && publishedAt >= $sevenDaysAgo
] | order(select(mostRead == true => 1, 0) desc, publishedAt desc)[0...5] {
  _id,
  title,
  slug,
  publishedAt,
  category,
  mainImage,
  mostRead
}
`

// Articles archive — paginated list for /articles.
// $category is optional; when null, returns all posts.
// $start and $end are the slice boundaries (end is exclusive).
//
// Note: GROQ doesn't support optional filters cleanly; we use `select` to
// always include a "category matches" check, but pass `true` when no filter
// is wanted. That keeps the query a single expression.
export const articlesArchiveQuery = `
*[_type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && select($category != null => category == $category, true)
] | order(publishedAt desc)[$start...$end] {
  _id,
  title,
  slug,
  publishedAt,
  excerpt,
  category,
  mainImage,
  author->{name}
}
`

// Total count for the same filter — used to compute total pages.
// `count()` returns a number directly.
export const articlesArchiveCountQuery = `
count(*[_type == "post"
  && defined(slug.current)
  && defined(publishedAt)
  && select($category != null => category == $category, true)
])
`
