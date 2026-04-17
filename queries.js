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
