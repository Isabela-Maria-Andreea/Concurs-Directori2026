-- ============================================================
-- Structura bazei de date - Concurs Directori 2026
-- Rulează în Supabase -> SQL Editor (pentru o bază de date NOUĂ).
-- Dacă ai rulat deja versiunea veche, rulează în schimb migration.sql.
-- Scriptul e idempotent: îl poți rula de mai multe ori fără efecte secundare.
-- ============================================================

-- Întrebările din test (bibliografie oficială)
CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  source TEXT,                       -- sursa din bibliografie (act, articol)
  category TEXT,                     -- ex: Legislație, Metodologia concursului
  explanation TEXT,                  -- de ce e corect raspunsul
  difficulty TEXT,                   -- usor / mediu / avansat
  question_type TEXT,                -- recall / clasificare / capcana
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresul utilizatorului la teste.
-- UNIQUE(user_id, question_id) e obligatoriu: aplicația folosește upsert cu
-- onConflict pe aceste două coloane, ca un răspuns schimbat să actualizeze
-- rândul existent în loc să adauge unul nou.
CREATE TABLE IF NOT EXISTS exam_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer TEXT CHECK (user_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exam_progress_user_question_unique UNIQUE (user_id, question_id)
);

-- Resurse de studiu: legislatie, ghiduri, modele de documente, linkuri utile.
-- Se administreaza din Supabase -> Table Editor, fara sa atingi codul.
CREATE TABLE IF NOT EXISTS resources (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,                          -- link catre document / pagina oficiala
  category TEXT,                     -- ex: Legislatie, Management, Metodologie
  kind TEXT,                         -- ex: lege, ordin, ghid, model, video
  official BOOLEAN DEFAULT FALSE,    -- true = sursa oficiala (ME / ISJ / M.Of.)
  published_date DATE,
  sort_order INT DEFAULT 100,        -- ordinea de afisare in cadrul categoriei
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendarul concursului
CREATE TABLE IF NOT EXISTS calendar_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,          -- ex: "Deschidere înscrieri", "Probă scrisă"
  event_date DATE NOT NULL,
  county TEXT,                       -- județ; NULL = eveniment național
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posturi vacante de director / director adjunct
CREATE TABLE IF NOT EXISTS vacant_positions (
  id BIGSERIAL PRIMARY KEY,
  county TEXT NOT NULL,
  school_name TEXT NOT NULL,
  position TEXT NOT NULL,            -- "Director" sau "Director adjunct"
  posted_date DATE,
  source TEXT,                       -- URL-ul anunțului oficial
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Indecși ----------
CREATE INDEX IF NOT EXISTS idx_exam_progress_user_id ON exam_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_progress_question_id ON exam_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_calendar_county ON calendar_events(county);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_vacant_county ON vacant_positions(county);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);

-- ---------- Row Level Security ----------
-- Cheia „anon” e publică (apare în frontend), deci RLS este singura
-- protecție reală a datelor. Nu dezactiva aceste politici.
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacant_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Public: oricine poate citi întrebările, calendarul și posturile.
-- Scrierea se face doar din dashboard-ul Supabase (service role).
DROP POLICY IF EXISTS "Public questions" ON questions;
CREATE POLICY "Public questions" ON questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public calendar" ON calendar_events;
CREATE POLICY "Public calendar" ON calendar_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public positions" ON vacant_positions;
CREATE POLICY "Public positions" ON vacant_positions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public resources" ON resources;
CREATE POLICY "Public resources" ON resources FOR SELECT USING (true);

-- Privat: fiecare utilizator vede și modifică doar propriul progres.
-- Sunt necesare toate patru: fără UPDATE, upsert-ul eșuează la conflict.
DROP POLICY IF EXISTS "Users see own progress" ON exam_progress;
CREATE POLICY "Users see own progress" ON exam_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own progress" ON exam_progress;
CREATE POLICY "Users insert own progress" ON exam_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own progress" ON exam_progress;
CREATE POLICY "Users update own progress" ON exam_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own progress" ON exam_progress;
CREATE POLICY "Users delete own progress" ON exam_progress
  FOR DELETE USING (auth.uid() = user_id);
