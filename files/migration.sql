-- ============================================================
-- MIGRARE pentru bazele de date create cu versiunea veche a schema.sql
-- Rulează o singură dată în Supabase -> SQL Editor.
-- Dacă pornești de la zero, rulează direct schema.sql (îl include deja).
--
-- Rezolvă trei probleme care împiedicau salvarea progresului:
--   1. lipsea constrângerea UNIQUE(user_id, question_id) -> upsert-ul insera
--      rânduri duplicate la fiecare click, în loc să actualizeze răspunsul;
--   2. lipsea politica RLS de UPDATE -> upsert-ul care nimerea un conflict
--      era respins cu "new row violates row-level security policy";
--   3. lipsea coloana answered_at (coloana veche se numea "timestamp",
--      care e cuvânt rezervat în SQL).
-- ============================================================

-- 1. Coloana de dată cu nume ne-rezervat
ALTER TABLE exam_progress
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ DEFAULT NOW();

-- Preia valorile din vechea coloană "timestamp", dacă există
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_progress' AND column_name = 'timestamp'
  ) THEN
    EXECUTE 'UPDATE exam_progress SET answered_at = "timestamp"
             WHERE answered_at IS NULL AND "timestamp" IS NOT NULL';
  END IF;
END $$;

-- 2. Șterge duplicatele existente (păstrează cel mai recent răspuns),
--    altfel constrângerea UNIQUE de mai jos nu se poate crea.
DELETE FROM exam_progress a
USING exam_progress b
WHERE a.user_id = b.user_id
  AND a.question_id = b.question_id
  AND a.id < b.id;

-- 3. Un singur răspuns per utilizator per întrebare -> upsert-ul funcționează
ALTER TABLE exam_progress
  DROP CONSTRAINT IF EXISTS exam_progress_user_question_unique;

ALTER TABLE exam_progress
  ADD CONSTRAINT exam_progress_user_question_unique UNIQUE (user_id, question_id);

-- 4. Politicile RLS lipsă (UPDATE și DELETE pe progresul propriu)
DROP POLICY IF EXISTS "Users update own progress" ON exam_progress;
CREATE POLICY "Users update own progress" ON exam_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own progress" ON exam_progress;
CREATE POLICY "Users delete own progress" ON exam_progress
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Index pe data evenimentelor (calendarul se sortează cronologic)
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);

-- Verificare rapidă: ar trebui să vezi constrângerea UNIQUE și 4 politici.
-- SELECT conname FROM pg_constraint WHERE conrelid = 'exam_progress'::regclass;
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'exam_progress';

-- ============================================================
-- 6. Tabelul `resources` (pagina „Resurse")
-- Adăugat pentru pagina de resurse. Rulează-l și dacă ai deja baza creată.
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  category TEXT,
  kind TEXT,
  official BOOLEAN DEFAULT FALSE,
  published_date DATE,
  sort_order INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public resources" ON resources;
CREATE POLICY "Public resources" ON resources FOR SELECT USING (true);
