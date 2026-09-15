-- ============================================================
-- DREPTURI DE ACCES (GRANT) - rulează în Supabase -> SQL Editor
-- ============================================================
-- De ce e nevoie de acest fișier:
--
-- Politicile RLS din schema.sql spun CINE are voie să vadă CE rânduri, dar
-- Postgres cere, separat, și dreptul de a atinge tabelul. Sunt două straturi
-- diferite: fără GRANT, cererea e respinsă înainte să se ajungă la RLS.
--
-- În proiectul acesta lipseau GRANT-urile, iar API-ul răspundea cu:
--   42501 - permission denied for table questions
-- adică toate taburile ar fi rămas goale, chiar și după rularea seed.sql.
--
-- `anon`          = vizitator nelogat (cheia publică din config.js)
-- `authenticated` = utilizator logat
-- Scrierea în tabelele publice rămâne interzisă: se face doar din dashboard.
-- ============================================================

-- Dreptul de a folosi schema publică
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ---------- Tabele publice: doar citire ----------
GRANT SELECT ON public.questions         TO anon, authenticated;
GRANT SELECT ON public.calendar_events   TO anon, authenticated;
GRANT SELECT ON public.vacant_positions  TO anon, authenticated;
GRANT SELECT ON public.resources         TO anon, authenticated;

-- ---------- Progresul la teste: doar utilizatorii logați ----------
-- RLS (din schema.sql) limitează oricum fiecare utilizator la propriile rânduri.
-- `anon` nu primeşte nimic aici: un vizitator nelogat nu are ce salva.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_progress TO authenticated;

-- Coloanele BIGSERIAL folosesc secvenţe; fără acest drept, INSERT-ul eşuează
-- cu "permission denied for sequence exam_progress_id_seq".
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ---------- Verificare ----------
-- După Run, interoghează asta: trebuie să vezi câte un rând pentru fiecare
-- tabel public cu anon/SELECT, plus exam_progress cu authenticated.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
