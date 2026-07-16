export default {
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Display Name',
      description: 'Shown on articles, e.g. "GM Crypto Daddy". Can be a pseudonym.',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      description: 'Used for the author page URL, e.g. /author/gm-crypto-daddy. Click "Generate" after typing the name.',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: Rule => Rule.required()
    },
    {
      name: 'image',
      title: 'Profile Image',
      type: 'image',
      options: { hotspot: true }
    },
    {
      name: 'bio',
      title: 'Bio',
      description: 'A short bio shown on the byline area and the author page. 1-3 sentences.',
      type: 'text',
      rows: 3
    },
    {
      name: 'xHandle',
      title: 'X (Twitter) Handle',
      description: 'Username WITHOUT the @ — e.g. gmcryptodaddy. Displayed next to the name as @gmcryptodaddy.',
      type: 'string',
    },
    {
      name: 'xUrl',
      title: 'X (Twitter) Profile URL',
      description: 'Full URL, e.g. https://x.com/gmcryptodaddy. Used to verify the author as a real online entity (helps SEO / E-E-A-T).',
      type: 'url',
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'xHandle',
      media: 'image'
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `@${subtitle}` : '',
        media
      }
    }
  }
}
