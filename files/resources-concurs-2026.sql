-- Rulează acest fișier în Supabase -> SQL Editor dacă ai rulat deja seed.sql.
-- Adaugă cele 4 resurse oficiale despre concursul 2026 (categoria "Concursul 2026").
-- ---------- Concursul 2026: acte, calendar, anunțuri (linkuri OFICIALE) ----------
-- Toate cele patru linkuri au fost verificate: răspund pe edu.ro (200), iar
-- PDF-ul de calendar conține ordinul privind sesiunea septembrie-decembrie 2026
-- și bibliografia probei scrise (Anexa nr. 2).
--
-- Le poți rula separat, dacă ai executat deja restul din seed.sql: selectează
-- doar blocul de mai jos și apasă Run în SQL Editor.
INSERT INTO resources (title, description, url, category, kind, official, published_date, sort_order) VALUES
('Metodologia concursului de directori (OMEC 4155/2026)',
 'Actul care reglementează organizarea concursului: cele trei probe, componența comisiilor, numirea și eliberarea din funcție. Publicat în Monitorul Oficial nr. 552 bis din 6 iulie 2026.',
 'https://www.edu.ro/sites/default/files/2026-07/OMEC_4155_2026_Metodologie_concurs_directori_diectori_adjuncti.pdf',
 'Concursul 2026', 'act normativ', TRUE, '2026-06-18', 1),

('Calendarul și bibliografia concursului, sesiunea septembrie-decembrie 2026',
 'Ordinul care aprobă calendarul sesiunii și bibliografia pentru proba scrisă (Anexa nr. 2). Publicat în iulie 2026.',
 'https://edu.ro/sites/default/files/2026-07/PO_calendar_concurs_directori_scoli_2026.pdf',
 'Concursul 2026', 'act normativ', TRUE, NULL, 2),

('Comunicat MEC: lansarea metodologiei în consultare publică',
 'Anunțul oficial din 6 mai 2026, cu explicații despre aria de aplicare (inclusiv învățământ special și centre pentru educație incluzivă).',
 'https://www.edu.ro/press_rel_32_2026',
 'Concursul 2026', 'comunicat', TRUE, '2026-05-06', 3),

('Pagina de etichetă "concurs directori școli" pe edu.ro',
 'Agregatorul oficial al ministerului pentru toate anunțurile legate de concurs - util pentru monitorizare periodică. Se actualizează continuu.',
 'https://www.edu.ro/etichete/concurs-directori-%C5%9Fcoli',
 'Concursul 2026', 'index', TRUE, NULL, 4);

