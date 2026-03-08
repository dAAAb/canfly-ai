#!/usr/bin/env node

/**
 * i18n validation script — runs as prebuild to catch:
 * 1) Key count mismatches across en / zh-TW / zh-CN
 * 2) Simplified Chinese characters in zh-TW
 * 3) Traditional Chinese characters in zh-CN
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const i18nDir = resolve(__dirname, '../src/i18n')

// --- helpers ---

function flatKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatKeys(v, path))
    } else {
      keys.push(path)
    }
  }
  return keys.sort()
}

// Simplified-only chars: characters that ONLY appear in simplified Chinese (not shared)
// These are the simplified forms where a distinct traditional form exists
const SIMPLIFIED_ONLY = /[这个们来对说为着时从还让给过问没关开东两长当发现门间头风马书见连远运进选达边际闻页题产创办础语调认议记许论证识试详该误读课么义习乡买亲仅价众优伤体余偿储催亿兑党兰兴农决况准几则刚动务区医协单卖厂历压县叶叹变员听呜响团围图圆圣场坏块垫壮声处备够奖学宁宝实宠审寻导尘尽层属岁岗岛币帅师帐带帮干异弃张强归录彻径复忆总恼悦惊惧惯愿态怀忧虑惩恳恶悬愤庆应废纟钅饣鸟鱼齿龙车贝韦见讠门马戋专执热结织终给绝经缤网绩继续缘练组经细绍约纯线纳纪纹级纸]/
// Traditional-only chars: characters that ONLY appear in traditional Chinese (not shared)
const TRADITIONAL_ONLY = /[這個們來對說為著時從還讓給過問沒關開東兩長當發現門間頭風馬書見連遠運進選達邊際聞頁題產創辦礎語調認議記許論證識試詳該誤讀課麼義習鄉買親僅價衆優傷體餘償儲催億兌黨蘭興農決況準幾則剛動務區醫協單賣廠歷壓縣葉嘆變員聽嗚響團圍圖圓聖場壞塊墊壯聲處備夠獎學寧寶實寵審尋導塵盡層屬歲崗島幣帥師帳帶幫幹異棄張強歸錄徹徑復憶總惱悅驚懼慣願態懷憂慮懲懇惡懸憤慶應廢糹釒飠鳥魚齒龍車貝韋見訁門馬戔專執熱結織終給絕經繽網績繼續緣練組經細紹約純線納紀紋級紙]/

function checkCharMixing(locale, data, forbiddenRegex, description) {
  const errors = []
  function walk(obj, path) {
    for (const [k, v] of Object.entries(obj)) {
      const keyPath = path ? `${path}.${k}` : k
      if (typeof v === 'string') {
        const matches = v.match(new RegExp(forbiddenRegex.source, 'g'))
        if (matches) {
          errors.push(`  ${keyPath}: found ${description} chars: ${[...new Set(matches)].join('')}`)
        }
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        walk(v, keyPath)
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'string') {
            const matches = item.match(new RegExp(forbiddenRegex.source, 'g'))
            if (matches) {
              errors.push(`  ${keyPath}[${i}]: found ${description} chars: ${[...new Set(matches)].join('')}`)
            }
          }
        })
      }
    }
  }
  walk(data, '')
  return errors
}

// --- main ---

let hasErrors = false

const en = JSON.parse(readFileSync(resolve(i18nDir, 'en.json'), 'utf-8'))
const zhTW = JSON.parse(readFileSync(resolve(i18nDir, 'zh-TW.json'), 'utf-8'))
const zhCN = JSON.parse(readFileSync(resolve(i18nDir, 'zh-CN.json'), 'utf-8'))

// 1) Key count check
const enKeys = flatKeys(en)
const twKeys = flatKeys(zhTW)
const cnKeys = flatKeys(zhCN)

if (enKeys.length !== twKeys.length || enKeys.length !== cnKeys.length) {
  console.error(`\x1b[31m[i18n] Key count mismatch: en=${enKeys.length} zh-TW=${twKeys.length} zh-CN=${cnKeys.length}\x1b[0m`)
  hasErrors = true

  // Show missing/extra keys
  const enSet = new Set(enKeys)
  const twSet = new Set(twKeys)
  const cnSet = new Set(cnKeys)

  for (const k of enKeys) {
    if (!twSet.has(k)) console.error(`  Missing in zh-TW: ${k}`)
    if (!cnSet.has(k)) console.error(`  Missing in zh-CN: ${k}`)
  }
  for (const k of twKeys) {
    if (!enSet.has(k)) console.error(`  Extra in zh-TW: ${k}`)
  }
  for (const k of cnKeys) {
    if (!enSet.has(k)) console.error(`  Extra in zh-CN: ${k}`)
  }
} else {
  console.log(`\x1b[32m[i18n] Key counts match: ${enKeys.length} keys across all locales\x1b[0m`)
}

// 2) zh-TW should NOT contain simplified-only characters
const twErrors = checkCharMixing('zh-TW', zhTW, SIMPLIFIED_ONLY, 'simplified')
if (twErrors.length > 0) {
  console.error(`\x1b[31m[i18n] zh-TW contains simplified Chinese characters:\x1b[0m`)
  twErrors.forEach(e => console.error(e))
  hasErrors = true
} else {
  console.log(`\x1b[32m[i18n] zh-TW: no simplified character mixing detected\x1b[0m`)
}

// 3) zh-CN should NOT contain traditional-only characters
const cnErrors = checkCharMixing('zh-CN', zhCN, TRADITIONAL_ONLY, 'traditional')
if (cnErrors.length > 0) {
  console.error(`\x1b[31m[i18n] zh-CN contains traditional Chinese characters:\x1b[0m`)
  cnErrors.forEach(e => console.error(e))
  hasErrors = true
} else {
  console.log(`\x1b[32m[i18n] zh-CN: no traditional character mixing detected\x1b[0m`)
}

if (hasErrors) {
  console.error('\n\x1b[31m[i18n] Validation failed! Fix the issues above before building.\x1b[0m')
  process.exit(1)
} else {
  console.log('\x1b[32m[i18n] All checks passed!\x1b[0m')
}
