import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/plugins/structure'
import { visionTool } from '@sanity/vision'
import post from './sanity/post.schema'
import author from './sanity/author.schema'

export default defineConfig({
  name: 'gm-crypto',
  title: 'GM Crypto',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool(),
    visionTool(),
  ],
  schema: {
    types: [post, author],
  },
})
