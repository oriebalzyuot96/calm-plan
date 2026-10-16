import { EXTRA } from './strings-extra.js';

export const STRINGS = {
  en: {
    appName: 'Calm Plan',
    tagline: 'A calm companion for your day',
    skipLink: 'Skip to content',
    navToday: 'Today',
    navMood: 'Mood',
    navChat: 'Chat',
    navSettings: 'Data',
    todayTitle: 'Today',
    taskLabel: 'New task or habit',
    taskPlaceholder: 'For example: drink water, or call a friend',
    dueLabel: 'Due date (optional)',
    habitToggle: 'Habit',
    addButton: 'Add',
    listTitle: 'Your list',
    emptyTasks: 'Nothing here yet. Add one small task or one wellbeing habit.',
    taskAdded: 'Added.',
    taskDone: 'Marked as done.',
    taskReopened: 'Marked as not done.',
    taskDeleted: 'Deleted.',
    titleRequired: 'Please write a short title first.',
    categoryTask: 'Task',
    categoryHabit: 'Habit',
    moveUp: 'Move up',
    moveDown: 'Move down',
    deleteTask: 'Delete',
    doneLabel: 'Done',
    moodTitle: 'Mood check-in',
    moodQuestion: 'How are you feeling right now?',
    mood1: 'Very low',
    mood2: 'Low',
    mood3: 'Okay',
    mood4: 'Good',
    mood5: 'Great',
    moodNoteLabel: 'A short note (optional)',
    saveMood: 'Save check-in',
    moodSaved: 'Saved. Thank you for checking in.',
    selectMoodFirst: 'Choose a number from 1 to 5 first.',
    chartTitle: 'The last 14 days',
    chartTableCaption: 'Average mood by day',
    dayHeader: 'Day',
    scoreHeader: 'Average score',
    chartSummaryNone: 'No check-ins yet in the last 14 days.',
    chartSummary: 'Average over {days} day(s) with check-ins: {avg} out of 5.',
    chartAria: 'Line chart of mood scores over the last 14 days',
    chatTitle: 'Chat',
    chatIntro:
      'This is a supportive chat, not therapy. I can help you reflect, plan, or pause. I cannot give medical advice.',
    chatLabel: 'Your message',
    sendButton: 'Send',
    chatWelcome:
      'Hello. I am a self-help companion, not a therapist or doctor. What would you like to talk about?',
    chatBusy: 'Thinking...',
    chatError: 'I could not respond right now. Please try again in a moment.',
    chatYou: 'You',
    chatCompanion: 'Companion',
    chatSource: 'Local reply',
    chatSourceApi: 'AI-assisted reply',
    chip1: 'Breathing exercise',
    chip2: 'Grounding step',
    chip3: 'How am I doing?',
    chip4: 'Plan my day',
    chipMsg1: 'I would like a breathing exercise.',
    chipMsg2: 'Help me ground myself for a moment.',
    chipMsg3: 'How am I doing lately?',
    chipMsg4: 'Help me plan my day.',
    chatTooLong: 'Your message is too long. Please keep it under 1000 characters.',
    chatSuggestions: 'Suggestions',
    chatLog: 'Conversation',
    settingsTitle: 'Your data and about',
    languageTitle: 'Language',
    themeTitle: 'Theme',
    themeSystem: 'Match my device',
    themeLight: 'Light',
    themeDark: 'Dark',
    reduceMotion: 'Reduce motion',
    motionHint: 'Your system reduce-motion setting is always respected.',
    privacyTitle: 'Your data',
    privacyText:
      'Your tasks and mood check-ins are stored on this server, in a local database. Chat messages are not saved. The owner decides where the server runs.',
    eraseButton: 'Erase all my data',
    eraseTitle: 'Erase all data?',
    eraseText: 'This permanently deletes all your tasks and mood check-ins. This cannot be undone.',
    erasing: 'Erasing...',
    erased: 'All your data has been erased.',
    confirmErase: 'Erase everything',
    cancel: 'Cancel',
    confirmTitle: 'Are you sure?',
    aboutTitle: 'About',
    aboutText:
      'Calm Plan is a self-help tool. It is not therapy, not a diagnosis, and not a replacement for a doctor or a crisis service.',
    crisisNote: 'If you may harm yourself, contact your local emergency number or a trusted person now.',
    footerText: 'Calm Plan is a self-help tool, not therapy and not a diagnosis.',
    crisisDismiss: 'Hide this message',
    errorGeneric: 'Something went wrong. Please try again.',
    errorNetwork: 'Could not reach the server. Check your connection and try again.',
    errorRate: 'Please wait a little before trying again.',
  },
  ar: {
    appName: 'خطة الهدوء',
    tagline: 'رفيق هادئ ليومك',
    skipLink: 'تخطَّ إلى المحتوى',
    navToday: 'اليوم',
    navMood: 'المزاج',
    navChat: 'الدردشة',
    navSettings: 'بياناتي',
    todayTitle: 'اليوم',
    taskLabel: 'مهمة أو عادة جديدة',
    taskPlaceholder: 'مثال: اشرب كوب ماء، أو اتصل بصديق',
    dueLabel: 'تاريخ الاستحقاق (اختياري)',
    habitToggle: 'عادة',
    addButton: 'إضافة',
    listTitle: 'قائمتك',
    emptyTasks: 'لا يوجد شيء بعد. أضف مهمة صغيرة واحدة أو عادة واحدة للعافية.',
    taskAdded: 'تمت الإضافة.',
    taskDone: 'تم وضعها كمنجزة.',
    taskReopened: 'تم وضعها كغير منجزة.',
    taskDeleted: 'تم الحذف.',
    titleRequired: 'من فضلك اكتب عنوانًا قصيرًا أولًا.',
    categoryTask: 'مهمة',
    categoryHabit: 'عادة',
    moveUp: 'تحريك للأعلى',
    moveDown: 'تحريك للأسفل',
    deleteTask: 'حذف',
    doneLabel: 'منجزة',
    moodTitle: 'تسجيل المزاج',
    moodQuestion: 'كيف تشعر الآن؟',
    mood1: 'منخفض جدًا',
    mood2: 'منخفض',
    mood3: 'عادي',
    mood4: 'جيد',
    mood5: 'ممتاز',
    moodNoteLabel: 'ملاحظة قصيرة (اختيارية)',
    saveMood: 'حفظ التسجيل',
    moodSaved: 'تم الحفظ. شكرًا لأنك سجلت مزاجك.',
    selectMoodFirst: 'اختر رقمًا من 1 إلى 5 أولًا.',
    chartTitle: 'آخر 14 يومًا',
    chartTableCaption: 'متوسط المزاج حسب اليوم',
    dayHeader: 'اليوم',
    scoreHeader: 'متوسط الدرجة',
    chartSummaryNone: 'لا توجد تسجيلات في آخر 14 يومًا.',
    chartSummary: 'المتوسط خلال {days} يوم/أيام بها تسجيلات: {avg} من 5.',
    chartAria: 'مخطط خطي لدرجات المزاج خلال آخر 14 يومًا',
    chatTitle: 'الدردشة',
    chatIntro:
      'هذه دردشة داعمة، وليست علاجًا نفسيًا. يمكنني مساعدتك على التأمل أو التخطيط أو التوقف لحظة. لا أستطيع تقديم نصائح طبية.',
    chatLabel: 'رسالتك',
    sendButton: 'إرسال',
    chatWelcome: 'مرحبًا. أنا رفيق لدعم الذات، ولست معالجًا نفسيًا ولا طبيبًا. عمّ تود أن نتحدث؟',
    chatBusy: 'جارٍ التفكير...',
    chatError: 'لم أستطع الرد الآن. من فضلك حاول مرة أخرى بعد قليل.',
    chatYou: 'أنت',
    chatCompanion: 'الرفيق',
    chatSource: 'رد محلي',
    chatSourceApi: 'رد بمساعدة الذكاء الاصطناعي',
    chip1: 'تمرين تنفس',
    chip2: 'خطوة تأريض',
    chip3: 'كيف حالي؟',
    chip4: 'نظّم يومي',
    chipMsg1: 'أود تمرين تنفس.',
    chipMsg2: 'ساعدني على التأريض لحظة.',
    chipMsg3: 'كيف حالي في الفترة الأخيرة؟',
    chipMsg4: 'ساعدني في تنظيم يومي.',
    chatTooLong: 'رسالتك طويلة جدًا. من فضلك اجعلها أقل من 1000 حرف.',
    chatSuggestions: 'اقتراحات',
    chatLog: 'المحادثة',
    settingsTitle: 'بياناتك وحول التطبيق',
    languageTitle: 'اللغة',
    themeTitle: 'السمة',
    themeSystem: 'حسب الجهاز',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    reduceMotion: 'تقليل الحركة',
    motionHint: 'يُحترم إعداد تقليل الحركة في جهازك دائمًا.',
    privacyTitle: 'بياناتك',
    privacyText:
      'تُحفظ مهامك وتسجيلات مزاجك على هذا الخادم في قاعدة بيانات محلية. لا تُحفظ رسائل الدردشة. صاحب التطبيق هو من يحدد مكان تشغيل الخادم.',
    eraseButton: 'مسح كل بياناتي',
    eraseTitle: 'هل تريد مسح كل البيانات؟',
    eraseText: 'سيتم حذف كل مهامك وتسجيلات مزاجك نهائيًا. لا يمكن التراجع عن ذلك.',
    erasing: 'جارٍ المسح...',
    erased: 'تم مسح كل بياناتك.',
    confirmErase: 'مسح الكل',
    cancel: 'إلغاء',
    confirmTitle: 'هل أنت متأكد؟',
    aboutTitle: 'حول التطبيق',
    aboutText:
      'خطة الهدوء أداة لدعم الذات. وهي ليست علاجًا نفسيًا، ولا تشخيصًا، ولا بديلًا عن الطبيب أو خدمات الأزمات.',
    crisisNote: 'إذا كنت قد تؤذي نفسك، فتواصل الآن مع رقم الطوارئ في بلدك أو مع شخص تثق به.',
    footerText: 'خطة الهدوء أداة لدعم الذات، وليست علاجًا نفسيًا ولا تشخيصًا.',
    crisisDismiss: 'إخفاء هذه الرسالة',
    errorGeneric: 'حدث خطأ ما. من فضلك حاول مرة أخرى.',
    errorNetwork: 'تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مرة أخرى.',
    errorRate: 'من فضلك انتظر قليلًا قبل المحاولة مرة أخرى.',
  },
};

let current = 'ar';

export function getLang() {
  return current;
}

export function t(key, vars = {}) {
  const dict = STRINGS[current] || STRINGS.ar;
  let s = dict[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Applies translated text to elements with data-i18n and data-i18n-attr. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

export function setLang(lang) {
  current = lang === 'en' ? 'en' : 'ar';
  const html = document.documentElement;
  html.lang = current;
  html.dir = current === 'ar' ? 'rtl' : 'ltr';
  document.title = current === 'ar' ? 'خطة الهدوء | Calm Plan' : 'Calm Plan | خطة الهدوء';
  applyI18n(document);
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
}

Object.assign(STRINGS.en, EXTRA.en);
Object.assign(STRINGS.ar, EXTRA.ar);
