/**
 * Auto-generate URL-safe slug from skill name.
 * - English: lowercase + hyphenate
 * - Chinese: convert to pinyin (no spaces between chars)
 * - Mixed: CJK runs → pinyin, non-CJK runs → slugified, joined by hyphens
 */
import pinyin from 'tiny-pinyin'

const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf]/

/**
 * Generate a URL-safe slug from a skill name.
 * Examples:
 *   "AI Cover Image"    → "ai-cover-image"
 *   "算了啦翻譯器"       → "suanlaolafanyiqi"
 *   "規則怪談產生器"      → "guizeguaitanchanshengqi"
 *   "Emoji 文章改造王"   → "emoji-wenzhanggaizaowang"
 */
export function slugify(name: string): string {
  if (!CJK_RANGE.test(name)) {
    // Pure non-CJK: simple slugify
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Mixed or pure CJK: split into CJK and non-CJK segments
  // CJK runs → pinyin (no separator), non-CJK runs → slugified
  const segments: string[] = []
  let currentCJK = ''
  let currentOther = ''

  for (const char of name) {
    if (CJK_RANGE.test(char)) {
      if (currentOther) {
        const slug = currentOther.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        if (slug) segments.push(slug)
        currentOther = ''
      }
      currentCJK += char
    } else {
      if (currentCJK) {
        segments.push(pinyin.convertToPinyin(currentCJK, '', true))
        currentCJK = ''
      }
      currentOther += char
    }
  }

  // Flush remaining
  if (currentCJK) {
    segments.push(pinyin.convertToPinyin(currentCJK, '', true))
  }
  if (currentOther) {
    const slug = currentOther.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (slug) segments.push(slug)
  }

  return segments.join('-')
}
