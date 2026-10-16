/**
 * Normalises text for keyword matching across English and Arabic:
 * lowercases, strips Arabic diacritics and tatweel, unifies alef, hamza,
 * yeh, and taa-marbuta variants, and turns punctuation into spaces.
 */
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا') // alef variants -> ا
    .replace(/ؤ/g, 'و') // ؤ -> و
    .replace(/ئ/g, 'ي') // ئ -> ي
    .replace(/ى/g, 'ي') // ى -> ي
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARABIC = /[؀-ۿ]/;
const ARABIC_CLITIC = /^(وال|بال|لل|فال|كال|ال|و|ب|ل|ف|ك)/;

/**
 * Whole-word match for English keywords, so "hi" does not match "this".
 * Prefix match for Arabic keywords, which take clitics such as و, ب, ل, ال.
 * Multi-word phrases match on word boundaries.
 */
export function matchesAny(normalizedText, keywords) {
  const words = normalizedText.split(' ');
  const padded = ` ${normalizedText} `;
  return keywords.some((raw) => {
    const kw = normalize(raw);
    if (!kw) return false;
    if (ARABIC.test(kw)) {
      if (kw.includes(' ')) return padded.includes(` ${kw}`);
      return words.some((w) => {
        const bare = w.replace(ARABIC_CLITIC, '');
        return w.startsWith(kw) || bare.startsWith(kw);
      });
    }
    return padded.includes(` ${kw} `);
  });
}
