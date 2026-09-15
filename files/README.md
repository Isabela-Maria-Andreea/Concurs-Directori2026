# Platformă Concurs Directori 2026

Platformă **gratuită** de pregătire pentru concursul de directori din România:
- 🔐 Cont real (Supabase Auth), progres salvat în cloud
- 📝 Teste grilă din bibliografia oficială, cu feedback imediat
- 📖 Culegere de studiu: toate grilele cu răspunsul corect și sursa
- 📚 Resurse: legislație și documente, cu sursele oficiale marcate
- 🗺️ Hartă interactivă a județelor, cu posturile vacante de director
- 📅 Calendarul concursului
- 💼 Posturi vacante, filtrabile pe județ

---

## ⚠️ Ce trebuie făcut ACUM (a mai rămas 1 pas)

### Pas 1 — ✅ REZOLVAT: Project URL-ul din `config.js`

Autentificarea era blocată de un URL greșit. Istoricul bugului:

1. Prima dată, URL-ul conținea un **spațiu** (`https://rafphnsj lxipijihefyus.supabase.co`).
   `createClient()` arunca `Invalid URL`, scriptul se oprea, toate butoanele
   rămâneau moarte.
2. După ce s-a scos spațiul, a rămas **un caracter în plus**: project-ref-ul avea
   21 de caractere în loc de 20, iar gazda nu exista în DNS. Formatul trecea de
   validare, deci aplicația nu se plângea la pornire — abia primul login eșua cu
   „Nu s-a putut contacta Supabase".

Valoarea corectă e deja pusă în `config.js`:
`https://rafphnsjlxipjihefyus.supabase.co` (verificată: DNS-ul răspunde, cheia
publică e validă, providerul de email e activ).

Aplicația verifică acum și lungimea project-ref-ului, deci o greșeală de acest
tip e semnalată la încărcarea paginii, nu la primul login.

### Pas 2 — rulează migrarea bazei de date

În **Supabase → SQL Editor**:

| Situație | Rulează |
|---|---|
| Ai deja rulat vechiul `schema.sql` | `migration.sql` |
| Bază de date nouă, de la zero | `schema.sql` |
| Vrei date de test pentru toate taburile | apoi `seed.sql` |

`migration.sql` adaugă tabelul `resources` (pagina „Resurse") și repară trei
lucruri care împiedicau salvarea progresului:

1. **Lipsea `UNIQUE(user_id, question_id)`** — `upsert` nu avea pe ce să facă
   conflict, deci insera un rând nou la fiecare click. Un utilizator care
   răspundea de 3 ori la aceeași întrebare genera 3 rânduri.
2. **Lipsea politica RLS de `UPDATE`** — schema veche avea doar `SELECT` și
   `INSERT`. Un `upsert` care nimerea un rând existent era respins cu
   *"new row violates row-level security policy"*.
3. **Coloana se numea `timestamp`** (cuvânt rezervat în SQL) → redenumită
   `answered_at`.

---

## Setup complet (bază de date nouă)

1. Creează un proiect pe https://supabase.com/ (alege regiune EU).
2. **SQL Editor** → rulează `schema.sql`, apoi `seed.sql`.
3. **Settings → API** → copiază `Project URL` și cheia publică în `config.js`.
4. **Authentication → Providers → Email**: dacă vrei ca utilizatorii să intre
   imediat după înregistrare, dezactivează *"Confirm email"*. Dacă îl lași
   activ, aplicația afișează corect mesajul „verifică emailul”.
5. **Authentication → URL Configuration**: adaugă `http://localhost:5500` la
   *Redirect URLs*, altfel linkul de confirmare din email nu te aduce înapoi.
6. Deschide `index.html` cu **Live Server** (VS Code). Nu-l deschide direct ca
   `file://` — Supabase Auth are nevoie de `http://`.

---

## Structura fișierelor

```
├── index.html       # Interfață: auth + 6 taburi
├── config.js        # URL + cheie Supabase   ← singurul fișier de editat
├── app.js           # Logica aplicației
├── ro-map.js        # Harta județelor (generată, nu edita manual)
├── schema.sql       # Structura BD (pentru o bază nouă)
├── migration.sql    # Reparații pentru o bază deja creată
├── seed.sql         # Date de TEST (nu oficiale!)
├── smoke-test.js    # Test automat opțional
└── README.md
```

---

## Paginile platformei

| Tab | Ce face | Sursa datelor |
|---|---|---|
| 📝 **Teste** | Test grilă: răspunzi, primești feedback imediat, scorul și răspunsurile se salvează în contul tău și se sincronizează între dispozitive. | `questions` + `exam_progress` |
| 📖 **Grile & răspunsuri** | Culegere de studiu: toate întrebările cu varianta corectă și sursa vizibile de la început. Filtre pe categorie și căutare în text. Nu calculează scor și nu salvează nimic. | `questions` |
| 📚 **Resurse** | Bibliografie și documente, grupate pe categorii. Fiecare resursă e marcată **oficial** (link către Monitorul Oficial / edu.ro) sau **neoficial**. | `resources` |
| 🗺️ **Transparență** | Harta interactivă a României. Culoarea fiecărui județ arată câte posturi vacante sunt publicate; click pe județ → lista școlilor și a posturilor din el. | `vacant_positions` |
| 📅 **Calendar** | Evenimentele concursului, cronologic; cele trecute apar estompate. | `calendar_events` |
| 💼 **Posturi Vacante** | Aceleași posturi ca pe hartă, dar ca listă filtrabilă pe județ și căutare după școală. | `vacant_positions` |

### Despre hartă (`ro-map.js`)

Fișierul e **generat**, nu scris de mână: conturul celor 41 de județe + București
vine din [Natural Earth](https://www.naturalearthdata.com/) (admin-1, 10m,
domeniu public), proiectat echirectangular cu corecție `cos(lat)` și simplificat
Douglas-Peucker. Nu îl edita manual.

Numele județelor din hartă și cele din coloana `county` sunt comparate
**normalizat** — fără diacritice, fără prefixul „Municipiul". Așa că `Timiș`,
`Timis` și `Municipiul București` din baza de date ajung în județul corect de
pe hartă, indiferent cum au fost tastate.

### Administrarea resurselor

Resursele se adaugă din **Supabase → Table Editor → `resources`**, fără să
atingi codul:

| Coloană | Rol |
|---|---|
| `title`, `description` | Ce se afișează pe card |
| `url` | Link. Dacă e gol, cardul se afișează fără link (nu ca link mort) |
| `category` | Grupul sub care apare (ex. „Legislație") |
| `kind` | Eticheta mică: lege, ordin, ghid, model… |
| `official` | `true` → insignă verde „oficial" |
| `sort_order` | Ordinea în cadrul categoriei (mic = sus) |

---

## ⚠️ Despre datele din `seed.sql`

Datele din `seed.sql` sunt **exemple pentru testare**, nu informații oficiale:
datele din calendar sunt inventate, școlile din posturile vacante sunt fictive,
iar întrebările trebuie verificate față de bibliografia oficială.

Fiind o platformă de *transparență*, credibilitatea ei depinde de faptul că
informația afișată e reală. Înlocuiește-le cu date din ordinele de ministru și
de pe site-urile ISJ **înainte** de a publica platforma.

**Singura excepție**: rândurile din `resources` marcate `official = true` sunt
linkuri reale, verificate (Legea 198/2023, Legea 199/2023, Codul muncii, Legea
500/2002, edu.ro, ARACIP). Verifică totuși dacă actele au fost între timp
modificate. Cele două rânduri marcate `official = false` sunt demonstrative.

---

## Test automat (opțional)

Rulează întreaga aplicație într-un DOM simulat, cu un Supabase mock — verifică
autentificarea, salvarea răspunsurilor, sincronizarea progresului, modul de
studiu, resursele, harta județelor și filtrarea pe județe (100 de verificări).

```bash
npm install jsdom
node smoke-test.js
```

---

## Cum se verifică criteriile de acceptanță

| Criteriu | Cum verifici |
|---|---|
| Înregistrare cu email/parolă | Tab „Înregistrare”, completează, trimite |
| Login + dashboard personalizat | Emailul și județul apar sus, cu buton Deconectare |
| Răspunsurile ajung în Supabase | Supabase → Table Editor → `exam_progress` |
| Calendarul se vede cronologic | Tab 📅, evenimentele trecute apar estompate |
| Filtrare pe județ | Tab 💼 → alege „Gorj” din dropdown |
| Progresul se sincronizează | Login în alt browser → scorul e același |
| Grilele cu răspuns se văd | Tab 📖 → varianta corectă e verde, cu sursa dedesubt |
| Resursele se deschid | Tab 📚 → click pe o resursă oficială → se deschide în tab nou |
| Harta reacționează | Tab 🗺️ → click pe județul tău → apar școlile din el |
| Fără erori în consolă | F12 → Console |

---

## Note tehnice

- **Cheia publică din `config.js` poate fi expusă** — asta e normal pentru
  cheile `anon`/`publishable`. Protecția reală vine din politicile RLS din
  `schema.sql`. Nu pune niciodată cheia `service_role` în frontend.
- Textul venit din baza de date este escapat înainte de afișare, ca o întrebare
  care conține `<` sau `"` să nu strice pagina.
- Versiunea bibliotecii Supabase e fixată (`2.58.0`) în `index.html`, ca un
  update automat să nu strice aplicația.
- Filtrarea posturilor se face pe date, nu pe textul din DOM. Varianta veche
  căuta în tot textul cardului, deci filtrul „Gorj” prindea și o școală din alt
  județ care avea „Gorj” în denumire.

---

## Următorii pași (discutate, neimplementate)

1. **Statistici pe timp** — grafic cu evoluția scorului. Necesită folosirea
   coloanei `answered_at` (adăugată deja) și o pagină nouă.
2. **Simulare probă scrisă** — 20 întrebări, cronometru 60 min, prag 7.00.
   Necesită un tabel nou `exam_sessions` (started_at, finished_at, score),
   pentru că simulările sunt încercări separate, nu progres cumulativ.
3. **Export PDF** — cel mai simplu prin `window.print()` și un CSS de print;
   fără biblioteci suplimentare. Util mai ales pentru tabul „Grile & răspunsuri".
4. **Panou de administrare** — import CSV de întrebări și de resurse. Are nevoie
   de o coloană de rol pe utilizator și de politici RLS de `INSERT` pe
   `questions` / `resources`.
5. **Date reale pe hartă** — momentan posturile din `seed.sql` sunt fictive.
   Harta devine cu adevărat utilă abia cu anunțurile reale de pe site-urile ISJ.

---

## Costuri

Supabase (500MB, 50k utilizatori activi/lună) + Netlify/Vercel = **gratuit**.

---

## Troubleshooting

| Problemă | Cauză |
|---|---|
| Mesaj roșu „SUPABASE_URL conține un spațiu” | Curăță `config.js` (vezi Pas 1) |
| Mesaj „project-ref-ul are N caractere, dar Supabase folosește exact 20” | Ai o literă în plus/minus în URL — copiază-l cu copy/paste din dashboard |
| „Invalid login credentials” | Parolă greșită, sau contul nu e confirmat pe email |
| „Nu s-a putut contacta Supabase” | URL greșit sau proiect în pauză (Supabase suspendă proiectele inactive) |
| Răspunsurile nu se salvează | Nu ai rulat `migration.sql` |
| Vezi bannerul galben „mod demo” | Tabelul `questions` e gol → rulează `seed.sql` |
| „Tabelul `resources` nu există încă” | Rulează `migration.sql` (sau `schema.sql`) în SQL Editor |
| Harta e gri peste tot | Nu ai posturi în `vacant_positions` → rulează `seed.sql` |
| Harta nu apare deloc | Lipsește `<script src="ro-map.js">` din `index.html` |
