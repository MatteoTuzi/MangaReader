/**
 * Script per estrarre volumi e capitoli da MangaWorld (mangaworld.mx)
 * Esegui con: node scripts/scrape-mangaworld.js <url-manga>
 * Esempio: node scripts/scrape-mangaworld.js https://www.mangaworld.mx/manga/2278/berserk
 *
 * Output: JSON compatibile con pattern chapterId da caricare in AddMangaModal
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const argv = process.argv.slice(2)
const limitIdx = argv.indexOf('--limit')
const LIMIT_VOLUMES = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) || 3 : null
const REVERSE = argv.includes('--reverse')
const MANGA_URL = (argv.find((a) => !a.startsWith('--') && a.startsWith('http')) || argv[0]) || 'https://www.mangaworld.mx/manga/2278/berserk'
const BASE = 'https://www.mangaworld.mx'
const CDN_BASE = 'https://cdn.mangaworld.mx/chapters'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.text()
}

/** Estrae mangaId e slug dall'URL (es. /manga/2278/berserk) */
function parseMangaUrl(url) {
  const m = url.match(/mangaworld\.mx\/manga\/(\d+)\/([^/?]+)/)
  return m ? { mangaId: m[1], slug: m[2] } : null
}

/** Parsing HTML: Volume N (solo sezione principale con volume-collapse) e link /read/{chapterId} */
function parseMangaPage(html) {
  const chapterListStart = html.indexOf('id=chapterList')
  const chapterListEnd = html.indexOf('id=site-footer')
  const section = chapterListStart >= 0
    ? html.substring(chapterListStart, chapterListEnd >= 0 ? chapterListEnd : html.length)
    : html
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
      chapters.forEach((c, i) => {
        const idx = i + 1
        c.num = String(idx).padStart(4, '0')
        c.title = `Capitolo ${idx}`
      })
      volumes.push({ number: String(volNum).padStart(2, '0'), chapters })
    }
  }
  return volumes
}

/** Dalla pagina reader estrae l'URL della prima immagine CDN (solo se contiene expectedChapterId) */
function extractCdnImageUrl(html, expectedChapterId) {
  const re = /cdn\.mangaworld\.mx\/chapters\/([^/]+)\/volume-(\d+)-([a-f0-9]+)\/capitolo-(\d+)-([a-f0-9]+)\/(\d+)\.(?:jpg|jpeg|png)/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const chapterId = m[5]
    if (!expectedChapterId || chapterId === expectedChapterId) {
      return {
        mangaSlug: m[1],
        volNum: m[2],
        volumeId: m[3],
        chNum: m[4],
        chapterId: m[5],
        page: m[6]
      }
    }
  }
  return null
}

/** Recupera volumeId per un volume: fetch del primo capitolo e parsing dell'immagine */
async function getVolumeIdForFirstChapter(readerBaseUrl, chapterId) {
  const url = `${readerBaseUrl}/${chapterId}/1`
  const html = await fetchText(url)
  return extractCdnImageUrl(html, chapterId)
}

async function main() {
  console.log('Fetching manga page:', MANGA_URL)
  let html
  if (process.env.USE_LOCAL_HTML) {
    const { readFileSync } = await import('fs')
    const { join, dirname } = await import('path')
    const { fileURLToPath } = await import('url')
    html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../public/manga-fetched-now.html'), 'utf8')
  } else {
    html = await fetchText(MANGA_URL)
  }
  if (process.env.DEBUG_HTML) {
    const { writeFileSync, mkdirSync } = await import('fs')
    const { join, dirname } = await import('path')
    const { fileURLToPath } = await import('url')
    const out = join(dirname(fileURLToPath(import.meta.url)), '../public/manga-debug.html')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, html)
    console.log('Saved debug HTML to', out)
  }

  const parsed = parseMangaUrl(MANGA_URL)
  if (!parsed) {
    console.error('URL non valido. Usa: https://www.mangaworld.mx/manga/ID/slug')
    process.exit(1)
  }

  let allVolumes = parseMangaPage(html)
  if (process.env.DEBUG && allVolumes.length > 0) {
    const v1 = allVolumes.find(v => v.number === '01')
    if (v1) console.log('[DEBUG] Before reverse - Volume 01 first ch:', v1.chapters[0]?.chapterId)
  }
  if (REVERSE) allVolumes = allVolumes.reverse()
  const volumes = LIMIT_VOLUMES ? allVolumes.slice(0, LIMIT_VOLUMES) : allVolumes
  console.log(`Trovati ${allVolumes.length} volumi${LIMIT_VOLUMES ? ` (elaboro primi ${volumes.length})` : ''}${REVERSE ? ' [ordine cronologico]' : ''}`)

  if (volumes.length === 0) {
    console.error('Nessun volume trovato. La struttura della pagina potrebbe essere cambiata.')
    process.exit(1)
  }

  // Titolo dal <title> o slug
  const titleMatch = html.match(/<title>([^<]+)</)
  const mangaTitle = titleMatch ? titleMatch[1].replace(/\s*[-|]\s*MangaWorld.*$/i, '').trim() : parsed.slug

  const readerBase = MANGA_URL.replace(/\/?$/, '') + '/read'

  let mangaSlug = null
  const volumeIdCache = new Map()

  if (process.env.DEBUG && volumes[0]) {
    console.log('[DEBUG] volumes[0].number=', volumes[0].number, 'chapters[0].chapterId=', volumes[0].chapters[0]?.chapterId)
  }
  for (let i = 0; i < volumes.length; i++) {
    const vol = volumes[i]
    const firstChapter = vol.chapters[0]
    if (!firstChapter) continue

    process.stdout.write(`  Volume ${vol.number}: fetch reader per chapterId ${firstChapter.chapterId}... `)
    try {
      const info = await getVolumeIdForFirstChapter(readerBase, firstChapter.chapterId)
      if (info) {
        mangaSlug = mangaSlug || info.mangaSlug
        volumeIdCache.set(vol.number, info.volumeId)
        console.log(`volumeId=${info.volumeId}`)
      } else {
        console.log('(CDN URL non trovato)')
      }
    } catch (e) {
      console.log('errore:', e.message)
    }
    await delay(800)
  }

  if (!mangaSlug) {
    console.error('Impossibile estrarre mangaSlug. Prova a controllare manualmente una pagina reader.')
    process.exit(1)
  }

  const output = {
    mangaTitle,
    baseUrl: CDN_BASE,
    urlPattern: 'chapterId',
    mangaSlug,
    pageFormat: 'raw',
    volumes: volumes.map((v) => ({
      number: v.number,
      volumeId: volumeIdCache.get(v.number) || '',
      chapters: v.chapters.map((c) => ({
        num: c.num,
        title: c.title,
        chapterId: c.chapterId
      }))
    }))
  }

  const outPath = join(__dirname, '../public/mangaworld-scraped.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\nSalvato: ${outPath}`)
  console.log('Carica questo file in AddMangaModal (Aggiungi manga > Carica .json)')
  console.log('\nUso: node scripts/scrape-mangaworld.js <url> [--limit N] [--reverse]')
  console.log('  url: https://www.mangaworld.mx/manga/2278/berserk')
  console.log('  --limit N: elabora solo i primi N volumi (per test veloce)')
  console.log('  --reverse: ordina Volume 1, 2, 3... invece di 44, 43, 42...')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
