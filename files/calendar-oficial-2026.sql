-- ============================================================
-- CALENDARUL OFICIAL AL CONCURSULUI - sesiunea august-decembrie 2026
-- Rulează în Supabase -> SQL Editor.
-- ============================================================
--
-- SURSA: Ordinul ministrului educației și cercetării nr. 4622/2026,
--        publicat în Monitorul Oficial al României, Partea I,
--        nr. 664 din 11 august 2026, ANEXA Nr. 1.
--        PDF: https://edu.ro/sites/default/files/2026-08/OM_4622_2026.pdf
--
-- Datele de mai jos sunt transcrise din acel ordin. Nu sunt inventate.
--
-- ATENȚIE la o capcană: pe edu.ro circulă și PROIECTUL de ordin din iulie
-- (fișierele `PO_calendar_...` și `Anexa_1_PO_...`), care vorbește despre
-- sesiunea *septembrie*-decembrie și are numărul/data necompletate. Ordinul
-- adoptat, folosit aici, e cel din august și acoperă sesiunea
-- *august*-decembrie 2026. Dacă vezi undeva alte date, verifică întâi
-- dacă nu cumva te uiți la proiect.
--
-- Tabelul `calendar_events` are o singură coloană de dată. Pentru etapele
-- care se întind pe mai multe zile am pus data de ÎNCEPUT, iar intervalul
-- complet apare în descriere. Etapele de tip „până la data de X" au ca dată
-- termenul-limită.
-- ============================================================

DELETE FROM calendar_events;

INSERT INTO calendar_events (event_name, event_date, county, description) VALUES

('Anunțarea concursului', '2026-08-17', NULL,
 '17 august. Publicarea funcțiilor vacante de director și director adjunct din unitățile de învățământ preuniversitar de stat cu personalitate juridică, cuprinse în rețeaua școlară a anului 2026-2027. Sursa: OM 4622/2026, Anexa nr. 1.'),

('Constituirea comisiilor de organizare', '2026-09-01', NULL,
 '1-4 septembrie. Constituirea comisiei naționale de monitorizare și coordonare a concursului și, la nivelul fiecărui inspectorat școlar, a comisiei de organizare.'),

('Solicitarea desemnării membrilor în comisii', '2026-09-07', NULL,
 '7-9 septembrie. Inspectoratele transmit consiliilor profesorale, autorităților locale și companiilor/universităților solicitările de desemnare a membrilor și supleanților pentru comisiile de interviu și de contestații.'),

('Depunerea dosarelor de înscriere', '2026-09-14', NULL,
 '14 septembrie - 2 octombrie. Etapa în care candidații își depun dosarele de înscriere la concurs.'),

('Verificarea dosarelor de înscriere', '2026-09-15', NULL,
 '15 septembrie - 7 octombrie. Comisiile verifică dosarele depuse.'),

('Înregistrarea listelor de membri în comisii', '2026-10-07', NULL,
 'Până la data de 7 octombrie. Se înregistrează la inspectorate listele persoanelor desemnate ca membri/supleanți în comisiile de evaluare a probei de interviu și în comisiile de soluționare a contestațiilor.'),

('Afișarea listei candidaților înscriși', '2026-10-07', NULL,
 '7 octombrie. Se afișează lista candidaților care îndeplinesc condițiile de înscriere și lista celor cu dosare incomplete sau care nu îndeplinesc condițiile.'),

('Remedierea dosarelor incomplete', '2026-10-07', NULL,
 '7-9 octombrie. Candidații cu dosare incomplete își pot înregistra solicitările în maximum 24 de ore de la afișarea listei; se remediază erorile de la verificarea dosarelor.'),

('Emiterea deciziilor de constituire a comisiilor', '2026-10-09', NULL,
 'Până la data de 9 octombrie. Se emit deciziile de constituire a comisiilor de evaluare a probei de interviu și a comisiilor de soluționare a contestațiilor.'),

('Afișarea listei finale a candidaților', '2026-10-09', NULL,
 '9 octombrie. Lista finală a candidaților admiși, respectiv respinși, după verificarea dosarelor de înscriere.'),

('Stabilirea centrelor de concurs', '2026-10-12', NULL,
 '12 octombrie. Se stabilesc centrele de concurs pentru proba de evaluare a competențelor și pentru proba scrisă, apoi se repartizează candidații pe centre.'),

('Proba pentru evaluarea de competențe', '2026-10-13', NULL,
 '13 octombrie. Se desfășoară proba care testează capacitățile și aptitudinile personale ale candidatului, urmată de afișarea rezultatelor.'),

('Contestații la proba de competențe', '2026-10-13', NULL,
 '13-14 octombrie. Depunerea contestațiilor, în termen de 24 de ore de la comunicarea rezultatelor.'),

('Rezultate finale la proba de competențe', '2026-10-15', NULL,
 '15 octombrie. Soluționarea contestațiilor și afișarea rezultatelor finale la proba pentru evaluarea de competențe.'),

('Proba scrisă', '2026-10-20', NULL,
 '20 octombrie. Se desfășoară proba scrisă, urmată de afișarea rezultatelor. Bibliografia e aprobată prin Anexa nr. 2 la același ordin.'),

('Contestații la proba scrisă', '2026-10-20', NULL,
 '20-21 octombrie. Depunerea contestațiilor, în termen de 24 de ore de la comunicarea rezultatelor.'),

('Transmiterea planurilor manageriale', '2026-10-21', NULL,
 '21-23 octombrie. Se transmit președinților comisiilor de interviu proiectele planurilor manageriale și ale planurilor de acțiune ale candidaților cu drept de susținere a probei de interviu.'),

('Evaluarea administrativă a planurilor', '2026-10-21', NULL,
 '21 octombrie - 4 noiembrie. Comisiile de interviu evaluează administrativ proiectele planurilor manageriale și ale planurilor de acțiune.'),

('Rezultate finale la proba scrisă', '2026-10-22', NULL,
 '22 octombrie. Soluționarea contestațiilor și afișarea rezultatelor finale la proba scrisă.'),

('Contestații la evaluarea administrativă', '2026-10-23', NULL,
 '23 octombrie - 5 noiembrie. Depunerea contestațiilor pentru etapa de evaluare administrativă a planurilor manageriale/planurilor de acțiune, în termen de 24 de ore de la afișarea rezultatelor.'),

('Soluționarea contestațiilor la evaluarea administrativă', '2026-11-09', NULL,
 'Până la data de 9 noiembrie.'),

('Rezultate finale la evaluarea administrativă', '2026-11-10', NULL,
 '10 noiembrie. Afișarea rezultatelor finale ale etapei de evaluare administrativă a proiectelor planurilor manageriale/planurilor de acțiune.'),

('Programarea probelor de interviu', '2026-11-10', NULL,
 '10-11 noiembrie. Se programează probele de interviu pentru candidații cu drept de susținere a etapei a doua.'),

('Desfășurarea probelor de interviu', '2026-11-12', NULL,
 '12-27 noiembrie. Perioada în care se susțin interviurile.'),

('Contestații la proba de interviu', '2026-11-12', NULL,
 '12 noiembrie - 2 decembrie. Depunerea contestațiilor, în termen de maximum 24 de ore de la afișarea rezultatelor.'),

('Soluționarea contestațiilor la interviu', '2026-12-07', NULL,
 'Până la data de 7 decembrie.'),

('Afișarea rezultatelor finale ale concursului', '2026-12-09', NULL,
 '9 decembrie. Momentul în care se cunosc rezultatele finale.'),

('Exprimarea opțiunilor candidaților admiși', '2026-12-10', NULL,
 '10 decembrie. Candidații declarați admiși pentru mai multe funcții/unități de învățământ își exprimă opțiunea.'),

('Validarea rezultatelor finale', '2026-12-11', NULL,
 '11 decembrie. Validarea rezultatelor finale în consiliul de administrație al inspectoratului școlar.'),

('Emiterea deciziilor de numire', '2026-12-16', NULL,
 'Până la data de 16 decembrie. Se emit și se comunică deciziile de numire, cu intrare în vigoare de la 1 ianuarie 2027.');


-- ---------- Actualizarea resursei care trimitea la PROIECTUL de ordin ----------
-- Resursa adăugată anterior trimitea la proiectul din iulie (sesiunea
-- septembrie-decembrie). O mutăm pe ordinul adoptat din august.
UPDATE resources
SET title = 'Calendarul și bibliografia concursului (OM 4622/2026)',
    description = 'Ordinul care aprobă calendarul sesiunii august-decembrie 2026 (Anexa nr. 1) și bibliografia pentru proba scrisă (Anexa nr. 2). Publicat în Monitorul Oficial nr. 664 din 11 august 2026.',
    url = 'https://edu.ro/sites/default/files/2026-08/OM_4622_2026.pdf',
    published_date = '2026-08-11'
WHERE url = 'https://edu.ro/sites/default/files/2026-07/PO_calendar_concurs_directori_scoli_2026.pdf';


-- ---------- Verificare ----------
-- Trebuie să vezi 30 de etape, prima pe 17 august, ultima pe 16 decembrie.
SELECT COUNT(*) AS etape, MIN(event_date) AS prima, MAX(event_date) AS ultima
FROM calendar_events;
