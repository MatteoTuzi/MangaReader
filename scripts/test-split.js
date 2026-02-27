import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
let html = readFileSync(join(__dirname, '../public/manga-page-sample.html'), 'utf8')
if (process.argv.includes('--fetch')) {
  const res = await fetch('https://www.mangaworld.mx/manga/2278/berserk', { headers: { 'User-Agent': 'Mozilla/5.0' } })
  html = await res.text()
  writeFileSync(join(__dirname, '../public/manga-fetched-now.html'), html)
  console.log('Fetched fresh HTML')
}

const re = /Volume\s+(\d+)\s*<\/p>\s*<button[^>]*volume-collapse/gi
const parts = html.split(re)
console.log('Parts length:', parts.length)

for (let i = 1; i < Math.min(parts.length, 6); i += 2) {
  const volNum = parts[i]
  const block = parts[i + 1] || ''
  const links = [...block.matchAll(/\/read\/([a-f0-9]+)/gi)]
  const unique = [...new Set(links.map(m => m[1]))]
  console.log(`Volume ${volNum}: ${unique.length} chapters, first: ${unique[0]}`)
}

const vol01Idx = parts.findIndex((p, i) => i % 2 === 1 && p === '01')
if (vol01Idx >= 0) {
  const block = parts[vol01Idx + 1] || ''
  const links = [...block.matchAll(/\/read\/([a-f0-9]+)/gi)]
  const unique = [...new Set(links.map(m => m[1]))]
  console.log('\nVolume 01 first 3 chapterIds:', unique.slice(0, 3))
}

if (process.argv.includes('--debug')) {
  const re2 = /Volume\s+(\d+)\s*<\/p>\s*<button[^>]*volume-collapse/gi
  const allMatches = [...html.matchAll(re2)]
  console.log('\nAll volume-collapse matches:', allMatches.length)
  console.log('Last 5:', allMatches.slice(-5).map(m => ({ vol: m[1], pos: m.index })))
  console.log('parts[87]:', parts[87])
  const links88 = parts[88]?.match(/\/read\/([a-f0-9]+)/g) || []
  console.log('First 3 links in parts[88]:', links88.slice(0, 3))
}

if (process.argv.includes('--scraper-parse')) {
  const chapterListStart = html.indexOf('id=chapterList')
  const chapterListEnd = html.indexOf('id=site-footer')
  const section = chapterListStart >= 0 ? html.substring(chapterListStart, chapterListEnd >= 0 ? chapterListEnd : html.length) : html
  const volumes = []
  const re = /Volume\s+(\d+)\s*<\/p>\s*<button[^>]*volume-collapse/gi
  const parts = section.split(re)
  for (let i = 1; i < parts.length; i += 2) {
    const volNum = parseInt(parts[i], 10)
    const block = parts[i + 1] || ''
    const chapters = []
    const seen = new Set()
    const linkRe = /\/read\/([a-f0-9]+)/gi
    let linkM
    while ((linkM = linkRe.exec(block)) !== null) {
      const chapterId = linkM[1]
      if (seen.has(chapterId)) continue
      seen.add(chapterId)
      chapters.push({ chapterId })
    }
    if (chapters.length > 0) {
      chapters.reverse()
      chapters.forEach((c, idx) => {
        c.num = String(idx + 1).padStart(4, '0')
        c.title = `Capitolo ${idx + 1}`
      })
      volumes.push({ number: String(volNum).padStart(2, '0'), chapters })
    }
  }
  const vol01 = volumes.find(v => v.number === '01')
  console.log('\n[SCRAPER PARSE] Volume 01 first ch:', vol01?.chapters[0]?.chapterId)
}
