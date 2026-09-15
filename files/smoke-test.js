// Smoke test: rulează index.html + app.js real, cu un Supabase simulat.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = __dirname;
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const mapJs = fs.readFileSync(path.join(DIR, 'ro-map.js'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- Supabase simulat, inclusiv RLS-ul pe exam_progress ----
function makeMock(state) {
  const listeners = [];
  const tables = state.tables;

  function query(table) {
    const q = {
      _filters: [],
      select() { return q; },
      order() { return q; },
      limit() { return q; },
      eq(col, val) { q._filters.push([col, val]); return q; },
      in(col, vals) { q._filters.push([col, vals, 'in']); return q; },
      delete() { q._delete = true; return q; },
      then(resolve) {
        const match = (r) => q._filters.every(([c, v, op]) =>
          (op === 'in' ? v.includes(r[c]) : r[c] === v));

        if (q._delete) {
          // RLS: nu poti sterge randurile altui utilizator.
          const arr = tables[table] || (tables[table] = []);
          const hit = arr.filter(match);
          if (hit.some(r => 'user_id' in r && r.user_id !== state.session.user.id)) {
            resolve({ data: null, error: { message: 'RLS: ștergere interzisă' } });
            return;
          }
          tables[table] = arr.filter(r => !match(r));
          resolve({ data: null, error: null });
          return;
        }

        resolve({ data: (tables[table] || []).filter(match), error: null });
      },
      async upsert(row, opts) {
        state.upserts.push({ row, opts });
        if (!opts || opts.onConflict !== 'user_id,question_id') {
          return { data: null, error: { message: 'upsert fără onConflict -> duplicate' } };
        }
        if (row.user_id !== state.session.user.id) {
          return { data: null, error: { message: 'RLS: user_id greșit' } };
        }
        const arr = tables[table] || (tables[table] = []);
        const i = arr.findIndex(r => r.user_id === row.user_id && r.question_id === row.question_id);
        if (i >= 0) arr[i] = row; else arr.push(row);
        return { data: [row], error: null };
      },
    };
    return q;
  }

  return {
    createClient: () => ({
      from: query,
      auth: {
        async getSession() { return { data: { session: state.session }, error: null }; },
        onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: {} } }; },
        async signInWithPassword({ email, password }) {
          if (password !== 'parola123') {
            return { data: {}, error: { message: 'Invalid login credentials' } };
          }
          state.session = { user: { id: 'u-1', email, user_metadata: { county: 'Gorj' } } };
          listeners.forEach(cb => cb('SIGNED_IN', state.session));
          return { data: { session: state.session }, error: null };
        },
        async signUp({ email, options }) {
          state.signUpArgs = { email, options };
          if (email === 'existing@test.ro') {
            return { data: { user: { identities: [] }, session: null }, error: null };
          }
          return { data: { user: { id: 'u-1', identities: [{}] }, session: null }, error: null };
        },
        async signOut() {
          state.session = null;
          listeners.forEach(cb => cb('SIGNED_OUT', null));
          return { error: null };
        },
      },
    }),
  };
}

function boot(config, state) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:5500/' });
  const w = dom.window;
  w.APP_CONFIG = config;
  w.supabase = state ? makeMock(state) : undefined;
  w.eval(mapJs);
  w.eval(appJs);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return w;
}

// Tabul Teste incepe cu lista de teste: intrebarile apar dupa ce deschizi unul.
function openTest(w, index) {
  const btn = w.document.querySelector(`#testList button[data-test="${index || 0}"]`);
  if (!btn) throw new Error('lipseste butonul testului ' + (index || 0));
  btn.dispatchEvent(new w.Event('click'));
}

// Culegerea de studiu nu afiseaza nimic pana nu alegi capitolul.
function pickChapter(w, name) {
  const sel = w.document.getElementById('studyCategory');
  sel.value = name;
  sel.dispatchEvent(new w.Event('change'));
}

const seed = () => ({
  session: null,
  upserts: [],
  tables: {
    questions: [
      { id: 1, text: 'Întrebarea <unu>', option_a: 'A1', option_b: 'B1', option_c: 'C1', option_d: 'D1', correct_answer: 'B', source: 'Legea 198/2023', category: 'Legislație' },
      { id: 2, text: 'Întrebarea doi', option_a: 'A2', option_b: 'B2', option_c: 'C2', option_d: 'D2', correct_answer: 'A', source: null, category: 'Management' },
    ],
    exam_progress: [],
    calendar_events: [
      { id: 1, event_name: 'Deschidere înscrieri', event_date: '2026-09-17', county: null, description: 'test' },
      { id: 2, event_name: 'Proba scrisă', event_date: '2026-10-15', county: null, description: null },
      { id: 3, event_name: 'Eveniment trecut', event_date: '2020-01-01', county: 'Gorj', description: null },
    ],
    resources: [
      { id: 1, title: 'Legea 198/2023', description: 'Legea <de baza>', url: 'https://legislatie.just.ro/x', category: 'Legislație', kind: 'lege', official: true, published_date: '2023-07-05', sort_order: 10 },
      { id: 2, title: 'Model fără link', description: 'Rând demonstrativ', url: null, category: 'Dosar concurs', kind: 'model', official: false, published_date: null, sort_order: 20 },
    ],
    vacant_positions: [
      { id: 1, county: 'Gorj', school_name: 'Școala Alfa', position: 'Director', posted_date: '2026-09-10', source: null },
      { id: 2, county: 'Gorj', school_name: 'Liceul Beta', position: 'Director adjunct', posted_date: '2026-09-10', source: null },
      { id: 3, county: 'Iași', school_name: 'Colegiul Gorj-Vechi', position: 'Director', posted_date: '2026-09-11', source: null },
    ],
  },
});

(async () => {
  // === 1. Bugul original: spațiu în URL ===
  console.log('\n1. URL cu spațiu (bugul raportat)');
  {
    const w = boot({ SUPABASE_URL: 'https://rafphnsj lxipijihefyus.supabase.co', SUPABASE_ANON_KEY: 'k' }, seed());
    await sleep(20);
    const box = w.document.getElementById('configError');
    check('afișează eroare de configurare în loc să crape', box.style.display === 'block');
    check('mesajul menționează spațiul', /spațiu/.test(box.textContent), box.textContent.slice(0, 80));
    check('formularul de auth e ascuns', w.document.getElementById('authSection').style.display === 'none');
    check('handlerele sunt totuși legate (nu a crăpat scriptul)',
      typeof w.document.getElementById('loginBtn') !== 'undefined');
  }

  // === 2. URL neconfigurat ===
  console.log('\n2. URL placeholder necompletat');
  {
    const w = boot({ SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co', SUPABASE_ANON_KEY: 'k' }, seed());
    await sleep(20);
    check('cere completarea config.js', /config\.js/.test(w.document.getElementById('configError').textContent));
  }

  // === 3. Login greșit ===
  console.log('\n3. Login cu parolă greșită');
  {
    const st = seed();
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(20);
    check('pornește pe ecranul de login', !w.document.getElementById('authSection').classList.contains('hidden'));
    w.document.getElementById('loginEmail').value = 'ion@test.ro';
    w.document.getElementById('loginPassword').value = 'gresit';
    w.document.getElementById('loginFormEl').dispatchEvent(new w.Event('submit'));
    await sleep(20);
    check('mesaj de eroare tradus în română',
      /incorect/.test(w.document.getElementById('authError').textContent),
      w.document.getElementById('authError').textContent);
    check('butonul redevine activ', !w.document.getElementById('loginBtn').disabled);
  }

  // === 4. Signup ===
  console.log('\n4. Înregistrare');
  {
    const st = seed();
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(20);
    w.document.getElementById('toSignUp').dispatchEvent(new w.Event('click'));
    check('comută pe formularul de înregistrare',
      w.document.getElementById('signupForm').style.display === 'block');

    w.document.getElementById('signupEmail').value = 'nou@test.ro';
    w.document.getElementById('signupPassword').value = '123';
    w.document.getElementById('signupCounty').value = 'Gorj';
    w.document.getElementById('signupFormEl').dispatchEvent(new w.Event('submit'));
    await sleep(20);
    check('respinge parola sub 6 caractere',
      /minim 6/.test(w.document.getElementById('signupError').textContent));

    w.document.getElementById('signupPassword').value = 'parola123';
    w.document.getElementById('signupFormEl').dispatchEvent(new w.Event('submit'));
    await sleep(20);
    check('trimite județul în user_metadata',
      st.signUpArgs && st.signUpArgs.options.data.county === 'Gorj',
      JSON.stringify(st.signUpArgs && st.signUpArgs.options));
    check('mesaj de confirmare pe email, stilizat ca succes',
      /success-message/.test(w.document.getElementById('signupError').innerHTML));

    w.document.getElementById('signupEmail').value = 'existing@test.ro';
    w.document.getElementById('signupFormEl').dispatchEvent(new w.Event('submit'));
    await sleep(20);
    check('detectează emailul deja înregistrat',
      /deja un cont/.test(w.document.getElementById('signupError').textContent));
  }

  // === 5. Login reușit + cele trei taburi ===
  console.log('\n5. Login reușit, apoi toate taburile');
  const st = seed();
  const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
  await sleep(20);
  w.document.getElementById('loginEmail').value = 'ion@test.ro';
  w.document.getElementById('loginPassword').value = 'parola123';
  w.document.getElementById('loginFormEl').dispatchEvent(new w.Event('submit'));
  await sleep(80);

  const doc = w.document;
  check('aplicația e vizibilă', doc.getElementById('appSection').classList.contains('active'));
  check('emailul apare în profil', doc.getElementById('userEmail').textContent === 'ion@test.ro');
  check('județul apare în profil', /Gorj/.test(doc.getElementById('userCounty').textContent));

  // -- Teste --
  check('întrebările s-au încărcat din BD (nu demo)',
    doc.getElementById('demoBadge').style.display === 'none');
  check('pornim de la lista de teste, nu de la o întrebare',
    !doc.getElementById('testPicker').classList.contains('hidden') &&
    doc.getElementById('testRunner').classList.contains('hidden'));
  check('s-a generat cel puțin un test',
    doc.querySelectorAll('#testList .test-card').length === 1);
  check('cardul testului arată câte întrebări are',
    /2 întrebări/.test(doc.getElementById('testList').textContent));

  openTest(w, 0);
  await sleep(20);
  check('deschiderea testului arată întrebările',
    !doc.getElementById('testRunner').classList.contains('hidden'));
  check('numele testului e afișat',
    doc.getElementById('currentTestName').textContent === 'Testul 1');
  check('total întrebări = 2', doc.getElementById('totalQuestions').textContent === '2');
  check('textul întrebării e escapat (fără XSS)',
    doc.getElementById('questionContainer').innerHTML.includes('&lt;unu&gt;'));
  check('sursa e afișată', /Legea 198\/2023/.test(doc.getElementById('questionContainer').textContent));

  const radios = doc.querySelectorAll('#questionContainer input[name="answer"]');
  check('4 variante de răspuns', radios.length === 4);

  // răspuns greșit
  radios[0].checked = true;
  radios[0].dispatchEvent(new w.Event('change'));
  await sleep(30);
  check('feedback pentru răspuns greșit',
    /Răspuns greșit/.test(doc.getElementById('questionContainer').textContent));
  check('arată varianta corectă',
    doc.querySelectorAll('#questionContainer .option.correct').length === 1);
  check('marchează greșeala',
    doc.querySelectorAll('#questionContainer .option.incorrect').length === 1);
  check('upsert cu onConflict corect',
    st.upserts[0].opts.onConflict === 'user_id,question_id');
  check('rând salvat în exam_progress', st.tables.exam_progress.length === 1);
  check('is_correct = false', st.tables.exam_progress[0].is_correct === false);
  check('confirmare de salvare afișată',
    /Salvat în cont/.test(doc.getElementById('questionContainer').textContent));
  check('scor 0%', doc.getElementById('score').textContent === '0');

  // întrebarea 2, răspuns corect
  doc.getElementById('nextBtn').dispatchEvent(new w.Event('click'));
  await sleep(20);
  check('navigare la întrebarea 2', doc.getElementById('questionNumber').textContent === '2');
  check('butonul Înainte e dezactivat la ultima întrebare', doc.getElementById('nextBtn').disabled);
  const r2 = doc.querySelectorAll('#questionContainer input[name="answer"]');
  r2[0].checked = true;
  r2[0].dispatchEvent(new w.Event('change'));
  await sleep(30);
  check('feedback pentru răspuns corect',
    /Răspuns corect/.test(doc.getElementById('questionContainer').textContent));
  check('scor 50% (1 din 2)', doc.getElementById('score').textContent === '50',
    doc.getElementById('score').textContent);
  check('contor corecte', doc.getElementById('answeredCount').textContent === '1/2 corecte',
    doc.getElementById('answeredCount').textContent);
  check('2 rânduri în exam_progress', st.tables.exam_progress.length === 2);

  // re-răspuns la aceeași întrebare NU duplică rândul
  doc.getElementById('prevBtn').dispatchEvent(new w.Event('click'));
  await sleep(20);
  check('răspunsul salvat e reafișat la revenire',
    doc.querySelectorAll('#questionContainer input:checked').length === 1);

  // -- Rezultatul testului --
  doc.getElementById('finishBtn').dispatchEvent(new w.Event('click'));
  await sleep(20);
  const res = doc.getElementById('testResult');
  check('ecranul de rezultat e vizibil', !res.classList.contains('hidden'));
  check('nota e calculată din 10 (1 din 2 = 5.00)',
    res.querySelector('.result-grade').textContent === '5.00',
    res.querySelector('.result-grade').textContent);
  check('sub nota 7 = nepromovat',
    /Nepromovat/.test(res.textContent) && res.querySelector('.result-card.fail') !== null);
  check('rezultatul e defalcat pe capitole',
    res.querySelectorAll('.result-breakdown tbody tr').length === 2);
  check('capitolul greșit e marcat ca slab',
    res.querySelector('.result-breakdown tr.weak td').textContent === 'Legislație',
    res.querySelector('.result-breakdown tr.weak td').textContent);
  check('spune ce capitol să reia', /Capitolele de reluat/.test(res.textContent));
  check('trimite la sursa întrebării greșite', /Legea 198\/2023/.test(res.textContent));

  // reluarea testului sterge progresul, local si in cloud
  res.querySelector('#retakeBtn').dispatchEvent(new w.Event('click'));
  await sleep(30);
  check('reluarea readuce întrebările fără răspuns',
    doc.querySelectorAll('#questionContainer input:checked').length === 0);
  check('reluarea șterge progresul din cloud',
    st.tables.exam_progress.length === 0, String(st.tables.exam_progress.length));

  doc.getElementById('backToTests').dispatchEvent(new w.Event('click'));
  await sleep(20);
  check('butonul de revenire duce la lista de teste',
    !doc.getElementById('testPicker').classList.contains('hidden'));

  // -- Calendar --
  const cal = doc.getElementById('calendarList').textContent;
  check('calendarul are evenimente', /Deschidere înscrieri/.test(cal));
  check('data e formatată în română', /17 septembrie 2026/.test(cal), cal.slice(0, 120));
  check('evenimentele naționale sunt marcate', /Național/.test(cal));
  check('evenimentele trecute sunt marcate',
    doc.querySelectorAll('#calendarList .card-item.past').length === 1);

  // -- Posturi --
  const sel = doc.getElementById('countyFilter');
  check('dropdown populat din date (Toate + 2 județe)', sel.options.length === 3,
    Array.from(sel.options).map(o => o.value).join('|'));
  check('afișează toate cele 3 posturi',
    doc.querySelectorAll('#positionsList .card-item').length === 3);

  sel.value = 'Gorj';
  sel.dispatchEvent(new w.Event('change'));
  await sleep(10);
  const shown = Array.from(doc.querySelectorAll('#positionsList .card-item')).map(e => e.textContent);
  check('filtrul Gorj arată exact 2 posturi', shown.length === 2, shown.length + ' -> ' + shown.join(' // '));
  check('NU include "Colegiul Gorj-Vechi" din Iași (bugul vechi de filtrare)',
    !shown.some(t => /Gorj-Vechi/.test(t)));
  check('contorul se actualizează',
    doc.getElementById('positionsCount').textContent === '2 din 3 posturi',
    doc.getElementById('positionsCount').textContent);

  doc.getElementById('positionSearch').value = 'adjunct';
  doc.getElementById('positionSearch').dispatchEvent(new w.Event('input'));
  await sleep(10);
  check('căutarea text se combină cu filtrul de județ',
    doc.querySelectorAll('#positionsList .card-item').length === 1);

  sel.value = '';
  doc.getElementById('positionSearch').value = '';
  sel.dispatchEvent(new w.Event('change'));
  await sleep(10);

  // -- Taburi --
  // Selectam dupa data-tab, nu dupa index: adaugarea unui tab nou nu mai strica testul.
  const tabBtn = (name) => doc.querySelector(`.tab-btn[data-tab="${name}"]`);
  const calendarBtn = tabBtn('calendar');
  calendarBtn.dispatchEvent(new w.Event('click'));
  check('tabul Calendar devine activ', doc.getElementById('calendarTab').classList.contains('active'));
  check('tabul Teste devine inactiv', !doc.getElementById('examTab').classList.contains('active'));
  check('butonul Calendar e evidențiat', calendarBtn.classList.contains('active'));

  // -- Logout --
  doc.getElementById('logoutBtn').dispatchEvent(new w.Event('click'));
  await sleep(30);
  check('logout revine la ecranul de login',
    !doc.getElementById('authSection').classList.contains('hidden'));
  check('logout golește câmpul de email', doc.getElementById('loginEmail').value === '');

  // === 6. Persistența progresului: alt browser, aceleași date ===
  console.log('\n6. Sincronizare cloud (simulare alt dispozitiv)');
  {
    const st2 = seed();
    st2.tables.exam_progress = [
      { user_id: 'u-1', question_id: 1, user_answer: 'B', is_correct: true },
    ];
    st2.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w2 = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st2);
    await sleep(80);
    const d2 = w2.document;
    check('sesiunea existentă intră direct în aplicație',
      d2.getElementById('appSection').classList.contains('active'));
    check('testul început apare ca „În lucru"',
      /În lucru — 1\/2/.test(d2.getElementById('testList').textContent),
      d2.getElementById('testList').textContent.trim());
    openTest(w2, 0);
    await sleep(20);
    check('sare la prima întrebare fără răspuns (nr. 2)',
      d2.getElementById('questionNumber').textContent === '2',
      d2.getElementById('questionNumber').textContent);
    check('scorul reflectă progresul din cloud (100%)',
      d2.getElementById('score').textContent === '100', d2.getElementById('score').textContent);
    check('contorul arată 1/1 corecte',
      d2.getElementById('answeredCount').textContent === '1/1 corecte');
    d2.getElementById('prevBtn').dispatchEvent(new w2.Event('click'));
    await sleep(20);
    check('răspunsul salvat anterior apare bifat',
      d2.querySelectorAll('#questionContainer input:checked').length === 1);
    check('și e marcat ca fiind corect',
      /Răspuns corect/.test(d2.getElementById('questionContainer').textContent));
  }

  // === 7. Mod demo (tabel gol) ===
  console.log('\n7. Tabel questions gol -> mod demo');
  {
    const st3 = seed();
    st3.tables.questions = [];
    st3.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w3 = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st3);
    await sleep(80);
    const d3 = w3.document;
    check('avertismentul de mod demo e vizibil',
      d3.getElementById('demoBadge').style.display === 'block');
    openTest(w3, 0);
    await sleep(20);
    const r = d3.querySelectorAll('#questionContainer input[name="answer"]');
    r[0].checked = true;
    r[0].dispatchEvent(new w3.Event('change'));
    await sleep(30);
    check('NU scrie în BD în mod demo (evită eroarea de cheie străină)',
      st3.upserts.length === 0 && st3.tables.exam_progress.length === 0);
    check('spune explicit că nu salvează',
      /nu se salvează/.test(d3.getElementById('questionContainer').textContent));
  }


  // === 8. Pagina „Grile & raspunsuri" ===
  console.log('\n8. Mod studiu (grile cu răspunsuri)');
  {
    const st = seed();
    st.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(80);
    const d = w.document;
    const list = d.getElementById('studyList');

    check('nu afișează grile până nu alegi capitolul',
      list.querySelectorAll('.study-item').length === 0 &&
      /Alege un capitol/.test(list.textContent));

    const cat = d.getElementById('studyCategory');
    check('dropdown capitole populat din date', cat.options.length === 3);
    check('prima opțiune cere alegerea capitolului',
      /alege un capitol/i.test(cat.options[0].textContent));

    pickChapter(w, 'Legislație');
    check('alegerea capitolului afișează grilele din el',
      list.querySelectorAll('.study-item').length === 1);
    check('contorul reflectă filtrarea', /1 din 2/.test(d.getElementById('studyCount').textContent));
    check('marchează exact o variantă corectă per întrebare',
      [...list.querySelectorAll('.study-item')].every(it => it.querySelectorAll('.study-opt.is-correct').length === 1));
    check('varianta marcată e cea corectă (B la întrebarea 1)',
      /B\)/.test(list.querySelector('.study-item .study-opt.is-correct').textContent));
    check('escapează textul din BD (fără injecție HTML)',
      list.textContent.includes('Întrebarea <unu>') && !list.innerHTML.includes('<unu>'));
    check('arată sursa din bibliografie', list.textContent.includes('Legea 198/2023'));
    check('nu afișează scor în modul studiu', !/Scor/.test(list.textContent));

    pickChapter(w, 'Management');
    check('schimbarea capitolului schimbă grilele',
      list.querySelectorAll('.study-item').length === 1 &&
      list.textContent.includes('Întrebarea doi'));

    const q = d.getElementById('studySearch');
    q.value = 'doi';
    q.dispatchEvent(new w.Event('input'));
    check('căutarea text filtrează în capitol', list.querySelectorAll('.study-item').length === 1);
    q.value = 'zzz-inexistent';
    q.dispatchEvent(new w.Event('input'));
    check('mesaj clar când nu se potrivește nimic', /Nicio întrebare/.test(list.textContent));
  }

  // === 9. Pagina „Resurse" ===
  console.log('\n9. Resurse');
  {
    const st = seed();
    st.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(80);
    const d = w.document;
    const list = d.getElementById('resourcesList');

    check('afișează ambele resurse', list.querySelectorAll('.res-item').length === 2);
    check('grupează pe categorii', list.querySelectorAll('.res-group-title').length === 2);
    check('resursa cu link se deschide în tab nou',
      list.querySelector('a.res-item[target="_blank"]') !== null);
    check('linkul are rel="noopener"',
      list.querySelector('a.res-item').getAttribute('rel') === 'noopener');
    check('resursa fără link NU e un <a> mort',
      list.querySelectorAll('a.res-item').length === 1 &&
      list.querySelectorAll('div.res-item').length === 1);
    check('marchează sursele oficiale', list.querySelector('.chip.official') !== null);
    check('marchează sursele neoficiale', list.querySelector('.chip.unofficial') !== null);
    check('escapează descrierea din BD',
      list.textContent.includes('Legea <de baza>') && !list.innerHTML.includes('<de baza>'));

    const rq = d.getElementById('resSearch');
    rq.value = 'model';
    rq.dispatchEvent(new w.Event('input'));
    check('căutarea filtrează resursele', list.querySelectorAll('.res-item').length === 1);
  }

  // === 10. Harta transparentei ===
  console.log('\n10. Transparență — harta județelor');
  {
    const st = seed();
    st.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(80);
    const d = w.document;

    check('harta se randează ca SVG', d.querySelector('#mapWrap svg.ro-map') !== null);
    check('are 42 de județe (41 + București)',
      d.querySelectorAll('#mapWrap path.county').length === 42);
    check('Bucureștiul are marcaj rotund (e prea mic ca path)',
      d.querySelector('#mapWrap circle.county[data-code="B"]') !== null);
    check('etichetează doar județele cu posturi (Gorj, Iași)',
      d.querySelectorAll('#mapWrap .county-label').length === 2);

    // Culoarea trebuie sa vina din `style` inline: un atribut `fill` ar fi
    // suprascris de regula .ro-map .county din CSS si harta ar fi monocroma.
    const gjPath = d.querySelector('#mapWrap path.county[data-code="GJ"]');
    const cjPath = d.querySelector('#mapWrap path.county[data-code="CJ"]');
    check('județele colorate au fill inline, nu atribut',
      gjPath.style.fill !== '' && !gjPath.hasAttribute('fill'));
    check('județul cu posturi are altă culoare decât unul fără',
      gjPath.style.fill !== cjPath.style.fill);

    const gj = d.querySelector('#mapWrap path.county[data-code="GJ"]');
    check('județul Gorj există pe hartă', gj !== null);
    gj.dispatchEvent(new w.Event('click'));
    const panel = d.getElementById('countyPanel');
    check('panoul arată numele județului', /Gorj/.test(panel.querySelector('h3').textContent));
    check('listează școlile din Gorj',
      panel.textContent.includes('Școala Alfa') && panel.textContent.includes('Liceul Beta'));
    check('NU listează școala din Iași (deși are „Gorj" în nume)',
      !panel.textContent.includes('Colegiul Gorj-Vechi'));
    check('numără corect școlile și posturile',
      panel.querySelectorAll('.stat b')[0].textContent === '2' &&
      panel.querySelectorAll('.stat b')[1].textContent === '2');
    check('numără separat posturile de adjunct',
      panel.querySelectorAll('.stat b')[2].textContent === '1');
    check('județul selectat e evidențiat', gj.classList.contains('selected'));

    const cj = d.querySelector('#mapWrap path.county[data-code="CJ"]');
    cj.dispatchEvent(new w.Event('click'));
    check('județ fără posturi -> mesaj explicit, nu listă goală',
      /Niciun post vacant/.test(d.getElementById('countyPanel').textContent));

    const is = d.querySelector('#mapWrap path.county[data-code="IS"]');
    is.dispatchEvent(new w.Event('click'));
    check('potrivește judeţul Iaşi din BD cu cel de pe hartă',
      d.getElementById('countyPanel').textContent.includes('Colegiul Gorj-Vechi'));
  }

  // === 11. Normalizarea numelor de judete ===
  console.log('\n11. Potrivirea numelor de județe');
  {
    const st = seed();
    st.tables.vacant_positions = [
      { id: 1, county: 'Timis', school_name: 'Școala 1', position: 'Director', posted_date: '2026-09-10', source: null },
      { id: 2, county: 'Timiș', school_name: 'Școala 2', position: 'Director', posted_date: '2026-09-10', source: null },
      { id: 3, county: 'Municipiul București', school_name: 'Școala 3', position: 'Director', posted_date: '2026-09-10', source: null },
    ];
    st.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(80);
    const d = w.document;

    d.querySelector('#mapWrap path.county[data-code="TM"]').dispatchEvent(new w.Event('click'));
    const p1 = d.getElementById('countyPanel').textContent;
    check('doua grafii ale aceluiasi judet ajung impreuna',
      p1.includes('Școala 1') && p1.includes('Școala 2'));

    d.querySelector('#mapWrap circle.county[data-code="B"]').dispatchEvent(new w.Event('click'));
    check('prefixul „Municipiul" e ignorat la potrivire',
      d.getElementById('countyPanel').textContent.includes('Școala 3'));
  }


  // === 12. Project-ref cu lungime gresita (bugul „Failed to fetch") ===
  console.log('\n12. Project-ref de lungime greșită');
  {
    // URL-ul real care a produs eroarea: un „i" in plus -> 21 de caractere.
    const w = boot({ SUPABASE_URL: 'https://rafphnsjlxipijihefyus.supabase.co', SUPABASE_ANON_KEY: 'k' }, seed());
    await sleep(20);
    const box = w.document.getElementById('configError');
    check('blochează aplicația înainte de primul login', box.style.display === 'block');
    check('spune câte caractere are și câte ar trebui',
      /21 caractere/.test(box.textContent) && /exact 20/.test(box.textContent));
    check('ascunde formularul de login',
      w.document.getElementById('authSection').style.display === 'none');
  }


  // === 13. Explicatiile raspunsurilor ===
  console.log('\n13. Explicațiile răspunsurilor');
  {
    const st = seed();
    st.tables.questions[0].explanation = 'Pentru ca art. 195 spune asa <test>.';
    st.tables.questions[0].difficulty = 'avansat';
    st.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st);
    await sleep(80);
    const d = w.document;

    // modul studiu: explicatia e vizibila mereu
    pickChapter(w, 'Legislație');
    const study = d.getElementById('studyList');
    check('modul studiu afișează explicația',
      study.querySelector('.explanation') !== null &&
      study.textContent.includes('Pentru ca art. 195 spune asa'));
    check('modul studiu escapează explicația din BD',
      !study.innerHTML.includes('<test>'));
    check('modul studiu arată eticheta de dificultate',
      study.querySelector('.chip.diff-avansat') !== null);

    // tabul Teste: explicatia NU apare inainte de raspuns
    openTest(w, 0);
    await sleep(20);
    const cont = d.getElementById('questionContainer');
    check('testul NU arată explicația înainte de răspuns',
      cont.querySelector('.explanation') === null);

    const radios = cont.querySelectorAll('input[name="answer"]');
    radios[0].checked = true;
    radios[0].dispatchEvent(new w.Event('change'));
    await sleep(30);
    const after = d.getElementById('questionContainer');
    check('testul arată explicația DUPĂ ce ai răspuns',
      after.querySelector('.explanation') !== null &&
      after.textContent.includes('Pentru ca art. 195 spune asa'));

    // cautarea acopera si explicatia
    const q = d.getElementById('studySearch');
    q.value = 'art. 195 spune';
    q.dispatchEvent(new w.Event('input'));
    check('căutarea găsește text din explicație',
      study.querySelectorAll('.study-item').length === 1);

    // intrebare fara explicatie: nu randam bloc gol
    const st2 = seed();
    st2.session = { user: { id: 'u-1', email: 'ion@test.ro', user_metadata: {} } };
    const w2 = boot({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ANON_KEY: 'k' }, st2);
    await sleep(80);
    pickChapter(w2, 'Legislație');
    check('fără explicație nu se randează bloc gol',
      w2.document.getElementById('studyList').querySelector('.explanation') === null);
  }

  console.log('\n================================');
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('================================');
  process.exit(fail ? 1 : 0);
})();
