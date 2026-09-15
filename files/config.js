// ===== CONFIGURARE SUPABASE =====
// Găsești ambele valori în Supabase Dashboard → Settings → API
//
// ATENȚIE: URL-ul NU are voie să conțină spații. Formatul corect este exact:
//   https://<project-ref>.supabase.co
// unde <project-ref> are 20 de caractere (litere mici), fără spații.

window.APP_CONFIG = {
  // TODO: înlocuiește cu Project URL-ul tău (copiat direct din dashboard)
  SUPABASE_URL: 'https://rafphnsjlxipjihefyus.supabase.co',

  // Cheia publică ("anon public" / "publishable"). Poate fi expusă în frontend:
  // securitatea reală vine din politicile RLS din schema.sql.
  SUPABASE_ANON_KEY: 'sb_publishable_pJi7FrJK5vlpkUrR0R5B6A_zhddwOMX',
};
