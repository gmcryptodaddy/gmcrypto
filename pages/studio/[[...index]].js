/**
 * Sanity Studio embedded at /studio
 * Visit: https://your-vercel-url.vercel.app/studio
 */

import { NextStudio } from 'next-sanity/studio'
import config from '../../sanity.config'

export default function StudioPage() {
  return <NextStudio config={config} />
}

// Disable static generation for studio
export const getServerSideProps = () => ({ props: {} })
