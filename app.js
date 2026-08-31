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
KAT_ICON['Überweisung'] = '🔄';

const KONTO_TYP_ICON = { bank:"🏦", bargeld:"💵", kreditkarte:"💳", sonstiges:"📁" };
const KONTO_TYPEN = ["bank","bargeld","kreditkarte","sonstiges"];
const FREE_KONTEN_LIMIT = 2; // Free-Plan: max. 2 Konten, Pro: unbegrenzt

// Stichwort → Kategorie für die automatische Kategorisierung beim Erfassen
// einer Buchung. Bewusst simpel (Substring-Suche in der Beschreibung),
// deckt aber die häufigsten deutschen Händler/Anbieter ab.
const AUTO_KAT_KEYWORDS = [
  ['miete', 'Wohnen'], ['nebenkosten', 'Wohnen'], ['strom', 'Wohnen'], ['gas ', 'Wohnen'], ['hausrat', 'Wohnen'],
  ['rewe', 'Lebensmittel'], ['edeka', 'Lebensmittel'], ['aldi', 'Lebensmittel'], ['lidl', 'Lebensmittel'],
  ['kaufland', 'Lebensmittel'], ['netto', 'Lebensmittel'], ['penny', 'Lebensmittel'], ['supermarkt', 'Lebensmittel'],
  ['tankstelle', 'Transport'], ['tanken', 'Transport'], ['shell', 'Transport'], ['aral', 'Transport'], ['esso', 'Transport'],
  ['db bahn', 'Transport'], ['deutsche bahn', 'Transport'], ['bvg', 'Transport'], ['uber', 'Transport'], ['bolt', 'Transport'],
  ['apotheke', 'Gesundheit'], ['arzt', 'Gesundheit'], ['zahnarzt', 'Gesundheit'], ['krankenkasse', 'Gesundheit'],
  ['netflix', 'Freizeit'], ['spotify', 'Freizeit'], ['disney', 'Freizeit'], ['kino', 'Freizeit'], ['steam', 'Freizeit'],
  ['fitness', 'Freizeit'], ['gym', 'Freizeit'], ['restaurant', 'Freizeit'], ['amazon prime', 'Freizeit'],
  ['zara', 'Kleidung'], ['h&m', 'Kleidung'], ['hm ', 'Kleidung'], ['zalando', 'Kleidung'], ['primark', 'Kleidung'],
  ['gehalt', 'Gehalt'], ['lohn', 'Gehalt'], ['kindergeld', 'Kindergeld'], ['bürgergeld', 'Bürgergeld'], ['jobcenter', 'Bürgergeld'],
];
function guessKategorie(text, isIncome){
  const lower = (text||'').trim().toLowerCase();
  if(lower.length<3) return null;

  // 1) Aus der eigenen Buchungshistorie lernen: gab es schon mal eine sehr
  // ähnliche Beschreibung? Dann deren Kategorie vorschlagen (aktuellste
  // zuerst) — das ist "smarter" als feste Stichwörter, weil es sich an
  // Händler/Bezeichnungen anpasst, die NUR bei dir vorkommen.
  const words = lower.split(/\s+/).filter(w=>w.length>=3);
  if(words.length){
    const kandidaten = state.data.buchungen
      .filter(b=> b.istEinnahme===isIncome && !b.istUeberweisung)
      .slice().sort((a,b)=> b.datum.localeCompare(a.datum));
    for(const b of kandidaten){
      const bl = b.beschreibung.toLowerCase();
      // Treffer: mind. ein signifikantes Wort (≥3 Zeichen) kommt in beiden Texten vor
      if(words.some(w=> bl.includes(w)) || words.some(w=> lower.includes(w) && bl.split(/\s+/).some(bw=>bw.length>=3 && w.includes(bw)))){
        if(allCats(isIncome).some(k=>k.key===b.kategorie)) return b.kategorie;
      }
    }
  }

  // 2) Fallback: feste Stichwortliste (deckt Erstnutzung ohne Historie ab)
  const hit = AUTO_KAT_KEYWORDS.find(([kw]) => lower.includes(kw));
  if(!hit) return null;
  const [,kat] = hit;
  const gueltig = allCats(isIncome).some(k=>k.key===kat);
  return gueltig ? kat : null;
}

const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MONATE_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONATE_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
function monateFor(lang){ return lang==='en' ? MONATE_EN : lang==='ar' ? MONATE_AR : MONATE; }

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
    deleteAccount:"Alle Daten löschen", allGood:"Alles im grünen Bereich — keine besonderen Hinweise.",
    transactions:"Buchungen", noGoals:"Noch keine Sparziele angelegt.", noRecurring:"Keine wiederkehrenden Zahlungen.",
    reached:"erreicht", of:"von", remaining:"noch offen", forgotPassword:"Passwort vergessen?",
    resetTitle:"Passwort zurücksetzen", resetDesc:"Gib deinen Benutzernamen ein. Falls ein Konto mit hinterlegter E-Mail existiert, senden wir dir einen Link zum Zurücksetzen.",
    sendResetLink:"Link senden", resetSent:"Falls das Konto existiert und eine E-Mail hinterlegt ist, wurde soeben eine E-Mail mit einem Reset-Link verschickt. Bitte Posteingang (auch Spam-Ordner) prüfen.",
    backToLogin:"Zurück zum Login", emailOptional:"E-Mail (optional – für Passwort-Reset)",
    emailHint:"Ohne E-Mail-Adresse kann das Passwort nur von einem Admin über das Supabase-Dashboard zurückgesetzt werden.",
    newPasswordTitle:"Neues Passwort festlegen", newPassword:"Neues Passwort", setPassword:"Passwort speichern",
    passwordUpdated:"Passwort wurde geändert. Du kannst dich jetzt anmelden.",
    importSuccess:"Buchungen erfolgreich importiert.", importError:"CSV konnte nicht gelesen werden. Bitte Format prüfen.",
    brokenConn:"Verbindung zu Supabase konnte nicht hergestellt werden. Das passiert oft, wenn Browser-Schutzfunktionen (z. B. Brave Shields, Werbeblocker) Anfragen blockieren. Bitte Shields für diese Seite deaktivieren oder einen anderen Browser testen.",
    accounts:"Konten", account:"Konto", allAccounts:"Alle Konten", allCategories:"Alle Kategorien",
    search:"Suche", edit:"Bearbeiten", konto_bank:"Bank", konto_bargeld:"Bargeld", konto_kreditkarte:"Kreditkarte", konto_sonstiges:"Sonstiges",
    addAccount:"Konto hinzufügen", editAccount:"Konto bearbeiten", accountName:"Kontoname", accountType:"Kontoart",
    startBalance:"Startguthaben (€)", startBalanceLocked:"Das Startguthaben kann nach dem Anlegen nicht mehr geändert werden — bei Bedarf per Buchung korrigieren.",
    transfer:"Überweisung", transferFrom:"Von Konto", transferTo:"Auf Konto",
    sameAccountError:"Quell- und Zielkonto müssen unterschiedlich sein.", needTwoAccounts:"Du brauchst mindestens 2 Konten für eine Überweisung.",
    lastAccountError:"Das letzte verbleibende Konto kann nicht gelöscht werden.", accountNotEmptyError:"Dieses Konto hat noch Buchungen. Bitte erst verschieben oder löschen.",
    accountLimitReached:`Im Free-Plan sind maximal ${FREE_KONTEN_LIMIT} Konten möglich. Mit Pro unbegrenzt.`, totalBalance:"Gesamtguthaben",
    fillAllFields:"Bitte alle Felder ausfüllen.", manageCategories:"Eigene Kategorien", addCategory:"Kategorie hinzufügen",
    categoryName:"Name der Kategorie", categoryIcon:"Icon (Emoji)", parentCategory:"Oberkategorie (optional, für Unterkategorie)",
    none:"Keine", subcategoryOf:"Unterkategorie von", noCustomCategories:"Noch keine eigenen Kategorien angelegt.",
    categoryInUseConfirm:"Diese Kategorie wird bereits verwendet. Trotzdem löschen? (Vorhandene Buchungen behalten den Namen.)",
    categoryExists:"Diese Kategorie gibt es schon.", planFree:"Free-Plan", planPro:"Pro-Plan",
    planFreeDesc:`Kostenlos, max. ${FREE_KONTEN_LIMIT} Konten.`, planProDesc:"Unbegrenzte Konten & alle Funktionen freigeschaltet.",
    upgradeNow:"Upgrade auf Pro", upgradeComingSoon:"Die Bezahlfunktion ist technisch vorbereitet, aber noch nicht aktiv geschaltet.",
    budgetTab:"Budget", overallBudget:"Gesamtbudget", overallBudgetDesc:"Monatliches Limit für alle Ausgaben zusammen.",
    setOverallBudget:"Festlegen", noOverallBudget:"Noch kein Gesamtbudget festgelegt.", categoryBudgets:"Budgets pro Kategorie",
    addBudget:"Budget hinzufügen", noBudgets:"Noch keine Budgets angelegt.", budgetLeft:"noch übrig",
    budgetOverBy:"überschritten um", suggestBudgets:"Vorschlag berechnen", suggestionsAdded:"Budgets vorgeschlagen",
    noSuggestions:"Keine Vorschläge möglich — noch nicht genug Ausgaben-Historie.", allCategoriesHaveBudget:"Für alle Kategorien ist bereits ein Budget angelegt.",
    subsPerMonth:"Abos & Wiederkehrend / Monat", subsPerYear:"Hochgerechnet / Jahr", interval:"Intervall",
    monthly:"Monatlich", yearly:"Jährlich", reminderDays:"Erinnerung (Tage vorher)", cancelBy:"Kündigungsfrist",
    downloadReport:"Monatsbericht (PDF)", allTime:"Gesamter Zeitraum", thisMonthScope:"Aktueller Monat",
    unusualExpenses:"Ungewöhnlich hohe Ausgaben", noAnomalies:"Keine auffälligen Ausgaben diesen Monat.",
    savingsPlanTitle:"Wie kann ich sparen?", savingsPlanDesc:"Gib einen Zielbetrag ein — wir schlagen vor, wo du kürzen könntest.",
    targetSavings:"Zielbetrag (€ / Monat)", calculatePlan:"Berechnen", savingsPlanResult:"Damit sparst du ca.",
    savingsPlanShortfall:"Für die restlichen fehlt noch:", noSavingsPlanPossible:"Nicht genug Ausgaben-Historie für einen Vorschlag.",
    deepAiTitle:"Tiefere KI-Analyse", deepAiDesc:"Lässt Claude deine Zahlen wirklich durchdenken statt fester Regeln zu folgen.",
    generateAnalysis:"Analyse erstellen", proOnly:"Nur mit Pro", proOnlyDesc:"Diese Funktion ist Teil des Pro-Plans (jede Analyse kostet echte API-Nutzung).",
    generatingAnalysis:"Claude denkt nach…", deepAiError:"Die Analyse konnte gerade nicht erstellt werden. Bitte später erneut versuchen.",
    savingsStreak:"Sparstreak", month:"Monat", months:"Monate", streakGoing:"Weiter so — jeden Monat im Plus bleiben, um den Streak zu halten!",
    streakStart:"Starte deinen Streak, indem du diesen Monat im Plus abschließt.", monthlyGoal:"Monatsziel", setGoal:"Festlegen",
    noMonthlyGoal:"Noch kein Monatsziel festgelegt.", achievements:"Erfolge",
    badge_first_tx:"Erste Buchung", badge_fifty_tx:"50 Buchungen", badge_century_tx:"100 Buchungen",
    badge_goal_reached:"Sparziel erreicht", badge_streak3:"3-Monats-Streak", badge_streak6:"6-Monats-Streak",
    badge_multi_account:"3+ Konten", badge_budgeter:"Erstes Budget", badge_saver20:"20% Sparquote"
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
    deleteAccount:"Delete all data", allGood:"Everything looks good — no alerts.",
    transactions:"Transactions", noGoals:"No savings goals yet.", noRecurring:"No recurring payments.",
    reached:"reached", of:"of", remaining:"remaining", forgotPassword:"Forgot password?",
    resetTitle:"Reset password", resetDesc:"Enter your username. If an account with an email on file exists, we'll send a reset link.",
    sendResetLink:"Send link", resetSent:"If the account exists and has an email on file, a reset email was just sent. Please check your inbox (and spam folder).",
    backToLogin:"Back to login", emailOptional:"Email (optional – for password reset)",
    emailHint:"Without an email address, only an admin can reset the password via the Supabase dashboard.",
    newPasswordTitle:"Set new password", newPassword:"New password", setPassword:"Save password",
    passwordUpdated:"Password changed. You can now log in.",
    importSuccess:"Transactions imported successfully.", importError:"Could not read the CSV. Please check the format.",
    brokenConn:"Could not connect to Supabase. This is often caused by browser protections (e.g. Brave Shields, ad blockers) blocking requests. Please disable Shields for this site or try a different browser.",
    accounts:"Accounts", account:"Account", allAccounts:"All accounts", allCategories:"All categories",
    search:"Search", edit:"Edit", konto_bank:"Bank", konto_bargeld:"Cash", konto_kreditkarte:"Credit card", konto_sonstiges:"Other",
    addAccount:"Add account", editAccount:"Edit account", accountName:"Account name", accountType:"Account type",
    startBalance:"Starting balance (€)", startBalanceLocked:"The starting balance can't be changed after creation — adjust it with a booking if needed.",
    transfer:"Transfer", transferFrom:"From account", transferTo:"To account",
    sameAccountError:"Source and destination account must be different.", needTwoAccounts:"You need at least 2 accounts to make a transfer.",
    lastAccountError:"The last remaining account can't be deleted.", accountNotEmptyError:"This account still has bookings. Please move or delete them first.",
    accountLimitReached:`The Free plan allows up to ${FREE_KONTEN_LIMIT} accounts. Unlimited with Pro.`, totalBalance:"Total balance",
    fillAllFields:"Please fill in all fields.", manageCategories:"Custom categories", addCategory:"Add category",
    categoryName:"Category name", categoryIcon:"Icon (emoji)", parentCategory:"Parent category (optional, for a subcategory)",
    none:"None", subcategoryOf:"Subcategory of", noCustomCategories:"No custom categories yet.",
    categoryInUseConfirm:"This category is already in use. Delete anyway? (Existing bookings keep the name.)",
    categoryExists:"This category already exists.", planFree:"Free plan", planPro:"Pro plan",
    planFreeDesc:`Free, up to ${FREE_KONTEN_LIMIT} accounts.`, planProDesc:"Unlimited accounts & all features unlocked.",
    upgradeNow:"Upgrade to Pro", upgradeComingSoon:"The payment flow is technically ready but not switched on yet.",
    budgetTab:"Budget", overallBudget:"Overall budget", overallBudgetDesc:"Monthly limit for all expenses combined.",
    setOverallBudget:"Set", noOverallBudget:"No overall budget set yet.", categoryBudgets:"Budgets per category",
    addBudget:"Add budget", noBudgets:"No budgets set up yet.", budgetLeft:"left",
    budgetOverBy:"over by", suggestBudgets:"Suggest budgets", suggestionsAdded:"Budgets suggested",
    noSuggestions:"No suggestions possible yet — not enough spending history.", allCategoriesHaveBudget:"All categories already have a budget.",
    subsPerMonth:"Subscriptions & recurring / month", subsPerYear:"Projected / year", interval:"Interval",
    monthly:"Monthly", yearly:"Yearly", reminderDays:"Reminder (days before)", cancelBy:"Cancel by",
    downloadReport:"Monthly report (PDF)", allTime:"All time", thisMonthScope:"Current month",
    unusualExpenses:"Unusually high expenses", noAnomalies:"No unusual expenses this month.",
    savingsPlanTitle:"How can I save?", savingsPlanDesc:"Enter a target amount — we'll suggest where you could cut back.",
    targetSavings:"Target amount (€ / month)", calculatePlan:"Calculate", savingsPlanResult:"That saves you about",
    savingsPlanShortfall:"Still missing for the rest:", noSavingsPlanPossible:"Not enough spending history for a suggestion.",
    deepAiTitle:"Deeper AI analysis", deepAiDesc:"Lets Claude actually reason about your numbers instead of following fixed rules.",
    generateAnalysis:"Generate analysis", proOnly:"Pro only", proOnlyDesc:"This feature is part of the Pro plan (each analysis uses real API usage).",
    generatingAnalysis:"Claude is thinking…", deepAiError:"The analysis couldn't be generated right now. Please try again later.",
    savingsStreak:"Savings streak", month:"month", months:"months", streakGoing:"Keep it up — stay in the black each month to keep your streak alive!",
    streakStart:"Start your streak by ending this month in the black.", monthlyGoal:"Monthly goal", setGoal:"Set",
    noMonthlyGoal:"No monthly goal set yet.", achievements:"Achievements",
    badge_first_tx:"First booking", badge_fifty_tx:"50 bookings", badge_century_tx:"100 bookings",
    badge_goal_reached:"Goal reached", badge_streak3:"3-month streak", badge_streak6:"6-month streak",
    badge_multi_account:"3+ accounts", badge_budgeter:"First budget", badge_saver20:"20% savings rate"
  },
  ar: {
    dashboard:"لوحة التحكم", income:"الدخل", expenses:"المصروفات", goals:"أهداف الادخار",
    recurring:"مدفوعات متكررة", payslip:"حاسبة الراتب", ai:"تحليل ذكي", settings:"الإعدادات",
    logout:"تسجيل الخروج", addIncome:"+ دخل", addExpense:"− مصروف", balance:"الرصيد",
    savingsRate:"معدل الادخار", totalIncome:"إجمالي الدخل", totalExpenses:"إجمالي المصروفات",
    noData:"لا توجد عمليات لهذا الشهر بعد.", delete:"حذف", save:"حفظ",
    cancel:"إلغاء", description:"الوصف", amount:"المبلغ (€)", category:"الفئة",
    date:"التاريخ", note:"ملاحظة (اختياري)", newGoal:"+ هدف ادخار جديد", goalName:"اسم الهدف",
    targetAmount:"المبلغ المستهدف (€)", currentAmount:"المدخر حاليًا (€)", deposit:"+ إيداع",
    depositAmount:"مبلغ الإيداع (€)", newRecurring:"+ دفعة جديدة", nextDue:"الاستحقاق القادم",
    bookNow:"تسجيل الآن", overdue:"متأخر", dueSoon:"مستحق قريبًا", grossSalary:"الراتب الإجمالي (€)",
    taxClass:"فئة الضريبة", churchTax:"ضريبة الكنيسة", kvExtra:"رسم إضافي للتأمين الصحي (%)",
    calculate:"احسب", applyToIncome:"إضافة كدخل", netSalary:"صافي الراتب",
    totalDeductions:"إجمالي الاستقطاعات", deductionRate:"نسبة الاستقطاع", financeScore:"المؤشر المالي: ",
    autoCategorize:"اقتراح الفئات تلقائيًا", exportCsv:"تصدير كملف CSV",
    importCsv:"استيراد CSV", theme:"المظهر", language:"اللغة", dangerZone:"الحساب",
    deleteAccount:"حذف جميع البيانات", allGood:"كل شيء على ما يرام — لا توجد تنبيهات.",
    transactions:"العمليات", noGoals:"لا توجد أهداف ادخار بعد.", noRecurring:"لا توجد مدفوعات متكررة.",
    reached:"تم تحقيقه", of:"من", remaining:"المتبقي", forgotPassword:"هل نسيت كلمة المرور؟",
    resetTitle:"إعادة تعيين كلمة المرور", resetDesc:"أدخل اسم المستخدم الخاص بك. إذا كان هناك حساب ببريد إلكتروني مسجل، سنرسل رابط إعادة التعيين.",
    sendResetLink:"إرسال الرابط", resetSent:"إذا كان الحساب موجودًا وله بريد إلكتروني مسجل، فقد تم للتو إرسال رسالة لإعادة التعيين. يرجى التحقق من صندوق الوارد ومجلد البريد غير المرغوب فيه.",
    backToLogin:"العودة لتسجيل الدخول", emailOptional:"البريد الإلكتروني (اختياري – لإعادة تعيين كلمة المرور)",
    emailHint:"بدون بريد إلكتروني، يمكن فقط لمسؤول النظام إعادة تعيين كلمة المرور عبر لوحة تحكم Supabase.",
    newPasswordTitle:"تعيين كلمة مرور جديدة", newPassword:"كلمة المرور الجديدة", setPassword:"حفظ كلمة المرور",
    passwordUpdated:"تم تغيير كلمة المرور. يمكنك الآن تسجيل الدخول.",
    importSuccess:"تم استيراد العمليات بنجاح.", importError:"تعذّرت قراءة ملف CSV. يرجى التحقق من التنسيق.",
    brokenConn:"تعذّر الاتصال بـ Supabase. غالبًا ما يحدث هذا بسبب أدوات حماية المتصفح (مثل Brave Shields أو أدوات حظر الإعلانات) التي تمنع الطلبات. يرجى تعطيل Shields لهذا الموقع أو تجربة متصفح آخر.",
    accounts:"الحسابات", account:"حساب", allAccounts:"كل الحسابات", allCategories:"كل الفئات",
    search:"بحث", edit:"تعديل", konto_bank:"بنك", konto_bargeld:"نقدًا", konto_kreditkarte:"بطاقة ائتمان", konto_sonstiges:"أخرى",
    addAccount:"إضافة حساب", editAccount:"تعديل الحساب", accountName:"اسم الحساب", accountType:"نوع الحساب",
    startBalance:"الرصيد الافتتاحي (€)", startBalanceLocked:"لا يمكن تغيير الرصيد الافتتاحي بعد الإنشاء — يمكن تصحيحه عبر عملية إذا لزم الأمر.",
    transfer:"تحويل", transferFrom:"من حساب", transferTo:"إلى حساب",
    sameAccountError:"يجب أن يكون حساب المصدر والوجهة مختلفين.", needTwoAccounts:"تحتاج إلى حسابين على الأقل لإجراء تحويل.",
    lastAccountError:"لا يمكن حذف آخر حساب متبقٍ.", accountNotEmptyError:"لا يزال هذا الحساب يحتوي على عمليات. يرجى نقلها أو حذفها أولاً.",
    accountLimitReached:`الخطة المجانية تسمح بحد أقصى ${FREE_KONTEN_LIMIT} حسابات. غير محدود مع Pro.`, totalBalance:"الرصيد الإجمالي",
    fillAllFields:"يرجى ملء جميع الحقول.", manageCategories:"فئات مخصصة", addCategory:"إضافة فئة",
    categoryName:"اسم الفئة", categoryIcon:"أيقونة (رمز تعبيري)", parentCategory:"الفئة الرئيسية (اختياري، لفئة فرعية)",
    none:"لا شيء", subcategoryOf:"فئة فرعية من", noCustomCategories:"لا توجد فئات مخصصة بعد.",
    categoryInUseConfirm:"هذه الفئة مستخدمة بالفعل. هل تريد حذفها على أي حال؟ (العمليات الحالية تحتفظ بالاسم.)",
    categoryExists:"هذه الفئة موجودة بالفعل.", planFree:"الخطة المجانية", planPro:"خطة Pro",
    planFreeDesc:`مجانية، حتى ${FREE_KONTEN_LIMIT} حسابات.`, planProDesc:"حسابات غير محدودة وجميع الميزات مفعّلة.",
    upgradeNow:"الترقية إلى Pro", upgradeComingSoon:"نظام الدفع جاهز تقنيًا لكنه غير مفعّل بعد.",
    budgetTab:"الميزانية", overallBudget:"الميزانية الإجمالية", overallBudgetDesc:"الحد الشهري لجميع المصروفات مجتمعة.",
    setOverallBudget:"تحديد", noOverallBudget:"لم يتم تحديد ميزانية إجمالية بعد.", categoryBudgets:"ميزانيات حسب الفئة",
    addBudget:"إضافة ميزانية", noBudgets:"لا توجد ميزانيات بعد.", budgetLeft:"متبقٍ",
    budgetOverBy:"تجاوزت بمقدار", suggestBudgets:"اقتراح ميزانية", suggestionsAdded:"تم اقتراح ميزانيات",
    noSuggestions:"لا يمكن تقديم اقتراحات بعد — لا يوجد سجل إنفاق كافٍ.", allCategoriesHaveBudget:"جميع الفئات لديها ميزانية بالفعل.",
    subsPerMonth:"الاشتراكات والمدفوعات المتكررة / شهريًا", subsPerYear:"المتوقع / سنويًا", interval:"الفاصل الزمني",
    monthly:"شهري", yearly:"سنوي", reminderDays:"تذكير (أيام قبل الاستحقاق)", cancelBy:"مهلة الإلغاء",
    downloadReport:"تقرير شهري (PDF)", allTime:"كل الفترة", thisMonthScope:"الشهر الحالي",
    unusualExpenses:"مصروفات مرتفعة بشكل غير معتاد", noAnomalies:"لا توجد مصروفات غير معتادة هذا الشهر.",
    savingsPlanTitle:"كيف يمكنني الادخار؟", savingsPlanDesc:"أدخل مبلغًا مستهدفًا — سنقترح أين يمكنك التوفير.",
    targetSavings:"المبلغ المستهدف (€ / شهريًا)", calculatePlan:"احسب", savingsPlanResult:"بهذا توفر حوالي",
    savingsPlanShortfall:"ما زال ناقصًا للباقي:", noSavingsPlanPossible:"لا يوجد سجل إنفاق كافٍ لتقديم اقتراح.",
    deepAiTitle:"تحليل ذكي أعمق", deepAiDesc:"يجعل Claude يفكر فعليًا في أرقامك بدلاً من اتباع قواعد ثابتة.",
    generateAnalysis:"إنشاء تحليل", proOnly:"لأعضاء Pro فقط", proOnlyDesc:"هذه الميزة جزء من خطة Pro (كل تحليل يستهلك استخدامًا فعليًا لواجهة برمجة التطبيقات).",
    generatingAnalysis:"Claude يفكر…", deepAiError:"تعذّر إنشاء التحليل الآن. يرجى المحاولة لاحقًا.",
    savingsStreak:"سلسلة الادخار", month:"شهر", months:"أشهر", streakGoing:"استمر — ابقَ في الأرباح كل شهر للحفاظ على سلسلتك!",
    streakStart:"ابدأ سلسلتك بإنهاء هذا الشهر بأرباح.", monthlyGoal:"هدف الشهر", setGoal:"تحديد",
    noMonthlyGoal:"لم يتم تحديد هدف شهري بعد.", achievements:"الإنجازات",
    badge_first_tx:"أول عملية", badge_fifty_tx:"50 عملية", badge_century_tx:"100 عملية",
    badge_goal_reached:"تحقيق هدف ادخار", badge_streak3:"سلسلة 3 أشهر", badge_streak6:"سلسلة 6 أشهر",
    badge_multi_account:"3+ حسابات", badge_budgeter:"أول ميزانية", badge_saver20:"معدل ادخار 20%"
  }
};
function t(key){ return (L[state.lang] && L[state.lang][key]) || L.de[key] || key; }
function catLabel(key){
  if(state.lang==="en"){
    const map={Wohnen:"Housing",Lebensmittel:"Groceries",Transport:"Transport",Gesundheit:"Health",
      Freizeit:"Leisure",Kleidung:"Clothing",Sonstiges:"Other",Gehalt:"Salary",Freelance:"Freelance",
      Kindergeld:"Child benefit",Bürgergeld:"Basic income",Überweisung:"Transfer"};
    return map[key] || key;
  }
  if(state.lang==="ar"){
    const map={Wohnen:"سكن",Lebensmittel:"بقالة",Transport:"مواصلات",Gesundheit:"صحة",
      Freizeit:"ترفيه",Kleidung:"ملابس",Sonstiges:"أخرى",Gehalt:"راتب",Freelance:"عمل حر",
      Kindergeld:"إعانة أطفال",Bürgergeld:"دخل أساسي",Überweisung:"تحويل"};
    return map[key] || key;
  }
  return key;
}

/* ---------------------------- SUPABASE CLIENT ---------------------------- */
// SUPABASE_URL / SUPABASE_ANON_KEY kommen aus supabase-config.js
// Falls das supabase-js Skript von der CDN (jsdelivr) blockiert wurde — z.B.
// durch Brave Shields, einen Werbeblocker oder eine Firmen-Firewall — ist
// window.supabase nicht definiert. Statt eines kryptischen Fehlers oder
// eines ewigen Ladebildschirms zeigen wir dann eine klare Meldung.
if(!window.supabase){
  document.addEventListener('DOMContentLoaded', ()=>{
    const root = document.getElementById('root');
    if(root) root.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; padding:24px;">
      <div style="max-width:420px; text-align:center; color:#DCE4FC; font-family:-apple-system,sans-serif;">
        <div style="font-size:34px; margin-bottom:12px;">⚠️</div>
        <h2 style="margin:0 0 10px;">Skript konnte nicht geladen werden</h2>
        <p style="color:#8fa0c8; font-size:14px; line-height:1.6;">
          Die Supabase-Bibliothek (von cdn.jsdelivr.net) wurde von deinem Browser blockiert.
          Das passiert häufig bei <b>Brave</b> (Shields) oder Werbeblockern.<br><br>
          Bitte in Brave auf das Shields-Symbol (🛡) in der Adresszeile klicken und die
          Shields für diese Seite deaktivieren, oder <code>cdn.jsdelivr.net</code> in deinem
          Adblocker freigeben. Danach die Seite neu laden.
        </p>
      </div>
    </div>`;
  });
  throw new Error('supabase-js wurde nicht geladen (vermutlich blockiert)');
}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Interner Trick: Die App zeigt weiterhin "Benutzername" (wie im Original-
// Java-Programm), Supabase Auth braucht aber intern eine E-Mail-Adresse.
// Falls beim Registrieren keine echte E-Mail angegeben wird, bauen wir
// automatisch eine interne Pseudo-Adresse. Für den Login wird die
// tatsächlich hinterlegte Adresse serverseitig über die RPC-Funktion
// "get_login_email" (siehe schema.sql) anhand des Benutzernamens ermittelt.
function usernameToEmail(username){
  return username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '') + '@finanzmanager.local';
}
async function resolveLoginEmail(username){
  try{
    const { data, error } = await sb.rpc('get_login_email', { p_username: username.trim() });
    if(!error && data) return data;
  }catch(e){ /* Funktion evtl. noch nicht angelegt -> Fallback */ }
  return usernameToEmail(username);
}
function isNetworkError(e){
  return e && (e.message==='Failed to fetch' || e.message==='Load failed' || e instanceof TypeError);
}

/* ---------------------------- STORAGE (Supabase/Postgres) ---------------- */
const Store = {
  async getUserData(userId){
    try{
      const { data, error } = await sb.from('user_data').select('*').eq('id', userId).single();
      if(error || !data) return null;
      return migrateData({
        buchungen: data.buchungen || [],
        sparziele: data.sparziele || [],
        wiederkehrend: data.wiederkehrend || [],
        konten: data.konten || [],
        kategorien: data.kategorien || { ausgaben:[], einnahmen:[] },
        budgets: data.budgets || { gesamt:null, kategorien:[] },
        monatsziel: data.monatsziel ?? null,
        settings: data.settings || { theme:'dark', lang:'de' }
      });
    }catch(e){ console.error('getUserData Fehler:', e); return null; }
  },
  async createUserData(userId, displayName, data){
    const { error } = await sb.from('user_data').insert({
      id: userId, display_name: displayName,
      buchungen: data.buchungen, sparziele: data.sparziele,
      wiederkehrend: data.wiederkehrend, konten: data.konten,
      kategorien: data.kategorien, budgets: data.budgets, monatsziel: data.monatsziel, settings: data.settings
    });
    if(error) console.error('createUserData Fehler:', error);
    return !error;
  },
  async saveUserData(userId, data){
    const { error } = await sb.from('user_data').update({
      buchungen: data.buchungen, sparziele: data.sparziele,
      wiederkehrend: data.wiederkehrend, konten: data.konten,
      kategorien: data.kategorien, budgets: data.budgets, monatsziel: data.monatsziel, settings: data.settings,
      updated_at: new Date().toISOString()
    }).eq('id', userId);
    if(error) console.error('saveUserData Fehler:', error);
    return !error;
  },
  // Pro/Free-Plan lebt bewusst in einer EIGENEN Tabelle mit eigenen RLS-Regeln
  // (siehe schema.sql) — so kann ein Nutzer sich nicht einfach selbst über die
  // Browser-Konsole auf "pro" setzen. Nur eine serverseitige Funktion
  // (z.B. Stripe-Webhook mit service_role) darf das ändern.
  async createFreeSubscription(userId){
    const { error } = await sb.from('subscriptions').insert({ id:userId, plan:'free' });
    if(error) console.error('createFreeSubscription Fehler:', error);
    return !error;
  },
  async getPlan(userId){
    try{
      const { data, error } = await sb.from('subscriptions').select('plan').eq('id', userId).single();
      if(!error && data) return data.plan || 'free';
      // Kein Eintrag gefunden (z.B. Konto von vor Einführung des Pro/Free-
      // Systems) — automatisch einen Free-Eintrag nachtragen, damit das
      // nicht bei jedem alten Konto manuell im Dashboard gemacht werden muss.
      await this.createFreeSubscription(userId);
      return 'free';
    }catch(e){ console.error('getPlan Fehler:', e); return 'free'; }
  }
};

function emptyUserData(){
  return {
    buchungen: [],   // {id, beschreibung, betrag, kategorie, datum(ISO), notiz, istEinnahme, kontoId, istUeberweisung?, gegenkontoId?}
    sparziele: [],   // {id, name, ziel, gespart}
    wiederkehrend: [], // {id, name, betrag, kategorie, naechstesFaellig(ISO), istEinnahme, notiz, kontoId}
    konten: [{ id: uid(), name: "Hauptkonto", typ: "bank", startsaldo: 0 }], // {id, name, typ, startsaldo}
    kategorien: { ausgaben: [], einnahmen: [] }, // eigene Kategorien: {key, icon, eltern}
    budgets: { gesamt: null, kategorien: [] }, // gesamt: Zahl|null; kategorien: [{kategorie, betrag}]
    monatsziel: null, // Zahl|null — Sparziel pro Monat (wiederkehrend, nicht auf einen Monat fixiert)
    settings: { theme:"dark", lang:"de" }
  };
}

// Sorgt dafür, dass ältere Konten (vor Einführung von Mehrfach-Konten) nicht
// kaputtgehen: legt bei Bedarf ein Standardkonto an und hängt alle
// bestehenden Buchungen/wiederkehrenden Zahlungen ohne kontoId daran.
function migrateData(data){
  let changed = false;
  if(!data.konten || data.konten.length===0){
    data.konten = [{ id: uid(), name: "Hauptkonto", typ:"bank", startsaldo:0 }];
    changed = true;
  }
  const defaultKontoId = data.konten[0].id;
  data.buchungen.forEach(b=>{ if(!b.kontoId){ b.kontoId = defaultKontoId; changed = true; } });
  data.wiederkehrend.forEach(w=>{
    if(!w.kontoId){ w.kontoId = defaultKontoId; changed = true; }
    if(!w.intervall){ w.intervall = 'monatlich'; changed = true; }
    if(w.erinnerungTage==null){ w.erinnerungTage = 5; changed = true; }
    if(w.kuendigungsdatum===undefined){ w.kuendigungsdatum = null; changed = true; }
  });
  if(!data.kategorien) data.kategorien = { ausgaben:[], einnahmen:[] };
  if(!data.kategorien.ausgaben) data.kategorien.ausgaben = [];
  if(!data.kategorien.einnahmen) data.kategorien.einnahmen = [];
  if(!data.budgets) data.budgets = { gesamt:null, kategorien:[] };
  if(!data.budgets.kategorien) data.budgets.kategorien = [];
  if(data.monatsziel===undefined) data.monatsziel = null;
  data.__migrated = changed;
  return data;
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
  authId: null,            // Supabase Auth user id
  authUsername: null,
  displayName: null,
  theme: 'dark',
  lang: 'de',
  tab: 'dashboard',
  aktivesJahr: new Date().getFullYear(),
  aktiverMonat: new Date().getMonth()+1,
  data: emptyUserData(),
  plan: 'free', // 'free' | 'pro' — kommt aus der subscriptions-Tabelle, nicht clientseitig änderbar
  autoCategorize: true,
  txFilter: { search:'', kategorie:'', kontoId:'' },
  loginError: '',
  regError: ''
};
function isPro(){ return state.plan === 'pro'; }

function applyTheme(){
  document.body.setAttribute('data-theme', state.theme);
  const rtl = state.lang === 'ar';
  document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', state.lang);
}

async function persist(){
  if(!state.authId) return;
  state.data.settings = { theme: state.theme, lang: state.lang, autoCategorize: state.autoCategorize };
  const ok = await Store.saveUserData(state.authId, state.data);
  window.__syncOk = ok;
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
// Überweisungen zwischen eigenen Konten sind kein "echtes" Einkommen/Ausgabe —
// sie würden sonst Sparquote & Dashboard verfälschen (Geld bewegt sich nur
// zwischen eigenen Töpfen). Deshalb hier immer herausgefiltert.
function summeEin(list){ return list.filter(b=>b.istEinnahme && !b.istUeberweisung).reduce((s,b)=>s+b.betrag,0); }
function summeAus(list){ return list.filter(b=>!b.istEinnahme && !b.istUeberweisung).reduce((s,b)=>s+b.betrag,0); }

/* ---------------------------- HELPERS: KONTEN ------------------------------ */
function kontoSaldo(kontoId){
  const k = state.data.konten.find(x=>x.id===kontoId);
  if(!k) return 0;
  const sum = state.data.buchungen.filter(b=>b.kontoId===kontoId)
    .reduce((s,b)=> s + (b.istEinnahme ? b.betrag : -b.betrag), 0);
  return round2(k.startsaldo + sum);
}
function gesamtSaldo(){
  return round2(state.data.konten.reduce((s,k)=> s+kontoSaldo(k.id), 0));
}
function kontoName(kontoId){
  const k = state.data.konten.find(x=>x.id===kontoId);
  return k ? k.name : '—';
}

/* ---------------------------- HELPERS: KATEGORIEN --------------------------- */
// Kombiniert die fest eingebauten mit den vom Nutzer selbst angelegten
// Kategorien (inkl. optionaler Unterkategorien über "eltern").
function allCats(isIncome){
  const base = isIncome ? KAT_EINNAHMEN : KAT_AUSGABEN;
  const custom = isIncome ? state.data.kategorien.einnahmen : state.data.kategorien.ausgaben;
  return [...base, ...custom];
}
function iconFor(key){
  if(KAT_ICON[key]) return KAT_ICON[key];
  const found = [...state.data.kategorien.ausgaben, ...state.data.kategorien.einnahmen].find(k=>k.key===key);
  return found ? found.icon : '💠';
}

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
  trash:"🗑", plus:"+", logout:"⏻", konten:"🏦", budget:"📅"
};

/* ---------------------------- ROOT RENDER --------------------------------- */
const root = document.getElementById('root');

function render(){
  applyTheme();
  if(state.screen==='login') renderLogin();
  else if(state.screen==='register') renderRegister();
  else if(state.screen==='forgot') renderForgot();
  else if(state.screen==='reset-password') renderResetPassword();
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
        <div class="login-switch" style="margin-top:10px;"><b id="go-forgot">${t('forgotPassword')}</b></div>
        <div class="login-switch">Noch kein Konto? <b id="go-register">Registrieren</b></div>
      </div>
    </div>`;
  document.getElementById('go-register').onclick = ()=>{ state.screen='register'; state.regError=''; render(); };
  document.getElementById('go-forgot').onclick = ()=>{ state.screen='forgot'; state.forgotDone=false; render(); };
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
        <div class="field">
          <label>${t('emailOptional')}</label>
          <input id="re-email" type="email" autocomplete="email"/>
          <div style="font-size:11px; color:var(--muted); margin-top:5px; line-height:1.4;">${t('emailHint')}</div>
        </div>
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
    const email = await resolveLoginEmail(user);
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error){
      state.loginError = error.message==='Invalid login credentials'
        ? 'Benutzername oder Passwort falsch.'
        : 'Anmeldung fehlgeschlagen: '+error.message;
      return render();
    }
    await enterApp(data.user, user);
  }catch(e){
    console.error('Login-Fehler:', e);
    state.loginError = isNetworkError(e) ? t('brokenConn') : 'Unerwarteter Fehler beim Anmelden: '+(e.message||e);
    render();
  }
}

async function doRegister(){
  try{
    const name = document.getElementById('re-name').value.trim();
    const user = document.getElementById('re-user').value.trim();
    const pass = document.getElementById('re-pass').value;
    const realEmail = document.getElementById('re-email').value.trim();
    if(!name || !user || !pass){ state.regError='Bitte alle Felder ausfüllen.'; return render(); }
    if(pass.length<6){ state.regError='Passwort muss mind. 6 Zeichen haben.'; return render(); }
    if(!/^[a-zA-Z0-9_.-]+$/.test(user)){ state.regError='Benutzername darf nur Buchstaben, Zahlen, _ . - enthalten.'; return render(); }
    if(realEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(realEmail)){ state.regError='Bitte eine gültige E-Mail-Adresse eingeben (oder das Feld leer lassen).'; return render(); }
    const { data, error } = await sb.auth.signUp({
      email: realEmail || usernameToEmail(user), password: pass,
      options: { data: { username: user, display_name: name } }
    });
    if(error){
      state.regError = error.message.includes('already registered') || error.message.includes('already been registered')
        ? (realEmail ? 'Diese E-Mail-Adresse ist bereits registriert.' : 'Benutzername bereits vergeben.')
        : 'Registrierung fehlgeschlagen: '+error.message;
      return render();
    }
    if(!data.user){
      state.regError = 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      return render();
    }
    const ok = await Store.createUserData(data.user.id, name, emptyUserData());
    if(!ok){
      state.regError = 'Konto wurde erstellt, aber die Daten konnten nicht angelegt werden. Bitte kontaktiere den Support.';
      return render();
    }
    await Store.createFreeSubscription(data.user.id);
    await enterApp(data.user, user);
  }catch(e){
    console.error('Registrierungs-Fehler:', e);
    state.regError = isNetworkError(e) ? t('brokenConn') : 'Unerwarteter Fehler bei der Registrierung: '+(e.message||e);
    render();
  }
}

/* ---------------------------- PASSWORT VERGESSEN --------------------------- */
function renderForgot(){
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-brand"><span class="dot"></span> FinanzManager</div>
      <div class="login-card">
        <h1>${t('resetTitle')}</h1>
        <p class="sub">${t('resetDesc')}</p>
        ${state.forgotDone ? `
          <div class="err-msg show" style="background:var(--green-dim); color:var(--green);">${t('resetSent')}</div>
          <button class="btn btn-ghost" id="fp-back" style="width:100%;">${t('backToLogin')}</button>
        ` : `
          <div class="err-msg ${state.forgotError?'show':''}" id="fpErr">${state.forgotError||''}</div>
          <div class="field"><label>Benutzername</label><input id="fp-user" autocomplete="username"/></div>
          <button class="btn btn-primary" id="fp-submit">${t('sendResetLink')}</button>
          <div class="login-switch">${t('backToLogin').replace('Zurück zum ','')} <b id="fp-back2">${t('backToLogin')}</b></div>
        `}
      </div>
    </div>`;
  if(state.forgotDone){
    document.getElementById('fp-back').onclick = ()=>{ state.screen='login'; render(); };
  }else{
    document.getElementById('fp-submit').onclick = doForgotPassword;
    document.getElementById('fp-back2').onclick = ()=>{ state.screen='login'; render(); };
    const inp = document.getElementById('fp-user');
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter') doForgotPassword(); });
    inp.focus();
  }
}

async function doForgotPassword(){
  try{
    const user = document.getElementById('fp-user').value.trim();
    if(!user){ state.forgotError='Bitte Benutzernamen eingeben.'; return render(); }
    const email = await resolveLoginEmail(user);
    // Absichtlich immer die gleiche Erfolgsmeldung, egal ob der Benutzername
    // existiert oder eine E-Mail hinterlegt ist — verhindert, dass jemand
    // durch Ausprobieren herausfinden kann, welche Benutzernamen es gibt.
    if(email && !email.endsWith('@finanzmanager.local')){
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] });
      // Fehler wird dem Nutzer bewusst NICHT angezeigt (kein Informationsleck),
      // aber in der Konsole geloggt, damit der Admin es debuggen kann.
      if(error) console.error('resetPasswordForEmail Fehler:', error.message, error);
    } else {
      console.warn('Kein Reset-Mail verschickt: kein Benutzer gefunden oder keine echte E-Mail hinterlegt (Pseudo-Adresse @finanzmanager.local). Aufgelöste Adresse:', email);
    }
    state.forgotDone = true;
    state.forgotError = '';
    render();
  }catch(e){
    console.error('Passwort-Reset Fehler:', e);
    state.forgotDone = true; // gleiche Meldung anzeigen, kein Informationsleck
    render();
  }
}

/* ---------------------------- NEUES PASSWORT SETZEN ------------------------ */
function renderResetPassword(){
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-brand"><span class="dot"></span> FinanzManager</div>
      <div class="login-card">
        <h1>${t('newPasswordTitle')}</h1>
        ${state.resetDone ? `
          <div class="err-msg show" style="background:var(--green-dim); color:var(--green);">${t('passwordUpdated')}</div>
          <button class="btn btn-primary" id="rp-login" style="width:100%;">${t('backToLogin')}</button>
        ` : `
          <div class="err-msg ${state.resetError?'show':''}" id="rpErr">${state.resetError||''}</div>
          <div class="field"><label>${t('newPassword')}</label><input id="rp-pass" type="password" autocomplete="new-password"/></div>
          <button class="btn btn-primary" id="rp-submit">${t('setPassword')}</button>
        `}
      </div>
    </div>`;
  if(state.resetDone){
    document.getElementById('rp-login').onclick = async ()=>{ await sb.auth.signOut(); state.screen='login'; state.resetDone=false; render(); };
  }else{
    document.getElementById('rp-submit').onclick = async ()=>{
      const pass = document.getElementById('rp-pass').value;
      if(!pass || pass.length<6){ state.resetError='Passwort muss mind. 6 Zeichen haben.'; return render(); }
      try{
        const { error } = await sb.auth.updateUser({ password: pass });
        if(error){ state.resetError = error.message; return render(); }
        state.resetDone = true; state.resetError='';
        render();
      }catch(e){
        state.resetError = isNetworkError(e) ? t('brokenConn') : (e.message||String(e));
        render();
      }
    };
  }
}

async function enterApp(authUser, username){
  state.authId = authUser.id;
  state.authUsername = username || (authUser.user_metadata && authUser.user_metadata.username) || authUser.email.split('@')[0];
  state.displayName = (authUser.user_metadata && authUser.user_metadata.display_name) || state.authUsername;
  let data = await Store.getUserData(authUser.id);
  if(!data) data = migrateData(emptyUserData());
  if(!data.settings) data.settings = {theme:'dark', lang:'de'};
  state.data = data;
  state.theme = data.settings.theme || 'dark';
  state.lang = data.settings.lang || 'de';
  state.autoCategorize = data.settings.autoCategorize !== false; // Standard: an
  state.plan = await Store.getPlan(authUser.id);
  state.screen = 'app';
  state.tab = 'dashboard';
  state.loginError=''; state.regError='';
  render();
  // Falls beim Laden alte Daten automatisch migriert wurden (z.B. Standard-
  // konto neu angelegt), das einmal direkt speichern statt zu warten, bis
  // der Nutzer selbst etwas ändert.
  if(data.__migrated) persist();
}

async function doLogout(){
  await sb.auth.signOut();
  state.screen='login'; state.authId=null; state.authUsername=null; state.data=emptyUserData();
  state.plan='free';
  state.theme='dark'; applyTheme();
  render();
}

/* ---------------------------- APP SHELL ------------------------------------ */
function renderApp(){
  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
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
    ['konten', ICO.konten, t('accounts')],
    ['income', ICO.income, t('income')],
    ['expenses', ICO.expenses, t('expenses')],
    ['budget', ICO.budget, t('budgetTab')],
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
    el.onclick = ()=>{ state.tab = el.dataset.tab; closeSidebar(); render(); };
  });
  document.getElementById('btn-logout').onclick = doLogout;
  document.getElementById('sidebar-backdrop').onclick = closeSidebar;
  renderTopbar();
  renderTab();
}

function closeSidebar(){
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if(sb) sb.classList.remove('open');
  if(bd) bd.classList.remove('show');
}
function toggleSidebar(){
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if(sb) sb.classList.toggle('open');
  if(bd) bd.classList.toggle('show');
}

function renderTopbar(){
  const tb = document.getElementById('topbar');
  const titles = {
    dashboard:t('dashboard'), konten:t('accounts'), income:t('income'), expenses:t('expenses'),
    budget:t('budgetTab'), goals:t('goals'),
    recurring:t('recurring'), payslip:t('payslip'), ai:t('ai'), settings:t('settings')
  };
  const needsMonthNav = ['dashboard','income','expenses','budget','ai'].includes(state.tab);
  const monLabel = monateFor(state.lang)[state.aktiverMonat-1] + ' ' + state.aktivesJahr;
  tb.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; min-width:0;">
      <button class="icon-btn sb-hamburger" id="btn-hamburger" aria-label="Menu">☰</button>
      <div style="min-width:0;">
        <h2 style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${titles[state.tab]}</h2>
        <div class="sub" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(state.displayName)} · ${monLabel}</div>
      </div>
    </div>
    ${needsMonthNav ? `
    <div class="month-nav">
      <button id="mv-prev">${ICO.chevronL}</button>
      <div class="label">${monLabel}</div>
      <button id="mv-next">${ICO.chevronR}</button>
    </div>` : ''}
  `;
  document.getElementById('btn-hamburger').onclick = toggleSidebar;
  if(needsMonthNav){
    document.getElementById('mv-prev').onclick = ()=>monatVor(-1);
    document.getElementById('mv-next').onclick = ()=>monatVor(1);
  }
}

function renderTab(){
  const c = document.getElementById('content');
  if(state.tab==='dashboard') return renderDashboard(c);
  if(state.tab==='konten') return renderKonten(c);
  if(state.tab==='income') return renderTxTab(c, true);
  if(state.tab==='expenses') return renderTxTab(c, false);
  if(state.tab==='budget') return renderBudget(c);
  if(state.tab==='goals') return renderGoals(c);
  if(state.tab==='recurring') return renderRecurring(c);
  if(state.tab==='payslip') return renderPayslip(c);
  if(state.tab==='ai') return renderAI(c);
  if(state.tab==='settings') return renderSettings(c);
}

function escapeHtml(s){
  return String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------------------------- KONTEN --------------------------------------- */
function renderKonten(c){
  const konten = state.data.konten;
  c.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:10px; flex-wrap:wrap;">
      <div class="card kpi-card" style="flex:1; min-width:200px;">
        <div class="lbl">🏦 ${t('totalBalance')}</div>
        <div class="val ${gesamtSaldo()>=0?'pos':'neg'}">${fmt(gesamtSaldo())}</div>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-ghost" id="btn-transfer">🔄 ${t('transfer')}</button>
        <button class="btn btn-primary" id="btn-add-konto">+ ${t('addAccount')}</button>
      </div>
    </div>
    <div class="grid grid-3" id="konten-grid"></div>
  `;
  const grid = document.getElementById('konten-grid');
  grid.innerHTML = konten.map(k=>{
    const saldo = kontoSaldo(k.id);
    return `<div class="goal-card">
      <div class="top">
        <div>
          <div class="name">${KONTO_TYP_ICON[k.typ]||'📁'} ${escapeHtml(k.name)}</div>
          <div class="sub">${t('konto_'+k.typ)}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="icon-btn" data-edit="${k.id}" title="${t('edit')}">✎</button>
          <button class="icon-btn" data-del="${k.id}" title="${t('delete')}">🗑</button>
        </div>
      </div>
      <div class="val ${saldo>=0?'pos':'neg'}" style="font-family:var(--font-num); font-size:22px; font-weight:700;">${fmt(saldo)}</div>
    </div>`;
  }).join('');
  document.getElementById('btn-add-konto').onclick = ()=>openKontoModal();
  document.getElementById('btn-transfer').onclick = openTransferModal;
  grid.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.onclick = ()=> openKontoModal(konten.find(k=>k.id===btn.dataset.edit));
  });
  grid.querySelectorAll('[data-del]').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.del;
      if(state.data.konten.length<=1){ toast(t('lastAccountError')); return; }
      const hasTx = state.data.buchungen.some(b=>b.kontoId===id) || state.data.wiederkehrend.some(w=>w.kontoId===id);
      if(hasTx){ toast(t('accountNotEmptyError')); return; }
      state.data.konten = state.data.konten.filter(k=>k.id!==id);
      persist(); render();
    };
  });
}

function openKontoModal(existing){
  // Free-Plan: begrenzte Anzahl Konten (Pro-Feature: unbegrenzt)
  if(!existing && !isPro() && state.data.konten.length>=FREE_KONTEN_LIMIT){
    toast(t('accountLimitReached'));
    return;
  }
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${existing? t('editAccount') : t('addAccount')}</h3>
      <div class="field"><label>${t('accountName')}</label><input id="kt-name" value="${existing?escapeHtml(existing.name):''}"/></div>
      <div class="field"><label>${t('accountType')}</label>
        <div class="chip-row" id="kt-typ">
          ${KONTO_TYPEN.map(ty=>`<div class="chip ${(existing?existing.typ:'bank')===ty?'active':''}" data-ty="${ty}">${KONTO_TYP_ICON[ty]} ${t('konto_'+ty)}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>${t('startBalance')}</label><input id="kt-start" type="number" step="0.01" value="${existing?existing.startsaldo:0}" ${existing?'disabled':''}/></div>
      ${existing?`<div style="font-size:11px; color:var(--muted); margin-top:-8px;">${t('startBalanceLocked')}</div>`:''}
      <div class="modal-actions">
        <button class="btn btn-ghost" id="kt-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="kt-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  let selectedTyp = existing ? existing.typ : 'bank';
  bg.querySelectorAll('#kt-typ .chip').forEach(ch=>{
    ch.onclick = ()=>{ selectedTyp = ch.dataset.ty; bg.querySelectorAll('#kt-typ .chip').forEach(x=>x.classList.toggle('active', x===ch)); };
  });
  bg.querySelector('#kt-cancel').onclick = ()=> bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#kt-save').onclick = ()=>{
    const name = bg.querySelector('#kt-name').value.trim();
    const start = parseFloat(bg.querySelector('#kt-start').value.replace(',','.'))||0;
    if(!name){ toast(t('fillAllFields')); return; }
    if(existing){
      existing.name = name; existing.typ = selectedTyp;
    } else {
      state.data.konten.push({ id: uid(), name, typ: selectedTyp, startsaldo: round2(start) });
    }
    persist(); bg.remove(); render();
  };
  bg.querySelector('#kt-name').focus();
}

function openTransferModal(){
  const konten = state.data.konten;
  if(konten.length<2){ toast(t('needTwoAccounts')); return; }
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${t('transfer')}</h3>
      <div class="field"><label>${t('transferFrom')}</label>
        <select id="tr-from">${konten.map(k=>`<option value="${k.id}">${escapeHtml(k.name)} (${fmt(kontoSaldo(k.id))})</option>`).join('')}</select>
      </div>
      <div class="field"><label>${t('transferTo')}</label>
        <select id="tr-to">${konten.map((k,i)=>`<option value="${k.id}" ${i===1?'selected':''}>${escapeHtml(k.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>${t('amount')}</label><input id="tr-amt" type="number" step="0.01" min="0"/></div>
      <div class="field"><label>${t('date')}</label><input id="tr-date" type="date" value="${todayISO()}"/></div>
      <div class="field"><label>${t('note')}</label><input id="tr-note"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="tr-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="tr-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#tr-cancel').onclick = ()=> bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#tr-save').onclick = ()=>{
    const from = bg.querySelector('#tr-from').value;
    const to = bg.querySelector('#tr-to').value;
    const amt = parseFloat(bg.querySelector('#tr-amt').value.replace(',','.'));
    const date = bg.querySelector('#tr-date').value || todayISO();
    const note = bg.querySelector('#tr-note').value.trim();
    if(from===to){ toast(t('sameAccountError')); return; }
    if(!amt || amt<=0){ toast(t('fillAllFields')); return; }
    const pairId = uid();
    state.data.buchungen.push({
      id: uid(), beschreibung: t('transfer')+' → '+kontoName(to), betrag: round2(amt),
      kategorie: 'Überweisung', datum: date, notiz: note, istEinnahme: false,
      kontoId: from, istUeberweisung: true, gegenkontoId: to, transferPaar: pairId
    });
    state.data.buchungen.push({
      id: uid(), beschreibung: t('transfer')+' ← '+kontoName(from), betrag: round2(amt),
      kategorie: 'Überweisung', datum: date, notiz: note, istEinnahme: true,
      kontoId: to, istUeberweisung: true, gegenkontoId: from, transferPaar: pairId
    });
    persist(); bg.remove(); render();
  };
  bg.querySelector('#tr-amt').focus();
}

/* ---------------------------- BUDGET ---------------------------------------- */
function budgetsFuerMonat(){
  // Ausgaben je Kategorie im aktiven Monat (Überweisungen zählen nicht mit)
  const buf = gefilterteBuchungen().filter(b=>!b.istEinnahme && !b.istUeberweisung);
  const spentByCat = {};
  buf.forEach(b=> spentByCat[b.kategorie] = (spentByCat[b.kategorie]||0)+b.betrag);
  const gesamtAusgegeben = Object.values(spentByCat).reduce((s,v)=>s+v,0);
  return { spentByCat, gesamtAusgegeben };
}

function renderBudget(c){
  const { spentByCat, gesamtAusgegeben } = budgetsFuerMonat();
  const b = state.data.budgets;

  const gesamtCard = `
    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <h3 style="margin:0;">${t('overallBudget')}</h3>
          <div class="sub" style="color:var(--muted); font-size:12px; margin-top:2px;">${t('overallBudgetDesc')}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-set-overall">${b.gesamt!=null ? t('edit') : t('setOverallBudget')}</button>
      </div>
      ${b.gesamt!=null ? budgetBar(gesamtAusgegeben, b.gesamt) : `<div class="desc">${t('noOverallBudget')}</div>`}
    </div>`;

  const usedCats = new Set(b.kategorien.map(x=>x.kategorie));
  const suggestable = Object.keys(spentByCat).some(k=>!usedCats.has(k));

  c.innerHTML = `
    ${gesamtCard}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
      <h3 style="margin:0;">${t('categoryBudgets')}</h3>
      <div style="display:flex; gap:10px;">
        ${suggestable ? `<button class="btn btn-ghost btn-sm" id="btn-suggest">💡 ${t('suggestBudgets')}</button>` : ''}
        <button class="btn btn-primary btn-sm" id="btn-add-budget">+ ${t('addBudget')}</button>
      </div>
    </div>
    ${b.kategorien.length ? `<div class="grid grid-2" id="budget-grid"></div>` : `<div class="empty-state"><div class="big">📅</div>${t('noBudgets')}</div>`}
  `;
  document.getElementById('btn-set-overall').onclick = ()=>openOverallBudgetModal();
  document.getElementById('btn-add-budget').onclick = ()=>openBudgetModal();
  const suggBtn = document.getElementById('btn-suggest');
  if(suggBtn) suggBtn.onclick = suggestBudgets;

  if(b.kategorien.length){
    const grid = document.getElementById('budget-grid');
    grid.innerHTML = b.kategorien.map(entry=>{
      const spent = spentByCat[entry.kategorie] || 0;
      return `<div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div class="name" style="font-weight:700; font-size:14px;">${iconFor(entry.kategorie)} ${catLabel(entry.kategorie)}</div>
          <div style="display:flex; gap:6px;">
            <button class="icon-btn" data-edit="${entry.kategorie}" title="${t('edit')}">✎</button>
            <button class="icon-btn" data-del="${entry.kategorie}" title="${t('delete')}">🗑</button>
          </div>
        </div>
        ${budgetBar(spent, entry.betrag)}
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-edit]').forEach(btn=>{
      btn.onclick = ()=> openBudgetModal(b.kategorien.find(x=>x.kategorie===btn.dataset.edit));
    });
    grid.querySelectorAll('[data-del]').forEach(btn=>{
      btn.onclick = ()=>{
        state.data.budgets.kategorien = state.data.budgets.kategorien.filter(x=>x.kategorie!==btn.dataset.del);
        persist(); render();
      };
    });
  }
}

function budgetBar(spent, limit){
  const pct = limit>0 ? Math.min(100, spent/limit*100) : 0;
  const over = spent>limit;
  const remaining = round2(limit-spent);
  const color = over ? 'var(--red)' : pct>=80 ? 'var(--amber)' : 'var(--green)';
  return `
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${color};"></div></div>
    <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:12.5px;">
      <span style="color:var(--muted);">${fmt(spent)} ${t('of')} ${fmt(limit)}</span>
      <span style="font-weight:700; color:${over?'var(--red)':'var(--fg)'};">
        ${over ? t('budgetOverBy')+' '+fmt(Math.abs(remaining)) : fmt(remaining)+' '+t('budgetLeft')}
      </span>
    </div>`;
}

function openOverallBudgetModal(){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${t('overallBudget')}</h3>
      <div class="field"><label>${t('amount')}</label><input id="ob-amt" type="number" step="0.01" min="0" value="${state.data.budgets.gesamt ?? ''}"/></div>
      <div class="modal-actions">
        ${state.data.budgets.gesamt!=null ? `<button class="btn btn-danger" id="ob-remove">${t('delete')}</button>` : ''}
        <button class="btn btn-ghost" id="ob-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="ob-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#ob-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  const rm = bg.querySelector('#ob-remove');
  if(rm) rm.onclick = ()=>{ state.data.budgets.gesamt = null; persist(); bg.remove(); render(); };
  bg.querySelector('#ob-save').onclick = ()=>{
    const amt = parseFloat(bg.querySelector('#ob-amt').value.replace(',','.'));
    if(!amt || amt<=0){ toast(t('fillAllFields')); return; }
    state.data.budgets.gesamt = round2(amt);
    persist(); bg.remove(); render();
  };
  bg.querySelector('#ob-amt').focus();
}

function openBudgetModal(existing){
  const cats = allCats(false).filter(k=> existing ? true : !state.data.budgets.kategorien.some(x=>x.kategorie===k.key));
  if(!existing && cats.length===0){ toast(t('allCategoriesHaveBudget')); return; }
  let selectedCat = existing ? existing.kategorie : cats[0].key;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${existing ? t('edit') : t('addBudget')}</h3>
      <div class="field"><label>${t('category')}</label>
        <div class="chip-row" id="bd-cats">
          ${cats.map(k=>`<div class="chip ${k.key===selectedCat?'active':''}" data-k="${k.key}">${k.icon} ${catLabel(k.key)}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>${t('amount')}</label><input id="bd-amt" type="number" step="0.01" min="0" value="${existing?existing.betrag:''}"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="bd-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="bd-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll('#bd-cats .chip').forEach(ch=>{
    ch.onclick = ()=>{ selectedCat = ch.dataset.k; bg.querySelectorAll('#bd-cats .chip').forEach(x=>x.classList.toggle('active', x===ch)); };
  });
  bg.querySelector('#bd-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#bd-save').onclick = ()=>{
    const amt = parseFloat(bg.querySelector('#bd-amt').value.replace(',','.'));
    if(!amt || amt<=0){ toast(t('fillAllFields')); return; }
    if(existing){
      existing.betrag = round2(amt);
    } else {
      state.data.budgets.kategorien.push({ kategorie: selectedCat, betrag: round2(amt) });
    }
    persist(); bg.remove(); render();
  };
}

// Schlägt Budgets vor, indem der Durchschnitts-Verbrauch der letzten 3 Monate
// je Kategorie (ohne bereits budgetierte Kategorien) berechnet wird — auf
// ca. 5 € aufgerundet und mit 10% Puffer, damit es kein knapper Deckel ist.
function suggestBudgets(){
  const usedCats = new Set(state.data.budgets.kategorien.map(x=>x.kategorie));
  const sums = {};
  for(let i=0;i<3;i++){
    let m = state.aktiverMonat - i, y = state.aktivesJahr;
    while(m<1){ m+=12; y--; }
    state.data.buchungen.filter(b=>{
      const d = new Date(b.datum);
      return !b.istEinnahme && !b.istUeberweisung && d.getFullYear()===y && (d.getMonth()+1)===m;
    }).forEach(b=> sums[b.kategorie] = (sums[b.kategorie]||0)+b.betrag);
  }
  let added = 0;
  Object.entries(sums).forEach(([kat, total])=>{
    if(usedCats.has(kat)) return;
    const avg = total/3;
    const vorschlag = Math.ceil((avg*1.1)/5)*5;
    if(vorschlag>0){
      state.data.budgets.kategorien.push({ kategorie: kat, betrag: vorschlag });
      added++;
    }
  });
  if(added===0){ toast(t('noSuggestions')); return; }
  persist();
  toast(`${t('suggestionsAdded')} (${added})`);
  render();
}

/* ---------------------------- DASHBOARD ------------------------------------ */
function buildNotifications(){
  const buf = gefilterteBuchungen();
  const ein = summeEin(buf), aus = summeAus(buf);
  const heute = new Date();
  const mel = [];
  if(ein>0 && aus>ein) mel.push({icon:'🚨', text:(state.lang==='en'?'Expenses exceed income by ':'Ausgaben übersteigen Einnahmen um ')+fmt(aus-ein), level:'RED'});
  else if(ein>0 && aus>ein*0.9) mel.push({icon:'⚠', text:(state.lang==='en'?'Expenses close to income: ':'Ausgaben nahe an Einnahmen: ')+fmt(aus)+' / '+fmt(ein), level:'AMBER'});
  // Budget-Warnungen
  const { spentByCat, gesamtAusgegeben } = budgetsFuerMonat();
  const bd = state.data.budgets;
  if(bd.gesamt!=null){
    if(gesamtAusgegeben>bd.gesamt) mel.push({icon:'📅', text:t('overallBudget')+': '+t('budgetOverBy')+' '+fmt(gesamtAusgegeben-bd.gesamt), level:'RED'});
    else if(gesamtAusgegeben>=bd.gesamt*0.8) mel.push({icon:'📅', text:t('overallBudget')+': '+fmt(bd.gesamt-gesamtAusgegeben)+' '+t('budgetLeft'), level:'AMBER'});
  }
  bd.kategorien.forEach(entry=>{
    const spent = spentByCat[entry.kategorie]||0;
    if(spent>entry.betrag) mel.push({icon:iconFor(entry.kategorie), text:catLabel(entry.kategorie)+': '+t('budgetOverBy')+' '+fmt(spent-entry.betrag), level:'RED'});
    else if(spent>=entry.betrag*0.8) mel.push({icon:iconFor(entry.kategorie), text:catLabel(entry.kategorie)+': '+fmt(entry.betrag-spent)+' '+t('budgetLeft'), level:'AMBER'});
  });
  state.data.wiederkehrend.forEach(w=>{
    const due = new Date(w.naechstesFaellig);
    const days = Math.round((due-heute)/86400000);
    const remindDays = w.erinnerungTage ?? 5;
    if(days<0) mel.push({icon:'❗', text:`"${w.name}" ${state.lang==='en'?'is overdue':'ist überfällig'}`, level:'RED'});
    else if(days<=remindDays) mel.push({icon:'📅', text:`"${w.name}" ${state.lang==='en'?'due in':'fällig in'} ${days} ${state.lang==='en'?'days':'Tagen'} – ${fmt(w.betrag)}`, level:'AMBER'});
    if(w.kuendigungsdatum){
      const kDays = Math.round((new Date(w.kuendigungsdatum)-heute)/86400000);
      if(kDays>=0 && kDays<=14) mel.push({icon:'✂️', text:`${t('cancelBy')} "${w.name}": ${kDays} ${state.lang==='en'?'days left':'Tage übrig'}`, level: kDays<=3?'RED':'AMBER'});
    }
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

  // category breakdown for donut (expenses) — Überweisungen zählen nicht als Ausgabe
  const katMap = {};
  buf.filter(b=>!b.istEinnahme && !b.istUeberweisung).forEach(b=> katMap[b.kategorie] = (katMap[b.kategorie]||0)+b.betrag);
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
  const streak = computeStreak();

  c.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:10px; flex-wrap:wrap;">
      ${streak>0 ? `<div style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:var(--amber);">🔥 ${streak} ${streak===1?t('month'):t('months')} ${t('savingsStreak')}</div>` : `<div></div>`}
      <button class="btn btn-ghost btn-sm" id="btn-monthly-report">📄 ${t('downloadReport')}</button>
    </div>
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
  document.getElementById('btn-monthly-report').onclick = generateMonthlyReportPdf;
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
      <span style="flex:1;color:var(--fg);">${iconFor(kat)} ${catLabel(kat)}</span>
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
  const labels = trend.map(x=>monateFor(state.lang)[x.m-1].slice(0,3));
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
      <div class="tx-icon">${iconFor(b.kategorie)}</div>
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
  let buf = gefilterteBuchungen().filter(b=> b.istEinnahme===isIncome && !b.istUeberweisung);
  const f = state.txFilter;
  if(f.search) buf = buf.filter(b=> (b.beschreibung+' '+(b.notiz||'')).toLowerCase().includes(f.search.toLowerCase()));
  if(f.kategorie) buf = buf.filter(b=> b.kategorie===f.kategorie);
  if(f.kontoId) buf = buf.filter(b=> b.kontoId===f.kontoId);
  const total = buf.reduce((s,b)=>s+b.betrag,0);
  const cats = allCats(isIncome);
  c.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:14px; flex-wrap:wrap;">
      <div class="card kpi-card" style="flex:1; min-width:180px;">
        <div class="lbl">${isIncome?'📈':'📉'} ${isIncome? t('totalIncome'):t('totalExpenses')}</div>
        <div class="val ${isIncome?'pos':'neg'}">${fmt(total)}</div>
      </div>
      <button class="btn btn-primary" id="btn-add-tx" style="white-space:nowrap;">${isIncome? t('addIncome'): t('addExpense')}</button>
    </div>
    <div class="card" style="margin-bottom:14px; display:flex; gap:10px; flex-wrap:wrap; padding:14px 16px;">
      <input id="tf-search" placeholder="${t('search')}…" value="${escapeHtml(f.search)}" style="flex:2; min-width:140px; background:var(--surface2); border:1px solid var(--border); color:var(--fg); border-radius:9px; padding:9px 12px; font-size:13px; outline:none;"/>
      <select id="tf-kat" style="flex:1; min-width:120px; background:var(--surface2); border:1px solid var(--border); color:var(--fg); border-radius:9px; padding:9px 12px; font-size:13px;">
        <option value="">${t('allCategories')}</option>
        ${cats.map(k=>`<option value="${k.key}" ${f.kategorie===k.key?'selected':''}>${k.icon} ${catLabel(k.key)}</option>`).join('')}
      </select>
      <select id="tf-konto" style="flex:1; min-width:120px; background:var(--surface2); border:1px solid var(--border); color:var(--fg); border-radius:9px; padding:9px 12px; font-size:13px;">
        <option value="">${t('allAccounts')}</option>
        ${state.data.konten.map(k=>`<option value="${k.id}" ${f.kontoId===k.id?'selected':''}>${KONTO_TYP_ICON[k.typ]} ${escapeHtml(k.name)}</option>`).join('')}
      </select>
    </div>
    <div class="card">${txList(buf)}</div>
  `;
  document.getElementById('btn-add-tx').onclick = ()=>openTxModal(isIncome);
  document.getElementById('tf-search').oninput = e=>{ state.txFilter.search = e.target.value; renderTxTab(c, isIncome); };
  document.getElementById('tf-kat').onchange = e=>{ state.txFilter.kategorie = e.target.value; renderTxTab(c, isIncome); };
  document.getElementById('tf-konto').onchange = e=>{ state.txFilter.kontoId = e.target.value; renderTxTab(c, isIncome); };
  c.querySelectorAll('.tx-del').forEach(btn=>{
    btn.onclick = ()=>{
      state.data.buchungen = state.data.buchungen.filter(b=>b.id!==btn.dataset.id);
      persist(); render();
    };
  });
}

function openTxModal(isIncome){
  const cats = allCats(isIncome);
  let selectedCat = cats[0].key;
  let userPickedCat = false; // sobald der Nutzer manuell klickt, nicht mehr automatisch überschreiben
  let selectedKonto = state.data.konten[0]?.id;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${isIncome? t('addIncome'): t('addExpense')}</h3>
      <div class="field"><label>${t('description')}</label><input id="tx-desc"/></div>
      <div class="field"><label>${t('amount')}</label><input id="tx-amt" type="number" step="0.01" min="0"/></div>
      <div class="field"><label>${t('account')}</label>
        <select id="tx-konto">${state.data.konten.map(k=>`<option value="${k.id}">${KONTO_TYP_ICON[k.typ]} ${escapeHtml(k.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>${t('category')}</label>
        <div class="chip-row" id="tx-cats">
          ${cats.map(k=>`<div class="chip ${k.key===selectedCat?'active':''}" data-k="${k.key}">${k.eltern?'↳ ':''}${k.icon} ${catLabel(k.key)}</div>`).join('')}
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
    ch.onclick = ()=>{ userPickedCat = true; selectedCat = ch.dataset.k; bg.querySelectorAll('#tx-cats .chip').forEach(x=>x.classList.toggle('active', x===ch)); };
  });
  if(state.autoCategorize){
    bg.querySelector('#tx-desc').addEventListener('input', e=>{
      if(userPickedCat) return;
      const guess = guessKategorie(e.target.value, isIncome);
      if(guess && guess!==selectedCat){
        selectedCat = guess;
        bg.querySelectorAll('#tx-cats .chip').forEach(x=> x.classList.toggle('active', x.dataset.k===guess));
      }
    });
  }
  bg.querySelector('#tx-konto').onchange = e=>{ selectedKonto = e.target.value; };
  bg.querySelector('#tx-cancel').onclick = ()=> bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#tx-save').onclick = ()=>{
    const desc = bg.querySelector('#tx-desc').value.trim();
    const amt = parseFloat(bg.querySelector('#tx-amt').value.replace(',','.'));
    const date = bg.querySelector('#tx-date').value || todayISO();
    const note = bg.querySelector('#tx-note').value.trim();
    if(!desc || !amt || amt<=0){ toast(state.lang==='en'?'Please fill description and amount.':'Bitte Beschreibung und Betrag ausfüllen.'); return; }
    state.data.buchungen.push({ id:uid(), beschreibung:desc, betrag:round2(amt), kategorie:selectedCat, datum:date, notiz:note, istEinnahme:isIncome, kontoId:selectedKonto });
    persist();
    bg.remove();
    render();
  };
  bg.querySelector('#tx-desc').focus();
}

/* ---------------------------- SAVINGS GOALS --------------------------------- */
/* ---------------------------- GAMIFICATION ---------------------------------- */
// Sparstreak: Anzahl aufeinanderfolgender ABGESCHLOSSENER Monate (rückwärts ab
// dem aktuellen Kalendermonat, nicht dem im Dashboard angezeigten Monat) mit
// positivem Saldo (Einnahmen ≥ Ausgaben). Der laufende Monat zählt nur mit,
// wenn er schon selbst im Plus ist; ein Monat ganz ohne Buchungen bricht den
// Streak (kein "stiller" Fortbestand ohne echte Aktivität).
function computeStreak(){
  const heute = new Date();
  let m = heute.getMonth()+1, y = heute.getFullYear();
  let streak = 0;
  for(let i=0;i<24;i++){
    const buf = state.data.buchungen.filter(b=>{
      const d = new Date(b.datum);
      return !b.istUeberweisung && d.getFullYear()===y && (d.getMonth()+1)===m;
    });
    if(buf.length===0) break;
    const ein = summeEin(buf), aus = summeAus(buf);
    if(ein < aus) break;
    streak++;
    m--; if(m<1){ m=12; y--; }
  }
  return streak;
}

function computeBadges(){
  const buf = gefilterteBuchungen();
  const ein = summeEin(buf), aus = summeAus(buf);
  const sparquote = ein>0 ? (ein-aus)/ein*100 : 0;
  const streak = computeStreak();
  return [
    { id:'first_tx', icon:'🎬', name:t('badge_first_tx'), earned: state.data.buchungen.length>=1 },
    { id:'fifty_tx', icon:'📚', name:t('badge_fifty_tx'), earned: state.data.buchungen.length>=50 },
    { id:'century_tx', icon:'💯', name:t('badge_century_tx'), earned: state.data.buchungen.length>=100 },
    { id:'goal_reached', icon:'🎯', name:t('badge_goal_reached'), earned: state.data.sparziele.some(s=>s.ziel>0 && s.gespart>=s.ziel) },
    { id:'streak3', icon:'🔥', name:t('badge_streak3'), earned: streak>=3 },
    { id:'streak6', icon:'🔥🔥', name:t('badge_streak6'), earned: streak>=6 },
    { id:'multi_account', icon:'🏦', name:t('badge_multi_account'), earned: state.data.konten.length>=3 },
    { id:'budgeter', icon:'📅', name:t('badge_budgeter'), earned: state.data.budgets.kategorien.length>=1 },
    { id:'saver20', icon:'💰', name:t('badge_saver20'), earned: sparquote>=20 },
  ];
}

function renderGamificationCard(){
  const streak = computeStreak();
  const badges = computeBadges();
  const earnedCount = badges.filter(b=>b.earned).length;
  const mz = state.data.monatsziel;
  const buf = gefilterteBuchungen();
  const gespart = summeEin(buf) - summeAus(buf);
  const mzPct = mz && mz>0 ? Math.max(0, Math.min(100, gespart/mz*100)) : 0;

  return `
    <div class="card" style="margin-bottom:16px;">
      <div class="grid grid-2" style="gap:16px; align-items:start;">
        <div>
          <div class="lbl" style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">🔥 ${t('savingsStreak')}</div>
          <div style="font-size:26px; font-weight:700; font-family:var(--font-num);">${streak} ${streak===1 ? t('month') : t('months')}</div>
          <div class="desc" style="margin-top:2px;">${streak>0 ? t('streakGoing') : t('streakStart')}</div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div class="lbl" style="margin:0;">🎯 ${t('monthlyGoal')}</div>
            <button class="btn btn-ghost btn-sm" id="btn-set-monthly-goal">${mz!=null ? t('edit') : t('setGoal')}</button>
          </div>
          ${mz!=null ? `
            <div class="bar-track"><div class="bar-fill" style="width:${mzPct}%; background:${gespart>=mz?'var(--green)':'var(--accent)'};"></div></div>
            <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:12.5px;">
              <span style="color:var(--muted);">${fmt(gespart)} ${t('of')} ${fmt(mz)}</span>
              <span style="font-weight:700; color:${gespart>=mz?'var(--green)':'var(--fg)'};">${mzPct.toFixed(0)}%</span>
            </div>
          ` : `<div class="desc">${t('noMonthlyGoal')}</div>`}
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0;">🏆 ${t('achievements')}</h3>
        <span style="font-size:12px; color:var(--muted); font-weight:600;">${earnedCount}/${badges.length}</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px,1fr)); gap:10px;">
        ${badges.map(b=>`
          <div style="text-align:center; padding:12px 6px; border-radius:12px; background:${b.earned?'var(--accent-dim)':'var(--surface2)'}; opacity:${b.earned?1:0.45};">
            <div style="font-size:24px; margin-bottom:6px;">${b.icon}</div>
            <div style="font-size:10.5px; font-weight:600; line-height:1.3;">${b.name}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function wireGamificationCard(){
  document.getElementById('btn-set-monthly-goal').onclick = openMonthlyGoalModal;
}

function openMonthlyGoalModal(){
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${t('monthlyGoal')}</h3>
      <div class="field"><label>${t('amount')}</label><input id="mz-amt" type="number" step="0.01" min="0" value="${state.data.monatsziel ?? ''}"/></div>
      <div class="modal-actions">
        ${state.data.monatsziel!=null ? `<button class="btn btn-danger" id="mz-remove">${t('delete')}</button>` : ''}
        <button class="btn btn-ghost" id="mz-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="mz-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#mz-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  const rm = bg.querySelector('#mz-remove');
  if(rm) rm.onclick = ()=>{ state.data.monatsziel = null; persist(); bg.remove(); render(); };
  bg.querySelector('#mz-save').onclick = ()=>{
    const amt = parseFloat(bg.querySelector('#mz-amt').value.replace(',','.'));
    if(!amt || amt<=0){ toast(t('fillAllFields')); return; }
    state.data.monatsziel = round2(amt);
    persist(); bg.remove(); render();
  };
  bg.querySelector('#mz-amt').focus();
}

function renderGoals(c){
  const goals = state.data.sparziele;
  c.innerHTML = `
    ${renderGamificationCard()}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3 style="margin:0;">🎯 ${t('goals')}</h3>
      <button class="btn btn-primary" id="btn-add-goal">${t('newGoal')}</button>
    </div>
    ${goals.length ? `<div class="grid grid-3" id="goals-grid"></div>` : `<div class="empty-state"><div class="big">🎯</div>${t('noGoals')}</div>`}
  `;
  wireGamificationCard();
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
            ${!done ? `<div class="sub" style="color:var(--amber); font-weight:600; margin-top:2px;">${fmt(Math.max(0, g.ziel-g.gespart))} ${t('remaining')}</div>` : ''}
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
  const heute = new Date();

  // "Du zahlst X€/Monat für Abos" — Ausgaben-Abos auf Monatsbasis normalisiert
  const ausgabenAbos = state.data.wiederkehrend.filter(w=>!w.istEinnahme);
  const proMonat = ausgabenAbos.reduce((s,w)=> s + (w.intervall==='jaehrlich' ? w.betrag/12 : w.betrag), 0);
  const proJahr = ausgabenAbos.reduce((s,w)=> s + (w.intervall==='jaehrlich' ? w.betrag : w.betrag*12), 0);

  c.innerHTML = `
    <div class="grid grid-2" style="margin-bottom:18px;">
      ${kpiCard(t('subsPerMonth'), fmt(proMonat), 'neg', '💳')}
      ${kpiCard(t('subsPerYear'), fmt(proJahr), 'neg', '📆')}
    </div>
    <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
      <button class="btn btn-primary" id="btn-add-rec">${t('newRecurring')}</button>
    </div>
    <div class="card">
      ${list.length ? list.map(w=>{
        const days = Math.round((new Date(w.naechstesFaellig)-heute)/86400000);
        let badge='';
        if(days<0) badge = `<span class="due-badge" style="background:var(--red-dim); color:var(--red);">${t('overdue')}</span>`;
        else if(days<=(w.erinnerungTage??5)) badge = `<span class="due-badge" style="background:var(--amber-dim); color:var(--amber);">${t('dueSoon')}</span>`;
        const intervallBadge = `<span class="due-badge" style="background:var(--surface2); color:var(--muted);">${w.intervall==='jaehrlich'?t('yearly'):t('monthly')}</span>`;
        let kuendigungInfo = '';
        if(w.kuendigungsdatum){
          const kDays = Math.round((new Date(w.kuendigungsdatum)-heute)/86400000);
          const kColor = kDays<0 ? 'var(--muted)' : kDays<=14 ? 'var(--red)' : 'var(--muted)';
          kuendigungInfo = ` · <span style="color:${kColor};">${t('cancelBy')}: ${w.kuendigungsdatum}</span>`;
        }
        return `<div class="recur-row">
          <div class="tx-icon">${iconFor(w.kategorie)}</div>
          <div class="tx-info">
            <div class="name">${escapeHtml(w.name)} ${badge} ${intervallBadge}</div>
            <div class="meta">${catLabel(w.kategorie)} · ${t('nextDue')}: ${w.naechstesFaellig}${kuendigungInfo}</div>
          </div>
          <div class="tx-amt ${w.istEinnahme?'pos':'neg'}">${w.istEinnahme?'+':'-'}${fmt(w.betrag)}</div>
          <button class="icon-btn" data-edit="${w.id}" title="${t('edit')}">✎</button>
          <button class="btn btn-ghost btn-sm" data-book="${w.id}">${t('bookNow')}</button>
          <button class="tx-del" style="opacity:1" data-id="${w.id}" title="${t('delete')}">${ICO.trash}</button>
        </div>`;
      }).join('') : `<div class="empty-state"><div class="big">🔁</div>${t('noRecurring')}</div>`}
    </div>
  `;
  document.getElementById('btn-add-rec').onclick = ()=>openRecurringModal();
  c.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.onclick = ()=> openRecurringModal(state.data.wiederkehrend.find(w=>w.id===btn.dataset.edit));
  });
  c.querySelectorAll('[data-id]').forEach(btn=>{
    btn.onclick = ()=>{ state.data.wiederkehrend = state.data.wiederkehrend.filter(w=>w.id!==btn.dataset.id); persist(); render(); };
  });
  c.querySelectorAll('[data-book]').forEach(btn=>{
    btn.onclick = ()=>{
      const w = state.data.wiederkehrend.find(x=>x.id===btn.dataset.book);
      if(!w) return;
      state.data.buchungen.push({ id:uid(), beschreibung:w.name, betrag:w.betrag, kategorie:w.kategorie, datum:todayISO(), notiz:'', istEinnahme:w.istEinnahme, kontoId: w.kontoId || state.data.konten[0]?.id });
      const d = new Date(w.naechstesFaellig);
      if(w.intervall==='jaehrlich') d.setFullYear(d.getFullYear()+1); else d.setMonth(d.getMonth()+1);
      w.naechstesFaellig = d.toISOString().slice(0,10);
      persist(); toast(state.lang==='en'?'Booked!':'Gebucht!'); render();
    };
  });
}

function openRecurringModal(existing){
  let selectedCat = existing ? existing.kategorie : KAT_AUSGABEN[0].key;
  let isIncome = existing ? existing.istEinnahme : false;
  let selectedKonto = existing ? existing.kontoId : state.data.konten[0]?.id;
  let selectedIntervall = existing ? (existing.intervall||'monatlich') : 'monatlich';
  const bg = document.createElement('div');
  bg.className='modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <h3>${existing? t('edit') : t('newRecurring')}</h3>
      <div class="field"><label>${t('description')}</label><input id="r-name" value="${existing?escapeHtml(existing.name):''}"/></div>
      <div class="field"><label>${t('amount')}</label><input id="r-amt" type="number" step="0.01" min="0" value="${existing?existing.betrag:''}"/></div>
      <div class="field"><label>${t('account')}</label>
        <select id="r-konto">${state.data.konten.map(k=>`<option value="${k.id}" ${k.id===selectedKonto?'selected':''}>${KONTO_TYP_ICON[k.typ]} ${escapeHtml(k.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>${t('interval')}</label>
        <div class="seg" id="r-intervall">
          <button data-v="monatlich" class="${selectedIntervall==='monatlich'?'active':''}">${t('monthly')}</button>
          <button data-v="jaehrlich" class="${selectedIntervall==='jaehrlich'?'active':''}">${t('yearly')}</button>
        </div>
      </div>
      <div class="field"><label>${t('income')} / ${t('expenses')}</label>
        <div class="seg" id="r-seg">
          <button class="${!isIncome?'active':''}" data-v="0">${t('expenses')}</button>
          <button class="${isIncome?'active':''}" data-v="1">${t('income')}</button>
        </div>
      </div>
      <div class="field"><label>${t('category')}</label>
        <div class="chip-row" id="r-cats"></div>
      </div>
      <div class="field"><label>${t('nextDue')}</label><input id="r-date" type="date" value="${existing?existing.naechstesFaellig:todayISO()}"/></div>
      <div class="field"><label>${t('reminderDays')}</label><input id="r-remind" type="number" min="0" step="1" value="${existing?(existing.erinnerungTage??5):5}"/></div>
      <div class="field"><label>${t('cancelBy')} (${state.lang==='en'?'optional':'optional'})</label><input id="r-cancel-date" type="date" value="${existing&&existing.kuendigungsdatum?existing.kuendigungsdatum:''}"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="r-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="r-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const catsEl = bg.querySelector('#r-cats');
  function refreshCats(){
    const cats = allCats(isIncome);
    if(!cats.some(k=>k.key===selectedCat)) selectedCat = cats[0].key;
    catsEl.innerHTML = cats.map(k=>`<div class="chip ${k.key===selectedCat?'active':''}" data-k="${k.key}">${k.eltern?'↳ ':''}${k.icon} ${catLabel(k.key)}</div>`).join('');
    catsEl.querySelectorAll('.chip').forEach(ch=>{
      ch.onclick = ()=>{ selectedCat = ch.dataset.k; catsEl.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active', x===ch)); };
    });
  }
  refreshCats();
  bg.querySelector('#r-konto').onchange = e=>{ selectedKonto = e.target.value; };
  bg.querySelectorAll('#r-intervall button').forEach(b=>{
    b.onclick = ()=>{ selectedIntervall = b.dataset.v; bg.querySelectorAll('#r-intervall button').forEach(x=>x.classList.toggle('active', x===b)); };
  });
  bg.querySelectorAll('#r-seg button').forEach(b=>{
    b.onclick = ()=>{ isIncome = b.dataset.v==='1'; bg.querySelectorAll('#r-seg button').forEach(x=>x.classList.toggle('active', x===b)); refreshCats(); };
  });
  bg.querySelector('#r-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#r-save').onclick = ()=>{
    const name = bg.querySelector('#r-name').value.trim();
    const amt = parseFloat(bg.querySelector('#r-amt').value.replace(',','.'));
    const date = bg.querySelector('#r-date').value || todayISO();
    const remind = parseInt(bg.querySelector('#r-remind').value,10);
    const cancelDate = bg.querySelector('#r-cancel-date').value || null;
    if(!name || !amt || amt<=0){ toast(state.lang==='en'?'Please fill description and amount.':'Bitte Beschreibung und Betrag ausfüllen.'); return; }
    if(existing){
      Object.assign(existing, { name, betrag:round2(amt), kategorie:selectedCat, naechstesFaellig:date, istEinnahme:isIncome, kontoId:selectedKonto, intervall:selectedIntervall, erinnerungTage: isNaN(remind)?5:remind, kuendigungsdatum: cancelDate });
    } else {
      state.data.wiederkehrend.push({ id:uid(), name, betrag:round2(amt), kategorie:selectedCat, naechstesFaellig:date, istEinnahme:isIncome, kontoId:selectedKonto, intervall:selectedIntervall, erinnerungTage: isNaN(remind)?5:remind, kuendigungsdatum: cancelDate });
    }
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
    const monatName = monateFor(state.lang)[state.aktiverMonat-1];
    state.data.buchungen.push({ id:uid(), beschreibung:monatName+' '+state.aktivesJahr+' – '+catLabel('Gehalt'), betrag:r.netto, kategorie:'Gehalt', datum:todayISO(), notiz:'', istEinnahme:true, kontoId: state.data.konten[0]?.id });
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

// Erkennung ungewöhnlich hoher Ausgaben: vergleicht jede Buchung des aktuellen
// Monats mit dem historischen Durchschnitt (letzte 6 Monate) ihrer Kategorie.
// Braucht mind. 2 historische Buchungen in der Kategorie, um Zufallstreffer
// bei brandneuen Kategorien zu vermeiden.
function detectAnomalies(){
  const buf = gefilterteBuchungen().filter(b=>!b.istEinnahme && !b.istUeberweisung);
  const historyByCat = {};
  for(let i=1;i<=6;i++){
    let m = state.aktiverMonat-i, y = state.aktivesJahr;
    while(m<1){ m+=12; y--; }
    state.data.buchungen.filter(b=>{
      const d = new Date(b.datum);
      return !b.istEinnahme && !b.istUeberweisung && d.getFullYear()===y && (d.getMonth()+1)===m;
    }).forEach(b=>{
      if(!historyByCat[b.kategorie]) historyByCat[b.kategorie] = { sum:0, count:0 };
      historyByCat[b.kategorie].sum += b.betrag;
      historyByCat[b.kategorie].count++;
    });
  }
  const anomalies = [];
  buf.forEach(b=>{
    const h = historyByCat[b.kategorie];
    if(!h || h.count<2) return;
    const avg = h.sum/h.count;
    if(b.betrag > avg*2 && b.betrag > 20){
      anomalies.push({ ...b, avg: round2(avg), faktor: b.betrag/avg });
    }
  });
  return anomalies.sort((a,b)=>b.faktor-a.faktor).slice(0,5);
}

// "Wie kann ich X€ im Monat sparen?" — schlägt vor, die größten Ausgaben-
// Kategorien anteilig zu kürzen (max. 40% pro Kategorie, damit es realistisch
// bleibt), bis das Ziel erreicht ist oder alle Kategorien ausgeschöpft sind.
function computeSavingsPlan(target){
  const buf = gefilterteBuchungen().filter(b=>!b.istEinnahme && !b.istUeberweisung);
  const katMap = {};
  buf.forEach(b=> katMap[b.kategorie] = (katMap[b.kategorie]||0)+b.betrag);
  const entries = Object.entries(katMap).sort((a,b)=>b[1]-a[1]);
  let remaining = target;
  const plan = [];
  for(const [kat,val] of entries){
    if(remaining<=0) break;
    const maxCut = round2(val*0.4);
    const cut = Math.min(maxCut, remaining);
    if(cut>=1){
      plan.push({ kategorie:kat, cut: round2(cut), basis: val });
      remaining -= cut;
    }
  }
  return { plan, erreicht: round2(target-Math.max(0,remaining)), rest: round2(Math.max(0,remaining)) };
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
  const anomalies = detectAnomalies();

  c.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <h3>${t('ai')} – ${monateFor(state.lang)[state.aktiverMonat-1]} ${state.aktivesJahr}</h3>
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
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0;">🧠 ${t('deepAiTitle')}</h3>
          <div class="desc" style="margin-top:4px;">${t('deepAiDesc')}</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-deep-ai" style="white-space:nowrap;">${isPro() ? t('generateAnalysis') : '⭐ '+t('proOnly')}</button>
      </div>
      <div id="deep-ai-result" style="margin-top:14px;"></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <h3>⚠️ ${t('unusualExpenses')}</h3>
      ${anomalies.length ? anomalies.map(a=>`
        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:600; font-size:13px;">${iconFor(a.kategorie)} ${escapeHtml(a.beschreibung)}</div>
            <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">${catLabel(a.kategorie)} · ${en?'usually about':'normalerweise ca.'} ${fmt(a.avg)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; color:var(--red); font-family:var(--font-num);">${fmt(a.betrag)}</div>
            <div style="font-size:11px; color:var(--red);">${a.faktor.toFixed(1)}× ${en?'higher':'höher'}</div>
          </div>
        </div>`).join('') : `<div class="desc" style="padding:6px 0;">${t('noAnomalies')}</div>`}
    </div>

    <div class="card" style="margin-bottom:16px;">
      <h3>💡 ${t('savingsPlanTitle')}</h3>
      <div class="desc" style="margin-bottom:12px;">${t('savingsPlanDesc')}</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <input id="sp-target" type="number" min="1" step="1" placeholder="${t('targetSavings')}" style="flex:1; min-width:140px; background:var(--surface2); border:1px solid var(--border); color:var(--fg); border-radius:9px; padding:10px 12px; font-size:13px;"/>
        <button class="btn btn-primary btn-sm" id="sp-calc">${t('calculatePlan')}</button>
      </div>
      <div id="sp-result" style="margin-top:14px;"></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <h3>${en?'Category overview':'Kategorie-Übersicht'}</h3>
      ${catRows.length ? catRows.map(([k,v])=>`
        <div style="display:flex; justify-content:space-between; padding:7px 0; font-size:13px;">
          <span>${iconFor(k)} ${catLabel(k)}</span>
          <span style="color:var(--muted);">${v} ${en?'transactions':'Buchungen'}</span>
        </div>`).join('') : `<div class="empty-state">${t('noData')}</div>`}
    </div>
  `;

  const spInput = document.getElementById('sp-target');
  const spResult = document.getElementById('sp-result');
  function runSavingsPlan(){
    const target = parseFloat(spInput.value.replace(',','.'));
    if(!target || target<=0){ spResult.innerHTML = `<div class="desc">${t('fillAllFields')}</div>`; return; }
    const { plan, erreicht, rest } = computeSavingsPlan(target);
    if(!plan.length){ spResult.innerHTML = `<div class="desc">${t('noSavingsPlanPossible')}</div>`; return; }
    spResult.innerHTML = `
      ${plan.map(p=>`
        <div style="display:flex; justify-content:space-between; padding:7px 0; font-size:13px; border-bottom:1px solid var(--border);">
          <span>${iconFor(p.kategorie)} ${catLabel(p.kategorie)}</span>
          <span style="font-weight:600; color:var(--green);">−${fmt(p.cut)}</span>
        </div>`).join('')}
      <div style="display:flex; justify-content:space-between; padding-top:10px; font-weight:700; font-size:13.5px;">
        <span>${t('savingsPlanResult')}</span>
        <span style="color:var(--green);">${fmt(erreicht)}</span>
      </div>
      ${rest>0 ? `<div class="desc" style="margin-top:6px; color:var(--amber);">${t('savingsPlanShortfall')} ${fmt(rest)}</div>` : ''}
    `;
  }
  document.getElementById('sp-calc').onclick = runSavingsPlan;
  spInput.addEventListener('keydown', e=>{ if(e.key==='Enter') runSavingsPlan(); });

  document.getElementById('btn-deep-ai').onclick = ()=> runDeepAiAnalysis(anomalies);
}

async function runDeepAiAnalysis(anomalies){
  if(!isPro()){ toast(t('upgradeComingSoon')); return; }
  const resultEl = document.getElementById('deep-ai-result');
  const btn = document.getElementById('btn-deep-ai');
  const buf = gefilterteBuchungen().filter(b=>!b.istUeberweisung);
  const ein = summeEin(buf), aus = summeAus(buf);
  const katMap = {};
  buf.filter(b=>!b.istEinnahme).forEach(b=> katMap[b.kategorie]=(katMap[b.kategorie]||0)+b.betrag);

  const summary = {
    lang: state.lang,
    monat: monateFor(state.lang)[state.aktiverMonat-1]+' '+state.aktivesJahr,
    einnahmen: round2(ein), ausgaben: round2(aus), bilanz: round2(ein-aus),
    sparquote: ein>0 ? round2((ein-aus)/ein*100) : null,
    kategorien: Object.entries(katMap).map(([k,v])=>({ kategorie:catLabel(k), betrag: round2(v) })),
    budgets: {
      gesamt: state.data.budgets.gesamt,
      kategorien: state.data.budgets.kategorien.map(b=>({ kategorie: catLabel(b.kategorie), limit: b.betrag, ausgegeben: round2(katMap[b.kategorie]||0) }))
    },
    konten: state.data.konten.map(k=>({ name:k.name, saldo: kontoSaldo(k.id) })),
    abos: state.data.wiederkehrend.filter(w=>!w.istEinnahme).map(w=>({ name:w.name, betrag:w.betrag, intervall:w.intervall })),
    auffaellige_buchungen: anomalies.map(a=>({ beschreibung:a.beschreibung, kategorie: catLabel(a.kategorie), betrag:a.betrag, ueblich_ca: a.avg }))
  };

  btn.disabled = true;
  resultEl.innerHTML = `<div class="desc">${t('generatingAnalysis')}</div>`;
  try{
    const { data, error } = await sb.functions.invoke('ai-analysis', { body: summary });
    if(error || !data){
      resultEl.innerHTML = `<div class="desc" style="color:var(--red);">${t('deepAiError')}</div>`;
      console.error('ai-analysis Fehler:', error);
      return;
    }
    if(data.error === 'pro_required'){
      resultEl.innerHTML = `<div class="desc" style="color:var(--amber);">${t('proOnlyDesc')}</div>`;
      return;
    }
    if(data.error){
      resultEl.innerHTML = `<div class="desc" style="color:var(--red);">${t('deepAiError')}</div>`;
      console.error('ai-analysis Fehler:', data.error, data.detail);
      return;
    }
    resultEl.innerHTML = `<div style="white-space:pre-wrap; font-size:13.5px; line-height:1.65;">${escapeHtml(data.analysis||'')}</div>`;
  }catch(e){
    console.error('ai-analysis Fehler:', e);
    resultEl.innerHTML = `<div class="desc" style="color:var(--red);">${isNetworkError(e) ? t('brokenConn') : t('deepAiError')}</div>`;
  }finally{
    btn.disabled = false;
  }
}

/* ---------------------------- SETTINGS -------------------------------------- */
function renderSettings(c){
  c.innerHTML = `
    <div class="card" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div>
        <div class="lbl" style="display:flex; align-items:center; gap:8px;">
          ${isPro() ? '⭐ ' + t('planPro') : '🆓 ' + t('planFree')}
        </div>
        <div class="desc">${isPro() ? t('planProDesc') : t('planFreeDesc')}</div>
      </div>
      ${!isPro() ? `<button class="btn btn-primary btn-sm" id="btn-upgrade">⭐ ${t('upgradeNow')}</button>` : ''}
    </div>
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
        <div><div class="lbl">${t('language')}</div><div class="desc">${state.lang==='en'?'Interface language':state.lang==='ar'?'لغة الواجهة':'Sprache der Oberfläche'}</div></div>
        <div class="seg" id="lang-seg" style="width:190px;">
          <button data-v="de" class="${state.lang==='de'?'active':''}">DE</button>
          <button data-v="en" class="${state.lang==='en'?'active':''}">EN</button>
          <button data-v="ar" class="${state.lang==='ar'?'active':''}">AR</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="lbl">${t('autoCategorize')}</div><div class="desc">${state.lang==='en'?'Suggest a category automatically based on the description (e.g. "Rewe" → Groceries)':state.lang==='ar'?'اقتراح فئة تلقائيًا بناءً على الوصف':'Schlägt beim Erfassen automatisch eine Kategorie anhand der Beschreibung vor (z.B. "Rewe" → Lebensmittel)'}</div></div>
        <div class="seg" id="autocat-seg" style="width:110px;">
          <button data-v="on" class="${state.autoCategorize?'active':''}">${state.lang==='en'?'On':'An'}</button>
          <button data-v="off" class="${!state.autoCategorize?'active':''}">${state.lang==='en'?'Off':'Aus'}</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="lbl">${t('exportCsv')}</div><div class="desc">${state.lang==='en'?'Download bookings as CSV':state.lang==='ar'?'تنزيل العمليات كملف CSV':'Buchungen als CSV herunterladen'}</div></div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select id="export-scope" style="background:var(--surface2); border:1px solid var(--border); color:var(--fg); border-radius:9px; padding:8px 10px; font-size:12.5px;">
            <option value="all">${t('allTime')}</option>
            <option value="month">${t('thisMonthScope')}</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="btn-export">⬇ CSV</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="lbl">${t('downloadReport')}</div><div class="desc">${state.lang==='en'?'PDF summary for the currently selected month':state.lang==='ar'?'ملخص PDF للشهر المحدد حاليًا':'PDF-Zusammenfassung für den aktuell gewählten Monat'}</div></div>
        <button class="btn btn-ghost btn-sm" id="btn-report">📄 PDF</button>
      </div>
      <div class="settings-row">
        <div><div class="lbl">${t('importCsv')}</div><div class="desc">${state.lang==='en'?'Add bookings from a CSV file (same format as export)':state.lang==='ar'?'إضافة عمليات من ملف CSV (بنفس تنسيق التصدير)':'Buchungen aus einer CSV-Datei hinzufügen (gleiches Format wie beim Export)'}</div></div>
        <label class="btn btn-ghost btn-sm" for="file-import" style="cursor:pointer;">⬆ CSV</label>
        <input type="file" id="file-import" accept=".csv,text/csv" style="display:none;"/>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <h3 style="margin-bottom:10px;">${t('manageCategories')}</h3>
      <div id="cat-manage"></div>
      <button class="btn btn-ghost btn-sm" id="btn-add-cat" style="margin-top:10px;">+ ${t('addCategory')}</button>
    </div>
    <div class="card">
      <div class="settings-row">
        <div><div class="lbl" style="color:var(--red);">${t('deleteAccount')}</div><div class="desc">${state.lang==='en'?'Permanently delete all your bookings, goals and settings.':'Löscht alle deine Buchungen, Ziele und Einstellungen unwiderruflich.'}</div></div>
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
  document.querySelectorAll('#autocat-seg button').forEach(b=>{
    b.onclick = ()=>{ state.autoCategorize = b.dataset.v==='on'; persist(); render(); };
  });
  document.getElementById('btn-export').onclick = ()=> exportCsv(document.getElementById('export-scope').value);
  document.getElementById('btn-report').onclick = generateMonthlyReportPdf;
  document.getElementById('file-import').addEventListener('change', importCsv);
  const upBtn = document.getElementById('btn-upgrade');
  if(upBtn) upBtn.onclick = ()=> toast(t('upgradeComingSoon'));
  renderCategoryManager();
  document.getElementById('btn-add-cat').onclick = openCategoryModal;
  document.getElementById('btn-del-account').onclick = async ()=>{
    if(!confirm(state.lang==='en'
      ? 'Really delete all your data? This cannot be undone. (Your login itself stays; contact the site admin to remove it entirely.)'
      : 'Wirklich alle Daten löschen? Das kann nicht rückgängig gemacht werden. (Der Login selbst bleibt bestehen — für die komplette Löschung des Kontos wende dich an den Admin.)')) return;
    const fresh = emptyUserData();
    await sb.from('user_data').update({
      buchungen: [], sparziele: [], wiederkehrend: [], konten: fresh.konten,
      kategorien: fresh.kategorien, budgets: fresh.budgets, monatsziel: null, settings: {theme:'dark', lang:'de'},
      updated_at: new Date().toISOString()
    }).eq('id', state.authId);
    doLogout();
  };
}

function renderCategoryManager(){
  const el = document.getElementById('cat-manage');
  const rows = [];
  ['ausgaben','einnahmen'].forEach(typ=>{
    const isIncome = typ==='einnahmen';
    state.data.kategorien[typ].forEach(k=>{
      rows.push(`<div class="settings-row">
        <div><div class="lbl">${k.icon} ${catLabel(k.key)}</div><div class="desc">${isIncome?t('income'):t('expenses')}${k.eltern?' · '+t('subcategoryOf')+' '+catLabel(k.eltern):''}</div></div>
        <button class="icon-btn" data-delcat="${typ}:${k.key}" title="${t('delete')}">🗑</button>
      </div>`);
    });
  });
  el.innerHTML = rows.length ? rows.join('') : `<div class="desc" style="padding:8px 0;">${t('noCustomCategories')}</div>`;
  el.querySelectorAll('[data-delcat]').forEach(btn=>{
    btn.onclick = ()=>{
      const [typ,key] = btn.dataset.delcat.split(':');
      const inUse = state.data.buchungen.some(b=>b.kategorie===key) || state.data.wiederkehrend.some(w=>w.kategorie===key);
      if(inUse && !confirm(t('categoryInUseConfirm'))) return;
      state.data.kategorien[typ] = state.data.kategorien[typ].filter(k=>k.key!==key);
      persist(); renderCategoryManager();
    };
  });
}

function openCategoryModal(){
  let isIncome = false;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  const parentOptions = ()=> allCats(isIncome).filter(k=>!k.eltern);
  bg.innerHTML = `
    <div class="modal">
      <h3>${t('addCategory')}</h3>
      <div class="field"><label>${t('income')} / ${t('expenses')}</label>
        <div class="seg" id="c-seg">
          <button class="active" data-v="0">${t('expenses')}</button>
          <button data-v="1">${t('income')}</button>
        </div>
      </div>
      <div class="field"><label>${t('categoryName')}</label><input id="c-name"/></div>
      <div class="field"><label>${t('categoryIcon')}</label><input id="c-icon" maxlength="2" placeholder="💠" value="💠" style="width:70px; text-align:center;"/></div>
      <div class="field"><label>${t('parentCategory')}</label>
        <select id="c-parent"><option value="">${t('none')}</option>${parentOptions().map(k=>`<option value="${k.key}">${k.icon} ${catLabel(k.key)}</option>`).join('')}</select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="c-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="c-save">${t('save')}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  function refreshParents(){
    bg.querySelector('#c-parent').innerHTML = `<option value="">${t('none')}</option>${parentOptions().map(k=>`<option value="${k.key}">${k.icon} ${catLabel(k.key)}</option>`).join('')}`;
  }
  bg.querySelectorAll('#c-seg button').forEach(b=>{
    b.onclick = ()=>{ isIncome = b.dataset.v==='1'; bg.querySelectorAll('#c-seg button').forEach(x=>x.classList.toggle('active', x===b)); refreshParents(); };
  });
  bg.querySelector('#c-cancel').onclick = ()=>bg.remove();
  bg.onclick = e=>{ if(e.target===bg) bg.remove(); };
  bg.querySelector('#c-save').onclick = ()=>{
    const name = bg.querySelector('#c-name').value.trim();
    const icon = bg.querySelector('#c-icon').value.trim() || '💠';
    const eltern = bg.querySelector('#c-parent').value || null;
    if(!name){ toast(t('fillAllFields')); return; }
    const key = name; // Kategorie-Schlüssel = eingegebener Name (muss je Typ eindeutig sein)
    const list = isIncome ? state.data.kategorien.einnahmen : state.data.kategorien.ausgaben;
    if([...allCats(isIncome)].some(k=>k.key.toLowerCase()===key.toLowerCase())){
      toast(t('categoryExists')); return;
    }
    list.push({ key, icon, eltern });
    persist(); bg.remove(); renderCategoryManager();
  };
  bg.querySelector('#c-name').focus();
}

function exportCsv(scope){
  const rows = [['Datum','Beschreibung','Betrag','Kategorie','Notiz','IstEinnahme','Konto']];
  const quelle = scope==='month' ? gefilterteBuchungen() : state.data.buchungen;
  quelle.forEach(b=> rows.push([b.datum,b.beschreibung,b.betrag,b.kategorie,b.notiz||'',b.istEinnahme,kontoName(b.kontoId)]));
  const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = scope==='month'
    ? `finanzmanager_${state.aktivesJahr}-${String(state.aktiverMonat).padStart(2,'0')}.csv`
    : 'finanzmanager_export.csv';
  a.click();
}

/* ---------------------------- PDF MONATSBERICHT ------------------------------ */
function generateMonthlyReportPdf(){
  if(!window.jspdf || !window.jspdf.jsPDF){
    toast(state.lang==='en'
      ? 'PDF library could not be loaded (maybe blocked by a browser extension / Brave Shields).'
      : 'PDF-Bibliothek konnte nicht geladen werden (evtl. durch Browser-Erweiterung / Brave Shields blockiert).');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  let y = 20;

  function ensureSpace(need){
    if(y + need > pageH - 16){ doc.addPage(); y = 20; }
  }
  function sectionTitle(txt){
    ensureSpace(12);
    doc.setFont(undefined, 'bold'); doc.setFontSize(12); doc.setTextColor(30,40,70);
    doc.text(txt, marginX, y);
    y += 3; doc.setDrawColor(220,224,240); doc.line(marginX, y, pageW-marginX, y);
    y += 6;
  }
  function tableRow(cols, widths, opts={}){
    ensureSpace(7);
    doc.setFont(undefined, opts.bold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...(opts.color || [40,44,60]));
    let x = marginX;
    cols.forEach((txt,i)=>{
      doc.text(String(txt), x, y, { maxWidth: widths[i]-2 });
      x += widths[i];
    });
    y += 6;
  }

  const buf = gefilterteBuchungen();
  const ein = summeEin(buf), aus = summeAus(buf), bilanz = ein-aus;
  const sparquote = ein>0 ? ((ein-aus)/ein*100) : 0;
  const monLabel = monateFor(state.lang)[state.aktiverMonat-1] + ' ' + state.aktivesJahr;

  // --- Kopf ---
  doc.setFont(undefined,'bold'); doc.setFontSize(18); doc.setTextColor(20,26,51);
  doc.text('FinanzManager', marginX, y); y += 8;
  doc.setFont(undefined,'normal'); doc.setFontSize(11); doc.setTextColor(90,98,130);
  doc.text(`${t('transactions')} — ${monLabel}`, marginX, y); y += 5;
  doc.text(`${state.displayName || ''}`, marginX, y); y += 10;

  // --- Kennzahlen ---
  sectionTitle(state.lang==='en' ? 'Summary' : 'Übersicht');
  tableRow([t('totalIncome'), fmt(ein)], [90,90]);
  tableRow([t('totalExpenses'), fmt(aus)], [90,90]);
  tableRow([t('balance'), fmt(bilanz)], [90,90], { bold:true, color: bilanz>=0?[0,140,90]:[190,40,60] });
  tableRow([t('savingsRate'), sparquote.toFixed(1)+'%'], [90,90]);
  y += 4;

  // --- Ausgaben nach Kategorie ---
  const katMap = {};
  buf.filter(b=>!b.istEinnahme && !b.istUeberweisung).forEach(b=> katMap[b.kategorie]=(katMap[b.kategorie]||0)+b.betrag);
  const katEntries = Object.entries(katMap).sort((a,b)=>b[1]-a[1]);
  if(katEntries.length){
    sectionTitle(state.lang==='en' ? 'Expenses by category' : 'Ausgaben nach Kategorie');
    tableRow([t('category'), t('amount'), '%'], [90,50,40], { bold:true });
    katEntries.forEach(([kat,val])=>{
      tableRow([catLabel(kat), fmt(val), (val/aus*100).toFixed(1)+'%'], [90,50,40]);
    });
    y += 4;
  }

  // --- Budget-Status ---
  const bd = state.data.budgets;
  if(bd.gesamt!=null || bd.kategorien.length){
    sectionTitle(t('budgetTab'));
    if(bd.gesamt!=null){
      const over = aus>bd.gesamt;
      tableRow([t('overallBudget'), fmt(aus)+' / '+fmt(bd.gesamt)], [90,90], { color: over?[190,40,60]:[40,44,60] });
    }
    bd.kategorien.forEach(entry=>{
      const spent = katMap[entry.kategorie]||0;
      const over = spent>entry.betrag;
      tableRow([catLabel(entry.kategorie), fmt(spent)+' / '+fmt(entry.betrag)], [90,90], { color: over?[190,40,60]:[40,44,60] });
    });
    y += 4;
  }

  // --- Konten ---
  sectionTitle(t('accounts'));
  tableRow([t('account'), t('totalBalance')], [110,70], { bold:true });
  state.data.konten.forEach(k=> tableRow([k.name, fmt(kontoSaldo(k.id))], [110,70]));
  tableRow([t('totalBalance'), fmt(gesamtSaldo())], [110,70], { bold:true });
  y += 4;

  // --- Abos / wiederkehrend ---
  if(state.data.wiederkehrend.length){
    sectionTitle(t('recurring'));
    tableRow([t('description'), t('amount'), t('interval'), t('nextDue')], [60,40,35,45], { bold:true });
    state.data.wiederkehrend.forEach(w=>{
      tableRow([w.name, (w.istEinnahme?'+':'-')+fmt(w.betrag), w.intervall==='jaehrlich'?t('yearly'):t('monthly'), w.naechstesFaellig], [60,40,35,45]);
    });
    y += 4;
  }

  // --- Buchungen dieses Monats ---
  if(buf.length){
    sectionTitle(t('transactions'));
    tableRow([t('date'), t('description'), t('category'), t('amount')], [26,70,50,34], { bold:true });
    buf.slice(0,40).forEach(b=>{
      tableRow([b.datum, b.beschreibung.slice(0,32), catLabel(b.kategorie), (b.istEinnahme?'+':'-')+fmt(b.betrag)], [26,70,50,34]);
    });
    if(buf.length>40){
      doc.setFont(undefined,'italic'); doc.setFontSize(8.5); doc.setTextColor(140,146,170);
      doc.text(state.lang==='en' ? `… and ${buf.length-40} more` : `… und ${buf.length-40} weitere`, marginX, y);
      y += 6;
    }
  }

  // --- Fußzeile auf jeder Seite ---
  const pageCount = doc.internal.getNumberOfPages();
  for(let p=1;p<=pageCount;p++){
    doc.setPage(p);
    doc.setFont(undefined,'normal'); doc.setFontSize(8); doc.setTextColor(160,166,190);
    doc.text(`FinanzManager · ${new Date().toLocaleDateString(state.lang==='en'?'en-US':'de-DE')} · ${p}/${pageCount}`, marginX, pageH-10);
  }

  doc.save(`finanzmanager_bericht_${state.aktivesJahr}-${String(state.aktiverMonat).padStart(2,'0')}.pdf`);
}

// Sehr simpler CSV-Parser passend zum Export-Format oben (Semikolon-getrennt,
// Felder in doppelten Anführungszeichen, "" als Escape für ein Anführungszeichen).
function parseCsvLine(line){
  const out = []; let cur=''; let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(inQ){
      if(ch==='"'){
        if(line[i+1]==='"'){ cur+='"'; i++; } else { inQ=false; }
      } else cur+=ch;
    } else {
      if(ch==='"') inQ=true;
      else if(ch===';'){ out.push(cur); cur=''; }
      else cur+=ch;
    }
  }
  out.push(cur);
  return out;
}

function importCsv(ev){
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const text = reader.result.replace(/\r/g,'');
      const lines = text.split('\n').filter(l=>l.trim().length);
      if(lines.length<2) throw new Error('empty');
      // erste Zeile ist die Kopfzeile (Datum;Beschreibung;Betrag;Kategorie;Notiz;IstEinnahme[;Konto]) — wird übersprungen
      const defaultKontoId = state.data.konten[0]?.id;
      let importedCount = 0;
      for(let i=1;i<lines.length;i++){
        const cols = parseCsvLine(lines[i]);
        if(cols.length<6) continue;
        const [datum, beschreibung, betragRaw, kategorie, notiz, istEinnahmeRaw, kontoNameRaw] = cols;
        const betrag = parseFloat(String(betragRaw).replace(',','.'));
        if(!datum || !beschreibung || isNaN(betrag)) continue;
        const istEinnahme = String(istEinnahmeRaw).trim().toLowerCase()==='true';
        // Konto anhand des Namens wiederfinden (falls Spalte vorhanden), sonst Standardkonto
        let kontoId = defaultKontoId;
        if(kontoNameRaw){
          const match = state.data.konten.find(k=>k.name.toLowerCase()===String(kontoNameRaw).trim().toLowerCase());
          if(match) kontoId = match.id;
        }
        state.data.buchungen.push({
          id: uid(), beschreibung, betrag: round2(betrag),
          kategorie: kategorie || 'Sonstiges', datum, notiz: notiz||'', istEinnahme, kontoId
        });
        importedCount++;
      }
      if(importedCount===0) throw new Error('no rows');
      persist();
      toast(`${t('importSuccess')} (${importedCount})`);
      render();
    }catch(e){
      console.error('CSV-Import Fehler:', e);
      toast(t('importError'));
    }finally{
      ev.target.value = '';
    }
  };
  reader.onerror = ()=>{ toast(t('importError')); };
  reader.readAsText(file, 'utf-8');
}

/* ---------------------------- SYNC WARNING BANNER --------------------------- */
function storageWarningBannerHtml(){
  if(window.__syncOk !== false) return '';
  const en = state.lang==='en';
  return `<div id="storage-warn" style="position:fixed; top:0; left:0; right:0; z-index:500; background:var(--red); color:#fff; padding:10px 18px; font-size:12.5px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:14px;">
    <span>⚠ ${en?'Could not sync with the server — your last change may not be saved. Check your internet connection and the Supabase config.':'Konnte nicht mit dem Server synchronisieren — deine letzte Änderung wurde eventuell nicht gespeichert. Prüfe deine Internetverbindung und die Supabase-Konfiguration.'}</span>
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
// Ein Klick auf den Reset-Link in der E-Mail loggt den Nutzer technisch ein
// (Supabase braucht das, um das Passwort ändern zu dürfen) — das darf aber
// NICHT dazu führen, dass er direkt in der App landet, sondern er soll erst
// den "Neues Passwort setzen"-Screen sehen. Deshalb erkennen wir den
// Recovery-Link schon an der URL und überspringen den normalen Auto-Login.
const isRecoveryLink = /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);

sb.auth.onAuthStateChange((event)=>{
  if(event === 'PASSWORD_RECOVERY'){
    state.screen = 'reset-password';
    state.resetDone = false; state.resetError='';
    // Token aus der Adresszeile entfernen, damit er nicht sichtbar/wieder-
    // verwendbar in der Browser-Historie oder beim Neuladen hängen bleibt.
    history.replaceState(null, '', window.location.pathname);
    render();
  }
});

(async function init(){
  applyTheme();
  root.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:13px;">Lädt…</div>`;

  if(isRecoveryLink){
    // Der onAuthStateChange-Listener oben zeigt gleich den Reset-Screen an,
    // sobald Supabase den Link verarbeitet hat. Falls das aus irgendeinem
    // Grund nicht passiert (z.B. Link schon benutzt/abgelaufen), nach ein
    // paar Sekunden trotzdem zum normalen Login zurückfallen, statt ewig
    // auf "Lädt…" hängen zu bleiben.
    setTimeout(()=>{ if(state.screen!=='reset-password') render(); }, 4000);
    return;
  }

  try{
    // Bereits eingeloggte Sitzung wiederherstellen (Supabase merkt sich das
    // Auth-Token selbst im Browser) — spart erneutes Einloggen bei Reload.
    const { data: { session } } = await sb.auth.getSession();
    if(session && session.user){
      await enterApp(session.user, session.user.user_metadata?.username);
      return;
    }
  }catch(e){
    console.error('Session-Wiederherstellung fehlgeschlagen:', e);
    if(isNetworkError(e)){
      root.innerHTML = `<div style="height:100%; display:flex; align-items:center; justify-content:center; padding:24px; text-align:center;">
        <div style="max-width:380px; color:var(--fg); font-size:13.5px; line-height:1.6;">⚠️ ${t('brokenConn')}</div>
      </div>`;
      return;
    }
  }
  render();
})();
