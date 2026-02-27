/**
 * Scraper MangaWorld eseguibile dal browser (con CORS proxy)
 */

const CORS_PROXIES = [
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
]
const CDN_BASE = 'https://cdn.mangaworld.mx/chapters'

async function fetchWithProxy(url) {
  let lastErr
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { headers: { Accept: 'text/html' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Impossibile caricare la pagina')
}

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

function extractCdnImageUrl(html, expectedChapterId) {
  const re = /cdn\.mangaworld\.mx\/chapters\/([^/]+)\/volume-(\d+)-([a-f0-9]+)\/capitolo-(\d+)-([a-f0-9]+)\/(\d+)\.(?:jpg|jpeg|png)/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const chapterId = m[5]
    if (!expectedChapterId || chapterId === expectedChapterId) {
      return { mangaSlug: m[1], volumeId: m[3] }
    }
  }
  return null
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export function useMangaWorldScraper() {
  async function scrape(mangaUrl, options = {}) {
    const { limitVolumes = null, reverse = true, onProgress } = options
    const url = mangaUrl.trim().replace(/\/$/, '')
    if (!url.includes('mangaworld.mx/manga/')) {
      throw new Error('URL non valido. Usa: https://www.mangaworld.mx/manga/ID/slug')
    }

    onProgress?.('Caricamento pagina manga...')
    const html = await fetchWithProxy(url)

    const titleMatch = html.match(/<title>([^<]+)</)
    const mangaTitle = titleMatch ? titleMatch[1].replace(/\s*[-|]\s*MangaWorld.*$/i, '').trim() : 'Manga'

    let volumes = parseMangaPage(html)
    if (volumes.length === 0) throw new Error('Nessun volume trovato')
    if (reverse) volumes = volumes.reverse()
    if (limitVolumes) volumes = volumes.slice(0, limitVolumes)

    const readerBase = url + '/read'
    let mangaSlug = null
    const volumeIdCache = new Map()

    for (let i = 0; i < volumes.length; i++) {
      const vol = volumes[i]
      const firstCh = vol.chapters[0]
      if (!firstCh) continue

      onProgress?.(`Volume ${vol.number}/${volumes.length}...`)
      try {
        const readerHtml = await fetchWithProxy(`${readerBase}/${firstCh.chapterId}/1`)
        const info = extractCdnImageUrl(readerHtml, firstCh.chapterId)
        if (info) {
          mangaSlug = mangaSlug || info.mangaSlug
          volumeIdCache.set(vol.number, info.volumeId)
        }
      } catch {
        // skip
      }
      await delay(600)
    }

    if (!mangaSlug) throw new Error('Impossibile estrarre mangaSlug')

    return {
      mangaTitle,
      baseUrl: CDN_BASE,
      urlPattern: 'chapterId',
      mangaSlug,
      pageFormat: 'raw',
      volumes: volumes.map((v) => ({
        number: v.number,
        volumeId: volumeIdCache.get(v.number) || '',
        chapters: v.chapters.map((c) => ({ num: c.num, title: c.title, chapterId: c.chapterId }))
      }))
    }
  }

  return { scrape }
}
