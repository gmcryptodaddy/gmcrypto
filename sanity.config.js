import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { visionTool } from '@sanity/vision'
import post from './sanity/post.schema'
import author from './sanity/author.schema'

export default defineConfig({
  name: 'gm-crypto',
  title: 'GM Crypto',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  basePath: '/studio',
  plugins: [
    deskTool(),
    visionTool(),
  ],
  schema: {
    types: [post, author],
  },
})
