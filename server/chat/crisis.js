import { normalize } from './text.js';

/**
 * Self-harm and suicide language in English and Arabic. Matching is
 * deliberately broad: a false positive shows support resources, which is
 * the safer error. Keywords are normalised the same way as the input.
 */
const CRISIS_KEYWORDS = [
  // English
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'end it all',
  'want to die',
  'wanna die',
  'want to be dead',
  'better off dead',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
  'cut myself',
  'dont want to live',
  'do not want to live',
  'no reason to live',
  'dont want to be here',
  // Arabic (normalised: alef variants unified, hamza removed)
  'انتحار',
  'انتحر',
  'اقتل نفسي',
  'اقتل نفسى',
  'اريد ان اقتل نفسي',
  'لا اريد العيش',
  'لا اريد ان اعيش',
  'لا اريد الحياه',
  'ما ابغى اعيش',
  'ما ابي اعيش',
  'ابي اموت',
  'ابغى اموت',
  'اريد ان اموت',
  'اريد الموت',
  'اتمنى الموت',
  'انهي حياتي',
  'انهاء حياتي',
  'اوذي نفسي',
  'اذي نفسي',
  'اذيت نفسي',
  'اجرح نفسي',
];

const NORMALIZED = CRISIS_KEYWORDS.map((k) => normalize(k));

/** Returns true when the text contains self-harm or suicide language. */
export function detectCrisis(text) {
  if (typeof text !== 'string' || !text) return false;
  const n = normalize(text);
  // Substring match on purpose: missing a real crisis is worse than a false alarm.
  return NORMALIZED.some((kw) => kw && n.includes(kw));
}

export const CRISIS_GUIDANCE = {
  en: {
    title: 'You are not alone. Please reach out for help now.',
    body:
      'It sounds like you may be thinking about hurting yourself or ending your life. This app cannot keep you safe in an emergency. Please contact people who can help right now.',
    steps: [
      'If you are in immediate danger, call your local emergency number now (for example 911, 999 or 112, depending on your country).',
      'Contact a person you trust, tell them what you told me, and ask them to stay with you.',
      'Call your local mental-health helpline or go to the nearest emergency department.',
      'Move away from anything you could use to hurt yourself, if you can do so safely.',
    ],
    prompt: 'Will you contact a person you trust right now? You do not have to explain everything.',
  },
  ar: {
    title: 'لست وحدك. من فضلك تواصل مع من يستطيع مساعدتك الآن.',
    body:
      'يبدو أنك قد تفكر في إيذاء نفسك أو في إنهاء حياتك. لا يستطيع هذا التطبيق حمايتك في حالات الطوارئ. من فضلك تواصل الآن مع أشخاص يستطيعون مساعدتك.',
    steps: [
      'إذا كنت في خطر فوري، اتصل برقم الطوارئ في بلدك الآن (مثل 911 أو 999 أو 112 حسب بلدك).',
      'تواصل مع شخص تثق به، وأخبره بما قلته لي، واطلب منه أن يبقى معك.',
      'اتصل بخط الدعم النفسي المحلي في بلدك، أو توجه إلى أقرب قسم طوارئ في المستشفى.',
      'ابتعد عن أي شيء قد تستخدمه لإيذاء نفسك، إذا كان ذلك آمنًا بالنسبة لك.',
    ],
    prompt: 'هل ستتواصل الآن مع شخص تثق به؟ لا يلزمك أن تشرح كل شيء.',
  },
};

export function crisisGuidance(lang) {
  return CRISIS_GUIDANCE[lang === 'en' ? 'en' : 'ar'];
}
