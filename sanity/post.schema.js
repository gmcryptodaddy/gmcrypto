// sanity-studio/schemas/post.schema.js
export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required()
    },
    {
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: { type: 'author' }
    },
    {
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: { hotspot: true }
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'News', value: 'News' },
          { title: 'Breaking News', value: 'Breaking News' },
          { title: 'Explainer', value: 'Explainer' },
          { title: 'Markets', value: 'Markets' },
          { title: 'Companies', value: 'Companies' },
          { title: 'TradFi', value: 'TradFi' },
          { title: 'Policy', value: 'Policy' },
          { title: 'DeFi', value: 'DeFi' },
          { title: 'Tech', value: 'Tech' },
          { title: 'Web3', value: 'Web3' },
          { title: 'Security', value: 'Security' },
        ]
      }
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime'
    },
    {
      name: 'excerpt',
      title: 'Excerpt (Short Summary)',
      type: 'text',
      rows: 3
    },
    {
      name: 'body',
      title: 'Body (Article Content)',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', type: 'string', title: 'Caption' },
            { name: 'alt', type: 'string', title: 'Alt text' }
          ]
        }
      ]
    },
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage'
    },
    prepare({ title, author, media }) {
      return {
        title,
        subtitle: author ? `by ${author}` : '',
        media
      }
    }
  }
}
