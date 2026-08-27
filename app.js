/* =========================================================================
   FINANZMANAGER — Web Edition
   Persistente Speicherung über window.storage (Artifacts Storage API)
   ========================================================================= */

/* ---------------------------- KONSTANTEN ------------------------------- */
const KAT_AUSGABEN = [
  {key:"Wohnen", icon:"🏠"}, {key:"Lebensmittel", icon:"🛒"}, {key:"Transport", icon:"🚗"},
  {key:"Gesundheit", icon:"💊"}, {key:"Freizeit", icon:"🎮"}, {key:"Kleidung", icon:"👗"},
  {key:"Sonstiges", icon:"📌"}
];
const KAT_EINNAHMEN = [
  {key:"Gehalt", icon:"💼"}, {key:"Freelance", icon:"💻"}, {key:"Kindergeld", icon:"👶"},
  {key:"Bürgergeld", icon:"🏛"}, {key:"Sonstiges", icon:"📌"}
];
const KAT_ICON = {};
[...KAT_AUSGABEN, ...KAT_EINNAHMEN].forEach(k => KAT_ICON[k.key] = k.icon);

const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MONATE_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CHART_COLORS = ["#6387FF","#00D28C","#FFB932","#F8506E","#A06EFF","#26D3C4","#E0405F"];

const L = {
  de: {
    dashboard:"Dashboard", income:"Einnahmen", expenses:"Ausgaben", goals:"Sparziele",
    recurring:"Wiederkehrend", payslip:"Gehaltsrechner", ai:"KI-Analyse", settings:"Einstellungen",
    logout:"Abmelden", addIncome:"+ Einnahme", addExpense:"− Ausgabe", balance:"Bilanz",
    savingsRate:"Sparquote", totalIncome:"Einnahmen gesamt", totalExpenses:"Ausgaben gesamt",
    noData:"Noch keine Buchungen für diesen Monat.", delete:"Löschen", save:"Speichern",
    cancel:"Abbrechen", description:"Beschreibung", amount:"Betrag (€)", category:"Kategorie",
    date:"Datum", note:"Notiz (optional)", newGoal:"+ Neues Sparziel", goalName:"Name des Ziels",
    targetAmount:"Zielbetrag (€)", currentAmount:"Bereits gespart (€)", deposit:"+ Einzahlen",
    depositAmount:"Betrag einzahlen (€)", newRecurring:"+ Neue Zahlung", nextDue:"Nächste Fälligkeit",
    bookNow:"Jetzt buchen", overdue:"Überfällig", dueSoon:"Bald fällig", grossSalary:"Bruttogehalt (€)",
    taxClass:"Steuerklasse", churchTax:"Kirchensteuer", kvExtra:"KV-Zusatzbeitrag (%)",
    calculate:"Berechnen", applyToIncome:"Als Einnahme übernehmen", netSalary:"Nettogehalt",
    totalDeductions:"Abzüge gesamt", deductionRate:"Abzugsquote", financeScore:"Finanz-Score: ",
    autoCategorize:"Kategorien automatisch vorschlagen", exportCsv:"Als CSV exportieren",
    importCsv:"CSV importieren", theme:"Design", language:"Sprache", dangerZone:"Konto",
    deleteAccount:"Konto löschen", allGood:"Alles im grünen Bereich — keine besonderen Hinweise.",
    transactions:"Buchungen", noGoals:"Noch keine Sparziele angelegt.", noRecurring:"Keine wiederkehrenden Zahlungen.",
    reached:"erreicht", of:"von"
  },
  en: {
    dashboard:"Dashboard", income:"Income", expenses:"Expenses", goals:"Savings goals",
    recurring:"Recurring", payslip:"Salary calculator", ai:"AI analysis", settings:"Settings",
    logout:"Log out", addIncome:"+ Income", addExpense:"− Expense", balance:"Balance",
    savingsRate:"Savings rate", totalIncome:"Total income", totalExpenses:"Total expenses",
    noData:"No transactions for this month yet.", delete:"Delete", save:"Save",
    cancel:"Cancel", description:"Description", amount:"Amount (€)", category:"Category",
    date:"Date", note:"Note (optional)", newGoal:"+ New goal", goalName:"Goal name",
    targetAmount:"Target amount (€)", currentAmount:"Already saved (€)", deposit:"+ Deposit",
    depositAmount:"Amount to deposit (€)", newRecurring:"+ New payment", nextDue:"Next due",
    bookNow:"Book now", overdue:"Overdue", dueSoon:"Due soon", grossSalary:"Gross salary (€)",
    taxClass:"Tax class", churchTax:"Church tax", kvExtra:"Health ins. surcharge (%)",
    calculate:"Calculate", applyToIncome:"Apply as income", netSalary:"Net salary",
    totalDeductions:"Total deductions", deductionRate:"Deduction rate", financeScore:"Finance score: ",
    autoCategorize:"Suggest categories automatically", exportCsv:"Export as CSV",
    importCsv:"Import CSV", theme:"Theme", language:"Language", dangerZone:"Account",
    deleteAccount:"Delete account", allGood:"Everything looks good — no alerts.",
    transactions:"Transactions", noGoals:"No savings goals yet.", noRecurring:"No recurring payments.",
    reached:"reached", of:"of"
  }
};
function t(key){ return (L[state.lang] && L[state.lang][key]) || L.de[key] || key; }
function catLabel(key){
  if(state.lang==="en"){
    const map={Wohnen:"Housing",Lebensmittel:"Groceries",Transport:"Transport",Gesundheit:"Health",
      Freizeit:"Leisure",Kleidung:"Clothing",Sonstiges:"Other",Gehalt:"Salary",Freelance:"Freelance",
      Kindergeld:"Child benefit",Bürgergeld:"Basic income"};
    return map[key] || key;
  }
  return key;
}

/* ---------------------------- STORAGE ----------------------------------- */
const Store = {
  async getUsers(){
    try{ const r = await window.storage.get('users', false); return r ? JSON.parse(r.value) : []; }
    catch(e){ return []; }
  },
  async saveUsers(users){
    await window.storage.set('users', JSON.stringify(users), false);
  },
  async getUserData(username){
    try{
      const r = await window.storage.get('data:'+username, false);
      return r ? JSON.parse(r.value) : null;
    }catch(e){ return null; }
  },
  async saveUserData(username, data){
    await window.storage.set('data:'+username, JSON.stringify(data), false);
  }
};

function emptyUserData(){
  return {
    buchungen: [],   // {id, beschreibung, betrag, kategorie, datum(ISO), notiz, istEinnahme}
    sparziele: [],   // {id, name, ziel, gespart}
    wiederkehrend: [], // {id, name, betrag, kategorie, naechstesFaellig(ISO), istEinnahme, notiz}
    settings: { theme:"dark", lang:"de" }
  };
}

async function sha256(text){
  // Web Crypto (crypto.subtle) braucht einen "sicheren Kontext" (HTTPS oder
  // localhost). Auf reinem HTTP-Hosting ohne SSL wäre es sonst undefined
  // und würde die App zum Absturz bringen — hier ein einfacher Fallback,
  // damit Login/Registrierung in jedem Fall funktionieren.
  if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
    try {
      const enc = new TextEncoder().encode(text);
      const buf = await window.crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    } catch(e) {
      // fällt durch auf den Fallback unten
    }
  }
  // Einfacher, deterministischer Fallback-Hash (kein Web-Crypto nötig).
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
  h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
  return 'fb_' + (h1>>>0).toString(16).padStart(8,'0') + (h2>>>0).toString(16).padStart(8,'0');
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function fmt(n){
  const v = Number(n)||0;
  return v.toLocaleString(state.lang==="en"?"en-US":"de-DE",{style:"currency",currency:"EUR"});
}
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* ---------------------------- STATE -------------------------------------- */
const state = {
  screen: 'login',        // login | register | app
  authUsername: null,
  displayName: null,
  theme: 'dark',
  lang: 'de',
  tab: 'dashboard',
  aktivesJahr: new Date().getFullYear(),
  aktiverMonat: new Date().getMonth()+1,
  data: emptyUserData(),
  loginError: '',
  regError: ''
};

function applyTheme(){
  document.body.setAttribute('data-theme', state.theme);
}

async function persist(){
  if(!state.authUsername) return;
  state.data.settings = { theme: state.theme, lang: state.lang };
  await Store.saveUserData(state.authUsername, state.data);
  injectStorageWarning();
}

function toast(msg){
  let el = document.getElementById('toast');
  if(!el){
    el = document.createElement('div'); el.id='toast'; el.className='toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), 2200);
}

/* ---------------------------- HELPERS: FILTER ----------------------------- */
function gefilterteBuchungen(){
  return state.data.buchungen.filter(b=>{
    const d = new Date(b.datum);
    return d.getFullYear()===state.aktivesJahr && (d.getMonth()+1)===state.aktiverMonat;
  }).sort((a,b)=> b.datum.localeCompare(a.datum));
}
function summeEin(list){ return list.filter(b=>b.istEinnahme).reduce((s,b)=>s+b.betrag,0); }
function summeAus(list){ return list.filter(b=>!b.istEinnahme).reduce((s,b)=>s+b.betrag,0); }

function monatVor(delta){
  state.aktiverMonat += delta;
  if(state.aktiverMonat<1){ state.aktiverMonat=12; state.aktivesJahr--; }
  if(state.aktiverMonat>12){ state.aktiverMonat=1; state.aktivesJahr++; }
  render();
}

/* ---------------------------- STEUERRECHNER ------------------------------- */
function round2(v){ return Math.round(v*100)/100; }
function steuerBerechnen(brutto, klasse, kirche, kvZusatz){
  const kv = round2(brutto*0.073);
  const kv2 = round2(brutto*(kvZusatz/100)*0.5);
  const rv = round2(brutto*0.093);
  const av = round2(brutto*0.013);
  const pv = round2(brutto*0.017);
  const sv = kv+kv2+rv+av+pv;
  const satz = [0,0.14,0.12,0.10,0.14,0.22,0.25];
  const frei = [0,12888,12888,25776,12888,0,0];
  const zvE = Math.max(0, brutto - sv - frei[klasse]/12);
  const lohnsteuer = round2(zvE*satz[klasse]);
  const soli = lohnsteuer>97.38 ? round2(lohnsteuer*0.055) : 0;
  const kirchensteuer = kirche ? round2(lohnsteuer*0.09) : 0;
  const netto = round2(brutto-kv-kv2-rv-av-pv-lohnsteuer-soli-kirchensteuer);
  const abzuegeGesamt = round2(kv+kv2+rv+av+pv+lohnsteuer+soli+kirchensteuer);
  const abzugsquote = brutto>0 ? (abzuegeGesamt/brutto*100) : 0;
  return {brutto,kv,kv2,rv,av,pv,lohnsteuer,soli,kirchensteuer,netto,abzuegeGesamt,abzugsquote};
}

/* ---------------------------- ICONS (inline SVG, minimal) ----------------- */
const ICO = {
  dashboard:"📊", income:"💰", expenses:"🧾", goals:"🎯", recurring:"🔁",
  payslip:"🧮", ai:"✨", settings:"⚙️", chevronL:"‹", chevronR:"›", close:"✕",
  trash:"🗑", plus:"+", logout:"⏻"
};

/* ---------------------------- ROOT RENDER --------------------------------- */
const root = document.getElementById('root');

function render(){
  applyTheme();
  if(state.screen==='login') renderLogin();
  else if(state.screen==='register') renderRegister();
  else renderApp();
  injectStorageWarning();
}

/* ---------------------------- LOGIN / REGISTER ----------------------------- */
function renderLogin(){
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-brand"><span class="dot"></span> FinanzManager</div>
      <div class="login-card">
        <h1>Willkommen zurück</h1>
        <p class="sub">Melde dich an, um deine Finanzen zu verwalten.</p>
        <div class="err-msg ${state.loginError?'show':''}" id="loginErr">${state.loginError}</div>
        <div class="field"><label>Benutzername</label><input id="li-user" autocomplete="username"/></div>
        <div class="field"><label>Passwort</label><input id="li-pass" type="password" autocomplete="current-password"/></div>
        <button class="btn btn-primary" id="li-submit">Anmelden</button>
        <div class="login-switch">Noch kein Konto? <b id="go-register">Registrieren</b></div>
      </div>
    </div>`;
  document.getElementById('go-register').onclick = ()=>{ state.screen='register'; state.regError=''; render(); };
  document.getElementById('li-submit').onclick = doLogin;
  const pass = document.getElementById('li-pass');
  pass.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  document.getElementById('li-user').addEventListener('keydown', e=>{ if(e.key==='Enter') pass.focus(); });
}

function renderRegister(){
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-brand"><span class="dot"></span> FinanzManager</div>
      <div class="login-card">
        <h1>Konto erstellen</h1>
        <p class="sub">Leg ein neues Benutzerkonto an.</p>
        <div class="err-msg ${state.regError?'show':''}" id="regErr">${state.regError}</div>
        <div class="field"><label>Anzeigename</label><input id="re-name"/></div>
        <div class="field"><label>Benutzername</label><input id="re-user" autocomplete="username"/></div>
        <div class="field"><label>Passwort</label><input id="re-pass" type="password" autocomplete="new-password"/></div>
        <button class="btn btn-primary" id="re-submit">Konto erstellen</button>
        <div class="login-switch">Schon registriert? <b id="go-login">Anmelden</b></div>
      </div>
    </div>`;
  document.getElementById('go-login').onclick = ()=>{ state.screen='login'; state.loginError=''; render(); };
  document.getElementById('re-submit').onclick = doRegister;
}

async function doLogin(){
  try{
    const user = document.getElementById('li-user').value.trim();
    const pass = document.getElementById('li-pass').value;
    if(!user || !pass){ state.loginError='Bitte Benutzername und Passwort eingeben.'; return render(); }
    const users = await Store.getUsers();
    const u = users.find(x=>x.username.toLowerCase()===user.toLowerCase());
    if(!u){ state.loginError='Benutzer nicht gefunden.'; return render(); }
    const hash = await sha256(pass);
    if(hash !== u.passwordHash){ state.loginError='Falsches Passwort.'; return render(); }
    await enterApp(u);
  }catch(e){
    console.error('Login-Fehler:', e);
    state.loginError = 'Unerwarteter Fehler beim Anmelden: '+(e.message||e);
    render();
  }
}

async function doRegister(){
  try{
    const name = document.getElementById('re-name').value.trim();
    const user = document.getElementById('re-user').value.trim();
    const pass = document.getElementById('re-pass').value;
    if(!name || !user || !pass){ state.regError='Bitte alle Felder ausfüllen.'; return render(); }
    if(pass.length<4){ state.regError='Passwort muss mind. 4 Zeichen haben.'; return render(); }
    const users = await Store.getUsers();
    if(users.find(x=>x.username.toLowerCase()===user.toLowerCase())){
      state.regError='Benutzername bereits vergeben.'; return render();
    }
    const hash = await sha256(pass);
    const newUser = {username:user, passwordHash:hash, displayName:name};
    users.push(newUser);
    await Store.saveUsers(users);
    await Store.saveUserData(user, emptyUserData());
    await enterApp(newUser);
  }catch(e){
    console.error('Registrierungs-Fehler:', e);
    state.regError = 'Unerwarteter Fehler bei der Registrierung: '+(e.message||e);
    render();
  }
}

async function enterApp(u){
  state.authUsername = u.username;
  state.displayName = u.displayName;
  let data = await Store.getUserData(u.username);
  if(!data) data = emptyUserData();
  if(!data.settings) data.settings = {theme:'dark', lang:'de'};
  state.data = data;
  state.theme = data.settings.theme || 'dark';
  state.lang = data.settings.lang || 'de';
  state.screen = 'app';
  state.tab = 'dashboard';
  state.loginError=''; state.regError='';
  render();
}

function doLogout(){
  state.screen='login'; state.authUsername=null; state.data=emptyUserData();
  state.theme='dark'; applyTheme();
  render();
}

/* ---------------------------- APP SHELL ------------------------------------ */
function renderApp(){
  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar" id="sidebar">
        <div class="sb-brand"><span class="dot"></span> FinanzManager</div>
        <div class="sb-nav" id="sb-nav"></div>
        <div class="sb-foot">
          <div class="sb-user">
            <div class="sb-avatar">${(state.displayName||'?').slice(0,1).toUpperCase()}</div>
            <div style="overflow:hidden">
              <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(state.displayName)}</div>
              <div style="font-size:11px; color:var(--muted)">@${escapeHtml(state.authUsername)}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-logout" style="width:100%">${ICO.logout} ${t('logout')}</button>
        </div>
      </div>
      <div class="main">
        <div class="topbar" id="topbar"></div>
        <div class="content" id="content"></div>
      </div>
    </div>`;
  const navItems = [
    ['dashboard', ICO.dashboard, t('dashboard')],
    ['income', ICO.income, t('income')],
    ['expenses', ICO.expenses, t('expenses')],
    ['goals', ICO.goals, t('goals')],
    ['recurring', ICO.recurring, t('recurring')],
    ['payslip', ICO.payslip, t('payslip')],
    ['ai', ICO.ai, t('ai')],
    ['settings', ICO.settings, t('settings')],
  ];
  const nav = document.getElementById('sb-nav');
  nav.innerHTML = navItems.map(([id,icon,label])=>
    `<div class="sb-item ${state.tab===id?'active':''}" data-tab="${id}"><span class="ic">${icon}</span>${label}</div>`
  ).join('');
  nav.querySelectorAll('.sb-item').forEach(el=>{
    el.onclick = ()=>{ state.tab = el.dataset.tab; render(); };
  });
  document.getElementById('btn-logout').onclick = doLogout;
  renderTopbar();
  renderTab();
}

function renderTopbar(){
  const tb = document.getElementById('topbar');
  const titles = {
    dashboard:t('dashboard'), income:t('income'), expenses:t('expenses'), goals:t('goals'),
    recurring:t('recurring'), payslip:t('payslip'), ai:t('ai'), settings:t('settings')
  };
  const needsMonthNav = ['dashboard','income','expenses','ai'].includes(state.tab);
  const monLabel = (state.lang==='en'?MONATE_EN:MONATE)[state.aktiverMonat-1] + ' ' + state.aktivesJahr;
  tb.innerHTML = `
    <div>
      <h2>${titles[state.tab]}</h2>
      <div class="sub">${escapeHtml(state.displayName)} · ${monLabel}</div>
    </div>
    ${needsMonthNav ? `
    <div class="month-nav">
      <button id="mv-prev">${ICO.chevronL}</button>
      <div class="label">${monLabel}</div>
      <button id="mv-next">${ICO.chevronR}</button>
    </div>` : ''}
  `;
  if(needsMonthNav){
    document.getElementById('mv-prev').onclick = ()=>monatVor(-1);
    document.getElementById('mv-next').onclick = ()=>monatVor(1);
  }
}

function renderTab(){
  const c = document.getElementById('content');
  if(state.tab==='dashboard') return renderDashboard(c);
  if(state.tab==='income') return renderTxTab(c, true);
  if(state.tab==='expenses') return renderTxTab(c, false);
  if(state.tab==='goals') return renderGoals(c);
  if(state.tab==='recurring') return renderRecurring(c);
  if(state.tab==='payslip') return renderPayslip(c);
  if(state.tab==='ai') return renderAI(c);
  if(state.tab==='settings') return renderSettings(c);
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------------------------- DASHBOARD ------------------------------------ */
function buildNotifications(){
  const buf = gefilterteBuchungen();
  const ein = summeEin(buf), aus = summeAus(buf);
  const heute = new Date();
  const mel = [];
  if(ein>0 && aus>ein) mel.push({icon:'🚨', text:(state.lang==='en'?'Expenses exceed income by ':'Ausgaben übersteigen Einnahmen um ')+fmt(aus-ein), level:'RED'});
  else if(ein>0 && aus>ein*0.9) mel.push({icon:'⚠', text:(state.lang==='en'?'Expenses close to income: ':'Ausgaben nahe an Einnahmen: ')+fmt(aus)+' / '+fmt(ein), level:'AMBER'});
  state.data.wiederkehrend.forEach(w=>{
    const due = new Date(w.naechstesFaellig);
    const days = Math.round((due-heute)/86400000);
    if(days<0) mel.push({icon:'❗', text:`"${w.name}" ${state.lang==='en'?'is overdue':'ist überfällig'}`, level:'RED'});
    else if(days<=5) mel.push({icon:'📅', text:`"${w.name}" ${state.lang==='en'?'due in':'fällig in'} ${days} ${state.lang==='en'?'days':'Tagen'} – ${fmt(w.betrag)}`, level:'AMBER'});
  });
  state.data.sparziele.forEach(s=>{
    const pct = s.ziel>0 ? (s.gespart/s.ziel*100) : 0;
    if(pct>=100) mel.push({icon:'🎉', text:`"${s.name}" ${t('reached')}!`, level:'GREEN'});
    else if(pct>=80) mel.push({icon:'💪', text:`"${s.name}": ${pct.toFixed(0)}% ${state.lang==='en'?'nearly done':'fast geschafft'}`, level:'GREEN'});
  });
  if(ein>0 && (ein-aus)/ein>=0.2) mel.push({icon:'✅', text:(state.lang==='en'?'Great savings rate: ':'Starke Sparquote: ')+((ein-aus)/ein*100).toFixed(0)+'%', level:'GREEN'});
  if(mel.length===0) mel.push({icon:'✅', text:t('allGood'), level:'GREEN'});
  return mel;
}

function renderDashboard(c){
  const buf = gefilterteBuchungen();
  const ein = summeEin(buf), aus = summeAus(buf);
  const bilanz = ein-aus;
  const sparquote = ein>0 ? ((ein-aus)/ein*100) : 0;

  // category breakdown for donut (expenses)
  const katMap = {};
  buf.filter(b=>!b.istEinnahme).forEach(b=> katMap[b.kategorie] = (katMap[b.kategorie]||0)+b.betrag);
  const katEntries = Object.entries(katMap).sort((a,b)=>b[1]-a[1]);

  // 6-month trend
  const trend = [];
  for(let i=5;i>=0;i--){
    let m = state.aktiverMonat - i, y = state.aktivesJahr;
    while(m<1){ m+=12; y--; }
    const list = state.data.buchungen.filter(b=>{ const d=new Date(b.datum); return d.getFullYear()===y && (d.getMonth()+1)===m; });
    trend.push({m,y, ein:summeEin(list), aus:summeAus(list)});
  }

  const notifs = buildNotifications();

  c.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:22px;">
      ${kpiCard(t('totalIncome'), fmt(ein), 'pos', '📈')}
      ${kpiCard(t('totalExpenses'), fmt(aus), 'neg', '📉')}
      ${kpiCard(t('balance'), fmt(bilanz), bilanz>=0?'pos':'neg', '⚖️')}
      ${kpiCard(t('savingsRate'), sparquote.toFixed(1)+'%', sparquote>=20?'pos':sparquote>=0?'warn':'neg', '🎯')}
    </div>

    <div class="grid grid-2" style="align-items:start;">
      <div class="card">
        <h3>${state.lang==='en'?'Expenses by category':'Ausgaben nach Kategorie'}</h3>
        ${katEntries.length ? donutChart(katEntries) : `<div class="empty-state"><div class="big">📭</div>${t('noData')}</div>`}
      </div>
      <div class="card">
        <h3>${state.lang==='en'?'6-month trend':'6-Monats-Trend'}</h3>
        ${trendChart(trend)}
      </div>
    </div>

    <div class="section-title">${state.lang==='en'?'Alerts':'Hinweise'}</div>
    <div>
      ${notifs.map(n=>`<div class="notif" style="background:var(--${n.level==='RED'?'red':n.level==='AMBER'?'amber':'green'}-dim); color:var(--${n.level==='RED'?'red':n.level==='AMBER'?'amber':'green'});">
        <span style="font-size:18px;">${n.icon}</span><span>${escapeHtml(n.text)}</span>
      </div>`).join('')}
    </div>

    <div class="section-title">${t('transactions')}</div>
    <div class="card">
      ${txList(buf.slice(0,8))}
    </div>
  `;
}

function kpiCard(label, val, cls, icon){
  return `<div class="card kpi-card">
    <div class="lbl">${icon} ${label}</div>
    <div class="val ${cls}">${val}</div>
  </div>`;
}

function donutChart(entries){
  const total = entries.reduce((s,[,v])=>s+v,0);
  const R=54, CX=70, CY=70, STROKE=20;
  const circ = 2*Math.PI*R;
  let offset=0;
  let segs='';
  entries.forEach(([kat,val],i)=>{
    const frac = val/total;
    const len = frac*circ;
    const color = CHART_COLORS[i%CHART_COLORS.length];
    segs += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${color}" stroke-width="${STROKE}"
      stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${CX} ${CY})" stroke-linecap="butt"/>`;
    offset += len;
  });
  const legend = entries.slice(0,7).map(([kat,val],i)=>{
    const color = CHART_COLORS[i%CHART_COLORS.length];
    const pct = (val/total*100).toFixed(0);
    return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:7px;">
      <span style="width:9px;height:9px;border-radius:3px;background:${color};flex-shrink:0;"></span>
      <span style="flex:1;color:var(--fg);">${KAT_ICON[kat]||''} ${catLabel(kat)}</span>
      <span style="color:var(--muted);font-family:var(--font-num);">${pct}%</span>
    </div>`;
  }).join('');
  return `<div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
    <svg width="140" height="140" viewBox="0 0 140 140">
      ${segs}
      <text x="70" y="65" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="var(--font-ui)">${state.lang==='en'?'Total':'Summe'}</text>
      <text x="70" y="82" text-anchor="middle" font-size="14" font-weight="700" fill="var(--fg)" font-family="var(--font-num)">${fmt(total)}</text>
    </svg>
    <div style="flex:1; min-width:140px;">${legend}</div>
  </div>`;
}

function trendChart(trend){
  const W=280,H=140,PAD=10;
  const maxV = Math.max(1, ...trend.map(x=>Math.max(x.ein,x.aus)));
  const step = (W-2*PAD)/(trend.length-1||1);
  const pts = arr => arr.map((v,i)=>{
    const x = PAD+i*step;
    const y = H-PAD - (v/maxV)*(H-2*PAD);
    return [x,y];
  });
  const einPts = pts(trend.map(x=>x.ein));
  const ausPts = pts(trend.map(x=>x.aus));
  const toPath = p => 'M'+p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
  const labels = trend.map(x=>(state.lang==='en'?MONATE_EN:MONATE)[x.m-1].slice(0,3));
  return `<svg width="100%" height="${H+26}" viewBox="0 0 ${W} ${H+26}" preserveAspectRatio="xMidYMid meet">
    <path d="${toPath(einPts)}" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${toPath(ausPts)}" fill="none" stroke="var(--red)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${einPts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" fill="var(--green)"/>`).join('')}
    ${ausPts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" fill="var(--red)"/>`).join('')}
    ${labels.map((l,i)=>`<text x="${PAD+i*step}" y="${H+18}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${l}</text>`).join('')}
  </svg>
  <div style="display:flex; gap:16px; margin-top:2px; font-size:11.5px;">
    <span style="color:var(--green);">● ${t('income')}</span>
    <span style="color:var(--red);">● ${t('expenses')}</span>
  </div>`;
}

function txList(list){
  if(!list.length) return `<div class="empty-state"><div class="big">📭</div>${t('noData')}</div>`;
  return `<div class="tx-list">${list.map(b=>`
    <div class="tx-row">
      <div class="tx-icon">${KAT_ICON[b.kategorie]||'💠'}</div>
      <div class="tx-info">
        <div class="name">${escapeHtml(b.beschreibung)}</div>
        <div class="meta">${catLabel(b.kategorie)} · ${b.datum}${b.notiz? ' · '+escapeHtml(b.notiz):''}</div>
      </div>
      <div class="tx-amt ${b.istEinnahme?'pos':'neg'}">${b.istEinnahme?'+':'-'}${fmt(b.betrag)}</div>
      <button class="tx-del" data-id="${b.id}" title="${t('delete')}">${ICO.trash}</button>
    </div>`).join('')}</div>`;
}

/* ---------------------------- INCOME / EXPENSES TAB ------------------------ */
function renderTxTab(c, isIncome){
  const buf = gefilterteBuchungen().filter(b=> b.istEinnahme===isIncome);
  const total = buf.reduce((s,b)=>s+b.betrag,0);
  c.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div class="card kpi-card" style="flex:1; margin-right:14px;">
        <div class="lbl">${isIncome?'📈':'📉'} ${isIncome? t('totalIncome'):t('totalExpenses')}</div>
        <div class="val ${isIncome?'pos':'neg'}">${fmt(total)}</div>
      </div>
      <button class="btn btn-primary" id="btn-add-tx" style="white-space:nowrap;">${isIncome? t('addIncome'): t('addExpense')}</button>
    </div>
    <div class="card">${txList(buf)}</div>
  `;
  document.getElementById('btn-add-tx').onclick = ()=>openTxModal(isIncome);
  c.querySelectorAll('.tx-del').forEach(btn=>{
    btn.onclick = ()=>{
      state.data.buchungen = state.data.buchungen.filter(b=>b.id!==btn.dataset.id);
      persist(); render();
    };
  });
}

function openTxModal(isIncome){
  const cats = isIncome ? KAT_EINNAHMEN : KAT_AUSGABEN;
  let selectedCat = cats[0].key;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${isIncome? t('addIncome'): t('addExpense')}</h3>
      <div class="field"><label>${t('description')}</label><input id="tx-desc"/></div>
      <div class="field"><label>${t('amount')}</label><input id="tx-amt" type="number" step="0.01" min="0"/></div>
      <div class="field"><label>${t('category')}</label>
        <div class="chip-row" id="tx-cats">
          ${cats.map(k=>`<div class="chip ${k.key===selectedCat?'active':''}" data-k="${k.key}">${k.icon} ${catLabel(k.key)}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>${t('date')}</label><input id="tx-date" type="date" value="${todayISO()}"/></div>
      <div class="field"><label>${t('note')}</label><input id="tx-note"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="tx-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="tx-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll('#tx-cats .chip').forEach(ch=>{
    ch.onclick = ()=>{ selectedCat = ch.dataset.k; bg.querySelectorAll('#tx-cats .chip').forEach(x=>x.classList.toggle('active', x===ch)); };
  });
  bg.querySelector('#tx-cancel').onclick = ()=> bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#tx-save').onclick = ()=>{
    const desc = bg.querySelector('#tx-desc').value.trim();
    const amt = parseFloat(bg.querySelector('#tx-amt').value.replace(',','.'));
    const date = bg.querySelector('#tx-date').value || todayISO();
    const note = bg.querySelector('#tx-note').value.trim();
    if(!desc || !amt || amt<=0){ toast(state.lang==='en'?'Please fill description and amount.':'Bitte Beschreibung und Betrag ausfüllen.'); return; }
    state.data.buchungen.push({ id:uid(), beschreibung:desc, betrag:round2(amt), kategorie:selectedCat, datum:date, notiz:note, istEinnahme:isIncome });
    persist();
    bg.remove();
    render();
  };
  bg.querySelector('#tx-desc').focus();
}

/* ---------------------------- SAVINGS GOALS --------------------------------- */
function renderGoals(c){
  const goals = state.data.sparziele;
  c.innerHTML = `
    <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
      <button class="btn btn-primary" id="btn-add-goal">${t('newGoal')}</button>
    </div>
    ${goals.length ? `<div class="grid grid-3" id="goals-grid"></div>` : `<div class="empty-state"><div class="big">🎯</div>${t('noGoals')}</div>`}
  `;
  document.getElementById('btn-add-goal').onclick = openGoalModal;
  if(goals.length){
    const grid = document.getElementById('goals-grid');
    grid.innerHTML = goals.map(g=>{
      const pct = g.ziel>0 ? Math.min(100, g.gespart/g.ziel*100) : 0;
      const done = pct>=100;
      const color = done ? 'var(--green)' : 'var(--accent)';
      return `<div class="goal-card">
        <div class="top">
          <div>
            <div class="name">${done?'🎉 ':''}${escapeHtml(g.name)}</div>
            <div class="sub">${fmt(g.gespart)} ${t('of')} ${fmt(g.ziel)}</div>
          </div>
          <button class="tx-del" style="opacity:1" data-id="${g.id}" title="${t('delete')}">${ICO.trash}</button>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${color};"></div></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
          <span style="font-size:12px; color:var(--muted); font-weight:600;">${pct.toFixed(0)}%</span>
          ${!done ? `<button class="btn btn-ghost btn-sm" data-dep="${g.id}">${t('deposit')}</button>` : ''}
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-id]').forEach(btn=>{
      btn.onclick = ()=>{
        state.data.sparziele = state.data.sparziele.filter(g=>g.id!==btn.dataset.id);
        persist(); render();
      };
    });
    grid.querySelectorAll('[data-dep]').forEach(btn=>{
      btn.onclick = ()=> openDepositModal(btn.dataset.dep);
    });
  }
}

function openGoalModal(){
  const bg = document.createElement('div');
  bg.className='modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${t('newGoal')}</h3>
      <div class="field"><label>${t('goalName')}</label><input id="g-name"/></div>
      <div class="field"><label>${t('targetAmount')}</label><input id="g-target" type="number" step="0.01" min="0"/></div>
      <div class="field"><label>${t('currentAmount')}</label><input id="g-current" type="number" step="0.01" min="0" value="0"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="g-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="g-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#g-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#g-save').onclick = ()=>{
    const name = bg.querySelector('#g-name').value.trim();
    const target = parseFloat(bg.querySelector('#g-target').value.replace(',','.'));
    const current = parseFloat(bg.querySelector('#g-current').value.replace(',','.'))||0;
    if(!name || !target || target<=0){ toast(state.lang==='en'?'Please fill in name and target amount.':'Bitte Name und Zielbetrag ausfüllen.'); return; }
    state.data.sparziele.push({ id:uid(), name, ziel:round2(target), gespart:round2(current) });
    persist(); bg.remove(); render();
  };
  bg.querySelector('#g-name').focus();
}

function openDepositModal(goalId){
  const goal = state.data.sparziele.find(g=>g.id===goalId);
  if(!goal) return;
  const bg = document.createElement('div');
  bg.className='modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${escapeHtml(goal.name)}</h3>
      <div class="field"><label>${t('depositAmount')}</label><input id="d-amt" type="number" step="0.01" min="0"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="d-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="d-save">${t('deposit')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#d-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#d-save').onclick = ()=>{
    const amt = parseFloat(bg.querySelector('#d-amt').value.replace(',','.'));
    if(!amt || amt<=0) return;
    goal.gespart = round2(goal.gespart + amt);
    persist(); bg.remove(); render();
  };
  bg.querySelector('#d-amt').focus();
}

/* ---------------------------- RECURRING PAYMENTS ---------------------------- */
function renderRecurring(c){
  const list = [...state.data.wiederkehrend].sort((a,b)=>a.naechstesFaellig.localeCompare(b.naechstesFaellig));
  c.innerHTML = `
    <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
      <button class="btn btn-primary" id="btn-add-rec">${t('newRecurring')}</button>
    </div>
    <div class="card">
      ${list.length ? list.map(w=>{
        const days = Math.round((new Date(w.naechstesFaellig)-new Date())/86400000);
        let badge='';
        if(days<0) badge = `<span class="due-badge" style="background:var(--red-dim); color:var(--red);">${t('overdue')}</span>`;
        else if(days<=5) badge = `<span class="due-badge" style="background:var(--amber-dim); color:var(--amber);">${t('dueSoon')}</span>`;
        return `<div class="recur-row">
          <div class="tx-icon">${KAT_ICON[w.kategorie]||'🔁'}</div>
          <div class="tx-info">
            <div class="name">${escapeHtml(w.name)} ${badge}</div>
            <div class="meta">${catLabel(w.kategorie)} · ${t('nextDue')}: ${w.naechstesFaellig}</div>
          </div>
          <div class="tx-amt ${w.istEinnahme?'pos':'neg'}">${w.istEinnahme?'+':'-'}${fmt(w.betrag)}</div>
          <button class="btn btn-ghost btn-sm" data-book="${w.id}">${t('bookNow')}</button>
          <button class="tx-del" style="opacity:1" data-id="${w.id}" title="${t('delete')}">${ICO.trash}</button>
        </div>`;
      }).join('') : `<div class="empty-state"><div class="big">🔁</div>${t('noRecurring')}</div>`}
    </div>
  `;
  document.getElementById('btn-add-rec').onclick = openRecurringModal;
  c.querySelectorAll('[data-id]').forEach(btn=>{
    btn.onclick = ()=>{ state.data.wiederkehrend = state.data.wiederkehrend.filter(w=>w.id!==btn.dataset.id); persist(); render(); };
  });
  c.querySelectorAll('[data-book]').forEach(btn=>{
    btn.onclick = ()=>{
      const w = state.data.wiederkehrend.find(x=>x.id===btn.dataset.book);
      if(!w) return;
      state.data.buchungen.push({ id:uid(), beschreibung:w.name, betrag:w.betrag, kategorie:w.kategorie, datum:todayISO(), notiz:'', istEinnahme:w.istEinnahme });
      const d = new Date(w.naechstesFaellig);
      d.setMonth(d.getMonth()+1);
      w.naechstesFaellig = d.toISOString().slice(0,10);
      persist(); toast(state.lang==='en'?'Booked!':'Gebucht!'); render();
    };
  });
}

function openRecurringModal(){
  let selectedCat = KAT_AUSGABEN[0].key;
  let isIncome = false;
  const bg = document.createElement('div');
  bg.className='modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${t('newRecurring')}</h3>
      <div class="field"><label>${t('description')}</label><input id="r-name"/></div>
      <div class="field"><label>${t('amount')}</label><input id="r-amt" type="number" step="0.01" min="0"/></div>
      <div class="field"><label>${t('income')} / ${t('expenses')}</label>
        <div class="seg" id="r-seg">
          <button class="active" data-v="0">${t('expenses')}</button>
          <button data-v="1">${t('income')}</button>
        </div>
      </div>
      <div class="field"><label>${t('category')}</label>
        <div class="chip-row" id="r-cats">
          ${KAT_AUSGABEN.map(k=>`<div class="chip ${k.key===selectedCat?'active':''}" data-k="${k.key}">${k.icon} ${catLabel(k.key)}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>${t('nextDue')}</label><input id="r-date" type="date" value="${todayISO()}"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="r-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="r-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const catsEl = bg.querySelector('#r-cats');
  function refreshCats(){
    const cats = isIncome ? KAT_EINNAHMEN : KAT_AUSGABEN;
    selectedCat = cats[0].key;
    catsEl.innerHTML = cats.map(k=>`<div class="chip ${k.key===selectedCat?'active':''}" data-k="${k.key}">${k.icon} ${catLabel(k.key)}</div>`).join('');
    catsEl.querySelectorAll('.chip').forEach(ch=>{
      ch.onclick = ()=>{ selectedCat = ch.dataset.k; catsEl.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active', x===ch)); };
    });
  }
  refreshCats();
  bg.querySelectorAll('#r-seg button').forEach(b=>{
    b.onclick = ()=>{ isIncome = b.dataset.v==='1'; bg.querySelectorAll('#r-seg button').forEach(x=>x.classList.toggle('active', x===b)); refreshCats(); };
  });
  bg.querySelector('#r-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#r-save').onclick = ()=>{
    const name = bg.querySelector('#r-name').value.trim();
    const amt = parseFloat(bg.querySelector('#r-amt').value.replace(',','.'));
    const date = bg.querySelector('#r-date').value || todayISO();
    if(!name || !amt || amt<=0){ toast(state.lang==='en'?'Please fill description and amount.':'Bitte Beschreibung und Betrag ausfüllen.'); return; }
    state.data.wiederkehrend.push({ id:uid(), name, betrag:round2(amt), kategorie:selectedCat, naechstesFaellig:date, istEinnahme:isIncome });
    persist(); bg.remove(); render();
  };
  bg.querySelector('#r-name').focus();
}

/* ---------------------------- PAYSLIP / TAX CALCULATOR ----------------------- */
let payslipState = { brutto: 3200, klasse: 1, kirche: false, kv: 1.6 };
function renderPayslip(c){
  c.innerHTML = `
    <div class="grid grid-2" style="align-items:start;">
      <div class="card">
        <h3>${t('payslip')}</h3>
        <div class="field"><label>${t('grossSalary')}</label><input id="p-brutto" type="number" step="1" value="${payslipState.brutto}"/></div>
        <div class="field"><label>${t('taxClass')}</label>
          <select id="p-klasse">
            ${[1,2,3,4,5,6].map(k=>`<option value="${k}" ${k===payslipState.klasse?'selected':''}>${state.lang==='en'?'Class':'Klasse'} ${k}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="p-kirche" ${payslipState.kirche?'checked':''} style="width:auto;"/>
          <label style="margin:0; text-transform:none; font-size:13px; color:var(--fg); font-weight:500;">${t('churchTax')}</label>
        </div>
        <div class="field"><label>${t('kvExtra')}</label><input id="p-kv" type="number" step="0.1" value="${payslipState.kv}"/></div>
        <button class="btn btn-primary" id="p-calc" style="width:100%; margin-top:6px;">${t('calculate')}</button>
        <button class="btn btn-ghost" id="p-apply" style="width:100%; margin-top:8px;">${t('applyToIncome')}</button>
      </div>
      <div class="card" id="p-result"></div>
    </div>
  `;
  function recalcAndRender(){
    payslipState.brutto = parseFloat(document.getElementById('p-brutto').value)||0;
    payslipState.klasse = parseInt(document.getElementById('p-klasse').value);
    payslipState.kirche = document.getElementById('p-kirche').checked;
    payslipState.kv = parseFloat(document.getElementById('p-kv').value)||0;
    const r = steuerBerechnen(payslipState.brutto, payslipState.klasse, payslipState.kirche, payslipState.kv);
    document.getElementById('p-result').innerHTML = payslipResultHtml(r);
  }
  document.getElementById('p-calc').onclick = recalcAndRender;
  document.getElementById('p-apply').onclick = ()=>{
    const r = steuerBerechnen(payslipState.brutto, payslipState.klasse, payslipState.kirche, payslipState.kv);
    const monatName = (state.lang==='en'?MONATE_EN:MONATE)[state.aktiverMonat-1];
    state.data.buchungen.push({ id:uid(), beschreibung:monatName+' '+state.aktivesJahr+' – '+catLabel('Gehalt'), betrag:r.netto, kategorie:'Gehalt', datum:todayISO(), notiz:'', istEinnahme:true });
    persist();
    toast((state.lang==='en'?'Net salary saved: ':'Nettogehalt gespeichert: ')+fmt(r.netto));
    state.tab='income'; render();
  };
  recalcAndRender();
}

function payslipResultHtml(r){
  const row = (label, val, isRed) => `
    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px;">
      <span style="color:var(--muted);">${label}</span>
      <span style="font-family:var(--font-num); font-weight:600; ${isRed?'color:var(--red);':''}">${val}</span>
    </div>`;
  return `
    <h3>${escapeHtml(state.displayName)} – ${state.lang==='en'?'Tax class':'Steuerklasse'} ${payslipState.klasse}</h3>
    ${row(t('grossSalary'), fmt(r.brutto))}
    ${row(state.lang==='en'?'Health insurance':'Krankenversicherung', '−'+fmt(r.kv+r.kv2), true)}
    ${row(state.lang==='en'?'Pension insurance':'Rentenversicherung', '−'+fmt(r.rv), true)}
    ${row(state.lang==='en'?'Unemployment ins.':'Arbeitslosenversicherung', '−'+fmt(r.av), true)}
    ${row(state.lang==='en'?'Long-term care ins.':'Pflegeversicherung', '−'+fmt(r.pv), true)}
    ${row(state.lang==='en'?'Income tax':'Lohnsteuer', '−'+fmt(r.lohnsteuer), true)}
    ${row('Soli', '−'+fmt(r.soli), true)}
    ${r.kirchensteuer>0 ? row(t('churchTax'), '−'+fmt(r.kirchensteuer), true) : ''}
    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 0 6px;">
      <span style="font-weight:700; font-size:14.5px;">${t('netSalary')}</span>
      <span style="font-weight:700; font-size:24px; font-family:var(--font-num); color:var(--green);">${fmt(r.netto)}</span>
    </div>
    <div class="grid grid-2" style="margin-top:10px;">
      ${kpiCard(t('totalDeductions'), fmt(r.abzuegeGesamt), 'neg', '📉')}
      ${kpiCard(t('deductionRate'), r.abzugsquote.toFixed(1)+'%', 'neg', '📊')}
    </div>
  `;
}

/* ---------------------------- AI ANALYSIS ------------------------------------ */
function generateAITips(buf, ein, aus, spar, bilanz){
  const tips = [];
  const en = state.lang==='en';
  if(spar>=20) tips.push(['✅', en?'Savings rate':'Sparquote', (en?`Excellent! ${spar.toFixed(0)}% — above the recommended 20%.`:`Sehr gut! ${spar.toFixed(0)}% – über dem Empfehlungswert von 20%.`), 'GREEN']);
  else if(spar>0) tips.push(['📈', en?'Improve savings':'Sparquote verbessern', (en?`Currently ${spar.toFixed(0)}% — aim for 20%. That's ${fmt(ein*0.2)} per month.`:`Aktuell ${spar.toFixed(0)}% – versuche 20% zu erreichen. Das sind ${fmt(ein*0.2)} monatlich.`), 'AMBER']);
  else tips.push(['⚠', en?'Savings rate':'Sparquote', en?'No savings this month. Reduce expenses or increase income.':'Keine Ersparnisse diesen Monat. Reduziere Ausgaben oder erhöhe Einnahmen.', 'RED']);

  if(bilanz>0) tips.push(['💰', t('balance'), (en?`Positive: ${fmt(bilanz)} surplus. Well done!`:`Positiv: ${fmt(bilanz)} Überschuss. Gut gemacht!`), 'GREEN']);
  else tips.push(['📉', t('balance'), (en?`Negative: ${fmt(Math.abs(bilanz))} deficit. Reduce expenses!`:`Negativ: ${fmt(Math.abs(bilanz))} Defizit. Ausgaben reduzieren!`), 'RED']);

  const katSum = {};
  buf.filter(b=>!b.istEinnahme).forEach(b=> katSum[b.kategorie]=(katSum[b.kategorie]||0)+b.betrag);
  const top = Object.entries(katSum).sort((a,b)=>b[1]-a[1])[0];
  if(top && top[1]>0 && ein>0) tips.push(['🔍', en?'Biggest expense':'Größte Ausgabe', `${catLabel(top[0])}: ${fmt(top[1])} (${(top[1]/ein*100).toFixed(0)}% ${en?'of income':'des Einkommens'}). ${en?'Room to optimize?':'Optimierungspotenzial?'}`, 'AMBER']);

  const openGoals = state.data.sparziele.filter(s=>s.gespart<s.ziel);
  if(openGoals.length){
    const nearest = openGoals.reduce((a,b)=> (b.ziel-b.gespart)<(a.ziel-a.gespart)?b:a);
    const rest = nearest.ziel-nearest.gespart;
    const months = bilanz>0 ? (rest/bilanz).toFixed(0) : '–';
    tips.push(['🎯', en?'Next goal':'Nächstes Ziel', `"${nearest.name}": ${en?'still needs':'noch'} ${fmt(rest)}. ${en?`Reachable in ~${months} months at current rate.`:`Bei aktueller Rate in ${months} Monaten erreichbar.`}`, 'GREEN']);
  }

  if(state.data.wiederkehrend.length){
    const wsum = state.data.wiederkehrend.filter(w=>!w.istEinnahme).reduce((s,w)=>s+w.betrag,0);
    tips.push(['🔄', en?'Fixed costs':'Fixkosten', `${fmt(wsum)} ${en?'in monthly fixed costs':'monatliche Fixkosten'} (${(ein>0?wsum/ein*100:0).toFixed(0)}% ${en?'of income':'des Einkommens'}).`, 'AMBER']);
  }

  tips.push(['💡', en?'Recommendation':'Empfehlung', `${en?'3-month emergency fund':'3-Monats-Notgroschen'}: ${fmt(aus*3)}. ${en?'Secures financial stability.':'Sichert finanzielle Stabilität.'}`, 'GREEN']);
  return tips;
}

function renderAI(c){
  const buf = gefilterteBuchungen();
  const ein = summeEin(buf), aus = summeAus(buf);
  const spar = ein>0 ? (ein-aus)/ein*100 : 0;
  const bilanz = ein-aus;
  const score = Math.min(100, Math.max(0, Math.round(spar*2 + (bilanz>0?30:0) + state.data.sparziele.length*5)));
  const scoreColor = score>=60?'var(--green)':score>=30?'var(--amber)':'var(--red)';
  const tips = generateAITips(buf, ein, aus, spar, bilanz);
  const en = state.lang==='en';

  const katCounts = {};
  buf.forEach(b=> katCounts[b.kategorie]=(katCounts[b.kategorie]||0)+1);
  const catRows = Object.entries(katCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);

  c.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <h3>${t('ai')} – ${(state.lang==='en'?MONATE_EN:MONATE)[state.aktiverMonat-1]} ${state.aktivesJahr}</h3>
      <div style="color:var(--muted); font-size:12.5px; margin-bottom:14px;">${en?'Personalized tips based on your bookings.':'Persönliche Tipps auf Basis deiner Buchungen.'}</div>
      <div style="display:flex; align-items:center; gap:14px;">
        <span style="font-weight:700; color:${scoreColor}; white-space:nowrap; font-size:13.5px;">${t('financeScore')}${score}/100</span>
        <div class="bar-track" style="flex:1;"><div class="bar-fill" style="width:${score}%; background:${scoreColor};"></div></div>
      </div>
    </div>
    <div class="grid grid-2" style="margin-bottom:16px;">
      ${tips.map(([icon,title,text,level])=>{
        const col = `var(--${level==='RED'?'red':level==='AMBER'?'amber':'green'})`;
        return `
        <div class="tip-card" style="border-left:3px solid ${col};">
          <div class="tt" style="color:${col};">${icon} ${title}</div>
          <div class="tx">${escapeHtml(text)}</div>
        </div>`;}).join('')}
    </div>
    <div class="card" style="margin-bottom:16px;">
      <h3>${en?'Category overview':'Kategorie-Übersicht'}</h3>
      ${catRows.length ? catRows.map(([k,v])=>`
        <div style="display:flex; justify-content:space-between; padding:7px 0; font-size:13px;">
          <span>${KAT_ICON[k]||''} ${catLabel(k)}</span>
          <span style="color:var(--muted);">${v} ${en?'transactions':'Buchungen'}</span>
        </div>`).join('') : `<div class="empty-state">${t('noData')}</div>`}
    </div>
  `;
}

/* ---------------------------- SETTINGS -------------------------------------- */
function renderSettings(c){
  c.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="settings-row">
        <div><div class="lbl">${t('theme')}</div><div class="desc">${state.lang==='en'?'Choose your visual style':'Wähle dein Design'}</div></div>
        <div class="seg" id="theme-seg" style="width:220px;">
          <button data-v="dark" class="${state.theme==='dark'?'active':''}">${state.lang==='en'?'Dark':'Dunkel'}</button>
          <button data-v="light" class="${state.theme==='light'?'active':''}">${state.lang==='en'?'Light':'Hell'}</button>
          <button data-v="neon" class="${state.theme==='neon'?'active':''}">Neon</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="lbl">${t('language')}</div><div class="desc">${state.lang==='en'?'Interface language':'Sprache der Oberfläche'}</div></div>
        <div class="seg" id="lang-seg" style="width:140px;">
          <button data-v="de" class="${state.lang==='de'?'active':''}">DE</button>
          <button data-v="en" class="${state.lang==='en'?'active':''}">EN</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="lbl">${t('exportCsv')}</div><div class="desc">${state.lang==='en'?'Download all bookings as CSV':'Alle Buchungen als CSV herunterladen'}</div></div>
        <button class="btn btn-ghost btn-sm" id="btn-export">⬇ CSV</button>
      </div>
    </div>
    <div class="card">
      <div class="settings-row">
        <div><div class="lbl" style="color:var(--red);">${t('deleteAccount')}</div><div class="desc">${state.lang==='en'?'Permanently delete this account and all its data.':'Löscht dieses Konto und alle Daten unwiderruflich.'}</div></div>
        <button class="btn btn-danger btn-sm" id="btn-del-account">${t('deleteAccount')}</button>
      </div>
    </div>
  `;
  document.querySelectorAll('#theme-seg button').forEach(b=>{
    b.onclick = ()=>{ state.theme = b.dataset.v; persist(); render(); };
  });
  document.querySelectorAll('#lang-seg button').forEach(b=>{
    b.onclick = ()=>{ state.lang = b.dataset.v; persist(); render(); };
  });
  document.getElementById('btn-export').onclick = exportCsv;
  document.getElementById('btn-del-account').onclick = async ()=>{
    if(!confirm(state.lang==='en'?'Really delete this account? This cannot be undone.':'Konto wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return;
    const users = await Store.getUsers();
    const updated = users.filter(u=>u.username!==state.authUsername);
    await Store.saveUsers(updated);
    await window.storage.delete('data:'+state.authUsername, false).catch(()=>{});
    doLogout();
  };
}

function exportCsv(){
  const rows = [['Datum','Beschreibung','Betrag','Kategorie','Notiz','IstEinnahme']];
  state.data.buchungen.forEach(b=> rows.push([b.datum,b.beschreibung,b.betrag,b.kategorie,b.notiz||'',b.istEinnahme]));
  const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'finanzmanager_export.csv';
  a.click();
}

/* ---------------------------- STORAGE WARNING BANNER --------------------------- */
function storageWarningBannerHtml(){
  if(typeof window.__storageDiag === 'undefined' || window.__storageDiag.ok) return '';
  const en = state.lang==='en';
  return `<div id="storage-warn" style="position:fixed; top:0; left:0; right:0; z-index:500; background:var(--red); color:#fff; padding:10px 18px; font-size:12.5px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:14px;">
    <span>⚠ ${en?'Your browser is blocking local storage — data will NOT be saved after you close this tab.':'Dein Browser blockiert den lokalen Speicher — Daten werden NICHT gespeichert, wenn du diesen Tab schließt.'}
    ${en?'In Brave: click the Shields icon and allow cookies/storage for this site, or disable Private/Incognito mode.':'Bei Brave: Klicke auf das Shields-Symbol und erlaube Cookies/Speicher für diese Seite, oder verlasse den privaten/Inkognito-Modus.'}</span>
    <button onclick="document.getElementById('storage-warn').remove()" style="background:rgba(255,255,255,.2); border:none; color:#fff; border-radius:6px; padding:3px 9px; cursor:pointer; font-weight:700;">✕</button>
  </div>`;
}
function injectStorageWarning(){
  const existing = document.getElementById('storage-warn');
  if(existing) existing.remove();
  const html = storageWarningBannerHtml();
  if(!html) return;
  document.body.insertAdjacentHTML('afterbegin', html);
}

/* ---------------------------- BOOTSTRAP --------------------------------------- */
(async function init(){
  applyTheme();
  root.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:13px;">Lädt…</div>`;
  render();
  injectStorageWarning();
})();
