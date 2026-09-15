-- ============================================================
-- DATE DE TEST - pentru a verifica funcționarea celor trei taburi.
-- Rulează în Supabase -> SQL Editor DUPĂ schema.sql / migration.sql.
--
-- !!! IMPORTANT !!!
-- Acestea sunt date EXEMPLU, scrise ca să poți testa aplicația.
-- NU sunt informații oficiale:
--   * calendarul NU mai e aici: e oficial, in calendar-oficial-2026.sql;
--   * posturile vacante și școlile sunt fictive;
--   * întrebările NU mai sunt aici: sunt oficiale, în intrebari-oficiale.sql;
-- Înlocuiește-le cu date preluate din ordinele de ministru / site-urile ISJ
-- înainte de a publica platforma. Pentru a le șterge:
--   DELETE FROM vacant_positions; --   DELETE FROM questions; DELETE FROM resources;
-- ============================================================

-- ---------- CURĂȚARE ÎNAINTE DE INSERARE ----------
-- Fișierul poate fi rulat de câte ori vrei: șterge întâi datele pe care
-- tot el le pune la loc. Fără blocul ăsta, o a doua rulare dubla toate
-- rândurile (exact ce s-a întâmplat: 5 întrebări deveniseră 10).
--
-- NU șterge questions, exam_progress și calendar_events: acelea conțin
-- acum date oficiale, puse de alte fișiere, plus progresul candidaților.
-- Ștergerea lor aici ar face ca o re-rulare banală să distrugă tot.
DELETE FROM vacant_positions;
DELETE FROM resources;

-- ---------- Întrebări ----------
-- Întrebările EXEMPLU au fost ELIMINATE din acest fișier.
-- Setul real vine din `intrebari-oficiale.sql`: 158 de grile generate din
-- bibliografia aprobată prin OMEC nr. 4.622/2026, fiecare cu sursa exactă
-- (act, capitol, articol) și cu explicația răspunsului.
--
-- De aceea seed.sql nu mai face DELETE pe `questions` și nici pe
-- `exam_progress`: altfel o re-rulare ar șterge întrebările oficiale
-- împreună cu tot progresul candidaților la teste.

-- ---------- Calendar ----------
-- Evenimentele fictive de calendar au fost ELIMINATE din acest fișier.
-- Calendarul real vine acum din `calendar-oficial-2026.sql`, transcris din
-- Ordinul 4622/2026 (M. Of. nr. 664 din 11 august 2026).
--
-- De aceea seed.sql nu mai face nici DELETE pe `calendar_events`: dacă l-ar
-- face, o re-rulare ar șterge datele oficiale și ar lăsa tabelul gol.

-- ---------- Posturi vacante (FICTIVE - doar pentru testarea filtrului) ----------
INSERT INTO vacant_positions (county, school_name, position, posted_date, source) VALUES
('Gorj',      'Școala Gimnazială Exemplu Nr. 1 (date de test)', 'Director',          '2026-09-10', NULL),
('Gorj',      'Liceul Tehnologic Exemplu (date de test)',        'Director adjunct',  '2026-09-10', NULL),
('Gorj',      'Colegiul Național Exemplu (date de test)',        'Director',          '2026-09-12', NULL),
('Iași',      'Școala Gimnazială Exemplu Nr. 7 (date de test)',  'Director',          '2026-09-11', NULL),
('Iași',      'Liceul Teoretic Exemplu (date de test)',          'Director adjunct',  '2026-09-11', NULL),
('Cluj',      'Colegiul Tehnic Exemplu (date de test)',          'Director',          '2026-09-09', NULL),
('București', 'Școala Gimnazială Exemplu Sector 3 (date de test)','Director',         '2026-09-08', NULL),
('București', 'Liceul Teoretic Exemplu Sector 6 (date de test)', 'Director adjunct',  '2026-09-14', NULL),
('Dolj',      'Școala Gimnazială Exemplu Craiova (date de test)','Director',          '2026-09-13', NULL),
('Timiș',     'Colegiul Național Exemplu Timișoara (date de test)','Director',        '2026-09-13', NULL);

-- ---------- Posturi vacante suplimentare (EXEMPLU - fictive!) ----------
-- Acoperă mai multe județe, ca harta din tabul „Transparență" să aibă
-- ce colora. Toate sunt inventate: înlocuiește-le cu anunțurile reale ISJ.
INSERT INTO vacant_positions (county, school_name, position, posted_date, source) VALUES
('Brașov',          'Colegiul Național Exemplu Brașov (date de test)',      'Director',         '2026-09-07', NULL),
('Brașov',          'Școala Gimnazială Exemplu Râșnov (date de test)',      'Director adjunct', '2026-09-15', NULL),
('Constanța',       'Liceul Teoretic Exemplu Constanța (date de test)',     'Director',         '2026-09-06', NULL),
('Constanța',       'Școala Gimnazială Exemplu Mangalia (date de test)',    'Director',         '2026-09-16', NULL),
('Suceava',         'Colegiul Tehnic Exemplu Suceava (date de test)',       'Director',         '2026-09-05', NULL),
('Maramureș',       'Școala Gimnazială Exemplu Baia Mare (date de test)',   'Director adjunct', '2026-09-12', NULL),
('Bihor',           'Liceul Tehnologic Exemplu Oradea (date de test)',      'Director',         '2026-09-11', NULL),
('Argeș',           'Colegiul Național Exemplu Pitești (date de test)',     'Director',         '2026-09-09', NULL),
('Prahova',         'Școala Gimnazială Exemplu Ploiești (date de test)',    'Director',         '2026-09-10', NULL),
('Prahova',         'Liceul Teoretic Exemplu Câmpina (date de test)',       'Director adjunct', '2026-09-17', NULL),
('Mureș',           'Colegiul Național Exemplu Târgu Mureș (date de test)', 'Director',         '2026-09-08', NULL),
('Sibiu',           'Școala Gimnazială Exemplu Sibiu (date de test)',       'Director',         '2026-09-14', NULL),
('Galați',          'Liceul Tehnologic Exemplu Galați (date de test)',      'Director',         '2026-09-13', NULL),
('Bacău',           'Școala Gimnazială Exemplu Bacău (date de test)',       'Director adjunct', '2026-09-15', NULL),
('Vâlcea',          'Colegiul Energetic Exemplu Râmnicu Vâlcea (date de test)', 'Director',     '2026-09-12', NULL),
('Hunedoara',       'Liceul Teoretic Exemplu Deva (date de test)',          'Director',         '2026-09-11', NULL),
('Caraș-Severin',   'Școala Gimnazială Exemplu Reșița (date de test)',      'Director',         '2026-09-16', NULL),
('Satu Mare',       'Colegiul Tehnic Exemplu Satu Mare (date de test)',     'Director adjunct', '2026-09-18', NULL),
('Botoșani',        'Școala Gimnazială Exemplu Botoșani (date de test)',    'Director',         '2026-09-19', NULL),
('Neamț',           'Liceul Teoretic Exemplu Piatra Neamț (date de test)',  'Director',         '2026-09-09', NULL),
('Alba',            'Colegiul Național Exemplu Alba Iulia (date de test)',  'Director',         '2026-09-20', NULL),
('Ilfov',           'Școala Gimnazială Exemplu Voluntari (date de test)',   'Director',         '2026-09-07', NULL);

-- ---------- Resurse (linkuri OFICIALE, verificabile) ----------
-- Spre deosebire de restul fișierului, acestea sunt linkuri reale către
-- surse publice. Verifică totuși dacă actele au fost între timp modificate.
INSERT INTO resources (title, description, url, category, kind, official, published_date, sort_order) VALUES
('Legea învățământului preuniversitar nr. 198/2023',
 'Actul normativ de bază: organizarea sistemului, conducerea unităților de învățământ, atribuțiile directorului.',
 'https://legislatie.just.ro/Public/DetaliiDocument/271896',
 'Legislație', 'lege', TRUE, '2023-07-05', 10),

('Legea nr. 199/2023 a învățământului superior',
 'Utilă pentru capitolele despre formarea continuă și cariera didactică.',
 'https://legislatie.just.ro/Public/DetaliiDocument/271898',
 'Legislație', 'lege', TRUE, '2023-07-05', 20),

('Portalul Ministerului Educației',
 'Sursa primară pentru metodologia concursului, calendarul oficial și anunțurile.',
 'https://www.edu.ro/',
 'Legislație', 'portal', TRUE, NULL, 30),

('Monitorul Oficial — căutare acte normative',
 'Verifică forma în vigoare a oricărui ordin sau lege citate în bibliografie.',
 'https://legislatie.just.ro/',
 'Legislație', 'portal', TRUE, NULL, 40),

('Codul muncii — Legea nr. 53/2003 (republicată)',
 'Relevant pentru capitolele de management al resurselor umane și contracte de muncă.',
 'https://legislatie.just.ro/Public/DetaliiDocument/41625',
 'Management', 'lege', TRUE, '2003-01-24', 50),

('Legea nr. 500/2002 privind finanțele publice',
 'Bază pentru întrebările despre buget, execuție bugetară și ordonatori de credite.',
 'https://legislatie.just.ro/Public/DetaliiDocument/37954',
 'Management financiar', 'lege', TRUE, '2002-08-13', 60),

('ARACIP — standarde de evaluare și asigurare a calității',
 'Standardele după care se evaluează unitatea de învățământ; apar frecvent în probele de management.',
 'https://www.edu.ro/ARACIP',
 'Management', 'portal', TRUE, NULL, 70),

('Ghid de completare a CV-ului și a dosarului de concurs (EXEMPLU)',
 'ÎNLOCUIEȘTE cu ghidul oficial publicat de ISJ-ul tău. Rând demonstrativ.',
 NULL,
 'Dosar concurs', 'ghid', FALSE, NULL, 80),

('Model de plan de dezvoltare instituțională (EXEMPLU)',
 'ÎNLOCUIEȘTE cu un model real. Rând demonstrativ, nu îl folosi ca atare.',
 NULL,
 'Dosar concurs', 'model', FALSE, NULL, 90);


-- ---------- Concursul 2026: acte, calendar, anunțuri (linkuri OFICIALE) ----------
-- Toate cele patru linkuri au fost verificate: răspund pe edu.ro (200), iar
-- ordinul adoptat (OM 4622/2026) conține calendarul sesiunii august-decembrie
-- 2026 în Anexa nr. 1 și bibliografia probei scrise în Anexa nr. 2.
--
-- Le poți rula separat, dacă ai executat deja restul din seed.sql: selectează
-- doar blocul de mai jos și apasă Run în SQL Editor.
INSERT INTO resources (title, description, url, category, kind, official, published_date, sort_order) VALUES
('Metodologia concursului de directori (OMEC 4155/2026)',
 'Actul care reglementează organizarea concursului: cele trei probe, componența comisiilor, numirea și eliberarea din funcție. Publicat în Monitorul Oficial nr. 552 bis din 6 iulie 2026.',
 'https://www.edu.ro/sites/default/files/2026-07/OMEC_4155_2026_Metodologie_concurs_directori_diectori_adjuncti.pdf',
 'Concursul 2026', 'act normativ', TRUE, '2026-06-18', 1),

('Calendarul și bibliografia concursului (OM 4622/2026)',
 'Ordinul care aprobă calendarul sesiunii august-decembrie 2026 (Anexa nr. 1) și bibliografia pentru proba scrisă (Anexa nr. 2). Publicat în Monitorul Oficial nr. 664 din 11 august 2026.',
 'https://edu.ro/sites/default/files/2026-08/OM_4622_2026.pdf',
 'Concursul 2026', 'act normativ', TRUE, '2026-08-11', 2),

('Comunicat MEC: lansarea metodologiei în consultare publică',
 'Anunțul oficial din 6 mai 2026, cu explicații despre aria de aplicare (inclusiv învățământ special și centre pentru educație incluzivă).',
 'https://www.edu.ro/press_rel_32_2026',
 'Concursul 2026', 'comunicat', TRUE, '2026-05-06', 3),

('Pagina de etichetă "concurs directori școli" pe edu.ro',
 'Agregatorul oficial al ministerului pentru toate anunțurile legate de concurs - util pentru monitorizare periodică. Se actualizează continuu.',
 'https://www.edu.ro/etichete/concurs-directori-%C5%9Fcoli',
 'Concursul 2026', 'index', TRUE, NULL, 4);
