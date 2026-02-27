/**
 * Script per generare i dati dei volumi/capitoli dal contenuto della pagina lista-capitoli
 * Esegui con: node scripts/parse-chapters.js
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/lista-capitoli-raw.txt');
const outputPath = path.join(__dirname, '../src/data/chapters.json');

// Se il file raw non esiste, usa i dati embedded
const rawContent = fs.existsSync(inputPath)
  ? fs.readFileSync(inputPath, 'utf-8')
  : null;

// Regex per estrarre Volume e Capitoli
const volumeRegex = /## Volume (\d+)\s*\n+\[Capitolo (\d+) - ([^\]]+)\]\([^)]*\/reader\/(\d+)\)/g;
const chapterLinkRegex = /\[Capitolo (\d+) - ([^\]]+)\]\([^)]*\/reader\/(\d+)\)/g;

function parseChaptersFromText(text) {
  const volumes = [];
  const volumeBlocks = text.split(/## Volume (\d+)/).slice(1);

  for (let i = 0; i < volumeBlocks.length; i += 2) {
    const volNum = parseInt(volumeBlocks[i], 10);
    const block = volumeBlocks[i + 1] || '';
    const chapters = [];
    let match;
    const regex = /\[Capitolo (\d+) - ([^\]]+)\]\([^)]*\/reader\/(\d+)\)/g;
    while ((match = regex.exec(block)) !== null) {
      chapters.push({
        num: String(match[3]).padStart(3, '0'),
        title: match[2].trim()
      });
    }
    if (chapters.length > 0) {
      volumes.push({ number: volNum, chapters });
    }
  }
  return volumes;
}

// Dati di fallback completi (primi 20 volumi come esempio - il resto viene da parsing)
const fallbackData = {
  baseUrl: 'https://onepiecepower.com/manga8/onepiece/volumiSpeciali/volumiColored',
  mangaTitle: 'One Piece - Volumi Colored',
  volumes: []
};

if (rawContent) {
  fallbackData.volumes = parseChaptersFromText(rawContent);
} else {
  // Genera struttura base 1-106 con capitoli numerati
  for (let v = 1; v <= 106; v++) {
    const chapters = [];
    const startCh = v === 1 ? 1 : (v - 1) * 9 + 1;
    const endCh = Math.min(v * 9, 1065);
    for (let c = startCh; c <= endCh; c++) {
      const num = String(c).padStart(3, '0');
      chapters.push({ num, title: `Capitolo ${c}` });
    }
    if (chapters.length > 0) {
      fallbackData.volumes.push({ number: v, chapters });
    }
  }
}

// Scrivi output
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(outputPath, JSON.stringify(fallbackData, null, 2), 'utf-8');
console.log(`Generato ${outputPath} con ${fallbackData.volumes.length} volumi`);
