# Manga Reader - One Piece Volumi Colored

Applicazione Vue per la lettura dei manga One Piece Colored da [One Piece Power](https://onepiecepower.com).

## Funzionalità

- **Lista Volumi**: Visualizza tutti i volumi organizzati in griglia
- **Lista Capitoli**: Per ogni volume, mostra i capitoli con titolo
- **Reader**: Lettura a pagine con:
  - Caricamento automatico delle pagine (1.jpg, 2.jpg, ...) fino a quando la richiesta restituisce 200
  - Navigazione con frecce ← → o pulsanti
  - Indicatore pagina corrente / totale

## Struttura URL

- **Base**: `https://onepiecepower.com/manga8/one-piece-colored-edition`
- **Immagini**: `{baseUrl}/volume{numeroVolume}/capitolo{numeroCapitolo}/{numeroPagina}.jpg`
- Esempio: `.../volume001/capitolo08/01.jpg`, `.../volume001/capitolo08/02.jpg`, ecc.

## Avvio

```bash
npm install
npm run dev
```

Apri http://localhost:5173

## Build

```bash
npm run build
```

## Note

- I dati dei volumi/capitoli sono in `src/data/chapters.json`
- Le immagini vengono caricate dal sito esterno; assicurati che non ci siano blocchi CORS o AdBlock
- La fine del capitolo viene rilevata quando una richiesta immagine non restituisce 200 (pagina non trovata)
