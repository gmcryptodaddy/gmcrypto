// lib/readingTime.js
// Calculate word count + reading time from a Sanity PortableText body.
// Used in: NewsArticle JSON-LD wordCount, "X min read" badge on articles.

const WORDS_PER_MINUTE = 220

// Recursively extract plain text from PortableText blocks
function extractText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return ''
  let text = ''
  for (const block of blocks) {
    if (block._type === 'block' && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (child.text) text += child.text + ' '
      }
    }
  }
  return text
}

export function getWordCount(body) {
  const text = extractText(body)
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export function getReadingTime(body) {
  const words = getWordCount(body)
  if (words === 0) return 1
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
