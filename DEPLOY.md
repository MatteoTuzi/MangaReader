# Deploy su GitHub

## 1. Crea il repository su GitHub

1. Vai su [github.com](https://github.com) e accedi
2. Clicca **"+"** → **"New repository"**
3. Nome: `MangaReader` (o quello che preferisci)
4. Scegli **Public**
5. **Non** spuntare "Add a README" (il progetto esiste già)
6. Clicca **"Create repository"**

## 2. Inizializza Git e pusha il codice

Apri il terminale nella cartella del progetto ed esegui:

```bash
cd "c:\Users\super\OneDrive\Desktop\Progetti\MangaReader"

# Inizializza Git
git init

# Aggiungi tutti i file
git add .

# Primo commit
git commit -m "Initial commit: Manga Reader Vue app"

# Collega al repository GitHub (sostituisci USERNAME e REPO con i tuoi)
git remote add origin https://github.com/USERNAME/REPO.git

# Rinomina branch in main (se necessario)
git branch -M main

# Push del codice
git push -u origin main
```

Sostituisci `USERNAME` con il tuo username GitHub e `REPO` con il nome del repository.

---

## 3. (Opzionale) Deploy su GitHub Pages

Per pubblicare l'app online gratuitamente:

1. Dopo il push, vai nel repository su GitHub
2. **Settings** → **Pages**
3. In **Source** scegli **"GitHub Actions"**
4. Il workflow `.github/workflows/deploy.yml` è già configurato: ad ogni push su `main` l'app viene deployata automaticamente

L'app sarà disponibile su: `https://TUO_USERNAME.github.io/MangaReader/`

**Nota:** Se il repository ha un nome diverso da `MangaReader`, modifica `base` in `vite.config.js`.
