/**
 * Sanity Studio embedded at /studio
 * Visit: https://your-vercel-url.vercel.app/studio
 */

import { NextStudio } from 'next-sanity/studio'
import config from '../../sanity.config'

export const dynamic = 'force-static'

export default function StudioPage() {
  return <NextStudio config={config} />
}
