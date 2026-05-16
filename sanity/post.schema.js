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
      // Editorial control over the "Most Read" sidebar widget.
      // Strategy: all posts from last 7 days are shown, but featured ones
      // float to the top. So you mark 1-5 as "Most Read" and they appear
      // first; the rest of the slots fill in with the most recent posts.
      name: 'mostRead',
      title: 'Feature in "Most Read" widget',
      description: 'Pin this article to the top of the homepage Most Read widget. Featured articles still need to be published within the last 7 days to appear.',
      type: 'boolean',
      initialValue: false,
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
