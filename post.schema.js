// This file goes in: sanity-studio/schemas/post.js
// (after you create the Sanity Studio project separately)

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
          { title: 'Markets', value: 'Markets' },
          { title: 'Bitcoin', value: 'Bitcoin' },
          { title: 'Ethereum', value: 'Ethereum' },
          { title: 'DeFi', value: 'DeFi' },
          { title: 'NFTs', value: 'NFTs' },
          { title: 'Regulation', value: 'Regulation' },
          { title: 'Layer 2', value: 'Layer 2' },
          { title: 'Web3', value: 'Web3' },
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
