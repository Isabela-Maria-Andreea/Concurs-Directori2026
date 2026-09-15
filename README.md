# Concurs Directori 2026

**Platformă gratuită de pregătire și transparență pentru concursul național de ocupare a funcțiilor de director și director adjunct din învățământul preuniversitar din România — sesiunea august–decembrie 2026.**

![Vanilla JS](https://img.shields.io/badge/frontend-Vanilla%20JS-f7df1e)
![Supabase](https://img.shields.io/badge/backend-Supabase-3ecf8e)
![Tests](https://img.shields.io/badge/teste-125%20passed-brightgreen)
![Cost](https://img.shields.io/badge/cost-0%20lei-blue)

---

## Cuprins

- [Despre proiect](#despre-proiect)
- [Funcționalități](#funcționalități)
- [Conținut și surse](#conținut-și-surse)
- [Arhitectură](#arhitectură)
- [Instalare](#instalare)
- [Baza de date](#baza-de-date)
- [Testare](#testare)
- [Securitate](#securitate)
- [Limitări cunoscute](#limitări-cunoscute)
- [Direcții de dezvoltare](#direcții-de-dezvoltare)
- [Depanare](#depanare)
- [Precizări](#precizări)

---

## Despre proiect

Candidații la funcția de director au de parcurs o bibliografie amplă, iar informațiile despre posturile vacante sunt împrăștiate în zeci de PDF-uri publicate separat de fiecare inspectorat școlar, în formate diferite.

Platforma răspunde ambelor probleme:

1. **Pregătire** — grile construite strict pe bibliografia oficială, fiecare cu sursa exactă (act, capitol, articol) și cu explicația răspunsului corect.
2. **Transparență** — o hartă a României cu posturile vacante extrase din documentele publicate de inspectorate.

---

## Funcționalități

| Modul | Descriere |
|---|---|
| 🔐 **Cont personal** | Autentificare cu email și parolă (Supabase Auth). Progresul se salvează în cloud și se sincronizează între dispozitive. |
| 📝 **Teste** | Teste în structura probei scrise: câte 20 de itemi, prag de promovare nota 7. Fiecare test conține întrebări din toate capitolele. La final: nota, verdictul (promovat / nepromovat), analiza pe capitole și lista articolelor greșite. |
| 📖 **Grile & răspunsuri** | Culegere de studiu organizată pe capitole: varianta corectă, explicația, nivelul de dificultate și sursa exactă. Căutare în text, inclusiv în explicații. |
| 📚 **Resurse** | Bibliografia oficială și documente utile, cu marcaj distinct pentru sursele oficiale (Monitorul Oficial, edu.ro, legislatie.just.ro). |
| 🗺️ **Transparență** | Hartă interactivă a județelor, colorată după numărul de posturi vacante. Click pe un județ → școlile și posturile de director / director adjunct. |
| 📅 **Calendar** | Etapele oficiale ale concursului, în ordine cronologică. |
| 💼 **Posturi vacante** | Lista posturilor, filtrabilă pe județ și căutabilă după denumirea unității. |

---

## Conținut și surse

Toate datele afișate provin din documente oficiale. Nu există conținut inventat sau completat estimativ.

### Întrebări — 121 de grile

Generate din bibliografia aprobată prin **OMEC nr. 4.622/2026, Anexa nr. 2**:

| Capitol | Grile | Sursă |
|---|---:|---|
| Legislație | 82 | Legea învățământului preuniversitar nr. 198/2023 |
| Profilul managerului școlar | 19 | OMEC nr. 3.934/2026 |
| Învățarea vizibilă | 11 | J. Hattie, *Învățarea vizibilă*, cap. 9 |
| Leadership educațional | 9 | T. Bush, *Leadership și management educațional*, cap. 1 |

Fiecare grilă are o dificultate (ușor / mediu / avansat) și un tip (reproducere, clasificare, capcană). Capcanele țintesc confuziile frecvente dintre prevederi apropiate: praguri numerice, termene, distincția aviz / aprobare, excepțiile de la regula generală.

### Calendar

Cele 30 de etape din **Anexa nr. 1 la OMEC nr. 4.622/2026**, de la anunțarea concursului (17 august) până la emiterea deciziilor de numire (16 decembrie, cu efect de la 1 ianuarie 2027).

### Posturi vacante

**3.968 de posturi în 2.553 de unități de învățământ, din 20 de județe:** Bacău, Bihor, Bistrița-Năsăud, Botoșani, Brașov, București, Buzău, Dâmbovița, Galați, Gorj, Ialomița, Mureș, Prahova, Satu Mare, Sălaj, Sibiu, Timiș, Tulcea, Vâlcea, Vrancea.

Datele au fost extrase din PDF-urile publicate de inspectoratele școlare, cu un parser dedicat fiecărui format. Fiecare județ a trecut printr-o verificare de completitudine: numărul de rânduri extrase trebuie să fie egal cu ultimul număr curent din documentul sursă.

Pentru celelalte județe, documentele sunt scanate. Recunoașterea optică (OCR) a dat rezultate diferite la rulări diferite pe același document, așa că acele date **nu au fost publicate**.

---

## Arhitectură

```
┌────────────────────────┐        ┌──────────────────────────────┐
│  Browser               │        │  Supabase                    │
│                        │  HTTPS │                              │
│  index.html            │◄──────►│  Auth    — conturi           │
│  app.js   (Vanilla JS) │        │  Postgres — date + progres   │
│  ro-map.js (SVG)       │        │  RLS     — izolare pe user   │
└────────────────────────┘        └──────────────────────────────┘
```

- **Fără framework și fără build step** — HTML, CSS și JavaScript simplu. Se poate găzdui pe orice hosting static.
- **Supabase** asigură autentificarea, baza de date PostgreSQL și politicile de acces (Row Level Security).
- **Harta** este un SVG generat din conturul oficial al județelor ([Natural Earth](https://www.naturalearthdata.com/), domeniu public), cu proiecție echirectangulară corectată și simplificare Douglas–Peucker.

### Structura fișierelor

```
files/
├── index.html                   Interfața: autentificare + 6 module
├── app.js                       Logica aplicației
├── config.js                    URL-ul și cheia publică Supabase
├── ro-map.js                    Harta județelor (generată automat)
│
├── schema.sql                   Structura bazei de date
├── grants.sql                   Drepturile de acces pe tabele
├── migration.sql                Actualizare pentru baze create cu o versiune veche
├── calendar-oficial-2026.sql    Calendarul oficial
├── resources-concurs-2026.sql   Resursele oficiale
├── intrebari-oficiale.sql       Cele 121 de grile
├── posturi-reale.sql            Posturile vacante (3.968)
├── seed.sql                     Date fictive, doar pentru dezvoltare
│
├── intrebari-concurs-2026.json  Setul de întrebări în format JSON
├── posturi-extrase.json         Posturile vacante în format JSON
└── smoke-test.js                Suita de teste automate
```

`ro-map.js` este generat automat și nu trebuie editat manual.

---

## Instalare

### Cerințe

- Un cont gratuit [Supabase](https://supabase.com/)
- Un server local static, de exemplu extensia **Live Server** din VS Code
- Node.js, doar pentru rularea testelor

### Pași

1. **Creează un proiect Supabase**, de preferat într-o regiune din UE.
2. **Inițializează baza de date** — vezi [Baza de date](#baza-de-date).
3. **Configurează conexiunea** — în Supabase, la *Settings → API*, copiază *Project URL* și cheia publică (`anon` / `publishable`) în `config.js`:

   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: 'https://<project-ref>.supabase.co',
     SUPABASE_ANON_KEY: '<cheia-publică>',
   };
   ```

4. **Configurează autentificarea** din *Authentication*:
   - *Providers → Email*: lasă *Confirm email* activ în producție; dezactivează-l doar pentru dezvoltare.
   - *URL Configuration*: adaugă adresa aplicației (de exemplu `http://localhost:5500`) la *Redirect URLs*.
5. **Pornește aplicația** — deschide `index.html` prin Live Server. Protocolul `file://` nu este suportat de Supabase Auth.

### Publicare

Aplicația este statică, deci se poate publica direct pe Netlify, Vercel, Cloudflare Pages sau GitHub Pages. După publicare, adaugă adresa finală la *Redirect URLs* în Supabase.

---

## Baza de date

Rulează fișierele în **Supabase → SQL Editor**, în această ordine:

| # | Fișier | Rol |
|:-:|---|---|
| 1 | `schema.sql` | Creează tabelele și politicile RLS |
| 2 | `grants.sql` | Acordă drepturile pe tabele rolurilor `anon` și `authenticated` |
| 3 | `calendar-oficial-2026.sql` | Încarcă calendarul oficial |
| 4 | `resources-concurs-2026.sql` | Încarcă resursele |
| 5 | `intrebari-oficiale.sql` | Încarcă grilele |
| 6 | `posturi-reale.sql` | Încarcă posturile vacante |

Toate fișierele de date pot fi rulate de mai multe ori fără să dubleze înregistrările.

> ⚠️ **Nu rula `seed.sql` pe o bază cu date reale.** Fișierul golește tabelele `vacant_positions` și `resources` și pune în loc date fictive. Folosește-l doar într-un mediu de dezvoltare.

### Tabele

| Tabel | Conținut | Acces |
|---|---|---|
| `questions` | Grilele, cu explicație, dificultate și sursă | citire publică |
| `exam_progress` | Răspunsurile fiecărui candidat | fiecare utilizator își vede doar propriile rânduri |
| `calendar_events` | Etapele concursului | citire publică |
| `vacant_positions` | Posturile vacante | citire publică |
| `resources` | Bibliografie și documente | citire publică |

---

## Testare

Suita rulează aplicația completă într-un DOM simulat (jsdom), cu un client Supabase simulat care reproduce și politicile RLS.

```bash
npm install
node files/smoke-test.js
```

**125 de verificări**, grupate în 13 secțiuni: validarea configurației, autentificare, testele și rezultatul final, salvarea și sincronizarea progresului, modul demo, culegerea de studiu, explicațiile, resursele, harta, potrivirea numelor de județe, filtrarea posturilor și protecția împotriva injecției HTML.

---

## Securitate

- **Cheia din `config.js` este publică prin natura ei.** Cheile `anon` / `publishable` sunt gândite să ajungă în browser. Accesul la date este controlat de politicile RLS și de drepturile din `grants.sql`.
- **Cheia `service_role` nu trebuie pusă niciodată în frontend** și nici în repository.
- **Progresul este izolat pe utilizator** — politicile RLS permit fiecărui cont să citească și să modifice exclusiv propriile răspunsuri.
- **Tot textul venit din baza de date este escapat** înainte de afișare.
- **Versiunea bibliotecii Supabase este fixată** (`2.58.0`), ca o actualizare automată să nu modifice comportamentul aplicației.
- **Configurația este validată la pornire** — un URL greșit (spațiu, lungime incorectă a identificatorului de proiect) este semnalat la încărcarea paginii, nu abia la primul login eșuat.

---

## Limitări cunoscute

- **Acoperire parțială a posturilor vacante** — 20 de județe din 42. Restul au publicat documente scanate, iar extragerea automată nu a fost suficient de fiabilă pentru a fi publicată.
- **Paginarea posturilor** — API-ul Supabase returnează implicit maximum 1.000 de rânduri pe cerere, iar încărcarea posturilor nu folosește încă paginare. Până la corectare, harta și lista afișează doar o parte din cele 3.968 de posturi.
- **Bibliografie incompletă în setul de grile** — *Cadrul de referință* (OMEC nr. 4.137/2026) și anexa ROFUIP nu au putut fi obținute în format utilizabil, iar din lucrarea lui T. Bush este disponibil doar primul capitol.

---

## Direcții de dezvoltare

- Paginarea încărcării posturilor vacante
- Extinderea acoperirii la toate județele, pe baza documentelor editabile solicitate inspectoratelor
- Cronometru de 60 de minute pentru teste, ca la proba scrisă
- Evoluția scorului în timp
- Export PDF pentru culegerea de grile
- Panou de administrare pentru importul de întrebări și resurse

---

## Depanare

| Simptom | Cauză probabilă | Soluție |
|---|---|---|
| Mesaj de configurație la încărcarea paginii | URL-ul din `config.js` e greșit | Copiază *Project URL* direct din Supabase |
| `permission denied for table …` | Lipsesc drepturile pe tabele | Rulează `grants.sql` |
| „Invalid login credentials” | Parolă greșită sau cont neconfirmat | Confirmă emailul sau resetează parola |
| „Nu s-a putut contacta Supabase” | Proiect suspendat din inactivitate | Reactivează proiectul din dashboard |
| Bannerul „mod demo” | Tabelul `questions` e gol | Rulează `intrebari-oficiale.sql` |
| Răspunsurile nu se salvează | Bază creată cu o versiune veche a schemei | Rulează `migration.sql` |
| Harta e gri | Tabelul `vacant_positions` e gol | Rulează `posturi-reale.sql` |
| Posturile reale au dispărut | A fost rulat `seed.sql` | Rulează din nou `posturi-reale.sql` și `resources-concurs-2026.sql` |

---

## Precizări

Aceasta este o inițiativă independentă, **neafiliată Ministerului Educației și Cercetării** sau vreunui inspectorat școlar.

Conținutul are rol exclusiv de pregătire. Pentru orice decizie privind înscrierea la concurs, sursa de referință rămâne textul actelor normative publicate în Monitorul Oficial și anunțurile oficiale ale inspectoratelor școlare.

Lucrările din bibliografie (Hattie, Bush) sunt protejate de drepturi de autor și nu sunt incluse în acest repository. Grilele formulate pe baza lor au caracter de exercițiu de învățare și trimit la capitolul corespunzător.
