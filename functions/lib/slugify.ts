/**
 * Auto-generate URL-safe slug from skill name.
 * - English: lowercase + hyphenate
 * - Chinese: convert to pinyin then hyphenate
 * - Mixed: handle both
 */
import pinyin from 'tiny-pinyin'

const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf]/

/**
 * Generate a URL-safe slug from a skill name.
 * Examples:
 *   "AI Cover Image"    → "ai-cover-image"
 *   "算了啦翻譯器"       → "suanlelafanyiqi"
 *   "Emoji 文章改造王"   → "emoji-wenzhanggaizaowang"
 */
export function slugify(name: string): string {
  let text = name

  // If contains CJK characters, convert to pinyin first
  if (CJK_RANGE.test(text)) {
    text = pinyin.convertToPinyin(text, ' ', true)
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // remove non-alphanumeric
    .replace(/[\s]+/g, '-')         // spaces → hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '')          // trim leading/trailing hyphens
}
