bash

cat /home/claude/mates-jorge/public/app.js
Salida

// ─── ESTADO ───────────────────────────────────────────────────────
let currentUser = null;
let currentRole = null;
let sessionData = {};
let exercises = [];
let exerciseState = []; // {hintShown, attempts, submitted, correct}

// ─── UTILIDADES ───────────────────────────────────────────────────
function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function rInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { let t = b; b = a % b; a = t; } return a; }
function simplify(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }
function frac(n, d) { return `${n}/${d}`; }
function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}
function formatDateES(str) {
  const [y,m,d] = str.split('-');
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const dt = new Date(y, m-1, d);
  return `${days[dt.getDay()]}, ${parseInt(d)} de ${months[m-1]}`;
}

// ─── API ──────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  return res.json();
}

// ─── AUTH ─────────────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('userInput').value.trim();
  const password = document.getElementById('passInput').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  try {
    const data = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    if (data.error) { errEl.textContent = data.error; errEl.style.display = 'block'; return; }
    currentUser = data.username;
    currentRole = data.role;
    if (currentRole === 'teacher') { await showProf(); }
    else { await showHome(); }
  } catch { errEl.textContent = 'Error de conexión.'; errEl.style.display = 'block'; }
}

function doLogout() {
  currentUser = null; currentRole = null; sessionData = {};
  showScreen('loginScreen');
  document.getElementById('userInput').value = '';
  document.getElementById('passInput').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});

// ─── PANTALLAS ────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function showHome() {
  showScreen('homeScreen');
  document.getElementById('navGreeting').textContent = `Hola, ${currentUser} 👋`;
  // Cargar sesiones
  const sessions = await apiFetch(`/api/sessions/${currentUser}`);
  sessionData = {};
  if (Array.isArray(sessions)) sessions.forEach(s => { sessionData[s.date] = s; });
  updateStats();
  renderCalendar('calContainer', ['jorge', 'test'].includes(currentUser));
  updateTodayCard();
}

function updateStats() {
  const done = Object.values(sessionData).filter(s => s.completed).length;
  document.getElementById('statDone').textContent = done;
  // Racha
  let streak = 0, d = new Date();
  while (true) {
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (sessionData[k]?.completed) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  document.getElementById('statStreak').textContent = streak;
  // Nota media
  const completed = Object.values(sessionData).filter(s => s.completed);
  const avg = completed.length ? (completed.reduce((a, s) => a + s.score, 0) / completed.length).toFixed(1) : '0';
  document.getElementById('statAvg').textContent = `${avg}/4`;
  // Días restantes (cuenta desde hoy hasta 31 agosto)
  const end = new Date(2026, 7, 31);
  const today = new Date(); today.setHours(0,0,0,0);
  const left = Math.max(0, Math.round((end - today) / 86400000));
  document.getElementById('statLeft').textContent = left;
}

function updateTodayCard() {
  const tk = todayStr();
  const done = sessionData[tk]?.completed;
  document.getElementById('todayTitle').textContent = `Ejercicios del ${formatDateES(tk)}`;
  document.getElementById('todayDate').textContent = '';
  const badge = document.getElementById('todayBadge');
  const msg = document.getElementById('todayMsg');
  const btn = document.getElementById('startBtn');
  if (done) {
    badge.className = 'badge badge-success'; badge.textContent = '¡completado!';
    msg.textContent = `¡Genial! Has sacado ${sessionData[tk].score}/4 hoy. ¡Sigue así!`;
    btn.style.display = 'none';
  } else {
    badge.className = 'badge badge-info'; badge.textContent = 'pendiente';
    msg.textContent = 'Tienes 4 ejercicios esperándote hoy. ¡A por ellos!';
    btn.style.display = '';
  }
}

function renderCalendar(containerId, highlightUser = true) {
  const container = document.getElementById(containerId);
  const months = [
    { year: 2026, month: 6, name: 'Junio' },
    { year: 2026, month: 7, name: 'Julio' },
    { year: 2026, month: 8, name: 'Agosto' }
  ];
  const wdays = ['L','M','X','J','V','S','D'];
  const today = new Date(); today.setHours(0,0,0,0);

  container.innerHTML = `<div class="cal-months">${months.map(({ year, month, name }) => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    let days = '';
    for (let i = 0; i < offset; i++) days += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isWeekend = [0, 6].includes(dt.getDay());
      const isToday = dt.getTime() === today.getTime();
      const isDone = highlightUser && sessionData[key]?.completed;
      let cls = 'cal-day';
      if (isDone) cls += ' done';
      else if (isToday) cls += ' today';
      else if (isWeekend) cls += ' weekend';
      days += `<div class="${cls}" title="${key}">${d}</div>`;
    }
    return `<div>
      <div class="cal-month-title">${name}</div>
      <div class="cal-weekdays">${wdays.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="cal-days">${days}</div>
    </div>`;
  }).join('')}</div>`;
}

// ─── EJERCICIOS ───────────────────────────────────────────────────
function goExercises() {
  const tk = todayStr();
  const seed = parseInt(tk.replace(/-/g, ''));
  exercises = generateSession(seed);
  exerciseState = exercises.map(() => ({ hintShown: false, attempts: 0, submitted: false, correct: false }));
  renderExercises();
  document.getElementById('exDateLabel').textContent = formatDateES(tk);
  showScreen('exerciseScreen');
}

function generateSession(seed) {
  const rng = seededRng(seed);
  const topics = ['enteros', 'fracciones', 'proporcionalidad', 'porcentajes', 'regla3'];
  const topic1 = topics[Math.floor(rng() * topics.length)];
  return [
    generateExercise(topic1, rng),
    generateExercise('ec1', rng),
    generateExercise('ec2', rng),
    generateExercise('problema', rng)
  ];
}

function generateExercise(topic, rng) {
  if (topic === 'enteros') return genEnteros(rng);
  if (topic === 'fracciones') return genFracciones(rng);
  if (topic === 'proporcionalidad') return genProporcionalidad(rng);
  if (topic === 'porcentajes') return genPorcentajes(rng);
  if (topic === 'regla3') return genRegla3(rng);
  if (topic === 'ec1') return genEc1(rng);
  if (topic === 'ec2') return genEc2(rng);
  if (topic === 'problema') return genProblema(rng);
  return genEc1(rng);
}

function genEnteros(rng) {
  const ops = ['+', '-', '×', '÷'];
  const op = ops[Math.floor(rng() * 4)];
  let a = rInt(rng, -20, 20), b = rInt(rng, -20, 20), res, steps;
  if (op === '+') { res = a + b; steps = [`Sumamos considerando signos: (${a}) + (${b}) = ${res}`]; }
  else if (op === '-') { res = a - b; steps = [`Cambiar signo al restar: (${a}) − (${b}) = ${a} + (${-b}) = ${res}`]; }
  else if (op === '×') {
    a = rInt(rng, -12, 12); b = rInt(rng, -12, 12); res = a * b;
    const sign = ((a < 0) === (b < 0)) ? 'positivo' : 'negativo';
    steps = [`|${a}| × |${b}| = ${Math.abs(res)}`, `Los signos son ${sign}.`, `Resultado: ${res}`];
  } else {
    b = rInt(rng, 1, 10) * (rng() > 0.5 ? 1 : -1);
    a = b * rInt(rng, 1, 10); res = a / b;
    const sign = ((a < 0) === (b < 0)) ? 'positivo' : 'negativo';
    steps = [`|${a}| ÷ |${b}| = ${Math.abs(res)}`, `Los signos dan resultado ${sign}.`, `Resultado: ${res}`];
  }
  return {
    topic: 'Números enteros',
    question: `Calcula: (${a}) ${op} (${b}) = ?`,
    answers: [{ label: '', key: 'x' }],
    correctAnswers: { x: String(res) },
    steps,
    hint: 'Recuerda: menos × menos = más, menos × más = menos. Aplica la regla de signos antes de operar.'
  };
}

function genFracciones(rng) {
  const tipos = ['suma', 'resta', 'multiplicacion', 'division'];
  const tipo = tipos[Math.floor(rng() * tipos.length)];
  let a1 = rInt(rng, 1, 9), b1 = rInt(rng, 2, 9), a2 = rInt(rng, 1, 9), b2 = rInt(rng, 2, 9);
  let question, answer, steps;
  if (tipo === 'suma' || tipo === 'resta') {
    const mcm = (b1 * b2) / gcd(b1, b2);
    const n1 = a1 * (mcm / b1), n2 = a2 * (mcm / b2);
    const nr = tipo === 'suma' ? n1 + n2 : n1 - n2;
    const [sn, sd] = simplify(nr, mcm);
    answer = sd === 1 ? String(sn) : `${sn}/${sd}`;
    const op = tipo === 'suma' ? '+' : '−';
    question = `Calcula: ${frac(a1, b1)} ${op} ${frac(a2, b2)} = ?`;
    steps = [`mcm(${b1}, ${b2}) = ${mcm}`, `Convertimos: ${frac(n1, mcm)} ${op} ${frac(n2, mcm)}`, `Operamos numeradores: ${nr}`, `Fracción: ${frac(nr, mcm)}`, `Simplificada: ${answer}`];
  } else if (tipo === 'multiplicacion') {
    const [sn, sd] = simplify(a1 * a2, b1 * b2);
    answer = sd === 1 ? String(sn) : `${sn}/${sd}`;
    question = `Calcula: ${frac(a1, b1)} × ${frac(a2, b2)} = ?`;
    steps = [`Multiplicamos numeradores: ${a1}×${a2}=${a1*a2}`, `Multiplicamos denominadores: ${b1}×${b2}=${b1*b2}`, `Fracción: ${frac(a1*a2, b1*b2)}`, `Simplificada: ${answer}`];
  } else {
    const [sn, sd] = simplify(a1 * b2, b1 * a2);
    answer = sd === 1 ? String(sn) : `${sn}/${sd}`;
    question = `Calcula: ${frac(a1, b1)} ÷ ${frac(a2, b2)} = ?`;
    steps = [`Dividir = multiplicar por la inversa`, `${frac(a1, b1)} × ${frac(b2, a2)}`, `Resultado: ${frac(a1*b2, b1*a2)}`, `Simplificada: ${answer}`];
  }
  return { topic: 'Fracciones', question, answers: [{ label: '', key: 'x' }], correctAnswers: { x: answer }, steps, hint: 'Busca el mínimo común múltiplo (mcm) de los denominadores para poder operar.' };
}

function genProporcionalidad(rng) {
  const a = rInt(rng, 2, 15), b = rInt(rng, 2, 15), c = rInt(rng, 2, 15);
  const res = (b * c) / a;
  if (!Number.isInteger(res)) return genProporcionalidad(rng);
  return {
    topic: 'Proporcionalidad directa',
    question: `Si ${a} artículos cuestan ${b} €, ¿cuánto cuestan ${c} artículos?`,
    answers: [{ label: 'Resultado (€)', key: 'x' }],
    correctAnswers: { x: String(res) },
    steps: [`Razón: ${b}€ / ${a} artículos = ${(b/a).toFixed(2)} € por artículo`, `${c} artículos × ${(b/a).toFixed(2)} = ${res} €`],
    hint: 'Escribe los datos en forma de tabla:\n' + `${a} artículos → ${b} €\n${c} artículos → ¿x?\nComprueba si es directa (más→más) o inversa (más→menos).`
  };
}

function genPorcentajes(rng) {
  const tipo = ['calcular', 'porcentaje_de', 'descuento'][Math.floor(rng() * 3)];
  let question, answer, steps;
  if (tipo === 'calcular') {
    const total = rInt(rng, 2, 20) * 10, p = rInt(rng, 1, 9) * 10;
    const res = (total * p) / 100;
    question = `¿Cuánto es el ${p}% de ${total}?`;
    steps = [`Fórmula: (${p}/100) × ${total} = ${res}`];
    answer = String(res);
  } else if (tipo === 'porcentaje_de') {
    const p = rInt(rng, 1, 9) * 10, total = p * rInt(rng, 2, 10);
    const parte = (total * p) / 100;
    question = `${parte} es el ${p}% de ¿qué número?`;
    steps = [`parte = (porcentaje/100) × total`, `${parte} = (${p}/100) × total`, `total = ${parte}×100/${p} = ${total}`];
    answer = String(total);
  } else {
    const precio = rInt(rng, 2, 20) * 10, desc = rInt(rng, 1, 4) * 10;
    const ahorro = (precio * desc) / 100, final = precio - ahorro;
    question = `Un artículo cuesta ${precio} € y tiene un descuento del ${desc}%. ¿Cuánto pagas?`;
    steps = [`Ahorro: ${desc}% de ${precio} = ${ahorro} €`, `Precio final: ${precio} − ${ahorro} = ${final} €`];
    answer = String(final);
  }
  return { topic: 'Porcentajes', question, answers: [{ label: '', key: 'x' }], correctAnswers: { x: answer }, steps, hint: 'Fórmula: parte = (porcentaje / 100) × total' };
}

function genRegla3(rng) {
  const tipo = ['directa', 'inversa', 'compuesta'][Math.floor(rng() * 3)];
  let question, answer, steps;
  if (tipo === 'directa') {
    const a = rInt(rng, 2, 10), b = rInt(rng, 2, 10) * a, c = rInt(rng, 2, 10);
    const res = b * c / a;
    if (!Number.isInteger(res)) return genRegla3(rng);
    question = `Si ${a} obreros producen ${b} piezas, ¿cuántas producen ${c} obreros?`;
    steps = ['A más obreros → más piezas (directa)', `x = (${b} × ${c}) / ${a} = ${res}`];
    answer = String(res);
  } else if (tipo === 'inversa') {
    const a = rInt(rng, 2, 8), b = rInt(rng, 2, 8) * a, c = rInt(rng, 2, 8);
    const res = (a * b) / c;
    if (!Number.isInteger(res)) return genRegla3(rng);
    question = `${a} máquinas tardan ${b} horas. ¿Cuánto tardan ${c} máquinas?`;
    steps = ['A más máquinas → menos horas (inversa)', `x = (${a} × ${b}) / ${c} = ${res} horas`];
    answer = String(res);
  } else {
    const a = rInt(rng, 2, 5), b = rInt(rng, 2, 5), dias = rInt(rng, 2, 8);
    const total = a * b * dias, c = rInt(rng, 2, 5), d = rInt(rng, 2, 5);
    const res = (total) / (c * d);
    if (!Number.isInteger(res)) return genRegla3(rng);
    question = `${a} obreros trabajando ${b} h/día hacen una obra en ${dias} días. ¿Cuántos días necesitan ${c} obreros trabajando ${d} h/día?`;
    steps = [`Total horas-obrero: ${a}×${b}×${dias} = ${total}`, `Nuevas horas por día: ${c}×${d} = ${c*d}`, `Días: ${total}/${c*d} = ${res}`];
    answer = String(res);
  }
  return { topic: `Regla de tres ${tipo}`, question, answers: [{ label: '', key: 'x' }], correctAnswers: { x: answer }, steps, hint: 'Escribe los datos en forma de tabla con las dos magnitudes. Decide si es directa (más→más) o inversa (más→menos).' };
}

function genEc1(rng) {
  const a = rInt(rng, 2, 9) * (rng() > 0.5 ? 1 : -1);
  const b = rInt(rng, 1, 20) * (rng() > 0.5 ? 1 : -1);
  const c = rInt(rng, 2, 9) * (rng() > 0.5 ? 1 : -1);
  const d = rInt(rng, 1, 20) * (rng() > 0.5 ? 1 : -1);
  const coef = a - c, term = d - b;
  if (coef === 0) return genEc1(rng);
  const x = term / coef;
  if (!Number.isInteger(x)) return genEc1(rng);
  const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
  const dStr = d >= 0 ? `+ ${d}` : `− ${Math.abs(d)}`;
  return {
    topic: 'Ecuación de 1er grado',
    question: `Resuelve: ${a}x ${bStr} = ${c}x ${dStr}`,
    answers: [{ label: 'x =', key: 'x' }],
    correctAnswers: { x: String(x) },
    steps: [`Pasamos términos con x a la izquierda: ${coef}x = ${term}`, `x = ${term}/${coef} = ${x}`],
    hint: 'Pasa todos los términos con x a un lado y los números al otro. Recuerda cambiar el signo al pasar al otro lado.'
  };
}

function genEc2(rng) {
  const tipo = ['completa', 'incompleta_b', 'incompleta_c', 'notable'][Math.floor(rng() * 4)];
  if (tipo === 'completa') {
    const r1 = rInt(rng, -8, 8), r2 = rInt(rng, -8, 8);
    if (r1 === 0 && r2 === 0) return genEc2(rng);
    const b = -(r1 + r2), c = r1 * r2;
    const bStr = b === 0 ? '' : (b > 0 ? ` + ${b}x` : ` − ${Math.abs(b)}x`);
    const cStr = c === 0 ? '' : (c > 0 ? ` + ${c}` : ` − ${Math.abs(c)}`);
    const disc = b * b - 4 * c;
    return {
      topic: 'Ecuación de 2º grado completa',
      question: `Resuelve: x²${bStr}${cStr} = 0`,
      answers: [{ label: 'x₁ =', key: 'x1' }, { label: 'x₂ =', key: 'x2' }],
      correctAnswers: { x1: String(r1), x2: String(r2) },
      steps: [`a=1, b=${b}, c=${c}`, `Discriminante: b²−4ac = ${b}²−4·${c} = ${disc}`, `x = (−b ± √discriminante) / 2a`, `x₁ = ${r1}, x₂ = ${r2}`],
      hint: 'Fórmula general: x = (−b ± √(b²−4ac)) / 2a\nIdentifica a, b y c primero.'
    };
  } else if (tipo === 'incompleta_b') {
    const c = rInt(rng, 1, 16);
    const r = Math.sqrt(c);
    if (!Number.isInteger(r)) return genEc2(rng);
    return {
      topic: 'Ecuación de 2º grado incompleta (sin b)',
      question: `Resuelve: x² − ${c} = 0`,
      answers: [{ label: 'x₁ =', key: 'x1' }, { label: 'x₂ =', key: 'x2' }],
      correctAnswers: { x1: String(r), x2: String(-r) },
      steps: [`x² = ${c}`, `x = ±√${c}`, `x₁ = ${r}, x₂ = ${-r}`],
      hint: 'Si falta el término en x (b=0): despeja x² y aplica raíz cuadrada con ±.'
    };
  } else if (tipo === 'incompleta_c') {
    const b = rInt(rng, 2, 8) * (rng() > 0.5 ? 1 : -1);
    return {
      topic: 'Ecuación de 2º grado incompleta (sin c)',
      question: `Resuelve: x² ${b > 0 ? '+ ' + b : '− ' + Math.abs(b)}x = 0`,
      answers: [{ label: 'x₁ =', key: 'x1' }, { label: 'x₂ =', key: 'x2' }],
      correctAnswers: { x1: '0', x2: String(-b) },
      steps: [`Sacamos factor común x: x(x ${b > 0 ? '+' : '−'} ${Math.abs(b)}) = 0`, `x = 0 o x + ${b} = 0`, `x₁ = 0, x₂ = ${-b}`],
      hint: 'Si falta el término independiente (c=0): saca x como factor común.'
    };
  } else {
    const subTipo = ['cuad_suma', 'cuad_resta', 'suma_resta'][Math.floor(rng() * 3)];
    if (subTipo === 'cuad_suma') {
      const a = rInt(rng, 1, 6);
      return {
        topic: 'Identidad notable: cuadrado de una suma',
        question: `Expande usando identidad notable y resuelve: (x + ${a})² = 0`,
        answers: [{ label: 'x =', key: 'x' }],
        correctAnswers: { x: String(-a) },
        steps: [`(a+b)² = a² + 2ab + b²`, `(x+${a})² = x² + ${2*a}x + ${a*a}`, `x² + ${2*a}x + ${a*a} = 0`, `Discriminante = 0 → solución única: x = ${-a}`],
        hint: '(a + b)² = a² + 2ab + b²'
      };
    } else if (subTipo === 'cuad_resta') {
      const a = rInt(rng, 1, 6);
      return {
        topic: 'Identidad notable: cuadrado de una resta',
        question: `Expande usando identidad notable y resuelve: (x − ${a})² = 0`,
        answers: [{ label: 'x =', key: 'x' }],
        correctAnswers: { x: String(a) },
        steps: [`(a−b)² = a² − 2ab + b²`, `(x−${a})² = x² − ${2*a}x + ${a*a}`, `Discriminante = 0 → solución única: x = ${a}`],
        hint: '(a − b)² = a² − 2ab + b²'
      };
    } else {
      const a = rInt(rng, 1, 8);
      return {
        topic: 'Identidad notable: suma por diferencia',
        question: `Expande usando identidad notable y resuelve: (x + ${a})(x − ${a}) = 0`,
        answers: [{ label: 'x₁ =', key: 'x1' }, { label: 'x₂ =', key: 'x2' }],
        correctAnswers: { x1: String(a), x2: String(-a) },
        steps: [`(a+b)(a−b) = a² − b²`, `(x+${a})(x−${a}) = x² − ${a*a}`, `x² = ${a*a}`, `x = ±${a}`],
        hint: '(a + b)(a − b) = a² − b²'
      };
    }
  }
}

function genProblema(rng) {
  const tipo = ['mezcla', 'edad', 'movimiento', 'trabajo'][Math.floor(rng() * 4)];
  if (tipo === 'mezcla') {
    const p1 = rInt(rng, 2, 6), p2 = p1 + rInt(rng, 2, 6);
    const n = rInt(rng, 4, 12);
    const a = rInt(rng, 2, n - 2), b = n - a;
    const total = p1 * a + p2 * b;
    return {
      topic: 'Problema',
      question: `Compramos ${n} artículos en total: unos cuestan ${p1} € y otros ${p2} €. En total gastamos ${total} €. ¿Cuántos artículos hay de cada tipo?`,
      answers: [{ label: `Artículos a ${p1}€ =`, key: 'x1' }, { label: `Artículos a ${p2}€ =`, key: 'x2' }],
      correctAnswers: { x1: String(a), x2: String(b) },
      steps: [`Sea x = artículos a ${p1}€. Entonces ${n}−x son a ${p2}€.`, `Ecuación: ${p1}x + ${p2}(${n}−x) = ${total}`, `${p1}x + ${p2*n} − ${p2}x = ${total}`, `${p1-p2}x = ${total - p2*n}`, `x = ${a} → y = ${b}`],
      hint: `Define una variable: x = número de artículos a ${p1}€. Los demás serán ${n}−x. Plantea la ecuación con el gasto total.`
    };
  } else if (tipo === 'edad') {
    const menor = rInt(rng, 8, 20), dif = rInt(rng, 2, 15);
    const mayor = menor + dif, suma = menor + mayor;
    return {
      topic: 'Problema de edades',
      question: `La suma de las edades de dos hermanos es ${suma} años. El mayor tiene ${dif} años más que el menor. ¿Cuántos años tiene cada uno?`,
      answers: [{ label: 'Menor =', key: 'x1' }, { label: 'Mayor =', key: 'x2' }],
      correctAnswers: { x1: String(menor), x2: String(mayor) },
      steps: [`Sea x = edad del menor. El mayor = x + ${dif}`, `x + (x + ${dif}) = ${suma}`, `2x = ${suma - dif}`, `x = ${menor} → mayor = ${mayor}`],
      hint: `Define x = edad del menor. El mayor será x + ${dif}. La suma de los dos es ${suma}.`
    };
  } else if (tipo === 'movimiento') {
    const v = rInt(rng, 40, 120), t = rInt(rng, 1, 5);
    return {
      topic: 'Problema de movimiento',
      question: `Un coche viaja a ${v} km/h durante ${t} horas. ¿Qué distancia recorre?`,
      answers: [{ label: 'Distancia (km) =', key: 'x' }],
      correctAnswers: { x: String(v * t) },
      steps: [`d = v × t = ${v} × ${t} = ${v * t} km`],
      hint: 'Fórmula: distancia = velocidad × tiempo'
    };
  } else {
    const tarifa = rInt(rng, 10, 50), dias = rInt(rng, 2, 10);
    return {
      topic: 'Problema de trabajo',
      question: `Ana cobra ${tarifa} € al día. Si trabaja ${dias} días, ¿cuánto cobra en total?`,
      answers: [{ label: 'Total (€) =', key: 'x' }],
      correctAnswers: { x: String(tarifa * dias) },
      steps: [`Total = tarifa × días = ${tarifa} × ${dias} = ${tarifa * dias} €`],
      hint: 'Define una variable para la cantidad desconocida y escribe una ecuación con los datos del problema.'
    };
  }
}

// ─── RENDERIZAR EJERCICIOS ────────────────────────────────────────
function renderExercises() {
  const cont = document.getElementById('exerciseContainer');
  cont.innerHTML = '';
  exercises.forEach((ex, i) => {
    const block = document.createElement('div');
    block.className = 'exercise-block';
    block.id = `ex-${i}`;
    const inputsHtml = ex.answers.map(a => `
      <div class="answer-group">
        <span class="answer-label">${a.label}</span>
        <input type="text" class="answer-input" id="ans-${i}-${a.key}" placeholder="?" />
      </div>
    `).join('');
    block.innerHTML = `
      <div class="ex-header">
        <span class="ex-num">EJERCICIO ${i + 1}</span>
        <span class="ex-topic">${ex.topic}</span>
        <span class="ex-result" id="icon-${i}"></span>
      </div>
      <div class="question">${ex.question}</div>
      <div class="answers-row">${inputsHtml}</div>
      <div>
        <button class="btn btn-sm" onclick="checkOne(${i})">Comprobar</button>
        <button class="btn btn-sm btn-hint" id="hintBtn-${i}" onclick="showHint(${i})" style="display:none">💡 Ver pista</button>
      </div>
      <div class="hint-box" id="hint-${i}">${ex.hint ? ex.hint.replace(/\n/g, '<br>') : ''}</div>
      <div class="steps-box" id="steps-${i}">${ex.steps.map((s, j) => `<div class="step">${j+1}. ${s}</div>`).join('')}</div>
    `;
    cont.appendChild(block);
  });
  document.getElementById('submitArea').style.display = 'none';
  document.getElementById('doneArea').style.display = 'none';
  checkAllAnswered();
}

function getUserAnswers(i) {
  const ex = exercises[i];
  const ans = {};
  ex.answers.forEach(a => {
    const el = document.getElementById(`ans-${i}-${a.key}`);
    ans[a.key] = el ? el.value.trim().replace(',', '.') : '';
  });
  return ans;
}

function isCorrect(i) {
  const ex = exercises[i];
  const userAns = getUserAnswers(i);
  // Para respuestas de dos valores, acepta cualquier orden
  const correctVals = Object.values(ex.correctAnswers).map(String);
  const userVals = Object.values(userAns).map(String);
  if (correctVals.length === 2) {
    return (correctVals[0] === userVals[0] && correctVals[1] === userVals[1]) ||
           (correctVals[0] === userVals[1] && correctVals[1] === userVals[0]);
  }
  return correctVals[0] === userVals[Object.keys(userAns)[0]];
}

function checkOne(i) {
  const state = exerciseState[i];
  if (state.submitted) return;
  const correct = isCorrect(i);
  state.attempts++;
  if (correct) {
    state.submitted = true;
    state.correct = true;
    markBlock(i, true);
    document.getElementById(`steps-${i}`).classList.add('show');
  } else {
    if (!state.hintShown) {
      document.getElementById(`hintBtn-${i}`).style.display = 'inline-block';
    } else {
      // Ya vio la pista, mostrar solución
      state.submitted = true;
      state.correct = false;
      markBlock(i, false);
      document.getElementById(`steps-${i}`).classList.add('show');
    }
  }
  checkAllAnswered();
}

function showHint(i) {
  exerciseState[i].hintShown = true;
  document.getElementById(`hint-${i}`).classList.add('show');
  document.getElementById(`hintBtn-${i}`).style.display = 'none';
}

function markBlock(i, correct) {
  const block = document.getElementById(`ex-${i}`);
  block.classList.remove('correct', 'wrong');
  block.classList.add(correct ? 'correct' : 'wrong');
  document.getElementById(`icon-${i}`).textContent = correct ? '✓' : '✗';
}

function checkAllAnswered() {
  const allDone = exerciseState.every(s => s.submitted);
  if (allDone) finishSession();
}

function submitAll() {
  exercises.forEach((_, i) => {
    if (!exerciseState[i].submitted) {
      exerciseState[i].submitted = true;
      exerciseState[i].correct = isCorrect(i);
      markBlock(i, exerciseState[i].correct);
      document.getElementById(`steps-${i}`).classList.add('show');
    }
  });
  finishSession();
}

async function finishSession() {
  document.getElementById('submitArea').style.display = 'none';
  const correct = exerciseState.filter(s => s.correct).length;
  const tk = todayStr();
  // Guardar en Supabase
  await apiFetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ username: currentUser, date: tk, score: correct, completed: true })
  });
  // Mostrar resultado
  const msgs = ['¡Sigue practicando! 💪', '¡Bien hecho! 👍', '¡Muy bien! 🌟', '¡Casi perfecto! 🔥', '¡Perfecto! 🏆'];
  document.getElementById('scoreMsg').textContent = `${correct}/4 correctos`;
  document.getElementById('encourageMsg').textContent = msgs[correct] || '';
  document.getElementById('doneArea').style.display = 'block';
}

function goHome() { showHome(); showScreen('homeScreen'); }

// ─── PANEL PROFE ──────────────────────────────────────────────────
async function showProf() {
  showScreen('profScreen');
  const sessions = await apiFetch('/api/sessions');
  const jorge = Array.isArray(sessions) ? sessions.filter(s => s.username === 'jorge') : [];
  // Stats
  const done = jorge.filter(s => s.completed).length;
  const avg = done ? (jorge.filter(s=>s.completed).reduce((a,s)=>a+s.score,0)/done).toFixed(1) : 0;
  document.getElementById('profStats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${done}</div><div class="stat-label">días completados</div></div>
    <div class="stat-card"><div class="stat-num">${avg}/4</div><div class="stat-label">nota media</div></div>
  `;
  // Calendario con sesiones de jorge
  const profData = {};
  jorge.forEach(s => { profData[s.date] = s; });
  // Renderizar calendario del profe
  const calContainer = document.getElementById('profCal');
  const months = [{year:2026,month:6,name:'Junio'},{year:2026,month:7,name:'Julio'},{year:2026,month:8,name:'Agosto'}];
  const wdays = ['L','M','X','J','V','S','D'];
  const today = new Date(); today.setHours(0,0,0,0);
  calContainer.innerHTML = `<div class="cal-months">${months.map(({year,month,name})=>{
    const firstDay = new Date(year,month-1,1).getDay();
    const offset = firstDay===0?6:firstDay-1;
    const daysInMonth = new Date(year,month,0).getDate();
    let days='';
    for(let i=0;i<offset;i++) days+=`<div class="cal-day empty"></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const dt=new Date(year,month-1,d);
      const key=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isWeekend=[0,6].includes(dt.getDay());
      const isToday=dt.getTime()===today.getTime();
      const isDone=profData[key]?.completed;
      let cls='cal-day';
      if(isDone) cls+=' done';
      else if(isToday) cls+=' today';
      else if(isWeekend) cls+=' weekend';
      days+=`<div class="${cls}" title="${key}">${d}</div>`;
    }
    return `<div><div class="cal-month-title">${name}</div><div class="cal-weekdays">${wdays.map(w=>`<span>${w}</span>`).join('')}</div><div class="cal-days">${days}</div></div>`;
  }).join('')}</div>`;
  // Lista sesiones recientes
  const recent = jorge.filter(s=>s.completed).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  document.getElementById('profList').innerHTML = recent.length
    ? `<div class="sessions-list">${recent.map(s=>`<div class="session-row"><span class="session-date">${formatDateES(s.date)}</span><span class="session-score">${s.score}/4</span></div>`).join('')}</div>`
    : '<p style="color:#86868b;font-size:14px">Jorge aún no ha completado ningún día.</p>';
}
Listo
Ve a GitHub → mates-jorge → carpeta public → clic en app.js → botón del lápiz ✏️ → Cmd+A para seleccionar todo → borra → y pega todo el texto que aparece arriba (desde // ─── ESTADO hasta el final).

Luego dale a Commit changes y Render lo redesplegará automáticamente.



