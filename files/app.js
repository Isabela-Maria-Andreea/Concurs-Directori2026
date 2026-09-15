// ===== Concurs Directori 2026 =====
// Logică: autentificare Supabase, modul teste, calendar, posturi vacante.
'use strict';

// ---------- STATE ----------
let db = null;                 // clientul Supabase
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;   // indexul in testul deschis, nu in tot setul
let tests = [];                // testele generate din setul de intrebari
let currentTestIndex = null;   // null = ecranul cu lista de teste

// Structura probei scrise: 20 de itemi, promovare cu nota 7.
const TEST_SIZE = 20;
const PASS_GRADE = 7;
let progress = {};             // { question_id: { answer: 'A', isCorrect: true } }
let positionsData = [];
let demoMode = false;          // true = date de test, nu salvăm nimic în BD

// ---------- UTILS ----------
function $(id) {
  return document.getElementById(id);
}

// Escapează textul venit din BD înainte de a-l pune în innerHTML.
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const RO_MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

function formatDate(isoDate) {
  if (!isoDate) return 'Dată nestabilită';
  const parts = String(isoDate).slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const monthName = RO_MONTHS[Number(m) - 1];
  return monthName ? `${Number(d)} ${monthName} ${y}` : isoDate;
}

function showMessage(containerId, message, type) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = message
    ? `<div class="${type === 'success' ? 'success-message' : 'error-message'}">${esc(message)}</div>`
    : '';
}

function clearErrors() {
  showMessage('authError', '');
  showMessage('signupError', '');
}

// Mesaje de eroare Supabase traduse, ca utilizatorul să înțeleagă ce s-a întâmplat.
function translateAuthError(err) {
  const raw = (err && err.message) || 'Eroare necunoscută';
  const map = {
    'Invalid login credentials': 'Email sau parolă incorectă.',
    'Email not confirmed': 'Contul nu e confirmat. Verifică emailul și apasă linkul de confirmare.',
    'User already registered': 'Există deja un cont cu acest email. Folosește "Conectare".',
    'Password should be at least 6 characters': 'Parola trebuie să aibă minim 6 caractere.',
  };
  if (map[raw]) return map[raw];
  if (/fetch|network|Failed to fetch/i.test(raw)) {
    return 'Nu s-a putut contacta Supabase. Verifică SUPABASE_URL din config.js și conexiunea la internet.';
  }
  return raw;
}

// ---------- BOOTSTRAP ----------
// Blochează aplicația cu un mesaj clar dacă configurarea e greșită, în loc să
// crape scriptul și să lase toate butoanele moarte (bugul original).
function fatalConfigError(html) {
  const box = $('configError');
  if (box) {
    box.innerHTML = html;
    box.style.display = 'block';
  }
  const auth = $('authSection');
  if (auth) auth.style.display = 'none';
  console.error('[config]', box ? box.textContent : html);
}

function initSupabase() {
  const cfg = window.APP_CONFIG || {};
  const url = (cfg.SUPABASE_URL || '').trim();
  const key = (cfg.SUPABASE_ANON_KEY || '').trim();

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    fatalConfigError('<strong>Biblioteca Supabase nu s-a încărcat.</strong><br>' +
      'Verifică tagul script din index.html și conexiunea la internet.');
    return false;
  }
  if (!url || !key || url.includes('YOUR_PROJECT')) {
    fatalConfigError('<strong>Configurare incompletă.</strong><br>' +
      'Deschide <code>config.js</code> și pune Project URL-ul tău din ' +
      'Supabase &rarr; Settings &rarr; API.');
    return false;
  }
  // Cauza bugului original: un spațiu în interiorul URL-ului.
  if (/\s/.test(url)) {
    fatalConfigError('<strong>SUPABASE_URL conține un spațiu.</strong><br>' +
      `Valoare primită: <code>${esc(url)}</code><br>` +
      'Șterge spațiul — formatul corect e <code>https://project-ref.supabase.co</code>.');
    return false;
  }
  const shape = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/i.exec(url);
  if (!shape) {
    fatalConfigError('<strong>SUPABASE_URL are format greșit.</strong><br>' +
      `Valoare primită: <code>${esc(url)}</code><br>` +
      'Aștept ceva de forma <code>https://project-ref.supabase.co</code>.');
    return false;
  }
  // Project-ref-ul Supabase are exact 20 de caractere. Fara verificarea asta,
  // o litera in plus sau in minus trece de validare, clientul se creeaza fara
  // eroare si abia primul login esueaza cu un vag „Failed to fetch".
  const ref = shape[1];
  if (ref.length !== 20) {
    fatalConfigError('<strong>SUPABASE_URL pare să conțină o greșeală de scriere.</strong><br>' +
      `Project-ref-ul <code>${esc(ref)}</code> are ${ref.length} caractere, dar Supabase ` +
      'folosește exact 20.<br>' +
      'Copiază URL-ul cu copy/paste din Supabase &rarr; Settings &rarr; API &rarr; Project URL.');
    return false;
  }

  try {
    db = window.supabase.createClient(url, key);
  } catch (err) {
    fatalConfigError(`<strong>Nu s-a putut crea clientul Supabase.</strong><br>${esc(err.message)}`);
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  wireUpEvents();
  if (!initSupabase()) return;

  // onAuthStateChange acoperă login, logout, refresh de token și revenirea
  // dintr-un link de confirmare pe email.
  db.auth.onAuthStateChange((_event, session) => {
    const nextUser = session ? session.user : null;
    const nextId = nextUser ? nextUser.id : null;
    const prevId = currentUser ? currentUser.id : null;
    currentUser = nextUser;
    if (nextId === prevId) return;
    if (currentUser) showApp(); else showAuth();
  });

  const { data, error } = await db.auth.getSession();
  if (error) console.error('getSession:', error);
  currentUser = data && data.session ? data.session.user : null;
  if (currentUser) showApp(); else showAuth();
});

// Toate handlerele sunt legate aici, ca să nu depindem de atribute inline
// și de variabila globală `event` (care nu e standard).
function wireUpEvents() {
  $('loginFormEl').addEventListener('submit', handleLogin);
  $('signupFormEl').addEventListener('submit', handleSignUp);
  $('toSignUp').addEventListener('click', showSignUp);
  $('toLogin').addEventListener('click', showLogin);
  $('logoutBtn').addEventListener('click', handleLogout);
  $('prevBtn').addEventListener('click', previousQuestion);
  $('nextBtn').addEventListener('click', nextQuestion);
  $('finishBtn').addEventListener('click', finishTest);
  $('backToTests').addEventListener('click', exitTest);
  $('countyFilter').addEventListener('change', renderPositions);
  $('positionSearch').addEventListener('input', renderPositions);
  $('studyCategory').addEventListener('change', renderStudy);
  $('studySearch').addEventListener('input', renderStudy);
  $('resCategory').addEventListener('change', renderResources);
  $('resSearch').addEventListener('input', renderResources);

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn, btn.dataset.tab));
  });
}

// ---------- AUTH ----------
function showLogin() {
  $('loginForm').style.display = 'block';
  $('signupForm').style.display = 'none';
  clearErrors();
}

function showSignUp() {
  $('loginForm').style.display = 'none';
  $('signupForm').style.display = 'block';
  clearErrors();
}

function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const btn = $('loginBtn');

  if (!email || !password) {
    showMessage('authError', 'Email și parolă sunt obligatorii.', 'error');
    return;
  }

  clearErrors();
  setBusy(btn, true, 'Se conectează...');
  const { error } = await db.auth.signInWithPassword({ email, password });
  setBusy(btn, false);

  // La succes, onAuthStateChange comută automat pe aplicație.
  if (error) showMessage('authError', translateAuthError(error), 'error');
}

async function handleSignUp(e) {
  e.preventDefault();
  const email = $('signupEmail').value.trim();
  const password = $('signupPassword').value;
  const county = $('signupCounty').value.trim();
  const btn = $('signupBtn');

  if (!email || !password) {
    showMessage('signupError', 'Email și parolă sunt obligatorii.', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('signupError', 'Parola trebuie să aibă minim 6 caractere.', 'error');
    return;
  }

  clearErrors();
  setBusy(btn, true, 'Se creează contul...');
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { county: county || null } },
  });
  setBusy(btn, false);

  if (error) {
    showMessage('signupError', translateAuthError(error), 'error');
    return;
  }

  // Supabase nu dă eroare dacă emailul e deja folosit (protecție anti-enumerare):
  // returnează un user cu lista `identities` goală.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    showMessage('signupError', 'Există deja un cont cu acest email. Folosește "Conectare".', 'error');
    return;
  }

  if (data.session) {
    // Confirmarea pe email e dezactivată -> suntem deja logați,
    // onAuthStateChange face restul.
    return;
  }

  showMessage('signupError',
    'Cont creat! Ți-am trimis un email de confirmare. Apasă linkul din email, apoi conectează-te.',
    'success');
}

async function handleLogout() {
  await db.auth.signOut();
  currentUser = null;
  progress = {};
  questions = [];
  positionsData = [];
  resourcesData = [];
  selectedCounty = null;
  currentQuestionIndex = 0;
  tests = [];
  currentTestIndex = null;
  showAuth();
}

function showAuth() {
  $('authSection').classList.remove('hidden');
  $('appSection').classList.remove('active');
  $('loginFormEl').reset();
  $('signupFormEl').reset();
  showLogin();
}

async function showApp() {
  $('authSection').classList.add('hidden');
  $('appSection').classList.add('active');
  $('userEmail').textContent = currentUser.email;

  const county = currentUser.user_metadata && currentUser.user_metadata.county;
  $('userCounty').textContent = county ? `Județ: ${county}` : '';

  await loadExam();
  loadCalendar();
  loadPositions();
  loadResources();
}

// ---------- EXAM ----------
async function loadExam() {
  demoMode = false;
  $('questionContainer').innerHTML = '<div class="loading">Se încarcă întrebări...</div>';

  const { data, error } = await db
    .from('questions')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Încărcare întrebări:', error);
    $('questionContainer').innerHTML =
      `<div class="error-message">Nu s-au putut încărca întrebările: ${esc(error.message)}</div>`;
    return;
  }

  questions = data || [];
  if (questions.length === 0) {
    demoMode = true;
    questions = demoQuestions();
  }

  await loadProgress();
  buildTests();
  currentTestIndex = null;
  currentQuestionIndex = 0;
  $('demoBadge').style.display = demoMode ? 'block' : 'none';
  renderExamTab();

  // Acelasi set de intrebari alimenteaza si tabul „Grile & raspunsuri".
  populateStudyCategories();
  renderStudy();
}

// Aduce răspunsurile salvate din cloud -> progresul persistă între sesiuni și dispozitive.
async function loadProgress() {
  progress = {};
  if (demoMode) return;

  const { data, error } = await db
    .from('exam_progress')
    .select('question_id, user_answer, is_correct')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Încărcare progres:', error);
    return;
  }
  (data || []).forEach((row) => {
    progress[row.question_id] = { answer: row.user_answer, isCorrect: row.is_correct };
  });
}

// ---------- TESTE ----------

// Imparte setul in teste de ~20 de itemi, fiecare cu intrebari din toate
// capitolele: distribuim categorie cu categorie, cate una pe test, iar cursorul
// merge mai departe intre categorii, ca resturile sa nu se adune intr-un test.
function buildTests() {
  const byCat = new Map();
  questions.forEach((q) => {
    const key = q.category || 'Altele';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key).push(q);
  });

  const count = Math.max(1, Math.round(questions.length / TEST_SIZE));
  const buckets = Array.from({ length: count }, () => []);
  let cursor = 0;

  [...byCat.keys()].sort((a, b) => a.localeCompare(b, 'ro')).forEach((key) => {
    byCat.get(key).forEach((q) => {
      buckets[cursor % count].push(q);
      cursor += 1;
    });
  });

  tests = buckets.map((qs, i) => ({ name: 'Testul ' + (i + 1), questions: qs }));
}

function examQuestions() {
  const test = tests[currentTestIndex];
  return test ? test.questions : [];
}

function testStats(test) {
  const total = test.questions.length;
  const answered = test.questions.filter((q) => progress[q.id]);
  const correct = answered.filter((q) => progress[q.id].isCorrect).length;
  const grade = total ? (10 * correct) / total : 0;
  return {
    total,
    answered: answered.length,
    correct,
    grade,
    complete: total > 0 && answered.length === total,
    passed: grade >= PASS_GRADE,
  };
}

// Cate corecte pe capitol - baza recomandarilor de la finalul testului.
function categoryBreakdown(test) {
  const rows = new Map();
  test.questions.forEach((q) => {
    const key = q.category || 'Altele';
    if (!rows.has(key)) rows.set(key, { category: key, total: 0, correct: 0 });
    const row = rows.get(key);
    row.total += 1;
    if (progress[q.id] && progress[q.id].isCorrect) row.correct += 1;
  });
  return [...rows.values()]
    .map((r) => ({ category: r.category, total: r.total, correct: r.correct,
                   pct: Math.round((100 * r.correct) / r.total) }))
    .sort((a, b) => a.pct - b.pct || a.category.localeCompare(b.category, 'ro'));
}

// Decide ce ecran e vizibil: lista de teste, testul deschis sau rezultatul.
function renderExamTab(view) {
  const picker = $('testPicker');
  const runner = $('testRunner');
  const result = $('testResult');
  if (!picker || !runner || !result) return;

  const showing = view || (currentTestIndex === null ? 'picker' : 'runner');
  picker.classList.toggle('hidden', showing !== 'picker');
  runner.classList.toggle('hidden', showing !== 'runner');
  result.classList.toggle('hidden', showing !== 'result');

  if (showing === 'picker') renderTestList();
  if (showing === 'runner') displayQuestion();
  if (showing === 'result') renderTestResult();
}

function renderTestList() {
  const list = $('testList');
  if (!list) return;

  if (!tests.length) {
    list.innerHTML = '<div class="loading">Nu sunt întrebări disponibile.</div>';
    return;
  }

  list.innerHTML = tests.map((test, i) => {
    const st = testStats(test);
    let state = 'Neînceput — ' + st.total + ' întrebări';
    let cls = '';
    if (st.complete) {
      state = 'Nota ' + st.grade.toFixed(2) + ' — ' + st.correct + '/' + st.total + ' corecte';
      cls = st.passed ? 'done' : 'failed';
    } else if (st.answered) {
      state = 'În lucru — ' + st.answered + '/' + st.total + ' rezolvate';
    }
    const label = st.answered ? (st.complete ? 'Vezi rezultatul' : 'Continuă') : 'Începe testul';
    return `
      <div class="test-card ${cls}">
        <h4>${esc(test.name)}</h4>
        <div class="test-sub">${st.total} întrebări din toate capitolele</div>
        <div class="test-state">${esc(state)}</div>
        <button type="button" data-test="${i}">${label}</button>
      </div>`;
  }).join('');

  list.querySelectorAll('button[data-test]').forEach((btn) => {
    btn.addEventListener('click', () => openTest(Number(btn.dataset.test)));
  });
}

function openTest(index) {
  const test = tests[index];
  if (!test) return;
  currentTestIndex = index;
  $('currentTestName').textContent = test.name;

  if (testStats(test).complete) {
    renderExamTab('result');
    return;
  }
  currentQuestionIndex = firstUnansweredIndex();
  renderExamTab('runner');
}

function exitTest() {
  currentTestIndex = null;
  renderExamTab('picker');
}

function finishTest() {
  renderExamTab('result');
}

function retakeTest() {
  const test = tests[currentTestIndex];
  if (!test) return;
  const ids = test.questions.map((q) => q.id);
  ids.forEach((id) => { delete progress[id]; });
  currentQuestionIndex = 0;
  renderExamTab('runner');

  // Stergem si din cloud, altfel progresul vechi reapare la reincarcare.
  if (!demoMode) {
    db.from('exam_progress')
      .delete()
      .eq('user_id', currentUser.id)
      .in('question_id', ids)
      .then((res) => {
        if (res && res.error) console.error('Resetare test:', res.error);
      });
  }
}

function renderTestResult() {
  const box = $('testResult');
  const test = tests[currentTestIndex];
  if (!box || !test) return;

  const st = testStats(test);
  const rows = categoryBreakdown(test);
  const weak = rows.filter((r) => r.pct < 70);
  const wrong = test.questions.filter((q) => progress[q.id] && !progress[q.id].isCorrect);

  const verdict = st.passed
    ? '✅ Promovat — ai trecut pragul de nota 7 al probei scrise.'
    : '❌ Nepromovat — proba scrisă se promovează cu minimum nota 7.';

  const left = st.total - st.answered;
  const leftNote = left
    ? `<p style="font-size:13px;color:#888;margin-top:4px;">
         ${left === 1 ? 'O întrebare a rămas' : left + ' întrebări au rămas'} fără răspuns
         și se punctează cu 0.
       </p>`
    : '';

  const table = rows.map((r) => `
    <tr class="${r.pct < 70 ? 'weak' : ''}">
      <td>${esc(r.category)}</td>
      <td class="num">${r.correct}/${r.total}</td>
      <td class="num">${r.pct}%</td>
    </tr>`).join('');

  let advice;
  if (!weak.length && st.passed) {
    advice = 'Stai bine pe toate capitolele din acest test. Treci la un test nou, ' +
      'ca să prinzi și întrebările care nu au intrat aici.';
  } else {
    const focus = weak.length ? weak : rows.slice(0, 2);
    advice = 'Capitolele de reluat, în ordinea urgenței:<ul>' +
      focus.map((r) => `<li><strong>${esc(r.category)}</strong> — ` +
        `${r.correct}/${r.total} (${r.pct}%)</li>`).join('') +
      '</ul>Deschide tabul „Grile &amp; răspunsuri", alege capitolul și citește explicațiile.';
  }

  const srcList = [...new Set(wrong.map((q) => q.source).filter(Boolean))];
  const sources = srcList.length
    ? '<div class="result-advice"><strong>Ce ai greșit, pe surse:</strong><ul>' +
      srcList.map((src) => `<li>${esc(src)}</li>`).join('') + '</ul></div>'
    : '';

  box.innerHTML = `
    <div class="result-card ${st.passed ? 'pass' : 'fail'}">
      <div class="result-grade">${st.grade.toFixed(2)}</div>
      <div class="result-verdict">${verdict}</div>
      <div style="font-size:14px;color:#555;">
        ${esc(test.name)} — ${st.correct} răspunsuri corecte din ${st.total}.
      </div>
      ${leftNote}
      <h4 style="margin:22px 0 8px;font-size:15px;">Pe capitole</h4>
      <table class="result-breakdown">
        <thead><tr><th>Capitol</th><th class="num">Corecte</th><th class="num">Procent</th></tr></thead>
        <tbody>${table}</tbody>
      </table>
      <div class="result-advice">${advice}</div>
      ${sources}
      <div class="result-actions">
        <button type="button" id="reviewBtn" style="flex:1;">Revezi întrebările</button>
        <button type="button" id="retakeBtn" style="flex:1;">Reia testul de la zero</button>
        <button type="button" id="resultBackBtn" style="flex:1;">Toate testele</button>
      </div>
    </div>`;

  $('reviewBtn').addEventListener('click', () => {
    currentQuestionIndex = 0;
    renderExamTab('runner');
  });
  $('retakeBtn').addEventListener('click', retakeTest);
  $('resultBackBtn').addEventListener('click', exitTest);
}

function firstUnansweredIndex() {
  const idx = examQuestions().findIndex((q) => !progress[q.id]);
  return idx === -1 ? 0 : idx;
}

function displayQuestion() {
  const container = $('questionContainer');
  const list = examQuestions();
  if (list.length === 0) {
    container.innerHTML = '<div class="loading">Nu sunt întrebări disponibile.</div>';
    return;
  }
  if (currentQuestionIndex >= list.length) currentQuestionIndex = 0;

  const q = list[currentQuestionIndex];
  const saved = progress[q.id];
  const answered = Boolean(saved);

  const options = ['A', 'B', 'C', 'D'].map((letter) => {
    const text = q['option_' + letter.toLowerCase()];
    if (!text) return '';

    // După ce a răspuns, marcăm vizual varianta corectă și, dacă e cazul, greșeala.
    let stateClass = '';
    if (answered) {
      if (letter === q.correct_answer) stateClass = 'correct';
      else if (letter === saved.answer) stateClass = 'incorrect';
    }
    const checked = saved && saved.answer === letter ? 'checked' : '';

    return `
      <label class="option ${stateClass}">
        <input type="radio" name="answer" value="${letter}" ${checked} ${answered ? 'disabled' : ''}>
        <strong>${letter})</strong> ${esc(text)}
      </label>`;
  }).join('');

  let feedback = '';
  if (answered) {
    feedback = saved.isCorrect
      ? '<div class="success-message">✅ Răspuns corect!</div>'
      : `<div class="error-message">❌ Răspuns greșit. Varianta corectă este ${esc(q.correct_answer)}.</div>`;
    // Explicatia se arata DOAR dupa ce a raspuns, ca sa nu strice testul.
    if (q.explanation) {
      feedback += `<div class="explanation"><strong>De ce:</strong> ${esc(q.explanation)}</div>`;
    }
  }

  container.innerHTML = `
    <div class="question-text">${esc(q.text)}</div>
    <div class="options">${options}</div>
    ${feedback}
    <div class="source-text">📌 Sursa: ${esc(q.source || 'Bibliografie oficială')}</div>
    <div id="saveStatus" class="save-status"></div>`;

  // Legăm după randare, ca să nu folosim atribute inline.
  container.querySelectorAll('input[name="answer"]').forEach((input) => {
    input.addEventListener('change', () => selectAnswer(input.value));
  });

  $('questionNumber').textContent = currentQuestionIndex + 1;
  $('totalQuestions').textContent = list.length;
  $('prevBtn').disabled = currentQuestionIndex === 0;
  $('nextBtn').disabled = currentQuestionIndex === list.length - 1;
  updateScore();
}

async function selectAnswer(answer) {
  const q = examQuestions()[currentQuestionIndex];
  const isCorrect = answer === q.correct_answer;

  // Optimist: arătăm imediat feedbackul, apoi confirmăm salvarea.
  progress[q.id] = { answer, isCorrect };
  displayQuestion();

  if (demoMode) {
    setSaveStatus('Mod demo — răspunsul nu se salvează.', false);
    return;
  }

  setSaveStatus('Se salvează...', false);
  const { error } = await db.from('exam_progress').upsert(
    {
      user_id: currentUser.id,
      question_id: q.id,
      user_answer: answer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,question_id' }
  );

  if (error) {
    console.error('Salvare răspuns:', error);
    setSaveStatus(`Nu s-a putut salva: ${error.message}`, true);
  } else {
    setSaveStatus('✔ Salvat în cont', false);
  }
}

function setSaveStatus(text, isError) {
  const el = $('saveStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#e74c3c' : '#27ae60';
}

function nextQuestion() {
  if (currentQuestionIndex < examQuestions().length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

function updateScore() {
  const answered = examQuestions().filter((q) => progress[q.id]);
  const correct = answered.filter((q) => progress[q.id].isCorrect).length;
  // Procentul se calculează din întrebările la care s-a răspuns, nu din total,
  // ca scorul să nu pară mereu mic la începutul testului.
  const percentage = answered.length ? Math.round((correct / answered.length) * 100) : 0;
  $('score').textContent = percentage;
  $('answeredCount').textContent = `${correct}/${answered.length} corecte`;
}

function demoQuestions() {
  return [{
    id: 'demo-1',
    text: 'Care sunt componentele principale ale managementului educațional?',
    option_a: 'Planificare, organizare, coordonare, control',
    option_b: 'Doar activitatea de predare',
    option_c: 'Doar administrarea bugetului',
    option_d: 'Niciuna dintre variantele de mai sus',
    correct_answer: 'A',
    source: 'Legea învățământului preuniversitar nr. 198/2023',
  }];
}

// ---------- CALENDAR ----------
async function loadCalendar() {
  const list = $('calendarList');
  const { data, error } = await db
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Calendar:', error);
    list.innerHTML = `<div class="error-message">Nu s-a putut încărca calendarul: ${esc(error.message)}</div>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="loading">Nu sunt evenimente publicate încă.</div>';
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  list.innerHTML = data.map((ev) => {
    const isPast = String(ev.event_date).slice(0, 10) < today;
    return `
      <div class="card-item ${isPast ? 'past' : ''}">
        <strong>${esc(ev.event_name)}</strong>
        ${isPast ? '<span class="badge">trecut</span>' : '<span class="badge upcoming">urmează</span>'}
        <br>📅 ${esc(formatDate(ev.event_date))}${ev.county ? ` — ${esc(ev.county)}` : ' — Național'}
        ${ev.description ? `<br><small>${esc(ev.description)}</small>` : ''}
      </div>`;
  }).join('');
}

// ---------- POSTURI VACANTE ----------
async function loadPositions() {
  const list = $('positionsList');
  const { data, error } = await db
    .from('vacant_positions')
    .select('*')
    .order('county', { ascending: true })
    .order('school_name', { ascending: true });

  if (error) {
    console.error('Posturi:', error);
    list.innerHTML = `<div class="error-message">Nu s-au putut încărca posturile: ${esc(error.message)}</div>`;
    return;
  }

  positionsData = data || [];
  populateCountyFilter();
  renderPositions();
  renderMap();          // harta din tabul „Transparenta" foloseste aceleasi date
}

// Dropdown-ul de județe se construiește din datele reale, nu hardcodat.
function populateCountyFilter() {
  const select = $('countyFilter');
  const counties = [...new Set(positionsData.map((p) => p.county).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ro'));

  const previous = select.value;
  select.innerHTML = '<option value="">Toate județele</option>' +
    counties.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (counties.includes(previous)) select.value = previous;
}

// Filtrarea se face pe date, nu pe textul din DOM: altfel căutarea după "Gorj"
// prindea și școli care au cuvântul în nume, iar filtrul se pierdea la re-randare.
function renderPositions() {
  const county = $('countyFilter').value;
  const term = $('positionSearch').value.trim().toLowerCase();

  const filtered = positionsData.filter((p) => {
    if (county && p.county !== county) return false;
    if (!term) return true;
    return `${p.school_name} ${p.position}`.toLowerCase().includes(term);
  });

  $('positionsCount').textContent = positionsData.length
    ? `${filtered.length} din ${positionsData.length} posturi`
    : '';

  if (positionsData.length === 0) {
    $('positionsList').innerHTML = '<div class="loading">Nu sunt posturi publicate încă.</div>';
    return;
  }
  if (filtered.length === 0) {
    $('positionsList').innerHTML =
      '<div class="loading">Niciun post nu corespunde filtrului ales.</div>';
    return;
  }

  $('positionsList').innerHTML = filtered.map((p) => `
    <div class="card-item">
      <strong>${esc(p.school_name)}</strong> — ${esc(p.county)}<br>
      📌 ${esc(p.position)}<br>
      <small>Publicat: ${esc(formatDate(p.posted_date))}</small>
      ${p.source ? `<br><small><a href="${esc(p.source)}" target="_blank" rel="noopener">Sursa oficială</a></small>` : ''}
    </div>`).join('');
}

// ---------- TABS ----------
function switchTab(button, tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((el) => el.classList.remove('active'));
  $(tab + 'Tab').classList.add('active');
  button.classList.add('active');
}

// ============================================================
// MOD STUDIU - toate grilele cu raspunsul corect vizibil
// ============================================================

// Reia `questions`, incarcat deja de loadExam(). Nu mai interogam inca o data.
function renderStudy() {
  const list = $('studyList');
  if (!list) return;

  if (!questions.length) {
    list.innerHTML = '<div class="loading">Nu sunt întrebări disponibile.</div>';
    $('studyCount').textContent = '';
    return;
  }

  const cat = $('studyCategory').value;
  const term = $('studySearch').value.trim().toLowerCase();

  // Fara capitol ales nu afisam nimic: culegerea intreaga e prea lunga ca sa ajute.
  if (!cat) {
    list.innerHTML = '<div class="loading">Alege un capitol din lista de mai sus ' +
      'ca să vezi grilele din el.</div>';
    $('studyCount').textContent = '';
    return;
  }

  const filtered = questions.filter((q) => {
    if (cat && (q.category || '') !== cat) return false;
    if (!term) return true;
    const hay = [q.text, q.option_a, q.option_b, q.option_c, q.option_d,
                 q.source, q.explanation]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(term);
  });

  $('studyCount').textContent = `${filtered.length} din ${questions.length} întrebări`;

  if (!filtered.length) {
    list.innerHTML = '<div class="loading">Nicio întrebare nu corespunde filtrului.</div>';
    return;
  }

  list.innerHTML = filtered.map((q, i) => {
    const opts = ['A', 'B', 'C', 'D'].map((letter) => {
      const text = q['option_' + letter.toLowerCase()];
      if (!text) return '';
      const ok = letter === q.correct_answer;
      return `<div class="study-opt ${ok ? 'is-correct' : ''}">
                <strong>${letter})</strong> ${esc(text)}${ok ? ' ✅' : ''}
              </div>`;
    }).join('');

    return `
      <div class="study-item">
        <div class="q"><span class="num">${i + 1}.</span>${esc(q.text)}</div>
        ${opts}
        ${q.explanation ? `<div class="explanation"><strong>De ce:</strong> ${esc(q.explanation)}</div>` : ''}
        <div class="study-meta">
          ${q.category ? `<span class="chip">${esc(q.category)}</span>` : ''}
          ${q.difficulty ? `<span class="chip diff-${esc(q.difficulty)}">${esc(q.difficulty)}</span>` : ''}
          <span>📌 ${esc(q.source || 'Bibliografie oficială')}</span>
        </div>
      </div>`;
  }).join('');
}

function populateStudyCategories() {
  const select = $('studyCategory');
  if (!select) return;
  const cats = [...new Set(questions.map((q) => q.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ro'));
  const previous = select.value;
  select.innerHTML = '<option value="">— alege un capitol —</option>' +
    cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (cats.includes(previous)) select.value = previous;
}

// ============================================================
// RESURSE
// ============================================================
let resourcesData = [];

async function loadResources() {
  const list = $('resourcesList');
  if (!list) return;

  const { data, error } = await db
    .from('resources')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('Resurse:', error);
    // 42P01 / PGRST205 = tabelul nu exista inca -> mesaj util, nu cod de eroare brut.
    const missing = /schema cache|does not exist|relation/i.test(error.message || '');
    list.innerHTML = `<div class="error-message">${missing
      ? 'Tabelul <code>resources</code> nu există încă. Rulează <code>migration.sql</code> (sau <code>schema.sql</code>) în Supabase → SQL Editor.'
      : `Nu s-au putut încărca resursele: ${esc(error.message)}`}</div>`;
    return;
  }

  resourcesData = data || [];
  populateResourceCategories();
  renderResources();
}

function populateResourceCategories() {
  const select = $('resCategory');
  if (!select) return;
  const cats = [...new Set(resourcesData.map((r) => r.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ro'));
  const previous = select.value;
  select.innerHTML = '<option value="">Toate categoriile</option>' +
    cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (cats.includes(previous)) select.value = previous;
}

function renderResources() {
  const list = $('resourcesList');
  if (!list) return;

  const cat = $('resCategory').value;
  const term = $('resSearch').value.trim().toLowerCase();

  const filtered = resourcesData.filter((r) => {
    if (cat && (r.category || '') !== cat) return false;
    if (!term) return true;
    return `${r.title} ${r.description || ''} ${r.kind || ''}`.toLowerCase().includes(term);
  });

  $('resCount').textContent = resourcesData.length
    ? `${filtered.length} din ${resourcesData.length} resurse`
    : '';

  if (!resourcesData.length) {
    list.innerHTML = '<div class="loading">Nu sunt resurse publicate încă. ' +
      'Adaugă-le din Supabase → Table Editor → <code>resources</code>.</div>';
    return;
  }
  if (!filtered.length) {
    list.innerHTML = '<div class="loading">Nicio resursă nu corespunde filtrului.</div>';
    return;
  }

  // Gruparea pe categorie pastreaza ordinea data de sort_order.
  const groups = new Map();
  filtered.forEach((r) => {
    const key = r.category || 'Altele';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  let html = '';
  groups.forEach((items, category) => {
    html += `<div class="res-group-title">${esc(category)}</div>`;
    html += items.map((r) => {
      const meta = `
        <div class="m">
          <span class="chip ${r.official ? 'official' : 'unofficial'}">
            ${r.official ? 'oficial' : 'neoficial'}
          </span>
          ${r.kind ? `<span class="chip">${esc(r.kind)}</span>` : ''}
          ${r.published_date ? `<span style="font-size:12px;color:#999;">${esc(formatDate(r.published_date))}</span>` : ''}
          ${r.url ? '<span style="font-size:12px;color:#667eea;">deschide ↗</span>' : ''}
        </div>`;
      const inner = `
        <div class="t">${esc(r.title)}</div>
        ${r.description ? `<div class="d">${esc(r.description)}</div>` : ''}
        ${meta}`;

      // Fara link -> nu randam un <a> mort, ci un simplu bloc.
      return r.url
        ? `<a class="res-item" href="${esc(r.url)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="res-item">${inner}</div>`;
    }).join('');
  });

  list.innerHTML = html;
}

// ============================================================
// TRANSPARENTA - harta judetelor
// ============================================================
let selectedCounty = null;      // codul judetului selectat (ex: 'GJ')

// Numele judetelor vin din doua surse independente: harta (ro-map.js) si
// coloana `county` din Supabase. Le comparam normalizat, ca "Timiș", "Timis"
// si " timis " sa fie acelasi judet.
function normCounty(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^municipiul\s+/, '')
    .replace(/^jude(?:t|ț)ul\s+/, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // ă î â -> a i a
    .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')        // formele fara NFD
    .replace(/[^a-z]/g, '');
}

// Nuanta de mov proportionala cu numarul de posturi (0 = gri deschis).
function countyColor(count, max) {
  if (!count) return '#dfe3f3';
  const t = max > 1 ? (count - 1) / (max - 1) : 1;   // 0..1
  const from = [188, 196, 234];
  const to = [74, 86, 184];
  const mix = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${mix.join(',')})`;
}

function positionsByCounty() {
  const byNorm = new Map();
  positionsData.forEach((p) => {
    const key = normCounty(p.county);
    if (!byNorm.has(key)) byNorm.set(key, []);
    byNorm.get(key).push(p);
  });
  return byNorm;
}

function renderMap() {
  const wrap = $('mapWrap');
  if (!wrap) return;

  const map = window.RO_MAP;
  if (!map || !Array.isArray(map.counties)) {
    wrap.innerHTML = '<div class="error-message">Harta nu s-a încărcat. ' +
      'Verifică tagul <code>&lt;script src="ro-map.js"&gt;</code> din index.html.</div>';
    return;
  }

  const byCounty = positionsByCounty();
  const max = Math.max(1, ...[...byCounty.values()].map((a) => a.length));

  const paths = map.counties.map((c) => {
    const n = (byCounty.get(normCounty(c.name)) || []).length;
    const label = n === 1 ? '1 post vacant' : `${n} posturi vacante`;
    return `<path class="county" d="${c.d}" data-code="${esc(c.code)}"
              style="fill:${countyColor(n, max)}"><title>${esc(c.name)} — ${label}</title></path>`;
  }).join('');

  // Bucurestiul e prea mic ca sa fie tinta de click; ii punem un marcaj rotund.
  const b = map.counties.find((c) => c.code === 'B');
  const bCount = (byCounty.get('bucuresti') || []).length;
  const marker = b ? `<circle class="county" data-code="B" cx="${b.cx}" cy="${b.cy}" r="9"
      style="fill:${countyColor(bCount, max)}"
      stroke="#fff" stroke-width="2"><title>București — ${bCount} posturi vacante</title></circle>` : '';

  // Eticheta Ilfovului sta exact peste marcajul Bucurestiului -> o mutam.
  const LABEL_OFFSET = { IF: [26, -14] };

  // Etichete doar pentru judetele cu posturi: altfel harta devine ilizibila.
  const labels = map.counties.filter((c) => byCounty.has(normCounty(c.name)) && c.code !== 'B')
    .map((c) => {
      const [dx, dy] = LABEL_OFFSET[c.code] || [0, 0];
      return `<text class="county-label" x="${c.cx + dx}" y="${c.cy + 5 + dy}">${esc(c.code)}</text>`;
    })
    .join('');

  wrap.innerHTML = `<svg class="ro-map" viewBox="0 0 ${map.width} ${map.height}"
      role="img" aria-label="Harta județelor României">
      ${paths}${marker}${labels}</svg>`;

  wrap.querySelectorAll('.county').forEach((el) => {
    el.addEventListener('click', () => selectCounty(el.dataset.code));
  });

  const scale = $('legendScale');
  if (scale) {
    scale.innerHTML = [1, 2, 3, 4].map((step) => {
      const n = Math.round((step / 4) * max);
      return `<i style="background:${countyColor(Math.max(1, n), max)}"></i>`;
    }).join('');
    $('legendMax').textContent = `${max} posturi`;
  }

  if (selectedCounty) selectCounty(selectedCounty);
}

function selectCounty(code) {
  selectedCounty = code;
  const map = window.RO_MAP;
  const county = map.counties.find((c) => c.code === code);
  if (!county) return;

  document.querySelectorAll('.ro-map .county').forEach((el) => {
    el.classList.toggle('selected', el.dataset.code === code);
  });

  const items = positionsByCounty().get(normCounty(county.name)) || [];
  const panel = $('countyPanel');

  // Grupam pe scoala: o scoala poate avea si director, si director adjunct.
  const schools = new Map();
  items.forEach((p) => {
    if (!schools.has(p.school_name)) schools.set(p.school_name, []);
    schools.get(p.school_name).push(p);
  });

  const stats = `
    <div class="county-stats">
      <div class="stat"><b>${schools.size}</b><span>școli</span></div>
      <div class="stat"><b>${items.length}</b><span>posturi</span></div>
      <div class="stat"><b>${items.filter((p) => /adjunct/i.test(p.position)).length}</b><span>adjunct</span></div>
    </div>`;

  let body;
  if (!items.length) {
    body = '<div class="loading">Niciun post vacant publicat în acest județ.</div>';
  } else {
    body = [...schools.entries()].map(([school, list]) => `
      <div class="school-item">
        <div class="nm">${esc(school)}</div>
        ${list.map((p) => `<div class="pos">📌 ${esc(p.position)}
          <small style="color:#999;">— ${esc(formatDate(p.posted_date))}</small>
          ${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener" style="font-size:12px;"> sursa ↗</a>` : ''}
        </div>`).join('')}
      </div>`).join('');
  }

  panel.innerHTML = `
    <h3>${esc(county.name)}</h3>
    <div class="sub">Posturi vacante de conducere</div>
    ${stats}${body}`;
}
