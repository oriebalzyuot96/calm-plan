import { matchesAny, normalize } from './text.js';

/**
 * Rule-based supportive responder. It never gives medical, medication, or
 * diagnostic advice. It uses the mood history and open tasks only to ask a
 * gentle follow-up question.
 */

const MEDICAL = [
  'medication', 'medications', 'medicine', 'medicines', 'pill', 'pills', 'dose', 'dosage',
  'prescription', 'prescriptions', 'prescribe', 'antidepressant', 'antidepressants', 'side effect',
  'side effects', 'symptom', 'symptoms', 'diagnose', 'diagnosis', 'diagnoses', 'diagnosed', 'disorder',
  'bipolar', 'adhd', 'ptsd',
  'ibuprofen', 'paracetamol', 'tablet', 'tablets', 'mg', 'ml',
  'دواء', 'ادوية', 'حبوب', 'جرعة', 'جرعه', 'وصفة', 'مضاد للاكتئاب', 'اعراض', 'تشخيص',
  'اضطراب', 'ثنائي القطب', 'مرض', 'امراض',
];

const BREATHING = ['breath', 'breathe', 'breathing', 'تنفس', 'نفس عميق', 'تمرين التنفس'];
const GROUNDING = ['ground', 'grounding', 'panic', 'تأريض', 'تاريض', 'هلع', 'تهدئه'];
const GREETING = ['hi', 'hello', 'hey', 'مرحبا', 'اهلا', 'السلام عليكم', 'صباح الخير', 'مساء الخير'];
const TASKS = ['task', 'tasks', 'todo', 'to do', 'plan my day', 'habit', 'habits', 'مهمه', 'مهام', 'خطه', 'عاده', 'عادات', 'قائمه'];
const HOW_AM_I = ['how am i', 'how am i doing', 'how i am doing', 'كيف حالي', 'كيف انا', 'كيف أنا', 'كيف احوالي'];
const MOOD = [
  'mood', 'feel', 'feeling', 'sad', 'tired', 'stress', 'stressed', 'lonely', 'anxious', 'anxiety',
  'اشعر', 'احس', 'حزين', 'متعب', 'مرهق', 'ضغط', 'وحيد', 'قلق', 'متوتر', 'زعلان',
];

const T = {
  en: {
    medical:
      "I can't give medical, medication, or diagnostic advice, and I'm not a substitute for a doctor or pharmacist. Please ask a qualified professional about this. I can still help with a breathing exercise, a grounding step, or planning your day. What would help most right now?",
    breathing:
      "Let's breathe slowly together. Breathe in through your nose for 4 counts, hold for 4, then breathe out through your mouth for 6. Repeat this 4 times, at your own pace. Tell me how you feel afterwards.",
    grounding:
      'Let\'s ground yourself. Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. Take your time, then tell me one thing you noticed.',
    greeting:
      "Hello, it's good to hear from you. I'm a self-help companion, not a therapist or doctor. How are you feeling today, on a scale from 1 to 5?",
    moodLow:
      'Thank you for sharing. Your recent check-ins have been on the lower side. Would you like a breathing exercise, or to pick one small task for today?',
    moodNormal: 'Thank you for sharing that. What feels most present for you right now?',
    tasksOpen: (n) => `You have ${n} open item${n === 1 ? '' : 's'}. Would you like to choose one small step to start with?`,
    tasksNone: 'Your list is clear for now. Would you like to add something small, or take a moment to rest?',
    howAmI: (n) => `Looking at your recent check-ins, ${n > 0 ? 'you have been tracking your mood, which is a good step.' : 'you have not checked in yet. A quick check-in can help you notice patterns.'} How are you feeling in this moment?`,
    fallback:
      "I'm listening. What's on your mind? You can also ask me for a breathing exercise or a grounding step.",
  },
  ar: {
    medical:
      'لا أستطيع تقديم نصائح طبية أو دوائية أو تشخيص، ولا أحل محل الطبيب أو الصيدلي. من فضلك اسأل مختصًا مؤهلًا عن هذا. يمكنني أن أساعدك في تمرين تنفس أو خطوة تأريض أو تنظيم يومك. بماذا تود أن نبدأ الآن؟',
    breathing:
      'لنتنفس ببطء معًا. خذ نفسًا من الأنف لمدة 4 ثوانٍ، ثم احبسه 4 ثوانٍ، ثم أخرجه من الفم لمدة 6 ثوانٍ. كرر ذلك 4 مرات وبالإيقاع الذي يناسبك. أخبرني كيف تشعر بعد ذلك.',
    grounding:
      'لنعد إلى اللحظة الحالية. اذكر 5 أشياء تراها، و4 أشياء تلمسها، و3 أشياء تسمعها، وشيئين تشمّهما، وشيئًا واحدًا تتذوقه. خذ وقتك، ثم أخبرني بشيء واحد لاحظته.',
    greeting:
      'مرحبًا بك، يسعدني أن تكتب لي. أنا رفيق لدعم الذات، ولست معالجًا نفسيًا ولا طبيبًا. كيف تشعر اليوم على مقياس من 1 إلى 5؟',
    moodLow:
      'شكرًا لأنك شاركتني. مؤشرات مزاجك الأخيرة كانت منخفضة قليلًا. هل تود تمرين تنفس، أم اختيار مهمة صغيرة واحدة لليوم؟',
    moodNormal: 'شكرًا لمشاركتي ذلك. ما الشيء الأكثر حضورًا في ذهنك الآن؟',
    tasksOpen: (n) => `لديك ${n} ${n === 1 ? 'بند مفتوح' : 'بنود مفتوحة'}. هل تود اختيار خطوة صغيرة واحدة للبدء بها؟`,
    tasksNone: 'قائمتك خالية الآن. هل تود إضافة شيء صغير، أم أخذ لحظة من الراحة؟',
    howAmI: (n) => `بالنظر إلى تسجيلاتك الأخيرة، ${n > 0 ? 'أنت تتابع مزاجك، وهذه خطوة جيدة.' : 'لم تسجل مزاجك بعد، وتسجيل سريع قد يساعدك على ملاحظة الأنماط.'} كيف تشعر في هذه اللحظة؟`,
    fallback: 'أنا أستمع إليك. ما الذي يشغل بالك؟ يمكنك أيضًا أن تطلب مني تمرين تنفس أو خطوة تأريض.',
  },
};

const has = (text, list) => matchesAny(text, list);

/** True when the message asks for medical, medication, or diagnostic help. */
export function isMedicalTopic(message) {
  return has(normalize(message), MEDICAL);
}

/**
 * Picks a reply for the message. Callers must check for crisis language
 * before calling this function.
 */
export function respondLocally({ message, lang = 'ar', moods = [], openTasks = [] }) {
  const text = normalize(message);
  const L = lang === 'en' ? T.en : T.ar;

  if (has(text, MEDICAL)) return { kind: 'medical_redirect', text: L.medical };
  if (has(text, BREATHING)) return { kind: 'breathing', text: L.breathing };
  if (has(text, GROUNDING)) return { kind: 'grounding', text: L.grounding };
  if (has(text, HOW_AM_I)) return { kind: 'check_in', text: L.howAmI(moods.length) };

  if (has(text, TASKS)) {
    const open = openTasks.filter((t) => !t.done).length;
    return { kind: 'tasks', text: open > 0 ? L.tasksOpen(open) : L.tasksNone };
  }

  if (has(text, MOOD)) {
    const recent = moods.slice(0, 5);
    const avg = recent.length ? recent.reduce((s, m) => s + m.score, 0) / recent.length : null;
    const low = avg !== null && avg <= 2.5;
    return { kind: 'mood', text: low ? L.moodLow : L.moodNormal };
  }

  if (has(text, GREETING)) return { kind: 'greeting', text: L.greeting };

  return { kind: 'fallback', text: L.fallback };
}
